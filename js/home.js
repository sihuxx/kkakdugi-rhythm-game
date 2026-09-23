"use strict";
/* 집 — 두기와 가구 — 꺅두기 하우스 */

/* ===============================================================
   집 — 두기가 사는 방. 걸어다니고, 가구에 다가가 돌봄을 한다
   =============================================================== */

/* 방 좌표 */
const wallBot = () => H * 0.52;              // 벽과 바닥의 경계
const walkTop = () => H * 0.60;              // 두기가 걸을 수 있는 위쪽
const walkBot = () => H * 0.90;
const depthAt = y => 0.78 + 0.34 * ((y - walkTop()) / (walkBot() - walkTop()));

const home = {
  x: 0.5, y: 0.78, vx: 0, vy: 0, face: 1, t: 0,
  near: null, target: null, autoAct: null,
  care: null, careT: 0, bubble: '', bubbleT: 0,
  parts: [], dusts: []
};
const keys = {};

function seedDust(){
  home.dusts = [];
  for(let i = 0; i < (S.dust || 0); i++)
    home.dusts.push({ x: 0.2 + (i * 0.27 + 0.13) % 0.62, y: 0.66 + ((i * 0.37) % 0.2), seed: Math.random() * 6 });
}
seedDust();

/* 지금 집에 있는 상호작용 지점들 */
function homeSpots(){
  const list = [];
  for(const id of S.furn){
    const f = FURN(id);
    if(f && f.act) list.push({ id: f.id, name: f.name, x: f.x, act: f.act, tip: CARE[f.act].tip });
  }
  home.dusts.forEach((d, i) => list.push({ id: 'dust' + i, name: '먼지', x: d.x, act: 'clean',
                                            tip: CARE.clean.tip, dust: i }));
  PLACES.forEach(p => list.push(p));
  return list;
}

/* ===== 행동 ===== */
function canCare(kind){
  const c = CARE[kind];
  if(!c) return false;
  if(c.cost > S.clover) return { no: '클로버가 ' + c.cost + '개 필요해요' };
  if(kind === 'feed' && S.dugi.full >= 98) return { no: '배가 아주 불러요' };
  if(kind === 'sleep' && S.dugi.energy >= 98) return { no: '지금은 안 졸려요' };
  if(kind === 'wash' && S.dugi.clean >= 98) return { no: '이미 뽀송뽀송해요' };
  if(kind === 'play' && S.dugi.energy <= 8) return { no: '기운이 없어요. 재워주세요' };
  return true;
}
function doCare(kind, spot){
  const ok = canCare(kind);
  if(ok !== true){ toast(ok.no, ''); sfxNo(); return; }
  const c = CARE[kind];
  if(c.cost) addClover(-c.cost);
  for(const k in c.add){
    let v = c.add[k];
    if(kind === 'feed' && k === 'full') v += boost('full');
    if(kind === 'sleep' && k === 'energy') v += boost('energy');
    if((kind === 'play' || kind === 'water') && k === 'fun') v += boost('fun');
    addStat(k, v);
  }
  addExp(c.exp);
  home.care = { kind, spot, t: 0 };
  home.bubble = c.verb; home.bubbleT = 1.6;
  if(kind === 'clean' && spot && spot.dust !== undefined){
    home.dusts.splice(spot.dust, 1); S.dust = home.dusts.length;
  }
  careEffect(kind);
  sfxCare(kind);
  save(); refreshBar();
}
function careEffect(kind){
  const x = home.x * W, y = walkTop() + (home.y - 0.6) / 0.3 * (walkBot() - walkTop());
  const col = { feed:'#F5B971', water:'#A9D9F0', sleep:'#B9A7D9',
                play:'#FFB3C1', wash:'#A9D9F0', clean:'#D9C4A0' }[kind] || '#7BC47F';
  const shape = { feed:'dot', water:'drop', sleep:'z', play:'heart', wash:'bub', clean:'dot' }[kind];
  for(let i = 0; i < 14; i++)
    home.parts.push({ x: x + (Math.random() - 0.5) * 80, y: y - 40 - Math.random() * 40,
                      vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 70,
                      life: 1.1 + Math.random() * 0.6, t: 0, c: col, s: shape });
}

/* ===== 진행 ===== */
function updateHome(dt){
  home.t += dt;
  if(home.bubbleT > 0) home.bubbleT -= dt;
  if(grewUp > 0) grewUp -= dt;

  /* 돌봄 연출 중에는 못 움직임 */
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
      if(Math.hypot(dx * 2, dy) < 0.02){
        home.target = null;
        if(home.autoAct){ const sp = home.autoAct; home.autoAct = null; act(sp); }
      }else{ ax = Math.sign(dx) * Math.min(1, Math.abs(dx) * 14); ay = Math.sign(dy) * Math.min(1, Math.abs(dy) * 8); }
    }
    const sp = 0.62;
    home.vx += (ax * sp - home.vx) * Math.min(1, dt * 12);
    home.vy += (ay * sp * 0.42 - home.vy) * Math.min(1, dt * 12);
    home.x = Math.max(0.02, Math.min(0.98, home.x + home.vx * dt));
    home.y = Math.max(0.60, Math.min(0.90, home.y + home.vy * dt));
    if(Math.abs(home.vx) > 0.02) home.face = home.vx > 0 ? 1 : -1;
  }

  /* 가까운 것 찾기 */
  let near = null, bd = 0.062;
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
  if(spot.act === 'out')      return openModal('out');
  doCare(spot.act, spot);
}

/* ===============================================================
   그리기
   =============================================================== */
function drawRoom(dt){
  const wb = wallBot();
  /* 벽 */
  const wg = g.createLinearGradient(0, 0, 0, wb);
  wg.addColorStop(0, '#FDF4E3'); wg.addColorStop(1, '#F7EBD6');
  g.fillStyle = wg; g.fillRect(0, 0, W, wb);
  /* 벽지 무늬 */
  g.fillStyle = 'rgba(217,196,160,.45)';
  for(let x = W * 0.03; x < W; x += W * 0.062)
    for(let y = H * 0.06; y < wb - 6; y += H * 0.085){
      const o = (Math.round(y / (H * 0.085)) % 2) * W * 0.031;
      g.beginPath(); g.arc(x + o, y, Math.max(1.6, 2.4 * uiK() * 0.7), 0, 7); g.fill();
    }
  /* 바닥 */
  const fg = g.createLinearGradient(0, wb, 0, H);
  fg.addColorStop(0, '#E8D6B4'); fg.addColorStop(1, '#DCC49B');
  g.fillStyle = fg; g.fillRect(0, wb, W, H - wb);
  /* 걸레받이 */
  g.fillStyle = '#F2E8D9'; g.fillRect(0, wb - H * 0.022, W, H * 0.022);
  ink(); g.beginPath(); g.moveTo(0, wb - H * 0.022); g.lineTo(W, wb - H * 0.022);
  g.moveTo(0, wb); g.lineTo(W, wb); g.stroke();
  /* 마룻바닥 결 */
  g.strokeStyle = 'rgba(160,130,90,.30)'; g.lineWidth = LW() * 0.55;
  for(let i = 1; i < 7; i++){
    const y = wb + (H - wb) * (i / 7);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  for(let i = 0; i <= 10; i++){
    const t = i / 10, x0 = W * t, x1 = W * (0.5 + (t - 0.5) * 1.5);
    g.beginPath(); g.moveTo(x0, wb); g.lineTo(x1, H); g.stroke();
  }
  /* 창문 */
  drawWindow(W * 0.16, wb * 0.52, Math.min(W * 0.14, H * 0.2));
}

function drawWindow(cx, cy, s){
  g.save();
  g.fillStyle = '#CDEBFA'; ink();
  rrect(cx - s * 0.9, cy - s * 0.7, s * 1.8, s * 1.4, s * 0.16); g.fill(); g.stroke();
  g.fillStyle = '#FFFFFF'; g.globalAlpha = .7;
  g.beginPath(); g.arc(cx - s * 0.35, cy - s * 0.18, s * 0.28, 0, 7);
  g.arc(cx - s * 0.05, cy - s * 0.26, s * 0.2, 0, 7); g.fill();
  g.globalAlpha = 1;
  g.beginPath(); g.moveTo(cx, cy - s * 0.7); g.lineTo(cx, cy + s * 0.7);
  g.moveTo(cx - s * 0.9, cy); g.lineTo(cx + s * 0.9, cy); g.stroke();
  g.restore();
}

/* 가구 한 점 */
function drawFurn(id, cx, base, s, glow){
  g.save();
  if(glow){
    g.save(); g.globalAlpha = 0.35 + Math.sin(home.t * 5) * 0.2;
    g.fillStyle = '#FFE08A';
    g.beginPath(); g.ellipse(cx, base - s * 0.35, s * 0.95, s * 0.75, 0, 0, 7); g.fill(); g.restore();
  }
  ink();
  const F = (c) => { g.fillStyle = c; };
  switch(id){
    case 'bowl': {
      F('#E4C48E'); g.beginPath();
      g.moveTo(cx - s * 0.45, base - s * 0.34); g.lineTo(cx + s * 0.45, base - s * 0.34);
      g.quadraticCurveTo(cx + s * 0.34, base, cx, base);
      g.quadraticCurveTo(cx - s * 0.34, base, cx - s * 0.45, base - s * 0.34);
      g.closePath(); g.fill(); g.stroke();
      F('#C88B5A'); g.beginPath(); g.ellipse(cx, base - s * 0.34, s * 0.45, s * 0.14, 0, 0, 7); g.fill(); g.stroke();
      if(S.dugi.full < 60){ F('#F5B971');
        g.beginPath(); g.ellipse(cx, base - s * 0.36, s * 0.3, s * 0.1, 0, 0, 7); g.fill(); g.stroke(); }
      break;
    }
    case 'plant': {
      F('#D98E6A'); g.beginPath();
      g.moveTo(cx - s * 0.32, base - s * 0.42); g.lineTo(cx + s * 0.32, base - s * 0.42);
      g.lineTo(cx + s * 0.24, base); g.lineTo(cx - s * 0.24, base); g.closePath(); g.fill(); g.stroke();
      F('#8CCB86');
      for(const [dx, dy, r] of [[-0.3, -0.85, 0.3], [0.3, -0.85, 0.3], [0, -1.05, 0.34]]){
        g.beginPath(); g.ellipse(cx + dx * s, base - s * 0.42 + dy * s * 0.42, r * s, r * s * 0.68,
                                 dx * 0.5, 0, 7); g.fill(); g.stroke();
      }
      g.beginPath(); g.moveTo(cx, base - s * 0.42); g.lineTo(cx, base - s * 0.8); g.stroke();
      break;
    }
    case 'bed': {
      F('#C9A9D9'); rrect(cx - s * 0.85, base - s * 0.55, s * 1.7, s * 0.55, s * 0.12); g.fill(); g.stroke();
      F('#FFFDF6'); rrect(cx - s * 0.8, base - s * 0.72, s * 0.62, s * 0.3, s * 0.1); g.fill(); g.stroke();
      F('#FFB3C1'); rrect(cx - s * 0.14, base - s * 0.68, s * 0.95, s * 0.26, s * 0.1); g.fill(); g.stroke();
      break;
    }
    case 'ball': {
      F('#FFB3C1'); g.beginPath(); g.arc(cx, base - s * 0.3, s * 0.3, 0, 7); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - s * 0.3, base - s * 0.3); g.quadraticCurveTo(cx, base - s * 0.5, cx + s * 0.3, base - s * 0.3);
      g.stroke();
      break;
    }
    case 'tub': {
      F('#A9D9F0'); g.beginPath();
      g.moveTo(cx - s * 0.5, base - s * 0.4); g.lineTo(cx + s * 0.5, base - s * 0.4);
      g.quadraticCurveTo(cx + s * 0.4, base, cx, base);
      g.quadraticCurveTo(cx - s * 0.4, base, cx - s * 0.5, base - s * 0.4);
      g.closePath(); g.fill(); g.stroke();
      F('#FFFFFF'); g.globalAlpha = .8;
      g.beginPath(); g.arc(cx - s * 0.16, base - s * 0.46, s * 0.12, 0, 7);
      g.arc(cx + s * 0.1, base - s * 0.52, s * 0.09, 0, 7); g.fill(); g.globalAlpha = 1;
      break;
    }
    case 'rug': {
      F('#F6C8D4'); g.beginPath(); g.ellipse(cx, base - s * 0.04, s * 1.15, s * 0.32, 0, 0, 7);
      g.fill(); g.stroke();
      g.strokeStyle = '#E39FB2'; g.beginPath();
      g.ellipse(cx, base - s * 0.04, s * 0.8, s * 0.2, 0, 0, 7); g.stroke(); ink();
      break;
    }
    case 'lamp': {
      F('#D9C4A0'); g.beginPath(); g.moveTo(cx - s * 0.22, base); g.lineTo(cx + s * 0.22, base);
      g.lineTo(cx + s * 0.06, base - s * 0.8); g.lineTo(cx - s * 0.06, base - s * 0.8);
      g.closePath(); g.fill(); g.stroke();
      F('#FFE08A'); g.beginPath();
      g.moveTo(cx - s * 0.42, base - s * 0.8); g.lineTo(cx + s * 0.42, base - s * 0.8);
      g.lineTo(cx + s * 0.28, base - s * 1.18); g.lineTo(cx - s * 0.28, base - s * 1.18);
      g.closePath(); g.fill(); g.stroke();
      break;
    }
    case 'shelf': {
      F('#C9A06A'); rrect(cx - s * 0.5, base - s * 1.05, s, s * 1.05, s * 0.08); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - s * 0.5, base - s * 0.7); g.lineTo(cx + s * 0.5, base - s * 0.7);
      g.moveTo(cx - s * 0.5, base - s * 0.35); g.lineTo(cx + s * 0.5, base - s * 0.35); g.stroke();
      ['#FFB3C1', '#A9D9F0', '#8CCB86', '#B9A7D9'].forEach((c, i) => {
        F(c); const bx = cx - s * 0.42 + (i % 3) * s * 0.17, by = base - s * (i < 3 ? 0.72 : 0.37);
        g.fillRect(bx, by, s * 0.12, s * 0.3); g.strokeRect(bx, by, s * 0.12, s * 0.3);
      });
      break;
    }
    case 'tv': {
      F('#6E6A61'); rrect(cx - s * 0.6, base - s * 0.85, s * 1.2, s * 0.72, s * 0.1); g.fill(); g.stroke();
      F('#A9D9F0'); rrect(cx - s * 0.5, base - s * 0.77, s, s * 0.56, s * 0.06); g.fill(); g.stroke();
      F('#6E6A61'); g.fillRect(cx - s * 0.08, base - s * 0.13, s * 0.16, s * 0.13);
      g.strokeRect(cx - s * 0.08, base - s * 0.13, s * 0.16, s * 0.13);
      g.beginPath(); g.moveTo(cx - s * 0.3, base); g.lineTo(cx + s * 0.3, base); g.stroke();
      break;
    }
    case 'fridge': {
      F('#FFFDF6'); rrect(cx - s * 0.42, base - s * 1.25, s * 0.84, s * 1.25, s * 0.1); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx - s * 0.42, base - s * 0.8); g.lineTo(cx + s * 0.42, base - s * 0.8); g.stroke();
      g.beginPath(); g.moveTo(cx + s * 0.28, base - s * 0.72); g.lineTo(cx + s * 0.28, base - s * 0.55);
      g.moveTo(cx + s * 0.28, base - s * 0.95); g.lineTo(cx + s * 0.28, base - s * 1.12); g.stroke();
      break;
    }
    case 'cake': {
      F('#F2E8D9'); rrect(cx - s * 0.4, base - s * 0.5, s * 0.8, s * 0.5, s * 0.08); g.fill(); g.stroke();
      F('#FFB3C1'); rrect(cx - s * 0.4, base - s * 0.62, s * 0.8, s * 0.16, s * 0.07); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx, base - s * 0.62); g.lineTo(cx, base - s * 0.82); g.stroke();
      F('#FFE08A'); g.beginPath(); g.ellipse(cx, base - s * 0.88, s * 0.06, s * 0.09, 0, 0, 7); g.fill(); g.stroke();
      break;
    }
    case 'frame': {
      F('#C9A06A'); rrect(cx - s * 0.42, base - s * 0.62, s * 0.84, s * 0.62, s * 0.06); g.fill(); g.stroke();
      F('#FFFDF6'); rrect(cx - s * 0.32, base - s * 0.53, s * 0.64, s * 0.44, s * 0.04); g.fill(); g.stroke();
      F('#8CCB86'); g.beginPath(); g.arc(cx, base - s * 0.24, s * 0.12, 0, 7); g.fill(); g.stroke();
      break;
    }
    case 'clock': {
      F('#FFFDF6'); g.beginPath(); g.arc(cx, base - s * 0.35, s * 0.35, 0, 7); g.fill(); g.stroke();
      const a = home.t * 0.6;
      g.beginPath(); g.moveTo(cx, base - s * 0.35);
      g.lineTo(cx + Math.cos(a) * s * 0.22, base - s * 0.35 + Math.sin(a) * s * 0.22);
      g.moveTo(cx, base - s * 0.35);
      g.lineTo(cx + Math.cos(a * 4) * s * 0.28, base - s * 0.35 + Math.sin(a * 4) * s * 0.28); g.stroke();
      break;
    }
    case 'garland': {
      const w = s * 1.6;
      g.beginPath(); g.moveTo(cx - w / 2, base - s * 0.5);
      g.quadraticCurveTo(cx, base - s * 0.18, cx + w / 2, base - s * 0.5); g.stroke();
      ['#FFB3C1', '#A9D9F0', '#8CCB86', '#FFE08A', '#B9A7D9'].forEach((c, i) => {
        const t = (i + 0.5) / 5, x = cx - w / 2 + w * t;
        const y = base - s * 0.5 + Math.sin(t * Math.PI) * s * 0.32;
        F(c); g.beginPath(); g.moveTo(x - s * 0.1, y); g.lineTo(x + s * 0.1, y);
        g.lineTo(x, y + s * 0.26); g.closePath(); g.fill(); g.stroke();
      });
      break;
    }
    /* 방 자체 */
    case 'wardrobe': {
      F('#C9A06A'); rrect(cx - s * 0.5, base - s * 1.35, s, s * 1.35, s * 0.1); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(cx, base - s * 1.3); g.lineTo(cx, base - s * 0.05); g.stroke();
      F('#F2E8D9'); g.beginPath(); g.arc(cx - s * 0.12, base - s * 0.68, s * 0.06, 0, 7);
      g.arc(cx + s * 0.12, base - s * 0.68, s * 0.06, 0, 7); g.fill(); g.stroke();
      break;
    }
    case 'door': {
      F('#D98E6A'); rrect(cx - s * 0.55, base - s * 1.55, s * 1.1, s * 1.55, s * 0.1); g.fill(); g.stroke();
      F('#FFE08A'); g.beginPath(); g.arc(cx + s * 0.34, base - s * 0.75, s * 0.08, 0, 7); g.fill(); g.stroke();
      F('#CDEBFA'); rrect(cx - s * 0.28, base - s * 1.35, s * 0.56, s * 0.34, s * 0.06); g.fill(); g.stroke();
      break;
    }
    case 'gacha': {
      F('#FFB3C1'); rrect(cx - s * 0.45, base - s * 1.3, s * 0.9, s * 1.3, s * 0.12); g.fill(); g.stroke();
      F('#FFFDF6'); g.beginPath(); g.arc(cx, base - s * 0.92, s * 0.32, 0, 7); g.fill(); g.stroke();
      ['#8CCB86', '#A9D9F0', '#FFE08A', '#B9A7D9'].forEach((c, i) => {
        F(c); g.beginPath();
        g.arc(cx - s * 0.16 + (i % 2) * s * 0.3, base - s * 1.0 + Math.floor(i / 2) * s * 0.18,
              s * 0.08, 0, 7); g.fill(); g.stroke();
      });
      F('#F2E8D9'); rrect(cx - s * 0.2, base - s * 0.5, s * 0.4, s * 0.24, s * 0.05); g.fill(); g.stroke();
      break;
    }
  }
  g.restore();
}

function drawDust(d, i){
  const cx = d.x * W, cy = walkTop() + (d.y - 0.6) / 0.3 * (walkBot() - walkTop());
  const s = 26 * uiK() * depthAt(cy);
  g.save(); ink(); g.fillStyle = '#CFC3AA';
  g.beginPath();
  for(let k = 0; k < 5; k++){
    const a = k / 5 * 6.283 + Math.sin(home.t + d.seed) * 0.1;
    const r = s * (0.5 + 0.22 * Math.sin(k * 2.1 + d.seed));
    g[k ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55);
  }
  g.closePath(); g.fill(); g.stroke();
  g.fillStyle = '#8C8172';
  g.beginPath(); g.arc(cx - s * 0.18, cy - s * 0.05, s * 0.07, 0, 7);
  g.arc(cx + s * 0.18, cy - s * 0.05, s * 0.07, 0, 7); g.fill();
  g.restore();
}

/* 두기 본체 */
function drawDugi(dt){
  const st = STAGES[stageOf(S.dugi.exp)], c = look();
  const cy = walkTop() + (home.y - 0.6) / 0.3 * (walkBot() - walkTop());
  const cx = home.x * W;
  const dep = depthAt(cy);
  const baseH = Math.min(H * 0.30, W * 0.30) * st.scale * (c.scale || 1) * dep;
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

  /* 그림자 */
  g.save(); g.globalAlpha = 0.14; g.fillStyle = '#2B2B2B';
  g.beginPath(); g.ellipse(cx, cy + 2, baseH * 0.34, baseH * 0.09, 0, 0, 7); g.fill(); g.restore();

  const im = IMG[c.run];
  g.save();
  g.translate(cx, cy - bob - (c.float || 0) * 0.3 * dep);
  g.rotate(rot); g.scale((c.flip === false ? 1 : -1) * home.face, sy);
  if(im && im.complete && im.naturalWidth) g.drawImage(im, -baseH * 0.5, -baseH, baseH, baseH);
  g.restore();

  /* 말풍선 */
  if(home.bubbleT > 0){
    const a = Math.min(1, home.bubbleT * 2.2);
    g.save(); g.globalAlpha = a;
    const tx = cx, ty = cy - baseH - 16 * uiK();
    g.font = '700 ' + (20 * uiK()) + 'px Gaegu, sans-serif';
    const w = g.measureText(home.bubble).width + 26 * uiK(), h = 32 * uiK();
    g.fillStyle = '#FFFDF6'; ink();
    rrect(tx - w / 2, ty - h, w, h, 12 * uiK()); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(tx - 7 * uiK(), ty); g.lineTo(tx, ty + 9 * uiK()); g.lineTo(tx + 7 * uiK(), ty);
    g.fillStyle = '#FFFDF6'; g.fill();
    g.fillStyle = '#2B2B2B'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(home.bubble, tx, ty - h / 2 + 1);
    g.restore();
  }
}

function drawHomeParts(){
  for(const p of home.parts){
    const k = 1 - p.t / p.life, s = 9 * uiK();
    g.save(); g.globalAlpha = Math.max(0, k); g.fillStyle = p.c; ink();
    if(p.s === 'heart'){
      g.beginPath();
      g.moveTo(p.x, p.y + s * 0.5);
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
  const cx = n.x * W, cy = wallBot() + (H - wallBot()) * 0.06;
  const label = (n.act === 'wardrobe' || n.act === 'gacha' || n.act === 'out')
    ? n.name : CARE[n.act].name;
  g.save();
  g.font = '700 ' + (19 * k) + 'px Gaegu, sans-serif';
  const w = g.measureText('E  ' + label).width + 30 * k, h = 30 * k;
  const x = Math.max(6 * k, Math.min(W - w - 6 * k, cx - w / 2));
  const y = cy - h - 6 * k + Math.sin(home.t * 4) * 2.5 * k;
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
  drawRoom(dt);
  const wb = wallBot(), k = uiK();
  const fs = Math.min(W * 0.12, H * 0.14);             // 가구 기준 크기

  /* 벽 가구 + 방 */
  for(const id of S.furn){
    const f = FURN(id);
    if(f && f.on === 'wall') drawFurn(id, f.x * W, wb - H * 0.10, fs * 0.9, near(id));
  }
  drawFurn('door', PLACES[1].x * W, wb + H * 0.012, fs, near('door'));

  /* 러그 먼저 (바닥에 깔림) */
  if(hasFurn('rug')) drawFurn('rug', FURN('rug').x * W, wb + (H - wb) * 0.52, fs, false);

  /* 바닥 것들 — y 순서로 */
  const floor = [];
  for(const id of S.furn){
    const f = FURN(id);
    if(f && f.on === 'floor') floor.push({ id, x: f.x, y: 0.72 });
  }
  floor.push({ id: 'wardrobe', x: PLACES[0].x, y: 0.70 });
  floor.push({ id: 'gacha', x: PLACES[2].x, y: 0.70 });
  floor.sort((a, b) => a.y - b.y);
  for(const o of floor){
    const by = walkTop() + (o.y - 0.6) / 0.3 * (walkBot() - walkTop());
    drawFurn(o.id, o.x * W, by, fs * depthAt(by), near(o.id));
  }
  home.dusts.forEach(drawDust);
  drawDugi(dt);
  drawHomeParts();
  drawPrompt();

  function near(id){ return home.near && (home.near.id === id); }
}

/* 공용 그리기 도구 */
function ink(w){ g.strokeStyle = '#2B2B2B'; g.lineWidth = w || LW(); g.lineJoin = 'round'; g.lineCap = 'round'; }
function rrect(x, y, w, h, r){
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
