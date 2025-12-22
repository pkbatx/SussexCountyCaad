import { getIncidentDetail, submitIncidentFeedback, listIncidentFeedback } from "../api";

export async function renderIncidentDetailView({ incidentId, onBack, prefetched }) {
  const container = document.createElement("div");
  container.className = "incident-detail";

  let data;
  try {
    data = prefetched || (await getIncidentDetail(incidentId));
  } catch (error) {
    container.textContent = `Failed to load incident detail: ${error.message}`;
    container.classList.add("empty-state");
    return container;
  }

  const back = document.createElement("button");
  back.className = "button";
  back.textContent = "Back to Incidents";
  back.addEventListener("click", onBack);

  const header = document.createElement("div");
  header.className = "detail-header";
  const latestRollup = data.rollups?.[0];
  const updatedAt = latestRollup?.created_at || data.incident.updated_at || "n/a";
  const summary = latestRollup?.summary_text || "No rollup summary yet.";
  const operator = data.operator_fields || {};
  const agencyLabel = operator.agency || "Unknown";
  const typeLabel = operator.incident_type || "Unspecified";
  const addressLabel = operator.address || operator.town || "No address";
  header.innerHTML = `
    <div class="detail-id">${data.incident.incident_id || data.incident.incidentId}</div>
    <div class="detail-path">${addressLabel}</div>
    <div class="incident-meta">${agencyLabel} · ${typeLabel}</div>
    <div class="incident-updated">last update ${updatedAt}</div>
    <div class="incident-summary">${summary}</div>
  `;

  const memberMeta = new Map(
    (data.members || []).map((member) => [member.call_id || member.callId, member])
  );
  const memberCalls = data.member_calls?.length ? data.member_calls : data.members || [];

  const members = document.createElement("div");
  members.className = "detail-section";
  members.innerHTML = "<h2>Calls</h2>";
  const memberList = document.createElement("ul");
  memberCalls.forEach((member) => {
    const callId = member.call_id || member.callId;
    const meta = memberMeta.get(callId);
    const item = document.createElement("li");
    const reason = meta?.link_reason || meta?.linkReason || "linked";
    item.textContent = `${callId} (${reason})`;
    memberList.appendChild(item);
  });
  members.appendChild(memberList);

  const rollups = document.createElement("div");
  rollups.className = "detail-section";
  rollups.innerHTML = "<h2>Rollup History</h2>";
  if (data.rollups?.length) {
    const rollupList = document.createElement("ul");
    data.rollups.forEach((rollup) => {
      const item = document.createElement("li");
      item.className = "rollup-item";
      const summary = document.createElement("div");
      summary.className = "rollup-summary";
      summary.textContent = rollup.summary_text;
      const meta = document.createElement("div");
      meta.className = "rollup-meta";
      meta.textContent = `version ${rollup.version}`;
      const keys = document.createElement("div");
      keys.className = "rollup-meta";
      const fields = rollup.key_fields || {};
      const keyText = [
        fields.agency,
        fields.incident_type,
        fields.address,
        fields.town,
        fields.cross_street,
        fields.poi
      ]
        .filter(Boolean)
        .join(" · ");
      keys.textContent = `key fields: ${keyText || "n/a"}`;
      const questions = document.createElement("div");
      questions.className = "rollup-meta";
      const open = Array.isArray(rollup.open_questions)
        ? rollup.open_questions.join(", ")
        : "";
      questions.textContent = `open questions: ${open || "none"}`;
      const calls = document.createElement("div");
      calls.className = "rollup-calls";
      const included = Array.isArray(rollup.included_call_ids)
        ? rollup.included_call_ids.join(", ")
        : "";
      calls.textContent = `calls: ${included || "n/a"}`;
      item.appendChild(summary);
      item.appendChild(meta);
      item.appendChild(keys);
      item.appendChild(questions);
      item.appendChild(calls);
      rollupList.appendChild(item);
    });
    rollups.appendChild(rollupList);
  } else {
    rollups.appendChild(document.createTextNode("No rollups yet."));
  }

  const feedback = document.createElement("div");
  feedback.className = "detail-section";
  feedback.innerHTML = "<h2>Feedback</h2>";
  const feedbackList = document.createElement("ul");
  feedbackList.className = "evidence-list";

  const feedbackActions = [
    { label: "Wrong location", type: "wrong_location" },
    { label: "Wrong grouping", type: "wrong_grouping" },
    { label: "Wrong type", type: "wrong_type" }
  ];

  const feedbackButtons = document.createElement("div");
  feedbackButtons.className = "detail-section";
  feedbackActions.forEach((action) => {
    const button = document.createElement("button");
    button.className = "button small";
    button.textContent = action.label;
    button.addEventListener("click", async () => {
      button.disabled = true;
      await submitIncidentFeedback(incidentId, { feedback_type: action.type });
      const item = document.createElement("li");
      item.className = "evidence-item";
      item.textContent = `${action.label} submitted (queued)`;
      feedbackList.prepend(item);
      button.disabled = false;
    });
    feedbackButtons.appendChild(button);
  });

  try {
    const existing = await listIncidentFeedback(incidentId);
    existing.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "evidence-item";
      item.textContent = `${entry.feedback_type} • ${entry.apply_status}`;
      feedbackList.appendChild(item);
    });
  } catch (_error) {
    const item = document.createElement("li");
    item.className = "evidence-item";
    item.textContent = "Feedback history unavailable.";
    feedbackList.appendChild(item);
  }

  feedback.appendChild(feedbackButtons);
  feedback.appendChild(feedbackList);

  container.appendChild(back);
  container.appendChild(header);
  container.appendChild(members);
  container.appendChild(rollups);
  container.appendChild(feedback);

  return container;
}
