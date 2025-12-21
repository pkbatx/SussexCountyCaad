import "./styles.css";
import { renderLayout } from "./views/layout";
import { renderCallsView } from "./views/calls";
import { renderCallDetailView } from "./views/call-detail";
import { renderIncidentsView } from "./views/incidents";
import { renderIncidentDetailView } from "./views/incident-detail";
import { renderNotificationsView } from "./views/notifications";

const root = document.getElementById("app");

async function render() {
  const hash = window.location.hash.replace("#", "");
  if (hash.startsWith("call/")) {
    const callId = hash.split("/")[1];
    const body = await renderCallDetailView({
      callId,
      onBack: () => {
        window.location.hash = "";
      }
    });
    renderLayout(root, { title: "Call Detail", body });
    return;
  }

  if (hash.startsWith("incident/")) {
    const incidentId = hash.split("/")[1];
    const body = await renderIncidentDetailView({
      incidentId,
      onBack: () => {
        window.location.hash = "incidents";
      }
    });
    renderLayout(root, { title: "Incident Detail", body });
    return;
  }

  if (hash === "incidents") {
    const body = await renderIncidentsView({
      onSelect: (incidentId) => {
        window.location.hash = `incident/${incidentId}`;
      }
    });
    renderLayout(root, { title: "Incidents", body });
    return;
  }

  if (hash === "notifications") {
    const body = await renderNotificationsView();
    renderLayout(root, { title: "Notifications", body });
    return;
  }

  const body = await renderCallsView({
    onSelect: (callId) => {
      window.location.hash = `call/${callId}`;
    }
  });
  renderLayout(root, { title: "Call Feed", body });
}

window.addEventListener("hashchange", render);
render().catch((error) => {
  const placeholder = document.createElement("div");
  placeholder.className = "empty-state";
  placeholder.textContent = `Failed to load: ${error.message}`;
  renderLayout(root, { title: "Call Feed", body: placeholder });
});
