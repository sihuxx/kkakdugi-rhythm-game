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
    house: 0,
    dugi: { name:'두기', exp:0, full:70, clean:70, fun:70, energy:70, love:0 },
    furn: [...BASE_FURN],
    req: null,
    jobs: 0,
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
/* 알바비 배율 — 컨디션 + 애정도 + 가구 */
function payMult(){ return (0.62 + 0.36 * condition() + 0.18 * (S.dugi.love / 100)) * (1 + boost('pay')); }
function addLove(n){ S.dugi.love = Math.max(0, Math.min(100, (S.dugi.love || 0) + n)); }

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

/* 알바하고 오면 배고프고 지저분해진다 */
function afterOuting(){
  addStat('full', -18); addStat('energy', -22); addStat('clean', -16); addStat('fun', 8);
  S.jobs = (S.jobs || 0) + 1;
  newRequest(true);
  save();
}

/* ===== 두기가 먼저 조르기 ===== */
const REQ_LINE = { feed:'배고파요…', wash:'꿉꿉해요', play:'심심해!', sleep:'졸려요…',
                   water:'화분이 목말라 보여요', clean:'방이 지저분해요' };
function newRequest(force){
  if(S.req && !force) return;
  const d = S.dugi;
  const want = [];
  if(d.full < 55) want.push('feed');
  if(d.clean < 55) want.push('wash', 'clean');
  if(d.energy < 55) want.push('sleep');
  if(d.fun < 60) want.push('play', 'water');
  const pick = want.length ? want[Math.floor(Math.random() * want.length)]
                           : CARE_ORDER[Math.floor(Math.random() * CARE_ORDER.length)];
  if(!want.length && Math.random() < 0.5){ S.req = null; return; }
  S.req = { kind: pick, done: false };
  save();
}
function clearRequest(kind){
  if(S.req && S.req.kind === kind && !S.req.done){
    S.req = null;
    addClover(35); addLove(4);
    toast('원하던 걸 해줬어요!', '보너스 클로버 35 · 애정도 +4');
    sfxCoin(3);
    return true;
  }
  return false;
}

/* ===== 집 업그레이드 ===== */
function upgradeHouse(){
  const nxt = HOUSES[(S.house || 0) + 1];
  if(!nxt) return false;
  if(S.clover < nxt.price){ sfxNo(); toast('클로버가 모자라요', nxt.name + '까지 ' +
      (nxt.price - S.clover).toLocaleString('ko-KR') + ' 더'); return false; }
  addClover(-nxt.price); S.house = (S.house || 0) + 1; save();
  toast(nxt.name + '으로 이사!', nxt.note); sfxGrow();
  return true;
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
