const { createFeedbackSignal, listFeedbackSignals } = require("../../db/queries/feedback");
const { listIncidentMembers } = require("../../db/queries/incidents");

const FEEDBACK_STAGE_MAP = {
  bad_transcript: [
    "transcription",
    "summary",
    "extraction",
    "geo",
    "grouping",
    "incidentSummary"
  ],
  wrong_location: ["extraction", "geo", "grouping", "incidentSummary"],
  wrong_grouping: ["grouping", "incidentSummary"],
  wrong_type: ["extraction", "grouping", "incidentSummary"],
  wrong_agency: ["extraction", "grouping", "incidentSummary"],
  wrong_address: ["extraction", "geo", "grouping", "incidentSummary"],
  wrong_town: ["extraction", "geo", "grouping", "incidentSummary"],
  wrong_cross_street: ["extraction", "geo", "grouping", "incidentSummary"],
  wrong_poi: ["extraction", "geo", "grouping", "incidentSummary"]
};

function resolveStages(feedbackType) {
  if (feedbackType && feedbackType.startsWith("confirm_")) {
    return [];
  }
  return FEEDBACK_STAGE_MAP[feedbackType] || ["extraction", "grouping", "incidentSummary"];
}

function enqueueStages(pipeline, callId, stages) {
  if (!pipeline?.enqueue || !callId || !stages?.length) {
    return;
  }
  stages.forEach((stage) => pipeline.enqueue(callId, stage));
}

function listCallIdsForIncident(db, incidentId) {
  const members = listIncidentMembers(db, incidentId);
  const unique = new Set();
  members.forEach((member) => {
    if (member.call_id) {
      unique.add(member.call_id);
    }
  });
  return Array.from(unique);
}

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

async function submitCallFeedbackHandler(req, res, { db, callId, pipeline }) {
  const body = await readJsonBody(req);
  if (!body.feedback_type) {
    return sendJson(res, 400, { error: "feedback_type_required" });
  }
  const createdAt = new Date().toISOString();
  const stages = resolveStages(body.feedback_type);
  const feedbackId = createFeedbackSignal(db, {
    callId,
    signalType: body.feedback_type,
    details: {
      message: body.message || null,
      correction: body.correction || null,
      source: "ui",
      submitted_at: createdAt
    },
    adjustment: { apply_status: "queued", queued_stages: stages }
  });

  enqueueStages(pipeline, callId, stages);

  sendJson(res, 202, {
    feedback_id: feedbackId,
    target_type: "call",
    target_id: callId,
    feedback_type: body.feedback_type,
    submitted_at: createdAt,
    apply_status: "queued"
  });
}

async function submitIncidentFeedbackHandler(req, res, { db, incidentId, pipeline }) {
  const body = await readJsonBody(req);
  if (!body.feedback_type) {
    return sendJson(res, 400, { error: "feedback_type_required" });
  }
  const createdAt = new Date().toISOString();
  const stages = resolveStages(body.feedback_type);
  const feedbackId = createFeedbackSignal(db, {
    incidentId,
    signalType: body.feedback_type,
    details: {
      message: body.message || null,
      correction: body.correction || null,
      source: "ui",
      submitted_at: createdAt
    },
    adjustment: { apply_status: "queued", queued_stages: stages }
  });

  const callIds = listCallIdsForIncident(db, incidentId);
  callIds.forEach((callId) => enqueueStages(pipeline, callId, stages));

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
