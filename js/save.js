"use strict";
/* 세이브·경제·성장 — 꺅두기 하우스 */

/* ===============================================================
   세이브 v2 — 두기 한 마리 · 클로버 · 모습 · 가구
   =============================================================== */
const SAVE_KEY = 'ggakdugi.v2';
const START_LOOKS = ['wool', 'proud', 'baby'];

const DEFAULT_KEYS = ['KeyA', 'KeyS', 'KeyK', 'KeyL'];
const SKINS = {
  basic:     { name:'기본',      col:['#7BC47F', '#A9D9F0', '#FFB3C1', '#D9C4A0'] },
  strawberry:{ name:'딸기우유',  col:['#FFB3C1', '#FFD6E0', '#FF9DB1', '#FFE3EC'] },
  mint:      { name:'민트소다',  col:['#7BD8C4', '#A9E6DC', '#5FC9B2', '#CFF2EA'] }
};

function freshSave(){
  return {
    v: 2,
    clover: 500,
    look: 'wool',
    own: [...START_LOOKS],
    pity: 0,
    dugi: { name:'두기', exp:0, full:70, clean:70, fun:70, energy:70 },
    furn: [...BASE_FURN],
    dust: 1,
    claimed: [],
    skins: ['basic'],
    named: false,
    best: {},                                  // 리듬게임 곡별 최고점
    runBest: 0,
    settings: { keys:[...DEFAULT_KEYS], speed:1.0, offset:0, skin:'basic',
                volMusic:0.8, volBgm:0.6, volSfx:0.9 }
  };
}

let S = freshSave();
(function loadSave(){
  try{
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if(raw && raw.v === 2){
      S = Object.assign(freshSave(), raw);
      S.dugi = Object.assign(freshSave().dugi, raw.dugi || {});
      S.settings = Object.assign(freshSave().settings, raw.settings || {});
      const ids = new Set(CHARS.map(c => c.id));
      S.own = (S.own || []).filter(id => ids.has(id));
      if(!S.own.length) S.own = [...START_LOOKS];
      if(!S.own.includes(S.look)) S.look = S.own[0];
      const fids = new Set(FURNITURE.map(f => f.id));
      S.furn = [...new Set((S.furn || []).filter(id => fids.has(id)).concat(BASE_FURN))];
    }
  }catch(e){}
})();
function save(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){} }

/* 편하게 쓰는 별칭 */
const settings = S.settings;
const dugi = () => S.dugi;
const look = () => CHARS.find(c => c.id === S.look) || CHARS[0];
const owns = id => S.own.includes(id);
const hasFurn = id => S.furn.includes(id);

/* 가구가 주는 보너스 합 */
function boost(kind){
  let v = 0;
  for(const id of S.furn){ const f = FURN(id); if(f && f.boost && f.boost[kind]) v += f.boost[kind]; }
  return v;
}
/* 컨디션 — 스탯 평균 (미니게임 보상 배율에 쓰임) */
function condition(){
  const d = S.dugi;
  return (d.full + d.clean + d.fun + d.energy) / 400;
}
function payMult(){ return (0.65 + 0.45 * condition()) * (1 + boost('pay')); }

function addStat(k, v){
  const d = S.dugi;
  d[k] = Math.max(0, Math.min(100, (d[k] || 0) + v));
}
function addClover(n){ S.clover = Math.max(0, Math.round(S.clover + n)); }

/* 경험치 — 단계가 오르면 알린다 */
function addExp(n){
  const before = stageOf(S.dugi.exp);
  S.dugi.exp = Math.round(S.dugi.exp + n * (1 + boost('exp')));
  const after = stageOf(S.dugi.exp);
  if(after > before){
    grewUp = 2.6;
    toast(S.dugi.name + '가 자랐어요!', STAGES[after].name + ' · ' + STAGES[after].note);
    sfxGrow();
  }
  return after > before;
}
let grewUp = 0;

/* 외출하고 오면 배고프고 지저분해진다 */
function afterOuting(){
  addStat('full', -18); addStat('energy', -22); addStat('clean', -14); addStat('fun', 8);
  if(Math.random() < 0.8) S.dust = Math.min(3, (S.dust || 0) + 1);
  save();
}

/* ===== 알림 ===== */
let toastTimer = null;
function toast(title, line){
  const el = $('toast');
  el.innerHTML = '<b>' + title + '</b>' + (line ? '<span>' + line + '</span>' : '');
  el.hidden = false; el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

/* ===== 도감 보상 ===== */
const DEX_REWARDS = [
  { id:'d5',  n:5,  clover:300,  txt:'클로버 300' },
  { id:'d9',  n:9,  skin:'strawberry', txt:'노트 스킨 · 딸기우유' },
  { id:'d13', n:13, clover:500, skin:'mint', txt:'민트소다 스킨 + 클로버 500' },
  { id:'d17', n:17, clover:1500, txt:'클로버 1500' }
];
function unlockSkin(id){ if(!S.skins.includes(id)) S.skins.push(id); }
function checkRewards(){
  DEX_REWARDS.forEach(r => {
    if(S.own.length >= r.n && !S.claimed.includes(r.id)){
      S.claimed.push(r.id);
      if(r.clover) addClover(r.clover);
      if(r.skin) unlockSkin(r.skin);
      toast('도감 ' + r.n + '종 달성!', r.txt + ' 받았어요');
    }
  });
  save();
}
function nextReward(){ return DEX_REWARDS.find(r => !S.claimed.includes(r.id)); }
