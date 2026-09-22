"use strict";
/* 채보 생성 — 멜로디에서 노트를 뽑아낸다 — 꺅두기 러닝비트 */

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

  const notes=[]; let prevM=null, prevJump=false;
  picked.forEach(o=>{
    let type = 'tap';
    if(o.tag==='jump') type='jump';
    else if(o.len>=3) type='hold';
    else if((diffId==='hard'||diffId==='nightmare') && prevM!==null && o.m-prevM>=4 && !prevJump && !o.fill) type='jump';
    if(diffId==='easy' && type==='hold' && o.len<4) type='tap';
    prevM=o.m; prevJump=(type==='jump');
    notes.push({ t:o.bi*song.barDur + o.st*STEP, type,
                 dur: type==='hold' ? o.len*STEP*0.9 : 0,
                 judged:false, holding:false, done:false, verdict:null, seed:Math.random()*6.28 });
  });
  return notes;
}
