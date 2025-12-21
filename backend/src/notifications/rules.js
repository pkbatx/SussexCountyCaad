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

module.exports = {
  selectRoutes
};
