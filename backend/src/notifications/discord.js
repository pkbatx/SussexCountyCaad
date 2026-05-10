async function sendDiscord({ webhookUrl, text }) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text })
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Discord send failed: ${body}`);
  }
}

module.exports = {
  sendDiscord
};
