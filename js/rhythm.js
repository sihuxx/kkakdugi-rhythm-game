"use strict";
/* 리듬게임 — 꺅두기 하우스 */

/* ===============================================================
   리듬게임 — 외출해서 하는 미니게임 ①
   =============================================================== */
const BASE_WIN = { perfect:0.06, great:0.12, good:0.18 };
const VAL = { perfect:1, great:0.6, good:0.2 };
const LABEL = { perfect:'PERFECT', great:'GREAT', good:'GOOD', miss:'MISS' };

let char = look();                       // 리듬게임에서 쓰는 지금 모습
let song = SONGS[0], diff = DIFFS[0];
let notes = [], events = [], evIndex = 0, WIN = { ...BASE_WIN }, APPROACH = 2.0;
let score = 0, combo = 0, maxCombo = 0, tally = { perfect:0, great:0, good:0, miss:0 }, accSum = 0;
let charState = 'run', charTimer = 0, jumpT = 0, hitBounce = 0;
const laneHold = [false, false, false, false], laneFlash = [0, 0, 0, 0],
      laneBeam = [0, 0, 0, 0], laneMiss = [0, 0, 0, 0], touchLane = {};
let comboPop = 0, shakeT = 0, perfectStreak = 0;
let fx = [], texts = [], parts = [], stars = [], flyers = [], lastSection = -1;
const bestKey = (s, d) => s.id + '/' + d.id;

let LANE_COL = [...SKINS.basic.col];
function applySkin(){ LANE_COL = [...(SKINS[settings.skin] || SKINS.basic).col]; }
function laneOfCode(code){ const i = settings.keys.indexOf(code); return i < 0 ? undefined : i; }
applySkin();

/* 좌표 */
function audioLat(){ return ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0; }
function fieldW(){ return Math.min(W * (W < 560 ? 0.80 : 0.58), H * 0.86, 620); }
function fieldX(){ return (W - fieldW()) / 2; }
function laneW(){ return fieldW() / 4; }
function laneX(i){ return fieldX() + laneW() * (i + 0.5); }
function fieldTop(){ return H * 0.04; }
function judgeY(){ return H * 0.80; }
function noteSpeed(){ return (judgeY() - fieldTop() + 60) / APPROACH; }
function noteY(t){ return judgeY() - (t - nowT()) * noteSpeed(); }
function groundY(){ return H * 0.86; }

/* 시작 · 끝 */
function startGame(){
  closeModal(); $('topbar').hidden = true;
  initAudio(); bgmStop(); if(ctx.state === 'suspended') ctx.resume();
  char = look();
  notes = buildChart(song, diff.id);
  events = buildEvents(song); evIndex = 0;
  APPROACH = diff.approach / settings.speed;
  WIN = { perfect:BASE_WIN.perfect * diff.wmul, great:BASE_WIN.great * diff.wmul, good:BASE_WIN.good * diff.wmul };
  score = 0; combo = 0; maxCombo = 0; tally = { perfect:0, great:0, good:0, miss:0 }; accSum = 0;
  fx = []; texts = []; parts = []; flyers = []; lastSection = -1;
  stars = Array.from({ length:40 }, () => ({ x:Math.random(), y:Math.random() * 0.55,
                                             r:Math.random() * 1.6 + 0.7, p:Math.random() * 6.3 }));
  charState = 'run'; charTimer = 0;
  songStart = ctx.currentTime + 0.35;
  mode = 'play'; showScreen(null);
}
function endGame(){
  mode = 'result';
  const total = notes.length || 1, acc = Math.round((accSum / total) * 100);
  let grade;
  if(tally.miss === 0 && tally.good === 0) grade = '네잎클로버';
  else if(acc >= 90) grade = '세잎';
  else if(acc >= 70) grade = '잎사귀';
  else grade = '새싹';
  const gmul = { '네잎클로버':1.6, '세잎':1.3, '잎사귀':1.05, '새싹':0.85 }[grade];
  const pay = Math.round((score / 70 + maxCombo * 1.2 + 30) * gmul * diff.mult * payMult());
  const exp = Math.round((8 + acc * 0.16 + maxCombo * 0.05) * diff.mult);

  $('gradeText').textContent = grade;
  $('scoreText').textContent = Math.round(score).toLocaleString('ko-KR');
  $('tPerfect').textContent = tally.perfect; $('tGreat').textContent = tally.great;
  $('tGood').textContent = tally.good; $('tMiss').textContent = tally.miss;
  $('tCombo').textContent = maxCombo; $('tAcc').textContent = acc + '%';
  const k = bestKey(song, diff), prev = S.best[k] || 0, isNew = score > prev;
  if(isNew) S.best[k] = Math.round(score);
  $('bestText').textContent = (isNew ? '새 기록! ' : '최고 기록 ') +
    (S.best[k] || 0).toLocaleString('ko-KR') + ' · ' + song.title + ' · ' + diff.name;
  $('resultArt').src = grade === '네잎클로버' ? SRC.clover : SRC[char.run];
  payOut(pay, exp, 'rewardText');
  showScreen($('resultScreen'));
  bgmStart();
}
/* 보상 정산 — 두 미니게임이 같이 쓴다 */
function payOut(pay, exp, elId){
  addClover(pay); addExp(exp); afterOuting(); save(); refreshBar(); sfxCoin(4);
  $(elId).innerHTML = CLOVER_SVG + '<b>+' + pay + '</b> 클로버 · <b>+' + exp + '</b> 경험치' +
    '<small>배부름 −18 · 기운 −22 · 깨끗함 −14</small>';
}

function pause(){
  if(mode !== 'play') return;
  mode = 'pause'; showScreen($('pauseScreen'));
  $('pauseInfo').textContent = song.title + ' · ' + diff.name + ' · ' +
    Math.round(score).toLocaleString('ko-KR') + '점 · ' + combo + '콤보';
  if(ctx) ctx.suspend();
}
let cdTimer = null;
function resumePlay(){
  if(mode !== 'pause' || cdTimer) return;
  $('pauseScreen').hidden = true; modal.hidden = true; modalOpen = null;
  const cd = $('countdown'), num = $('cdNum');
  const pop = () => { num.style.animation = 'none'; void num.offsetWidth; num.style.animation = ''; };
  let n = 3; cd.hidden = false; num.textContent = n; pop(); blip(660, 0.1);
  const tick = () => {
    n--;
    if(n > 0){ num.textContent = n; pop(); blip(660 + (3 - n) * 120, 0.1); cdTimer = setTimeout(tick, 650); }
    else{
      num.textContent = '시작!'; pop(); blip(1180, 0.13);
      cdTimer = setTimeout(() => { cd.hidden = true; cdTimer = null; mode = 'play'; showScreen(null);
                                   if(ctx) ctx.resume(); }, 480);
    }
  };
  cdTimer = setTimeout(tick, 650);
}
function quitPlay(){                       // 도중에 집으로
  if(cdTimer){ clearTimeout(cdTimer); cdTimer = null; $('countdown').hidden = true; }
  if(ctx && ctx.state === 'suspended') ctx.resume();
  goHome();
}

/* 판정 */
function hit(lane){
  if(mode !== 'play') return;
  laneFlash[lane] = 1;
  const t = nowT(); let target = null, bd = 999;
  for(const n of notes){
    if(n.judged) continue;
    if(n.t - t > WIN.good + 0.05) break;
    if(n.lane !== lane) continue;
    const d = Math.abs(n.t - t);
    if(d <= WIN.good && d < bd){ bd = d; target = n; }
  }
  if(!target) return;
  const v = bd <= WIN.perfect ? 'perfect' : bd <= WIN.great ? 'great' : 'good';
  target.judged = true; target.verdict = v;
  if(target.type === 'hold') target.holding = true; else target.done = true;
  combo++; maxCombo = Math.max(maxCombo, combo);
  tally[v]++; accSum += VAL[v];
  score += 100 * VAL[v] * (1 + Math.min(combo / 10 * 0.1, 1.0)) * diff.mult;
  laneBeam[lane] = 1; comboPop = 1;
  perfectStreak = v === 'perfect' ? perfectStreak + 1 : 0;
  if(perfectStreak > 0 && perfectStreak % 10 === 0) shakeT = 0.18;
  spawnHitFx(lane, v);
  texts.length = 0;
  texts.push({ x:W * 0.5, y:judgeY() - H * 0.24, life:1, s:LABEL[v], big:v === 'perfect', v:v });
  if(combo % 10 === 0){ charState = 'jump'; jumpT = 0; } else { charState = 'run'; hitBounce = 1; }
  hitSound(lane, v);
}
function miss(n){
  n.judged = true; n.done = true; n.verdict = 'miss';
  combo = 0; tally.miss++; perfectStreak = 0; laneMiss[n.lane] = 1;
  texts.length = 0;
  texts.push({ x:W * 0.5, y:judgeY() - H * 0.24, life:1, s:LABEL.miss });
  missSound();
  charState = 'fall'; charTimer = 0.7;
}

/* 한 프레임 */
function stepPlay(dt, ts){
  const playing = mode === 'play', frozen = mode === 'pause';
  const t = (playing || frozen) ? nowT() : ts / 1000;
  const prog = Math.max(0, Math.min(1, t / song.end));
  const th = lerpTheme(THEMES[song.theme], prog);

  if(playing){
    const look2 = t + 0.25;
    while(evIndex < events.length && events[evIndex].t < look2){ events[evIndex].f(); evIndex++; }
    for(const n of notes){
      if(!n.judged && t - n.t > WIN.good) miss(n);
      if(n.holding && t >= n.t + n.dur){
        n.holding = false; n.done = true; score += 40 * diff.mult;
        combo++; maxCombo = Math.max(maxCombo, combo); hitSound(n.lane, 'perfect');
        fx.push({ x:laneX(n.lane), y:judgeY(), r:12, life:1, kind:'perfect' });
        texts.length = 0; texts.push({ x:W * 0.5, y:judgeY() - H * 0.24, life:1, s:'쓰왜!' });
      }
      if(n.holding && !laneHold[n.lane] && t < n.t + n.dur - 0.12){
        n.holding = false; n.done = true;
        texts.length = 0; texts.push({ x:W * 0.5, y:judgeY() - H * 0.24, life:1, s:'놓쳤다' });
        for(let i = 0; i < 4; i++) fx.push({ x:laneX(n.lane), y:judgeY(), life:.7, kind:'dust',
          vx:(Math.random() - .5) * 120, vy:-30 - Math.random() * 80, r:2 + Math.random() * 3 });
      }
    }
    const section = Math.floor(t / (song.barDur * 4));
    if(section !== lastSection){ lastSection = section; if(t > 0) spawnFlyer(); }
    if(t > song.end + 0.9) endGame();
  }
  const beat = ((t / song.beat) % 1 + 1) % 1;
  const pulse = REDUCED ? 1 : 1 + Math.max(0, 0.012 * (1 - beat * 4));
  let shx = 0, shy = 0;
  if(shakeT > 0){ shakeT -= dt; if(!REDUCED){ shx = (Math.random() - .5) * 7; shy = (Math.random() - .5) * 7; } }
  g.save(); g.translate(W / 2 + shx, H / 2 + shy); g.scale(pulse, pulse); g.translate(-W / 2, -H / 2);
  scene(Math.max(0, t), th, prog);
  if(playing) spawnParticles(dt, th);
  drawFlyers(playing ? dt : dt * 0.6, th);
  drawParticles(playing ? dt : dt * 0.6);
  laneField(t, th); drawNotes(t, th); drawChar(t, playing ? dt : 0, th);
  drawFx(playing ? dt : 0, th); drawHud(t, th);
  g.restore();
}

/* ===== 노트 ===== */
function wobble(x,y,r,seed,fill,stroke){
  g.beginPath();
  for(let a=0;a<=6.29;a+=Math.PI/12){
    const rr=r+Math.sin(a*3+seed)*r*0.055;
    const px=x+Math.cos(a)*rr, py=y+Math.sin(a)*rr;
    a===0?g.moveTo(px,py):g.lineTo(px,py);
  }
  g.closePath();
  if(fill){ g.fillStyle=fill; g.fill(); }
  if(stroke){ g.strokeStyle=stroke; g.lineWidth=LW(); g.stroke(); }
}
function rgba(hex,a){
  return 'rgba('+parseInt(hex.slice(1,3),16)+','+parseInt(hex.slice(3,5),16)+','+
         parseInt(hex.slice(5,7),16)+','+a+')';
}
/* 노트를 쳤을 때 터지는 것들 */
function spawnHitFx(lane, v){
  const x=laneX(lane), y=judgeY(), col=LANE_COL[lane], lw=laneW();
  const shards = v==='perfect'?4 : v==='great'?3 : 2;
  for(let i=0;i<shards;i++)
    fx.push({kind:'shard', x, y, w:lw*0.24, h:Math.max(7,lw*0.11), col, life:1,
             vx:(Math.random()-.5)*300, vy:-140-Math.random()*240,
             rot:Math.random()*6.3, vr:(Math.random()-.5)*16});
  fx.push({kind:'ripple', x, y, r:lw*0.30, life:1, col});
  if(v==='perfect'){
    for(let i=0;i<10;i++){ const a=Math.random()*6.283, sp=150+Math.random()*280;
      fx.push({kind:'star', x, y, r:3+Math.random()*3.5, life:1,
               vx:Math.cos(a)*sp, vy:Math.sin(a)*sp-70, rot:Math.random()*6.3, vr:(Math.random()-.5)*10}); }
    fx.push({kind:'ring', x, y, r:lw*0.22, life:1, col:'#FFD98A'});
    fx.push({kind:'ring', x, y, r:lw*0.22, life:1, col, d:0.06});
  } else if(v==='great'){
    for(let i=0;i<6;i++) fx.push({kind:'dust', x, y, r:2+Math.random()*3, life:1, col,
      vx:(Math.random()-.5)*180, vy:-70-Math.random()*150});
    fx.push({kind:'ring', x, y, r:lw*0.2, life:1, col});
  } else {
    for(let i=0;i<3;i++) fx.push({kind:'dust', x, y, r:2+Math.random()*2, life:1, col:'#C9BFAE',
      vx:(Math.random()-.5)*110, vy:-45-Math.random()*90});
  }
}

function laneField(t,th){
  const x0=fieldX(), fw=fieldW(), top=fieldTop(), jy=judgeY(), lw=laneW();
  g.save();
  g.globalAlpha=0.66; g.fillStyle='#FFFDF6';
  roundRect(x0,top,fw,H-top-H*0.03,18); g.fill(); g.globalAlpha=1;
  g.lineWidth=LW(); g.strokeStyle=th.ink; g.globalAlpha=.5;
  roundRect(x0,top,fw,H-top-H*0.03,18); g.stroke(); g.globalAlpha=1;
  // 레인 구분선
  g.setLineDash([6,8]); g.lineWidth=LW()*0.7; g.strokeStyle='rgba(43,43,43,.25)';
  for(let i=1;i<4;i++){ g.beginPath(); g.moveTo(x0+lw*i,top+8); g.lineTo(x0+lw*i,jy+lw*0.55); g.stroke(); }
  g.setLineDash([]);
  // 박자 줄
  const beat=song.beat, from=Math.ceil(nowT()/beat);
  for(let k=from;k<from+14;k++){
    const y=noteY(k*beat); if(y<top||y>jy) continue;
    g.strokeStyle= (k% (song.spb/2)===0) ? 'rgba(43,43,43,.16)' : 'rgba(43,43,43,.07)';
    g.lineWidth=LW()*0.7; g.beginPath(); g.moveTo(x0+4,y); g.lineTo(x0+fw-4,y); g.stroke();
  }
  // 눌린 줄이 위로 빛난다
  for(let i=0;i<4;i++){
    if(laneHold[i]) laneBeam[i]=Math.max(laneBeam[i],0.55);
    laneBeam[i]=Math.max(0,laneBeam[i]-0.05);
    laneMiss[i]=Math.max(0,laneMiss[i]-0.045);
    if(laneBeam[i]>0.01){
      const cx=laneX(i);
      const gr=g.createLinearGradient(0,jy,0,top);
      gr.addColorStop(0, rgba(LANE_COL[i], 0.50*laneBeam[i]));
      gr.addColorStop(0.55, rgba(LANE_COL[i], 0.14*laneBeam[i]));
      gr.addColorStop(1, rgba(LANE_COL[i], 0));
      g.fillStyle=gr; g.fillRect(cx-lw*0.44, top, lw*0.88, jy-top);
    }
    if(laneMiss[i]>0.01){
      const cx=laneX(i);
      g.fillStyle=rgba('#C9A9A9', 0.22*laneMiss[i]);
      g.fillRect(cx-lw*0.44, top, lw*0.88, jy-top);
    }
  }
  // 판정선 + 리시버
  g.strokeStyle=th.ink; g.lineWidth=LW(); g.beginPath();
  for(let x=x0;x<=x0+fw;x+=10) g.lineTo(x, jy+Math.sin(x*0.08)*1.2);
  g.stroke();
  const bp=((t/song.beat)%1+1)%1, pulse=REDUCED?1:1+Math.max(0,0.10*(1-bp*3));
  for(let i=0;i<4;i++){
    const cx=laneX(i), punch=1+laneFlash[i]*0.42, r=lw*0.33*pulse*punch;
    laneFlash[i]=Math.max(0,laneFlash[i]-0.07);
    g.globalAlpha=0.28+laneFlash[i]*0.7;
    g.fillStyle=laneMiss[i]>0.2?'#C9A9A9':LANE_COL[i];
    g.beginPath(); g.arc(cx,jy,r,0,6.3); g.fill(); g.globalAlpha=1;
    if(laneFlash[i]>0.02){                       // 눌릴 때 바깥 테
      g.globalAlpha=laneFlash[i]*0.8; g.lineWidth=LW();
      g.strokeStyle=LANE_COL[i];
      g.beginPath(); g.arc(cx,jy,r*1.28,0,6.3); g.stroke(); g.globalAlpha=1;
    }
    g.lineWidth=LW(); g.strokeStyle=th.ink;
    g.beginPath(); g.arc(cx,jy,lw*0.33*pulse,0,6.3); g.stroke();
    g.font='700 '+Math.round(lw*0.34)+'px "Gaegu", sans-serif';
    g.textAlign='center'; g.fillStyle=th.ink; g.globalAlpha=laneHold[i]?1:0.55;
    g.fillText(keyLabel(settings.keys[i]), cx, jy+lw*0.72); g.globalAlpha=1;
  }
  g.restore();
}
function drawNotes(t,th){
  const lw=laneW(), jy=judgeY(), top=fieldTop();
  const nw=lw*0.74, nh=Math.max(14,lw*0.30);
  for(const n of notes){
    if(n.t-t>APPROACH+0.3) break;
    const x=laneX(n.lane), col=LANE_COL[n.lane];
    if(n.type==='hold'){
      if(n.done) continue;
      const yHead = n.holding ? jy : noteY(n.t);
      const yTail = noteY(n.t+n.dur);
      if(yTail>jy+nh*2 && !n.holding) {}
      if(noteY(n.t)>jy+H*0.2 && !n.holding) continue;
      const a=Math.min(yHead,yTail), bnd=Math.max(yHead,yTail);
      if(bnd<top-40) continue;
      g.globalAlpha=n.judged?0.95:0.8; g.fillStyle=col;
      roundRect(x-nw*0.34, a, nw*0.68, Math.max(6,bnd-a), nw*0.3); g.fill();
      g.globalAlpha=1; g.lineWidth=LW(); g.strokeStyle=th.ink;
      roundRect(x-nw*0.34, a, nw*0.68, Math.max(6,bnd-a), nw*0.3); g.stroke();
      // 머리·꼬리 알약
      if(!n.judged){ g.fillStyle=col; roundRect(x-nw/2,noteY(n.t)-nh/2,nw,nh,nh*0.45); g.fill(); g.stroke(); }
      g.fillStyle='#FFFDF6'; roundRect(x-nw*0.34,yTail-nh*0.34,nw*0.68,nh*0.68,nh*0.3); g.fill(); g.stroke();
      if(n.holding && Math.random()<0.35)
        fx.push({x:x+(Math.random()-.5)*nw,y:jy,life:.6,kind:'dust',
                 vx:(Math.random()-.5)*70,vy:-70-Math.random()*70,r:2+Math.random()*2});
    } else {
      if(n.done) continue;
      const y=noteY(n.t);
      if(y>jy+H*0.18) continue;
      if(y<top-30) continue;
      g.fillStyle=col; roundRect(x-nw/2,y-nh/2,nw,nh,nh*0.45); g.fill();
      g.lineWidth=LW(); g.strokeStyle=th.ink; roundRect(x-nw/2,y-nh/2,nw,nh,nh*0.45); g.stroke();
      g.globalAlpha=.5; g.fillStyle='#FFFDF6';
      roundRect(x-nw*0.36,y-nh*0.30,nw*0.72,nh*0.26,nh*0.13); g.fill(); g.globalAlpha=1;
    }
  }
}

/* ===== 캐릭터 ===== */
function drawChar(t,dt,th){
  if(fieldX()<W*0.135) return;            // 세로 화면에선 자리가 없어 생략
  const gy=groundY()-char.float;
  const scale=Math.min(H*0.24, Math.max(fieldX()*0.9, W*0.10))*char.scale;
  const cx=Math.max(scale*0.62, fieldX()*0.5);
  let key=char.run, y=gy, rot=0, sc=scale;
  hitBounce=Math.max(0,hitBounce-dt*4);
  const bob=Math.abs(Math.sin(t*Math.PI/song.beat))*7;
  if(charState==='jump'){
    jumpT+=dt; const p=Math.min(1,jumpT/0.42);
    y=gy-Math.sin(p*Math.PI)*H*0.13; key=char.jump; rot=char.jumpRot||0;
    if(p>=1) charState='run';
  } else if(charState==='fall'){
    charTimer-=dt; key=char.fall; rot=(char.fallRot!==undefined?char.fallRot:0.12); sc=scale*0.92; y=gy+6;
    if(charTimer<=0) charState='run';
  } else {
    y = gy - bob*0.5 - hitBounce*14 - (char.float?Math.sin(t*2.2)*6:0);
    rot = Math.sin(t*3)*0.03;
  }
  if(combo>=20 && charState!=='fall'){
    g.fillStyle='rgba(217,196,160,.45)';
    for(let i=0;i<3;i++){ const r=11-i*3;
      g.beginPath(); g.ellipse(cx-34-i*20,y-scale*0.3,r*1.4,r,0,0,6.3); g.fill(); }
  }
  const img=IMG[key];
  if(!img||!img.complete||!img.naturalWidth) return;
  const w=sc*(img.naturalWidth/img.naturalHeight);
  g.save(); g.translate(cx,y); g.rotate(rot);
  g.globalAlpha=.1; g.fillStyle='#2B2B2B';
  g.beginPath(); g.ellipse(0,2+char.float,w*0.34,6,0,0,6.3); g.fill(); g.globalAlpha=1;
  if(char.flip) g.scale(-1,1);
  g.drawImage(img,-w/2,-sc,w,sc);
  g.restore();
}

/* ===== 이펙트 · HUD ===== */
function drawFx(dt,th){
  for(const f of fx){
    if(f.d>0){ f.d-=dt; continue; }
    switch(f.kind){
      case 'shard':
        f.life-=dt*1.9; f.x+=f.vx*dt; f.y+=f.vy*dt; f.vy+=1500*dt; f.rot+=f.vr*dt; break;
      case 'star':
        f.life-=dt*1.5; f.x+=f.vx*dt; f.y+=f.vy*dt; f.vy+=700*dt; f.rot+=f.vr*dt;
        f.vx*=0.96; break;
      case 'ripple': f.life-=dt*2.4; f.r+=dt*laneW()*3.2; break;
      case 'dust':   f.life-=dt*1.7; f.x+=f.vx*dt; f.y+=f.vy*dt; f.vy+=520*dt; break;
      default:       f.life-=dt*2.8; f.r+=dt*laneW()*2.6;
    }
  }
  fx=fx.filter(f=>f.life>0);
  for(const f of fx){
    if(f.d>0) continue;
    const a=Math.max(0,Math.min(1,f.life));
    g.globalAlpha=a;
    if(f.kind==='shard'){
      g.save(); g.translate(f.x,f.y); g.rotate(f.rot);
      g.fillStyle=f.col; roundRect(-f.w/2,-f.h/2,f.w,f.h,f.h*0.45); g.fill();
      g.lineWidth=LW()*0.7; g.strokeStyle='#2B2B2B'; g.stroke(); g.restore();
    } else if(f.kind==='star'){
      g.save(); g.translate(f.x,f.y); g.rotate(f.rot);
      g.fillStyle='#FFD98A'; g.strokeStyle='#2B2B2B'; g.lineWidth=LW()*0.55;
      g.beginPath();
      for(let i=0;i<8;i++){ const ang=i*Math.PI/4, rr=i%2?f.r*0.42:f.r*1.35;
        i?g.lineTo(Math.cos(ang)*rr,Math.sin(ang)*rr):g.moveTo(Math.cos(ang)*rr,Math.sin(ang)*rr); }
      g.closePath(); g.fill(); g.stroke(); g.restore();
    } else if(f.kind==='ripple'){
      g.strokeStyle=f.col; g.lineWidth=LW()*a+1;
      g.beginPath(); g.ellipse(f.x,f.y,f.r,f.r*0.34,0,0,6.3); g.stroke();
    } else if(f.kind==='dust'){
      g.fillStyle=f.col||char.accent;
      g.beginPath(); g.arc(f.x,f.y,f.r,0,6.3); g.fill();
    } else {
      g.strokeStyle=f.col||'#7BC47F'; g.lineWidth=LW();
      g.beginPath(); g.arc(f.x,f.y,f.r,0,6.3); g.stroke();
    }
  }
  g.globalAlpha=1;

  for(const tx of texts){ tx.life-=dt*1.5; tx.y-=dt*30; }
  texts=texts.filter(t=>t.life>0); if(texts.length>4) texts=texts.slice(-4);
  for(const tx of texts){
    const p=1-tx.life, sc=1+0.30*Math.max(0,1-p*7)-0.05*p;
    g.globalAlpha=Math.max(0,Math.min(1,tx.life*1.6));
    g.save(); g.translate(tx.x,tx.y); g.scale(sc,sc); g.rotate(-0.05);
    g.font='700 '+Math.round((tx.big?34:27)*uiK())+'px "Gaegu", sans-serif';
    g.textAlign='center'; g.lineWidth=LW(); g.lineJoin='round';
    g.strokeStyle='#FFFDF6'; g.strokeText(tx.s,0,0);
    g.fillStyle = tx.v==='perfect' ? '#E8A33D'
                : tx.v==='great'   ? '#5AA8D8'
                : (tx.s==='MISS'||tx.s==='놓쳤다') ? '#C9A9A9' : th.ink;
    g.fillText(tx.s,0,0); g.restore();
  }
  g.globalAlpha=1;
}
function drawHud(t,th){
  const pad=18,y=18,w=W-pad*2-26;
  const p=Math.max(0,Math.min(1,t/song.end));
  g.strokeStyle=th.ink; g.lineWidth=LW(); g.lineCap='round';
  g.beginPath(); g.moveTo(pad,y); g.lineTo(pad+w,y); g.stroke();
  g.strokeStyle='#7BC47F'; g.lineWidth=LW();
  g.beginPath(); g.moveTo(pad,y); g.lineTo(pad+w*p,y); g.stroke();
  g.fillStyle='#7BC47F';
  for(let i=0;i<4;i++){ const a=i*Math.PI/2+t;
    g.beginPath(); g.ellipse(pad+w+13+Math.cos(a)*5.5,y+Math.sin(a)*5.5,5.5,5.5,0,0,6.3); g.fill(); }
  const tx0=pad+40;
  g.font='700 '+Math.round(22*uiK())+'px "Gaegu", sans-serif'; g.textAlign='left'; g.fillStyle=th.ink;
  g.fillText(Math.round(score).toLocaleString('ko-KR'),tx0,y+30);
  g.font='400 '+Math.round(13*uiK())+'px "Gowun Dodum", sans-serif'; g.globalAlpha=.7;
  g.fillText(song.title+' · '+diff.name,tx0,y+30+18*uiK()); g.globalAlpha=1;
  if(combo>1){
    comboPop=Math.max(0,comboPop-0.055);
    const wide = fieldX()>W*0.14;
    const cbx = wide ? fieldX()*0.5 : W*0.5;
    const sc=1+comboPop*0.22;
    g.save(); g.globalAlpha = wide?1:0.55;
    g.translate(cbx,H*0.30); g.scale(sc,sc); g.rotate(-0.04);
    g.textAlign='center';
    g.font='700 '+Math.round(Math.min(56,26+combo*0.3)*uiK())+'px "Gaegu", sans-serif';
    g.lineWidth=LW()*1.7; g.lineJoin='round'; g.strokeStyle='#FFFDF6'; g.strokeText(combo,0,0);
    g.fillStyle=th.ink; g.fillText(combo,0,0);
    g.font='400 '+Math.round(14*uiK())+'px "Gowun Dodum", sans-serif'; g.globalAlpha=.7;
    g.fillText('콤보',0,20*uiK()); g.restore(); g.globalAlpha=1;
  } else comboPop=Math.max(0,comboPop-0.055);
  if(t<song.barDur*2){
    const left=song.barDur*2-t, n=Math.ceil(left/song.beat);
    g.textAlign='center'; g.fillStyle=th.ink;
    g.font='700 '+Math.round(76*uiK())+'px "Gaegu", sans-serif';
    g.globalAlpha=Math.min(1,(left%song.beat)/song.beat+0.25);
    g.fillText(n<=4?String(n):'준비',W/2,H*0.46); g.globalAlpha=1;
  }
}
