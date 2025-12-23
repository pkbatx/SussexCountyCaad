import { getCallDetail, retryStage, submitCallFeedback, listCallFeedback } from "../api";

export async function renderCallDetailView({
  callId,
  onBack,
  prefetched,
  audioController,
  onFeedback
}) {
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
    <div class="detail-title">Call Detail</div>
    <div class="incident-meta">${agencyLabel} · ${typeLabel}</div>
    <div class="incident-meta">${[addressLabel, townLabel].filter(Boolean).join(" · ")}</div>
  `;

  const audioSection = document.createElement("div");
  audioSection.className = "detail-section";
  audioSection.innerHTML = "<h2>Audio</h2>";
  const audioRow = document.createElement("div");
  audioRow.className = "audio-row";
  const playButton = document.createElement("button");
  playButton.className = "button";
  playButton.textContent = data.audio?.url ? "Play audio" : "Audio unavailable";
  playButton.disabled = !data.audio?.url;
  playButton.addEventListener("click", () => {
    audioController?.setSource({
      src: data.audio?.url,
      label: `${agencyLabel} · ${typeLabel}`
    });
  });
  audioRow.appendChild(playButton);
  audioSection.appendChild(audioRow);

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

  const feedbackFields = [
    { label: "Agency", value: agencyLabel, type: "wrong_agency", confirm: "confirm_agency" },
    { label: "Incident type", value: typeLabel, type: "wrong_type", confirm: "confirm_type" },
    { label: "Address", value: addressLabel, type: "wrong_address", confirm: "confirm_address" },
    { label: "Town", value: townLabel || "Unknown", type: "wrong_town", confirm: "confirm_town" },
    {
      label: "Cross street",
      value: crossLabel || "None",
      type: "wrong_cross_street",
      confirm: "confirm_cross_street"
    },
    { label: "POI", value: poiLabel || "None", type: "wrong_poi", confirm: "confirm_poi" }
  ];

  const details = document.createElement("div");
  details.className = "detail-section";
  details.innerHTML = "<h2>Details</h2>";
  const fieldList = document.createElement("ul");
  fieldList.className = "detail-table";

  const feedbackHistory = document.createElement("ul");
  feedbackHistory.className = "evidence-list";

  feedbackFields.forEach((field) => {
    const item = document.createElement("li");
    item.className = "detail-row";
    const label = document.createElement("div");
    label.className = "detail-label";
    label.textContent = field.label;
    const value = document.createElement("div");
    value.className = "detail-value";
    value.textContent = field.value;
    const actions = document.createElement("div");
    actions.className = "detail-actions";
    const up = document.createElement("button");
    up.className = "thumb-button thumb-button--confirm";
    up.title = "Mark correct";
    up.textContent = "OK";
    up.addEventListener("click", async () => {
      up.disabled = true;
      await submitCallFeedback(callId, { feedback_type: field.confirm });
      const historyItem = document.createElement("li");
      historyItem.className = "evidence-item";
      historyItem.textContent = `${field.label} confirmed`;
      feedbackHistory.prepend(historyItem);
      onFeedback?.(callId);
      up.disabled = false;
    });
    const down = document.createElement("button");
    down.className = "thumb-button thumb-button--flag";
    down.title = "Mark incorrect";
    down.textContent = "Flag";
    down.addEventListener("click", async () => {
      down.disabled = true;
      await submitCallFeedback(callId, { feedback_type: field.type });
      const historyItem = document.createElement("li");
      historyItem.className = "evidence-item";
      historyItem.textContent = `${field.label} flagged (queued)`;
      feedbackHistory.prepend(historyItem);
      onFeedback?.(callId);
      down.disabled = false;
    });
    actions.appendChild(up);
    actions.appendChild(down);
    item.appendChild(label);
    item.appendChild(value);
    item.appendChild(actions);
    fieldList.appendChild(item);
  });
  details.appendChild(fieldList);

  const feedbackHistorySection = document.createElement("div");
  feedbackHistorySection.className = "detail-section";
  feedbackHistorySection.innerHTML = "<h2>Feedback history</h2>";

  try {
    const existing = await listCallFeedback(callId);
    existing.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "evidence-item";
      item.textContent = `${entry.feedback_type} • ${entry.apply_status}`;
      feedbackHistory.appendChild(item);
    });
  } catch (_error) {
    const item = document.createElement("li");
    item.className = "evidence-item";
    item.textContent = "Feedback history unavailable.";
    feedbackHistory.appendChild(item);
  }

  feedbackHistorySection.appendChild(feedbackHistory);

  container.appendChild(back);
  container.appendChild(header);
  container.appendChild(audioSection);
  container.appendChild(details);
  container.appendChild(stages);
  container.appendChild(transcripts);
  container.appendChild(summaries);
  container.appendChild(feedbackHistorySection);

  return container;
}
