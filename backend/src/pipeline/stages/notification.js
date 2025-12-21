const { listMetadataForCall } = require("../../db/queries/metadata");
const { listSummariesForCall } = require("../../db/queries/summaries");
const { createNotification } = require("../../db/queries/notifications");
const { selectRoutes } = require("../../notifications/rules");
const { shouldSend } = require("../../notifications/dedupe");
const { sendGroupMe } = require("../../notifications/groupme");
const { sendDiscord } = require("../../notifications/discord");

const DEDUPE_WINDOW_SECONDS = 300;

async function runStage({ config, db, callId }) {
  const extracts = listMetadataForCall(db, callId);
  const extraction = extracts.find(
    (item) => item.schema_version === "extraction.v2"
  );
  const metadata = extraction || extracts[0];
  const metadataPayload = metadata ? JSON.parse(metadata.payload_json) : null;
  const summary = listSummariesForCall(db, callId)[0];
  const summaryText = summary?.summary_text || "New call received.";

  const routes = selectRoutes({ metadata: metadataPayload, config });
  for (const route of routes) {
    const dedupeKey = `${route.channel}:${callId}`;
    if (!shouldSend({ db, dedupeKey, windowSeconds: DEDUPE_WINDOW_SECONDS })) {
      createNotification(db, {
        subjectType: "call",
        subjectId: callId,
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
        await sendGroupMe({ botId: config.groupmeBotId, text: summaryText });
      }
      if (route.channel === "discord") {
        await sendDiscord({ webhookUrl: config.discordWebhookUrl, text: summaryText });
      }

      createNotification(db, {
        subjectType: "call",
        subjectId: callId,
        channel: route.channel,
        routingRule: route.rule,
        dedupeKey,
        status: "sent",
        sentAt: new Date().toISOString()
      });
    } catch (error) {
      createNotification(db, {
        subjectType: "call",
        subjectId: callId,
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
