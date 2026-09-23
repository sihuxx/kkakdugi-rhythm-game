"use strict";
/* 모달 — 옷장·상점·뽑기·설정 — 꺅두기 하우스 */

/* ===============================================================
   모달 — 옷장 · 상점 · 뽑기 · 도감 · 설정 · 외출
   =============================================================== */
let modalOpen = null;
const CLOVER_SVG = '<svg class="cv" viewBox="0 0 20 20" aria-hidden="true">' +
  '<g fill="#7BC47F" stroke="#2B2B2B" stroke-width="1.6">' +
  '<circle cx="10" cy="5.6" r="3.5"/><circle cx="14.4" cy="10" r="3.5"/>' +
  '<circle cx="10" cy="14.4" r="3.5"/><circle cx="5.6" cy="10" r="3.5"/></g>' +
  '<path d="M10 11 L10 19" stroke="#7BC47F" stroke-width="1.8" fill="none"/></svg>';
const STARS = { base:1, N:1, R:2, SR:3, SSR:4 };
const starRow = rk => '<span class="stars">' + '★'.repeat(STARS[rk]) + '</span>';
let freshIds = new Set();

/* ===== 뽑기 로직 ===== */
const PULL1 = 110, PULL10 = 1000;
const REFUND = { N:30, R:60, SR:120 };
const RATE = [['N', 55], ['R', 32], ['SR', 13]];
const POOL = rk => CHARS.filter(c => c.rank === rk);
function rollRank(force){
  if(force) return force;
  let r = Math.random() * 100;
  for(const [rk, p] of RATE){ if(r < p) return rk; r -= p; }
  return 'N';
}
function pull(n){
  const cost = n === 10 ? PULL10 : PULL1;
  if(S.clover < cost) return null;
  addClover(-cost);
  const got = [];
  for(let i = 0; i < n; i++){
    const force = (n === 10 && i === 9 && !got.some(x => x.rank !== 'N')) ? 'R' : null;
    let rk = rollRank(force);
    S.pity = rk === 'SR' ? 0 : S.pity + 1;
    if(S.pity >= 60){ rk = 'SR'; S.pity = 0; }
    const pool = POOL(rk), c = pool[Math.floor(Math.random() * pool.length)];
    const isNew = !owns(c.id);
    if(isNew){ S.own.push(c.id); freshIds.add(c.id); }
    else addClover(REFUND[rk] || 30);
    got.push({ c, rank: rk, isNew, refund: isNew ? 0 : (REFUND[rk] || 30) });
  }
  checkRewards(); save(); refreshBar();
  return got;
}

/* ===== 카드 ===== */
function dexCard(c2, onPick){
  const has = owns(c2.id), isNew = freshIds.has(c2.id);
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'dcard r-' + c2.rank + (has ? '' : ' locked') + (c2.id === S.look ? ' sel' : '');
  b.innerHTML = starRow(c2.rank) +
    (isNew ? '<span class="newbadge">NEW</span>' : '') +
    '<span class="art"><img alt="" src="' + SRC[c2.run] + '"></span>' +
    '<span class="nm">' + (has ? c2.name : '???') + '</span>' +
    '<span class="meta">' + (has ? c2.meta : RARITY[c2.rank].name) + '</span>';
  b.onclick = () => { freshIds.delete(c2.id); (onPick || openLookDetail)(c2); };
  return b;
}
function buildDex(body, onPick){
  const bar = document.createElement('div'); bar.className = 'dexbar';
  const nx = nextReward(), pct = Math.round(S.own.length / CHARS.length * 100);
  bar.innerHTML = '<div class="track"><div class="fill" style="width:' + pct + '%"></div></div>' +
    '<div class="cap"><span><b>' + S.own.length + '</b> / ' + CHARS.length + ' 종</span>' +
    '<span>' + (nx ? '다음 보상 — ' + nx.n + '종에서 ' + nx.txt : '보상 전부 받음!') + '</span></div>';
  body.appendChild(bar);
  const wrap = document.createElement('div'); wrap.className = 'dex';
  ['base', 'SR', 'R', 'N', 'SSR'].forEach(rk => {
    const list = CHARS.filter(x => x.rank === rk), soon = COMING.filter(x => x.rank === rk);
    if(!list.length && !soon.length) return;
    const grp = document.createElement('div'); grp.className = 'rgroup';
    const have = list.filter(x => owns(x.id)).length;
    grp.innerHTML = '<div class="rlabel"><i style="background:' + RARITY[rk].color + '"></i>' +
      '<b>' + RARITY[rk].name + '</b> ' + starRow(rk) +
      '<span>' + (list.length ? have + '/' + list.length + ' · ' : '') + RARITY[rk].note + '</span></div>';
    const row = document.createElement('div'); row.className = 'dexrow';
    list.forEach(c2 => row.appendChild(dexCard(c2, onPick)));
    soon.forEach(s => {
      const d = document.createElement('div'); d.className = 'dcard r-' + rk + ' soon';
      d.innerHTML = starRow(rk) + '<span class="art"><b>3D</b></span>' +
        '<span class="nm">' + s.name + '</span><span class="meta">준비 중</span>';
      row.appendChild(d);
    });
    grp.appendChild(row); wrap.appendChild(grp);
  });
  body.appendChild(wrap);
}

/* ===== 모습 상세 ===== */
function openLookDetail(c2){
  modalOpen = 'wardrobe';
  const body = $('modalBody'); body.innerHTML = '';
  $('modalTitle').textContent = '두기 모습';
  $('modalHint').textContent = '';
  $('modalClose').hidden = true;
  const has = owns(c2.id), R = RARITY[c2.rank];
  const d = document.createElement('div'); d.className = 'detail';
  d.innerHTML =
    '<div class="art" style="background:' + R.color + '44"><i></i>' +
      '<img alt="" src="' + SRC[c2.run] + '"' + (has ? '' : ' style="filter:brightness(0);opacity:.2"') + '></div>' +
    '<div class="info">' +
      '<span class="rk" style="background:' + R.color + '">' + starRow(c2.rank) + ' ' + R.name + '</span>' +
      '<h3>' + (has ? c2.name : '??? 두기') + '</h3>' +
      '<p class="desc">' + (has ? c2.meta : '아직 만나지 못한 모습이에요.') + '</p>' +
      '<div class="facts">' +
        '<span>뽑기 확률 <b>' + (c2.p ? c2.p + '%' : '기본 보유') + '</b></span>' +
        '<span>런에서 <b>' + skillOf(c2).name + '</b></span>' +
        '<span>보유 <b>' + (has ? '가지고 있음' : '없음') + '</b></span>' +
      '</div><div class="row"></div></div>';
  body.appendChild(d);
  const row = d.querySelector('.row');
  if(has){
    const pick = document.createElement('button');
    pick.className = 'btn'; pick.type = 'button';
    pick.textContent = S.look === c2.id ? '지금 이 모습이에요' : '이 모습으로 갈아입기';
    pick.disabled = S.look === c2.id;
    pick.onclick = () => { S.look = c2.id; save(); refreshBar(); toast('갈아입었어요', c2.name); closeModal(); };
    row.appendChild(pick);
  }
  const back = document.createElement('button');
  back.className = 'btn ghost small'; back.type = 'button'; back.textContent = '옷장으로';
  back.onclick = () => openModal('wardrobe');
  row.appendChild(back);
}

/* ===== 상점 (가구) ===== */
function buildShop(body){
  const top = document.createElement('div'); top.className = 'gtop';
  top.innerHTML = CLOVER_SVG + '<b>' + S.clover.toLocaleString('ko-KR') + '</b>' +
    '<span>가구를 사면 집이 예뻐지고 돌봄 효과도 올라가요</span>';
  body.appendChild(top);
  const grid = document.createElement('div'); grid.className = 'shopgrid'; body.appendChild(grid);
  FURNITURE.filter(f => !f.base).forEach(f => {
    const has = hasFurn(f.id);
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'shopcard' + (has ? ' own' : '') + (S.clover < f.price && !has ? ' poor' : '');
    b.innerHTML = '<span class="pic"><canvas width="96" height="96"></canvas></span>' +
      '<span class="nm">' + f.name + '</span>' +
      '<span class="meta">' + f.desc + '</span>' +
      '<span class="price">' + (has ? '가지고 있음' : CLOVER_SVG + f.price) + '</span>';
    grid.appendChild(b);
    drawFurnIcon(b.querySelector('canvas'), f.id);
    b.onclick = () => {
      if(has){ toast('이미 집에 있어요', f.name); return; }
      if(S.clover < f.price){ sfxNo(); toast('클로버가 모자라요', '미니게임으로 벌어보세요'); return; }
      addClover(-f.price); S.furn.push(f.id); save(); refreshBar(); sfxCoin(3);
      toast(f.name + ' 구입!', '집에 놓았어요');
      openModal('shop');
    };
  });
}
/* 작은 캔버스에 가구 하나 그리기 (상점 카드용) */
function drawFurnIcon(cvs, id){
  const c = cvs.getContext('2d'), sw = cvs.width, sh = cvs.height;
  const og = g, oW = W, oH = H;
  g = c; W = sw; H = sh;                       // 그리기 도구를 잠깐 빌려 쓴다
  c.clearRect(0, 0, sw, sh);
  try{ drawFurn(id, sw / 2, sh * 0.95, sh * 0.25, false); }catch(e){}
  g = og; W = oW; H = oH;
}

/* ===== 외출 ===== */
function buildOut(body){
  const info = document.createElement('p'); info.className = 'outinfo';
  info.innerHTML = '컨디션 <b>' + Math.round(condition() * 100) + '%</b> · 보상 배율 <b>x' +
                   payMult().toFixed(2) + '</b><br><small>스탯이 높을수록 더 많이 받아요. ' +
                   '다녀오면 배고프고 지저분해집니다.</small>';
  body.appendChild(info);
  const row = document.createElement('div'); row.className = 'outrow'; body.appendChild(row);
  GAMES.forEach(gm => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'outcard o-' + gm.id;
    b.innerHTML = '<span class="ic">' + (gm.id === 'rhythm' ? '♪' : '🏃') + '</span>' +
      '<span class="nm">' + gm.name + '</span><span class="meta">' + gm.meta + '</span>' +
      '<span class="pay">' + gm.pay + '</span>';
    b.onclick = () => { if(gm.id === 'rhythm') openModal('song'); else startRun(); };
    row.appendChild(b);
  });
}

/* ===== 모달 열기 ===== */
function openModal(kind){
  modalOpen = kind;
  const body = $('modalBody'); body.innerHTML = '';
  const sheet = modal.querySelector('.sheet');
  sheet.className = 'sheet' + (['wardrobe', 'gacha', 'shop', 'song'].includes(kind) ? ' wide' : '');
  $('modalClose').textContent = '확인'; $('modalClose').hidden = false;

  if(kind === 'wardrobe'){
    $('modalTitle').textContent = '옷장 · 두기 도감';
    $('modalHint').textContent = '모습을 누르면 자세히 볼 수 있어요';
    buildDex(body);
  } else if(kind === 'shop'){
    $('modalTitle').textContent = '가구 상점';
    $('modalHint').textContent = '';
    buildShop(body);
  } else if(kind === 'gacha'){
    $('modalTitle').textContent = '클로버 뽑기';
    $('modalHint').textContent = '';
    buildGacha(body);
  } else if(kind === 'out'){
    $('modalTitle').textContent = '외출하기';
    $('modalHint').textContent = '미니게임을 하면 클로버와 경험치를 벌어와요';
    buildOut(body);
  } else if(kind === 'song'){
    $('modalTitle').textContent = '노래 고르기';
    $('modalHint').textContent = '곡을 누르면 앞부분이 들려요 · 난이도를 눌러 고르세요';
    $('modalClose').textContent = '닫기';
    buildSongList(body);
  } else if(kind === 'settings'){
    $('modalTitle').textContent = '설정';
    $('modalHint').textContent = '';
    buildSettings(body);
  }
  modal.hidden = false;
  sheet.scrollTop = 0; sheet.setAttribute('tabindex', '-1'); sheet.focus({ preventScroll:true });
}
function closeModal(){ modalOpen = null; modal.hidden = true; refreshBar(); }

/* ===== 노래 목록 ===== */
function buildSongList(body){
  const list = document.createElement('div'); list.className = 'songlist'; body.appendChild(list);
  const rows = [];
  const paint = () => rows.forEach(({ el, s }) => {
    el.classList.toggle('on', s === song);
    el.querySelectorAll('.lv').forEach(b =>
      b.setAttribute('aria-pressed', s === song && b.dataset.d === diff.id));
    const bs = S.best[bestKey(s, diff)];
    el.querySelector('.sbest').textContent = bs ? '최고 ' + bs.toLocaleString('ko-KR') : '기록 없음';
  });
  SONGS.forEach(s => {
    const el = document.createElement('div'); el.className = 'songrow';
    const levels = DIFFS.map(d => {
      const n = buildChart(s, d.id).length;
      return '<button class="lv d-' + d.id + '" data-d="' + d.id + '" type="button">' +
             '<b>' + d.name + '</b><span>Lv ' + Math.max(1, Math.round(n / s.end * 6)) + '</span></button>';
    }).join('');
    el.innerHTML = '<span class="cover">' + COVERS[s.id] + '</span>' +
      '<span class="sinfo"><span class="stitle">' + s.title + '</span>' +
      '<span class="smeta">' + s.mood + ' · ' + s.bpm + ' BPM · ' + Math.round(s.end) + '초</span>' +
      '<span class="sbest"></span></span>' +
      '<span class="levels">' + levels + '</span>';
    el.querySelector('.cover').onclick = () => { song = s; paint(); preview(s); };
    el.querySelector('.sinfo').onclick = () => { song = s; paint(); preview(s); };
    el.querySelectorAll('.lv').forEach(b => b.onclick = () => {
      song = s; diff = DIFFS.find(d => d.id === b.dataset.d); paint(); preview(s); });
    list.appendChild(el); rows.push({ el, s });
  });
  paint();
  const bar = document.createElement('div'); bar.className = 'row'; bar.style.marginTop = '4px';
  const go = document.createElement('button');
  go.className = 'btn'; go.id = 'goBtn'; go.type = 'button'; go.textContent = '이 곡으로 출발!';
  go.onclick = () => { closeModal(); startGame(); };
  const back = document.createElement('button');
  back.className = 'btn ghost small'; back.type = 'button'; back.textContent = '닫기';
  back.onclick = closeModal;
  bar.appendChild(go); bar.appendChild(back); body.appendChild(bar);
  $('modalClose').hidden = true;
}

/* ===== 설정 ===== */
let keyWait = -1;
const KEY_LABEL = { ArrowLeft:'←', ArrowRight:'→', ArrowUp:'↑', ArrowDown:'↓', Space:'공백',
                    Semicolon:';', Quote:"'", Comma:',', Period:'.', Slash:'/' };
function keyLabel(code){
  if(KEY_LABEL[code]) return KEY_LABEL[code];
  if(code.startsWith('Key')) return code.slice(3);
  if(code.startsWith('Digit')) return code.slice(5);
  return code;
}
function buildSettings(body){
  const wrap = document.createElement('div'); wrap.className = 'setlist'; body.appendChild(wrap);
  const group = title => {
    const d = document.createElement('div'); d.className = 'setgroup';
    d.innerHTML = '<h5>' + title + '</h5>'; wrap.appendChild(d); return d;
  };
  const row = (parent, title, val, inner, hint) => {
    const d = document.createElement('div'); d.className = 'setrow';
    d.innerHTML = '<div class="lbl"><b>' + title + '</b><span>' + val + '</span></div>' + inner +
                  (hint ? '<div class="hint">' + hint + '</div>' : '');
    parent.appendChild(d); return d;
  };
  const slider = (parent, title, val, attrs, onInput, hint) => {
    const d = row(parent, title, val, '<input type="range" ' + attrs + '>', hint);
    d.querySelector('input').oninput = e => {
      d.querySelector('.lbl span').textContent = onInput(+e.target.value);
    };
    return d;
  };

  const g0 = group('두기');
  const nm = row(g0, '이름', S.dugi.name,
    '<input class="nameinput" type="text" maxlength="6" value="' + S.dugi.name.replace(/"/g, '') + '">');
  nm.querySelector('input').onchange = e => {
    const v = (e.target.value || '').trim().slice(0, 6) || '두기';
    S.dugi.name = v; save(); refreshBar(); nm.querySelector('.lbl span').textContent = v;
  };

  const g1 = group('리듬게임 조작');
  const kr = row(g1, '키 바꾸기', '누르고 새 키를 눌러요',
    '<div class="keyrow">' + settings.keys.map((k, i2) =>
      '<button class="keybtn" data-i="' + i2 + '" type="button">' + keyLabel(k) +
      '<small>' + (i2 + 1) + '번째</small></button>').join('') + '</div>');
  kr.querySelectorAll('.keybtn').forEach(btn => {
    btn.onclick = () => { kr.querySelectorAll('.keybtn').forEach(b => b.classList.remove('wait'));
                          btn.classList.add('wait'); btn.textContent = '...'; keyWait = +btn.dataset.i; };
  });
  slider(g1, '노트 속도', 'x' + settings.speed.toFixed(1),
    'min="0.6" max="2" step="0.1" value="' + settings.speed + '"',
    v => { settings.speed = v; save(); return 'x' + v.toFixed(1); },
    '올릴수록 노트가 짧게 보여서 타이밍이 또렷해져요.');
  slider(g1, '싱크 보정', settings.offset + ' ms',
    'min="-150" max="150" step="5" value="' + settings.offset + '"',
    v => { settings.offset = v; save(); return v + ' ms'; },
    '노트가 소리보다 빠르면 −쪽, 늦으면 +쪽.');

  const g2 = group('소리');
  [['volMusic', '노래'], ['volBgm', '배경음'], ['volSfx', '효과음']].forEach(([k, label]) => {
    slider(g2, label, Math.round(settings[k] * 100) + '%',
      'min="0" max="100" step="5" value="' + Math.round(settings[k] * 100) + '"',
      v => { settings[k] = v / 100; applyVolumes(); save(); if(k === 'volSfx') uiClick(); return v + '%'; });
  });

  const g3 = group('꾸미기');
  const need = { basic:0, strawberry:9, mint:13 };
  const sk = row(g3, '노트 색', '도감을 모으면 늘어나요',
    '<div class="skinrow">' + Object.entries(SKINS).map(([id, s]) => {
      const has = S.skins.includes(id);
      return '<button class="skinbtn" data-s="' + id + '" type="button"' + (has ? '' : ' disabled') +
        ' aria-pressed="' + (settings.skin === id) + '"><span class="nm">' + s.name + '</span>' +
        '<span class="swatch">' + s.col.map(c2 => '<i style="background:' + c2 + '"></i>').join('') + '</span>' +
        '<small>' + (has ? '보유' : '도감 ' + need[id] + '종') + '</small></button>';
    }).join('') + '</div>');
  sk.querySelectorAll('.skinbtn').forEach(btn => {
    if(btn.disabled) return;
    btn.onclick = () => { settings.skin = btn.dataset.s; applySkin(); save(); openModal('settings'); };
  });

  const rs = document.createElement('button');
  rs.className = 'btn ghost small'; rs.type = 'button'; rs.textContent = '기본값으로';
  rs.onclick = () => { settings.keys = [...DEFAULT_KEYS]; settings.speed = 1; settings.offset = 0;
    settings.volMusic = 0.8; settings.volBgm = 0.6; settings.volSfx = 0.9; settings.skin = 'basic';
    applySkin(); applyVolumes(); save(); openModal('settings'); };
  wrap.appendChild(rs);
}

/* ===== 뽑기 화면 ===== */
let lastPull = null;
const RANKSOUND = {
  N: () => arp([680], 0, 0.10),
  R: () => arp([740, 988], 0.09, 0.12),
  SR: () => { arp([660, 880, 1175, 1568], 0.075, 0.15, 'square'); shimmer(); }
};
function buildGacha(body){
  const wrap = document.createElement('div'); wrap.className = 'gacha';
  wrap.innerHTML =
    '<div class="gtop">' + CLOVER_SVG + '<b id="gWallet">' + S.clover.toLocaleString('ko-KR') + '</b>' +
      '<span>흔함 55% · 귀함 32% · 아주 귀함 13%</span></div>' +
    '<div class="gstage" id="gStage"><p class="gidle">클로버를 넣고 새 모습을 만나보세요<br>' +
      '<small>10연차에는 귀함 이상이 하나 확정 · 겹치면 클로버로 돌려받아요</small></p></div>' +
    '<div class="gbtns">' +
      '<button class="btn small" id="g1">1회 · ' + PULL1 + '</button>' +
      '<button class="btn" id="g10">10연차 · ' + PULL10 + '</button>' +
    '</div>';
  body.appendChild(wrap);
  const run = n => {
    initAudio(); if(ctx.state === 'suspended') ctx.resume();
    const got = pull(n);
    if(!got){
      const st = $('gStage'); st.classList.remove('hasbanner');
      st.innerHTML = '<p class="gidle">클로버가 모자라요<br><small>외출해서 미니게임을 하면 쌓입니다</small></p>';
      sfxNo(); return;
    }
    playCutscene(got);
  };
  $('g1').onclick = () => run(1);
  $('g10').onclick = () => run(10);
  if(lastPull) renderPullResult(lastPull);
}
function decorate(el, rank){
  if(rank === 'N') return;
  const ring = document.createElement('span');
  ring.className = 'ring'; ring.style.setProperty('--rc', rank === 'SR' ? '#FF9EB5' : '#A9D9F0');
  el.appendChild(ring);
  if(rank === 'SR'){
    for(let k = 0; k < 9; k++){
      const s = document.createElement('span'); s.className = 'spark';
      const a = k / 9 * 6.283, d = 42 + Math.random() * 34;
      s.style.setProperty('--dx', (Math.cos(a) * d).toFixed(1) + 'px');
      s.style.setProperty('--dy', (Math.sin(a) * d).toFixed(1) + 'px');
      s.style.animationDelay = (Math.random() * 0.12) + 's';
      el.appendChild(s);
    }
  }
}
function renderPullResult(got){
  const st = $('gStage'); if(!st) return;
  const top = got.some(r => r.rank === 'SR') ? 'SR' : got.some(r => r.rank === 'R') ? 'R' : 'N';
  st.innerHTML = ''; st.classList.toggle('hasbanner', top === 'SR');
  if(top === 'SR'){
    const bn = document.createElement('div'); bn.className = 'banner'; bn.textContent = '아주 귀함 등장!';
    st.appendChild(bn);
  }
  const grid = document.createElement('div'); grid.className = 'gresult'; st.appendChild(grid);
  const step = got.length > 1 ? 95 : 0;
  got.forEach((r, i) => {
    const el = document.createElement('div');
    el.className = 'gcard r-' + r.rank + (r.rank === 'SR' ? ' shine' : '');
    el.style.animationDelay = (i * step / 1000) + 's';
    el.innerHTML = starRow(r.rank) +
      (r.isNew ? '<span class="newbadge">NEW</span>' : '') +
      '<span class="art"><img alt="" src="' + SRC[r.c.run] + '"></span>' +
      '<span class="nm">' + r.c.name + '</span>' +
      (r.isNew ? '<span class="meta">처음 만남!</span>'
               : '<span class="meta dup">겹침 +' + r.refund + '</span>');
    grid.appendChild(el);
    setTimeout(() => { decorate(el, r.rank); if(r.rank !== 'N') RANKSOUND[r.rank](); }, i * step + 60);
  });
}
function playCutscene(got){
  lastPull = got;
  const top = got.some(r => r.rank === 'SR') ? 'SR' : got.some(r => r.rank === 'R') ? 'R' : 'N';
  modal.hidden = true; modalOpen = null;
  $('topbar').hidden = true; bgmStop();
  $('skipBtn').hidden = false; $('tapHint').hidden = false;
  mode = 'cut';
  startCut(top, got, () => {
    $('skipBtn').hidden = true; $('tapHint').hidden = true;
    mode = 'home'; $('topbar').hidden = false; refreshBar(); bgmStart();
    openModal('gacha');
  });
}
