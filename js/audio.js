"use strict";
/* 소리 — Web Audio로 반주와 효과음을 직접 연주 — 꺅두기 러닝비트 */

/* ===== 소리 ===== */
let ctx=null, master=null, musicGain=null, noiseBuf=null;
function initAudio(){
  if(ctx) return;
  ctx = new (window.AudioContext||window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value=0.9; master.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value=0.5; musicGain.connect(master);
}
function tone(time, freq, dur, o){
  const osc=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
  osc.type=o.type||'square'; osc.frequency.value=freq; if(o.detune) osc.detune.value=o.detune;
  f.type='lowpass'; f.frequency.value=o.cut||2600; f.Q.value=.6;
  const peak=o.gain||0.16;
  g.gain.setValueAtTime(0.0001,time);
  g.gain.exponentialRampToValueAtTime(peak,time+0.012);
  g.gain.exponentialRampToValueAtTime(peak*0.5,time+Math.min(0.13,dur*0.5));
  g.gain.exponentialRampToValueAtTime(0.0001,time+dur);
  osc.connect(f); f.connect(g); g.connect(musicGain);
  osc.start(time); osc.stop(time+dur+0.05);
}
function noise(){
  if(!noiseBuf){ noiseBuf=ctx.createBuffer(1,ctx.sampleRate*0.3,ctx.sampleRate);
    const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
  return noiseBuf;
}
function kick(t){ const o=ctx.createOscillator(),g=ctx.createGain();
  o.type='sine'; o.frequency.setValueAtTime(150,t); o.frequency.exponentialRampToValueAtTime(48,t+0.13);
  g.gain.setValueAtTime(0.45,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.22);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t+0.25); }
function hat(t,loud){ const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
  s.buffer=noise(); f.type='highpass'; f.frequency.value=7200;
  g.gain.setValueAtTime(loud?0.09:0.04,t); g.gain.exponentialRampToValueAtTime(0.0001,t+(loud?0.07:0.04));
  s.connect(f); f.connect(g); g.connect(musicGain); s.start(t); s.stop(t+0.1); }
function clap(t){ const s=ctx.createBufferSource(),g=ctx.createGain(),f=ctx.createBiquadFilter();
  s.buffer=noise(); f.type='bandpass'; f.frequency.value=1700; f.Q.value=1.1;
  g.gain.setValueAtTime(0.16,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.15);
  s.connect(f); f.connect(g); g.connect(musicGain); s.start(t); s.stop(t+0.2); }
function blip(freq,vol){ if(!ctx) return;
  const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();
  o.type='triangle'; o.frequency.setValueAtTime(freq,t); o.frequency.exponentialRampToValueAtTime(freq*1.6,t+0.05);
  g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.12);
  o.connect(g); g.connect(master); o.start(t); o.stop(t+0.14); }

function sweepUp(dur, rank){            // 뽑기 전 긴장감 — 올라가는 소리
  if(!ctx) return;
  const t=ctx.currentTime, o=ctx.createOscillator(), g=ctx.createGain(), f=ctx.createBiquadFilter();
  o.type = rank==='SR' ? 'sawtooth' : 'triangle';
  o.frequency.setValueAtTime(180,t);
  o.frequency.exponentialRampToValueAtTime(rank==='SR'?1500:rank==='R'?900:620, t+dur);
  f.type='lowpass'; f.frequency.setValueAtTime(700,t); f.frequency.exponentialRampToValueAtTime(5000,t+dur);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.16,t+dur*0.8);
  g.gain.exponentialRampToValueAtTime(0.0001,t+dur+0.12);
  o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.2);
  if(rank!=='N'){                        // 심장 두근거림
    for(let i=0;i<4;i++){ const k=ctx.createOscillator(), kg=ctx.createGain(), tt=t+i*(dur/4);
      k.type='sine'; k.frequency.setValueAtTime(90,tt); k.frequency.exponentialRampToValueAtTime(45,tt+0.12);
      kg.gain.setValueAtTime(0.3,tt); kg.gain.exponentialRampToValueAtTime(0.0001,tt+0.18);
      k.connect(kg); kg.connect(master); k.start(tt); k.stop(tt+0.2); }
  }
}
function arp(freqs, gap, vol, type){    // 등급별 팡파르
  if(!ctx) return;
  const t0=ctx.currentTime;
  freqs.forEach((f,i)=>{
    const o=ctx.createOscillator(), g=ctx.createGain(), t=t0+i*gap;
    o.type=type||'triangle'; o.frequency.setValueAtTime(f,t);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.26);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+0.3);
  });
}
function shimmer(){                      // 아주 귀함 반짝임
  if(!ctx) return;
  const t=ctx.currentTime, s=ctx.createBufferSource(), g=ctx.createGain(), f=ctx.createBiquadFilter();
  s.buffer=noise(); f.type='bandpass'; f.frequency.setValueAtTime(3000,t);
  f.frequency.exponentialRampToValueAtTime(9000,t+0.5); f.Q.value=2.2;
  g.gain.setValueAtTime(0.14,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.6);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t+0.65);
}

function buildEvents(song){
  const ev=[], S=song.spb, STEP=song.step;
  song.bars.forEach((bar,bi)=>{
    const base=bi*song.barDur, chord=CH[song.chords[bi]]||CH.C;
    for(let s=0;s<S;s++){
      const t=base+s*STEP;
      if(song.kick.includes(s)) ev.push({t,f:()=>kick(at(t))});
      if(song.clap.includes(s)) ev.push({t,f:()=>clap(at(t))});
      if(song.hat.includes(s))  ev.push({t,f:()=>hat(at(t), s%2===0)});
    }
    const bassSteps = S===6 ? [[0,0,1.2],[2,1,.6],[4,2,.6]] : [[0,0,1],[2,2,.5],[4,0,1],[6,1,.5]];
    bassSteps.forEach(([s,ci,mul])=>{
      const t=base+s*STEP;
      ev.push({t,f:()=>tone(at(t), hz(chord[ci]), song.beat*0.85*mul, {type:'triangle',gain:.2,cut:900})});
    });
    if(!bar) return;
    bar.forEach(([st,name,len])=>{
      const t=base+st*STEP, d=len*STEP*0.92;
      ev.push({t,f:()=>{ tone(at(t),hz(name),d,{type:song.wave,gain:.15,cut:song.cut});
                         tone(at(t),hz(name)*2.003,d*0.6,{type:'square',gain:.04,cut:4200,detune:6}); }});
    });
  });
  ev.sort((a,b)=>a.t-b.t);
  return ev;
}
let songStart=0;
function at(t){ return songStart+t; }
function nowT(){ return ctx ? ctx.currentTime-songStart : 0; }

/* 곡 카드 미리듣기 */
let previewUntil=0;
function preview(song){
  initAudio(); if(ctx.state==='suspended') ctx.resume();
  const t0=ctx.currentTime+0.06;
  if(t0 < previewUntil) return;
  let dur=0;
  song.bars.slice(2,4).forEach((bar,i)=>{
    if(!bar) return;
    const base=i*song.barDur;
    bar.forEach(([st,name,len])=>{
      const t=t0+base+st*song.step;
      tone(t,hz(name),len*song.step*0.9,{type:song.wave,gain:.14,cut:song.cut});
      dur=Math.max(dur,base+st*song.step+0.4);
    });
    song.kick.forEach(s=>kick(t0+base+s*song.step));
  });
  previewUntil=t0+dur;
}
