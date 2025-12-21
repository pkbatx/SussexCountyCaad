const GROUPME_URL = "https://api.groupme.com/v3/bots/post";

async function sendGroupMe({ botId, text }) {
  const response = await fetch(GROUPME_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bot_id: botId, text })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GroupMe send failed: ${body}`);
  }
}

module.exports = {
  sendGroupMe
};
