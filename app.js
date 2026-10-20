const STORAGE_KEY = 'stride-workout-data-v1';
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_DAY_TYPES = { 0: 'recovery', 1: 'gym', 2: 'bike', 3: 'recovery', 4: 'gym', 5: 'bike', 6: 'group-walk' };
const DAY_TYPE_OPTIONS = [
  { id: 'gym', title: 'Gym strength', icon: '◉', detail: 'Full session · 1 set × 8–10 reps to start' },
  { id: 'bike', title: 'Bike ride', icon: '↗', detail: 'Easy, conversational effort; no hard intervals' },
  { id: 'hike', title: 'Hike', icon: '⌁', detail: 'Comfortable route and pace' },
  { id: 'recovery', title: 'Recovery day', icon: '◌', detail: 'Rest or gentle mobility' },
  { id: 'light-gym', title: 'Light gym (rain / heat)', icon: '◉', detail: 'Easy stationary bike only; no strength circuit' },
  { id: 'group-walk', title: 'Group walk', icon: '⌁', detail: 'Saturday morning · comfortable pace' }
];
const STARTER_EXERCISES = [
  { id: 'leg-press', name: '1. Seated leg press', muscles: '1 × 8–10 · easy effort', tip: 'Comfortable range; do not lock knees or strain.' },
  { id: 'chest-press', name: '2. Seated chest press', muscles: '1 × 8–10 · easy effort', tip: 'Use only after device-team approval for arm position and load.' },
  { id: 'leg-curl', name: '3. Seated hamstring curl', muscles: '1 × 8–10 · easy effort', tip: 'Smooth motion in a comfortable range.' },
  { id: 'seated-row', name: '4. Seated row', muscles: '1 × 8–10 · easy effort', tip: 'Use only after device-team approval; keep shoulders relaxed.' },
  { id: 'leg-extension', name: '5. Seated leg extension', muscles: '1 × 8–10 · easy effort', tip: 'Light effort and smooth, pain-free motion.' },
  { id: 'calf-raise', name: '6. Seated calf raise (optional)', muscles: '1 × 8–10 · easy effort', tip: 'Skip if the machine or position is uncomfortable.', optional: true }
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
  return { version: 2, machines: starterMachines(), logs: {}, dayOverrides: {} };
}

function starterMachines() {
  return STARTER_EXERCISES.map((exercise) => ({
    id: `starter-${exercise.id}`,
    name: exercise.name.replace(/^\d+\. /, ''),
    settings: 'Starting target: 1 × 8–10 · choose a light load after clinician clearance',
    createdAt: new Date().toISOString()
  }));
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (parsed && parsed.logs && Array.isArray(parsed.machines)) {
      if (parsed.version === 2) return { ...parsed, machines: parsed.machines.length ? parsed.machines : starterMachines(), dayOverrides: parsed.dayOverrides || {} };
      if (parsed.version === 1) return migrateState(parsed);
    }
  } catch (error) { console.warn('Could not read saved workout data.', error); }
  return freshState();
}

function migrateState(old) {
  const logs = {};
  const oldTypes = { 'gym-a': 'gym', 'gym-b': 'gym', 'ride-speed-a': 'bike', 'ride-speed-b': 'bike', 'ride-distance': 'bike', hike: 'hike', 'group-walk': 'group-walk' };
  Object.entries(old.logs || {}).forEach(([key, log]) => {
    const [date, oldId] = key.split('::');
    const type = oldTypes[oldId];
    if (type) logs[`${date}::${type}`] = log;
  });
  return { version: 2, machines: old.machines.length ? old.machines : starterMachines(), logs, dayOverrides: {} };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function startOfDay(value) { const date = new Date(value); date.setHours(0, 0, 0, 0); return date; }
function startOfWeek(value) { const date = startOfDay(value); date.setDate(date.getDate() - ((date.getDay() + 6) % 7)); return date; }
function addDays(value, amount) { const date = new Date(value); date.setDate(date.getDate() + amount); return date; }
function dateKey(value) { const date = startOfDay(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function formatDate(value, options = { weekday: 'long', month: 'long', day: 'numeric' }) { return new Intl.DateTimeFormat(undefined, options).format(value); }
function isSameDate(a, b) { return dateKey(a) === dateKey(b); }
function activityDateId(date, activityId) { return `${dateKey(date)}::${activityId}`; }
function getLog(date, activityId) { return state.logs[activityDateId(date, activityId)] || null; }

function activityTypeForDay(date) {
  return state.dayOverrides[dateKey(date)] || DEFAULT_DAY_TYPES[date.getDay()];
}

function activityForDay(date) {
  const type = activityTypeForDay(date);
  return DAY_TYPE_OPTIONS.find((item) => item.id === type) || DAY_TYPE_OPTIONS.find((item) => item.id === 'recovery');
}

function activitiesForDay(date) {
  const activity = activityForDay(date);
  return activity ? [activity] : [];
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
  html += `<label class="day-type-picker">Plan this day<select id="dayTypePicker" aria-label="Choose activity for ${attr(formatDate(selectedDate))}">${DAY_TYPE_OPTIONS.map((option) => `<option value="${option.id}"${activityTypeForDay(selectedDate) === option.id ? ' selected' : ''}>${escapeHtml(option.title)}</option>`).join('')}</select></label>`;
  if (!activities.length) {
    html += '<div class="empty-day">A little breathing room. Use it for rest, stretching, or moving a workout if your week changes.</div>';
  } else {
    html += activities.map((activity) => {
      const log = getLog(selectedDate, activity.id);
      const buttonText = log?.completed ? 'Edit log' : activity.id === 'gym' ? 'Start' : 'Log';
      const extra = log?.completed ? (activity.id === 'gym' ? ((log.machines || []).length ? `${log.machines.length} machine${log.machines.length === 1 ? '' : 's'} logged` : 'Workout marked done') : logSummary(log)) : activity.detail;
      return `<article class="activity-card">
        <div class="activity-symbol" aria-hidden="true">${activity.icon}</div>
        <div class="activity-body"><div class="activity-title-row"><span class="activity-title">${escapeHtml(activity.title)}</span></div>
        <p class="activity-detail${log?.completed ? ' done-label' : ''}">${log?.completed ? `✓ Done · ${escapeHtml(extra)}` : escapeHtml(extra)}</p></div>
        <div class="activity-actions"><button type="button" class="mini-button${log?.completed ? ' done' : ''}" data-log="${activity.id}">${buttonText}</button></div>
      </article>`;
    }).join('');
  }
  container.innerHTML = html;
  $('#dayTypePicker').addEventListener('change', (event) => {
    state.dayOverrides[dateKey(selectedDate)] = event.target.value;
    saveState(); render(); showToast('Day plan updated.');
  });
  container.querySelectorAll('[data-log]').forEach((button) => button.addEventListener('click', () => openLog(button.dataset.log)));
}

function renderSummary() {
  const weekStart = startOfWeek(selectedDate);
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const scheduled = days.flatMap((day) => activitiesForDay(day).map((activity) => ({ day, activity })));
  const completed = scheduled.filter(({ day, activity }) => getLog(day, activity.id)?.completed).length;
  const cycling = scheduled.filter(({ activity }) => activity.id === 'bike').length;
  $('#weeklySummary').innerHTML = `
    <div class="stat-card"><div class="stat-value">${completed}<span class="stat-label"> / ${scheduled.length}</span></div><div class="stat-label">sessions done</div></div>
    <div class="stat-card"><div class="stat-value">${cycling}</div><div class="stat-label">rides planned</div></div>
    <div class="stat-card"><div class="stat-value">${scheduled.filter(({ activity }) => activity.id === 'gym').length}</div><div class="stat-label">strength days planned</div></div>`;
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
  const activity = DAY_TYPE_OPTIONS.find((item) => item.id === activityId);
  const existing = getLog(selectedDate, activityId) || {};
  activeLog = { activity, key: activityDateId(selectedDate, activityId) };
  $('#logTitle').textContent = activity.title;
  $('#logDateLabel').textContent = formatDate(selectedDate).toUpperCase();
  const fields = $('#logFields');
  if (activity.id === 'gym') {
    fields.innerHTML = gymFields(existing);
    bindMachineLogFields();
  } else if (activity.id === 'bike' || activity.id === 'light-gym') {
    fields.innerHTML = `<div class="${activity.id === 'bike' ? 'grid-two' : ''}"><label>Duration <span class="label-hint">minutes</span><input name="duration" inputmode="numeric" type="number" min="0" step="1" value="${attr(existing.duration || '')}" placeholder="${activity.id === 'bike' ? '45' : '20'}"></label>
      ${activity.id === 'bike' ? `<label>Distance <span class="label-hint">miles</span><input name="distance" inputmode="decimal" type="number" min="0" step="0.1" value="${attr(existing.distance || '')}" placeholder="12.5"></label>` : ''}</div>
      <label>Effort or route notes<textarea name="program" rows="2" placeholder="Easy pace, route, how it felt…">${escapeHtml(existing.program || '')}</textarea></label>
      <label>Notes <span class="label-hint">(optional)</span><textarea name="notes" rows="2" placeholder="Anything to remember next time">${escapeHtml(existing.notes || '')}</textarea></label>`;
  } else {
    fields.innerHTML = `<label>Duration <span class="label-hint">minutes · optional</span><input name="duration" inputmode="numeric" type="number" min="0" step="1" value="${attr(existing.duration || '')}" placeholder="60"></label>
      <label>Notes <span class="label-hint">(optional)</span><textarea name="notes" rows="3" placeholder="Route, conditions, or how it felt">${escapeHtml(existing.notes || '')}</textarea></label>`;
  }
  $('#logDialog').showModal();
}

function gymFields(existing) {
  const oldMachines = Array.isArray(existing.machines) && existing.machines.length
    ? existing.machines
    : state.machines.filter((machine) => machine.id.startsWith('starter-') && !STARTER_EXERCISES.find((exercise) => machine.id === `starter-${exercise.id}`)?.optional).map((machine) => ({ machineId: machine.id, settings: machine.settings, sets: '1', reps: '8' }));
  const cards = oldMachines.map((item) => machineLogCard(item.machineId, item)).join('');
  const options = state.machines.map((item) => `<option value="${attr(item.id)}">${escapeHtml(item.name)}</option>`).join('');
  return `<p class="section-copy">Start only after your cardiology/device team clears this plan. Begin with 1 set × 8–10 reps at easy effort; leave several reps in reserve, breathe continuously, and rest 90–120 seconds or longer. Skip any machine that causes discomfort or requires straining.</p>
    <p class="visit-checklist-note">The suggested machines are preloaded below in plan order. Remove any you skip today; add or change machines as needed.</p>
    <div id="machineLogCards">${cards}</div>
    ${state.machines.length ? `<label>Add a machine<select id="machinePicker"><option value="">Choose from your list…</option>${options}</select></label>` : '<div class="empty-library">Add machines to your library when you start using them. You can come back and log this workout any time.</div>'}
    <div class="progression-note"><strong>Progress only with clearance</strong><br>After at least 4 symptom-free sessions over 2 weeks, build reps to 12. After 2 stable weeks at 1 × 12, add a second set to 1–2 exercises. After 2 stable weeks at 2 × 12, increase one machine by its smallest step and return to 8 reps. Change one thing at a time.</div>
    <label>Workout notes <span class="label-hint">(optional)</span><textarea name="notes" rows="2" placeholder="Effort, symptoms, recovery, or how the session felt">${escapeHtml(existing.notes || '')}</textarea></label>`;
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
  if (activeLog.activity.id === 'gym') {
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
    if (!log.machines.length && !log.notes) {
      showToast('Log at least one machine or add a note before saving.'); return;
    }
  } else {
    log.duration = String(formData.get('duration') || '').trim();
    if (activeLog.activity.id === 'bike') log.distance = String(formData.get('distance') || '').trim();
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
    if (![1, 2].includes(parsed.version) || !Array.isArray(parsed.machines) || !parsed.logs || typeof parsed.logs !== 'object') throw new Error('This file does not look like a Stride backup.');
    if (!window.confirm('Restore this backup? It will replace the workout data currently in this browser.')) return;
    state = parsed.version === 1 ? migrateState(parsed) : { version: 2, machines: parsed.machines, logs: parsed.logs, dayOverrides: parsed.dayOverrides || {} };
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


