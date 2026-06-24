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

  boss.addEventListener('click', function onBossClick(e) {
    e.stopPropagation();
    if (!state.bossActive) return;

    state.bossHP -= state.damage;
    soundBossHit();

    /* flash boss */
    boss.style.filter = 'brightness(3) drop-shadow(0 0 20px #fff)';
    setTimeout(() => { if (boss.isConnected) boss.style.filter = 'drop-shadow(0 0 20px #f87171)'; }, 80);

    /* update HP bar */
    const pct = Math.max(0, state.bossHP / state.bossMaxHP * 100);
    const bar = document.getElementById('bossBar');
    const txt = document.getElementById('bossTxt');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `${Math.max(0, state.bossHP)} / ${state.bossMaxHP}`;

    /* float dmg */
    const r  = boss.getBoundingClientRect();
    const ar = gameArea.getBoundingClientRect();
    floatText(r.left+r.width/2-ar.left+(Math.random()-.5)*50, r.top+r.height/2-ar.top-20, `-${state.damage}⚔️`, '#f87171');

    /* boss dead? */
    if (state.bossHP <= 0) {
      boss.removeEventListener('click', onBossClick);
      onBossDead(boss, hw);
    }
  });
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
    o.connect(g); g.connect(audioCtx.destination); o.type = 'sine';
    const t = audioCtx.currentTime + i * 0.07;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.start(t); o.stop(t + 0.2);
  });
}
function soundBuy() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination); o.type = 'sine';
  [523,659,784].forEach((f,i) => o.frequency.setValueAtTime(f, audioCtx.currentTime + i*0.1));
  g.gain.setValueAtTime(0.2, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
  o.start(); o.stop(audioCtx.currentTime + 0.35);
}
function soundQuestDone() {
  if (!audioCtx) return;
  [523,659,784,1047].forEach((f,i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination); o.type = 'triangle';
    const t = audioCtx.currentTime + i*0.1;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.start(t); o.stop(t + 0.25);
  });
}
function soundBossAppear() {
  if (!audioCtx) return;
  [110,90,70].forEach((f,i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination); o.type = 'sawtooth';
    const t = audioCtx.currentTime + i*0.15;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.start(t); o.stop(t + 0.4);
  });
}
function soundBossHit() {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination); o.type = 'sawtooth';
  o.frequency.setValueAtTime(150, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.1);
  g.gain.setValueAtTime(0.25, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  o.start(); o.stop(audioCtx.currentTime + 0.12);
}
function soundBossDead() {
  if (!audioCtx) return;
  [200,250,180,300,100].forEach((f,i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination); o.type = 'sawtooth';
    const t = audioCtx.currentTime + i*0.08;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t); o.stop(t + 0.3);
  });
}
function soundWaveUp() {
  if (!audioCtx) return;
  [400,500,600,800,1000].forEach((f,i) => {
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination); o.type = 'sine';
    const t = audioCtx.currentTime + i*0.12;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t); o.stop(t + 0.3);
  });
}

/* ══════════════════════════════════════
   START SCREEN
══════════════════════════════════════ */
function showStartScreen() {
  const ov = document.createElement('div');
  ov.id = 'startOverlay';
  ov.style.cssText = `
    position:fixed;inset:0;z-index:999;
    background:rgba(10,14,30,.93);backdrop-filter:blur(6px);
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
  `;
  ov.innerHTML = `
    <div style="font-size:5rem">🥝</div>
    <div style="font-size:2rem;font-weight:800;color:#4ade80;letter-spacing:.15em">KIWI SHOOTER</div>
    <div style="color:#94a3b8;font-size:.9rem;text-align:center;max-width:320px;line-height:1.8">
      คลิกนกกีวี่ให้ระเบิด 💥<br/>
      ยิงครบ 100 ตัว → <span style="color:#f87171">👹 บอสโผล่!</span><br/>
      ชนะบอส → <span style="color:#fbbf24">🗺️ แมพใหม่ ยากขึ้น!</span><br/>
      ของที่อัปจะรีเซ็ตทุก wave
    </div>
    <button id="startBtn" style="
      margin-top:12px;padding:14px 48px;
      background:#4ade80;color:#0f172a;
      border:none;border-radius:60px;
      font-size:1.1rem;font-weight:800;cursor:pointer;
    ">🎮 เริ่มเกม</button>
  `;
  document.body.appendChild(ov);
  document.getElementById('startBtn').addEventListener('click', () => {
    initAudio(); soundBuy();
    ov.remove();
    startGame();
  });
}

/* ══════════════════════════════════════
   WAVE / MAP SYSTEM
══════════════════════════════════════ */
const WAVE_THEMES = [
  { bg: 'linear-gradient(180deg,#0f172a 0%,#1e293b 60%,#0f2318 100%)', name: 'ป่ากลางคืน 🌲' },
  { bg: 'linear-gradient(180deg,#1a0a2e 0%,#2d1b4e 60%,#0d0a1a 100%)', name: 'ดาวเคราะห์ม่วง 🪐' },
  { bg: 'linear-gradient(180deg,#1a0000 0%,#3d0f0f 60%,#0d0000 100%)', name: 'นรกไฟ 🔥' },
  { bg: 'linear-gradient(180deg,#001a1a 0%,#003333 60%,#001010 100%)', name: 'ใต้ทะเลลึก 🌊' },
  { bg: 'linear-gradient(180deg,#1a1400 0%,#3d3200 60%,#0d0b00 100%)', name: 'ทะเลทราย 🏜️' },
];

function getWaveTheme() {
  return WAVE_THEMES[(state.wave - 1) % WAVE_THEMES.length];
}

function applyWaveTheme() {
  const theme = getWaveTheme();
  gameArea.style.background = theme.bg;
  showFlash(`🗺️ Wave ${state.wave}: ${theme.name}`);
}

function updateWaveHUD() {
  // อัปชื่อ wave ใน HUD
  let waveEl = document.getElementById('waveLabel');
  if (!waveEl) {
    waveEl = document.createElement('div');
    waveEl.id = 'waveLabel';
    waveEl.style.cssText = 'font-size:.65rem;letter-spacing:.1em;color:#94a3b8;text-align:center;margin-top:2px';
    document.querySelector('.hud-center').appendChild(waveEl);
  }
  waveEl.textContent = `Wave ${state.wave} · ${getWaveTheme().name}`;
}

/* ══════════════════════════════════════
   ITEMS — สร้างใหม่ทุก wave (reset ค่า)
══════════════════════════════════════ */
function makeItems() {
  return [
    { id:'moreBirds', icon:'🐦', name:'นกเพิ่ม x2',   desc:'ลดเวลาสปอว์นนกลงครึ่ง',     cost:80,  maxLevel:3,  level:0, effect() { state.spawnRate = Math.max(400, state.spawnRate*0.5); if(!state.bossActive) restartSpawn(); } },
    { id:'goldMul',   icon:'💰', name:'คูณเงิน x2',   desc:'เพิ่ม multiplier เงินที่ได้', cost:120, maxLevel:4,  level:0, effect() { state.multiplier *= 2; } },
    { id:'bigBoom',   icon:'💥', name:'ระเบิดใหญ่',   desc:'ระเบิดใหญ่กว่าเดิม',         cost:60,  maxLevel:1,  level:0, effect() {} },
    { id:'richBirds', icon:'🤑', name:'นกทองคำ',      desc:'20% โอกาสได้เงิน x5',        cost:200, maxLevel:1,  level:0, effect() {} },
    { id:'dmg',       icon:'⚔️', name:'อัปดาเมจ',     desc:'ดาเมจบอส +5 ต่อคลิก',        cost:100, maxLevel:10, level:0, effect() { state.damage += 5; } },
    { id:'dmg2',      icon:'🗡️', name:'ดาบคม x2',     desc:'ดาเมจบอสคูณ 2 ทันที',        cost:400, maxLevel:3,  level:0, effect() { state.damage *= 2; } },
  ];
}
let ITEMS = makeItems();

function renderItems() {
  const el = document.getElementById('itemList');
  el.innerHTML = '';
  ITEMS.forEach(item => {
    const maxed  = item.level >= item.maxLevel;
    const canBuy = state.money >= item.cost && !maxed;
    el.innerHTML += `
      <div class="item-card">
        <div class="item-icon">${item.icon}</div>
        <div class="item-name">${item.name}${item.maxLevel>1?` <small style="color:var(--muted)">(Lv${item.level}/${item.maxLevel})</small>`:''}</div>
        <div class="item-desc">${item.desc}</div>
        <div class="item-cost">💰 ${maxed?'MAX':item.cost}</div>
        <button class="btn-buy" onclick="buyItem('${item.id}')" ${!canBuy?'disabled':''}>
          ${maxed?'✅ ซื้อแล้ว':'ซื้อ'}
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
function makeQuests(w) {
  return [
    { id:'q1', name:'🎯 นักล่าเริ่มต้น', desc:`ยิงนก ${5*w} ตัว`,      goal:5*w,    reward:30*w,  key:'kiwiCount', done:false },
    { id:'q2', name:'🔥 สายไฟ',          desc:`ยิงนก ${20*w} ตัว`,     goal:20*w,   reward:80*w,  key:'kiwiCount', done:false },
    { id:'q3', name:'💰 เศรษฐี',         desc:`สะสมเงิน ${200*w}`,     goal:200*w,  reward:100*w, key:'money',     done:false },
    { id:'q4', name:'🐦 นักล่านก',       desc:`ยิงนก ${50*w} ตัว`,     goal:50*w,   reward:250*w, key:'kiwiCount', done:false },
    { id:'q5', name:'🤑 ร่ำรวย',         desc:`สะสมเงิน ${1000*w}`,    goal:1000*w, reward:500*w, key:'money',     done:false },
    { id:'q6', name:'💥 มือปืนมืออาชีพ', desc:`ยิงนก ${100*w} ตัว`,    goal:100*w,  reward:600*w, key:'kiwiCount', done:false },
    { id:'q7', name:'👹 นักล่าบอส',      desc:`กำจัดบอส ${w} ตัว`,     goal:w,      reward:800*w, key:'bossKills', done:false },
  ];
}
let QUESTS = makeQuests(1);

function renderQuests() {
  const el = document.getElementById('questList');
  el.innerHTML = `<div style="font-size:.65rem;color:var(--gold);letter-spacing:.1em;margin-bottom:8px">รอบที่ ${state.questWave}</div>`;
  let done = 0;
  QUESTS.forEach(q => {
    const cur = Math.min(state[q.key]||0, q.goal);
    const pct = Math.round((cur/q.goal)*100);
    if (q.done) done++;
    el.innerHTML += `
      <div class="quest-card ${q.done?'done':''}">
        <div class="quest-name">${q.name}</div>
        <div class="quest-desc">${q.desc}</div>
        <div class="quest-progress-bar"><div class="quest-progress-fill" style="width:${pct}%"></div></div>
        <div class="quest-progress-label">${cur} / ${q.goal}</div>
        <div class="quest-reward">รางวัล: 💰 ${q.reward}</div>
        ${q.done?'<div class="quest-done-badge">✅ สำเร็จ</div>':''}
      </div>`;
  });
  questCount.textContent = `${done}/${QUESTS.length}`;
}

function checkQuests() {
  let changed = false;
  QUESTS.forEach(q => {
    if (!q.done && (state[q.key]||0) >= q.goal) {
      q.done = true; state.money += q.reward;
      changed = true;
      showFlash(`🎉 เควสสำเร็จ! +${q.reward} 💰`);
      soundQuestDone();
    }
  });
  if (changed) { updateHUD(); renderItems(); }
  if (QUESTS.every(q => q.done)) {
    state.questWave++;
    QUESTS = makeQuests(state.questWave);
    showFlash(`🔥 เควสรอบที่ ${state.questWave} เริ่มแล้ว!`);
    setTimeout(soundQuestDone, 300);
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

  // เลือดบอสเพิ่มทุก wave
  state.bossMaxHP = 1000 * state.wave;
  state.bossHP    = state.bossMaxHP;

  soundBossAppear();
  showFlash(`👹 บอส Wave ${state.wave} โผล่แล้ว!`);

  // สร้าง boss element
  const boss = document.createElement('div');
  boss.id = 'boss';
  boss.style.cssText = `
    position:absolute;left:50%;top:50%;
    transform:translate(-50%,-50%);
    font-size:6rem;cursor:crosshair;
    filter:drop-shadow(0 0 20px #f87171);
    animation:bossBob 1s ease-in-out infinite alternate;
    z-index:10;user-select:none;
  `;
  boss.textContent = '👹';

  // HP bar
  const hpWrap = document.createElement('div');
  hpWrap.id = 'bossHPWrap';
  hpWrap.style.cssText = `
    position:absolute;top:16px;left:50%;transform:translateX(-50%);
    width:300px;text-align:center;z-index:20;
  `;
  hpWrap.innerHTML = `
    <div style="font-size:.75rem;letter-spacing:.15em;color:#f87171;margin-bottom:6px;font-weight:700">
      👹 BOSS — Wave ${state.wave} · HP ${state.bossMaxHP}
    </div>
    <div style="background:#1e293b;border-radius:99px;height:14px;border:1px solid #f87171;overflow:hidden">
      <div id="bossHPBar" style="height:100%;background:linear-gradient(90deg,#f87171,#fbbf24);width:100%;border-radius:99px;transition:width .1s"></div>
    </div>
    <div id="bossHPText" style="font-size:.72rem;color:#94a3b8;margin-top:4px">${state.bossHP} / ${state.bossMaxHP}</div>
  `;

  gameArea.appendChild(hpWrap);
  gameArea.appendChild(boss);

  boss.addEventListener('click', e => {
    e.stopPropagation();
    if (!state.bossActive) return;

    state.bossHP -= state.damage;
    soundBossHit();

    // flash
    boss.style.filter = 'drop-shadow(0 0 30px #fff) brightness(2)';
    setTimeout(() => { if(boss.isConnected) boss.style.filter = 'drop-shadow(0 0 20px #f87171)'; }, 80);

    // อัป HP bar
    const pct = Math.max(0, (state.bossHP / state.bossMaxHP) * 100);
    const bar  = document.getElementById('bossHPBar');
    const txt  = document.getElementById('bossHPText');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = `${Math.max(0, state.bossHP)} / ${state.bossMaxHP}`;

    // float damage
    const rect = boss.getBoundingClientRect();
    const area = gameArea.getBoundingClientRect();
    spawnFloatText(
      rect.left + rect.width/2  - area.left + (Math.random()-0.5)*40,
      rect.top  + rect.height/2 - area.top  - 20,
      `-${state.damage} ⚔️`, '#f87171'
    );

    if (state.bossHP <= 0) onBossDead(boss, hpWrap);
  });
}

function onBossDead(bossEl, hpWrap) {
  state.bossActive = false;
  state.bossKills  = (state.bossKills || 0) + 1;
  soundBossDead();

  const reward = 500 * state.wave;
  state.money += reward;

  // explosion visual
  bossEl.textContent = '💥';
  bossEl.style.fontSize = '8rem';
  bossEl.style.animation = 'none';
  bossEl.style.filter = 'none';

  setTimeout(() => {
    if (bossEl.isConnected)  bossEl.remove();
    if (hpWrap.isConnected) hpWrap.remove();

    // ── ขึ้น Wave ใหม่ ──
    state.wave++;
    state.nextBossAt = state.kiwiCount + 100; // บอสถัดไปอีก 100 นก

    // reset items & stats (ยกเว้นเงิน)
    state.multiplier = 1;
    state.damage     = 1;
    state.spawnRate  = Math.max(600, 2200 - (state.wave-1)*150); // เร็วขึ้นทุก wave
    ITEMS = makeItems();

    soundWaveUp();
    applyWaveTheme();
    updateWaveHUD();
    showFlash(`💀 บอสตาย! +${reward} 💰  →  Wave ${state.wave}!`);

    updateHUD();
    renderItems();
    checkQuests();

    setTimeout(() => restartSpawn(), 1000);
  }, 600);
}

/* ══════════════════════════════════════
   KIWI SPAWNER
══════════════════════════════════════ */
const KIWI_EMOJIS = ['🥝','🐦','🦤'];

function spawnKiwi() {
  if (state.bossActive) return;
  const area    = gameArea.getBoundingClientRect();
  const goRight = Math.random() > 0.5;
  const kiwi    = document.createElement('div');
  kiwi.className = 'kiwi';

  const richItem = ITEMS.find(i => i.id === 'richBirds');
  const isGolden = richItem && richItem.level > 0 && Math.random() < 0.2;
  kiwi.textContent = isGolden ? '🌟' : KIWI_EMOJIS[Math.floor(Math.random()*KIWI_EMOJIS.length)];

  kiwi.style.top = (5 + Math.random()*75) + '%';
  const travel = (area.width + 120) * (goRight ? 1 : -1);
  kiwi.style.setProperty('--travel', travel + 'px');
  kiwi.style.animationDuration = (3000 + Math.random()*4000) + 'ms';
  kiwi.style.left      = goRight ? '-60px' : (area.width+60)+'px';
  kiwi.style.transform = goRight ? 'scaleX(1)' : 'scaleX(-1)';

  kiwi.addEventListener('click', e => {
    e.stopPropagation();
    const rect = kiwi.getBoundingClientRect();
    const cx = rect.left + rect.width/2  - area.left;
    const cy = rect.top  + rect.height/2 - area.top;

    soundShoot(); soundExplode(); soundCoin(isGolden);
    explode(cx, cy);

    const earn = isGolden ? state.multiplier*50 : state.multiplier*(5+Math.floor(Math.random()*6));
    state.money     += earn;
    state.kiwiCount += 1;

    spawnFloatText(cx, cy-20, `+${earn} 💰`);
    if (state.multiplier > 1) showFlash(`x${state.multiplier}`);
    kiwi.remove();
    updateHUD(); renderItems(); checkQuests();

    // บอสโผล่ทุก 100 นก (นับสะสม)
    if (state.kiwiCount >= state.nextBossAt) {
      state.nextBossAt = state.kiwiCount + 100;
      setTimeout(spawnBoss, 500);
    }
  });

  kiwi.addEventListener('animationend', () => kiwi.remove());
  gameArea.appendChild(kiwi);
}

/* ── Explosion ── */
function explode(x, y) {
  const big  = ITEMS.find(i => i.id==='bigBoom');
  const size = big && big.level > 0 ? '4rem' : '2.8rem';
  const el   = document.createElement('div');
  el.className = 'explosion';
  el.textContent = '💥';
  el.style.cssText = `left:${x}px;top:${y}px;font-size:${size}`;
  gameArea.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

/* ── Float text ── */
function spawnFloatText(x, y, text, color='#fbbf24') {
  const el = document.createElement('div');
  el.className = 'float-text';
  el.textContent = text;
  el.style.cssText = `left:${x}px;top:${y}px;color:${color}`;
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

/* ── Spawn loop ── */
function restartSpawn() {
  clearInterval(state.spawnTimer);
  if (!state.bossActive) state.spawnTimer = setInterval(spawnKiwi, state.spawnRate);
}

/* ── HUD ── */
function updateHUD() {
  moneyEl.textContent = state.money.toLocaleString();
}

/* ══════════════════════════════════════
   START
══════════════════════════════════════ */
function startGame() {
  applyWaveTheme();
  updateWaveHUD();
  renderItems();
  renderQuests();
  restartSpawn();
  spawnKiwi();
}

renderItems();
renderQuests();
showStartScreen();
  if (!audioCtx) return;
  (isGolden ? [1200, 1600, 2000] : [800, 1000]).forEach((f, i) => {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
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
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
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
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'triangle';
    const t = audioCtx.currentTime + i * 0.1;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.start(t); osc.stop(t + 0.25);
  });
}

function soundBossAppear() {
  if (!audioCtx) return;
  [110, 90, 70].forEach((freq, i) => {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    const t = audioCtx.currentTime + i * 0.15;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.start(t); osc.stop(t + 0.4);
  });
}

function soundBossHit() {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(150, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
  osc.start(); osc.stop(audioCtx.currentTime + 0.12);
}

function soundBossDead() {
  if (!audioCtx) return;
  [200, 250, 180, 300, 100].forEach((freq, i) => {
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'sawtooth';
    const t = audioCtx.currentTime + i * 0.08;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.start(t); osc.stop(t + 0.3);
  });
}

/* ══════════════════════════════════════
   START SCREEN
══════════════════════════════════════ */
function showStartScreen() {
  const overlay = document.createElement('div');
  overlay.id = 'startOverlay';
  overlay.style.cssText = `
    position:fixed;inset:0;z-index:999;
    background:rgba(10,14,30,.93);backdrop-filter:blur(6px);
    display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;
  `;
  overlay.innerHTML = `
    <div style="font-size:5rem">🥝</div>
    <div style="font-size:2rem;font-weight:800;color:#4ade80;letter-spacing:.15em">KIWI SHOOTER</div>
    <div style="color:#94a3b8;font-size:.9rem;text-align:center;max-width:340px;line-height:1.7">
      คลิกนกกีวี่ให้ระเบิด 💥<br/>
      ยิงครบ 100 ตัว → <span style="color:#f87171">👹 บอสโผล่!</span><br/>
      ทำเควสครบ → เควสใหม่ที่ยากขึ้น 🔥
    </div>
    <button id="startBtn" style="
      margin-top:12px;padding:14px 48px;
      background:#4ade80;color:#0f172a;
      border:none;border-radius:60px;
      font-size:1.1rem;font-weight:800;cursor:pointer;letter-spacing:.08em;
    ">🎮 เริ่มเกม</button>
  `;
  document.body.appendChild(overlay);
  document.getElementById('startBtn').addEventListener('click', () => {
    initAudio(); soundBuy();
    overlay.remove();
    startGame();
  });
}

/* ══════════════════════════════════════
   BOSS
══════════════════════════════════════ */
function spawnBoss() {
  if (state.bossActive) return;
  state.bossActive = true;

  // เลือดบอสเพิ่มทุก wave: 1000, 2000, 3000...
  const wave = Math.floor(state.kiwiCount / state.bossThreshold);
  state.bossMaxHP = 1000 * wave;
  state.bossHP    = state.bossMaxHP;

  // หยุดนกระหว่างบอส
  clearInterval(state.spawnTimer);

  soundBossAppear();
  showFlash('👹 บอสโผล่แล้ว!');

  // สร้าง boss element
  const boss = document.createElement('div');
  boss.id = 'boss';
  boss.style.cssText = `
    position:absolute;
    left:50%; top:50%;
    transform:translate(-50%,-50%);
    font-size:6rem;
    cursor:crosshair;
    filter:drop-shadow(0 0 20px #f87171);
    animation:bossBob 1s ease-in-out infinite alternate;
    z-index:10;
    user-select:none;
  `;
  boss.textContent = '👹';

  // HP bar container
  const hpWrap = document.createElement('div');
  hpWrap.id = 'bossHPWrap';
  hpWrap.style.cssText = `
    position:absolute;top:16px;left:50%;transform:translateX(-50%);
    width:300px;text-align:center;z-index:20;
  `;
  hpWrap.innerHTML = `
    <div style="font-size:.75rem;letter-spacing:.15em;color:#f87171;margin-bottom:6px;font-weight:700">
      👹 BOSS — รอบที่ ${wave}
    </div>
    <div style="background:#1e293b;border-radius:99px;height:14px;border:1px solid #f87171;overflow:hidden">
      <div id="bossHPBar" style="height:100%;background:linear-gradient(90deg,#f87171,#fbbf24);width:100%;border-radius:99px;transition:width .15s"></div>
    </div>
    <div id="bossHPText" style="font-size:.72rem;color:#94a3b8;margin-top:4px">${state.bossHP} / ${state.bossMaxHP}</div>
  `;

  gameArea.appendChild(hpWrap);
  gameArea.appendChild(boss);

  boss.addEventListener('click', e => {
    e.stopPropagation();
    if (!state.bossActive) return;
    state.bossHP -= state.damage;

    soundBossHit();

    // shake boss
    boss.style.filter = 'drop-shadow(0 0 30px #fff) brightness(2)';
    setTimeout(() => { boss.style.filter = 'drop-shadow(0 0 20px #f87171)'; }, 80);

    // อัป HP bar
    const pct = Math.max(0, (state.bossHP / state.bossMaxHP) * 100);
    document.getElementById('bossHPBar').style.width = pct + '%';
    document.getElementById('bossHPText').textContent = `${Math.max(0,state.bossHP)} / ${state.bossMaxHP}`;

    // float damage
    const rect = boss.getBoundingClientRect();
    const area = gameArea.getBoundingClientRect();
    const cx   = rect.left + rect.width/2  - area.left + (Math.random()-0.5)*40;
    const cy   = rect.top  + rect.height/2 - area.top  - 20;
    spawnFloatText(cx, cy, `-${state.damage} ⚔️`, '#f87171');

    if (state.bossHP <= 0) killBoss(boss, hpWrap, wave);
  });
}

function killBoss(bossEl, hpWrap, wave) {
  state.bossActive = false;
  soundBossDead();

  // รางวัลจากบอส
  const reward = 500 * wave;
  state.money += reward;
  updateHUD();
  renderItems();

  // explosion effect
  bossEl.textContent = '💥';
  bossEl.style.fontSize = '8rem';
  bossEl.style.animation = 'none';
  bossEl.style.filter = 'none';
  setTimeout(() => { bossEl.remove(); hpWrap.remove(); }, 600);

  showFlash(`💀 บอสตาย! +${reward} 💰`);
  checkQuests();

  // เริ่มนกใหม่
  setTimeout(() => restartSpawn(), 800);
}

/* ══════════════════════════════════════
   ITEMS
══════════════════════════════════════ */
const ITEMS = [
  {
    id: 'moreBirds', icon: '🐦', name: 'นกเพิ่ม x2',
    desc: 'ลดเวลาสปอว์นนกลงครึ่งหนึ่ง', cost: 80, maxLevel: 3, level: 0,
    effect() { state.spawnRate = Math.max(400, state.spawnRate * 0.5); if (!state.bossActive) restartSpawn(); },
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
    desc: 'มีโอกาส 20% ที่นกมีมูลค่า x5', cost: 200, maxLevel: 1, level: 0,
    effect() {},
  },
  {
    id: 'dmg', icon: '⚔️', name: 'อัปดาเมจ',
    desc: 'เพิ่มดาเมจต่อคลิกบอส +5', cost: 100, maxLevel: 10, level: 0,
    effect() { state.damage += 5; },
  },
  {
    id: 'dmg2', icon: '🗡️', name: 'ดาบคม x2',
    desc: 'ดาเมจบอสคูณ 2 ทันที', cost: 400, maxLevel: 3, level: 0,
    effect() { state.damage *= 2; },
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
   QUESTS — หลายรอบ ยากขึ้นเรื่อยๆ
══════════════════════════════════════ */
function makeQuests(wave) {
  const m = wave; // multiplier ความยาก
  return [
    { id:'q1', name:'🎯 นักล่าเริ่มต้น', desc:`ยิงนก ${5*m} ตัว`,       goal:5*m,    reward:30*m,  key:'kiwiCount', done:false },
    { id:'q2', name:'🔥 สายไฟ',          desc:`ยิงนก ${20*m} ตัว`,      goal:20*m,   reward:80*m,  key:'kiwiCount', done:false },
    { id:'q3', name:'💰 เศรษฐี',         desc:`สะสมเงิน ${200*m}`,      goal:200*m,  reward:100*m, key:'money',     done:false },
    { id:'q4', name:'🐦 นักล่านก',       desc:`ยิงนก ${50*m} ตัว`,      goal:50*m,   reward:250*m, key:'kiwiCount', done:false },
    { id:'q5', name:'🤑 ร่ำรวย',         desc:`สะสมเงิน ${1000*m}`,     goal:1000*m, reward:500*m, key:'money',     done:false },
    { id:'q6', name:'💥 มือปืนมืออาชีพ', desc:`ยิงนก ${100*m} ตัว`,     goal:100*m,  reward:600*m, key:'kiwiCount', done:false },
    { id:'q7', name:'👹 นักล่าบอส',      desc:`กำจัดบอส ${1*m} ตัว`,    goal:1*m,    reward:800*m, key:'bossKills', done:false },
  ];
}

let QUESTS = makeQuests(1);
// เพิ่ม bossKills ใน state
state.bossKills = 0;

function renderQuests() {
  const el = document.getElementById('questList');
  el.innerHTML = `<div style="font-size:.65rem;color:var(--gold);letter-spacing:.1em;margin-bottom:8px">รอบที่ ${state.questWave}</div>`;
  let doneCount = 0;
  QUESTS.forEach(q => {
    const cur = Math.min(state[q.key] || 0, q.goal);
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
    if (!q.done && (state[q.key] || 0) >= q.goal) {
      q.done = true;
      state.money += q.reward;
      changed = true;
      showFlash(`🎉 เควสสำเร็จ! +${q.reward} 💰`);
      soundQuestDone();
    }
  });
  if (changed) { updateHUD(); renderItems(); }

  // ถ้าทำครบทุกเควส → reset ยากขึ้น
  const allDone = QUESTS.every(q => q.done);
  if (allDone) {
    state.questWave++;
    QUESTS = makeQuests(state.questWave);
    showFlash(`🔥 เควสรอบที่ ${state.questWave} เริ่มแล้ว!`);
    soundQuestDone();
  }

  renderQuests();
}

/* ══════════════════════════════════════
   KIWI SPAWNER
══════════════════════════════════════ */
const KIWI_EMOJIS = ['🥝', '🐦', '🦤'];

function spawnKiwi() {
  if (state.bossActive) return;
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
    const cx = rect.left + rect.width/2  - area.left;
    const cy = rect.top  + rect.height/2 - area.top;

    soundShoot(); soundExplode(); soundCoin(isGolden);
    explode(cx, cy);

    const earn = isGolden
      ? state.multiplier * 50
      : state.multiplier * (5 + Math.floor(Math.random() * 6));
    state.money     += earn;
    state.kiwiCount += 1;

    spawnFloatText(cx, cy - 20, `+${earn} 💰`);
    if (state.multiplier > 1) showMultiplierFlash(`x${state.multiplier}`);
    kiwi.remove();
    updateHUD(); renderItems(); checkQuests();

    // ตรวจบอส: ทุก 100 นก
    if (state.kiwiCount > 0 && state.kiwiCount % state.bossThreshold === 0) {
      setTimeout(spawnBoss, 500);
    }
  });

  kiwi.addEventListener('animationend', () => kiwi.remove());
  gameArea.appendChild(kiwi);
}

// เพิ่ม bossKills เมื่อบอสตาย (แก้ killBoss)
const _killBoss = killBoss;

/* ── Explosion ── */
function explode(x, y) {
  const bigBoom = ITEMS.find(i => i.id === 'bigBoom');
  const size    = bigBoom && bigBoom.level > 0 ? '4rem' : '2.8rem';
  const exp     = document.createElement('div');
  exp.className = 'explosion';
  exp.textContent = '💥';
  exp.style.cssText = `left:${x}px;top:${y}px;font-size:${size}`;
  gameArea.appendChild(exp);
  exp.addEventListener('animationend', () => exp.remove());
}

/* ── Float text ── */
function spawnFloatText(x, y, text, color = '#fbbf24') {
  const el = document.createElement('div');
  el.className   = 'float-text';
  el.textContent = text;
  el.style.left  = x + 'px';
  el.style.top   = y + 'px';
  el.style.color = color;
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
  if (!state.bossActive) state.spawnTimer = setInterval(spawnKiwi, state.spawnRate);
}

/* ── HUD ── */
function updateHUD() {
  moneyEl.textContent = state.money.toLocaleString();
}

/* ── patch killBoss to track bossKills ── */
const origKillBoss = killBoss;
function killBoss(bossEl, hpWrap, wave) {
  state.bossKills = (state.bossKills || 0) + 1;
  origKillBoss(bossEl, hpWrap, wave);
}

/* ══════════════════════════════════════
   START
══════════════════════════════════════ */
function startGame() {
  renderItems(); renderQuests();
  restartSpawn(); spawnKiwi();
}

/* ── INIT ── */
renderItems(); renderQuests();
showStartScreen();
