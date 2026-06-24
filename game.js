/* ═══════════════════════════════════════
   KIWI SHOOTER — game.js
   ═══════════════════════════════════════ */

/* ── State ── */
const state = {
  money:      0,
  multiplier: 1,
  spawnRate:  2200,
  kiwiCount:  0,
  spawnTimer: null,
};

/* ── DOM refs ── */
const gameArea   = document.getElementById('gameArea');
const moneyEl    = document.getElementById('money');
const questCount = document.getElementById('questCount');
const crosshair  = document.getElementById('crosshair');
const multFlash  = document.getElementById('multFlash');

/* ── Crosshair ── */
document.addEventListener('mousemove', e => {
  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top  = e.clientY + 'px';
});

/* ══════════════════════════════════════
   SOUND — unlock ด้วย Start Screen
══════════════════════════════════════ */
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // resume ถ้า suspended
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function soundShoot() {
  if (!audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'square';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.12);
  gain.gain.setValueAtTime(0.18, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.start(); osc.stop(audioCtx.currentTime + 0.15);
}

function soundExplode() {
  if (!audioCtx) return;
  const bufSize = audioCtx.sampleRate * 0.25;
  const buffer  = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
  const data    = buffer.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  const filter = audioCtx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(400, audioCtx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.25);
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  source.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
  source.start();
}

function soundCoin(isGolden = false) {
  if (!audioCtx) return;
  const freqs = isGolden ? [1200, 1600, 2000] : [800, 1000];
  freqs.forEach((f, i) => {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sine';
    const t = audioCtx.currentTime + i * 0.07;
    osc.frequency.setValueAtTime(f, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t); osc.stop(t + 0.2);
  });
}

function soundBuy() {
  if (!audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523, audioCtx.currentTime);
  osc.frequency.setValueAtTime(659, audioCtx.currentTime + 0.1);
  osc.frequency.setValueAtTime(784, audioCtx.currentTime + 0.2);
  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  osc.start(); osc.stop(audioCtx.currentTime + 0.35);
}

function soundQuestDone() {
  if (!audioCtx) return;
  [523, 659, 784, 1047].forEach((freq, i) => {
    const osc  = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    const t = audioCtx.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t); osc.stop(t + 0.25);
  });
}

/* ══════════════════════════════════════
   START SCREEN
══════════════════════════════════════ */
function showStartScreen() {
  const overlay = document.createElement('div');
  overlay.id = 'startOverlay';
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:999;
    background:rgba(10,14,30,.92);
    backdrop-filter:blur(6px);
    display:flex; flex-direction:column;
    align-items:center; justify-content:center;
    gap:20px;
  `;
  overlay.innerHTML = `
    <div style="font-size:5rem">🥝</div>
    <div style="font-size:2rem;font-weight:800;color:#4ade80;letter-spacing:.15em">KIWI SHOOTER</div>
    <div style="color:#94a3b8;font-size:.95rem">คลิกนกกีวี่ให้ระเบิด 💥 สะสมเงิน ซื้อไอเทม ทำเควส!</div>
    <button id="startBtn" style="
      margin-top:12px;
      padding:14px 48px;
      background:#4ade80;
      color:#0f172a;
      border:none; border-radius:60px;
      font-size:1.1rem; font-weight:800;
      cursor:pointer; letter-spacing:.08em;
    ">🎮 เริ่มเกม</button>
  `;
  document.body.appendChild(overlay);

  document.getElementById('startBtn').addEventListener('click', () => {
    // unlock audio ตรงนี้ — guaranteed user interaction
    initAudio();
    soundBuy(); // เล่นเสียงทดสอบเบาๆ
    overlay.remove();
    startGame();
  });
}

/* ══════════════════════════════════════
   ITEMS
══════════════════════════════════════ */
const ITEMS = [
  {
    id: 'moreBirds', icon: '🐦', name: 'นกเพิ่ม x2',
    desc: 'ลดเวลาสปอว์นนกลงครึ่งหนึ่ง', cost: 80, maxLevel: 3, level: 0,
    effect() { state.spawnRate = Math.max(400, state.spawnRate * 0.5); restartSpawn(); },
  },
  {
    id: 'goldMul', icon: '💰', name: 'คูณเงิน x2',
    desc: 'เพิ่ม multiplier เงินที่ได้ x2', cost: 120, maxLevel: 4, level: 0,
    effect() { state.multiplier *= 2; },
  },
  {
    id: 'bigBoom', icon: '💥', name: 'ระเบิดใหญ่',
    desc: 'ระเบิดใหญ่กว่าเดิม ดูเท่ขึ้น', cost: 60, maxLevel: 1, level: 0,
    effect() {},
  },
  {
    id: 'richBirds', icon: '🤑', name: 'นกทองคำ',
    desc: 'มีโอกาส 20% ที่นกจะมีมูลค่าสูง x5', cost: 200, maxLevel: 1, level: 0,
    effect() {},
  },
];

function renderItems() {
  const el = document.getElementById('itemList');
  el.innerHTML = '';
  ITEMS.forEach(item => {
    const maxed  = item.level >= item.maxLevel;
    const canBuy = state.money >= item.cost && !maxed;
    el.innerHTML += `
      <div class="item-card">
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}${item.maxLevel > 1 ? ` <small style="color:var(--muted)">(Lv${item.level}/${item.maxLevel})</small>` : ''}</div>
        <div class="item-desc">${item.desc}</div>
        <div class="item-cost">💰 ${maxed ? 'MAX' : item.cost}</div>
        <button class="btn-buy" onclick="buyItem('${item.id}')" ${!canBuy ? 'disabled' : ''}>
          ${maxed ? '✅ ซื้อแล้ว' : 'ซื้อ'}
        </button>
      </div>`;
  });
}

function buyItem(id) {
  const item = ITEMS.find(i => i.id === id);
  if (!item || item.level >= item.maxLevel || state.money < item.cost) return;
  state.money -= item.cost;
  item.level++;
  item.cost = Math.round(item.cost * 2.2);
  item.effect();
  soundBuy();
  updateHUD();
  renderItems();
}

/* ══════════════════════════════════════
   QUESTS
══════════════════════════════════════ */
const QUESTS = [
  { id: 'q1', name: '🎯 ยิงเริ่มต้น', desc: 'ยิงนก 5 ตัว',   goal: 5,    reward: 30,  key: 'kiwiCount', done: false },
  { id: 'q2', name: '🔥 สาย Combo',   desc: 'ยิงนก 20 ตัว',  goal: 20,   reward: 80,  key: 'kiwiCount', done: false },
  { id: 'q3', name: '💰 เศรษฐี',      desc: 'สะสมเงิน 200',  goal: 200,  reward: 100, key: 'money',     done: false },
  { id: 'q4', name: '🐦 นกล้าน',      desc: 'ยิงนก 50 ตัว',  goal: 50,   reward: 250, key: 'kiwiCount', done: false },
  { id: 'q5', name: '🤑 ร่ำรวย',      desc: 'สะสมเงิน 1000', goal: 1000, reward: 500, key: 'money',     done: false },
  { id: 'q6', name: '💥 มือปืน',      desc: 'ยิงนก 100 ตัว', goal: 100,  reward: 600, key: 'kiwiCount', done: false },
];

function renderQuests() {
  const el = document.getElementById('questList');
  el.innerHTML = '';
  let doneCount = 0;
  QUESTS.forEach(q => {
    const cur = Math.min(state[q.key], q.goal);
    const pct = Math.round((cur / q.goal) * 100);
    if (q.done) doneCount++;
    el.innerHTML += `
      <div class="quest-card ${q.done ? 'done' : ''}">
        <div class="quest-name">${q.name}</div>
        <div class="quest-desc">${q.desc}</div>
        <div class="quest-progress-bar">
          <div class="quest-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="quest-progress-label">${cur} / ${q.goal}</div>
        <div class="quest-reward">รางวัล: 💰 ${q.reward}</div>
        ${q.done ? '<div class="quest-done-badge">✅ สำเร็จ</div>' : ''}
      </div>`;
  });
  questCount.textContent = `${doneCount}/${QUESTS.length}`;
}

function checkQuests() {
  let changed = false;
  QUESTS.forEach(q => {
    if (!q.done && state[q.key] >= q.goal) {
      q.done = true;
      state.money += q.reward;
      changed = true;
      showFlash(`🎉 เควสสำเร็จ! +${q.reward} 💰`);
      soundQuestDone();
    }
  });
  if (changed) { updateHUD(); renderItems(); }
  renderQuests();
}

/* ══════════════════════════════════════
   KIWI SPAWNER
══════════════════════════════════════ */
const KIWI_EMOJIS = ['🥝', '🐦', '🦤'];

function spawnKiwi() {
  const area    = gameArea.getBoundingClientRect();
  const goRight = Math.random() > 0.5;
  const kiwi    = document.createElement('div');
  kiwi.className = 'kiwi';

  const richItem = ITEMS.find(i => i.id === 'richBirds');
  const isGolden = richItem && richItem.level > 0 && Math.random() < 0.2;
  kiwi.textContent = isGolden ? '🌟' : KIWI_EMOJIS[Math.floor(Math.random() * KIWI_EMOJIS.length)];

  kiwi.style.top = (5 + Math.random() * 75) + '%';
  const travel = (area.width + 120) * (goRight ? 1 : -1);
  kiwi.style.setProperty('--travel', travel + 'px');
  kiwi.style.animationDuration = (3000 + Math.random() * 4000) + 'ms';
  kiwi.style.left      = goRight ? '-60px' : (area.width + 60) + 'px';
  kiwi.style.transform = goRight ? 'scaleX(1)' : 'scaleX(-1)';

  kiwi.addEventListener('click', e => {
    e.stopPropagation();
    const rect = kiwi.getBoundingClientRect();
    const cx   = rect.left + rect.width  / 2 - area.left;
    const cy   = rect.top  + rect.height / 2 - area.top;

    soundShoot();
    soundExplode();
    soundCoin(isGolden);
    explode(cx, cy);

    const earn = isGolden
      ? state.multiplier * 50
      : state.multiplier * (5 + Math.floor(Math.random() * 6));
    state.money     += earn;
    state.kiwiCount += 1;

    spawnFloatText(cx, cy - 20, `+${earn} 💰`);
    if (state.multiplier > 1) showMultiplierFlash(`x${state.multiplier}`);
    kiwi.remove();
    updateHUD();
    renderItems();
    checkQuests();
  });

  kiwi.addEventListener('animationend', () => kiwi.remove());
  gameArea.appendChild(kiwi);
}

/* ── Explosion ── */
function explode(x, y) {
  const bigBoom = ITEMS.find(i => i.id === 'bigBoom');
  const size    = bigBoom && bigBoom.level > 0 ? '4rem' : '2.8rem';
  const exp     = document.createElement('div');
  exp.className = 'explosion';
  exp.textContent = '💥';
  exp.style.cssText = `left:${x}px; top:${y}px; font-size:${size}`;
  gameArea.appendChild(exp);
  exp.addEventListener('animationend', () => exp.remove());
}

/* ── Float text ── */
function spawnFloatText(x, y, text) {
  const el = document.createElement('div');
  el.className   = 'float-text';
  el.textContent = text;
  el.style.left  = x + 'px';
  el.style.top   = y + 'px';
  gameArea.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ── Flash ── */
function showFlash(text) {
  multFlash.textContent = text;
  multFlash.classList.remove('show');
  void multFlash.offsetWidth;
  multFlash.classList.add('show');
}
function showMultiplierFlash(text) { showFlash(text); }

/* ── Spawn loop ── */
function restartSpawn() {
  clearInterval(state.spawnTimer);
  state.spawnTimer = setInterval(spawnKiwi, state.spawnRate);
}

/* ── HUD ── */
function updateHUD() {
  moneyEl.textContent = state.money.toLocaleString();
}

/* ══════════════════════════════════════
   START GAME
══════════════════════════════════════ */
function startGame() {
  renderItems();
  renderQuests();
  restartSpawn();
  spawnKiwi();
}

/* ── INIT ── */
renderItems();
renderQuests();
showStartScreen();
