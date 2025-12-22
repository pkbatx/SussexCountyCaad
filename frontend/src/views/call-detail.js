import { getCallDetail, retryStage, submitCallFeedback, listCallFeedback } from "../api";

export async function renderCallDetailView({ callId, onBack, prefetched }) {
  const container = document.createElement("div");
  container.className = "call-detail";

  let data;
  try {
    data = prefetched || (await getCallDetail(callId));
  } catch (error) {
    container.textContent = `Failed to load call detail: ${error.message}`;
    container.classList.add("empty-state");
    return container;
  }

  const back = document.createElement("button");
  back.className = "button";
  back.textContent = "Back to Calls";
  back.addEventListener("click", onBack);

  const header = document.createElement("div");
  header.className = "detail-header";
  const operator = data.operator_fields || {};
  const agencyLabel = operator.agency || "Unknown";
  const typeLabel = operator.incident_type || "Unspecified";
  const addressLabel = operator.address || "Location unknown";
  const townLabel = operator.town || "";
  const crossLabel = operator.cross_street || "";
  const poiLabel = operator.poi || "";
  header.innerHTML = `
    <div class="detail-id">${data.call.call_id || data.call.callId}</div>
    <div class="detail-path">${data.call.source_path || data.call.sourcePath}</div>
    <div class="incident-meta">${agencyLabel} · ${typeLabel}</div>
    <div class="incident-meta">${[addressLabel, townLabel].filter(Boolean).join(" · ")}</div>
  `;

  const stages = document.createElement("div");
  stages.className = "detail-section";
  stages.innerHTML = "<h2>Stages</h2>";
  const stageList = document.createElement("ul");
  data.stages.forEach((stage) => {
    const item = document.createElement("li");
    item.className = "stage-item";
    const label = stage.stage_name || stage.stage;
    item.innerHTML = `<span>${label}: ${stage.status}</span>`;
    const retry = document.createElement("button");
    retry.className = "button small";
    retry.textContent = "Retry";
    retry.addEventListener("click", async (event) => {
      event.stopPropagation();
      await retryStage(callId, label);
      location.reload();
    });
    item.appendChild(retry);
    stageList.appendChild(item);
  });
  stages.appendChild(stageList);

  const transcripts = document.createElement("div");
  transcripts.className = "detail-section";
  transcripts.innerHTML = "<h2>Transcript</h2>";
  const transcriptText = data.transcripts[0]?.text || "No transcript yet.";
  const transcriptBlock = document.createElement("pre");
  transcriptBlock.textContent = transcriptText;
  transcripts.appendChild(transcriptBlock);

  const summaries = document.createElement("div");
  summaries.className = "detail-section";
  summaries.innerHTML = "<h2>Summary</h2>";
  const summaryText = operator.summary || data.summaries[0]?.summary_text || "No summary yet.";
  summaries.appendChild(document.createTextNode(summaryText));

  const details = document.createElement("div");
  details.className = "detail-section";
  details.innerHTML = "<h2>Details</h2>";
  const detailList = document.createElement("ul");
  detailList.className = "evidence-list";
  const detailRows = [
    ["Agency", agencyLabel],
    ["Incident type", typeLabel],
    ["Address", addressLabel],
    ["Town", townLabel || "Unknown"],
    ["Cross street", crossLabel || "None"],
    ["POI", poiLabel || "None"]
  ];
  detailRows.forEach(([label, value]) => {
    const item = document.createElement("li");
    item.className = "evidence-item";
    item.textContent = `${label}: ${value}`;
    detailList.appendChild(item);
  });
  details.appendChild(detailList);

  const feedback = document.createElement("div");
  feedback.className = "detail-section";
  feedback.innerHTML = "<h2>Feedback</h2>";
  const feedbackList = document.createElement("ul");
  feedbackList.className = "evidence-list";

  const feedbackActions = [
    { label: "Bad transcript", type: "bad_transcript" },
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
      await submitCallFeedback(callId, { feedback_type: action.type });
      const item = document.createElement("li");
      item.className = "evidence-item";
      item.textContent = `${action.label} submitted (queued)`;
      feedbackList.prepend(item);
      button.disabled = false;
    });
    feedbackButtons.appendChild(button);
  });

  try {
    const existing = await listCallFeedback(callId);
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
  container.appendChild(details);
  container.appendChild(stages);
  container.appendChild(transcripts);
  container.appendChild(summaries);
  container.appendChild(feedback);

  return container;
}
