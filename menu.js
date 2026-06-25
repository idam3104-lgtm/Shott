/* ═══════════════════════════════════════
   KIWI SHOOTER — menu.js
═══════════════════════════════════════ */

/* ── Skins ── */
const SKINS = [
  { id:'kiwi',   name:'กีวี่',      img:'kiwi.png',  cost:0,   unlocked:true  },
  { id:'gold',   name:'ทองคำ',      img:'gold.png',  cost:0,   unlocked:true  },
  { id:'devil',  name:'ปีศาจ',      img:'boss.png',  cost:500, unlocked:false },
  { id:'emoji1', name:'🐧 เพนกวิน', img:null, emoji:'🐧', cost:200, unlocked:false },
  { id:'emoji2', name:'🦜 นกแก้ว',  img:null, emoji:'🦜', cost:200, unlocked:false },
  { id:'emoji3', name:'🦚 นกยูง',   img:null, emoji:'🦚', cost:300, unlocked:false },
];

/* ── Effects ── */
const EFFECTS = [
  { id:'boom',    icon:'💥', name:'ระเบิดไฟ',   desc:'ระเบิดสีส้มคลาสสิก',        cost:0,   unlocked:true  },
  { id:'star',    icon:'⭐', name:'ดาวกระจาย',  desc:'กระจายดาวทองรอบจุดยิง',     cost:150, unlocked:false },
  { id:'heart',   icon:'❤️', name:'หัวใจ',      desc:'ระเบิดเป็นหัวใจสีแดง',      cost:150, unlocked:false },
  { id:'rainbow', icon:'🌈', name:'รุ้งสีสัน',  desc:'เส้นสีรุ้งกระจายออกมา',     cost:300, unlocked:false },
  { id:'ice',     icon:'❄️', name:'น้ำแข็ง',    desc:'ระเบิดแช่แข็งสีฟ้า',        cost:300, unlocked:false },
  { id:'money',   icon:'💸', name:'เงินร่วง',   desc:'แบงก์และเหรียญร่วงกระจาย',  cost:500, unlocked:false },
];

/* ── Storage ── */
function save(key, val) {
  try { localStorage.setItem('kiwi_' + key, JSON.stringify(val)); } catch(e){}
}
function load(key, def) {
  try { var v = localStorage.getItem('kiwi_' + key); return v ? JSON.parse(v) : def; } catch(e){ return def; }
}

var selectedSkin   = load('skin',   'kiwi');
var selectedEffect = load('effect', 'boom');
var unlockedSkins   = load('unlocked_skins',   ['kiwi','gold']);
var unlockedEffects = load('unlocked_effects', ['boom']);

/* ── Render Skins ── */
function renderSkins() {
  var el = document.getElementById('skinGrid');
  el.innerHTML = SKINS.map(function(s) {
    var unlocked = unlockedSkins.indexOf(s.id) >= 0;
    var sel      = selectedSkin === s.id;
    var preview  = s.img
      ? '<img class="skin-preview" src="' + s.img + '" alt="' + s.name + '"/>'
      : '<div class="skin-preview-emoji">' + s.emoji + '</div>';
    var badge = sel
      ? '<div class="skin-badge">✓ ใช้อยู่</div>'
      : unlocked
        ? '<div style="font-size:.6rem;color:var(--green)">ปลดแล้ว</div>'
        : '<div class="skin-cost">💰 ' + s.cost + '</div>';
    return '<div class="skin-card ' + (sel?'selected':'') + ' ' + (!unlocked?'locked':'') + '" onclick="selectSkin(\'' + s.id + '\')">' +
      preview + '<div class="skin-name">' + s.name + '</div>' + badge + '</div>';
  }).join('');
}

function selectSkin(id) {
  var s = SKINS.find(function(x){ return x.id === id; });
  if (!s) return;
  if (unlockedSkins.indexOf(id) < 0) {
    // TODO: ซื้อด้วยเงินในเกม (ระบบเพิ่มในอนาคต)
    showToast('ยังไม่ได้ปลดล็อค! ต้องซื้อด้วยเงินในเกม');
    return;
  }
  selectedSkin = id;
  save('skin', id);
  // อัป logo bird
  var lb = document.getElementById('logoBird');
  if (lb) { if (s.img) { lb.src = s.img; lb.style.display = 'block'; } }
  renderSkins();
  showToast('เลือกสกิน ' + s.name + ' แล้ว!');
}

/* ── Render Effects ── */
function renderEffects() {
  var el = document.getElementById('effectList');
  el.innerHTML = EFFECTS.map(function(e) {
    var unlocked = unlockedEffects.indexOf(e.id) >= 0;
    var sel      = selectedEffect === e.id;
    var badge = sel
      ? '<div class="effect-badge">✓ ใช้อยู่</div>'
      : !unlocked
        ? '<div class="effect-cost">💰 ' + e.cost + '</div>'
        : '';
    return '<div class="effect-card ' + (sel?'selected':'') + ' ' + (!unlocked?'locked':'') + '" onclick="selectEffect(\'' + e.id + '\')">' +
      '<div class="effect-icon">' + e.icon + '</div>' +
      '<div class="effect-info">' +
        '<div class="effect-name">' + e.name + '</div>' +
        '<div class="effect-desc">' + e.desc + '</div>' +
      '</div>' + badge + '</div>';
  }).join('');
}

function selectEffect(id) {
  var ef = EFFECTS.find(function(x){ return x.id === id; });
  if (!ef) return;
  if (unlockedEffects.indexOf(id) < 0) {
    showToast('ยังไม่ได้ปลดล็อค! ต้องซื้อด้วยเงินในเกม');
    return;
  }
  selectedEffect = id;
  save('effect', id);
  renderEffects();
  showToast('เลือกเอฟเฟกต์ ' + ef.name + ' แล้ว!');
}

/* ── Panel ── */
function openPanel(name) {
  document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('open');
}
function closePanel(name) {
  document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1)).classList.remove('open');
}

/* ── Go Play ── */
function goPlay() {
  save('skin', selectedSkin);
  save('effect', selectedEffect);
  sessionStorage.setItem('fromMenu','1');
  window.location.href = 'index.html';
}

/* ── Toast ── */
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = [
      'position:fixed','bottom:30px','left:50%','transform:translateX(-50%)',
      'background:rgba(30,41,59,.95)','color:#f1f5f9',
      'padding:10px 20px','border-radius:99px',
      'font-size:.8rem','font-weight:600',
      'z-index:9999','pointer-events:none',
      'border:1px solid rgba(255,255,255,.1)',
      'white-space:nowrap','max-width:90vw',
      'transition:opacity .3s'
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.style.opacity = '0'; }, 2000);
}

/* ── BG Canvas (flying kiwis) ── */
(function() {
  var canvas = document.getElementById('bgCanvas');
  var ctx    = canvas.getContext('2d');
  var birds  = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  for (var i = 0; i < 8; i++) {
    birds.push({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      speed: 0.4 + Math.random() * 0.6,
      size:  16 + Math.random() * 20,
      emoji: ['🥝','🐦','🦤'][Math.floor(Math.random()*3)],
      dir:   Math.random() > 0.5 ? 1 : -1,
      alpha: 0.08 + Math.random() * 0.12,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    birds.forEach(function(b) {
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.font = b.size + 'px serif';
      ctx.scale(b.dir, 1);
      ctx.fillText(b.emoji, b.dir > 0 ? b.x : -b.x, b.y);
      ctx.restore();
      b.x += b.speed * b.dir;
      if (b.x > canvas.width + 60)  b.x = -60;
      if (b.x < -60) b.x = canvas.width + 60;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── INIT ── */
renderSkins();
renderEffects();

// อัป logo ตาม skin ที่เลือก
var curSkin = SKINS.find(function(s){ return s.id === selectedSkin; });
if (curSkin && curSkin.img) {
  var lb = document.getElementById('logoBird');
  if (lb) lb.src = curSkin.img;
}
}

/* ── Render Effects ── */
function renderEffects() {
  var el = document.getElementById('effectList');
  el.innerHTML = EFFECTS.map(function(e) {
    var unlocked = unlockedEffects.indexOf(e.id) >= 0;
    var sel      = selectedEffect === e.id;
    var badge = sel
      ? '<div class="effect-badge">✓ ใช้อยู่</div>'
      : !unlocked
        ? '<div class="effect-cost">💰 ' + e.cost + '</div>'
        : '';
    return '<div class="effect-card ' + (sel?'selected':'') + ' ' + (!unlocked?'locked':'') + '" onclick="selectEffect(\'' + e.id + '\')">' +
      '<div class="effect-icon">' + e.icon + '</div>' +
      '<div class="effect-info">' +
        '<div class="effect-name">' + e.name + '</div>' +
        '<div class="effect-desc">' + e.desc + '</div>' +
      '</div>' + badge + '</div>';
  }).join('');
}

function selectEffect(id) {
  var ef = EFFECTS.find(function(x){ return x.id === id; });
  if (!ef) return;
  if (unlockedEffects.indexOf(id) < 0) {
    showToast('ยังไม่ได้ปลดล็อค! ต้องซื้อด้วยเงินในเกม');
    return;
  }
  selectedEffect = id;
  save('effect', id);
  renderEffects();
  showToast('เลือกเอฟเฟกต์ ' + ef.name + ' แล้ว!');
}

/* ── Panel ── */
function openPanel(name) {
  document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1)).classList.add('open');
}
function closePanel(name) {
  document.getElementById('panel' + name.charAt(0).toUpperCase() + name.slice(1)).classList.remove('open');
}

/* ── Go Play ── */
function goPlay() {
  save('skin', selectedSkin);
  save('effect', selectedEffect);
  window.location.href = 'index.html';
}

/* ── Toast ── */
function showToast(msg) {
  var t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.style.cssText = [
      'position:fixed','bottom:30px','left:50%','transform:translateX(-50%)',
      'background:rgba(30,41,59,.95)','color:#f1f5f9',
      'padding:10px 20px','border-radius:99px',
      'font-size:.8rem','font-weight:600',
      'z-index:9999','pointer-events:none',
      'border:1px solid rgba(255,255,255,.1)',
      'white-space:nowrap','max-width:90vw',
      'transition:opacity .3s'
    ].join(';');
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(function(){ t.style.opacity = '0'; }, 2000);
}

/* ── BG Canvas (flying kiwis) ── */
(function() {
  var canvas = document.getElementById('bgCanvas');
  var ctx    = canvas.getContext('2d');
  var birds  = [];

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  for (var i = 0; i < 8; i++) {
    birds.push({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      speed: 0.4 + Math.random() * 0.6,
      size:  16 + Math.random() * 20,
      emoji: ['🥝','🐦','🦤'][Math.floor(Math.random()*3)],
      dir:   Math.random() > 0.5 ? 1 : -1,
      alpha: 0.08 + Math.random() * 0.12,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    birds.forEach(function(b) {
      ctx.save();
      ctx.globalAlpha = b.alpha;
      ctx.font = b.size + 'px serif';
      ctx.scale(b.dir, 1);
      ctx.fillText(b.emoji, b.dir > 0 ? b.x : -b.x, b.y);
      ctx.restore();
      b.x += b.speed * b.dir;
      if (b.x > canvas.width + 60)  b.x = -60;
      if (b.x < -60) b.x = canvas.width + 60;
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ── INIT ── */
renderSkins();
renderEffects();

// อัป logo ตาม skin ที่เลือก
var curSkin = SKINS.find(function(s){ return s.id === selectedSkin; });
if (curSkin && curSkin.img) {
  var lb = document.getElementById('logoBird');
  if (lb) lb.src = curSkin.img;
}
