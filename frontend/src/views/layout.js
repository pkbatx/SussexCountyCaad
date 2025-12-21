export function renderLayout(target, { title, body, sidebar, main, summary }) {
  target.innerHTML = "";

  const header = document.createElement("header");
  header.className = "app-header";
  header.innerHTML = `
    <div class="brand">SussexCountyCAAD</div>
    <nav class="nav">
      <a class="nav-item" href="#incidents">Incidents</a>
      <a class="nav-item" href="#calls">Calls</a>
      <a class="nav-item" href="#notifications">Notifications</a>
    </nav>
  `;

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

  const sidebarPanel = document.createElement("section");
  sidebarPanel.className = "panel panel-sidebar";
  if (sidebar) {
    sidebarPanel.appendChild(sidebar);
  }

  const mainPanel = document.createElement("section");
  mainPanel.className = "panel panel-main";
  const mainContent = main || body;
  if (mainContent) {
    mainPanel.appendChild(mainContent);
  } else {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No data available.";
    mainPanel.appendChild(empty);
  }

  grid.appendChild(sidebarPanel);
  grid.appendChild(mainPanel);

  shell.appendChild(heading);
  shell.appendChild(summarySlot);
  shell.appendChild(grid);

  target.appendChild(header);
  target.appendChild(shell);
}
