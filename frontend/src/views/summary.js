import { fetchSummaryMetrics, fetchInsights, fetchDigestSummaries } from "../api";

function createMetric(label, value) {
  const item = document.createElement("div");
  item.className = "metric";
  const title = document.createElement("div");
  title.className = "metric-label";
  title.textContent = label;
  const number = document.createElement("div");
  number.className = "metric-value";
  number.textContent = value ?? "0";
  item.appendChild(title);
  item.appendChild(number);
  return item;
}

function renderInsightList(title, items, emptyMessage, limit = 6) {
  const panel = document.createElement("div");
  panel.className = "hotspot-panel";
  const heading = document.createElement("div");
  heading.className = "trend-title";
  heading.textContent = title;
  const list = document.createElement("ul");
  list.className = "evidence-list";
  if (items?.length) {
    items.slice(0, limit).forEach((entry) => {
      const item = document.createElement("li");
      item.className = "evidence-item";
      const label = entry.group_key || entry.label || "Unknown";
      const count = entry.value ?? entry.count ?? 0;
      item.textContent = `${label} • ${count}`;
      list.appendChild(item);
    });
  } else {
    const item = document.createElement("li");
    item.className = "evidence-item";
    item.textContent = emptyMessage;
    list.appendChild(item);
  }
  panel.appendChild(heading);
  panel.appendChild(list);
  return panel;
}

function renderDigestPanel({ title, lines, emptyMessage }) {
  const panel = document.createElement("div");
  panel.className = "digest-panel";
  const heading = document.createElement("div");
  heading.className = "trend-title";
  heading.textContent = title;
  const list = document.createElement("ul");
  list.className = "evidence-list";
  if (lines?.length) {
    lines.forEach((line) => {
      const item = document.createElement("li");
      item.className = "evidence-item";
      item.textContent = line;
      list.appendChild(item);
    });
  } else {
    const item = document.createElement("li");
    item.className = "evidence-item";
    item.textContent = emptyMessage;
    list.appendChild(item);
  }
  panel.appendChild(heading);
  panel.appendChild(list);
  return panel;
}

export async function renderSummaryView({ filters }) {
  const container = document.createElement("div");
  container.className = "summary-container";
  let metrics = null;
  let insights = null;
  let digests = [];
  let errorMessage = "";

  try {
    metrics = await fetchSummaryMetrics({ filters });
    insights = await fetchInsights({ filters, limit: 8 });
    const digestResponse = await fetchDigestSummaries({ filters });
    digests = digestResponse?.digests || [];
  } catch (error) {
    errorMessage = error.message || "Summary unavailable.";
  }

  const strip = document.createElement("div");
  strip.className = "summary-strip-inner";
  strip.appendChild(createMetric("Total calls", metrics?.total_calls));
  strip.appendChild(createMetric("Active incidents", metrics?.active_incidents));
  strip.appendChild(createMetric("Re-alerts", metrics?.re_alert_calls));
  const activeAgencies = insights?.metrics?.agency_calls?.length ?? 0;
  strip.appendChild(createMetric("Active agencies", activeAgencies));

  const digestLookup = new Map(
    digests.map((digest) => [
      digest.window_label,
      (() => {
        if (digest.summary_json) {
          try {
            return JSON.parse(digest.summary_json)?.lines || [];
          } catch (_error) {
            return [];
          }
        }
        return digest.summary_text ? digest.summary_text.split("\n") : [];
      })()
    ])
  );
  const digestPanel = document.createElement("div");
  digestPanel.className = "digest-grid";
  digestPanel.appendChild(
    renderDigestPanel({
      title: "Incident digest (last 24h)",
      lines: digestLookup.get("24h"),
      emptyMessage: errorMessage || "No digest available for the last 24 hours."
    })
  );
  digestPanel.appendChild(
    renderDigestPanel({
      title: "Incident digest (last 7d)",
      lines: digestLookup.get("7d"),
      emptyMessage: "No digest available for the last 7 days."
    })
  );
  digestPanel.appendChild(
    renderDigestPanel({
      title: "Incident digest (last 30d)",
      lines: digestLookup.get("30d"),
      emptyMessage: "No digest available for the last 30 days."
    })
  );

  const insightSection = document.createElement("div");
  insightSection.className = "insight-grid";
  const metricsList = insights?.metrics || {};
  insightSection.appendChild(
    renderInsightList(
      "Most active agencies",
      metricsList.agency_calls,
      errorMessage || "No agency activity for current filters."
    )
  );
  insightSection.appendChild(
    renderInsightList(
      "Re-alert agencies",
      metricsList.agency_re_alerts,
      "No re-alerts in this window."
    )
  );
  insightSection.appendChild(
    renderInsightList(
      "Active towns",
      metricsList.town_calls,
      errorMessage || "No towns for current filters."
    )
  );

  container.appendChild(strip);
  container.appendChild(digestPanel);
  container.appendChild(insightSection);

  if (errorMessage) {
    const error = document.createElement("div");
    error.className = "error-state";
    error.textContent = errorMessage;
    container.appendChild(error);
  }

  return container;
}
