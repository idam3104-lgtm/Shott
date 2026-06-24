/* ═══════════════════════════════════════
   KIWI SHOOTER — game.js
   ═══════════════════════════════════════ */

/* ── State ── */
const state = {
  money:      0,
  multiplier: 1,
  spawnRate:  2200,   // ms ระหว่างนก
  kiwiCount:  0,      // นกที่ยิงได้รวม
  totalShots: 0,
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
   ITEMS
══════════════════════════════════════ */
const ITEMS = [
  {
    id: 'moreBirds',
    icon: '🐦',
    name: 'นกเพิ่ม x2',
    desc: 'ลดเวลาสปอว์นนกลงครึ่งหนึ่ง',
    cost: 80,
    maxLevel: 3,
    level: 0,
    effect() {
      state.spawnRate = Math.max(400, state.spawnRate * 0.5);
      restartSpawn();
    },
  },
  {
    id: 'goldMul',
    icon: '💰',
    name: 'คูณเงิน x2',
    desc: 'เพิ่ม multiplier เงินที่ได้ x2',
    cost: 120,
    maxLevel: 4,
    level: 0,
    effect() { state.multiplier *= 2; },
  },
  {
    id: 'bigBoom',
    icon: '💥',
    name: 'ระเบิดใหญ่',
    desc: 'ระเบิดใหญ่กว่าเดิม ดูเท่ขึ้น',
    cost: 60,
    maxLevel: 1,
    level: 0,
    effect() { /* visual only — handled in explode() */ },
  },
  {
    id: 'richBirds',
    icon: '🤑',
    name: 'นกทองคำ',
    desc: 'มีโอกาส 20% ที่นกจะมีมูลค่าสูง x5',
    cost: 200,
    maxLevel: 1,
    level: 0,
    effect() { /* chance handled in spawnKiwi */ },
  },
];

function renderItems() {
  const el = document.getElementById('itemList');
  el.innerHTML = '';
  ITEMS.forEach(item => {
    const maxed = item.level >= item.maxLevel;
    const canBuy = state.money >= item.cost && !maxed;
    el.innerHTML += `
      <div class="item-card">
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}${item.maxLevel > 1 ? ` <small style="color:var(--muted)">(Lv${item.level}/${item.maxLevel})</small>` : ''}</div>
        <div class="item-desc">${item.desc}</div>
        <div class="item-cost">💰 ${maxed ? 'MAX' : item.cost}</div>
        <button class="btn-buy" onclick="buyItem('${item.id}')" ${(!canBuy) ? 'disabled' : ''}>
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
  item.cost = Math.round(item.cost * 2.2); // ราคาขึ้น
  item.effect();
  updateHUD();
  renderItems();
}

/* ══════════════════════════════════════
   QUESTS
══════════════════════════════════════ */
const QUESTS = [
  { id: 'q1', name: '🎯 ยิงเริ่มต้น',   desc: 'ยิงนก 5 ตัว',           goal: 5,   reward: 30,  key: 'kiwiCount', done: false },
  { id: 'q2', name: '🔥 สาย Combo',      desc: 'ยิงนก 20 ตัว',          goal: 20,  reward: 80,  key: 'kiwiCount', done: false },
  { id: 'q3', name: '💰 เศรษฐี',         desc: 'สะสมเงิน 200',          goal: 200, reward: 100, key: 'money',     done: false },
  { id: 'q4', name: '🐦 นกล้าน',         desc: 'ยิงนก 50 ตัว',          goal: 50,  reward: 250, key: 'kiwiCount', done: false },
  { id: 'q5', name: '🤑 ร่ำรวย',          desc: 'สะสมเงิน 1000',         goal: 1000,reward: 500, key: 'money',     done: false },
  { id: 'q6', name: '💥 มือปืน',          desc: 'ยิงนก 100 ตัว',         goal: 100, reward: 600, key: 'kiwiCount', done: false },
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

  // นกทองคำ (ถ้าซื้อไอเทม richBirds)
  const richItem = ITEMS.find(i => i.id === 'richBirds');
  const isGolden = richItem && richItem.level > 0 && Math.random() < 0.2;

  const emoji = isGolden ? '🌟' : KIWI_EMOJIS[Math.floor(Math.random() * KIWI_EMOJIS.length)];
  kiwi.textContent = emoji;

  // ความสูงสุ่ม (บน 80% ของพื้นที่เกม)
  const topPct = 5 + Math.random() * 75;
  kiwi.style.top  = topPct + '%';

  const speed    = 3000 + Math.random() * 4000; // ms
  const travel   = (area.width + 120) * (goRight ? 1 : -1);
  kiwi.style.setProperty('--travel', travel + 'px');
  kiwi.style.animationDuration = speed + 'ms';

  if (goRight) {
    kiwi.style.left      = '-60px';
    kiwi.style.transform = 'scaleX(1)';
  } else {
    kiwi.style.left      = (area.width + 60) + 'px';
    kiwi.style.transform = 'scaleX(-1)';
  }

  // คลิกยิง
  kiwi.addEventListener('click', e => {
    e.stopPropagation();
    const rect   = kiwi.getBoundingClientRect();
    const cx     = rect.left + rect.width  / 2 - area.left;
    const cy     = rect.top  + rect.height / 2 - area.top;
    explode(cx, cy);
    const earn = isGolden
      ? state.multiplier * 5 * 10
      : state.multiplier * (5 + Math.floor(Math.random() * 6));
    state.money      += earn;
    state.kiwiCount  += 1;
    spawnFloatText(cx, cy - 20, `+${earn} 💰`);
    if (state.multiplier > 1) showMultiplierFlash(`x${state.multiplier}`);
    kiwi.remove();
    updateHUD();
    renderItems();
    checkQuests();
  });

  // ลบอัตโนมัติเมื่อบินออกไป
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
  exp.style.left     = x + 'px';
  exp.style.top      = y + 'px';
  exp.style.fontSize = size;
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

/* ── Multiplier flash ── */
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

/* ── HUD update ── */
function updateHUD() {
  moneyEl.textContent = state.money.toLocaleString();
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
renderItems();
renderQuests();
restartSpawn();
spawnKiwi(); // spawn ทันทีโดยไม่รอ
