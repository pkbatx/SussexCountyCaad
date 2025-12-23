const { onRefresh } = require("../../services/events");

function eventsHandler(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive"
  });
  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  const sendRefresh = () => {
    res.write("event: refresh\n");
    res.write("data: {}\n\n");
  };

  const unsubscribe = onRefresh(sendRefresh);
  const keepalive = setInterval(() => {
    res.write(": keepalive\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(keepalive);
    unsubscribe();
    res.end();
  });
}

module.exports = {
  eventsHandler
};
