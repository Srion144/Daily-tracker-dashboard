// ============================================================
// OVERVIEW
// ============================================================
function updateOverviewStats() {
  const today = getToday();
  const todayTasks = getTasksForDate(today);
  const doneTasks = todayTasks.filter(t => t.recurring ? isRecurringDone(t.id, today) : t.done);

  document.getElementById('ov-tasks').textContent = `${doneTasks.length}/${todayTasks.length}`;
  const taskPct = todayTasks.length ? Math.round(doneTasks.length / todayTasks.length * 100) : 0;
  document.getElementById('ov-task-pct').textContent = taskPct + '% complete';

  const water = state.water[today] || 0;
  document.getElementById('ov-water').textContent = water;
  document.getElementById('ov-streak').textContent = state.streak || 0;
  document.getElementById('ov-streak-big').textContent = state.streak || 0;

  const exTotal = (state.exercise[today] || { total: 0 }).total;
  document.getElementById('ov-exercise').textContent = exTotal;

  // Progress bars
  setBar('ov-task-bar', 'ov-task-bar-pct', taskPct);
  const waterPct = Math.min(100, Math.round(water / (state.waterGoal || 8) * 100));
  setBar('ov-water-bar', 'ov-water-bar-pct', waterPct);
  const exPct = Math.min(100, Math.round(exTotal / (state.exerciseGoal || 30) * 100));
  setBar('ov-ex-bar', 'ov-ex-bar-pct', exPct);

  // Mood
  const moodData = state.mood[today];
  const moodEmojis = { happy: '😊', neutral: '😐', sad: '😔', tired: '😴', excited: '🤩' };
  const moodLabels = { happy: 'Happy', neutral: 'Neutral', sad: 'Sad', tired: 'Tired', excited: 'Excited' };
  if (moodData && moodData.mood) {
    document.getElementById('ov-mood-emoji').textContent = moodEmojis[moodData.mood] || '—';
    document.getElementById('ov-mood-label').textContent = moodLabels[moodData.mood] || '';
  }

  // Mini task list
  const ovList = document.getElementById('ov-task-list');
  if (ovList) {
    if (todayTasks.length === 0) {
      ovList.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div>No tasks for today. Go to Tasks to add some!</div>';
    } else {
      ovList.innerHTML = todayTasks.slice(0, 6).map(t => {
        const done = t.recurring ? isRecurringDone(t.id, today) : t.done;
        return `<div class="task-item ${done ? 'done' : ''}">
          <div class="task-check ${done ? 'checked' : ''}" onclick="quickToggleTask('${t.id}')"></div>
          <span class="task-name">${escHtml(t.name)}${t.recurring ? '<span class="recurring-badge">↻</span>' : ''}</span>
          <span class="badge badge-${t.priority}">${t.priority}</span>
        </div>`;
      }).join('');
    }
  }

  renderOverviewChart();
  checkAndUpdateStreak();
}

function setBar(barId, pctId, pct) {
  const bar = document.getElementById(barId);
  const label = document.getElementById(pctId);
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = pct + '%';
}

function quickToggleTask(id) {
  const today = getToday();
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  if (t.recurring) {
    toggleRecurringTask(id, today);
  } else {
    t.done = !t.done;
  }
  saveState();
  renderTasks();
}

function renderOverviewChart() {
  const days = getLast7Days();
  const data = days.map(d => {
    const tasks = getTasksForDate(d);
    if (!tasks.length) return 0;
    const done = tasks.filter(t => t.recurring ? isRecurringDone(t.id, d) : t.done);
    return Math.round(done.length / tasks.length * 100);
  });
  renderChart('weeklyBarChart', 'bar', days.map(shortDay), data, '#22d07a', 'Completion %', { max: 100, suffix: '%' });
}

// ============================================================
// TASKS
// ============================================================
function addTask() {
  const inp = document.getElementById('task-input');
  const name = inp.value.trim();
  if (!name) return showToast('Enter a task name', 'error');

  const recurring = document.getElementById('task-recurring').checked;
  const dueDate = document.getElementById('task-due').value;
  const today = getToday();

  const task = {
    id: Date.now() + Math.random().toString(36).slice(2),
    name,
    priority: document.getElementById('task-priority').value,
    category: document.getElementById('task-category').value,
    done: false,
    date: today,
    recurring,
    recurringDays: recurring ? document.getElementById('task-recurring-days').value : null,
    dueDate: dueDate || null,
    note: '',
    createdAt: new Date().toISOString(),
  };

  state.tasks.push(task);
  inp.value = '';
  document.getElementById('task-due').value = '';
  document.getElementById('task-recurring').checked = false;
  toggleRecurringOptions();
  saveState();
  renderTasks();
  showToast('Task added! ✓', 'success');
}

function toggleTask(id) {
  const today = getToday();
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  if (t.recurring) {
    toggleRecurringTask(id, today);
  } else {
    t.done = !t.done;
  }
  saveState();
  renderTasks();
}

function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  state.tasks = state.tasks.filter(t => t.id !== id);
  saveState();
  renderTasks();
  showToast('Task deleted');
}

function editTask(id) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  document.getElementById('edit-task-id').value = id;
  document.getElementById('edit-task-name').value = t.name;
  document.getElementById('edit-task-priority').value = t.priority;
  document.getElementById('edit-task-category').value = t.category;
  document.getElementById('edit-task-due').value = t.dueDate || '';
  document.getElementById('edit-task-note').value = t.note || '';
  openModal('edit-task-modal');
}

function saveEditTask() {
  const id = document.getElementById('edit-task-id').value;
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  t.name = document.getElementById('edit-task-name').value.trim() || t.name;
  t.priority = document.getElementById('edit-task-priority').value;
  t.category = document.getElementById('edit-task-category').value;
  t.dueDate = document.getElementById('edit-task-due').value || null;
  t.note = document.getElementById('edit-task-note').value;
  saveState();
  renderTasks();
  closeModal('edit-task-modal');
  showToast('Task updated! ✓', 'success');
}

function toggleRecurringOptions() {
  const show = document.getElementById('task-recurring').checked;
  document.getElementById('recurring-options').style.display = show ? 'flex' : 'none';
}

function renderTasks() {
  const today = getToday();
  const catFilter = document.getElementById('filter-category')?.value || '';
  const statusFilter = document.getElementById('filter-status')?.value || '';
  const priorityFilter = document.getElementById('filter-priority')?.value || '';
  const dateFilter = document.getElementById('filter-date')?.value || today;

  let tasks = getTasksForDate(dateFilter || today);
  if (catFilter) tasks = tasks.filter(t => t.category === catFilter);
  if (priorityFilter) tasks = tasks.filter(t => t.priority === priorityFilter);
  if (statusFilter === 'done') tasks = tasks.filter(t => t.recurring ? isRecurringDone(t.id, dateFilter || today) : t.done);
  if (statusFilter === 'pending') tasks = tasks.filter(t => t.recurring ? !isRecurringDone(t.id, dateFilter || today) : !t.done);

  const list = document.getElementById('task-list');
  if (!list) return;

  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">✅</div>No tasks found for this filter.</div>';
    updateTaskStats(dateFilter || today);
    return;
  }

  list.innerHTML = tasks.map(t => {
    const viewDate = dateFilter || today;
    const done = t.recurring ? isRecurringDone(t.id, viewDate) : t.done;
    const overdue = t.dueDate && t.dueDate < today && !done;
    return `<div class="task-item ${done ? 'done' : ''}">
      <div class="task-check ${done ? 'checked' : ''}" onclick="toggleTaskDate('${t.id}','${viewDate}')"></div>
      <div style="flex:1;min-width:0">
        <div class="task-name">${escHtml(t.name)}${t.recurring ? '<span class="recurring-badge">↻ ' + (t.recurringDays || 'daily') + '</span>' : ''}</div>
        ${t.note ? `<div style="font-size:11px;color:var(--text3);margin-top:2px">${escHtml(t.note.slice(0,60))}${t.note.length>60?'...':''}</div>` : ''}
        ${t.dueDate ? `<div style="font-size:11px;color:${overdue?'var(--red)':'var(--text3)'};margin-top:2px">Due: ${formatDate(t.dueDate)}${overdue?' ⚠️ Overdue':''}</div>` : ''}
      </div>
      <span class="badge badge-${t.priority}">${t.priority}</span>
      <span class="badge badge-${t.category}">${t.category}</span>
      <div class="task-actions">
        <button class="icon-btn" onclick="editTask('${t.id}')" title="Edit">✏️</button>
        <button class="icon-btn" onclick="deleteTask('${t.id}')" title="Delete">🗑️</button>
      </div>
    </div>`;
  }).join('');

  updateTaskStats(dateFilter || today);
}

function toggleTaskDate(id, dateStr) {
  const t = state.tasks.find(t => t.id === id);
  if (!t) return;
  if (t.recurring) {
    toggleRecurringTask(id, dateStr);
  } else {
    t.done = !t.done;
  }
  saveState();
  renderTasks();
}

function updateTaskStats(dateStr) {
  const tasks = getTasksForDate(dateStr);
  const done = tasks.filter(t => t.recurring ? isRecurringDone(t.id, dateStr) : t.done);
  const pct = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;

  const el = document.getElementById('task-pct-big');
  if (el) el.textContent = pct + '%';
  const bar = document.getElementById('task-pct-bar');
  if (bar) bar.style.width = pct + '%';
  const lbl = document.getElementById('task-pct-label');
  if (lbl) lbl.textContent = `${done.length} of ${tasks.length} tasks done`;

  const cats = ['study', 'health', 'personal', 'coding'];
  const breakdown = document.getElementById('cat-breakdown');
  if (!breakdown) return;
  breakdown.innerHTML = cats.map(c => {
    const ct = tasks.filter(t => t.category === c);
    const cd = ct.filter(t => t.recurring ? isRecurringDone(t.id, dateStr) : t.done);
    const cp = ct.length ? Math.round(cd.length / ct.length * 100) : 0;
    return `<div>
      <div class="progress-label"><span class="badge badge-${c}">${c}</span><span>${cd.length}/${ct.length}</span></div>
      <div class="progress-track" style="height:6px"><div class="progress-fill fill-accent" style="width:${cp}%"></div></div>
    </div>`;
  }).join('');
}

// ============================================================
// WATER
// ============================================================
function renderWater() {
  const today = getToday();
  const count = state.water[today] || 0;
  const goal = state.waterGoal || 8;

  document.getElementById('water-count').textContent = count;
  document.getElementById('water-goal-disp').textContent = goal;
  document.getElementById('water-goal-val').textContent = goal + ' glasses';
  document.getElementById('water-goal-slider').value = goal;

  const pct = Math.min(100, Math.round(count / goal * 100));
  document.getElementById('water-bar').style.width = pct + '%';
  document.getElementById('water-pct-label').textContent = pct + '% of daily goal';

  const glasses = document.getElementById('water-glasses');
  if (glasses) {
    glasses.innerHTML = '';
    for (let i = 0; i < Math.min(goal, 20); i++) {
      const d = document.createElement('div');
      d.className = 'glass' + (i < count ? ' filled' : '');
      d.innerHTML = `<span class="glass-num">${i + 1}</span><div class="glass-fill"></div>`;
      d.onclick = () => setGlass(i + 1);
      glasses.appendChild(d);
    }
  }

  const tips = [
    'Start strong! Log your first glass. 💧',
    `${count} glass${count>1?'es':''} down! Keep going! 🌊`,
    'Over halfway! You\'re crushing it! 💪',
    '🎉 Goal reached! You\'re fully hydrated!',
  ];
  const tipEl = document.getElementById('hydration-tip');
  if (tipEl) {
    if (count === 0) tipEl.textContent = tips[0];
    else if (pct < 50) tipEl.textContent = tips[1];
    else if (pct < 100) tipEl.textContent = tips[2];
    else tipEl.textContent = tips[3];
  }

  renderWaterChart();
}

function setGlass(n) { const today = getToday(); state.water[today] = n; saveState(); renderWater(); }
function addGlass() { const today = getToday(); state.water[today] = (state.water[today] || 0) + 1; saveState(); renderWater(); showToast('💧 Glass logged!'); }
function removeGlass() { const today = getToday(); if ((state.water[today] || 0) > 0) { state.water[today]--; saveState(); renderWater(); } }
function updateWaterGoal(v) { state.waterGoal = parseInt(v); document.getElementById('water-goal-val').textContent = v + ' glasses'; document.getElementById('water-goal-disp').textContent = v; saveState(); renderWater(); }

function renderWaterChart() {
  const days = getLast7Days();
  const data = days.map(d => state.water[d] || 0);
  const goal = state.waterGoal || 8;
  renderChart('waterWeekChart', 'bar', days.map(shortDay), data, '#3b9eff', 'Glasses', {}, [
    { type: 'line', label: 'Goal', data: days.map(() => goal), borderColor: '#3b9eff60', borderDash: [4,4], borderWidth: 1, pointRadius: 0, fill: false }
  ]);
}

// ============================================================
// EXERCISE
// ============================================================
let selectedExType = '';

function selectExType(type, el) {
  selectedExType = type;
  document.querySelectorAll('.ex-type').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
}

function logExercise() {
  const today = getToday();
  const dur = parseInt(document.getElementById('ex-duration').value);
  if (!dur || dur < 1) return showToast('Enter duration in minutes', 'error');
  if (!state.exercise[today]) state.exercise[today] = { total: 0, sessions: [] };
  const session = { type: selectedExType || 'general', duration: dur, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  state.exercise[today].sessions.push(session);
  state.exercise[today].total += dur;
  document.getElementById('ex-duration').value = '';
  saveState();
  renderExercise();
  showToast(`💪 ${dur} min ${selectedExType || 'exercise'} logged!`, 'success');
}

function deleteExSession(dateStr, idx) {
  const ex = state.exercise[dateStr];
  if (!ex) return;
  ex.total -= ex.sessions[idx].duration;
  ex.sessions.splice(idx, 1);
  if (ex.total < 0) ex.total = 0;
  saveState();
  renderExercise();
}

function updateExGoal(v) { state.exerciseGoal = parseInt(v); document.getElementById('ex-goal-val').textContent = v + ' min'; saveState(); renderExercise(); }

function renderExercise() {
  const today = getToday();
  const ex = state.exercise[today] || { total: 0, sessions: [] };
  const goal = state.exerciseGoal || 30;

  document.getElementById('ex-total').textContent = ex.total;
  const pct = Math.min(100, Math.round(ex.total / goal * 100));
  document.getElementById('ex-bar').style.width = pct + '%';
  document.getElementById('ex-goal-pct').textContent = pct + '%';
  document.getElementById('ex-goal-slider').value = goal;
  document.getElementById('ex-goal-val').textContent = goal + ' min';

  const log = document.getElementById('ex-log');
  if (log) {
    if (ex.sessions.length === 0) {
      log.innerHTML = '<div class="empty-state" style="padding:16px 0"><div class="empty-icon">🏃</div>No sessions logged yet</div>';
    } else {
      log.innerHTML = ex.sessions.map((s, i) => `
        <div style="background:var(--bg4);border-radius:8px;padding:8px 12px;font-size:12px;display:flex;justify-content:space-between;align-items:center">
          <span>${s.type || 'General'} — <strong>${s.duration} min</strong></span>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="color:var(--text3)">${s.time}</span>
            <button class="icon-btn" onclick="deleteExSession('${today}',${i})" style="width:22px;height:22px;font-size:11px">✕</button>
          </div>
        </div>`).join('');
    }
  }
  renderExerciseChart();
}

function renderExerciseChart() {
  const days = getLast7Days();
  const data = days.map(d => (state.exercise[d] || { total: 0 }).total);
  renderChart('exWeekChart', 'bar', days.map(shortDay), data, '#f59e0b', 'Minutes');
}

// ============================================================
// MOOD
// ============================================================
const MOOD_EMOJI = { happy: '😊', neutral: '😐', sad: '😔', tired: '😴', excited: '🤩' };
const MOOD_MSG = {
  happy: 'Wonderful! Your positivity is contagious! 🌟',
  neutral: "That's okay! Every day has its own rhythm. ⚖️",
  sad: 'Sending you warmth. Tomorrow is a new day. 💙',
  tired: 'Rest is productive too. Take care of yourself. 🌙',
  excited: "That's amazing! Channel that energy! ⚡",
};

function setMood(mood, el) {
  const today = getToday();
  if (!state.mood[today]) state.mood[today] = {};
  state.mood[today].mood = mood;
  state.mood[today].timestamp = new Date().toISOString();
  document.querySelectorAll('.mood-btn').forEach(b => b.className = 'mood-btn');
  el.classList.add('active-' + mood);
  const msgEl = document.getElementById('mood-message');
  if (msgEl) msgEl.textContent = MOOD_MSG[mood] || '';
  saveState();
  renderMoodHistory();
  showToast('Mood saved! ' + (MOOD_EMOJI[mood] || ''), 'success');
}

function saveMoodNote() {
  const today = getToday();
  if (!state.mood[today]) state.mood[today] = {};
  state.mood[today].note = document.getElementById('mood-note').value;
  saveState();
  showToast('Note saved! 📝', 'success');
}

function renderMood() {
  const today = getToday();
  const mood = state.mood[today];
  if (mood && mood.mood) {
    document.querySelectorAll('.mood-btn').forEach(b => b.className = 'mood-btn');
    const btn = document.querySelector(`.mood-btn[data-mood="${mood.mood}"]`);
    if (btn) btn.classList.add('active-' + mood.mood);
    const msgEl = document.getElementById('mood-message');
    if (msgEl) msgEl.textContent = MOOD_MSG[mood.mood] || '';
    const noteEl = document.getElementById('mood-note');
    if (noteEl && mood.note) noteEl.value = mood.note;
  }
  renderMoodHistory();
  renderMoodChart();
}

function renderMoodHistory() {
  const hist = document.getElementById('mood-history');
  if (!hist) return;
  const days = getLast7Days().reverse();
  const rows = days.filter(d => state.mood[d] && state.mood[d].mood).map(d => {
    const m = state.mood[d];
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px;background:var(--bg3);border-radius:8px">
      <span style="font-size:22px">${MOOD_EMOJI[m.mood] || '—'}</span>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600">${formatDate(d)}</div>
        ${m.note ? `<div style="font-size:11px;color:var(--text3)">${escHtml(m.note.slice(0, 50))}${m.note.length > 50 ? '...' : ''}</div>` : ''}
      </div>
      <span style="font-size:11px;color:var(--text3)">${m.mood}</span>
    </div>`;
  });
  hist.innerHTML = rows.length ? rows.join('') : '<div class="empty-state">No mood data yet</div>';
}

function renderMoodChart() {
  const days = getLast7Days();
  const moodVal = { happy: 5, excited: 4, neutral: 3, tired: 2, sad: 1 };
  const data = days.map(d => { const m = state.mood[d]; return m && m.mood ? moodVal[m.mood] || 0 : 0; });
  const ctx = document.getElementById('moodChart');
  if (!ctx) return;
  if (window._charts && window._charts.moodChart) window._charts.moodChart.destroy();
  if (!window._charts) window._charts = {};
  window._charts.moodChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days.map(shortDay),
      datasets: [{ label: 'Mood', data, fill: true, backgroundColor: '#ec489918', borderColor: '#ec4899', borderWidth: 2, tension: 0.4, pointBackgroundColor: '#ec4899', pointRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { min: 0, max: 6, ticks: { color: '#8b92b0', callback: v => ({ 1: '😔', 2: '😴', 3: '😐', 4: '🤩', 5: '😊' })[v] || '' }, grid: { color: '#ffffff10' } },
        x: { grid: { display: false }, ticks: { color: '#8b92b0' } }
      }
    }
  });
}

// ============================================================
// POMODORO — persists sessions, timer survives
// ============================================================
let pomoSecondsLeft = 25 * 60;
let pomoRunning = false;
let pomoTimer = null;
let currentPomoMode = 'work';

function setPomoMode(mode, btn) {
  currentPomoMode = mode;
  document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const colors = { work: 'var(--accent)', short: 'var(--green)', long: 'var(--blue)' };
  document.getElementById('pomo-progress').style.stroke = colors[mode];
  document.getElementById('pomo-mode-label').textContent = { work: 'Work Session', short: 'Short Break', long: 'Long Break' }[mode];
  resetPomo();
}

function updatePomoDur(mode, val) {
  state.pomoDurations[mode] = parseInt(val);
  document.getElementById(mode + '-dur-val').textContent = val + ' min';
  if (currentPomoMode === mode && !pomoRunning) resetPomo();
  saveState();
}

function resetPomo() {
  clearInterval(pomoTimer);
  pomoRunning = false;
  pomoSecondsLeft = (state.pomoDurations[currentPomoMode] || 25) * 60;
  updatePomoDisplay();
  document.getElementById('pomo-progress').style.strokeDashoffset = '0';
}

function startPomo() {
  if (pomoRunning) return;
  pomoRunning = true;
  pomoTimer = setInterval(() => {
    pomoSecondsLeft--;
    if (pomoSecondsLeft <= 0) {
      clearInterval(pomoTimer);
      pomoRunning = false;
      onPomoComplete();
      return;
    }
    updatePomoDisplay();
  }, 1000);
}

function pausePomo() { clearInterval(pomoTimer); pomoRunning = false; }

function onPomoComplete() {
  const today = getToday();
  if (currentPomoMode === 'work') {
    if (!state.pomoDone[today]) state.pomoDone[today] = 0;
    if (!state.pomoMin[today]) state.pomoMin[today] = 0;
    state.pomoDone[today]++;
    state.pomoMin[today] += state.pomoDurations.work || 25;
    saveState();
    addPomoLog('🎉 Work session complete!');
    showToast('Work session done! 🎉 Take a break!', 'success');
  } else {
    addPomoLog('💪 Break complete! Back to work!');
    showToast('Break over! Time to focus! ⏱');
  }
  updatePomoStats();
  playNotificationSound();
  resetPomo();
}

function updatePomoDisplay() {
  const m = Math.floor(pomoSecondsLeft / 60);
  const s = pomoSecondsLeft % 60;
  document.getElementById('pomo-display').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');

  const total = (state.pomoDurations[currentPomoMode] || 25) * 60;
  const pct = (total - pomoSecondsLeft) / total;
  const circ = 527.8;
  document.getElementById('pomo-progress').style.strokeDashoffset = String(circ * (1 - pct));
}

function updatePomoStats() {
  const today = getToday();
  document.getElementById('pomo-sessions').textContent = state.pomoDone[today] || 0;
  document.getElementById('pomo-total-min').textContent = state.pomoMin[today] || 0;
}

function addPomoLog(msg) {
  const log = document.getElementById('pomo-log');
  if (!log) return;
  if (log.querySelector('p')) log.innerHTML = '';
  const div = document.createElement('div');
  div.style.cssText = 'font-size:12px;color:var(--text2);padding:6px 8px;background:var(--bg4);border-radius:6px;display:flex;justify-content:space-between';
  div.innerHTML = `<span>${msg}</span><span style="color:var(--text3)">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;
  log.prepend(div);
}

function playNotificationSound() {
  if (!state.notifications) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 520;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {}
}

function toggleNotifications() {
  state.notifications = !state.notifications;
  saveState();
  const btn = document.getElementById('notif-btn');
  if (btn) btn.textContent = state.notifications ? '🔔 On' : '🔕 Off';
  if (state.notifications && 'Notification' in window) {
    Notification.requestPermission().then(p => {
      if (p === 'granted') showToast('Notifications enabled! 🔔', 'success');
    });
  }
}

// ============================================================
// GOALS
// ============================================================
function saveGoal() {
  const title = document.getElementById('goal-title-inp').value.trim();
  if (!title) return showToast('Enter a goal title', 'error');
  const target = parseInt(document.getElementById('goal-target-inp').value);
  if (!target || target < 1) return showToast('Enter a valid target', 'error');

  const goal = {
    id: Date.now() + '',
    title,
    type: document.getElementById('goal-type-inp').value,
    target,
    progress: parseInt(document.getElementById('goal-progress-inp').value) || 0,
    unit: document.getElementById('goal-unit-inp').value || 'units',
    createdAt: new Date().toISOString(),
  };
  state.goals.push(goal);
  saveState();
  renderGoals();
  closeModal('goal-modal');
  ['goal-title-inp', 'goal-target-inp', 'goal-progress-inp', 'goal-unit-inp'].forEach(id => document.getElementById(id).value = '');
  showToast('Goal added! 🎯', 'success');
}

function updateGoalProgress(id, delta) {
  const g = state.goals.find(g => g.id === id);
  if (g) { g.progress = Math.max(0, Math.min(g.target, g.progress + delta)); saveState(); renderGoals(); }
}

function setGoalProgress(id, val) {
  const g = state.goals.find(g => g.id === id);
  if (g) { g.progress = Math.max(0, Math.min(g.target, parseInt(val) || 0)); saveState(); renderGoals(); }
}

function deleteGoal(id) {
  if (!confirm('Delete this goal?')) return;
  state.goals = state.goals.filter(g => g.id !== id);
  saveState();
  renderGoals();
}

function renderGoals() {
  const list = document.getElementById('goals-list');
  if (!list) return;
  if (state.goals.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-icon">🎯</div>No goals yet. Click + Add Goal!</div>';
    renderGoalsChart();
    return;
  }
  list.innerHTML = state.goals.map(g => {
    const pct = Math.round(g.progress / g.target * 100);
    const done = pct >= 100;
    return `<div class="goal-item">
      <div class="goal-top">
        <div>
          <span class="goal-title">${escHtml(g.title)}</span>
          ${done ? '<span class="badge badge-done" style="margin-left:6px">Done!</span>' : ''}
        </div>
        <div style="display:flex;align-items:center;gap:6px">
          <span class="badge badge-${g.type}">${g.type}</span>
          <button class="icon-btn" onclick="deleteGoal('${g.id}')">🗑️</button>
        </div>
      </div>
      <div class="progress-wrap">
        <div class="progress-label"><span>${g.progress} / ${g.target} ${escHtml(g.unit)}</span><span>${pct}%</span></div>
        <div class="progress-track" style="height:8px"><div class="progress-fill ${done ? 'fill-green' : 'fill-accent'}" style="width:${pct}%"></div></div>
      </div>
      <div style="display:flex;gap:6px;margin-top:10px;align-items:center">
        <button class="btn btn-ghost btn-xs" onclick="updateGoalProgress('${g.id}',-1)">−</button>
        <input type="number" class="inp" value="${g.progress}" min="0" max="${g.target}" onchange="setGoalProgress('${g.id}',this.value)" style="width:60px;padding:4px 8px;font-size:12px;text-align:center"/>
        <button class="btn btn-xs" onclick="updateGoalProgress('${g.id}',1)">+</button>
        <span style="font-size:11px;color:var(--text3);margin-left:4px">${escHtml(g.unit)}</span>
      </div>
    </div>`;
  }).join('');
  renderGoalsChart();
}

function renderGoalsChart() {
  if (!state.goals.length) return;
  const ctx = document.getElementById('goalsChart');
  if (!ctx) return;
  const key = 'goalsChart';
  if (window._charts && window._charts[key]) window._charts[key].destroy();
  if (!window._charts) window._charts = {};
  window._charts[key] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: state.goals.map(g => g.title.length > 14 ? g.title.slice(0, 14) + '…' : g.title),
      datasets: [
        { label: 'Progress', data: state.goals.map(g => g.progress), backgroundColor: '#6c63ff70', borderColor: '#6c63ff', borderWidth: 2, borderRadius: 5 },
        { label: 'Target', data: state.goals.map(g => g.target), backgroundColor: '#ffffff12', borderColor: '#ffffff25', borderWidth: 1, borderRadius: 5 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#ffffff10' }, ticks: { color: '#8b92b0' } }, x: { grid: { display: false }, ticks: { color: '#8b92b0', maxRotation: 30 } } } }
  });
}

// ============================================================
// CALENDAR — proper per-day historical data
// ============================================================
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();

function renderCalendar() {
  const today = getToday();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('cal-month-label').textContent = months[calMonth] + ' ' + calYear;

  const grid = document.getElementById('cal-grid');
  const first = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  let html = '';

  for (let i = 0; i < first; i++) html += '<div class="cal-day empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = calYear + '-' + String(calMonth + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    const isToday = ds === today;
    const isFuture = ds > today;
    const tasks = getTasksForDate(ds);
    const water = state.water[ds] || 0;
    const waterOk = water >= (state.waterGoal || 8);
    const hasMood = state.mood[ds] && state.mood[ds].mood;

    let cls = 'cal-day';
    if (isToday) cls += ' today';
    else if (isFuture) cls += ' future';
    else if (tasks.length > 0) {
      const done = tasks.filter(t => t.recurring ? isRecurringDone(t.id, ds) : t.done);
      cls += done.length === tasks.length ? ' done' : done.length > 0 ? ' partial' : ' none';
    } else cls += ' none';

    html += `<div class="${cls}" onclick="${isFuture ? '' : `showDayDetail('${ds}')`}" title="${ds}">
      ${d}
      ${hasMood ? `<div class="cal-dot"></div>` : ''}
    </div>`;
  }
  grid.innerHTML = html;
}

function showDayDetail(dateStr) {
  const detail = document.getElementById('cal-day-detail');
  const water = state.water[dateStr] || 0;
  const exercise = (state.exercise[dateStr] || { total: 0 }).total;
  const mood = state.mood[dateStr];
  const tasks = getTasksForDate(dateStr);
  const done = tasks.filter(t => t.recurring ? isRecurringDone(t.id, dateStr) : t.done);
  const note = state.calendarNotes && state.calendarNotes[dateStr] || '';

  detail.innerHTML = `
    <div style="font-weight:700;margin-bottom:12px;font-size:15px">${formatDateFull(dateStr)}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--green)">${done.length}/${tasks.length}</div><div style="font-size:11px;color:var(--text3)">Tasks</div></div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--blue)">${water}</div><div style="font-size:11px;color:var(--text3)">Glasses</div></div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center"><div style="font-size:22px;font-weight:800;color:var(--amber)">${exercise}</div><div style="font-size:11px;color:var(--text3)">Ex. Minutes</div></div>
      <div style="background:var(--bg3);border-radius:8px;padding:10px;text-align:center"><div style="font-size:26px">${mood && MOOD_EMOJI[mood.mood] ? MOOD_EMOJI[mood.mood] : '—'}</div><div style="font-size:11px;color:var(--text3)">Mood</div></div>
    </div>
    ${tasks.length > 0 ? `<div style="font-size:12px;font-weight:700;color:var(--text3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px">Tasks</div>
    ${tasks.map(t => { const d = t.recurring ? isRecurringDone(t.id, dateStr) : t.done; return `<div style="display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 0;border-bottom:1px solid var(--border)"><span style="color:${d?'var(--green)':'var(--text3)'}">${d?'✓':'○'}</span><span style="${d?'text-decoration:line-through;color:var(--text3)':''}">${escHtml(t.name)}</span></div>`; }).join('')}` : ''}
    <div style="margin-top:12px">
      <div style="font-size:11px;color:var(--text3);font-weight:700;margin-bottom:4px;text-transform:uppercase">Day Note</div>
      <textarea class="inp" style="width:100%;height:60px;font-size:12px" placeholder="Add a note..." onchange="saveDayNote('${dateStr}',this.value)">${escHtml(note)}</textarea>
    </div>`;
}

function saveDayNote(dateStr, val) {
  if (!state.calendarNotes) state.calendarNotes = {};
  state.calendarNotes[dateStr] = val;
  saveState();
  showToast('Note saved!');
}

function prevMonth() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function nextMonth() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }

// ============================================================
// PROGRESS — all charts properly using per-day data
// ============================================================
function renderProgress() {
  const days = getLast7Days();
  const labels = days.map(shortDay);

  const taskPcts = days.map(d => {
    const tasks = getTasksForDate(d);
    if (!tasks.length) return 0;
    const done = tasks.filter(t => t.recurring ? isRecurringDone(t.id, d) : t.done);
    return Math.round(done.length / tasks.length * 100);
  });

  const waterData = days.map(d => state.water[d] || 0);
  const exData = days.map(d => (state.exercise[d] || { total: 0 }).total);
  const moodVal = { happy: 5, excited: 4, neutral: 3, tired: 2, sad: 1 };
  const moodData = days.map(d => { const m = state.mood[d]; return m && m.mood ? moodVal[m.mood] || 0 : 0; });

  const chartDefs = [
    { id: 'progTaskBar', type: 'bar', data: taskPcts, color: '#22d07a', label: 'Completion %', opts: { max: 100 } },
    { id: 'progLine', type: 'line', data: taskPcts, color: '#6c63ff', label: '% Done', opts: { max: 100 } },
    { id: 'progWater', type: 'bar', data: waterData, color: '#3b9eff', label: 'Glasses' },
    { id: 'progEx', type: 'bar', data: exData, color: '#f59e0b', label: 'Minutes' },
    { id: 'progMood', type: 'line', data: moodData, color: '#ec4899', label: 'Mood' },
  ];

  chartDefs.forEach(({ id, type, data, color, label, opts }) => {
    renderChart(id, type, labels, data, color, label, opts || {});
  });

  // Storage usage
  const usage = document.getElementById('storage-usage');
  if (usage) usage.textContent = getStorageSize() + ' KB used';
}

// ============================================================
// GENERIC CHART RENDERER
// ============================================================
function renderChart(id, type, labels, data, color, label, opts = {}, extraDatasets = []) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (!window._charts) window._charts = {};
  if (window._charts[id]) window._charts[id].destroy();

  const datasets = [{
    label,
    data,
    backgroundColor: color + (type === 'line' ? '18' : '50'),
    borderColor: color,
    borderWidth: 2,
    borderRadius: type === 'bar' ? 5 : 0,
    tension: 0.4,
    fill: type === 'line',
    pointBackgroundColor: color,
    pointRadius: type === 'line' ? 4 : 0,
  }, ...extraDatasets];

  window._charts[id] = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          max: opts.max,
          grid: { color: '#ffffff12' },
          ticks: { color: '#8b92b0', callback: v => v + (opts.suffix || '') }
        },
        x: { grid: { display: false }, ticks: { color: '#8b92b0' } }
      }
    }
  });
}

// ============================================================
// THEME
// ============================================================
function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  state.theme = isLight ? 'light' : 'dark';
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = isLight ? '🌙' : '☀️';
  saveState();
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ============================================================
// UTILS
// ============================================================
function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
