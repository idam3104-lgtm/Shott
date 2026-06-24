/* ═══════════════════════════════════════
   KIWI SHOOTER — game.js (stable)
   ═══════════════════════════════════════ */

/* ── State ── */
const state = {
  money: 0, multiplier: 1, damage: 1,
  spawnRate: 2200, kiwiCount: 0, bossKills: 0,
  spawnTimer: null, bossActive: false,
  bossHP: 0, bossMaxHP: 0,
  wave: 1, nextBossAt: 100, questWave: 1,
};

/* ── DOM ── */
const gameArea   = document.getElementById('gameArea');
const moneyEl    = document.getElementById('money');
const questCount = document.getElementById('questCount');
const crosshair  = document.getElementById('crosshair');
const multFlash  = document.getElementById('multFlash');

document.addEventListener('mousemove', e => {
  crosshair.style.left = e.clientX + 'px';
  crosshair.style.top  = e.clientY + 'px';
});

/* ══════════════════════════════════════
   SOUND
══════════════════════════════════════ */
let ctx = null;
function initAudio() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
}
function beep(type, freq, freq2, dur, vol) {
  if (!ctx) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.type = type;
  o.frequency.setValueAtTime(freq, ctx.currentTime);
  if (freq2) o.frequency.exponentialRampToValueAtTime(freq2, ctx.currentTime + dur);
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  o.start(); o.stop(ctx.currentTime + dur);
}
function noise(dur, vol) {
  if (!ctx) return;
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f   = ctx.createBiquadFilter(); f.type = 'lowpass';
  f.frequency.setValueAtTime(300, ctx.currentTime);
  f.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
}
const soundShoot    = () => beep('square',   880, 220,  0.15, 0.18);
const soundExplode  = () => noise(0.25, 0.5);
const soundBuy      = () => { beep('sine', 523, null, 0.1, 0.2); setTimeout(() => beep('sine', 784, null, 0.15, 0.2), 150); };
const soundBossHit  = () => beep('sawtooth', 150, 80,  0.12, 0.25);
const soundBossDead = () => [200,300,180,400,100].forEach((f,i) => setTimeout(() => beep('sawtooth', f, null, 0.3, 0.3), i*80));
const soundWin      = () => [523,659,784,1047].forEach((f,i) => setTimeout(() => beep('triangle', f, null, 0.25, 0.2), i*100));
function soundCoin(golden) {
  (golden ? [1200,1600,2000] : [800,1000]).forEach((f,i) => setTimeout(() => beep('sine', f, null, 0.2, 0.15), i*70));
}

/* ══════════════════════════════════════
   START SCREEN
══════════════════════════════════════ */
function showStartScreen() {
  const ov = document.createElement('div');
  ov.style.cssText = `
    position:fixed;inset:0;z-index:9999;
    background:rgba(10,14,30,.95);backdrop-filter:blur(8px);
    display:flex;flex-direction:column;align-items:center;
    justify-content:center;gap:18px;font-family:system-ui,sans-serif;
  `;
  ov.innerHTML = `
    <div style="font-size:4.5rem">🥝</div>
    <div style="font-size:1.8rem;font-weight:900;color:#4ade80;letter-spacing:.15em">KIWI SHOOTER</div>
    <div style="color:#94a3b8;font-size:.88rem;text-align:center;max-width:300px;line-height:1.9">
      คลิกนกกีวี่ให้ระเบิด 💥<br>
      ยิง 100 ตัว → <span style="color:#f87171">👹 บอส!</span><br>
      ชนะบอส → <span style="color:#fbbf24">🗺️ Wave ใหม่ ของ Reset!</span>
    </div>
    <button id="btnStart" style="
      padding:13px 44px;background:#4ade80;color:#0f172a;
      border:none;border-radius:60px;font-size:1rem;
      font-weight:800;cursor:pointer;margin-top:8px;
    ">🎮 เริ่มเกม</button>
  `;
  document.body.appendChild(ov);
  document.getElementById('btnStart').onclick = () => {
    initAudio(); soundBuy();
    ov.remove();
    startGame();
  };
}

/* ══════════════════════════════════════
   WAVE THEMES
══════════════════════════════════════ */
const THEMES = [
  { bg:'linear-gradient(180deg,#0f172a,#1e293b 60%,#0f2318)', name:'ป่ากลางคืน 🌲' },
  { bg:'linear-gradient(180deg,#1a0a2e,#2d1b4e 60%,#0d0a1a)', name:'ดาวเคราะห์ม่วง 🪐' },
  { bg:'linear-gradient(180deg,#1a0000,#3d0f0f 60%,#0d0000)', name:'นรกไฟ 🔥' },
  { bg:'linear-gradient(180deg,#001a1a,#003333 60%,#001010)', name:'ใต้ทะเลลึก 🌊' },
  { bg:'linear-gradient(180deg,#1a1400,#3d3200 60%,#0d0b00)', name:'ทะเลทราย 🏜️' },
];
function applyTheme() {
  const t = THEMES[(state.wave - 1) % THEMES.length];
  gameArea.style.background = t.bg;
  let lbl = document.getElementById('waveLbl');
  if (!lbl) {
    lbl = document.createElement('div');
    lbl.id = 'waveLbl';
    lbl.style.cssText = 'font-size:.6rem;color:#94a3b8;letter-spacing:.1em;margin-top:2px;text-align:center';
    document.querySelector('.hud-center').appendChild(lbl);
  }
  lbl.textContent = `Wave ${state.wave} · ${t.name}`;
}

/* ══════════════════════════════════════
   ITEMS
══════════════════════════════════════ */
let ITEMS = [];
function makeItems() {
  ITEMS = [
    { id:'birds', icon:'🐦', name:'นกเพิ่ม x2',  desc:'สปอว์นนกเร็วขึ้นครึ่ง',   cost:80,  max:3, lv:0, fn(){ state.spawnRate = Math.max(400, state.spawnRate*.5); if(!state.bossActive) restartSpawn(); } },
    { id:'mul',   icon:'💰', name:'คูณเงิน x2',  desc:'multiplier เงิน x2',       cost:120, max:4, lv:0, fn(){ state.multiplier *= 2; } },
    { id:'boom',  icon:'💥', name:'ระเบิดใหญ่',  desc:'ระเบิดโตขึ้น',             cost:60,  max:1, lv:0, fn(){} },
    { id:'gold',  icon:'🤑', name:'นกทองคำ',     desc:'20% โอกาสได้เงิน x5',     cost:200, max:1, lv:0, fn(){} },
    { id:'dmg',   icon:'⚔️', name:'อัปดาเมจ +5', desc:'ดาเมจต่อคลิกบอส +5',      cost:100, max:10,lv:0, fn(){ state.damage += 5; } },
    { id:'dmg2',  icon:'🗡️', name:'ดาบคม x2',   desc:'ดาเมจบอสคูณ 2',           cost:400, max:3, lv:0, fn(){ state.damage *= 2; } },
  ];
}
function renderItems() {
  const el = document.getElementById('itemList');
  if (!el) return;
  el.innerHTML = ITEMS.map(it => {
    const maxed = it.lv >= it.max;
    const ok    = !maxed && state.money >= it.cost;
    return `<div class="item-card">
      <div class="item-icon">${it.icon}</div>
      <div class="item-name">${it.name}${it.max>1?` <small style="color:var(--muted)">(${it.lv}/${it.max})</small>`:''}</div>
      <div class="item-desc">${it.desc}</div>
      <div class="item-cost">💰 ${maxed?'MAX':it.cost}</div>
      <button class="btn-buy" onclick="buyItem('${it.id}')" ${ok?'':'disabled'}>
        ${maxed?'✅ ซื้อแล้ว':'ซื้อ'}
      </button>
    </div>`;
  }).join('');
}
function buyItem(id) {
  const it = ITEMS.find(i => i.id === id);
  if (!it || it.lv >= it.max || state.money < it.cost) return;
  state.money -= it.cost; it.lv++; it.cost = Math.round(it.cost * 2.2);
  it.fn(); soundBuy(); updateHUD(); renderItems();
}

/* ══════════════════════════════════════
   QUESTS
══════════════════════════════════════ */
let QUESTS = [];
function makeQuests(w) {
  QUESTS = [
    { name:'🎯 ยิงเริ่มต้น',    desc:`ยิงนก ${5*w} ตัว`,      goal:5*w,    rew:30*w,  key:'kiwiCount', done:false },
    { name:'🔥 สายไฟ',          desc:`ยิงนก ${20*w} ตัว`,     goal:20*w,   rew:80*w,  key:'kiwiCount', done:false },
    { name:'💰 เศรษฐี',         desc:`สะสมเงิน ${200*w}`,     goal:200*w,  rew:100*w, key:'money',     done:false },
    { name:'🐦 นักล่านก',       desc:`ยิงนก ${50*w} ตัว`,     goal:50*w,   rew:250*w, key:'kiwiCount', done:false },
    { name:'🤑 ร่ำรวย',         desc:`สะสมเงิน ${1000*w}`,    goal:1000*w, rew:500*w, key:'money',     done:false },
    { name:'💥 มือปืน',         desc:`ยิงนก ${100*w} ตัว`,    goal:100*w,  rew:600*w, key:'kiwiCount', done:false },
    { name:'👹 นักล่าบอส',      desc:`กำจัดบอส ${w} ตัว`,     goal:w,      rew:800*w, key:'bossKills', done:false },
  ];
}
function renderQuests() {
  const el = document.getElementById('questList');
  if (!el) return;
  let done = 0;
  el.innerHTML = `<div style="font-size:.65rem;color:var(--gold);letter-spacing:.1em;margin-bottom:8px">รอบที่ ${state.questWave}</div>` +
    QUESTS.map(q => {
      const cur = Math.min(state[q.key]||0, q.goal);
      const pct = Math.round(cur/q.goal*100);
      if (q.done) done++;
      return `<div class="quest-card ${q.done?'done':''}">
        <div class="quest-name">${q.name}</div>
        <div class="quest-desc">${q.desc}</div>
        <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        <div class="quest-progress-label">${cur}/${q.goal}</div>
        <div class="quest-reward">รางวัล: 💰 ${q.rew}</div>
        ${q.done?'<div class="quest-done-badge">✅ สำเร็จ</div>':''}
      </div>`;
    }).join('');
  questCount.textContent = `${done}/${QUESTS.length}`;
}
function checkQuests() {
  QUESTS.forEach(q => {
    if (!q.done && (state[q.key]||0) >= q.goal) {
      q.done = true; state.money += q.rew;
      flash(`🎉 เควสสำเร็จ! +${q.rew} 💰`); soundWin();
      updateHUD(); renderItems();
    }
  });
  if (QUESTS.every(q => q.done)) {
    state.questWave++;
    makeQuests(state.questWave);
    flash(`🔥 เควสรอบ ${state.questWave} เริ่ม!`);
  }
  renderQuests();
}

/* ══════════════════════════════════════
   BOSS
══════════════════════════════════════ */
function spawnBoss() {
  if (state.bossActive) return;
  state.bossActive = true;
  clearInterval(state.spawnTimer);

  state.bossMaxHP = 1000 * state.wave;
  state.bossHP    = state.bossMaxHP;

  soundBossDead(); // dramatic sound
  flash(`👹 บอส Wave ${state.wave} โผล่แล้ว!`);

  /* HP wrap */
  const hw = document.createElement('div');
  hw.id = 'bossHPWrap';
  hw.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);width:280px;text-align:center;z-index:20;';
  hw.innerHTML = `
    <div style="font-size:.72rem;color:#f87171;font-weight:700;margin-bottom:5px;letter-spacing:.1em">
      👹 BOSS Wave ${state.wave} · HP ${state.bossMaxHP}
    </div>
    <div style="background:#1e293b;border-radius:99px;height:12px;border:1px solid #f87171;overflow:hidden">
      <div id="bossBar" style="height:100%;width:100%;background:linear-gradient(90deg,#f87171,#fbbf24);border-radius:99px;transition:width .1s"></div>
    </div>
    <div id="bossTxt" style="font-size:.68rem;color:#94a3b8;margin-top:3px">${state.bossMaxHP} / ${state.bossMaxHP}</div>
  `;

  /* Boss sprite */
  const boss = document.createElement('div');
  boss.id = 'boss';
  boss.textContent = '👹';
  boss.style.cssText = `
    position:absolute;left:50%;top:50%;
    transform:translate(-50%,-50%);
    font-size:6rem;cursor:crosshair;z-index:15;
    filter:drop-shadow(0 0 20px #f87171);
    animation:bossBob 1s ease-in-out infinite alternate;
    user-select:none;-webkit-user-select:none;
  `;

  gameArea.appendChild(hw);
  gameArea.appendChild(boss);

  function onBossHit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!state.bossActive) return;

    state.bossHP -= state.damage;
    soundBossHit();

    boss.style.filter = 'brightness(3) drop-shadow(0 0 20px #fff)';
    setTimeout(() => { if (boss.isConnected) boss.style.filter = 'drop-shadow(0 0 20px #f87171)'; }, 80);

    const pct = Math.max(0, state.bossHP / state.bossMaxHP * 100);
    const bar = document.getElementById('bossBar');
    const txt = document.getElementById('bossTxt');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `${Math.max(0, state.bossHP)} / ${state.bossMaxHP}`;

    const ar = gameArea.getBoundingClientRect();
    floatText(ar.width/2+(Math.random()-.5)*60, ar.height/2-40, `-${state.damage}⚔️`, '#f87171');

    if (state.bossHP <= 0) {
      boss.removeEventListener('touchstart', onBossHit);
      boss.removeEventListener('click', onBossHit);
      onBossDead(boss, hw);
    }
  }

  boss.addEventListener('touchstart', onBossHit, { passive: false });
  boss.addEventListener('click', onBossHit);
}

function onBossDead(boss, hw) {
  state.bossActive = false;
  state.bossKills++;
  soundBossDead();

  const reward = 500 * state.wave;
  state.money += reward;

  boss.textContent = '💥';
  boss.style.fontSize = '7rem';
  boss.style.animation = 'none';
  boss.style.filter = 'none';
  boss.style.cursor = 'default';

  setTimeout(() => {
    boss.remove(); hw.remove();

    /* ─ ขึ้น Wave ─ */
    state.wave++;
    state.nextBossAt = state.kiwiCount + 100;

    /* reset items & stats */
    state.multiplier = 1;
    state.damage     = 1;
    state.spawnRate  = Math.max(600, 2200 - (state.wave-1)*150);
    makeItems();

    soundWin();
    applyTheme();
    flash(`💀 บอสตาย! +${reward}💰  ›  Wave ${state.wave}!`);
    updateHUD(); renderItems(); checkQuests();
    setTimeout(restartSpawn, 1000);
  }, 700);
}

/* ══════════════════════════════════════
   KIWI
══════════════════════════════════════ */
const EMOJIS = ['🥝','🐦','🦤'];
function spawnKiwi() {
  if (state.bossActive) return;
  const ar      = gameArea.getBoundingClientRect();
  const right   = Math.random() > .5;
  const kiwi    = document.createElement('div');
  kiwi.className = 'kiwi';

  const hasGold  = ITEMS.find(i=>i.id==='gold')?.lv > 0;
  const isGolden = hasGold && Math.random() < .2;
  kiwi.textContent = isGolden ? '🌟' : EMOJIS[Math.floor(Math.random()*3)];

  kiwi.style.top  = (5 + Math.random()*75) + '%';
  kiwi.style.left = right ? '-60px' : (ar.width+60)+'px';
  kiwi.style.transform = right ? 'scaleX(1)' : 'scaleX(-1)';
  const travel = (ar.width + 120) * (right ? 1 : -1);
  kiwi.style.setProperty('--travel', travel+'px');
  kiwi.style.animationDuration = (3000+Math.random()*4000)+'ms';

  kiwi.addEventListener('click', e => {
    e.stopPropagation();
    const r  = kiwi.getBoundingClientRect();
    const cx = r.left+r.width/2  - ar.left;
    const cy = r.top +r.height/2 - ar.top;

    soundShoot(); soundExplode(); soundCoin(isGolden);
    explode(cx, cy);

    const earn = isGolden ? state.multiplier*50 : state.multiplier*(5+Math.floor(Math.random()*6));
    state.money += earn; state.kiwiCount++;

    floatText(cx, cy-20, `+${earn}💰`);
    if (state.multiplier > 1) flash(`x${state.multiplier}`);
    kiwi.remove();
    updateHUD(); renderItems(); checkQuests();

    if (state.kiwiCount >= state.nextBossAt) {
      state.nextBossAt = state.kiwiCount + 100;
      setTimeout(spawnBoss, 600);
    }
  });

  kiwi.addEventListener('animationend', () => kiwi.remove());
  gameArea.appendChild(kiwi);
}

/* ── helpers ── */
function explode(x, y) {
  const big = ITEMS.find(i=>i.id==='boom')?.lv > 0;
  const el  = document.createElement('div');
  el.className = 'explosion';
  el.textContent = '💥';
  el.style.cssText = `left:${x}px;top:${y}px;font-size:${big?'4rem':'2.8rem'}`;
  gameArea.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
function floatText(x, y, txt, color='#fbbf24') {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = txt; el.style.color = color;
  el.style.left = x+'px'; el.style.top = y+'px';
  gameArea.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}
function flash(txt) {
  multFlash.textContent = txt;
  multFlash.classList.remove('show');
  void multFlash.offsetWidth;
  multFlash.classList.add('show');
}
function restartSpawn() {
  clearInterval(state.spawnTimer);
  if (!state.bossActive) state.spawnTimer = setInterval(spawnKiwi, state.spawnRate);
}
function updateHUD() { moneyEl.textContent = state.money.toLocaleString(); }

/* ══════════════════════════════════════
   START
══════════════════════════════════════ */
function startGame() {
  makeItems(); makeQuests(1);
  applyTheme(); updateHUD();
  renderItems(); renderQuests();
  restartSpawn(); spawnKiwi();
}

/* init */
makeItems(); makeQuests(1);
renderItems(); renderQuests();
showStartScreen();
