export function renderLayout(target, { title, body }) {
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

  const main = document.createElement("main");
  main.className = "app-main";
  const heading = document.createElement("h1");
  heading.textContent = title;
  const content = document.createElement("div");
  content.className = "content";
  if (body) {
    content.appendChild(body);
  } else {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No data available.";
    content.appendChild(empty);
  }

  main.appendChild(heading);
  main.appendChild(content);

  target.appendChild(header);
  target.appendChild(main);
}
