"use strict";
/* 그리기 — 노트·캐릭터·집·뽑기 연출·메인 루프 — 꺅두기 러닝비트 */

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
  if(stroke){ g.strokeStyle=stroke; g.lineWidth=3; g.stroke(); }
}
function laneField(t,th){
  const x0=fieldX(), fw=fieldW(), top=fieldTop(), jy=judgeY(), lw=laneW();
  g.save();
  g.globalAlpha=0.66; g.fillStyle='#FFFDF6';
  roundRect(x0,top,fw,H-top-H*0.03,18); g.fill(); g.globalAlpha=1;
  g.lineWidth=3; g.strokeStyle=th.ink; g.globalAlpha=.5;
  roundRect(x0,top,fw,H-top-H*0.03,18); g.stroke(); g.globalAlpha=1;
  // 레인 구분선
  g.setLineDash([6,8]); g.lineWidth=2; g.strokeStyle='rgba(43,43,43,.25)';
  for(let i=1;i<4;i++){ g.beginPath(); g.moveTo(x0+lw*i,top+8); g.lineTo(x0+lw*i,jy+lw*0.55); g.stroke(); }
  g.setLineDash([]);
  // 박자 줄
  const beat=song.beat, from=Math.ceil(nowT()/beat);
  for(let k=from;k<from+14;k++){
    const y=noteY(k*beat); if(y<top||y>jy) continue;
    g.strokeStyle= (k% (song.spb/2)===0) ? 'rgba(43,43,43,.16)' : 'rgba(43,43,43,.07)';
    g.lineWidth=2; g.beginPath(); g.moveTo(x0+4,y); g.lineTo(x0+fw-4,y); g.stroke();
  }
  // 판정선 + 리시버
  g.strokeStyle=th.ink; g.lineWidth=4; g.beginPath();
  for(let x=x0;x<=x0+fw;x+=10) g.lineTo(x, jy+Math.sin(x*0.08)*1.2);
  g.stroke();
  const bp=((t/song.beat)%1+1)%1, pulse=REDUCED?1:1+Math.max(0,0.10*(1-bp*3));
  for(let i=0;i<4;i++){
    const cx=laneX(i), r=lw*0.33*pulse;
    laneFlash[i]=Math.max(0,laneFlash[i]-0.06);
    g.globalAlpha=0.30+laneFlash[i]*0.65; g.fillStyle=LANE_COL[i];
    g.beginPath(); g.arc(cx,jy,r*(1+laneFlash[i]*0.25),0,6.3); g.fill(); g.globalAlpha=1;
    g.lineWidth=3.2; g.strokeStyle=th.ink;
    g.beginPath(); g.arc(cx,jy,r,0,6.3); g.stroke();
    g.font='700 '+Math.round(lw*0.34)+'px "Gaegu", sans-serif';
    g.textAlign='center'; g.fillStyle=th.ink; g.globalAlpha=laneHold[i]?1:0.55;
    g.fillText(LANE_KEYS[i], cx, jy+lw*0.72); g.globalAlpha=1;
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
      g.globalAlpha=1; g.lineWidth=2.6; g.strokeStyle=th.ink;
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
      g.lineWidth=2.8; g.strokeStyle=th.ink; roundRect(x-nw/2,y-nh/2,nw,nh,nh*0.45); g.stroke();
      g.globalAlpha=.5; g.fillStyle='#FFFDF6';
      roundRect(x-nw*0.36,y-nh*0.30,nw*0.72,nh*0.26,nh*0.13); g.fill(); g.globalAlpha=1;
    }
  }
}

/* ===== 캐릭터 ===== */
function drawChar(t,dt,th){
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
    f.life-=dt*(f.kind==='dust'?1.6:2.6);
    if(f.kind==='dust'){ f.x+=f.vx*dt; f.y+=f.vy*dt; f.vy+=420*dt; } else f.r+=dt*120;
  }
  fx=fx.filter(f=>f.life>0);
  for(const f of fx){
    g.globalAlpha=Math.max(0,f.life);
    if(f.kind==='dust'){ g.fillStyle=char.accent; g.beginPath(); g.arc(f.x,f.y,f.r,0,6.3); g.fill(); }
    else{ g.strokeStyle=f.kind==='perfect'?'#7BC47F':f.kind==='good'?'#A9D9F0':'#D9C4A0';
          g.lineWidth=3; g.beginPath(); g.arc(f.x,f.y,f.r,0,6.3); g.stroke(); }
  }
  g.globalAlpha=1;
  for(const tx of texts){ tx.life-=dt*1.5; tx.y-=dt*34; }
  texts=texts.filter(t=>t.life>0); if(texts.length>6) texts=texts.slice(-6);
  for(const tx of texts){
    g.globalAlpha=Math.max(0,Math.min(1,tx.life*1.4));
    g.font='700 '+(tx.big?30:24)+'px "Gaegu", sans-serif'; g.textAlign='center';
    g.fillStyle = (tx.s==='MISS'||tx.s==='놓쳤다') ? '#C9A9A9' : th.ink;
    g.save(); g.translate(tx.x,tx.y); g.rotate(-0.06); g.fillText(tx.s,0,0); g.restore();
  }
  g.globalAlpha=1;
}
function drawHud(t,th){
  const pad=18,y=18,w=W-pad*2-26;
  const p=Math.max(0,Math.min(1,t/song.end));
  g.strokeStyle=th.ink; g.lineWidth=3; g.lineCap='round';
  g.beginPath(); g.moveTo(pad,y); g.lineTo(pad+w,y); g.stroke();
  g.strokeStyle='#7BC47F'; g.lineWidth=7;
  g.beginPath(); g.moveTo(pad,y); g.lineTo(pad+w*p,y); g.stroke();
  g.fillStyle='#7BC47F';
  for(let i=0;i<4;i++){ const a=i*Math.PI/2+t;
    g.beginPath(); g.ellipse(pad+w+13+Math.cos(a)*5.5,y+Math.sin(a)*5.5,5.5,5.5,0,0,6.3); g.fill(); }
  g.font='700 22px "Gaegu", sans-serif'; g.textAlign='left'; g.fillStyle=th.ink;
  g.fillText(Math.round(score).toLocaleString('ko-KR'),pad,y+30);
  g.font='400 13px "Gowun Dodum", sans-serif'; g.globalAlpha=.7;
  g.fillText(song.title+' · '+diff.name,pad,y+50); g.globalAlpha=1;
  if(combo>1){
    g.textAlign='center'; g.fillStyle=th.ink;
    g.font='700 '+Math.min(54,28+combo*0.32)+'px "Gaegu", sans-serif';
    const cbx = fieldX()>W*0.14 ? fieldX()*0.5 : W*0.5;
    g.save(); g.translate(cbx,H*0.30); g.rotate(-0.04); g.fillText(combo,0,0);
    g.font='400 14px "Gowun Dodum", sans-serif'; g.globalAlpha=.7; g.fillText('콤보',0,20);
    g.globalAlpha=1; g.restore();
  }
  if(t<song.barDur*2){
    const left=song.barDur*2-t, n=Math.ceil(left/song.beat);
    g.textAlign='center'; g.fillStyle=th.ink; g.font='700 76px "Gaegu", sans-serif';
    g.globalAlpha=Math.min(1,(left%song.beat)/song.beat+0.25);
    g.fillText(n<=4?String(n):'준비',W/2,H*0.46); g.globalAlpha=1;
  }
}



/* ===== 집 (WASD로 돌아다니기) ===== */
const SPOTS=[
  {id:'closet', name:'옷장',  sub:'두기 고르기', x:0.15, act:()=>openModal('char')},
  {id:'shop',   name:'상점',  sub:'클로버 뽑기', x:0.48, act:()=>openModal('gacha')},
  {id:'door',   name:'현관',  sub:'노래 고르고 외출', x:0.83, act:()=>openModal('song')}
];
let hub={x:0.5,y:0.72,vx:0,vy:0,face:1,t:0,near:null,target:null,autoOpen:null};
const keys={};
function hubFloorTop(){ return H*0.50; }
function hubWalkTop(){ return hubFloorTop()+H*0.10; }
function hubFloorBot(){ return H*0.93; }
function hubDepth(y){ const t=(y-hubFloorTop())/(hubFloorBot()-hubFloorTop()); return 0.80+0.32*t; }

function drawFurniture(sp, px, py, s, glow){
  g.save(); g.translate(px,py); g.scale(s,s); g.lineWidth=3.4; g.strokeStyle='#2B2B2B';
  g.lineJoin='round';
  if(glow>0){ g.save(); g.globalAlpha=glow*0.5; g.fillStyle='#FFE9A8';
    g.beginPath(); g.ellipse(0,4,86,20,0,0,6.3); g.fill(); g.restore(); }
  if(sp.id==='closet'){
    g.fillStyle='#E8D6BC'; roundRect(-56,-150,112,150,10); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0,-146); g.lineTo(0,-6); g.stroke();
    g.fillStyle='#D9C4A0'; roundRect(-50,-142,44,132,7); g.fill(); g.stroke();
    roundRect(6,-142,44,132,7); g.fill(); g.stroke();
    g.fillStyle='#2B2B2B';
    g.beginPath(); g.arc(-10,-74,4,0,6.3); g.fill();
    g.beginPath(); g.arc(10,-74,4,0,6.3); g.fill();
    g.fillStyle='#FFB3C1'; g.beginPath();                      // 삐져나온 옷
    g.moveTo(14,-60); g.quadraticCurveTo(30,-44,18,-30); g.quadraticCurveTo(8,-42,14,-60); g.fill(); g.stroke();
  } else if(sp.id==='shop'){
    g.fillStyle='#F2E8D9'; roundRect(-46,-128,92,128,12); g.fill(); g.stroke();
    g.fillStyle='#EAF6E4'; g.beginPath(); g.arc(0,-92,34,0,6.3); g.fill(); g.stroke();
    const balls=[['#7BC47F',-14,-98],['#A9D9F0',6,-104],['#FFB3C1',12,-86],['#FFE9A8',-8,-82],['#B9A7D9',-20,-86]];
    balls.forEach(([c,bx,by],i)=>{ g.fillStyle=c; g.beginPath();
      g.arc(bx,by+Math.sin(hub.t*2+i)*1.5,8,0,6.3); g.fill(); g.stroke(); });
    g.fillStyle='#D9C4A0'; g.beginPath(); g.arc(0,-46,9,0,6.3); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(0,-46); g.lineTo(7,-52); g.stroke();
    g.fillStyle='#FFFDF6'; roundRect(-16,-30,32,20,5); g.fill(); g.stroke();
  } else {
    g.fillStyle='#E8D6BC'; roundRect(-52,-156,104,156,8); g.fill(); g.stroke();
    g.fillStyle='#F7F1E4'; roundRect(-42,-146,84,146,6); g.fill(); g.stroke();
    g.fillStyle='#2B2B2B'; g.beginPath(); g.arc(28,-74,5,0,6.3); g.fill();
    g.strokeStyle='#7BC47F'; g.lineWidth=4;                     // 클로버 리스
    g.beginPath(); g.arc(0,-112,17,0,6.3); g.stroke();
    g.fillStyle='#7BC47F'; g.strokeStyle='#2B2B2B'; g.lineWidth=2;
    for(let i=0;i<4;i++){ const a=i*Math.PI/2;
      g.beginPath(); g.arc(Math.cos(a)*17,-112+Math.sin(a)*17,5,0,6.3); g.fill(); g.stroke(); }
  }
  g.restore();
}
function drawLabel(x,y,sp,active){
  const s=active?1.08:0.92, a=active?1:0.72;
  g.save(); g.translate(x,y); g.scale(s,s); g.globalAlpha=a;
  g.font='700 20px "Gaegu", sans-serif'; g.textAlign='center';
  const w=Math.max(g.measureText(sp.name+' · '+sp.sub).width+24, 90);
  g.fillStyle=active?'#FFE9A8':'#FFFDF6'; roundRect(-w/2,-34,w,32,14); g.fill();
  g.lineWidth=3; g.strokeStyle='#2B2B2B'; g.stroke();
  g.fillStyle='#2B2B2B'; g.fillText(sp.name+' · '+sp.sub,0,-12);
  if(active){
    g.font='700 15px "Gaegu", sans-serif'; g.fillStyle='#6E6A61';
    g.fillText('E 또는 스페이스', 0, 8);
  }
  g.globalAlpha=1; g.restore();
}
function drawHub(dt){
  hub.t+=dt;
  const ft=hubFloorTop(), fb=hubFloorBot();
  // 이동
  let ax=(keys.d?1:0)-(keys.a?1:0), ay=(keys.s?1:0)-(keys.w?1:0);
  if(hub.target){
    const dx=hub.target.x-hub.x*W, dy=hub.target.y-hub.y*H;
    if(Math.hypot(dx,dy)>W*0.012){ ax=dx/Math.abs(dx||1)*Math.min(1,Math.abs(dx)/(W*0.05));
                                   ay=dy/Math.abs(dy||1)*Math.min(1,Math.abs(dy)/(H*0.05)); }
    else { hub.target=null; ax=ay=0;
           if(hub.autoOpen){ const s=hub.autoOpen; hub.autoOpen=null; s.act(); } }
  }
  const sp=W*0.34*dt;
  hub.x+=ax*sp/W; hub.y+=ay*sp*0.72/H;
  if(ax) hub.face=ax>0?1:-1;
  hub.x=Math.max(0.05,Math.min(0.95,hub.x));
  hub.y=Math.max(hubWalkTop()/H,Math.min(fb/H,hub.y));
  const px=hub.x*W, py=hub.y*H;

  // 방
  g.fillStyle='#F6EEE0'; g.fillRect(0,0,W,ft);                 // 벽
  g.strokeStyle='rgba(43,43,43,.07)'; g.lineWidth=10;
  for(let x=-20;x<W+40;x+=44){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,ft); g.stroke(); }
  g.fillStyle='#FFFDF6'; g.fillRect(0,ft,W,H-ft);              // 바닥
  g.strokeStyle='#E4DBC8'; g.lineWidth=2;
  for(let i=0;i<7;i++){ const y=ft+(H-ft)*(i/6);
    g.beginPath(); g.moveTo(0,y); g.lineTo(W,y); g.stroke(); }
  for(let i=-6;i<12;i++){ g.beginPath(); g.moveTo(W*(i/6)-W*0.3,ft); g.lineTo(W*(i/6)+W*0.35,H); g.stroke(); }
  g.strokeStyle='#2B2B2B'; g.lineWidth=3;
  g.beginPath(); g.moveTo(0,ft); g.lineTo(W,ft); g.stroke();
  // 창문
  g.fillStyle='#DCEFFA'; roundRect(W*0.62,ft-H*0.34,W*0.14,H*0.20,8); g.fill();
  g.lineWidth=3; g.strokeStyle='#2B2B2B'; g.stroke();
  g.beginPath(); g.moveTo(W*0.69,ft-H*0.34); g.lineTo(W*0.69,ft-H*0.14); g.stroke();
  g.fillStyle='#FFE9A8'; g.beginPath(); g.arc(W*0.655,ft-H*0.29,9,0,6.3); g.fill();
  // 러그
  g.fillStyle='#F2E8D9'; g.beginPath(); g.ellipse(W*0.5,H*0.80,W*0.22,H*0.09,0,0,6.3); g.fill();
  g.strokeStyle='#E0D2BA'; g.lineWidth=3; g.stroke();
  g.strokeStyle='#E8DCC6'; g.beginPath(); g.ellipse(W*0.5,H*0.80,W*0.15,H*0.06,0,0,6.3); g.stroke();
  // 화분
  (function(){ const bx=W*0.30, by=ft+H*0.03, s=Math.min(H/540,W/960);
    g.save(); g.translate(bx,by); g.scale(s,s); g.lineWidth=3; g.strokeStyle='#2B2B2B';
    g.fillStyle='#D9C4A0'; roundRect(-17,-26,34,26,6); g.fill(); g.stroke();
    g.strokeStyle='#7BC47F'; g.lineWidth=3.4;
    [[0,-64],[-15,-52],[15,-54]].forEach(([tx,ty])=>{ g.beginPath(); g.moveTo(0,-26);
      g.quadraticCurveTo(tx*0.6,(ty-26)/2,tx,ty); g.stroke();
      g.fillStyle='#7BC47F'; g.strokeStyle='#2B2B2B'; g.lineWidth=2;
      g.beginPath(); g.ellipse(tx,ty,9,6,tx*0.02,0,6.3); g.fill(); g.stroke();
      g.strokeStyle='#7BC47F'; g.lineWidth=3.4; });
    g.restore(); })();
  // 벽시계
  (function(){ const cx=W*0.365, cy=ft-H*0.33, r=Math.min(H,W)*0.042;
    g.fillStyle='#FFFDF6'; g.beginPath(); g.arc(cx,cy,r,0,6.3); g.fill();
    g.lineWidth=3; g.strokeStyle='#2B2B2B'; g.stroke();
    const a=hub.t*0.5;
    g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*r*0.6,cy+Math.sin(a)*r*0.6); g.stroke();
    g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a*12)*r*0.8,cy+Math.sin(a*12)*r*0.8); g.stroke(); })();

  // 가구 + 캐릭터를 y 순으로 그린다
  const items=SPOTS.map(s=>({sp:s, x:s.x*W, y:ft+H*0.02, z:ft+H*0.02}));
  items.push({player:true, x:px, y:py, z:py});
  items.sort((a,b)=>a.z-b.z);
  hub.near=null;
  SPOTS.forEach(s=>{ if(Math.abs(s.x*W-px)<W*0.115 && py<ft+H*0.34) hub.near=s; });
  items.forEach(it=>{
    if(it.player){
      const d=hubDepth(py), h=Math.min(H*0.26,W*0.16)*d*(char.scale||1);
      const bob=Math.abs(Math.sin(hub.t*7))*((keys.a||keys.d||keys.w||keys.s||hub.target)?7:2)*d;
      g.save(); g.globalAlpha=.12; g.fillStyle='#2B2B2B';
      g.beginPath(); g.ellipse(px,py,h*0.26,h*0.07,0,0,6.3); g.fill(); g.restore();
      const img=IMG[char.run];
      if(img&&img.complete&&img.naturalWidth){
        const w=h*(img.naturalWidth/img.naturalHeight);
        g.save(); g.translate(px,py-bob);
        if(hub.face<0 ? !char.flip : char.flip) g.scale(-1,1);
        g.drawImage(img,-w/2,-h,w,h); g.restore();
      }
    } else {
      const s=Math.min(H/540,W/960)*0.95;
      drawFurniture(it.sp, it.x, it.y, s, hub.near===it.sp?1:0);
    }
  });
  SPOTS.forEach(s=>drawLabel(s.x*W, ft-H*0.30, s, hub.near===s));

  // 안내
  g.textAlign='left'; g.font='400 14px "Gowun Dodum", sans-serif'; g.fillStyle='rgba(43,43,43,.55)';
  g.fillText('WASD / 방향키로 이동 · 가까이 가서 E', 18, H-18);
}

/* ===== 뽑기 연출 씬 (인트로 → 캐릭터 공개 → 결과) ===== */
const CUTC={
  N: {s1:'#E9F6E2',s2:'#FFFDF6',orb:'#7BC47F',ray:'rgba(123,196,127,.16)',
      plate:'#EAF6E4',label:'',intro:3.6,rev:1.6},
  R: {s1:'#DCEFFA',s2:'#FFFDF6',orb:'#A9D9F0',ray:'rgba(169,217,240,.22)',
      plate:'#DFF0FA',label:'귀한 예감!',intro:4.4,rev:2.0},
  SR:{s1:'#FFDFE9',s2:'#FFF7D6',orb:'#FF9EB5',ray:'rgba(255,158,181,.26)',
      plate:'#FFE3EC',label:'아주 귀함!',intro:5.2,rev:2.8}
};
let cut=null;

function startCut(rank, results, onDone){
  const cast=[];
  const pool=CHARS.filter(c=>c.id!==char.id);
  const pick=[char].concat(pool.sort(()=>Math.random()-0.5).slice(0,5));
  pick.forEach((c,i)=>{
    const depth=0.55+Math.random()*0.55;
    cast.push({c, depth,
      tx: W*(0.10+i*0.145)+ (Math.random()-.5)*30,
      delay: i*0.13+Math.random()*0.1,
      yOff: (1-depth)*H*0.10, ph: Math.random()*6.3});
  });
  cast.sort((a,b)=>a.depth-b.depth);
  cut={phase:'intro', t:0, rank, results, idx:0, onDone,
       cast, sparks:[], rings:[], burst:false, plateSeed:Math.random()*6.3};
  sweepUp(CUTC[rank].intro*0.92, rank);
}
function skipCut(){ if(!cut) return; const f=cut.onDone; cut=null; f(); }   // 전부 건너뛰기
function advanceCut(){                                                      // 한 컷 넘기기
  if(!cut) return;
  if(cut.phase==='intro'){ cut.t=Math.max(cut.t, CUTC[cut.rank].intro*0.90); }
  else { nextReveal(); }
}
function nextReveal(){
  cut.idx++;
  if(cut.idx>=cut.results.length){ const f=cut.onDone; cut=null; f(); return; }
  cut.t=0; cut.stamped=false; cut.plateSeed=Math.random()*6.3;
  revealSound(cut.results[cut.idx].rank);
}
function revealSound(rank){
  if(rank==='SR'){ arp([784,1175],0.13,0.16,'square'); setTimeout(shimmer,140); }
  else if(rank==='R') arp([659,988],0.12,0.13);
  else arp([587,880],0.11,0.11);
}
function swish(){
  if(!ctx) return;
  const t=ctx.currentTime, s=ctx.createBufferSource(), g2=ctx.createGain(), f=ctx.createBiquadFilter();
  s.buffer=noise(); f.type='bandpass'; f.frequency.setValueAtTime(600,t);
  f.frequency.exponentialRampToValueAtTime(4200,t+0.25); f.Q.value=1.4;
  g2.gain.setValueAtTime(0.0001,t); g2.gain.exponentialRampToValueAtTime(0.12,t+0.12);
  g2.gain.exponentialRampToValueAtTime(0.0001,t+0.3);
  s.connect(f); f.connect(g2); g2.connect(master); s.start(t); s.stop(t+0.35);
}
function sprite(key,x,y,h,rot,alpha,flip){
  const img=IMG[key];
  if(!img||!img.complete||!img.naturalWidth) return;
  const w=h*(img.naturalWidth/img.naturalHeight);
  g.save(); g.globalAlpha=alpha===undefined?1:alpha;
  g.translate(x,y); g.rotate(rot||0);
  if(flip) g.scale(-1,1);
  g.drawImage(img,-w/2,-h,w,h); g.restore();
}
function rays(cx,cy,spin,col,alpha,n){
  g.save(); g.translate(cx,cy); g.rotate(spin);
  const R=Math.max(W,H)*1.3;
  for(let i=0;i<(n||14);i++){
    g.rotate(Math.PI*2/(n||14));
    g.beginPath(); g.moveTo(0,0);
    g.lineTo(Math.cos(-0.055)*R,Math.sin(-0.055)*R);
    g.lineTo(Math.cos(0.055)*R,Math.sin(0.055)*R);
    g.closePath(); g.globalAlpha=alpha; g.fillStyle=col; g.fill();
  }
  g.restore(); g.globalAlpha=1;
}
function roundRect(x,y,w,h,r){
  g.beginPath();
  g.moveTo(x+r,y); g.lineTo(x+w-r,y); g.quadraticCurveTo(x+w,y,x+w,y+r);
  g.lineTo(x+w,y+h-r); g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  g.lineTo(x+r,y+h); g.quadraticCurveTo(x,y+h,x,y+h-r);
  g.lineTo(x,y+r); g.quadraticCurveTo(x,y,x+r,y); g.closePath();
}
const easeOut=t=>1-Math.pow(1-t,3);
const easeBack=t=>{ const c=1.70158+1; return 1+c*Math.pow(t-1,3)+1.70158*Math.pow(t-1,2); };

/* ── 인트로: 두기들이 모여들고 클로버가 터진다 ── */
function drawIntro(dt){
  const C=CUTC[cut.rank], dur=C.intro, p=Math.min(1,cut.t/dur);
  const ox=W*0.5, oy=H*0.40, gy=H*0.84;
  const heat=Math.max(0,Math.min(1,(p-0.34)/0.52));

  let sx=0,sy=0;
  if(p>0.60 && p<0.90){ const k=(cut.rank==='SR'?8:cut.rank==='R'?5:2.5)*heat;
    sx=(Math.random()-.5)*k; sy=(Math.random()-.5)*k; }
  g.save(); g.translate(sx,sy);

  const grd=g.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,C.s1); grd.addColorStop(1,C.s2);
  g.fillStyle=grd; g.fillRect(-20,-20,W+40,H+40);
  if(p>0.10) rays(ox,oy,cut.t*(0.35+heat*2.0),C.ray,0.22+heat*0.7);

  if(Math.random()<0.45+heat) cut.sparks.push({x:Math.random()*W,y:H+10,
    v:50+Math.random()*170*(1+heat), r:2+Math.random()*4, a:1});
  cut.sparks.forEach(s=>{ if(s.vx!==undefined){ s.x+=s.vx*dt; s.y+=s.vy*dt; s.vy+=480*dt; }
                          else s.y-=s.v*dt; s.a-=dt*0.35; });
  cut.sparks=cut.sparks.filter(s=>s.a>0 && s.y>-30);
  cut.sparks.forEach(s=>{ g.globalAlpha=Math.max(0,s.a)*0.85; g.fillStyle=C.orb;
    g.beginPath(); g.arc(s.x,s.y,s.r,0,6.3); g.fill(); });
  g.globalAlpha=1;

  g.strokeStyle='rgba(43,43,43,.45)'; g.lineWidth=3;
  g.beginPath(); for(let x=0;x<=W;x+=14) g.lineTo(x,gy+Math.sin((x+cut.t*160)*0.03)*1.6); g.stroke();

  // 두기들이 하나씩 달려 들어와 자리를 잡는다
  cut.cast.forEach(m=>{
    const lt=Math.max(0, cut.t-m.delay), run=Math.min(1, lt/0.85);
    const x=-W*0.15+(m.tx+W*0.15)*easeOut(run);
    const h=Math.min(H*0.20, W*0.13)*m.depth*(m.c.scale||1);
    const base=gy-m.yOff;
    let y=base, rot=0, key=m.c.run;
    if(run<1) y=base-Math.abs(Math.sin(lt*22))*9*m.depth;              // 달려온다
    else if(p<0.86) y=base-Math.abs(Math.sin(cut.t*5+m.ph))*5*(1+heat); // 제자리 통통
    else {                                                              // 놀라서 점프
      const jp=Math.min(1,(p-0.86)/0.14);
      y=base-Math.sin(jp*Math.PI)*H*0.13*m.depth; key=m.c.jump; rot=(m.c.jumpRot||-0.15)*0.8;
    }
    sprite(key, x, y, h, rot, 0.55+0.45*m.depth, m.c.flip);
  });

  // 네잎클로버
  if(p>0.30){
    const drop=Math.min(1,(p-0.30)/0.16);
    const oyy=oy-(1-easeOut(drop))*H*0.6;
    const R=Math.min(W,H)*0.10*(0.6+0.4*drop+heat*0.5);
    const jx=(Math.random()-.5)*7*heat, jy=(Math.random()-.5)*7*heat;
    const hal=g.createRadialGradient(ox+jx,oyy+jy,R*0.4,ox+jx,oyy+jy,R*3);
    hal.addColorStop(0,C.ray); hal.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=hal; g.beginPath(); g.arc(ox+jx,oyy+jy,R*3,0,6.3); g.fill();
    g.save(); g.translate(ox+jx,oyy+jy); g.rotate(cut.t*0.7);
    g.strokeStyle='#2B2B2B'; g.lineWidth=3;
    g.beginPath(); g.moveTo(0,R*0.3); g.quadraticCurveTo(R*0.3,R*1.0,R*0.15,R*1.5); g.stroke();
    for(let i=0;i<4;i++){ g.rotate(Math.PI/2); wobble(0,-R*0.62,R*0.46,i*1.7,C.orb,'#2B2B2B'); }
    g.fillStyle='#2B2B2B'; g.beginPath(); g.arc(0,0,R*0.10,0,6.3); g.fill();
    if(p>0.66){
      g.strokeStyle='#2B2B2B'; g.lineWidth=2.5; g.globalAlpha=Math.min(1,(p-0.66)/0.18);
      g.beginPath(); g.moveTo(-R*0.5,-R*0.3); g.lineTo(-R*0.1,0); g.lineTo(-R*0.35,R*0.4); g.stroke();
      g.beginPath(); g.moveTo(R*0.45,-R*0.35); g.lineTo(R*0.1,R*0.05); g.stroke();
      g.globalAlpha=1;
    }
    g.restore();
  }

  if(p>=0.88 && !cut.burst){
    cut.burst=true;
    for(let i=0;i<46;i++){ const a=Math.random()*6.283, v=220+Math.random()*560;
      cut.sparks.push({x:ox,y:oy,r:3+Math.random()*5,a:1,vx:Math.cos(a)*v,vy:Math.sin(a)*v}); }
    cut.rings.push({r:10,a:1},{r:10,a:1,d:0.14});
    if(cut.rank==='SR'){ arp([660,880,1175,1568],0.075,0.16,'square'); shimmer(); }
    else if(cut.rank==='R') arp([740,988],0.09,0.13); else arp([680],0,0.11);
  }
  cut.rings.forEach(r=>{ if(r.d>0){ r.d-=dt; return; } r.r+=dt*Math.max(W,H)*1.5; r.a-=dt*1.3; });
  cut.rings=cut.rings.filter(r=>r.a>0);
  cut.rings.forEach(r=>{ g.globalAlpha=Math.max(0,r.a); g.strokeStyle=C.orb; g.lineWidth=6;
    g.beginPath(); g.arc(ox,oy,r.r,0,6.3); g.stroke(); });
  g.globalAlpha=1;

  if(p>=0.88){
    const f=Math.max(0,1-(p-0.88)/0.10);
    g.globalAlpha=f*0.95; g.fillStyle='#FFF'; g.fillRect(-20,-20,W+40,H+40); g.globalAlpha=1;
    if(C.label){
      const pop=Math.min(1,(p-0.90)/0.06);
      g.save(); g.translate(W/2,H*0.26); g.scale(0.7+0.45*pop,0.7+0.45*pop); g.rotate(-0.04);
      g.textAlign='center'; g.font='700 '+Math.round(Math.min(W,H)*0.11)+'px "Gaegu", sans-serif';
      g.lineWidth=7; g.strokeStyle='#2B2B2B'; g.strokeText(C.label,0,0);
      g.fillStyle=cut.rank==='SR'?'#FFD36E':'#FFFDF6'; g.fillText(C.label,0,0);
      g.restore();
    }
  }
  g.restore();

  if(p>=1){ cut.phase='reveal'; cut.t=0; cut.idx=0; cut.stamped=false;
            cut.sparks=[]; cut.rings=[]; revealSound(cut.results[0].rank); }
}

/* ── 캐릭터 공개: 한 명씩 이름판과 함께 ── */
function drawReveal(dt){
  const r=cut.results[cut.idx], C=CUTC[r.rank];
  const dur=C.rev, q=Math.min(1,cut.t/dur);
  const cx=W*0.60, gy=H*0.86;

  let sx=0,sy=0;
  if(r.rank==='SR' && q>0.12 && q<0.24){ sx=(Math.random()-.5)*10; sy=(Math.random()-.5)*10; }
  g.save(); g.translate(sx,sy);

  const grd=g.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,C.s1); grd.addColorStop(1,C.s2);
  g.fillStyle=grd; g.fillRect(-20,-20,W+40,H+40);
  rays(cx,H*0.42,cut.t*0.45,C.ray,0.30, r.rank==='SR'?18:12);

  // 캐릭터 등장
  const inP=Math.min(1,q/0.30);
  let x=cx, y=gy, rot=0, sc=1;
  if(r.rank==='SR'){                       // 정면에서 쾅
    sc=1+2.0*(1-easeOut(inP)); rot=0.18*(1-inP);
  } else {                                 // 옆에서 슝
    x=cx+(W*0.55)*(1-easeBack(inP)); rot=0.35*(1-inP);
  }
  const squash=q>0.30&&q<0.46 ? 1+0.10*Math.sin((q-0.30)/0.16*Math.PI) : 1;
  const bob=q>0.46 ? Math.sin(cut.t*3.4)*6 : 0;
  const H0=Math.min(H*0.52, W*0.34)*(r.c.scale||1)*sc;
  sprite(r.c.run, x, y-bob, H0/squash, rot, Math.min(1,q/0.12), r.c.flip);

  if(q<0.16){ const f=1-q/0.16;             // 등장 섬광
    g.globalAlpha=f*0.8; g.fillStyle='#FFF'; g.fillRect(-20,-20,W+40,H+40); g.globalAlpha=1; }

  // 이름판 — 왼쪽에서 따단
  if(q>0.30){
    const pp=Math.min(1,(q-0.30)/0.22), e=easeBack(pp);
    const pw=Math.min(W*0.46,340), ph=Math.min(H*0.30,116);
    const px=-pw+(W*0.06+pw)*e, py=H*0.30;
    g.save(); g.translate(px,py); g.rotate(-0.025+Math.sin(cut.t*1.6)*0.006);
    g.fillStyle=C.plate; roundRect(0,0,pw,ph,18); g.fill();
    g.lineWidth=3.5; g.strokeStyle='#2B2B2B'; g.stroke();
    g.save(); roundRect(0,0,pw,ph,18); g.clip();      // 빛 훑기
    const sw=((cut.t*0.9)%1.6)/1.6;
    const sg=g.createLinearGradient(pw*(sw*1.6-0.4),0,pw*(sw*1.6-0.1),ph);
    sg.addColorStop(0,'rgba(255,255,255,0)'); sg.addColorStop(0.5,'rgba(255,255,255,.75)');
    sg.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=sg; g.fillRect(0,0,pw,ph); g.restore();

    g.textAlign='left'; g.fillStyle='#C8A94B';
    g.font='700 '+Math.round(ph*0.20)+'px "Gaegu", sans-serif';
    g.fillText('★'.repeat(STARS[r.rank])+'  '+RARITY[r.rank].name, 18, ph*0.28);
    g.fillStyle='#2B2B2B';
    g.font='700 '+Math.round(ph*0.36)+'px "Gaegu", sans-serif';
    g.fillText(r.c.name, 16, ph*0.66);
    g.fillStyle='#6E6A61'; g.font='400 '+Math.round(ph*0.155)+'px "Gowun Dodum", sans-serif';
    g.fillText(r.c.meta, 18, ph*0.86);
    g.restore();
  }

  // NEW 도장 / 겹침 표시
  if(q>0.50){
    const st=Math.min(1,(q-0.50)/0.16);
    const scl=1+1.6*(1-easeOut(st));
    g.save(); g.translate(W*0.30, H*0.24); g.rotate(-0.30+0.30*(1-st)); g.scale(scl,scl);
    if(r.isNew){
      g.fillStyle='#FFB3C1'; roundRect(-52,-22,104,44,12); g.fill();
      g.lineWidth=4; g.strokeStyle='#2B2B2B'; g.stroke();
      g.textAlign='center'; g.fillStyle='#2B2B2B';
      g.font='700 30px "Gaegu", sans-serif'; g.fillText('NEW', 0, 11);
    } else {
      g.fillStyle='#EAF6E4'; roundRect(-68,-20,136,40,12); g.fill();
      g.lineWidth=3.5; g.strokeStyle='#2B2B2B'; g.stroke();
      g.textAlign='center'; g.fillStyle='#4E8A52';
      g.font='700 24px "Gaegu", sans-serif'; g.fillText('겹침 +'+r.refund, 0, 9);
    }
    g.restore();
    if(!cut.stamped){ cut.stamped=true; blip(r.isNew?1180:520, 0.1);
      if(r.rank==='SR') for(let i=0;i<22;i++){ const a=Math.random()*6.283, v=160+Math.random()*320;
        cut.sparks.push({x:cx,y:H*0.55,r:3+Math.random()*4,a:1,vx:Math.cos(a)*v,vy:Math.sin(a)*v}); } }
  }

  // 반짝이
  if(r.rank!=='N' && Math.random()<0.6) cut.sparks.push({x:Math.random()*W,y:H+8,
    v:70+Math.random()*150, r:2+Math.random()*3, a:1});
  cut.sparks.forEach(s=>{ if(s.vx!==undefined){ s.x+=s.vx*dt; s.y+=s.vy*dt; s.vy+=430*dt; }
                          else s.y-=s.v*dt; s.a-=dt*0.5; });
  cut.sparks=cut.sparks.filter(s=>s.a>0 && s.y>-20);
  cut.sparks.forEach(s=>{ g.globalAlpha=Math.max(0,s.a)*0.85; g.fillStyle=C.orb;
    g.beginPath(); g.arc(s.x,s.y,s.r,0,6.3); g.fill(); });
  g.globalAlpha=1;

  // 몇 번째인지
  g.textAlign='right'; g.fillStyle='rgba(43,43,43,.45)';
  g.font='400 15px "Gowun Dodum", sans-serif';
  g.fillText((cut.idx+1)+' / '+cut.results.length, W-18, 30);
  g.restore();

  if(q>=1) nextReveal();
}

function drawCut(dt){
  cut.t+=dt;
  if(cut.phase==='intro') drawIntro(dt); else drawReveal(dt);
}

/* ===== 루프 ===== */
let last=performance.now();
function frame(ts){
  const dt=Math.min(0.05,(ts-last)/1000); last=ts;
  if(mode==='cut' && cut){ drawCut(dt); requestAnimationFrame(frame); return; }
  if(mode==='hub'){ drawHub(dt); requestAnimationFrame(frame); return; }
  const playing = mode==='play', frozen = mode==='pause';
  const t = (playing||frozen) ? nowT() : ts/1000;
  const prog = (playing||frozen) ? Math.max(0,Math.min(1,t/song.end)) : (ts/9000)%1;
  const th = lerpTheme(THEMES[song.theme], prog);

  if(playing){
    const look=t+0.25;
    while(evIndex<events.length && events[evIndex].t<look){ events[evIndex].f(); evIndex++; }
    for(const n of notes){
      if(!n.judged && t-n.t>WIN.good) miss(n);
      if(n.holding && t>=n.t+n.dur){
        n.holding=false; n.done=true; score+=40*diff.mult;
        combo++; maxCombo=Math.max(maxCombo,combo); hitSound(n.lane,'perfect');
        fx.push({x:laneX(n.lane),y:judgeY(),r:12,life:1,kind:'perfect'});
        texts.length=0; texts.push({x:W*0.5,y:judgeY()-H*0.24,life:1,s:'쓰왜!'});
      }
      if(n.holding && !laneHold[n.lane] && t<n.t+n.dur-0.12){              // 놓으면 그 자리에서 끝
        n.holding=false; n.done=true;
        texts.length=0; texts.push({x:W*0.5,y:judgeY()-H*0.24,life:1,s:'놓쳤다'});
        for(let i=0;i<4;i++) fx.push({x:laneX(n.lane),y:judgeY(),life:.7,kind:'dust',
          vx:(Math.random()-.5)*120,vy:-30-Math.random()*80,r:2+Math.random()*3});
      }
    }
    const section=Math.floor(t/(song.barDur*4));
    if(section!==lastSection){ lastSection=section; if(t>0) spawnFlyer(); }
    if(t>song.end+0.9) endGame();
  }
  const beat=((t/(song?song.beat:0.5))%1+1)%1;
  const pulse=REDUCED?1:1+Math.max(0,0.012*(1-beat*4));
  g.save(); g.translate(W/2,H/2); g.scale(pulse,pulse); g.translate(-W/2,-H/2);
  scene(Math.max(0,t),th,prog);
  if(playing) spawnParticles(dt,th);
  drawFlyers(playing?dt:dt*0.6,th);
  drawParticles(playing?dt:dt*0.6);
  if(playing||frozen){
    laneField(t,th); drawNotes(t,th); drawChar(t,playing?dt:0,th); drawFx(playing?dt:0,th); drawHud(t,th);
  } else {
    drawChar(ts/1000,dt,th);
  }
  g.restore();
  requestAnimationFrame(frame);
}
seedScenery();
stars=Array.from({length:40},()=>({x:Math.random(),y:Math.random()*0.55,r:Math.random()*1.6+0.7,p:Math.random()*6.3}));
resize(); toTitle();
requestAnimationFrame(frame);
