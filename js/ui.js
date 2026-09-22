"use strict";
/* 상태·화면·입력·뽑기·세이브 — 꺅두기 러닝비트 */

/* ===== 상태 ===== */
const cv=document.getElementById('cv'), g=cv.getContext('2d');
const $=id=>document.getElementById(id);
const titleScreen=$('titleScreen'), resultScreen=$('resultScreen'),
      pauseScreen=$('pauseScreen'), pauseBtn=$('pauseBtn'), modal=$('modal'),
      homeBar=$('homeBar');

let W=960,H=540,dpr=1;
function resize(){
  const r=cv.getBoundingClientRect();
  dpr=Math.min(window.devicePixelRatio||1,2);
  W=Math.max(320,r.width); H=Math.max(180,r.height);
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  g.setTransform(dpr,0,0,dpr,0,0);
}
new ResizeObserver(resize).observe(cv);
const REDUCED=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const BASE_WIN={perfect:0.06,great:0.12,good:0.18};
const VAL={perfect:1,great:0.6,good:0.2};
const LABEL={perfect:'PERFECT',great:'GREAT',good:'GOOD',miss:'MISS'};

let mode='title';
let char=CHARS[0], song=SONGS[0], diff=DIFFS[0];
let notes=[], events=[], evIndex=0, WIN={...BASE_WIN}, APPROACH=2.0;
let score=0, combo=0, maxCombo=0, tally={perfect:0,great:0,good:0,miss:0}, accSum=0;
let charState='run', charTimer=0, jumpT=0, hitBounce=0;
const laneHold=[false,false,false,false], laneFlash=[0,0,0,0], laneBeam=[0,0,0,0],
      laneMiss=[0,0,0,0], touchLane={};
let comboPop=0, shakeT=0, perfectStreak=0;
let fx=[], texts=[], parts=[], stars=[], flyers=[], lastSection=-1;
let best=loadBest();

function loadBest(){ try{ return JSON.parse(localStorage.getItem('ggakdugi.best2')||'{}'); }catch(e){ return {}; } }
function saveBest(){ try{ localStorage.setItem('ggakdugi.best2',JSON.stringify(best)); }catch(e){} }
const bestKey=(s,d)=>s.id+'/'+d.id;

/* ===== 설정 ===== */
const DEFAULT_KEYS=['KeyA','KeyS','KeyK','KeyL'];
const KEY_LABEL={ArrowLeft:'←',ArrowRight:'→',ArrowUp:'↑',ArrowDown:'↓',Space:'공백',
                 Semicolon:';',Quote:"'",Comma:',',Period:'.',Slash:'/',BracketLeft:'[',BracketRight:']'};
function keyLabel(code){
  if(KEY_LABEL[code]) return KEY_LABEL[code];
  if(code.startsWith('Key')) return code.slice(3);
  if(code.startsWith('Digit')) return code.slice(5);
  return code;
}
const SKINS={
  basic:{name:'기본',     col:['#7BC47F','#A9D9F0','#FFB3C1','#FFD98A'], need:0},
  milk: {name:'딸기우유', col:['#FFC7D6','#FFA9C0','#F58BA8','#E3淡'.slice(0,7)], need:9},
  mint: {name:'민트소다', col:['#9FE6CB','#7FD8E8','#A9D9F0','#CBF2E4'], need:13}
};
SKINS.milk.col[3]='#E97396';
let settings={ keys:[...DEFAULT_KEYS], speed:1.0, offset:0,
               volMusic:1, volBgm:1, volSfx:1, skin:'basic' };
let LANE_COL=[...SKINS.basic.col];
function applySkin(){ LANE_COL=[...(SKINS[settings.skin]||SKINS.basic).col]; }
function laneOfCode(code){ const i=settings.keys.indexOf(code); return i<0?undefined:i; }

/* ===== 도감 보상 ===== */
const DEX_REWARDS=[
  {id:'r5',  need:5,  label:'클로버 300',                 apply:()=>{ clover+=300; }},
  {id:'r9',  need:9,  label:'노트 스킨 · 딸기우유',        apply:()=>{ unlockSkin('milk'); }},
  {id:'r13', need:13, label:'노트 스킨 · 민트소다, 클로버 500', apply:()=>{ unlockSkin('mint'); clover+=500; }},
  {id:'r18', need:18, label:'도감 완성! 클로버 1500',      apply:()=>{ clover+=1500; }}
];
let claimed=[], skins=['basic'];
function unlockSkin(id){ if(!skins.includes(id)) skins.push(id); }
function checkRewards(){
  const got=[];
  DEX_REWARDS.forEach(r=>{
    if(own.size>=r.need && !claimed.includes(r.id)){ claimed.push(r.id); r.apply(); got.push(r); }
  });
  if(got.length){ save(); refreshPicks(); showToast('도감 보상!', got.map(r=>r.need+'종 달성 — '+r.label)); }
}
function nextReward(){ return DEX_REWARDS.find(r=>!claimed.includes(r.id)); }
let toastTimer=null;
function showToast(title, lines){
  const el=$('toast');
  el.innerHTML='<h4>'+title+'</h4>'+lines.map(l=>'<p>'+l+'</p>').join('');
  el.hidden=false;
  if(toastTimer) clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>{ el.hidden=true; }, 4600);
  arp([660,880,1175],0.09,0.13);
}

/* ===== 세이브: 클로버 · 보유 캐릭터 ===== */
const START_OWN=['wool','proud','baby'];
let clover=1200, own=new Set(START_OWN), pity=0, freshIds=new Set();
(function loadSave(){
  try{
    const s=JSON.parse(localStorage.getItem('ggakdugi.save')||'null');
    if(s){ clover=s.clover??1200; pity=s.pity||0;
           own=new Set((s.own&&s.own.length?s.own:START_OWN));
           claimed=s.claimed||[]; skins=s.skins||['basic'];
           if(s.settings) settings=Object.assign(settings, s.settings);
           if(!Array.isArray(settings.keys)||settings.keys.length!==4) settings.keys=[...DEFAULT_KEYS];
           if(!skins.includes(settings.skin)) settings.skin='basic'; }
  }catch(e){}
  START_OWN.forEach(id=>own.add(id));
  applySkin();
})();
function save(){ try{ localStorage.setItem('ggakdugi.save',
  JSON.stringify({clover:Math.round(clover), own:[...own], pity, claimed, skins, settings})); }catch(e){} }

/* ===== 뽑기 ===== */
const PULL1=110, PULL10=1000;
const REFUND={N:30,R:60,SR:120};
const RATE=[['N',55],['R',32],['SR',13]];
const POOL=rk=>CHARS.filter(c=>c.rank===rk);
const STARS={base:1,N:1,R:2,SR:3,SSR:4};

function rollRank(force){
  if(force==='R+') return Math.random()<0.28 ? 'SR' : 'R';
  if(pity>=29) return 'SR';
  let r=Math.random()*100;
  for(const [rk,w] of RATE){ if(r<w) return rk; r-=w; }
  return 'N';
}
function pull(n){
  const cost = n===10 ? PULL10 : PULL1;
  if(clover<cost) return null;
  clover-=cost;
  const got=[];
  for(let i=0;i<n;i++){
    const force = (n===10 && i===9 && !got.some(g=>g.rank!=='N')) ? 'R+' : null;
    const rk=rollRank(force);
    pity = rk==='SR' ? 0 : pity+1;
    const list=POOL(rk);
    const c=list[Math.floor(Math.random()*list.length)];
    const isNew=!own.has(c.id);
    if(isNew){ own.add(c.id); freshIds.add(c.id); }
    else clover+=REFUND[rk];
    got.push({c, rank:rk, isNew, refund:isNew?0:REFUND[rk]});
  }
  save();
  setTimeout(checkRewards, 400);
  return got;
}
function cloverReward(grade, mult, combo){
  const base={'새싹':40,'잎사귀':70,'세잎':110,'네잎클로버':180}[grade]||40;
  return Math.round(base*mult + combo*1.2);
}

/* ===== 고르기: 버튼 + 모달 ===== */
let modalOpen=null;
const CLOVER_SVG='<svg class="cv" viewBox="0 0 20 20" aria-hidden="true">'+
  '<g fill="#7BC47F" stroke="#2B2B2B" stroke-width="1.3">'+
  '<circle cx="10" cy="5.6" r="3.5"/><circle cx="14.4" cy="10" r="3.5"/>'+
  '<circle cx="10" cy="14.4" r="3.5"/><circle cx="5.6" cy="10" r="3.5"/></g>'+
  '<path d="M10 11 L10 19" stroke="#7BC47F" stroke-width="1.6" fill="none"/></svg>';

function refreshPicks(){
  $('titleArt').src = SRC[char.run];
  $('wallet').innerHTML = CLOVER_SVG+'<b>'+Math.round(clover).toLocaleString('ko-KR')+'</b>'+
    '<span>도감 '+own.size+'/'+CHARS.length+'</span>';
}
function card(html, on, pressed, cls){
  const b=document.createElement('button');
  b.type='button'; b.className='card'+(cls?' '+cls:''); b.setAttribute('aria-pressed',pressed);
  b.innerHTML=html; b.onclick=on; return b;
}
function starRow(rk){ return '<span class="stars">'+'★'.repeat(STARS[rk])+'</span>'; }

function dexCard(c2){
  const has=own.has(c2.id), isNew=freshIds.has(c2.id);
  const b=document.createElement('button');
  b.type='button';
  b.className='dcard r-'+c2.rank+(has?'':' locked')+(c2===char?' sel':'');
  b.setAttribute('aria-pressed', c2===char);
  b.innerHTML =
    starRow(c2.rank)+
    (isNew?'<span class="newbadge">NEW</span>':'')+
    '<span class="art"><img alt="" src="'+SRC[c2.run]+'"></span>'+
    '<span class="nm">'+(has?c2.name:'???')+'</span>'+
    '<span class="meta">'+(has?c2.meta:RARITY[c2.rank].name)+'</span>';
  b.onclick=()=>{ freshIds.delete(c2.id); openCharDetail(c2); };
  return b;
}
function buildDex(body){
  const bar=document.createElement('div'); bar.className='dexbar';
  const nx=nextReward(), pct=Math.round(own.size/CHARS.length*100);
  bar.innerHTML='<div class="track"><div class="fill" style="width:'+pct+'%"></div></div>'+
    '<div class="cap"><span><b>'+own.size+'</b> / '+CHARS.length+' 종</span>'+
    '<span>'+(nx ? '다음 보상 — '+nx.need+'종에서 '+nx.label : '보상 전부 받음!')+'</span></div>';
  body.appendChild(bar);
  const wrap=document.createElement('div'); wrap.className='dex';
  ['base','SR','R','N','SSR'].forEach(rk=>{
    const list=CHARS.filter(x=>x.rank===rk), soon=COMING.filter(x=>x.rank===rk);
    if(!list.length && !soon.length) return;
    const grp=document.createElement('div'); grp.className='rgroup';
    const have=list.filter(x=>own.has(x.id)).length;
    grp.innerHTML='<div class="rlabel"><i style="background:'+RARITY[rk].color+'"></i>'+
      '<b>'+RARITY[rk].name+'</b> '+starRow(rk)+
      '<span>'+(list.length?have+'/'+list.length+' · ':'')+RARITY[rk].note+'</span></div>';
    const row=document.createElement('div'); row.className='dexrow';
    list.forEach(c2=>row.appendChild(dexCard(c2)));
    soon.forEach(s=>{
      const d=document.createElement('div'); d.className='dcard r-'+rk+' soon';
      d.innerHTML=starRow(rk)+'<span class="art"><b>3D</b></span>'+
        '<span class="nm">'+s.name+'</span><span class="meta">준비 중</span>';
      row.appendChild(d);
    });
    grp.appendChild(row); wrap.appendChild(grp);
  });
  body.appendChild(wrap);
}

function openModal(kind){
  modalOpen=kind;
  const body=$('modalBody'); body.innerHTML='';
  const sheet=modal.querySelector('.sheet');
  sheet.className='sheet'+(kind==='char'?' wide':'')+(kind==='gacha'?' wide':'');
  $('modalClose').textContent='확인'; $('modalClose').hidden=false;

  if(kind==='char'){
    $('modalTitle').textContent='두기 도감';
    $('modalHint').textContent='두기를 누르면 자세히 볼 수 있어요';
    buildDex(body);
  } else if(kind==='song'){
    $('modalTitle').textContent='노래 고르기';
    $('modalHint').textContent='곡을 누르면 앞부분이 들려요 · 난이도를 눌러 고르세요';
    $('modalClose').textContent='닫기';
    const list=document.createElement('div'); list.className='songlist'; body.appendChild(list);
    const rows=[];
    const paint=()=>rows.forEach(({el,s})=>{
      el.classList.toggle('on', s===song);
      el.querySelectorAll('.lv').forEach(b=>
        b.setAttribute('aria-pressed', s===song && b.dataset.d===diff.id));
      const bs=best[bestKey(s,diff)];
      el.querySelector('.sbest').textContent = bs ? '최고 '+bs.toLocaleString('ko-KR') : '기록 없음';
    });
    SONGS.forEach(s=>{
      const el=document.createElement('div'); el.className='songrow';
      const levels=DIFFS.map(d=>{
        const n=buildChart(s,d.id).length, lv=Math.max(1,Math.round(n/s.end*6*10)/1|0);
        return '<button class="lv d-'+d.id+'" data-d="'+d.id+'" type="button">'+
               '<b>'+d.name+'</b><span>Lv '+Math.max(1,Math.round(n/s.end*6))+'</span></button>';
      }).join('');
      el.innerHTML='<span class="cover">'+COVERS[s.id]+'</span>'+
        '<span class="sinfo"><span class="stitle">'+s.title+'</span>'+
        '<span class="smeta">'+s.mood+' · '+s.bpm+' BPM · '+Math.round(s.end)+'초</span>'+
        '<span class="sbest"></span></span>'+
        '<span class="levels">'+levels+'</span>';
      el.querySelector('.cover').onclick=()=>{ song=s; paint(); preview(s); refreshPicks(); };
      el.querySelector('.sinfo').onclick=()=>{ song=s; paint(); preview(s); refreshPicks(); };
      el.querySelectorAll('.lv').forEach(b=>b.onclick=()=>{
        song=s; diff=DIFFS.find(d=>d.id===b.dataset.d); paint(); preview(s); refreshPicks(); });
      list.appendChild(el); rows.push({el,s});
    });
    paint();
    const bar=document.createElement('div'); bar.className='row'; bar.style.marginTop='4px';
    const go=document.createElement('button');
    go.className='btn'; go.id='goBtn'; go.type='button'; go.textContent='이 곡으로 출발!';
    go.onclick=()=>{ closeModal(); startGame(); };
    const back=document.createElement('button');
    back.className='btn ghost small'; back.type='button'; back.textContent='닫기';
    back.onclick=closeModal;
    bar.appendChild(go); bar.appendChild(back); body.appendChild(bar);
    $('modalClose').hidden=true;
  } else if(kind==='diff'){
    $('modalTitle').textContent='난이도';
    $('modalHint').textContent='';
    const row=document.createElement('div'); row.className='row'; body.appendChild(row);
    DIFFS.forEach(d=>{
      const n=buildChart(song,d.id).length;
      row.appendChild(card(
        '<span class="nm">'+d.name+'</span><span class="meta">'+d.hint+'<br>노트 '+n+'개 · 점수 x'+d.mult+'</span>',
        ()=>{ diff=d; refreshPicks(); closeModal(); }, d===diff, 'song'));
    });
  } else if(kind==='settings'){
    $('modalTitle').textContent='설정';
    $('modalHint').textContent='';
    buildSettings(body);
  } else if(kind==='gacha'){
    $('modalTitle').textContent='클로버 뽑기';
    $('modalHint').textContent='';
    buildGacha(body);
  }
  modal.hidden=false;
  sheet.scrollTop=0; sheet.setAttribute('tabindex','-1'); sheet.focus({preventScroll:true});
}
function closeModal(){ modalOpen=null; modal.hidden=true; refreshPicks();
  if(mode==='hub') refreshHomeBar(); }

/* ===== 뽑기 연출 씬 ===== */
let lastPull=null;
const RANKSOUND={
  N: ()=>arp([680],0,0.10),
  R: ()=>arp([740,988],0.09,0.12),
  SR:()=>{ arp([660,880,1175,1568],0.075,0.15,'square'); shimmer(); }
};
function playCutscene(got){
  lastPull=got;
  const top = got.some(r=>r.rank==='SR') ? 'SR' : got.some(r=>r.rank==='R') ? 'R' : 'N';
  modal.hidden=true; modalOpen=null;
  show(null); pauseBtn.hidden=true; homeBar.hidden=true; bgmStop();
  $('skipBtn').hidden=false; $('tapHint').hidden=false;
  mode='cut';
  startCut(top, got, ()=>{
    $('skipBtn').hidden=true; $('tapHint').hidden=true;
    mode='hub'; show(null); homeBar.hidden=false; refreshPicks(); refreshHomeBar(); bgmStart();
    openModal('gacha');
  });
}
function decorate(el, rank){
  if(rank==='N') return;
  const ring=document.createElement('span');
  ring.className='ring'; ring.style.setProperty('--rc', rank==='SR'?'#FF9EB5':'#A9D9F0');
  el.appendChild(ring);
  if(rank==='SR'){
    for(let k=0;k<9;k++){
      const s=document.createElement('span'); s.className='spark';
      const a=k/9*6.283, d=42+Math.random()*34;
      s.style.setProperty('--dx',(Math.cos(a)*d).toFixed(1)+'px');
      s.style.setProperty('--dy',(Math.sin(a)*d).toFixed(1)+'px');
      s.style.animationDelay=(Math.random()*0.12)+'s';
      el.appendChild(s);
    }
  }
}
function renderPullResult(got){
  const st=$('gStage'); if(!st) return;
  const top = got.some(r=>r.rank==='SR') ? 'SR' : got.some(r=>r.rank==='R') ? 'R' : 'N';
  st.innerHTML=''; st.classList.toggle('hasbanner', top==='SR');
  if(top==='SR'){
    const bn=document.createElement('div'); bn.className='banner'; bn.textContent='아주 귀함 등장!';
    st.appendChild(bn);
  }
  const grid=document.createElement('div'); grid.className='gresult'; st.appendChild(grid);
  const step = got.length>1 ? 95 : 0;
  got.forEach((r,i)=>{
    const el=document.createElement('div');
    el.className='gcard r-'+r.rank+(r.rank==='SR'?' shine':'');
    el.style.animationDelay=(i*step/1000)+'s';
    el.innerHTML=starRow(r.rank)+
      (r.isNew?'<span class="newbadge">NEW</span>':'')+
      '<span class="art"><img alt="" src="'+SRC[r.c.run]+'"></span>'+
      '<span class="nm">'+r.c.name+'</span>'+
      (r.isNew?'<span class="meta">처음 만남!</span>'
              :'<span class="meta dup">겹침 +'+r.refund+'</span>');
    grid.appendChild(el);
    setTimeout(()=>{ decorate(el, r.rank); if(r.rank!=='N') RANKSOUND[r.rank](); }, i*step+60);
  });
}

/* ===== 설정 화면 ===== */
let keyWait=-1;
function buildSettings(body){
  const wrap=document.createElement('div'); wrap.className='setlist'; body.appendChild(wrap);
  const group=(title)=>{
    const d=document.createElement('div'); d.className='setgroup';
    d.innerHTML='<h5>'+title+'</h5>'; wrap.appendChild(d); return d;
  };
  const row=(parent,title,val,inner,hint)=>{
    const d=document.createElement('div'); d.className='setrow';
    d.innerHTML='<div class="lbl"><b>'+title+'</b><span>'+val+'</span></div>'+inner+
                (hint?'<div class="hint">'+hint+'</div>':'');
    parent.appendChild(d); return d;
  };
  const slider=(parent,title,val,attrs,onInput,hint)=>{
    const d=row(parent,title,val,'<input type="range" '+attrs+'>',hint);
    d.querySelector('input').oninput=e=>{
      d.querySelector('.lbl span').textContent = onInput(+e.target.value);
    };
    return d;
  };

  /* 조작 */
  const g1=group('조작');
  const kr=row(g1,'키 바꾸기','누르고 새 키를 눌러요',
    '<div class="keyrow">'+settings.keys.map((k,i2)=>
      '<button class="keybtn" data-i="'+i2+'" type="button">'+keyLabel(k)+
      '<small>'+(i2+1)+'번째</small></button>').join('')+'</div>');
  kr.querySelectorAll('.keybtn').forEach(btn=>{
    btn.onclick=()=>{ kr.querySelectorAll('.keybtn').forEach(b=>b.classList.remove('wait'));
                      btn.classList.add('wait'); btn.textContent='...'; keyWait=+btn.dataset.i; };
  });
  slider(g1,'노트 속도','x'+settings.speed.toFixed(1),
    'min="0.6" max="2" step="0.1" value="'+settings.speed+'"',
    v=>{ settings.speed=v; save(); return 'x'+v.toFixed(1); },
    '올릴수록 노트가 짧게 보여서 타이밍이 또렷해져요.');
  slider(g1,'싱크 보정', settings.offset+' ms',
    'min="-150" max="150" step="5" value="'+settings.offset+'"',
    v=>{ settings.offset=v; save(); return v+' ms'; },
    '노트가 소리보다 빠르면 −쪽, 늦으면 +쪽. 기기 지연은 자동으로 한 번 더 보정합니다.');

  /* 소리 */
  const g2=group('소리');
  [['volMusic','노래'],['volBgm','배경음'],['volSfx','효과음']].forEach(([k,label])=>{
    slider(g2,label, Math.round(settings[k]*100)+'%',
      'min="0" max="100" step="5" value="'+Math.round(settings[k]*100)+'"',
      v=>{ settings[k]=v/100; applyVolumes(); save(); if(k==='volSfx') uiClick(); return v+'%'; });
  });

  /* 꾸미기 */
  const g3=group('꾸미기');
  const sk=row(g3,'노트 색','도감을 모으면 늘어나요',
    '<div class="skinrow">'+Object.entries(SKINS).map(([id,s])=>{
      const has=skins.includes(id);
      return '<button class="skinbtn" data-s="'+id+'" type="button"'+(has?'':' disabled')+
        ' aria-pressed="'+(settings.skin===id)+'"><span class="nm">'+s.name+'</span>'+
        '<span class="swatch">'+s.col.map(c2=>'<i style="background:'+c2+'"></i>').join('')+'</span>'+
        '<small>'+(has?'보유':'도감 '+s.need+'종')+'</small></button>';
    }).join('')+'</div>');
  sk.querySelectorAll('.skinbtn').forEach(btn=>{
    if(btn.disabled) return;
    btn.onclick=()=>{ settings.skin=btn.dataset.s; applySkin(); save(); openModal('settings'); };
  });

  const rs=document.createElement('button');
  rs.className='btn ghost small'; rs.type='button'; rs.textContent='기본값으로';
  rs.onclick=()=>{ settings.keys=[...DEFAULT_KEYS]; settings.speed=1; settings.offset=0;
    settings.volMusic=settings.volBgm=settings.volSfx=1; settings.skin='basic';
    applySkin(); applyVolumes(); save(); openModal('settings'); };
  wrap.appendChild(rs);
}

/* ===== 캐릭터 상세 ===== */
function openCharDetail(c2){
  modalOpen='char';
  const body=$('modalBody'); body.innerHTML='';
  $('modalTitle').textContent='두기 정보';
  $('modalHint').textContent='';
  $('modalClose').hidden=true;
  const has=own.has(c2.id), R=RARITY[c2.rank];
  const d=document.createElement('div'); d.className='detail';
  d.innerHTML=
    '<div class="art" style="background:'+R.color+'44"><i></i>'+
      '<img alt="" src="'+SRC[c2.run]+'"'+(has?'':' style="filter:brightness(0);opacity:.2"')+'></div>'+
    '<div class="info">'+
      '<span class="rk" style="background:'+R.color+'"><span class="stars">'+'★'.repeat(STARS[c2.rank])+
        '</span> '+R.name+'</span>'+
      '<h3>'+(has?c2.name:'??? 두기')+'</h3>'+
      '<p class="desc">'+(has?c2.meta:'아직 만나지 못한 두기예요.')+'</p>'+
      '<div class="facts">'+
        '<span>뽑기 확률 <b>'+(c2.p? c2.p+'%':'기본 보유')+'</b></span>'+
        '<span>달리는 모습 <b>'+(c2.style==='slide'?'미끄러짐':c2.style==='float'?'둥둥 뜸':'통통 뜀')+'</b></span>'+
        '<span>보유 <b>'+(has?'가지고 있음':'없음')+'</b></span>'+
      '</div>'+
      '<div class="row"></div>'+
    '</div>';
  body.appendChild(d);
  const row=d.querySelector('.row');
  if(has){
    const pick=document.createElement('button');
    pick.className='btn'; pick.type='button';
    pick.textContent = char===c2 ? '지금 이 두기예요' : '이 두기로 달리기';
    pick.disabled = char===c2;
    pick.onclick=()=>{ char=c2; freshIds.delete(c2.id); refreshPicks(); closeModal(); };
    row.appendChild(pick);
  }
  const back=document.createElement('button');
  back.className='btn ghost small'; back.type='button'; back.textContent='도감으로';
  back.onclick=()=>openModal('char');
  row.appendChild(back);
}

/* ===== 뽑기 화면 ===== */
function buildGacha(body){
  const wrap=document.createElement('div'); wrap.className='gacha';
  wrap.innerHTML=
    '<div class="gtop">'+CLOVER_SVG+'<b id="gWallet">'+Math.round(clover).toLocaleString('ko-KR')+'</b>'+
      '<span>흔함 55% · 귀함 32% · 아주 귀함 13%</span></div>'+
    '<div class="gstage" id="gStage"><p class="gidle">클로버를 넣고 두기를 만나보세요<br>'+
      '<small>10연차에는 귀함 이상이 하나 확정 · 겹치면 클로버로 돌려받아요</small></p></div>'+
    '<div class="gbtns">'+
      '<button class="btn small" id="g1">1회 · '+PULL1+'</button>'+
      '<button class="btn" id="g10">10연차 · '+PULL10+'</button>'+
    '</div>';
  body.appendChild(wrap);
  const run=n=>{
    initAudio(); if(ctx.state==='suspended') ctx.resume();
    const got=pull(n);
    if(!got){
      const st=$('gStage'); st.classList.remove('hasbanner');
      st.innerHTML='<p class="gidle">클로버가 모자라요<br><small>노래를 완주하면 클로버가 쌓입니다</small></p>';
      return;
    }
    playCutscene(got);
  };
  $('g1').onclick=()=>run(1);
  $('g10').onclick=()=>run(10);
  if(lastPull) renderPullResult(lastPull);
}

function show(screen){
  [titleScreen,resultScreen,pauseScreen].forEach(s=>s.hidden = s!==screen);
  pauseBtn.hidden = !!screen;
  if(screen!==titleScreen && screen!==pauseScreen){ modal.hidden=true; modalOpen=null; }
}
function toTitle(){ mode='title'; show(titleScreen); refreshPicks(); homeBar.hidden=true; bgmStart(); }
function enterHub(){
  initAudio && initAudio();
  mode='hub'; show(null); pauseBtn.hidden=true; homeBar.hidden=false; bgmStart();
  hub.x=0.5; hub.y=0.72; hub.target=null; hub.autoOpen=null;
  refreshHomeBar();
}
function refreshHomeBar(){
  $('homeClover').innerHTML=CLOVER_SVG+'<b>'+Math.round(clover).toLocaleString('ko-KR')+'</b>';
  $('homeChar').textContent=char.name;
}

function startGame(){
  closeModal(); homeBar.hidden=true;
  initAudio(); bgmStop(); if(ctx.state==='suspended') ctx.resume();
  notes=buildChart(song,diff.id);
  events=buildEvents(song); evIndex=0;
  APPROACH=diff.approach/settings.speed;
  WIN={perfect:BASE_WIN.perfect*diff.wmul, great:BASE_WIN.great*diff.wmul, good:BASE_WIN.good*diff.wmul};
  score=0; combo=0; maxCombo=0; tally={perfect:0,great:0,good:0,miss:0}; accSum=0;
  fx=[]; texts=[]; parts=[]; flyers=[]; lastSection=-1;
  stars=Array.from({length:40},()=>({x:Math.random(),y:Math.random()*0.55,r:Math.random()*1.6+0.7,p:Math.random()*6.3}));
  charState='run'; charTimer=0;
  songStart=ctx.currentTime+0.35;
  mode='play'; show(null);
}
function endGame(){
  mode='result';
  const total=notes.length||1, acc=Math.round((accSum/total)*100);
  let grade;
  if(tally.miss===0&&tally.good===0) grade='네잎클로버';
  else if(acc>=90) grade='세잎';
  else if(acc>=70) grade='잎사귀';
  else grade='새싹';
  $('gradeText').textContent=grade;
  $('scoreText').textContent=Math.round(score).toLocaleString('ko-KR');
  $('tPerfect').textContent=tally.perfect; $('tGreat').textContent=tally.great;
  $('tGood').textContent=tally.good; $('tMiss').textContent=tally.miss;
  $('tCombo').textContent=maxCombo; $('tAcc').textContent=acc+'%';
  const k=bestKey(song,diff), prev=best[k]||0, isNew=score>prev;
  if(isNew){ best[k]=Math.round(score); saveBest(); }
  $('bestText').textContent=(isNew?'새 기록! ':'최고 기록 ')+(best[k]||0).toLocaleString('ko-KR')+
    ' · '+song.title+' · '+diff.name;
  const gain=cloverReward(grade, diff.mult, maxCombo);
  clover+=gain; save();
  $('rewardText').innerHTML=CLOVER_SVG+'<b>+'+gain+'</b> 클로버를 받았어요';
  $('resultArt').src = grade==='네잎클로버' ? SRC.clover : SRC[char.run];
  refreshPicks(); bgmStart();
  show(resultScreen);
}
function pause(){
  if(mode!=='play') return;
  mode='pause'; show(pauseScreen);
  $('pauseInfo').textContent = song.title+' · '+diff.name+' · '+
    Math.round(score).toLocaleString('ko-KR')+'점 · '+combo+'콤보';
  if(ctx) ctx.suspend();
}
let cdTimer=null;
function resumePlay(){
  if(mode!=='pause' || cdTimer) return;
  pauseScreen.hidden=true; modal.hidden=true; modalOpen=null;
  const cd=$('countdown'), num=$('cdNum');
  const pop=()=>{ num.style.animation='none'; void num.offsetWidth; num.style.animation=''; };
  let n=3; cd.hidden=false; num.textContent=n; pop(); blip(660,0.1);
  const tick=()=>{
    n--;
    if(n>0){ num.textContent=n; pop(); blip(660+(3-n)*120,0.1); cdTimer=setTimeout(tick,650); }
    else{
      num.textContent='시작!'; pop(); blip(1180,0.13);
      cdTimer=setTimeout(()=>{ cd.hidden=true; cdTimer=null; mode='play'; show(null);
                               if(ctx) ctx.resume(); }, 480);
    }
  };
  cdTimer=setTimeout(tick,650);
}

/* ===== 판정 ===== */
function audioLat(){ return ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0; }
const uiK=()=>Math.max(0.85, Math.min(1.7, Math.min(W/960, H/540)));
/* 4키 낙하형 좌표 */

function fieldW(){ return Math.min(W*(W<560?0.80:0.58), H*0.86, 620); }
function fieldX(){ return (W-fieldW())/2; }
function laneW(){ return fieldW()/4; }
function laneX(i){ return fieldX()+laneW()*(i+0.5); }
function fieldTop(){ return H*0.04; }
function judgeY(){ return H*0.80; }
function noteSpeed(){ return (judgeY()-fieldTop()+60)/APPROACH; }
function noteY(t){ return judgeY() - (t-nowT())*noteSpeed(); }
function charX(){ return fieldX()*0.5; }
function groundY(){ return H*0.86; }

function hit(lane){
  if(mode!=='play') return;
  laneFlash[lane]=1;
  const t=nowT(); let target=null, bd=999;
  for(const n of notes){
    if(n.judged) continue;
    if(n.t-t>WIN.good+0.05) break;
    if(n.lane!==lane) continue;
    const d=Math.abs(n.t-t);
    if(d<=WIN.good && d<bd){ bd=d; target=n; }
  }
  if(!target) return;
  const v = bd<=WIN.perfect?'perfect' : bd<=WIN.great?'great':'good';
  target.judged=true; target.verdict=v;
  if(target.type==='hold') target.holding=true; else target.done=true;
  combo++; maxCombo=Math.max(maxCombo,combo);
  tally[v]++; accSum+=VAL[v];
  score += 100*VAL[v]*(1+Math.min(combo/10*0.1,1.0))*diff.mult;
  laneBeam[lane]=1; comboPop=1;
  perfectStreak = v==='perfect' ? perfectStreak+1 : 0;
  if(perfectStreak>0 && perfectStreak%10===0) shakeT=0.18;
  spawnHitFx(lane, v);
  texts.length=0;
  texts.push({x:W*0.5,y:judgeY()-H*0.24,life:1,s:LABEL[v],big:v==='perfect',v:v});
  if(combo%10===0){ charState='jump'; jumpT=0; } else { charState='run'; hitBounce=1; }
  hitSound(lane, v);
}
function miss(n){
  n.judged=true; n.done=true; n.verdict='miss';
  combo=0; tally.miss++; perfectStreak=0; laneMiss[n.lane]=1;
  texts.length=0;
  texts.push({x:W*0.5,y:judgeY()-H*0.24,life:1,s:LABEL.miss});
  missSound();
  charState='fall'; charTimer=0.7;
}

/* ===== 입력 ===== */
const KMAP={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',ArrowUp:'w',ArrowLeft:'a',ArrowDown:'s',ArrowRight:'d'};

addEventListener('keydown',e=>{
  if(mode==='hub' && !modalOpen){
    if(KMAP[e.code]){ e.preventDefault(); keys[KMAP[e.code]]=true; hub.target=null; return; }
    if(e.code==='KeyE'||e.code==='Space'||e.code==='Enter'){
      e.preventDefault(); if(hub.near) hub.near.act(); return; }
    if(e.code==='Escape'){ toTitle(); return; }
  }
  if(modalOpen && e.code==='Escape'){ closeModal(); return; }
  if(e.repeat) return;
  if(mode==='cut'){
    if(e.code==='Escape'){ e.preventDefault(); skipCut(); }
    else if(e.code==='Space'||e.code==='Enter'){ e.preventDefault(); advanceCut(); }
    return;
  }
  if(keyWait>=0 && modalOpen==='settings'){          // 키 바꾸는 중
    e.preventDefault();
    if(e.code!=='Escape'){ settings.keys[keyWait]=e.code; save(); }
    keyWait=-1; openModal('settings'); return;
  }
  if(mode==='play' && !modalOpen){
    const ln=laneOfCode(e.code);
    if(ln!==undefined){ e.preventDefault(); laneHold[ln]=true; hit(ln); return; }
  }
  if(e.code==='Space'){
    e.preventDefault();
    if(modalOpen) return;
    if(mode==='title'||mode==='result') startGame();
  } else if(e.code==='Escape'){
    if(modalOpen) closeModal();
    else if(mode==='play') pause();
    else resumePlay();
  }
});
addEventListener('keyup',e=>{
  if(KMAP[e.code]) keys[KMAP[e.code]]=false;
  const ln=laneOfCode(e.code); if(ln!==undefined) laneHold[ln]=false;
});
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; });
cv.addEventListener('pointerdown',e=>{
  if(mode==='cut'){ advanceCut(); return; }
  if(mode==='hub'){
    const r=cv.getBoundingClientRect();
    const mx=(e.clientX-r.left)/r.width*W, my=(e.clientY-r.top)/r.height*H;
    let hit=null;
    SPOTS.forEach(s=>{ if(Math.abs(s.x*W-mx)<W*0.09 && my<hubFloorTop()+H*0.12) hit=s; });
    if(hit){ hub.target={x:hit.x*W, y:hubFloorTop()+H*0.14}; hub.autoOpen=hit; }
    else hub.target={x:mx, y:Math.max(hubFloorTop(),Math.min(hubFloorBot(),my))};
    return;
  }
  if(mode!=='play') return;
  const r=cv.getBoundingClientRect();
  const mx=(e.clientX-r.left)/r.width*W;
  const ln=Math.max(0,Math.min(3,Math.floor((mx-fieldX())/laneW())));
  touchLane[e.pointerId]=ln; laneHold[ln]=true; hit(ln);
});
cv.addEventListener('pointerup',e=>{ const ln=touchLane[e.pointerId];
  if(ln!==undefined){ laneHold[ln]=false; delete touchLane[e.pointerId]; } });
cv.addEventListener('pointercancel',e=>{ const ln=touchLane[e.pointerId];
  if(ln!==undefined){ laneHold[ln]=false; delete touchLane[e.pointerId]; } });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&mode==='play') pause(); });

$('resultGachaBtn').onclick=()=>{ enterHub(); openModal('gacha'); };
document.addEventListener('pointerdown',e=>{
  audioKick();
  if(e.target.closest('button,.songrow,.dcard,.lv,.cover,.sinfo')) uiClick();
},true);
addEventListener('keydown',audioKick,true);
function audioKick(){
  initAudio();
  // 일시정지·카운트다운 중에는 절대 되살리지 않는다 (예전엔 여기서 곡이 먼저 흘러갔음)
  if(mode!=='pause' && !cdTimer && ctx.state==='suspended') ctx.resume();
  if(mode==='title'||mode==='hub'||mode==='result') bgmStart();
}
$('modalClose').onclick=closeModal;
modal.addEventListener('pointerdown',e=>{ if(e.target===modal) closeModal(); });
$('startBtn').onclick=enterHub;
$('retryBtn').onclick=startGame;
$('selectBtn').onclick=enterHub;
$('resumeBtn').onclick=resumePlay;
$('restartBtn').onclick=()=>{ if(ctx) ctx.resume(); startGame(); };
$('pauseSetBtn').onclick=()=>openModal('settings');
$('homeSetBtn').onclick=()=>openModal('settings');
$('fsBtn').onclick=toggleFullscreen;
function toggleFullscreen(){
  const el=document.documentElement;
  if(!document.fullscreenElement){ (el.requestFullscreen||el.webkitRequestFullscreen||(()=>{})).call(el); }
  else{ (document.exitFullscreen||document.webkitExitFullscreen||(()=>{})).call(document); }
}
document.addEventListener('fullscreenchange',()=>{
  document.body.classList.toggle('fs', !!document.fullscreenElement);
  $('fsBtn').textContent = document.fullscreenElement ? '⤢' : '⛶';
});
$('quitBtn').onclick=()=>{ show(null); endGame(); };
pauseBtn.onclick=pause;
$('homeTitleBtn').onclick=toTitle;
$('homeSongBtn').onclick=()=>openModal('song');
$('skipBtn').onclick=()=>skipCut();
$('titleArt').src=SRC.wool; $('resultArt').src=SRC.clover;
