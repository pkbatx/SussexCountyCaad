function selectRoutes({ metadata, config }) {
  if (!config.notifyEnabled) {
    return [];
  }

  const routes = [];
  if (config.groupmeBotId) {
    routes.push({ channel: "groupme", rule: "default" });
  }
  if (config.discordWebhookUrl) {
    routes.push({ channel: "discord", rule: "default" });
  }

  const priorityValue =
    metadata?.priority || metadata?.fields?.priority?.value || null;
  if (priorityValue) {
    const priority = String(priorityValue).toLowerCase();
    if (priority.includes("low")) {
      return routes;
    }
  }

  return routes;
}

function buildIncidentDedupeKey({ incidentId, rollup }) {
  const summary = rollup?.summary_text || "";
  const hash = Buffer.from(summary).toString("base64").slice(0, 12);
  return `incident:${incidentId}:summary:${hash}`;
}

function evaluateIncidentNotification({ rollup, lastNotification }) {
  if (!rollup) {
    return { send: false, reason: "no_rollup" };
  }
  if (!lastNotification) {
    return { send: true, reason: "new_incident" };
  }
  const currentKey = buildIncidentDedupeKey({
    incidentId: lastNotification.subject_id,
    rollup
  });
  if (lastNotification.dedupe_key === currentKey) {
    return { send: false, reason: "no_significant_change" };
  }
  return { send: true, reason: "summary_changed" };
}

module.exports = {
  selectRoutes,
  buildIncidentDedupeKey,
  evaluateIncidentNotification
};
