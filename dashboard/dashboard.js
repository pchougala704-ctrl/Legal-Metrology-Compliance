import { DEMO_MODE, loadDashboard, loadInspection } from './services/dashboardApi.js';

let dashboardData;
let filteredInspections = [];

const $ = (selector) => document.querySelector(selector);
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value ?? 0);
const dateLabel = (value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`));

function statusClass(status) { return `status-${status.toLowerCase().replaceAll(' ', '-')}`; }
function avatarClass(initials) { return initials === 'MC' ? 'avatar-teal' : initials === 'JB' ? 'avatar-orange' : initials === 'PN' ? 'avatar-blue' : 'avatar-purple'; }

function renderStats() {
  Object.entries(dashboardData.stats).forEach(([key, value]) => { const element = document.querySelector(`[data-stat="${key}"]`); if (element) element.textContent = formatNumber(value); });
  $('#donut-total').textContent = formatNumber(dashboardData.status.reduce((sum, item) => sum + item.value, 0));
  document.querySelectorAll('[data-severity]').forEach((element) => { const match = dashboardData.severity.find((item) => item.label === element.dataset.severity); element.textContent = formatNumber(match?.value); });
}

function renderStatus() {
  const total = dashboardData.status.reduce((sum, item) => sum + item.value, 0);
  const stops = dashboardData.status.reduce((result, item, index) => { const start = index === 0 ? 0 : result[index - 1].end; const end = start + (item.value / total) * 100; result.push({ color: item.color, start, end }); return result; }, []);
  $('#status-donut').style.background = `conic-gradient(${stops.map((stop) => `${stop.color} ${stop.start}% ${stop.end}%`).join(', ')})`;
  $('#status-legend').innerHTML = dashboardData.status.map((item) => `<div class="status-line"><span><i style="background:${item.color}"></i>${item.label}</span><strong>${formatNumber(item.value)}</strong></div>`).join('');
}

function renderTrend(period = 'week') {
  const points = dashboardData.trend[period] || dashboardData.trend.week || [];
  const maximum = Math.max(...points.map((item) => item.completed + item.pending), 1);
  $('#activity-chart').innerHTML = points.map((item) => `<div class="chart-group"><div class="chart-bar" style="height:${(item.completed / maximum) * 100}%" title="${item.completed} completed"></div><div class="chart-bar pending" style="height:${(item.pending / maximum) * 100}%" title="${item.pending} pending"></div></div>`).join('');
  $('#chart-axis').innerHTML = points.map((item) => `<span>${item.label}</span>`).join('');
}

function renderTable() {
  $('#inspection-body').innerHTML = filteredInspections.length ? filteredInspections.map((inspection) => `<tr><td><strong>${inspection.id}</strong></td><td><span class="person"><span class="avatar ${avatarClass(inspection.initials)}">${inspection.initials}</span>${inspection.inspector}</span></td><td>${inspection.location}</td><td>${dateLabel(inspection.date)}</td><td><span class="status-badge ${statusClass(inspection.status)}">${inspection.status}</span></td><td>${inspection.violations}</td><td><button class="detail-button" data-inspection-id="${inspection.id}" aria-label="View ${inspection.id} details">→</button></td></tr>`).join('') : '<tr><td colspan="7" class="empty-row">No inspections match these filters.</td></tr>';
  $('#table-count').textContent = filteredInspections.length ? `Showing ${filteredInspections.length} of ${dashboardData.inspections.length} inspections` : 'No matching inspections';
  document.querySelectorAll('[data-inspection-id]').forEach((button) => button.addEventListener('click', () => openDetails(button.dataset.inspectionId)));
}

function applyFilters() {
  const query = $('#inspection-search').value.toLowerCase().trim();
  const status = $('#status-filter').value;
  const priority = $('#priority-filter').value;
  filteredInspections = dashboardData.inspections.filter((item) => [item.id, item.inspector, item.location].join(' ').toLowerCase().includes(query) && (!status || item.status === status) && (!priority || item.priority === priority));
  renderTable();
}

function renderActivity() {
  $('#activity-feed').innerHTML = dashboardData.activity.map((item) => `<div class="timeline-item"><span class="avatar ${avatarClass(item.initials)}">${item.initials}</span><div class="timeline-copy"><strong>${item.name}</strong> ${item.action} <b>${item.id}</b><small>${item.time}</small></div></div>`).join('');
}

function renderCategories() {
  const max = Math.max(...dashboardData.categories.map((item) => item.value), 1);
  $('#category-list').innerHTML = dashboardData.categories.map((item) => `<div class="category-row"><span>${item.label}</span><span>${item.value}</span><div class="category-bar"><i style="width:${(item.value / max) * 100}%"></i></div></div>`).join('');
}

function renderMap() {
  const canvas = $('#map-canvas');
  const bounds = dashboardData.inspections.reduce((result, item) => { result.lat.push(item.coordinates?.[0]); result.lng.push(item.coordinates?.[1]); return result; }, { lat: [], lng: [] });
  const minLat = Math.min(...bounds.lat); const maxLat = Math.max(...bounds.lat); const minLng = Math.min(...bounds.lng); const maxLng = Math.max(...bounds.lng);
  canvas.querySelectorAll('.map-marker').forEach((marker) => marker.remove());
  dashboardData.inspections.forEach((item) => { if (!item.coordinates) return; const left = ((item.coordinates[1] - minLng) / (maxLng - minLng || 1)) * 78 + 9; const top = (1 - (item.coordinates[0] - minLat) / (maxLat - minLat || 1)) * 66 + 15; const marker = document.createElement('button'); marker.className = `map-marker ${item.status === 'Pending' ? 'pending' : item.status === 'Failed' ? 'failed' : ''}`; marker.style.left = `${left}%`; marker.style.top = `${top}%`; marker.title = `${item.id}: ${item.location}`; marker.setAttribute('aria-label', `View ${item.id} at ${item.location}`); marker.addEventListener('click', () => openDetails(item.id)); canvas.append(marker); });
  $('#map-count').textContent = `${dashboardData.inspections.length} locations`;
}

async function openDetails(id) {
  const inspection = await loadInspection(id);
  $('#detail-title').textContent = inspection.id;
  $('#detail-content').innerHTML = `<div class="detail-grid"><div class="detail-field"><small>Inspector</small><strong>${inspection.inspector}</strong></div><div class="detail-field"><small>Status</small><strong><span class="status-badge ${statusClass(inspection.status)}">${inspection.status}</span></strong></div><div class="detail-field"><small>Location</small><strong>${inspection.location}</strong></div><div class="detail-field"><small>Date</small><strong>${dateLabel(inspection.date)}</strong></div><div class="detail-field"><small>Inspection type</small><strong>${inspection.type || 'General compliance inspection'}</strong></div><div class="detail-field"><small>Coordinates</small><strong>${inspection.coordinates?.join(', ') || 'Not provided'}</strong></div></div><div class="detail-violations"><h3>Violations (${inspection.violations})</h3><p>${inspection.violations ? 'Review the linked violation records in the compliance workspace.' : 'No violations recorded for this inspection.'}</p></div>`;
  $('#detail-modal').hidden = false;
}

function exportReport() {
  const rows = [['Inspection ID', 'Inspector', 'Location', 'Date', 'Status', 'Violations', 'Priority'], ...dashboardData.inspections.map((item) => [item.id, item.inspector, item.location, item.date, item.status, item.violations, item.priority])];
  const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'gauge-inspection-report.csv'; link.click(); URL.revokeObjectURL(link.href);
}

function wireEvents() {
  $('#inspection-search').addEventListener('input', applyFilters); $('#status-filter').addEventListener('change', applyFilters); $('#priority-filter').addEventListener('change', applyFilters); $('#filter-toggle').addEventListener('click', () => { $('#filter-row').hidden = !$('#filter-row').hidden; }); $('#trend-period').addEventListener('change', (event) => renderTrend(event.target.value)); $('#export-button').addEventListener('click', exportReport); $('#modal-close').addEventListener('click', () => { $('#detail-modal').hidden = true; }); $('#detail-modal').addEventListener('click', (event) => { if (event.target.id === 'detail-modal') $('#detail-modal').hidden = true; }); $('.mobile-menu').addEventListener('click', () => $('.sidebar').classList.toggle('open')); document.querySelectorAll('.nav-item').forEach((item) => item.addEventListener('click', () => $('.sidebar').classList.remove('open'))); $('#data-notice button').addEventListener('click', () => { $('#data-notice').hidden = true; }); $('#refresh-button').addEventListener('click', refreshDashboard);
}

async function refreshDashboard() { $('#refresh-button').disabled = true; $('#refresh-button').classList.add('is-loading'); dashboardData = await loadDashboard(); filteredInspections = dashboardData.inspections; renderAll(); $('#refresh-button').disabled = false; $('#refresh-button').classList.remove('is-loading'); }
function renderAll() { renderStats(); renderStatus(); renderTrend($('#trend-period').value); renderTable(); renderActivity(); renderCategories(); renderMap(); $('#data-notice').hidden = !dashboardData.demo; if (dashboardData.error) $('#data-notice span:nth-child(2)').innerHTML = `<strong>API unavailable.</strong> ${dashboardData.error}`; $('#last-synced').textContent = dashboardData.demo ? 'demo dataset' : 'just now'; }

async function init() { wireEvents(); dashboardData = await loadDashboard(); filteredInspections = dashboardData.inspections; renderAll(); if (!DEMO_MODE) $('.live-status').innerHTML = '<i></i> API connected'; }
init();