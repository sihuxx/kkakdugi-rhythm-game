"use strict";
/* 성장·가구·돌봄 데이터 — 꺅두기 하우스 */

/* ===============================================================
   키우기 데이터 — 성장 단계 · 가구 · 돌봄
   =============================================================== */

/* 성장 4단계. need = 여기까지 오는 데 필요한 경험치 */
const STAGES = [
  { id:'baby',  name:'애기 두기',   need:0,   scale:0.66, note:'아직 아장아장' },
  { id:'kid',   name:'어린 두기',   need:90,  scale:0.82, note:'뛰어다니기 시작' },
  { id:'teen',  name:'청소년 두기', need:280, scale:0.95, note:'멋 부리는 중' },
  { id:'adult', name:'어른 두기',   need:700, scale:1.08, note:'다 컸다!' }
];
function stageOf(exp){ let i=0; STAGES.forEach((s,k)=>{ if(exp>=s.need) i=k; }); return i; }
function stageProg(exp){                       // 다음 단계까지 0~1
  const i=stageOf(exp), cur=STAGES[i], nxt=STAGES[i+1];
  if(!nxt) return 1;
  return (exp-cur.need)/(nxt.need-cur.need);
}

/* 스탯 — 집에서 채우고 외출하면 줄어든다 */
const STATS = [
  { id:'full',   name:'배부름', color:'#F5B971', icon:'bowl'  },
  { id:'clean',  name:'깨끗함', color:'#A9D9F0', icon:'drop'  },
  { id:'fun',    name:'기분',   color:'#FFB3C1', icon:'heart' },
  { id:'energy', name:'기운',   color:'#7BC47F', icon:'bolt'  }
];

/* 가구 — slot 은 집 안 고정 자리 (x: 0~1, 벽/바닥)
   base:true 면 처음부터 있는 것 · act 가 있으면 다가가서 상호작용 */
const FURNITURE = [
  { id:'bowl',   name:'밥그릇',     price:0,    base:true,  x:0.24, on:'floor', act:'feed',
    desc:'밥을 주는 자리' },
  { id:'plant',  name:'화분',       price:0,    base:true,  x:0.11, on:'floor', act:'water',
    desc:'물을 주면 두기가 좋아해요' },
  { id:'bed',    name:'침대',       price:0,    base:true,  x:0.81, on:'floor', act:'sleep',
    desc:'여기서 한숨 자면 기운이 차요' },
  { id:'ball',   name:'공',         price:0,    base:true,  x:0.38, on:'floor', act:'play',
    desc:'같이 놀아주기' },
  { id:'tub',    name:'대야',       price:0,    base:true,  x:0.63, on:'floor', act:'wash',
    desc:'씻기면 깨끗해져요' },

  { id:'rug',    name:'포근한 러그', price:220,  x:0.50, on:'rug',   boost:{ fun:2 },
    desc:'기분 회복 +2' },
  { id:'lamp',   name:'꼬마 램프',   price:320,  x:0.88, on:'floor', boost:{ energy:4 },
    desc:'잘 때 기운 +4' },
  { id:'shelf',  name:'책장',        price:420,  x:0.31, on:'floor', boost:{ exp:0.08 },
    desc:'경험치 +8%' },
  { id:'tv',     name:'티비',        price:560,  x:0.71, on:'floor', boost:{ fun:5 },
    desc:'놀아줄 때 기분 +5' },
  { id:'fridge', name:'냉장고',      price:680,  x:0.17, on:'floor', boost:{ full:6 },
    desc:'밥을 주면 배부름 +6' },
  { id:'cake',   name:'생일 케이크', price:900,  x:0.56, on:'floor', boost:{ exp:0.15 },
    desc:'경험치 +15%' },
  { id:'frame',  name:'액자',        price:260,  x:0.30, on:'wall',  boost:{ pay:0.05 },
    desc:'미니게임 보상 +5%' },
  { id:'clock',  name:'벽시계',      price:300,  x:0.64, on:'wall',  boost:{ pay:0.05 },
    desc:'미니게임 보상 +5%' },
  { id:'garland',name:'장식 깃발',   price:380,  x:0.42, on:'wall',  boost:{ fun:3 },
    desc:'집이 화사해져요 (기분 +3)' }
];
const FURN = id => FURNITURE.find(f => f.id === id);
/* 집에 늘 있는 자리 (가구가 아니라 방 자체) */
const PLACES = [
  { id:'wardrobe', name:'옷장',     x:0.045, act:'wardrobe', tip:'모습 갈아입기' },
  { id:'door',     name:'현관',     x:0.50,  act:'out',      tip:'외출해서 클로버 벌기', wall:true },
  { id:'gacha',    name:'뽑기 기계', x:0.95,  act:'gacha',    tip:'클로버로 두기 뽑기' }
];
const BASE_FURN = FURNITURE.filter(f => f.base).map(f => f.id);

/* 돌봄 — 집에서 하는 행동 */
const CARE = {
  feed:  { name:'밥 주기',   verb:'냠냠!',     cost:12, exp:9,  add:{ full:26, fun:4 },  need:'full',
           tip:'클로버 12개로 밥 한 그릇' },
  water: { name:'물 주기',   verb:'쪼르륵~',   cost:0,  exp:7,  add:{ fun:12 },          need:'fun',
           tip:'화분이 목말라 보여요' },
  sleep: { name:'재우기',    verb:'쿨쿨…',     cost:0,  exp:11, add:{ energy:34, fun:3 },need:'energy',
           tip:'푹 자면 기운이 돌아와요' },
  play:  { name:'놀아주기',  verb:'꺅!',       cost:0,  exp:11, add:{ fun:22, energy:-8 },need:'fun',
           tip:'공놀이는 신나지만 기운을 써요' },
  wash:  { name:'씻기기',    verb:'뽀득뽀득',  cost:0,  exp:9,  add:{ clean:30 },        need:'clean',
           tip:'대야에 물 받아서' },
  clean: { name:'청소하기',  verb:'쓱싹쓱싹',  cost:0,  exp:8,  add:{ clean:12, fun:3 },  need:'clean',
           tip:'먼지를 치워요' }
};

/* 미니게임 */
const GAMES = [
  { id:'rhythm', name:'리듬게임',  meta:'노래에 맞춰 네 줄 노트 받기', pay:'점수만큼 클로버' },
  { id:'run',    name:'꺅두기런',  meta:'달리고 뛰고 미끄러지기',       pay:'젤리만큼 클로버' }
];

/* ===== 꺅두기런 두기별 스킬 ===== */
/* ===== 두기별 스킬 ===== */
const SKILLS = {
  dash:   { name:'돌진!',      desc:'3초 무적 돌진 · 장애물을 부숴요', dur:3.0,  color:'#FFB3C1' },
  glide:  { name:'둥실둥실',   desc:'4초 동안 천천히 떨어져요',        dur:4.0,  color:'#A9D9F0' },
  magnet: { name:'젤리 자석',  desc:'5초 동안 젤리가 따라와요',        dur:5.0,  color:'#7BC47F' },
  hop:    { name:'폭신 점프',  desc:'6초 동안 3단 점프가 돼요',        dur:6.0,  color:'#D9C4A0' },
  slow:   { name:'느긋느긋',   desc:'5초 동안 천천히 · 젤리 2배',      dur:5.0,  color:'#B9A7D9' },
  shield: { name:'꽉 버티기',  desc:'한 번 부딪혀도 안 아픈 보호막',    dur:0,    color:'#F2E8D9' }
};
const CHAR_SKILL = {
  wool:'hop', proud:'shield', baby:'magnet', belly:'shield', school:'magnet',
  holdbaby:'hop', car:'dash', snail:'slow', rabbit:'hop', cat:'magnet', bear:'shield',
  icecream:'magnet', clown:'dash', cowboy:'dash', fairy:'glide', huggy:'dash', killer:'dash'
};
const skillOf = c => SKILLS[CHAR_SKILL[c.id] || 'magnet'];
const skillIdOf = c => CHAR_SKILL[c.id] || 'magnet';
