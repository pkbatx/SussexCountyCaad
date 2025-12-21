const { createFeedbackSignal, listFeedbackSignals } = require("../../db/queries/feedback");

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function normalizeFeedbackRow(row, targetType, targetId) {
  return {
    feedback_id: row.feedback_id,
    target_type: targetType,
    target_id: targetId,
    feedback_type: row.signal_type,
    submitted_at: row.created_at,
    apply_status: row.adjustment?.apply_status || "queued"
  };
}

async function submitCallFeedbackHandler(req, res, { db, callId }) {
  const body = await readJsonBody(req);
  if (!body.feedback_type) {
    return sendJson(res, 400, { error: "feedback_type_required" });
  }
  const createdAt = new Date().toISOString();
  const feedbackId = createFeedbackSignal(db, {
    callId,
    signalType: body.feedback_type,
    details: {
      message: body.message || null,
      correction: body.correction || null,
      source: "ui",
      submitted_at: createdAt
    },
    adjustment: { apply_status: "queued" }
  });

  sendJson(res, 202, {
    feedback_id: feedbackId,
    target_type: "call",
    target_id: callId,
    feedback_type: body.feedback_type,
    submitted_at: createdAt,
    apply_status: "queued"
  });
}

async function submitIncidentFeedbackHandler(req, res, { db, incidentId }) {
  const body = await readJsonBody(req);
  if (!body.feedback_type) {
    return sendJson(res, 400, { error: "feedback_type_required" });
  }
  const createdAt = new Date().toISOString();
  const feedbackId = createFeedbackSignal(db, {
    incidentId,
    signalType: body.feedback_type,
    details: {
      message: body.message || null,
      correction: body.correction || null,
      source: "ui",
      submitted_at: createdAt
    },
    adjustment: { apply_status: "queued" }
  });

  sendJson(res, 202, {
    feedback_id: feedbackId,
    target_type: "incident",
    target_id: incidentId,
    feedback_type: body.feedback_type,
    submitted_at: createdAt,
    apply_status: "queued"
  });
}

async function listCallFeedbackHandler(req, res, { db, callId }) {
  const rows = listFeedbackSignals(db, { callId });
  sendJson(
    res,
    200,
    rows.map((row) => normalizeFeedbackRow(row, "call", callId))
  );
}

async function listIncidentFeedbackHandler(req, res, { db, incidentId }) {
  const rows = listFeedbackSignals(db, { incidentId });
  sendJson(
    res,
    200,
    rows.map((row) => normalizeFeedbackRow(row, "incident", incidentId))
  );
}

module.exports = {
  submitCallFeedbackHandler,
  submitIncidentFeedbackHandler,
  listCallFeedbackHandler,
  listIncidentFeedbackHandler
};
