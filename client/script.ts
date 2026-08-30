// @ts-nocheck
// This file intentionally uses browser-compatible JavaScript while retaining a
// .ts extension to keep the dashboard's source assets together.
const REFRESH_INTERVAL_MS = 5000;

function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Dashboard element #${id} is missing`);
  return element;
}

const elements = {
  totalLogs: byId("total-logs"),
  throughput: byId("throughput"),
  errorRate: byId("error-rate"),
  queueBacklog: byId("queue-backlog"),
  topServices: byId("top-services"),
  refreshStatus: byId("refresh-status"),
};

/** @param {number} value */
function formatNumber(value) {
  return new Intl.NumberFormat().format(value);
}

/** @param {Record<string, number>} logsByService */
function renderTopServices(logsByService) {
  const services = Object.entries(logsByService)
    .sort(([, firstCount], [, secondCount]) => secondCount - firstCount)
    .slice(0, 5);

  if (services.length === 0) {
    elements.topServices.innerHTML =
      '<li class="empty-state">No logs received yet.</li>';
    return;
  }

  elements.topServices.innerHTML = services
    .map(
      ([service, count]) => `
        <li>
          <span>${escapeHtml(service)}</span>
          <strong>${formatNumber(count)} logs</strong>
        </li>`,
    )
    .join("");
}

/** @param {string} value */
function escapeHtml(value) {
  const container = document.createElement("span");
  container.textContent = value;
  return container.innerHTML;
}

async function refreshDashboard() {
  try {
    const response = await fetch("/metrics", { cache: "no-store" });
    if (!response.ok)
      throw new Error(`Metrics request failed: ${response.status}`);

    const metrics = await response.json();
    elements.totalLogs.textContent = formatNumber(metrics.total_logs_received);
    elements.throughput.textContent = Number(metrics.throughput).toFixed(2);
    elements.errorRate.textContent = `${(Number(metrics.error_rate) * 100).toFixed(2)}%`;
    elements.queueBacklog.textContent = formatNumber(metrics.queue_backlog);
    renderTopServices(metrics.logs_by_service ?? {});
    elements.refreshStatus.textContent = `Last updated ${new Date().toLocaleTimeString()} · Refreshing every 5 seconds`;
  } catch (error) {
    console.error(error);
    elements.refreshStatus.textContent =
      "Unable to load metrics. Retrying in 5 seconds.";
  }
}

refreshDashboard();
window.setInterval(refreshDashboard, REFRESH_INTERVAL_MS);
