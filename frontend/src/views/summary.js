import { fetchSummaryMetrics, fetchTrendBuckets, fetchHotspots } from "../api";

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

function renderTrendChart(buckets) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 300 80");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "80");

  const max = Math.max(1, ...buckets.map((b) => b.call_count));
  const barWidth = 300 / Math.max(buckets.length, 1);

  buckets.forEach((bucket, index) => {
    const height = (bucket.call_count / max) * 70;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(index * barWidth + 2));
    rect.setAttribute("y", String(78 - height));
    rect.setAttribute("width", String(barWidth - 4));
    rect.setAttribute("height", String(height));
    rect.setAttribute("fill", "#64748b");
    svg.appendChild(rect);
  });

  return svg;
}

export async function renderSummaryView({ filters }) {
  const container = document.createElement("div");
  container.className = "summary-container";
  let metrics = null;
  let buckets = [];
  let hotspots = [];
  let errorMessage = "";

  try {
    metrics = await fetchSummaryMetrics({ filters });
    buckets = await fetchTrendBuckets({ filters, bucketMinutes: 60 });
    hotspots = await fetchHotspots({ filters, hotspotType: "any" });
  } catch (error) {
    errorMessage = error.message || "Summary unavailable.";
  }

  const strip = document.createElement("div");
  strip.className = "summary-strip-inner";
  strip.appendChild(createMetric("Total calls", metrics?.total_calls));
  strip.appendChild(createMetric("Active incidents", metrics?.active_incidents));
  strip.appendChild(createMetric("High priority", metrics?.high_priority_calls));
  strip.appendChild(createMetric("Failed stages", metrics?.failed_stages));
  strip.appendChild(createMetric("Notifications sent", metrics?.notifications_sent));

  const trend = document.createElement("div");
  trend.className = "trend-panel";
  const trendTitle = document.createElement("div");
  trendTitle.className = "trend-title";
  trendTitle.textContent = "Calls over time";
  trend.appendChild(trendTitle);
  trend.appendChild(renderTrendChart(buckets));

  const hotspot = document.createElement("div");
  hotspot.className = "hotspot-panel";
  const hotspotTitle = document.createElement("div");
  hotspotTitle.className = "trend-title";
  hotspotTitle.textContent = "Top hotspots";
  const list = document.createElement("ul");
  list.className = "evidence-list";
  if (hotspots.length) {
    hotspots.forEach((entry) => {
      const item = document.createElement("li");
      item.className = "evidence-item";
      item.textContent = `${entry.label} • ${entry.count}`;
      list.appendChild(item);
    });
  } else {
    const item = document.createElement("li");
    item.className = "evidence-item";
    item.textContent = errorMessage || "No hotspots for current filters.";
    list.appendChild(item);
  }
  hotspot.appendChild(hotspotTitle);
  hotspot.appendChild(list);

  container.appendChild(strip);
  container.appendChild(trend);
  container.appendChild(hotspot);

  if (errorMessage) {
    const error = document.createElement("div");
    error.className = "error-state";
    error.textContent = errorMessage;
    container.appendChild(error);
  }

  return container;
}
