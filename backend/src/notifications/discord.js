const { notifyWithRetry } = require("../services/notifications");

async function sendDiscord({ db, webhookUrl, text }) {
  const payload = { content: text };
  return notifyWithRetry({
    db,
    channel: "discord",
    payload,
    send: (signal) =>
      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal
      })
  });
}

module.exports = {
  sendDiscord
};
