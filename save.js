/* ═══════════════════════════════════════
   KIWI SHOOTER — save.js
   ระบบ save/load ทั้งหมดอยู่ที่นี่
═══════════════════════════════════════ */

var SAVE_KEY = 'kiwi_save';

/* ── Save ── */
function saveGame() {
  var data = {
    money:      state.money,
    multiplier: state.multiplier,
    damage:     state.damage,
    spawnRate:  state.spawnRate,
    kiwiCount:  state.kiwiCount,
    bossKills:  state.bossKills,
    wave:       state.wave,
    nextBossAt: state.nextBossAt,
    questWave:  state.questWave,
    items:  ITEMS.map(function(i){ return { id:i.id, lv:i.lv, cost:i.cost }; }),
    quests: QUESTS.map(function(q){ return { id:q.id, done:q.done }; }),
  };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch(e) {}
  showSaveIndicator();
}

/* ── Load ── */
function loadGame() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    var data = JSON.parse(raw);

    state.money      = data.money      || 0;
    state.multiplier = data.multiplier || 1;
    state.damage     = data.damage     || 1;
    state.spawnRate  = data.spawnRate  || 2200;
    state.kiwiCount  = data.kiwiCount  || 0;
    state.bossKills  = data.bossKills  || 0;
    state.wave       = data.wave       || 1;
    state.nextBossAt = data.nextBossAt || 100;
    state.questWave  = data.questWave  || 1;

    // restore items
    if (data.items) {
      data.items.forEach(function(saved) {
        var it = ITEMS.find(function(i){ return i.id === saved.id; });
        if (it) { it.lv = saved.lv; it.cost = saved.cost; }
      });
    }

    // restore quests
    if (data.quests) {
      data.quests.forEach(function(saved) {
        var q = QUESTS.find(function(q){ return q.id === saved.id; });
        if (q) q.done = saved.done;
      });
    }

    return true;
  } catch(e) { return false; }
}

/* ── Delete save ── */
function deleteSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch(e) {}
}

/* ── Save indicator ── */
function showSaveIndicator() {
  var el = document.getElementById('saveIndicator');
  if (!el) {
    el = document.createElement('div');
    el.id = 'saveIndicator';
    el.style.cssText = [
      'position:fixed','bottom:16px','left:50%',
      'transform:translateX(-50%)',
      'background:rgba(74,222,128,.9)','color:#0f172a',
      'padding:6px 16px','border-radius:99px',
      'font-size:.72rem','font-weight:700',
      'z-index:9999','pointer-events:none',
      'opacity:0','transition:opacity .3s',
      'white-space:nowrap'
    ].join(';');
    document.body.appendChild(el);
  }
  el.textContent = '💾 บันทึกแล้ว!';
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(function(){ el.style.opacity = '0'; }, 1500);
}

/* ── Auto save ── */
window.addEventListener('beforeunload', saveGame);
window.addEventListener('pagehide',     saveGame);
setInterval(saveGame, 30000); // ทุก 30 วินาที
