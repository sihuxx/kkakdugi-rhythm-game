"use strict";
/* 집 — 두기와 가구 — 꺅두기 하우스 */

/* ===============================================================
   집 — 두기가 사는 방. 돌봄은 아래 버튼, 방은 꾸미는 곳
   =============================================================== */

/* 방의 크기 — 집 단계가 오르면 넓어진다 */
const roomW   = () => W * HOUSE().wide;
const roomL   = () => (W - roomW()) / 2;
const roomR   = () => roomL() + roomW();
const rx      = t => roomL() + roomW() * t;          // 0~1 → 방 안 x
const wallBot = () => H * HOUSE().tall;
const walkTop = () => wallBot() + (H - wallBot()) * 0.30;
const walkBot = () => H - (H - wallBot()) * 0.10;
const depthAt = y => 0.74 + 0.36 * ((y - walkTop()) / (walkBot() - walkTop()));
const rowY    = r => (r ? 0.16 : 0.52);              // 1 = 벽쪽(뒤), 0 = 가운데
const yAt     = t => walkTop() + t * (walkBot() - walkTop());

const home = {
  x: 0.34, y: 0.82, vx: 0, vy: 0, face: 1, t: 0,
  near: null, target: null, autoAct: null,
  care: null, bubble: '', bubbleT: 0,
  parts: [], dusts: []
};
const keys = {};

function seedDust(){
  home.dusts = [];
  const n = S.dugi.clean < 25 ? 4 : S.dugi.clean < 45 ? 3 : S.dugi.clean < 65 ? 1 : 0;
  for(let i = 0; i < n; i++)
    home.dusts.push({ x: 0.12 + (i * 0.23 + 0.09) % 0.76, y: 0.62 + ((i * 0.41) % 0.35),
                      seed: Math.random() * 6 });
}
seedDust();

/* ===== 가구 자리 배치 =====
   가진 가구를 뒤/앞 두 줄에 고르게 놓는다. 집이 넓어지면 간격도 넓어진다. */
function layoutHome(){
  const back = [], front = [], wall = [];
  for(const id of S.furn){
    const f = FURN(id);
    if(!f) continue;
    if(f.on === 'wall') wall.push(id);
    else if(f.on === 'floor') (f.row ? back : front).push(id);
  }
  back.unshift('wardrobe'); back.push('gacha');
  const spread = (list, y) => list.map((id, i) => ({
    id, y, x: list.length === 1 ? 0.5 : 0.08 + (0.84 * i) / (list.length - 1)
  }));
  const wallY = 0;
  return {
    floor: spread(back, rowY(1)).concat(spread(front, rowY(0))),
    wall: wall.map((id, i) => ({ id, x: wall.length === 1 ? 0.5
                                     : 0.12 + (0.76 * i) / (wall.length - 1), y: wallY }))
  };
}
let LAY = layoutHome();
function relayout(){ LAY = layoutHome(); }

/* 방 안에서 다가갈 수 있는 것들 */
function homeSpots(){
  const list = [];
  for(const o of LAY.floor){
    const f = FURN(o.id);
    if(f && f.act) list.push({ id:f.id, name:f.name, x:o.x, act:f.act, tip:CARE[f.act].tip });
    if(o.id === 'wardrobe') list.push({ id:'wardrobe', name:'옷장', x:o.x, act:'wardrobe' });
    if(o.id === 'gacha')    list.push({ id:'gacha',    name:'뽑기 기계', x:o.x, act:'gacha' });
  }
  list.push({ id:'door', name:'현관', x:0.5, act:'job' });
  return list;
}

/* ===== 돌봄 ===== */
function canCare(kind){
  const c = CARE[kind];
  if(!c) return { no:'?' };
  if(c.cost > S.clover) return { no:'클로버가 ' + c.cost + '개 필요해요' };
  if(kind === 'feed'  && S.dugi.full   >= 98) return { no:'배가 아주 불러요' };
  if(kind === 'sleep' && S.dugi.energy >= 98) return { no:'지금은 안 졸려요' };
  if(kind === 'wash'  && S.dugi.clean  >= 98) return { no:'이미 뽀송뽀송해요' };
  if(kind === 'clean' && S.dugi.clean  >= 98) return { no:'방이 아주 깨끗해요' };
  if(kind === 'play'  && S.dugi.energy <= 8)  return { no:'기운이 없어요. 재워주세요' };
  return true;
}
function doCare(kind){
  const ok = canCare(kind);
  if(ok !== true){ toast(ok.no, ''); sfxNo(); return false; }
  const c = CARE[kind];
  if(c.cost) addClover(-c.cost);
  for(const k in c.add){
    let v = c.add[k];
    if(kind === 'feed'  && k === 'full')   v += boost('full');
    if(kind === 'sleep' && k === 'energy') v += boost('energy');
    if((kind === 'play' || kind === 'water') && k === 'fun') v += boost('fun');
    addStat(k, v);
  }
  addExp(c.exp); addLove(c.love || 2);
  clearRequest(kind);
  home.care = { kind, t:0 };
  home.bubble = c.verb; home.bubbleT = 1.7;
  if(kind === 'clean' || kind === 'wash') seedDust();
  careEffect(kind);
  sfxCare(kind);
  save(); refreshBar(); paintCareBar();
  return true;
}
function careEffect(kind){
  const x = rx(home.x), y = yAt(home.y);
  const col = { feed:'#F5B971', water:'#A9D9F0', sleep:'#B9A7D9',
                play:'#FFB3C1', wash:'#A9D9F0', clean:'#D9C4A0' }[kind] || '#7BC47F';
  const shape = { feed:'dot', water:'drop', sleep:'z', play:'heart', wash:'bub', clean:'dot' }[kind];
  for(let i = 0; i < 14; i++)
    home.parts.push({ x: x + (Math.random() - 0.5) * 80, y: y - 40 - Math.random() * 40,
                      vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 70,
                      life: 1.1 + Math.random() * 0.6, t:0, c:col, s:shape });
}

/* ===== 진행 ===== */
function updateHome(dt){
  home.t += dt;
  if(home.bubbleT > 0) home.bubbleT -= dt;
  if(grewUp > 0) grewUp -= dt;

  if(home.care){
    home.care.t += dt;
    if(home.care.t > (home.care.kind === 'sleep' ? 2.2 : 1.3)) home.care = null;
  }else{
    let ax = 0, ay = 0;
    if(keys.a) ax -= 1; if(keys.d) ax += 1;
    if(keys.w) ay -= 1; if(keys.s) ay += 1;
    if((ax || ay) && home.target) home.target = null;
    if(home.target){
      const dx = home.target.x - home.x, dy = home.target.y - home.y;
      if(Math.hypot(dx * 2, dy) < 0.025){
        home.target = null;
        if(home.autoAct){ const sp = home.autoAct; home.autoAct = null; act(sp); }
      }else{ ax = Math.sign(dx) * Math.min(1, Math.abs(dx) * 14);
             ay = Math.sign(dy) * Math.min(1, Math.abs(dy) * 8); }
    }
    const sp = 0.6;
    home.vx += (ax * sp - home.vx) * Math.min(1, dt * 12);
    home.vy += (ay * sp * 0.5 - home.vy) * Math.min(1, dt * 12);
    home.x = Math.max(0.03, Math.min(0.97, home.x + home.vx * dt));
    home.y = Math.max(0.34, Math.min(1.0, home.y + home.vy * dt));
    if(Math.abs(home.vx) > 0.02) home.face = home.vx > 0 ? 1 : -1;
  }

  let near = null, bd = 0.06;
  for(const s of homeSpots()){
    const d = Math.abs(s.x - home.x);
    if(d < bd){ bd = d; near = s; }
  }
  home.near = near;

  for(let i = home.parts.length - 1; i >= 0; i--){
    const p = home.parts[i]; p.t += dt;
    if(p.t >= p.life){ home.parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 26 * dt;
  }
}
function act(spot){
  if(!spot) return;
  if(spot.act === 'wardrobe') return openModal('wardrobe');
  if(spot.act === 'gacha')    return openModal('gacha');
  if(spot.act === 'job')      return openModal('job');
  doCare(spot.act);
}

/* ===============================================================
   방 그리기
   =============================================================== */
function ink(w){ g.strokeStyle = '#2B2B2B'; g.lineWidth = w || LW(); g.lineJoin = 'round'; g.lineCap = 'round'; }
function rrect(x, y, w, h, r){
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function box(x, y, w, h, r, fill){ g.fillStyle = fill; rrect(x, y, w, h, r); g.fill(); g.stroke(); }
function shadow(cx, base, w){
  g.save(); g.globalAlpha = 0.13; g.fillStyle = '#2B2B2B';
  g.beginPath(); g.ellipse(cx, base + 1, w, w * 0.22, 0, 0, 7); g.fill(); g.restore();
}

function drawRoom(){
  const HS = HOUSE(), wb = wallBot(), L = roomL(), R = roomR();
  /* 방 바깥 (좁은 집일수록 많이 보인다) */
  g.fillStyle = '#C9BFAC'; g.fillRect(0, 0, W, H);
  /* 벽 */
  const wg = g.createLinearGradient(0, 0, 0, wb);
  wg.addColorStop(0, HS.wall); wg.addColorStop(1, HS.wall2);
  g.fillStyle = wg; g.fillRect(L, 0, R - L, wb);
  /* 벽지 무늬 — 단계마다 다르게 */
  g.save(); g.beginPath(); g.rect(L, 0, R - L, wb); g.clip();
  if(S.house === 0){
    g.strokeStyle = 'rgba(150,125,90,.28)'; g.lineWidth = LW() * 0.5;
    for(let x = L; x < R; x += roomW() * 0.06){        // 세로 줄무늬
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, wb); g.stroke();
    }
    /* 들뜬 벽지와 금 */
    g.fillStyle = 'rgba(120,100,70,.18)';
    g.beginPath(); g.moveTo(L + roomW() * 0.62, 0);
    g.lineTo(L + roomW() * 0.70, wb * 0.34); g.lineTo(L + roomW() * 0.60, wb * 0.30);
    g.closePath(); g.fill();
    ink(LW() * 0.6); g.strokeStyle = 'rgba(80,66,48,.45)';
    g.beginPath(); g.moveTo(L + roomW() * 0.24, 0);
    g.lineTo(L + roomW() * 0.27, wb * 0.20); g.lineTo(L + roomW() * 0.22, wb * 0.34);
    g.lineTo(L + roomW() * 0.26, wb * 0.46); g.stroke();
  }else{
    g.fillStyle = 'rgba(217,196,160,.4)';
    const gapx = roomW() * 0.075, gapy = wb * 0.17;
    for(let x = L + gapx * 0.5; x < R; x += gapx)
      for(let y = wb * 0.12; y < wb - 6; y += gapy){
        const o = (Math.round(y / gapy) % 2) * gapx * 0.5;
        g.beginPath(); g.arc(x + o, y, Math.max(1.8, 2.6 * uiK() * 0.7), 0, 7); g.fill();
        if(S.house === 2){
          g.beginPath(); g.arc(x + o, y - gapy * 0.35, Math.max(1.2, 1.6 * uiK() * 0.7), 0, 7); g.fill();
        }
      }
  }
  g.restore();

  /* 바닥 */
  const fg = g.createLinearGradient(0, wb, 0, H);
  fg.addColorStop(0, HS.floor); fg.addColorStop(1, HS.floor2);
  g.fillStyle = fg; g.fillRect(L, wb, R - L, H - wb);
  /* 마루 결 */
  g.save(); g.beginPath(); g.rect(L, wb, R - L, H - wb); g.clip();
  g.strokeStyle = 'rgba(120,95,60,.22)'; g.lineWidth = LW() * 0.5;
  for(let i = 1; i < 6; i++){
    const y = wb + (H - wb) * (i / 6);
    g.beginPath(); g.moveTo(L, y); g.lineTo(R, y); g.stroke();
  }
  for(let i = 0; i <= 12; i++){
    const t = i / 12, x0 = rx(t), x1 = rx(0.5 + (t - 0.5) * 1.45);
    g.beginPath(); g.moveTo(x0, wb); g.lineTo(x1, H); g.stroke();
  }
  if(S.house === 0){                                   // 삐걱이는 자국
    g.strokeStyle = 'rgba(90,70,45,.3)';
    for(let i = 0; i < 5; i++){
      const y = wb + (H - wb) * (0.2 + i * 0.16);
      g.beginPath(); g.moveTo(rx(0.1 + i * 0.16), y); g.lineTo(rx(0.2 + i * 0.16), y + 2); g.stroke();
    }
  }
  g.restore();

  /* 벽 아래 그늘 */
  const sh = g.createLinearGradient(0, wb - (H - wb) * 0.3, 0, wb);
  sh.addColorStop(0, 'rgba(120,100,70,0)'); sh.addColorStop(1, 'rgba(120,100,70,.16)');
  g.fillStyle = sh; g.fillRect(L, wb - (H - wb) * 0.3, R - L, (H - wb) * 0.3);

  /* 걸레받이 · 몰딩 */
  const tw = (H - wb) * 0.09;
  g.fillStyle = HS.trim; g.fillRect(L, wb - tw, R - L, tw);
  ink(); g.beginPath(); g.moveTo(L, wb - tw); g.lineTo(R, wb - tw);
  g.moveTo(L, wb); g.lineTo(R, wb); g.stroke();
  if(S.house === 2){
    g.fillStyle = HS.trim; g.fillRect(L, H * 0.045, R - L, H * 0.02);
    g.beginPath(); g.moveTo(L, H * 0.065); g.lineTo(R, H * 0.065); g.stroke();
  }
  /* 방 테두리 (벽 옆면) */
  ink(); g.beginPath(); g.moveTo(L, 0); g.lineTo(L, H); g.moveTo(R, 0); g.lineTo(R, H); g.stroke();
  if(HS.wide < 1){
    g.save(); g.globalAlpha = .35; g.fillStyle = '#8C8172';
    g.fillRect(0, 0, L, H); g.fillRect(R, 0, W - R, H); g.restore();
  }

  /* 조명 · 창문 */
  const s = Math.min(roomW() * 0.105, wb * 0.34);
  if(S.house === 0){
    drawBulb(rx(0.24), 0, wb * 0.26);
    drawWindow(rx(0.72), wb * 0.45, s * 0.72, true);
  }else{
    drawWindow(rx(S.house === 2 ? 0.24 : 0.74), wb * 0.48, s, false);
    if(S.house === 2){
      drawWindow(rx(0.76), wb * 0.48, s, false);
      drawLamp(rx(0.82), 0, wb * 0.18);
    }
  }
}
function drawBulb(cx, top, len){
  ink(); g.beginPath(); g.moveTo(cx, top); g.lineTo(cx, top + len); g.stroke();
  const r = len * 0.22;
  g.save(); g.globalAlpha = .35; g.fillStyle = '#FFE08A';
  g.beginPath(); g.arc(cx, top + len + r, r * 2.6, 0, 7); g.fill(); g.restore();
  box(cx - r, top + len, r * 2, r * 2.1, r, '#FFE9A8');
}
function drawLamp(cx, top, len){
  ink(); g.beginPath(); g.moveTo(cx, top); g.lineTo(cx, top + len); g.stroke();
  const w = len * 1.1;
  g.save(); g.globalAlpha = .3; g.fillStyle = '#FFE08A';
  g.beginPath(); g.moveTo(cx - w, top + len * 3.2); g.lineTo(cx + w, top + len * 3.2);
  g.lineTo(cx + w * 0.42, top + len); g.lineTo(cx - w * 0.42, top + len); g.closePath(); g.fill(); g.restore();
  g.fillStyle = '#F2E8D9';
  g.beginPath(); g.moveTo(cx - w * 0.62, top + len + w * 0.42); g.lineTo(cx + w * 0.62, top + len + w * 0.42);
  g.lineTo(cx + w * 0.34, top + len); g.lineTo(cx - w * 0.34, top + len); g.closePath();
  g.fill(); ink(); g.stroke();
}
function drawWindow(cx, cy, s, old){
  g.save();
  box(cx - s * 0.95, cy - s * 0.75, s * 1.9, s * 1.5, s * 0.14, old ? '#BFD9E4' : '#CDEBFA');
  g.save(); rrect(cx - s * 0.95, cy - s * 0.75, s * 1.9, s * 1.5, s * 0.14); g.clip();
  g.fillStyle = '#FFFFFF'; g.globalAlpha = .75;
  g.beginPath(); g.arc(cx - s * 0.32, cy - s * 0.2, s * 0.3, 0, 7);
  g.arc(cx + s * 0.02, cy - s * 0.3, s * 0.22, 0, 7); g.fill();
  g.globalAlpha = .5; g.fillStyle = '#8CCB86';
  g.beginPath(); g.ellipse(cx + s * 0.5, cy + s * 0.62, s * 0.5, s * 0.22, 0, 0, 7); g.fill();
  g.restore();
  ink();
  g.beginPath(); g.moveTo(cx, cy - s * 0.75); g.lineTo(cx, cy + s * 0.75);
  g.moveTo(cx - s * 0.95, cy); g.lineTo(cx + s * 0.95, cy); g.stroke();
  if(!old){                                            // 커튼
    g.fillStyle = '#FFB3C1';
    [-1, 1].forEach(d => {
      g.beginPath();
      g.moveTo(cx + d * s * 0.95, cy - s * 0.9);
      g.quadraticCurveTo(cx + d * s * 0.72, cy - s * 0.1, cx + d * s * 0.95, cy + s * 0.75);
      g.lineTo(cx + d * s * 1.18, cy + s * 0.75); g.lineTo(cx + d * s * 1.18, cy - s * 0.9);
      g.closePath(); g.fill(); g.stroke();
    });
    g.fillStyle = '#E39FB2';
    g.fillRect(cx - s * 1.2, cy - s * 0.95, s * 2.4, s * 0.1);
    g.strokeRect(cx - s * 1.2, cy - s * 0.95, s * 2.4, s * 0.1);
  }
  g.restore();
}

/* ===== 가구 한 점 ===== */
function drawFurn(id, cx, base, s, glow){
  g.save();
  if(glow){
    g.save(); g.globalAlpha = 0.3 + Math.sin(home.t * 5) * 0.18;
    g.fillStyle = '#FFE08A';
    g.beginPath(); g.ellipse(cx, base - s * 0.4, s * 1.0, s * 0.8, 0, 0, 7); g.fill(); g.restore();
  }
  ink();
  switch(id){
    case 'bowl': {
      shadow(cx, base, s * 0.5);
      g.fillStyle = '#E4C48E'; g.beginPath();
      g.moveTo(cx - s * 0.46, base - s * 0.32); g.lineTo(cx + s * 0.46, base - s * 0.32);
      g.quadraticCurveTo(cx + s * 0.3, base, cx, base);
      g.quadraticCurveTo(cx - s * 0.3, base, cx - s * 0.46, base - s * 0.32);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#C88B5A';
      g.beginPath(); g.ellipse(cx, base - s * 0.32, s * 0.46, s * 0.13, 0, 0, 7); g.fill(); g.stroke();
      if(S.dugi.full < 70){
        g.fillStyle = '#F5B971';
        g.beginPath(); g.ellipse(cx, base - s * 0.35, s * 0.3, s * 0.1, 0, 0, 7); g.fill(); g.stroke();
      }
      g.fillStyle = '#FFFDF6'; g.globalAlpha = .6;
      g.beginPath(); g.ellipse(cx - s * 0.2, base - s * 0.22, s * 0.08, s * 0.04, -0.4, 0, 7); g.fill();
      break;
    }
    case 'plant': {
      shadow(cx, base, s * 0.36);
      g.fillStyle = '#8CCB86';
      const leaf = (dx, dy, r, rot) => { g.beginPath();
        g.ellipse(cx + dx * s, base - s * 0.42 + dy * s, r * s, r * s * 0.6, rot, 0, 7);
        g.fill(); g.stroke(); };
      ink(); g.beginPath(); g.moveTo(cx, base - s * 0.42); g.lineTo(cx, base - s * 0.95); g.stroke();
      leaf(-0.3, -0.42, 0.3, -0.5); leaf(0.3, -0.5, 0.3, 0.5); leaf(0, -0.68, 0.26, 0);
      g.fillStyle = '#D98E6A'; g.beginPath();
      g.moveTo(cx - s * 0.33, base - s * 0.44); g.lineTo(cx + s * 0.33, base - s * 0.44);
      g.lineTo(cx + s * 0.24, base); g.lineTo(cx - s * 0.24, base); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#C67A58';
      g.fillRect(cx - s * 0.33, base - s * 0.44, s * 0.66, s * 0.1);
      g.strokeRect(cx - s * 0.33, base - s * 0.44, s * 0.66, s * 0.1);
      break;
    }
    case 'bed': {
      shadow(cx, base, s * 0.95);
      box(cx - s * 0.92, base - s * 0.52, s * 1.84, s * 0.52, s * 0.1, '#C9A06A');   // 프레임
      box(cx - s * 0.88, base - s * 0.74, s * 1.2, s * 0.3, s * 0.12, '#FFFDF6');    // 베개
      g.fillStyle = '#B9A7D9';
      rrect(cx - s * 0.2, base - s * 0.72, s * 1.1, s * 0.34, s * 0.12); g.fill(); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.35)';
      rrect(cx - s * 0.2, base - s * 0.72, s * 1.1, s * 0.12, s * 0.08); g.fill();
      box(cx + s * 0.78, base - s * 0.9, s * 0.14, s * 0.9, s * 0.06, '#C9A06A');    // 머리판
      break;
    }
    case 'ball': {
      shadow(cx, base, s * 0.3);
      const bob = Math.abs(Math.sin(home.t * 1.4)) * s * 0.06;
      g.fillStyle = '#FFB3C1';
      g.beginPath(); g.arc(cx, base - s * 0.28 - bob, s * 0.28, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = '#E39FB2';
      g.beginPath(); g.arc(cx, base - s * 0.28 - bob, s * 0.28, 2.4, 3.9); g.stroke();
      g.beginPath(); g.arc(cx, base - s * 0.28 - bob, s * 0.28, -0.7, 0.8); g.stroke(); ink();
      g.fillStyle = '#FFFDF6'; g.globalAlpha = .7;
      g.beginPath(); g.arc(cx - s * 0.1, base - s * 0.38 - bob, s * 0.06, 0, 7); g.fill();
      break;
    }
    case 'tub': {
      shadow(cx, base, s * 0.55);
      g.fillStyle = '#A9D9F0'; g.beginPath();
      g.moveTo(cx - s * 0.5, base - s * 0.4); g.lineTo(cx + s * 0.5, base - s * 0.4);
      g.quadraticCurveTo(cx + s * 0.36, base, cx, base);
      g.quadraticCurveTo(cx - s * 0.36, base, cx - s * 0.5, base - s * 0.4);
      g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#7FC4E4';
      g.beginPath(); g.ellipse(cx, base - s * 0.4, s * 0.5, s * 0.13, 0, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#FFFFFF';
      [[-0.18, -0.48, 0.1], [0.08, -0.55, 0.075], [0.24, -0.46, 0.055]].forEach(([dx, dy, r]) => {
        g.beginPath(); g.arc(cx + dx * s, base + dy * s, r * s, 0, 7); g.fill(); g.stroke(); });
      break;
    }
    case 'rug': {
      g.fillStyle = '#F6C8D4';
      g.beginPath(); g.ellipse(cx, base, s * 1.35, s * 0.4, 0, 0, 7); g.fill(); g.stroke();
      g.strokeStyle = '#E39FB2';
      g.beginPath(); g.ellipse(cx, base, s * 0.95, s * 0.28, 0, 0, 7); g.stroke();
      g.beginPath(); g.ellipse(cx, base, s * 0.55, s * 0.16, 0, 0, 7); g.stroke(); ink();
      break;
    }
    case 'lamp': {
      shadow(cx, base, s * 0.3);
      g.fillStyle = '#D9C4A0';
      g.beginPath(); g.moveTo(cx - s * 0.2, base); g.lineTo(cx + s * 0.2, base);
      g.lineTo(cx + s * 0.05, base - s * 0.8); g.lineTo(cx - s * 0.05, base - s * 0.8);
      g.closePath(); g.fill(); g.stroke();
      g.save(); g.globalAlpha = .3; g.fillStyle = '#FFE08A';
      g.beginPath(); g.arc(cx, base - s * 1.0, s * 0.8, 0, 7); g.fill(); g.restore();
      g.fillStyle = '#FFE9A8';
      g.beginPath(); g.moveTo(cx - s * 0.44, base - s * 0.8); g.lineTo(cx + s * 0.44, base - s * 0.8);
      g.lineTo(cx + s * 0.28, base - s * 1.2); g.lineTo(cx - s * 0.28, base - s * 1.2);
      g.closePath(); g.fill(); g.stroke();
      break;
    }
    case 'shelf': {
      shadow(cx, base, s * 0.55);
      box(cx - s * 0.5, base - s * 1.1, s, s * 1.1, s * 0.07, '#C9A06A');
      g.strokeStyle = '#2B2B2B';
      [0.74, 0.39].forEach(t => { g.beginPath();
        g.moveTo(cx - s * 0.5, base - s * t); g.lineTo(cx + s * 0.5, base - s * t); g.stroke(); });
      [['#FFB3C1', 0], ['#A9D9F0', 1], ['#8CCB86', 2]].forEach(([c, i]) => {
        g.fillStyle = c; const bx = cx - s * 0.42 + i * s * 0.17;
        g.fillRect(bx, base - s * 0.72, s * 0.12, s * 0.3);
        g.strokeRect(bx, base - s * 0.72, s * 0.12, s * 0.3); });
      g.fillStyle = '#B9A7D9';
      g.fillRect(cx - s * 0.1, base - s * 0.37, s * 0.4, s * 0.3);
      g.strokeRect(cx - s * 0.1, base - s * 0.37, s * 0.4, s * 0.3);
      break;
    }
    case 'table': {
      shadow(cx, base, s * 0.6);
      box(cx - s * 0.6, base - s * 0.46, s * 1.2, s * 0.14, s * 0.06, '#D9B884');
      [-0.48, 0.48].forEach(d => { g.fillStyle = '#C9A06A';
        g.fillRect(cx + d * s - s * 0.05, base - s * 0.34, s * 0.1, s * 0.34);
        g.strokeRect(cx + d * s - s * 0.05, base - s * 0.34, s * 0.1, s * 0.34); });
      g.fillStyle = '#FFFDF6';                                   // 찻잔
      g.beginPath(); g.ellipse(cx + s * 0.2, base - s * 0.52, s * 0.11, s * 0.09, 0, 0, 7);
      g.fill(); g.stroke();
      break;
    }
    case 'tv': {
      shadow(cx, base, s * 0.62);
      box(cx - s * 0.32, base - s * 0.14, s * 0.64, s * 0.14, s * 0.04, '#B99A6E');
      box(cx - s * 0.66, base - s * 0.9, s * 1.32, s * 0.78, s * 0.09, '#6E6A61');
      box(cx - s * 0.56, base - s * 0.82, s * 1.12, s * 0.6, s * 0.05, '#A9D9F0');
      g.save(); rrect(cx - s * 0.56, base - s * 0.82, s * 1.12, s * 0.6, s * 0.05); g.clip();
      g.fillStyle = 'rgba(255,255,255,.5)';
      g.beginPath(); g.moveTo(cx - s * 0.5, base - s * 0.22); g.lineTo(cx - s * 0.1, base - s * 0.86);
      g.lineTo(cx + s * 0.06, base - s * 0.86); g.lineTo(cx - s * 0.34, base - s * 0.22);
      g.closePath(); g.fill(); g.restore();
      break;
    }
    case 'fridge': {
      shadow(cx, base, s * 0.5);
      box(cx - s * 0.44, base - s * 1.3, s * 0.88, s * 1.3, s * 0.1, '#FFFDF6');
      g.beginPath(); g.moveTo(cx - s * 0.44, base - s * 0.85); g.lineTo(cx + s * 0.44, base - s * 0.85); g.stroke();
      g.fillStyle = '#D9C4A0';
      g.fillRect(cx + s * 0.26, base - s * 0.78, s * 0.07, s * 0.2);
      g.strokeRect(cx + s * 0.26, base - s * 0.78, s * 0.07, s * 0.2);
      g.fillRect(cx + s * 0.26, base - s * 1.16, s * 0.07, s * 0.2);
      g.strokeRect(cx + s * 0.26, base - s * 1.16, s * 0.07, s * 0.2);
      g.fillStyle = '#FFB3C1';                                   // 자석
      g.beginPath(); g.arc(cx - s * 0.2, base - s * 1.1, s * 0.06, 0, 7); g.fill(); g.stroke();
      break;
    }
    case 'cake': {
      shadow(cx, base, s * 0.42);
      box(cx - s * 0.4, base - s * 0.5, s * 0.8, s * 0.5, s * 0.07, '#F7EEDC');
      g.fillStyle = '#FFB3C1';
      rrect(cx - s * 0.4, base - s * 0.62, s * 0.8, s * 0.18, s * 0.07); g.fill(); g.stroke();
      [-0.22, 0, 0.22].forEach(d => {
        g.fillStyle = '#FFFDF6';
        g.fillRect(cx + d * s - s * 0.02, base - s * 0.8, s * 0.04, s * 0.18);
        g.strokeRect(cx + d * s - s * 0.02, base - s * 0.8, s * 0.04, s * 0.18);
        g.fillStyle = '#FFE08A';
        g.beginPath(); g.ellipse(cx + d * s, base - s * 0.85, s * 0.05, s * 0.08, 0, 0, 7);
        g.fill(); g.stroke(); });
      break;
    }
    case 'piano': {
      shadow(cx, base, s * 0.6);
      box(cx - s * 0.56, base - s * 0.5, s * 1.12, s * 0.5, s * 0.07, '#B9A7D9');
      g.fillStyle = '#FFFDF6';
      g.fillRect(cx - s * 0.5, base - s * 0.52, s, s * 0.16);
      g.strokeRect(cx - s * 0.5, base - s * 0.52, s, s * 0.16);
      g.strokeStyle = '#2B2B2B';
      for(let i = 1; i < 7; i++){ const x = cx - s * 0.5 + s * (i / 7);
        g.beginPath(); g.moveTo(x, base - s * 0.52); g.lineTo(x, base - s * 0.36); g.stroke(); }
      break;
    }
    case 'sofa': {
      shadow(cx, base, s * 0.95);
      box(cx - s * 0.9, base - s * 0.62, s * 1.8, s * 0.46, s * 0.14, '#9DC9E8');
      box(cx - s * 0.98, base - s * 0.72, s * 0.3, s * 0.56, s * 0.12, '#8BBBDC');
      box(cx + s * 0.68, base - s * 0.72, s * 0.3, s * 0.56, s * 0.12, '#8BBBDC');
      box(cx - s * 0.66, base - s * 0.9, s * 1.32, s * 0.34, s * 0.12, '#B4D8F0');
      g.fillStyle = '#FFB3C1';                                    // 쿠션
      rrect(cx + s * 0.12, base - s * 0.86, s * 0.34, s * 0.3, s * 0.08); g.fill(); g.stroke();
      break;
    }
    /* 벽 */
    case 'frame': {
      box(cx - s * 0.44, base - s * 0.64, s * 0.88, s * 0.64, s * 0.05, '#C9A06A');
      box(cx - s * 0.34, base - s * 0.55, s * 0.68, s * 0.46, s * 0.03, '#FFFDF6');
      g.fillStyle = '#8CCB86';
      g.beginPath(); g.moveTo(cx - s * 0.26, base - s * 0.14); g.lineTo(cx - s * 0.04, base - s * 0.42);
      g.lineTo(cx + s * 0.14, base - s * 0.14); g.closePath(); g.fill(); g.stroke();
      g.fillStyle = '#FFE08A';
      g.beginPath(); g.arc(cx + s * 0.18, base - s * 0.44, s * 0.07, 0, 7); g.fill(); g.stroke();
      break;
    }
    case 'clock': {
      g.fillStyle = '#FFFDF6';
      g.beginPath(); g.arc(cx, base - s * 0.36, s * 0.36, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#2B2B2B';
      for(let i = 0; i < 12; i++){ const a = i / 12 * 6.283;
        g.beginPath(); g.arc(cx + Math.cos(a) * s * 0.28, base - s * 0.36 + Math.sin(a) * s * 0.28,
                             s * 0.018, 0, 7); g.fill(); }
      const a = home.t * 0.5;
      ink(LW() * 0.8);
      g.beginPath(); g.moveTo(cx, base - s * 0.36);
      g.lineTo(cx + Math.cos(a) * s * 0.17, base - s * 0.36 + Math.sin(a) * s * 0.17);
      g.moveTo(cx, base - s * 0.36);
      g.lineTo(cx + Math.cos(a * 6) * s * 0.25, base - s * 0.36 + Math.sin(a * 6) * s * 0.25);
      g.stroke(); ink();
      break;
    }
    case 'garland': {
      const w = s * 1.9;
      g.beginPath(); g.moveTo(cx - w / 2, base - s * 0.5);
      g.quadraticCurveTo(cx, base - s * 0.16, cx + w / 2, base - s * 0.5); g.stroke();
      ['#FFB3C1', '#A9D9F0', '#8CCB86', '#FFE08A', '#B9A7D9'].forEach((c, i) => {
        const t = (i + 0.5) / 5, x = cx - w / 2 + w * t;
        const y = base - s * 0.5 + Math.sin(t * Math.PI) * s * 0.34;
        g.fillStyle = c; g.beginPath(); g.moveTo(x - s * 0.11, y); g.lineTo(x + s * 0.11, y);
        g.lineTo(x, y + s * 0.28); g.closePath(); g.fill(); g.stroke(); });
      break;
    }
    case 'poster': {
      box(cx - s * 0.4, base - s * 0.7, s * 0.8, s * 0.7, s * 0.04, '#FFF3D6');
      g.fillStyle = '#FFB3C1';
      g.beginPath(); g.arc(cx, base - s * 0.45, s * 0.18, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#6E6A61';
      g.fillRect(cx - s * 0.26, base - s * 0.2, s * 0.52, s * 0.05);
      g.fillRect(cx - s * 0.18, base - s * 0.12, s * 0.36, s * 0.04);
      break;
    }
    case 'window2': {
      drawWindow(cx, base - s * 0.5, s * 0.55, false);
      break;
    }
    /* 방 자체 */
    case 'wardrobe': {
      shadow(cx, base, s * 0.55);
      box(cx - s * 0.52, base - s * 1.4, s * 1.04, s * 1.4, s * 0.09, '#C9A06A');
      g.beginPath(); g.moveTo(cx, base - s * 1.34); g.lineTo(cx, base - s * 0.06); g.stroke();
      g.fillStyle = '#B98F58';
      g.fillRect(cx - s * 0.46, base - s * 1.34, s * 0.92, s * 0.1);
      g.strokeRect(cx - s * 0.46, base - s * 1.34, s * 0.92, s * 0.1);
      g.fillStyle = '#F2E8D9';
      [-0.11, 0.11].forEach(d => { g.beginPath();
        g.arc(cx + d * s, base - s * 0.7, s * 0.055, 0, 7); g.fill(); g.stroke(); });
      break;
    }
    case 'door': {
      box(cx - s * 0.58, base - s * 1.6, s * 1.16, s * 1.6, s * 0.09, '#D98E6A');
      box(cx - s * 0.44, base - s * 1.46, s * 0.88, s * 0.52, s * 0.06, '#C87A58');
      box(cx - s * 0.44, base - s * 0.86, s * 0.88, s * 0.7, s * 0.06, '#C87A58');
      g.fillStyle = '#FFE08A';
      g.beginPath(); g.arc(cx + s * 0.36, base - s * 0.8, s * 0.08, 0, 7); g.fill(); g.stroke();
      g.fillStyle = '#F2E8D9';                                    // 문패
      rrect(cx - s * 0.3, base - s * 1.78, s * 0.6, s * 0.2, s * 0.06); g.fill(); g.stroke();
      break;
    }
    case 'gacha': {
      shadow(cx, base, s * 0.5);
      box(cx - s * 0.46, base - s * 1.34, s * 0.92, s * 1.34, s * 0.11, '#FFB3C1');
      g.fillStyle = '#FFFDF6';
      g.beginPath(); g.arc(cx, base - s * 0.95, s * 0.33, 0, 7); g.fill(); g.stroke();
      ['#8CCB86', '#A9D9F0', '#FFE08A', '#B9A7D9'].forEach((c, i) => {
        g.fillStyle = c;
        g.beginPath(); g.arc(cx - s * 0.15 + (i % 2) * s * 0.3,
                             base - s * 1.04 + Math.floor(i / 2) * s * 0.18, s * 0.08, 0, 7);
        g.fill(); g.stroke(); });
      g.fillStyle = '#F2E8D9';
      rrect(cx - s * 0.2, base - s * 0.5, s * 0.4, s * 0.24, s * 0.05); g.fill(); g.stroke();
      g.fillStyle = '#E39FB2';
      g.beginPath(); g.arc(cx, base - s * 0.62, s * 0.07, 0, 7); g.fill(); g.stroke();
      break;
    }
  }
  g.restore();
}

/* 먼지 — 방이 더러울 때만 보인다 (치우는 건 아래 버튼) */
function drawDust(d){
  const cx = rx(d.x), cy = yAt(d.y), s = 24 * uiK() * depthAt(cy);
  g.save(); ink(LW() * 0.8); g.fillStyle = '#CFC3AA';
  g.beginPath();
  for(let k = 0; k < 7; k++){
    const a = k / 7 * 6.283;
    const r = s * (0.42 + 0.2 * Math.sin(k * 2.1 + d.seed));
    g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.5);
  }
  g.closePath(); g.fill(); g.stroke();
  g.restore();
}

/* ===== 두기 ===== */
function drawDugi(){
  const st = STAGES[stageOf(S.dugi.exp)], c = look();
  const cx = rx(home.x), cy = yAt(home.y), dep = depthAt(cy);
  const baseH = Math.min(H * 0.30, roomW() * 0.30) * st.scale * (c.scale || 1) * dep;
  const moving = Math.abs(home.vx) > 0.03 || Math.abs(home.vy) > 0.03;
  let bob = moving ? Math.abs(Math.sin(home.t * 9)) * baseH * 0.07 : Math.sin(home.t * 2) * baseH * 0.014;
  let rot = moving ? Math.sin(home.t * 9) * 0.07 : Math.sin(home.t * 2) * 0.02;
  let sy = 1;

  const care = home.care;
  if(care){
    const p = care.t;
    if(care.kind === 'sleep'){ rot = -1.35; bob = 0; sy = 0.92; }
    else if(care.kind === 'play'){ bob = Math.abs(Math.sin(p * 11)) * baseH * 0.3; rot = Math.sin(p * 11) * 0.2; }
    else if(care.kind === 'feed'){ sy = 1 + Math.sin(p * 16) * 0.06; rot = 0.05; }
    else if(care.kind === 'wash'){ rot = Math.sin(p * 18) * 0.16; }
    else { bob = Math.abs(Math.sin(p * 8)) * baseH * 0.08; }
  }
  if(grewUp > 0){ const k = Math.max(0, grewUp / 2.6); sy = 1 + Math.sin(grewUp * 14) * 0.12 * k; }

  shadow(cx, cy, baseH * 0.32);
  const im = IMG[c.run];
  g.save();
  g.translate(cx, cy - bob - (c.float || 0) * 0.3 * dep);
  g.rotate(rot); g.scale((c.flip === false ? 1 : -1) * home.face, sy);
  if(im && im.complete && im.naturalWidth) g.drawImage(im, -baseH * 0.5, -baseH, baseH, baseH);
  g.restore();

  /* 잘 때 이불 어둠 */
  if(care && care.kind === 'sleep'){
    g.save(); g.globalAlpha = 0.18 * Math.min(1, care.t * 2); g.fillStyle = '#2B2B2B';
    g.fillRect(0, 0, W, H); g.restore();
  }

  const topY = cy - baseH - 12 * uiK();
  if(home.bubbleT > 0) speech(cx, topY, home.bubble);
  else if(S.req && CARE[S.req.kind]) speech(cx, topY, REQ_LINE[S.req.kind], true);
  else {
    const low = STATS.find(s => S.dugi[s.id] < 30);
    if(low) moodIcon(cx, topY, low.id);
  }
}
function speech(tx, ty, text, want){
  g.save();
  g.font = '700 ' + (20 * uiK()) + 'px Gaegu, sans-serif';
  const w = g.measureText(text).width + 30 * uiK(), h = 34 * uiK();
  const x = Math.max(6, Math.min(W - w - 6, tx - w / 2));
  const y = ty - h + (want ? Math.sin(home.t * 3) * 2 * uiK() : 0);
  g.fillStyle = want ? '#FFF3D6' : '#FFFDF6'; ink();
  rrect(x, y, w, h, 13 * uiK()); g.fill(); g.stroke();
  g.fillStyle = want ? '#FFF3D6' : '#FFFDF6';
  g.beginPath(); g.moveTo(tx - 7 * uiK(), y + h - 1); g.lineTo(tx, y + h + 9 * uiK());
  g.lineTo(tx + 7 * uiK(), y + h - 1); g.closePath(); g.fill();
  g.beginPath(); g.moveTo(tx - 7 * uiK(), y + h - 1); g.lineTo(tx, y + h + 9 * uiK());
  g.lineTo(tx + 7 * uiK(), y + h - 1); g.stroke();
  g.fillStyle = '#2B2B2B'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, x + w / 2, y + h / 2 + 1);
  g.restore();
}
function moodIcon(cx, ty, stat){
  const s = 15 * uiK(), col = (STATS.find(x => x.id === stat) || {}).color || '#C9A9A9';
  g.save(); g.translate(cx, ty - s * 0.6 + Math.sin(home.t * 3) * 2);
  g.fillStyle = col; ink();
  g.beginPath(); g.arc(0, 0, s, 0, 7); g.fill(); g.stroke();
  g.fillStyle = '#2B2B2B'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '700 ' + (s * 1.3) + 'px Gaegu, sans-serif';
  g.fillText('!', 0, 1);
  g.restore();
}

function drawHomeParts(){
  for(const p of home.parts){
    const k = 1 - p.t / p.life, s = 9 * uiK();
    g.save(); g.globalAlpha = Math.max(0, k); g.fillStyle = p.c; ink(LW() * 0.7);
    if(p.s === 'heart'){
      g.beginPath(); g.moveTo(p.x, p.y + s * 0.5);
      g.bezierCurveTo(p.x - s, p.y - s * 0.3, p.x - s * 0.4, p.y - s, p.x, p.y - s * 0.35);
      g.bezierCurveTo(p.x + s * 0.4, p.y - s, p.x + s, p.y - s * 0.3, p.x, p.y + s * 0.5);
      g.fill(); g.stroke();
    }else if(p.s === 'drop'){
      g.beginPath(); g.moveTo(p.x, p.y - s);
      g.quadraticCurveTo(p.x + s * 0.7, p.y + s * 0.2, p.x, p.y + s * 0.6);
      g.quadraticCurveTo(p.x - s * 0.7, p.y + s * 0.2, p.x, p.y - s);
      g.fill(); g.stroke();
    }else if(p.s === 'z'){
      g.fillStyle = '#B9A7D9'; g.font = '700 ' + (s * 2.2) + 'px Gaegu, sans-serif';
      g.textAlign = 'center'; g.fillText('z', p.x, p.y);
    }else if(p.s === 'bub'){
      g.beginPath(); g.arc(p.x, p.y, s * 0.7, 0, 7); g.stroke();
    }else{
      g.beginPath(); g.arc(p.x, p.y, s * 0.55, 0, 7); g.fill(); g.stroke();
    }
    g.restore();
  }
}

/* 다가갔을 때 뜨는 안내 */
function drawPrompt(){
  const n = home.near;
  if(!n || home.care) return;
  const k = uiK();
  const label = n.act === 'wardrobe' ? '옷장 열기'
              : n.act === 'gacha' ? '뽑기'
              : n.act === 'job' ? '알바하러 가기'
              : CARE[n.act].name;
  g.save();
  g.font = '700 ' + (19 * k) + 'px Gaegu, sans-serif';
  const w = g.measureText('E  ' + label).width + 30 * k, h = 30 * k;
  const x = Math.max(6 * k, Math.min(W - w - 6 * k, rx(n.x) - w / 2));
  const y = wallBot() + 8 * k + Math.sin(home.t * 4) * 2.5 * k;
  g.fillStyle = '#2B2B2B'; g.globalAlpha = .92;
  rrect(x, y, w, h, h / 2); g.fill();
  g.globalAlpha = 1; g.fillStyle = '#FFFDF6'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = '700 ' + (15 * k) + 'px Gaegu, sans-serif';
  g.fillText('E', x + 12 * k, y + h / 2 + 1);
  g.font = '700 ' + (19 * k) + 'px Gaegu, sans-serif';
  g.fillText(label, x + 28 * k, y + h / 2 + 1);
  g.restore();
}

function drawHome(dt){
  drawRoom();
  const wb = wallBot();
  const fs = Math.min(roomW() * 0.115, (H - wb) * 0.46);      // 가구 기준 크기
  const near = id => home.near && home.near.id === id;

  /* 벽 */
  for(const o of LAY.wall) drawFurn(o.id, rx(o.x), wb - (H - wb) * 0.34, fs * 0.9, near(o.id));
  drawFurn('door', rx(0.5), wb + (H - wb) * 0.02, fs * 1.05, near('door'));

  /* 러그 */
  if(hasFurn('rug')) drawFurn('rug', rx(0.5), yAt(0.42), fs, false);

  /* 바닥 — 뒤쪽 줄 먼저 */
  const floor = LAY.floor.filter(o => o.id !== 'rug').slice().sort((a, b) => a.y - b.y);
  const dugiY = home.y;
  let drewDugi = false;
  for(const o of floor){
    if(!drewDugi && o.y > dugiY){ drawDugi(); drewDugi = true; }
    const by = yAt(o.y);
    drawFurn(o.id, rx(o.x), by, fs * depthAt(by), near(o.id));
  }
  home.dusts.forEach(drawDust);
  if(!drewDugi) drawDugi();
  drawHomeParts();
  drawPrompt();
}
