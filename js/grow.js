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

/* 집 단계 — 돈을 모아 리모델링 */
const HOUSES = [
  { id:'old',  name:'낡은 방',   price:0,    wide:0.66, tall:0.50,
    wall:'#E7D9BE', wall2:'#DCCBAB', floor:'#C4A87E', floor2:'#B5966A', trim:'#CFC0A2',
    note:'벽지가 들뜨고 바닥도 삐걱거려요', slots:5 },
  { id:'cozy', name:'아늑한 집', price:2400, wide:0.84, tall:0.52,
    wall:'#FBF1DE', wall2:'#F4E7D0', floor:'#E8D6B4', floor2:'#D9C097', trim:'#F2E8D9',
    note:'도배도 새로 하고 마루도 깔았어요', slots:9 },
  { id:'big',  name:'넓은 집',   price:7000, wide:1.00, tall:0.55,
    wall:'#FFF8EC', wall2:'#F8F0E0', floor:'#F1E4CA', floor2:'#E3CFA9', trim:'#FFFDF6',
    note:'창이 크고 천장도 높아요', slots:14 }
];
const HOUSE = () => HOUSES[Math.min(HOUSES.length - 1, S.house || 0)];

/* 스탯 — 집에서 채우고 알바하면 줄어든다 */
const STATS = [
  { id:'full',   name:'배부름', color:'#F5B971', icon:'bowl'  },
  { id:'clean',  name:'깨끗함', color:'#A9D9F0', icon:'drop'  },
  { id:'fun',    name:'기분',   color:'#FFB3C1', icon:'heart' },
  { id:'energy', name:'기운',   color:'#7BC47F', icon:'bolt'  }
];

/* 가구 — slot 은 집 안 고정 자리 (x: 0~1, 벽/바닥)
   base:true 면 처음부터 있는 것 · act 가 있으면 다가가서 상호작용 */
const FURNITURE = [
  /* 처음부터 있는 것 */
  { id:'bowl',   name:'밥그릇',     price:0,   base:true, x:0.30, on:'floor', row:0,
    desc:'두기 밥그릇' },
  { id:'plant',  name:'화분',       price:0,   base:true, x:0.13, on:'floor', row:1, act:'water',
    desc:'물을 주면 두기가 좋아해요' },
  { id:'bed',    name:'침대',       price:0,   base:true, x:0.79, on:'floor', row:1, act:'sleep',
    desc:'여기서 자면 기운이 차요' },
  { id:'ball',   name:'공',         price:0,   base:true, x:0.44, on:'floor', row:0, act:'play',
    desc:'같이 놀아주기' },
  { id:'tub',    name:'대야',       price:0,   base:true, x:0.62, on:'floor', row:0, act:'wash',
    desc:'씻기면 깨끗해져요' },

  /* 상점 — 바닥 */
  { id:'rug',    name:'포근한 러그', price:220,  x:0.50, on:'rug',   boost:{ fun:2 },
    desc:'기분 회복 +2' },
  { id:'lamp',   name:'꼬마 램프',   price:320,  x:0.88, on:'floor', row:1, boost:{ energy:4 },
    desc:'잘 때 기운 +4' },
  { id:'shelf',  name:'책장',        price:420,  x:0.22, on:'floor', row:1, boost:{ exp:0.08 },
    desc:'경험치 +8%' },
  { id:'table',  name:'낮은 탁자',   price:340,  x:0.50, on:'floor', row:0, boost:{ fun:2 },
    desc:'차 한 잔 (기분 +2)', need:1 },
  { id:'tv',     name:'티비',        price:560,  x:0.70, on:'floor', row:1, boost:{ fun:5 },
    desc:'놀아줄 때 기분 +5', need:1 },
  { id:'fridge', name:'냉장고',      price:680,  x:0.06, on:'floor', row:1, boost:{ full:6 },
    desc:'밥을 주면 배부름 +6', need:1 },
  { id:'cake',   name:'생일 케이크', price:900,  x:0.36, on:'floor', row:0, boost:{ exp:0.15 },
    desc:'경험치 +15%', need:1 },
  { id:'piano',  name:'장난감 피아노', price:1200, x:0.34, on:'floor', row:1, boost:{ pay:0.08 },
    desc:'알바 연습! 보상 +8%', need:2 },
  { id:'sofa',   name:'소파',        price:1400, x:0.62, on:'floor', row:1, boost:{ energy:5, fun:3 },
    desc:'푹신함 (기운 +5 · 기분 +3)', need:2 },

  /* 상점 — 벽 */
  { id:'frame',  name:'액자',        price:260,  x:0.31, on:'wall',  boost:{ pay:0.05 },
    desc:'알바 보상 +5%' },
  { id:'clock',  name:'벽시계',      price:300,  x:0.66, on:'wall',  boost:{ pay:0.05 },
    desc:'알바 보상 +5%' },
  { id:'garland',name:'장식 깃발',   price:380,  x:0.48, on:'wall',  boost:{ fun:3 },
    desc:'집이 화사해져요 (기분 +3)' },
  { id:'poster', name:'포스터',      price:450,  x:0.82, on:'wall',  boost:{ exp:0.05 },
    desc:'경험치 +5%', need:1 },
  { id:'window2',name:'작은 창문',   price:800,  x:0.90, on:'wall',  boost:{ fun:4 },
    desc:'햇빛이 들어와요 (기분 +4)', need:2 }
];
const FURN = id => FURNITURE.find(f => f.id === id);
/* 집에 늘 있는 자리 (가구가 아니라 방 자체) */
const PLACES = [
  { id:'wardrobe', name:'옷장',      x:0.90, act:'wardrobe', tip:'모습 갈아입기' },
  { id:'door',     name:'현관',      x:0.50, act:'job',      tip:'알바하러 나가기', wall:true },
  { id:'gacha',    name:'뽑기 기계',  x:0.16, act:'gacha',   tip:'클로버로 새 모습 뽑기' }
];
const BASE_FURN = FURNITURE.filter(f => f.base).map(f => f.id);

/* 돌봄 — 집에서 하는 행동 */
const CARE = {
  feed:  { name:'밥 주기',   icon:'bowl',  verb:'냠냠!',    cost:12, exp:9,  love:3, add:{ full:26, fun:4 },
           stat:'full',   tip:'클로버 12개로 밥 한 그릇' },
  wash:  { name:'씻기기',    icon:'drop',  verb:'뽀득뽀득', cost:0,  exp:9,  love:2, add:{ clean:30 },
           stat:'clean',  tip:'대야에 물 받아서 뽀득뽀득' },
  play:  { name:'놀아주기',  icon:'ball',  verb:'꺅!',      cost:0,  exp:11, love:4, add:{ fun:22, energy:-8 },
           stat:'fun',    tip:'신나지만 기운을 써요' },
  sleep: { name:'재우기',    icon:'moon',  verb:'쿨쿨…',    cost:0,  exp:11, love:2, add:{ energy:34, fun:3 },
           stat:'energy', tip:'푹 자면 기운이 돌아와요' },
  water: { name:'물 주기',   icon:'leaf',  verb:'쪼르륵~',  cost:0,  exp:7,  love:2, add:{ fun:12 },
           stat:'fun',    tip:'화분도 목말라요' },
  clean: { name:'청소하기',  icon:'broom', verb:'쓱싹쓱싹', cost:0,  exp:8,  love:2, add:{ clean:14, fun:3 },
           stat:'clean',  tip:'방 먼지를 치워요' }
};
const CARE_ORDER = ['feed', 'wash', 'play', 'sleep', 'water', 'clean'];

/* 알바 — 밖에 나가서 돈 버는 일 */
const JOBS = [
  { id:'dish', game:'rhythm', name:'설거지 알바', place:'분식집 주방',
    desc:'노래에 맞춰 접시를 씻어요', pay:'깨끗이 씻을수록 시급이 올라요',
    color:'#A9D9F0', need:0 },
  { id:'deliver', game:'run', name:'배달 알바', place:'동네 골목',
    desc:'장애물을 피해 달려서 배달해요', pay:'동전을 줍고 제시간에 도착하면 보너스',
    color:'#FFB3C1', need:0 }
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
