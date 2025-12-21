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
  header.innerHTML = `
    <div class="detail-id">${data.call.call_id || data.call.callId}</div>
    <div class="detail-path">${data.call.source_path || data.call.sourcePath}</div>
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
  const summaryText = data.summaries[0]?.summary_text || "No summary yet.";
  summaries.appendChild(document.createTextNode(summaryText));

  const metadata = document.createElement("div");
  metadata.className = "detail-section";
  metadata.innerHTML = "<h2>Metadata</h2>";
  const extraction = data.metadataExtracts.find(
    (item) => item.schema_version === "extraction.v2"
  );
  const grouping = data.metadataExtracts.find(
    (item) => item.schema_version === "grouping.v2"
  );

  const extractionBlock = document.createElement("div");
  extractionBlock.className = "metadata-block";
  extractionBlock.innerHTML = "<h3>Extraction v2</h3>";

  if (extraction?.payload) {
    const list = document.createElement("ul");
    list.className = "evidence-list";
    const fields = [
      "incident_type",
      "priority",
      "jurisdiction",
      "channel",
      "talkgroup",
      "units",
      "incident_id",
      "address_raw",
      "address_normalized",
      "cross_street_1",
      "cross_street_2",
      "landmark",
      "city",
      "notes"
    ];

    fields.forEach((field) => {
      const value = extraction.payload[field];
      const confidence = extraction.payload.field_confidence?.[field];
      const evidence = extraction.payload.evidence?.[field] || [];
      const item = document.createElement("li");
      item.className = "evidence-item";
      const valueText = Array.isArray(value) ? value.join(", ") : value;

      const label = document.createElement("div");
      label.className = "evidence-field";
      label.textContent = `${field}: ${valueText ?? "null"}`;
      item.appendChild(label);

      const meta = document.createElement("div");
      meta.className = "evidence-meta";
      meta.textContent = `confidence: ${confidence ?? "n/a"}`;
      item.appendChild(meta);

      if (evidence.length) {
        const evidenceText = evidence
          .map((entry) => entry.text)
          .filter(Boolean)
          .join(" | ");
        const evidenceEl = document.createElement("div");
        evidenceEl.className = "evidence-text";
        evidenceEl.textContent = `evidence: ${evidenceText}`;
        item.appendChild(evidenceEl);
      }
      list.appendChild(item);
    });

    extractionBlock.appendChild(list);
  } else {
    extractionBlock.appendChild(document.createTextNode("No extraction yet."));
  }

  const groupingBlock = document.createElement("div");
  groupingBlock.className = "metadata-block";
  groupingBlock.innerHTML = "<h3>Grouping v2</h3>";

  if (grouping?.payload) {
    const decision = document.createElement("div");
    decision.textContent = `decision: ${grouping.payload.decision}`;
    const confidenceText = document.createElement("div");
    confidenceText.textContent = `confidence: ${grouping.payload.confidence}`;
    const review = document.createElement("div");
    review.className = grouping.payload.requires_review ? "review-flag" : "review-flag ok";
    review.textContent = grouping.payload.requires_review ? "requires review" : "no review";
    const explanation = document.createElement("div");
    explanation.className = "grouping-explanation";
    explanation.textContent = grouping.payload.explanation || "No explanation provided.";
    const signals = document.createElement("div");
    signals.className = "grouping-meta";
    const signalList = (grouping.payload.signals || [])
      .map((signal) => `${signal.type} (${signal.weight})`)
      .join(" · ");
    signals.textContent = signalList || "No signals recorded.";
    groupingBlock.appendChild(decision);
    groupingBlock.appendChild(confidenceText);
    groupingBlock.appendChild(review);
    groupingBlock.appendChild(explanation);
    groupingBlock.appendChild(signals);
  } else {
    groupingBlock.appendChild(document.createTextNode("No grouping decision yet."));
  }

  metadata.appendChild(extractionBlock);
  metadata.appendChild(groupingBlock);

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
  container.appendChild(stages);
  container.appendChild(transcripts);
  container.appendChild(metadata);
  container.appendChild(feedback);
  container.appendChild(summaries);

  return container;
}
