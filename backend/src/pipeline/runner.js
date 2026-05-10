const { getStageHandler } = require("./stages");
const { runStageWithTracking } = require("./stage-runner");
const log = require("../services/logger");

function startPipeline({ config, db }) {
  const queue = [];
  let running = false;

  function enqueue(callId, stageName) {
    queue.push({ callId, stageName });
    processQueue();
  }

  function processQueue() {
    if (running || queue.length === 0) {
      return;
    }
    running = true;
    const job = queue.shift();
    runStage(job.callId, job.stageName)
      .catch((error) => {
        log.error(
          { callId: job.callId, stage: job.stageName, err: error },
          "pipeline stage failed"
        );
      })
      .finally(() => {
        running = false;
        processQueue();
      });
  }

  async function runStage(callId, stageName) {
    const handler = getStageHandler(stageName);
    if (!handler) {
      throw new Error(`No stage handler registered for ${stageName}`);
    }
    await runStageWithTracking({
      config,
      db,
      callId,
      stageName,
      handler,
      pipeline: { enqueue }
    });
  }

  return {
    enqueue,
    runStage
  };
}

module.exports = {
  startPipeline
};
