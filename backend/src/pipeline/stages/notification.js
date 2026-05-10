const { listMetadataForCall } = require("../../db/queries/metadata");
const { listSummariesForCall } = require("../../db/queries/summaries");
const { createNotification, findLatestNotificationForSubject } = require("../../db/queries/notifications");
const { getLatestRollupForIncident } = require("../../db/queries/rollups");
const { selectRoutes, buildIncidentDedupeKey, evaluateIncidentNotification } = require("../../notifications/rules");
const { shouldSend } = require("../../notifications/dedupe");
const { sendGroupMe } = require("../../notifications/groupme");
const { sendDiscord } = require("../../notifications/discord");

const CALL_DEDUPE_WINDOW_SECONDS = 300;

function getIncidentForCall(db, callId) {
  return db
    .prepare(
      "SELECT incident_id FROM incident_group_members WHERE call_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(callId)?.incident_id;
}

async function runStage({ config, db, callId }) {
  const extracts = listMetadataForCall(db, callId);
  const extraction = extracts.find(
    (item) => item.schema_version === "extraction.v2"
  );
  const metadata = extraction || extracts[0];
  const metadataPayload = metadata ? JSON.parse(metadata.payload_json) : null;
  const summary = listSummariesForCall(db, callId)[0];
  const callSummaryText = summary?.summary_text || "New call received.";
  const incidentId = getIncidentForCall(db, callId);

  const routes = selectRoutes({ metadata: metadataPayload, config });
  for (const route of routes) {
    const subjectType = incidentId ? "incident" : "call";
    const subjectId = incidentId || callId;
    let dedupeKey = `${route.channel}:${subjectId}`;
    let summaryText = callSummaryText;
    let suppressionReason = null;

    if (incidentId) {
      const rollup = getLatestRollupForIncident(db, incidentId);
      const lastNotification = findLatestNotificationForSubject(db, {
        subjectType: "incident",
        subjectId: incidentId,
        channel: route.channel
      });
      const evaluation = evaluateIncidentNotification({
        rollup,
        lastNotification
      });
      if (!evaluation.send) {
        suppressionReason = evaluation.reason;
      }
      if (rollup) {
        summaryText = `Incident ${incidentId}: ${rollup.summary_text || "Update"}`;
        dedupeKey = buildIncidentDedupeKey({ incidentId, rollup });
      }
    }

    if (suppressionReason) {
      createNotification(db, {
        subjectType,
        subjectId,
        channel: route.channel,
        routingRule: route.rule,
        dedupeKey,
        status: "skipped",
        sentAt: null,
        errorDetail: suppressionReason
      });
      continue;
    }

    const windowSeconds = incidentId
      ? config.notifyIncidentDedupeWindowSeconds
      : CALL_DEDUPE_WINDOW_SECONDS;

    if (!shouldSend({ db, dedupeKey, windowSeconds })) {
      createNotification(db, {
        subjectType,
        subjectId,
        channel: route.channel,
        routingRule: route.rule,
        dedupeKey,
        status: "skipped",
        sentAt: null,
        errorDetail: "deduped"
      });
      continue;
    }

    try {
      if (route.channel === "groupme") {
        await sendGroupMe({ db, botId: config.groupmeBotId, text: summaryText });
      }
      if (route.channel === "discord") {
        await sendDiscord({ db, webhookUrl: config.discordWebhookUrl, text: summaryText });
      }

      createNotification(db, {
        subjectType,
        subjectId,
        channel: route.channel,
        routingRule: route.rule,
        dedupeKey,
        status: "sent",
        sentAt: new Date().toISOString()
      });
    } catch (error) {
      createNotification(db, {
        subjectType,
        subjectId,
        channel: route.channel,
        routingRule: route.rule,
        dedupeKey,
        status: "failed",
        sentAt: null,
        errorDetail: error.message
      });
    }
  }
}

module.exports = {
  runStage
};
