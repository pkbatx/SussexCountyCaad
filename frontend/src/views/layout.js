export function renderLayout(target, {
  title,
  left,
  center,
  right,
  summary,
  footer,
  sseStatus,
  nav
}) {
  target.innerHTML = "";

  const header = document.createElement("header");
  header.className = "app-header";
  const headerLeft = document.createElement("div");
  headerLeft.className = "header-left";
  const brand = document.createElement("div");
  brand.className = "brand";
  brand.textContent = "SussexCountyCAAD";
  headerLeft.appendChild(brand);
  const subtitle = document.createElement("div");
  subtitle.className = "brand-subtitle";
  subtitle.textContent = "Operational CAD View";
  headerLeft.appendChild(subtitle);

  const headerCenter = document.createElement("div");
  headerCenter.className = "header-center";
  if (nav) {
    headerCenter.appendChild(nav);
  }

  const headerRight = document.createElement("div");
  headerRight.className = "header-right";
  const navTitle = document.createElement("div");
  navTitle.className = "nav-title";
  navTitle.textContent = "Operations Console";
  headerRight.appendChild(navTitle);
  const clock = document.createElement("div");
  clock.className = "header-clock";
  clock.textContent = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  headerRight.appendChild(clock);

  if (sseStatus?.status) {
    const badge = document.createElement("div");
    const status = sseStatus.status;
    badge.className = `sse-status sse-status--${status}`;
    badge.textContent =
      status === "connected"
        ? "Live"
        : status === "connecting"
        ? "Connecting"
        : "Offline";
    headerRight.appendChild(badge);
  }

  header.appendChild(headerLeft);
  header.appendChild(headerCenter);
  header.appendChild(headerRight);

  const shell = document.createElement("main");
  shell.className = "app-shell";

  const heading = document.createElement("div");
  heading.className = "page-heading";
  heading.textContent = title;

  const summarySlot = document.createElement("div");
  summarySlot.className = "summary-strip";
  if (summary) {
    summarySlot.appendChild(summary);
  }

  const grid = document.createElement("div");
  grid.className = "app-grid";

  const leftPanel = document.createElement("section");
  leftPanel.className = "panel panel-left";
  if (left) {
    leftPanel.appendChild(left);
  }

  const centerPanel = document.createElement("section");
  centerPanel.className = "panel panel-center";
  if (center) {
    centerPanel.appendChild(center);
  } else {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No data available.";
    centerPanel.appendChild(empty);
  }

  const rightPanel = document.createElement("section");
  rightPanel.className = "panel panel-right";
  if (right) {
    rightPanel.appendChild(right);
  }

  grid.appendChild(leftPanel);
  grid.appendChild(centerPanel);
  grid.appendChild(rightPanel);

  shell.appendChild(heading);
  shell.appendChild(summarySlot);
  shell.appendChild(grid);

  if (footer) {
    const footerSlot = document.createElement("div");
    footerSlot.className = "app-footer";
    footerSlot.appendChild(footer);
    shell.appendChild(footerSlot);
  }

  target.appendChild(header);
  target.appendChild(shell);
}
