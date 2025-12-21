import { getCallDetail, retryStage } from "../api";

export async function renderCallDetailView({ callId, onBack }) {
  const container = document.createElement("div");
  container.className = "call-detail";

  const data = await getCallDetail(callId);

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
  transcripts.appendChild(document.createTextNode(transcriptText));

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
    groupingBlock.appendChild(decision);
    groupingBlock.appendChild(confidenceText);
    groupingBlock.appendChild(review);
  } else {
    groupingBlock.appendChild(document.createTextNode("No grouping decision yet."));
  }

  metadata.appendChild(extractionBlock);
  metadata.appendChild(groupingBlock);

  container.appendChild(back);
  container.appendChild(header);
  container.appendChild(stages);
  container.appendChild(transcripts);
  container.appendChild(metadata);
  container.appendChild(summaries);

  return container;
}
