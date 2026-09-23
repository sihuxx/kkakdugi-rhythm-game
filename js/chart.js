"use strict";
/* 채보 생성 — 꺅두기 하우스 */

/* ===== 채보 만들기 ===== */
function buildChart(song, diffId){
  const S = song.spb, STEP = song.step;
  const on = [];                                  // 멜로디 온셋 펼치기
  song.bars.forEach((bar,bi)=>{
    if(!bar || bi>=song.bars.length-2) return;
    bar.forEach(([st,name,len,tag])=>on.push({bi,st,name,len,tag,m:midi(name)}));
  });
  let picked;
  const major = S===6 ? 3 : 4;                     // 큰 박자 간격
  if(diffId==='easy')      picked = on.filter(o=>o.st%major===0);
  else                     picked = on.slice();

  if(diffId==='hard' || diffId==='nightmare'){     // 엇박 채우기
    const extra=[];
    for(let i=0;i<picked.length;i++){
      const a=picked[i], b=picked[i+1];
      const aPos=a.bi*S+a.st, bPos=b?b.bi*S+b.st:aPos+2;
      if(bPos-aPos>=2 && a.len<3) extra.push({bi:a.bi, st:a.st+1, name:a.name, len:1, fill:true, m:a.m});
    }
    picked = picked.concat(extra);
  }
  if(diffId==='nightmare'){                        // 남은 칸까지 전부
    const has = new Set(picked.map(o=>o.bi*S+o.st));
    const full=[];
    song.bars.forEach((bar,bi)=>{
      if(!bar || bi>=song.bars.length-2) return;
      const stride = song.step<0.22 ? 2 : 1;      // 빠른 곡은 한 칸 걸러
      for(let st=0; st<S; st+=stride){
        if(has.has(bi*S+st)) continue;
        const near = picked.filter(o=>o.bi===bi).sort((x,y)=>Math.abs(x.st-st)-Math.abs(y.st-st))[0];
        full.push({bi, st, name:near?near.name:'C5', len:1, fill:true, m:near?near.m:72});
      }
    });
    picked = picked.concat(full);
  }
  picked.sort((a,b)=>(a.bi*S+a.st)-(b.bi*S+b.st));

  // 음 높이로 레인(A·S·K·L) 배정 — 낮은 음이 왼쪽
  const ms=picked.map(o=>o.m), lo=Math.min(...ms), hi=Math.max(...ms), span=Math.max(1,hi-lo);
  const notes=[];
  let lastLane=-1, rep=0;
  const busy=[0,0,0,0];            // 그 줄의 롱노트가 끝나는 시각
  const lastAt=[-9,-9,-9,-9];      // 그 줄에서 마지막으로 친 시각
  const MINGAP=Math.max(0.085, STEP*0.9);

  picked.forEach(o=>{
    let type = o.len>=3 ? 'hold' : 'tap';
    if(diffId==='easy' && type==='hold' && o.len<4) type='tap';
    const t = o.bi*song.barDur + o.st*STEP;
    const dur = type==='hold' ? o.len*STEP*0.9 : 0;

    let want=Math.min(3, Math.floor((o.m-lo)/span*4));
    if(want===lastLane){ rep++; if(rep>=3){ want=(want+1)%4; rep=0; } } else rep=0;

    // 잡고 있는 줄이나 방금 친 줄은 피한다 (롱노트 한가운데 일반 노트가 겹치던 문제)
    const free = l => t >= busy[l]-0.02 && t-lastAt[l] >= MINGAP-1e-6;
    let lane = -1;
    if(free(want)) lane = want;
    else {
      for(let d=1; d<4 && lane<0; d++){
        for(const cand of [want-d, want+d]){
          if(cand>=0 && cand<4 && free(cand)){ lane=cand; break; }
        }
      }
    }
    if(lane<0) return;             // 네 줄이 다 막혔으면 이 노트는 버린다

    lastLane=lane; lastAt[lane]=t;
    if(type==='hold') busy[lane]=t+dur+0.06;

    notes.push({ t, lane, type, dur,
                 judged:false, holding:false, done:false, verdict:null, seed:Math.random()*6.28 });
  });
  return notes;
}
