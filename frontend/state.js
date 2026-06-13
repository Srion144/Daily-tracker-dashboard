// ============================================================
// BACKEND AUTH + SYNC FUNCTIONS
// ============================================================
const API_BASE = '';  // empty = same server

function getAuthToken() {
  return localStorage.getItem('authToken');
}

function checkAuth() {
  if (!getAuthToken()) {
    window.location.href = '/login.html';
  }
}

async function loadStateFromServer() {
  const token = getAuthToken();
  if (!token) {
    // No token at all — go to login
    window.location.href = '/login.html';
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/api/data`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 401) {
      // Token expired or invalid — clear it and go to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      window.location.href = '/login.html';
      return;
    }
    if (res.ok) {
      const serverState = await res.json();
      if (serverState && serverState.tasks) {
        state = Object.assign(createDefaultState(), serverState);
        localStorage.setItem('dailyTrackerV2', JSON.stringify(state));
      }
    }
  } catch {
    console.warn('Server unreachable, using local data');
  }
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userEmail');
  window.location.href = '/login.html';
}

// ============================================================
// STATE MANAGEMENT — All data is per-date keyed properly
// ============================================================
const VERSION = '2.0';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function createDefaultState() {
  return {
    version: VERSION,
    tasks: [],           // {id, name, priority, category, done, date, recurring, recurringDays, dueDate, note}
    water: {},           // { "YYYY-MM-DD": count }
    waterGoal: 8,        // single global goal
    exercise: {},        // { "YYYY-MM-DD": { total, sessions:[{type,duration,time}] } }
    exerciseGoal: 30,
    mood: {},            // { "YYYY-MM-DD": { mood, note, timestamp } }
    streak: 0,
    longestStreak: 0,
    lastStreakDate: '',
    streakHistory: [],
    goals: [],           // {id, title, type, target, progress, unit, createdAt}
    pomoDone: {},        // { "YYYY-MM-DD": count }
    pomoMin: {},         // { "YYYY-MM-DD": minutes }
    pomoDurations: { work: 25, short: 5, long: 15 },
    notifications: false,
    theme: 'dark',
    calendarNotes: {},   // { "YYYY-MM-DD": string }
  };
}

let state = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem('dailyTrackerV2');
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle new fields
    return Object.assign(createDefaultState(), parsed);
  } catch (e) {
    return createDefaultState();
  }
}

async function saveState() {
  try {
    localStorage.setItem('dailyTrackerV2', JSON.stringify(state)); // keep local backup
    const token = getAuthToken();
    if (token) {
      await fetch(`${API_BASE}/api/data/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(state)
      });
    }
  } catch (e) {
    console.warn('Sync failed, using local storage only');
  }
  updateOverviewStats();
}

// ============================================================
// EXPORT / IMPORT
// ============================================================
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dailytracker-backup-${getToday()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported! 📦');
}

function importData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!imported.tasks) throw new Error('Invalid file');
      state = Object.assign(createDefaultState(), imported);
      saveState();
      showToast('Data imported successfully! ✓', 'success');
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      showToast('Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm('Are you sure? This will permanently delete ALL your data!')) return;
  localStorage.removeItem('dailyTrackerV2');
  showToast('All data cleared');
  setTimeout(() => location.reload(), 800);
}

// ============================================================
// STREAK LOGIC (fixed — truly date-aware)
// ============================================================
function checkAndUpdateStreak() {
  const today = getToday();
  const yesterday = getPrevDate(today);

  // Only run streak update once per day
  if (state.lastStreakDate === today) return;

  const todayComplete = isDayComplete(today);
  if (!todayComplete) return;

  if (state.lastStreakDate === yesterday) {
    state.streak = (state.streak || 0) + 1;
  } else if (state.lastStreakDate !== today) {
    state.streak = 1;
  }

  state.lastStreakDate = today;
  if (state.streak > (state.longestStreak || 0)) {
    state.longestStreak = state.streak;
  }

  // Keep streak history
  if (!state.streakHistory) state.streakHistory = [];
  const last = state.streakHistory[state.streakHistory.length - 1];
  if (!last || last.date !== today) {
    state.streakHistory.push({ date: today, streak: state.streak });
  }

  saveState();
}

function isDayComplete(dateStr) {
  const dayTasks = getTasksForDate(dateStr);
  const water = state.water[dateStr] || 0;
  const waterOk = water >= (state.waterGoal || 8);
  const tasksOk = dayTasks.length > 0 && dayTasks.every(t => t.done);
  return tasksOk && waterOk;
}

function getPrevDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// ============================================================
// TASK HELPERS — properly date-aware
// ============================================================
function getTasksForDate(dateStr) {
  return state.tasks.filter(t => {
    if (t.recurring) {
      const taskDate = new Date(t.date + 'T00:00:00');
      const targetDate = new Date(dateStr + 'T00:00:00');
      if (targetDate < taskDate) return false;
      if (t.recurringDays === 'daily') return true;
      if (t.recurringDays === 'weekdays') {
        const dow = targetDate.getDay();
        return dow >= 1 && dow <= 5;
      }
      if (t.recurringDays === 'weekends') {
        const dow = targetDate.getDay();
        return dow === 0 || dow === 6;
      }
    }
    return t.date === dateStr;
  });
}

function getCompletionForDate(dateStr) {
  const tasks = getTasksForDate(dateStr);
  if (!tasks.length) return null;
  const done = tasks.filter(t => {
    if (t.recurring) {
      const key = `${t.id}_${dateStr}`;
      return state.recurringDone && state.recurringDone[key];
    }
    return t.done;
  });
  return Math.round((done.length / tasks.length) * 100);
}

// ============================================================
// RECURRING TASK COMPLETION TRACKING
// ============================================================
function toggleRecurringTask(taskId, dateStr) {
  if (!state.recurringDone) state.recurringDone = {};
  const key = `${taskId}_${dateStr}`;
  state.recurringDone[key] = !state.recurringDone[key];
  saveState();
}

function isRecurringDone(taskId, dateStr) {
  return state.recurringDone && state.recurringDone[`${taskId}_${dateStr}`];
}

// ============================================================
// DATE HELPERS
// ============================================================
function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function getLast30Days() {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function shortDay(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = '') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateY(10px)';
    t.style.transition = 'all 0.3s';
    setTimeout(() => t.remove(), 300);
  }, 2800);
}

// ============================================================
// STORAGE SIZE MONITOR
// ============================================================
function getStorageSize() {
  try {
    const item = localStorage.getItem('dailyTrackerV2') || '';
    return (item.length * 2 / 1024).toFixed(1); // KB approx
  } catch { return '?'; }
}

// ============================================================
// HTML ESCAPE HELPER
// ============================================================
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
