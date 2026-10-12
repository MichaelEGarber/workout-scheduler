const STORAGE_KEY = 'stride-workout-data-v1';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ACTIVITY_TEMPLATES = [
  { id: 'gym-a', day: 1, title: 'Whole-body gym', type: 'gym', detail: 'Choose machines in any order', icon: '◉' },
  { id: 'ride-speed-a', day: 2, title: 'Cycling · speed intervals', type: 'cycling', detail: 'Short efforts with easy recovery', icon: '↗' },
  { id: 'hike', day: 3, title: 'Hike', type: 'hike', detail: 'Every other Wednesday', icon: '⌁', alternate: true },
  { id: 'gym-b', day: 4, title: 'Whole-body gym', type: 'gym', detail: 'Choose machines in any order', icon: '◉' },
  { id: 'ride-speed-b', day: 5, title: 'Cycling · speed intervals', type: 'cycling', detail: 'Short efforts with easy recovery', icon: '↗' },
  { id: 'group-walk', day: 6, title: 'Group walk', type: 'walk', detail: 'Saturday morning · fixed', icon: '⌁' },
  { id: 'ride-distance', day: 0, title: 'Cycling · distance ride', type: 'cycling', detail: 'Steady, comfortable pace', icon: '↗' }
];

let state = loadState();
let selectedDate = startOfDay(new Date());
let viewedWeek = startOfWeek(selectedDate);
let editingMachineId = null;
let activeLog = null;
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const weekStrip = $('#weekStrip');

function freshState() {
  const nextWednesday = nextDay(new Date(), 3);
  return { version: 1, machines: [], logs: {}, hikeAnchor: dateKey(nextWednesday) };
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && parsed.version === 1 && parsed.logs && Array.isArray(parsed.machines)) return parsed;
  } catch (error) { console.warn('Could not read saved workout data.', error); }
  return freshState();
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function startOfDay(value) { const date = new Date(value); date.setHours(0, 0, 0, 0); return date; }
function startOfWeek(value) { const date = startOfDay(value); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date; }
function nextDay(value, day) { const date = startOfDay(value); let offset = (day - date.getDay() + 7) % 7; if (!offset) offset = 7; date.setDate(date.getDate() + offset); return date; }
function addDays(value, amount) { const date = new Date(value); date.setDate(date.getDate() + amount); return date; }
function dateKey(value) { const date = startOfDay(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function parseDate(key) { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); }
function formatDate(value, options = { weekday: 'long', month: 'long', day: 'numeric' }) { return new Intl.DateTimeFormat(undefined, options).format(value); }
function isSameDate(a, b) { return dateKey(a) === dateKey(b); }
function activityDateId(date, activityId) { return `${dateKey(date)}::${activityId}`; }
function getLog(date, activityId) { return state.logs[activityDateId(date, activityId)] || null; }

function isHikeWeek(date) {
  const anchor = parseDate(state.hikeAnchor);
  const dayDifference = Math.round((startOfDay(date) - anchor) / 86400000);
  return dayDifference >= 0 && dayDifference % 14 === 0;
}

function activitiesForDay(date) {
  return ACTIVITY_TEMPLATES.filter((item) => item.day === date.getDay() && (!item.alternate || isHikeWeek(date)));
}

function render() {
  const now = new Date();
  $('#todayLabel').textContent = formatDate(now, { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase();
  renderWeek();
  renderDayPlan();
  renderSummary();
  renderMachines();
}

function renderWeek() {
  weekStrip.innerHTML = '';
  const today = startOfDay(new Date());
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(viewedWeek, index);
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `day-chip${isSameDate(date, selectedDate) ? ' active' : ''}${isSameDate(date, today) ? ' today' : ''}${activitiesForDay(date).length ? ' has-plan' : ''}`;
    chip.setAttribute('aria-label', formatDate(date));
    chip.innerHTML = `<span class="day-name">${SHORT_DAYS[date.getDay()]}</span><span class="day-num">${date.getDate()}</span>`;
    chip.addEventListener('click', () => { selectedDate = date; render(); });
    weekStrip.append(chip);
  }
  const sunday = addDays(viewedWeek, 6);
  $('#weekHeading').textContent = viewedWeek.getMonth() === sunday.getMonth()
    ? `${new Intl.DateTimeFormat(undefined, { month: 'long' }).format(viewedWeek)} ${viewedWeek.getDate()}–${sunday.getDate()}`
    : `${formatDate(viewedWeek, { month: 'short', day: 'numeric' })} – ${formatDate(sunday, { month: 'short', day: 'numeric' })}`;
}

function renderDayPlan() {
  const container = $('#dayPlan');
  const activities = activitiesForDay(selectedDate);
  let html = `<p class="plan-date">${formatDate(selectedDate)}${isSameDate(selectedDate, new Date()) ? ' · Today' : ''}</p>`;
  if (!activities.length) {
    html += '<div class="empty-day">A little breathing room. Use it for rest, stretching, or moving a workout if your week changes.</div>';
  } else {
    html += activities.map((activity) => {
      const log = getLog(selectedDate, activity.id);
      const buttonText = log?.completed ? 'Edit log' : activity.type === 'gym' ? 'Start' : 'Log';
      const extra = log?.completed ? (activity.type === 'gym' ? `${(log.machines || []).length} machine${(log.machines || []).length === 1 ? '' : 's'} logged` : logSummary(log)) : activity.detail;
      return `<article class="activity-card">
        <div class="activity-symbol" aria-hidden="true">${activity.icon}</div>
        <div class="activity-body"><div class="activity-title-row"><span class="activity-title">${escapeHtml(activity.title)}</span></div>
        <p class="activity-detail${log?.completed ? ' done-label' : ''}">${log?.completed ? `✓ Done · ${escapeHtml(extra)}` : escapeHtml(extra)}</p></div>
        <div class="activity-actions"><button type="button" class="mini-button${log?.completed ? ' done' : ''}" data-log="${activity.id}">${buttonText}</button></div>
      </article>`;
    }).join('');
  }
  container.innerHTML = html;
  container.querySelectorAll('[data-log]').forEach((button) => button.addEventListener('click', () => openLog(button.dataset.log)));
}

function renderSummary() {
  const weekStart = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const scheduled = days.flatMap((day) => activitiesForDay(day).map((activity) => ({ day, activity })));
  const completed = scheduled.filter(({ day, activity }) => getLog(day, activity.id)?.completed).length;
  const cycling = scheduled.filter(({ activity }) => activity.type === 'cycling').length;
  $('#weeklySummary').innerHTML = `
    <div class="stat-card"><div class="stat-value">${completed}<span class="stat-label"> / ${scheduled.length}</span></div><div class="stat-label">sessions done</div></div>
    <div class="stat-card"><div class="stat-value">${cycling}</div><div class="stat-label">rides planned</div></div>
    <div class="stat-card"><div class="stat-value">${scheduled.some(({ activity }) => activity.type === 'hike') ? 'Hike' : 'Rest'}</div><div class="stat-label">Wednesday</div></div>`;
}

function renderMachines() {
  const container = $('#machineList');
  if (!state.machines.length) {
    container.innerHTML = '<div class="empty-library">Your list is ready when you are. Add a machine after you have tried it at the gym.</div>';
    return;
  }
  container.innerHTML = state.machines.map((machine) => `<article class="machine-row">
    <span class="machine-glyph" aria-hidden="true">◉</span><div class="machine-info"><div class="machine-name">${escapeHtml(machine.name)}</div><div class="machine-settings">${escapeHtml(machine.settings || 'No settings saved yet')}</div></div>
    <div class="machine-actions"><button class="quiet-button" type="button" data-edit-machine="${machine.id}">Edit</button><button class="quiet-button" type="button" data-delete-machine="${machine.id}" aria-label="Delete ${escapeHtml(machine.name)}">×</button></div>
  </article>`).join('');
  container.querySelectorAll('[data-edit-machine]').forEach((button) => button.addEventListener('click', () => openMachineEditor(button.dataset.editMachine)));
  container.querySelectorAll('[data-delete-machine]').forEach((button) => button.addEventListener('click', () => deleteMachine(button.dataset.deleteMachine)));
}

function logSummary(log) {
  const parts = [];
  if (log.duration) parts.push(`${log.duration} min`);
  if (log.distance) parts.push(`${log.distance} mi`);
  if (log.program) parts.push(log.program);
  return parts.join(' · ') || 'Logged';
}

function openLog(activityId) {
  const activity = ACTIVITY_TEMPLATES.find((item) => item.id === activityId);
  const existing = getLog(selectedDate, activityId) || {};
  activeLog = { activity, key: activityDateId(selectedDate, activityId) };
  $('#logTitle').textContent = activity.title;
  $('#logDateLabel').textContent = formatDate(selectedDate).toUpperCase();
  const fields = $('#logFields');
  if (activity.type === 'gym') {
    fields.innerHTML = gymFields(existing);
    bindMachineLogFields();
  } else if (activity.type === 'cycling') {
    fields.innerHTML = `<div class="grid-two"><label>Duration <span class="label-hint">minutes</span><input name="duration" inputmode="numeric" type="number" min="0" step="1" value="${attr(existing.duration || '')}" placeholder="45"></label>
      <label>Distance <span class="label-hint">miles</span><input name="distance" inputmode="decimal" type="number" min="0" step="0.1" value="${attr(existing.distance || '')}" placeholder="12.5"></label></div>
      ${activity.id.includes('speed') ? `<label>Interval notes<textarea name="program" rows="2" placeholder="e.g. 6 × 1 min fast, 2 min easy">${escapeHtml(existing.program || '')}</textarea></label>` : '<label>Effort or route notes<textarea name="program" rows="2" placeholder="Route, pace, how it felt…">'+escapeHtml(existing.program || '')+'</textarea></label>'}
      <label>Notes <span class="label-hint">(optional)</span><textarea name="notes" rows="2" placeholder="Anything to remember next time">${escapeHtml(existing.notes || '')}</textarea></label>`;
  } else {
    fields.innerHTML = `<label>Duration <span class="label-hint">minutes · optional</span><input name="duration" inputmode="numeric" type="number" min="0" step="1" value="${attr(existing.duration || '')}" placeholder="60"></label>
      <label>Notes <span class="label-hint">(optional)</span><textarea name="notes" rows="3" placeholder="Route, conditions, or how it felt">${escapeHtml(existing.notes || '')}</textarea></label>`;
  }
  $('#logDialog').showModal();
}

function gymFields(existing) {
  const oldMachines = Array.isArray(existing.machines) ? existing.machines : [];
  const cards = oldMachines.map((item) => machineLogCard(item.machineId, item)).join('');
  const options = state.machines.map((item) => `<option value="${attr(item.id)}">${escapeHtml(item.name)}</option>`).join('');
  return `<p class="section-copy">Pick any machine that’s free. Your previous settings appear as a reminder; change them for today’s session.</p>
    <div id="machineLogCards">${cards}</div>
    ${state.machines.length ? `<label>Add a machine<select id="machinePicker"><option value="">Choose from your list…</option>${options}</select></label>` : '<div class="empty-library">Add machines to your library when you start using them. You can come back and log this workout any time.</div>'}
    <label>Workout notes <span class="label-hint">(optional)</span><textarea name="notes" rows="2" placeholder="How the session felt">${escapeHtml(existing.notes || '')}</textarea></label>`;
}

function machineLogCard(machineId, saved = {}) {
  const machine = state.machines.find((item) => item.id === machineId);
  if (!machine) return '';
  const recent = lastMachineLog(machineId);
  const settings = saved.settings ?? recent?.settings ?? machine.settings ?? '';
  const weight = saved.weight ?? recent?.weight ?? '';
  const sets = saved.sets ?? recent?.sets ?? '';
  const reps = saved.reps ?? recent?.reps ?? '';
  const program = saved.program ?? recent?.program ?? '';
  return `<div class="machine-log-card" data-machine-card="${attr(machine.id)}">
    <div class="machine-log-heading"><span>${escapeHtml(machine.name)}</span><button type="button" class="use-last" data-remove-machine="${attr(machine.id)}">Remove</button></div>
    <label>Machine settings / program<textarea data-field="settings" rows="2" placeholder="Seat, incline, StairMaster program…">${escapeHtml(settings)}</textarea></label>
    <div class="grid-two"><label>Weight<input data-field="weight" inputmode="decimal" type="text" value="${attr(weight)}" placeholder="e.g. 40 lb"></label>
      <label>Sets × reps<input data-field="setsreps" type="text" value="${attr(sets && reps ? `${sets} × ${reps}` : '')}" placeholder="3 × 10"></label></div>
    <label>Notes <span class="label-hint">(optional)</span><textarea data-field="notes" rows="2" placeholder="How it felt">${escapeHtml(saved.notes || '')}</textarea></label>
  </div>`;
}

function bindMachineLogFields() {
  const picker = $('#machinePicker');
  if (picker) picker.addEventListener('change', () => {
    if (!picker.value) return;
    if ($('#machineLogCards').querySelector(`[data-machine-card="${CSS.escape(picker.value)}"]`)) { showToast('That machine is already on this log.'); picker.value = ''; return; }
    $('#machineLogCards').insertAdjacentHTML('beforeend', machineLogCard(picker.value));
    const card = $('#machineLogCards').lastElementChild;
    bindRemoveMachine(card);
    picker.value = '';
  });
  document.querySelectorAll('[data-remove-machine]').forEach(bindRemoveMachine);
}

function bindRemoveMachine(buttonOrCard) {
  const button = buttonOrCard.matches?.('[data-remove-machine]') ? buttonOrCard : buttonOrCard.querySelector('[data-remove-machine]');
  if (!button) return;
  button.addEventListener('click', () => button.closest('[data-machine-card]').remove());
}

function lastMachineLog(machineId) {
  const entries = Object.values(state.logs).flatMap((log) => (log.machines || []).map((item) => ({ ...item, date: log.date })))
    .filter((item) => item.machineId === machineId)
    .sort((a, b) => b.date.localeCompare(a.date));
  return entries[0] || null;
}

function saveLog(event) {
  if (!activeLog) return;
  event.preventDefault();
  const form = $('#logForm');
  const formData = new FormData(form);
  const log = { date: dateKey(selectedDate), completed: true, notes: String(formData.get('notes') || '').trim() };
  if (activeLog.activity.type === 'gym') {
    log.machines = [...$('#machineLogCards').querySelectorAll('[data-machine-card]')].map((card) => {
      const setsReps = card.querySelector('[data-field="setsreps"]').value.trim().split(/\s*[×xX]\s*/);
      return {
        machineId: card.dataset.machineCard,
        settings: card.querySelector('[data-field="settings"]').value.trim(),
        weight: card.querySelector('[data-field="weight"]').value.trim(),
        sets: setsReps[0] || '', reps: setsReps[1] || '',
        notes: card.querySelector('[data-field="notes"]').value.trim()
      };
    });
    if (!log.machines.length && !log.notes) { showToast('Add a machine or a note before saving.'); return; }
  } else {
    log.duration = String(formData.get('duration') || '').trim();
    if (activeLog.activity.type === 'cycling') log.distance = String(formData.get('distance') || '').trim();
    log.program = String(formData.get('program') || '').trim();
  }
  state.logs[activeLog.key] = log;
  saveState();
  $('#logDialog').close();
  render();
  showToast('Workout saved. Nice work.');
}

function openMachineEditor(id = null) {
  editingMachineId = id;
  const machine = state.machines.find((item) => item.id === id);
  const form = $('#machineForm');
  form.elements.name.value = machine?.name || '';
  form.elements.settings.value = machine?.settings || '';
  $('#machineDialogTitle').textContent = machine ? 'Edit machine' : 'Add a machine';
  $('#saveMachineButton').textContent = machine ? 'Save changes' : 'Save machine';
  $('#machineDialog').showModal();
  setTimeout(() => form.elements.name.focus(), 50);
}

function saveMachine(event) {
  event.preventDefault();
  const form = $('#machineForm');
  if (!form.reportValidity()) return;
  const name = form.elements.name.value.trim();
  const settings = form.elements.settings.value.trim();
  if (editingMachineId) {
    const machine = state.machines.find((item) => item.id === editingMachineId);
    machine.name = name; machine.settings = settings;
  } else {
    state.machines.push({ id: makeId(), name, settings, createdAt: new Date().toISOString() });
  }
  saveState(); $('#machineDialog').close(); render(); showToast('Machine saved.');
}

function deleteMachine(id) {
  const machine = state.machines.find((item) => item.id === id);
  if (!machine || !window.confirm(`Remove ${machine.name} from your machine list? Past workout logs will stay in your history.`)) return;
  state.machines = state.machines.filter((item) => item.id !== id);
  saveState(); render(); showToast('Machine removed from your list.');
}

function exportBackup() {
  const payload = { ...state, exportedAt: new Date().toISOString(), app: 'Stride workout planner' };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `stride-workout-backup-${dateKey(new Date())}.json`; link.click();
  URL.revokeObjectURL(url); showToast('Backup downloaded.');
}

async function importBackup(file) {
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    if (parsed.version !== 1 || !Array.isArray(parsed.machines) || !parsed.logs || typeof parsed.logs !== 'object') throw new Error('This file does not look like a Stride backup.');
    if (!window.confirm('Restore this backup? It will replace the workout data currently in this browser.')) return;
    state = { version: 1, machines: parsed.machines, logs: parsed.logs, hikeAnchor: parsed.hikeAnchor || freshState().hikeAnchor };
    saveState(); $('#backupDialog').close(); render(); showToast('Backup restored.');
  } catch (error) { showToast(error.message || 'Could not read that backup file.'); }
}

function makeId() { return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]); }
function attr(value) { return escapeHtml(value).replace(/`/g, '&#96;'); }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2500); }

$('#previousWeek').addEventListener('click', () => { viewedWeek = addDays(viewedWeek, -7); selectedDate = new Date(viewedWeek); render(); });
$('#nextWeek').addEventListener('click', () => { viewedWeek = addDays(viewedWeek, 7); selectedDate = new Date(viewedWeek); render(); });
$('#addMachineButton').addEventListener('click', () => openMachineEditor());
$('#backupButton').addEventListener('click', () => $('#backupDialog').showModal());
$('#exportButton').addEventListener('click', exportBackup);
$('#importInput').addEventListener('change', (event) => { importBackup(event.target.files[0]); event.target.value = ''; });
$('#logForm').addEventListener('submit', saveLog);
$('#machineForm').addEventListener('submit', saveMachine);

render();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Offline caching is unavailable.', error)));
}
