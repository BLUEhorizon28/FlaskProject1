// This array will store the real-time alerts from the server.
let allAlerts = [];

// --- Real-Time Connection Setup ---
// Connect to the backend WebSocket server. Make sure the URL is correct.
const socket = io.connect('http://127.0.0.1:5001');

// This function runs whenever the server sends a 'new_alert' message.
socket.on('new_alert', function(newAlert) {
    console.log("SUCCESS: Received new alert via WebSocket:", newAlert);

    // Add the new alert to the top of our local data array.
    allAlerts.unshift(newAlert);

    // Refresh the alerts displayed on the screen.
    const currentFilter = document.getElementById('riskFilter').value;
    renderAlerts(currentFilter);

    // Show a pop-up notification and update the bell icon.
    showNotification(`New ${newAlert.risk} risk alert from ${newAlert.username}`);
    updateNotificationBadge(1);
});

// This function runs when the page first loads.
document.addEventListener('DOMContentLoaded', function() {
    console.log("Frontend loaded. Fetching initial data from backend...");
    fetchInitialData();

    // Set up button click listeners.
    document.getElementById('riskFilter').addEventListener('change', filterAlerts);
    document.querySelector('.refresh-btn').addEventListener('click', refreshAlerts);
});

// --- Data Fetching Functions ---
// Fetches the initial state of the dashboard from the backend APIs.
async function fetchInitialData() {
    try {
        const [alertsRes, statsRes, modelHealthRes] = await Promise.all([
            fetch('http://127.0.0.1:5001/api/alerts'),
            fetch('http://127.0.0.1:5001/api/stats'),
            fetch('http://127.0.0.1:5001/api/model_health')
        ]);

        allAlerts = await alertsRes.json();
        const statsData = await statsRes.json();
        const modelHealthData = await modelHealthRes.json();

        console.log("SUCCESS: Fetched initial data.", { statsData, modelHealthData });

        // Update the HTML with the data we just fetched.
        renderAlerts();
        updateStats(statsData);
        updateModelHealth(modelHealthData);

    } catch (error) {
        console.error("ERROR: Failed to fetch initial data from backend.", error);
        showNotification("Error: Could not connect to the backend.", "error");
    }
}

// --- DOM Update Functions ---
// These functions take the data and put it into the HTML.
function updateStats(stats) {
    document.querySelector('.stat-card:nth-child(1) .stat-value').textContent = stats.messages_analyzed.toLocaleString();
    document.querySelector('.stat-card:nth-child(2) .stat-value').textContent = stats.sellers_detected.toLocaleString();
    document.querySelector('.stat-card:nth-child(3) .stat-value').textContent = stats.accounts_blocked.toLocaleString();
    document.querySelector('.stat-card:nth-child(4) .stat-value').textContent = `${stats.real_time_accuracy}%`;
}

function updateModelHealth(health) {
    document.querySelector('.metric:nth-child(1) .metric-value').textContent = health.precision;
    document.querySelector('.metric:nth-child(1) .metric-fill').style.width = `${health.precision * 100}%`;
    document.querySelector('.metric:nth-child(2) .metric-value').textContent = health.recall;
    document.querySelector('.metric:nth-child(2) .metric-fill').style.width = `${health.recall * 100}%`;
    document.querySelector('.metric:nth-child(3) .metric-value').textContent = health.f1_score;
    document.querySelector('.metric:nth-child(3) .metric-fill').style.width = `${health.f1_score * 100}%`;
    document.querySelector('.info-item:nth-child(1) .info-value').textContent = health.last_retrain;
    document.querySelector('.info-item:nth-child(2) .info-value').textContent = health.version;
    const statusBadge = document.querySelector('.status-badge');
    statusBadge.textContent = health.status;
    statusBadge.className = `status-badge ${health.status.toLowerCase()}`;
}

function renderAlerts(filter = 'all') {
    const alertsContainer = document.querySelector('.alerts-container');
    alertsContainer.innerHTML = '';

    const filteredAlerts = filter === 'all'
        ? allAlerts
        : allAlerts.filter(alert => alert.risk.toLowerCase() === filter);

    if (filteredAlerts.length === 0) {
        alertsContainer.innerHTML = `<div class="no-alerts"><i class="fas fa-check-circle"></i><p>No alerts to display. System is clear.</p></div>`;
        return;
    }

    filteredAlerts.forEach(alert => {
        const alertElement = createAlertElement(alert);
        alertsContainer.appendChild(alertElement);
    });
}

function createAlertElement(alert) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert-card ${alert.risk.toLowerCase()}`;
    alertElement.innerHTML = `
        <div class="alert-header">
            <div>
                <div class="alert-id">${alert.id}</div>
                <div class="alert-platform"><i class="fab fa-${alert.platform.toLowerCase()}"></i> ${alert.platform}</div>
            </div>
            <div class="alert-time">${alert.timestamp}</div>
        </div>
        <div class="alert-content">
            <div class="alert-username">${alert.username}</div>
            <div class="alert-details">
                ${alert.details.map(detail => `<div class="detail-item"><i class="fas fa-circle"></i><span>${detail}</span></div>`).join('')}
            </div>
            <div>
                <strong>Risk:</strong> 
                <span class="alert-risk risk-${alert.risk.toLowerCase()}">${alert.risk}</span>
            </div>
        </div>
        <div class="alert-actions">
            <button class="action-btn investigate"><i class="fas fa-search"></i> Investigate</button>
            <button class="action-btn dismiss"><i class="fas fa-times"></i> Dismiss</button>
        </div>
    `;
    return alertElement;
}

function filterAlerts() {
    const filterValue = document.getElementById('riskFilter').value;
    renderAlerts(filterValue);
}

// --- User Interaction Functions ---
function refreshAlerts() {
    const refreshBtn = document.querySelector('.refresh-btn');
    refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refreshing';
    fetchInitialData().finally(() => {
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        showNotification('Dashboard data refreshed.');
    });
}

function updateNotificationBadge(change) {
    const badge = document.querySelector('.notification-badge .badge');
    let count = parseInt(badge.textContent) || 0;
    count += change;
    badge.textContent = count;
    badge.style.display = count > 0 ? 'flex' : 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `<i class="fas fa-info-circle"></i><span>${message}</span>`;
    document.body.appendChild(notification);

    setTimeout(() => notification.classList.add('show'), 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 4000);
}