const { EventEmitter } = require("events");

const emitter = new EventEmitter();

function emitRefresh(source = "system") {
  emitter.emit("refresh", {
    source,
    emittedAt: new Date().toISOString()
  });
}

function onRefresh(handler) {
  emitter.on("refresh", handler);
  return () => {
    emitter.off("refresh", handler);
  };
}

module.exports = {
  emitRefresh,
  onRefresh
};
