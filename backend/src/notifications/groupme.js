const { notifyWithRetry } = require("../services/notifications");

const GROUPME_URL = "https://api.groupme.com/v3/bots/post";

async function sendGroupMe({ db, botId, text }) {
  const payload = { bot_id: botId, text };
  return notifyWithRetry({
    db,
    channel: "groupme",
    payload,
    send: (signal) =>
      fetch(GROUPME_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal
      })
  });
}

module.exports = {
  sendGroupMe
};
