"use strict";
/* 셸 — 화면 전환·입력·루프 — 꺅두기 하우스 */

/* ===============================================================
   셸 — 화면 전환 · 입력 · 메인 루프
   =============================================================== */
let mode = 'home';                 // home · play · pause · result · cut · run · runresult
let last = performance.now();

function showScreen(el){
  [$('introScreen'), $('resultScreen'), $('runResult'), $('pauseScreen')]
    .forEach(s => { if(s) s.hidden = s !== el; });
  $('pauseBtn').hidden = !(mode === 'play');
}

/* ===== 위쪽 상태바 ===== */
function refreshBar(){
  const d = S.dugi, si = stageOf(d.exp), st = STAGES[si];
  $('barClover').innerHTML = CLOVER_SVG + '<b>' + S.clover.toLocaleString('ko-KR') + '</b>';
  $('barName').textContent = d.name;
  $('barStage').textContent = st.name;
  $('barLook').textContent = look().name;
  $('expFill').style.width = Math.round(stageProg(d.exp) * 100) + '%';
  $('expCap').textContent = STAGES[si + 1]
    ? Math.max(0, STAGES[si + 1].need - d.exp) + ' 경험치 남음'
    : '다 컸어요!';
  STATS.forEach(s => {
    const bar = $('st_' + s.id);
    if(!bar) return;
    bar.style.width = Math.round(d[s.id]) + '%';
    bar.parentElement.parentElement.classList.toggle('low', d[s.id] < 30);
  });
}

function goHome(){
  mode = 'home';
  showScreen(null);
  $('topbar').hidden = false; $('runPad').hidden = true;
  $('skipBtn').hidden = true; $('tapHint').hidden = true;
  seedDust(); refreshBar(); bgmStart();
}

/* ===== 꺅두기런 ===== */
function startRun(){
  closeModal(); initAudio(); bgmStop();
  if(ctx && ctx.state === 'suspended') ctx.resume();
  mode = 'run'; $('topbar').hidden = true; showScreen(null);
  $('runPad').hidden = !(W < 760 || matchMedia('(pointer:coarse)').matches);
  DugiRun.start({ look: look(), stage: stageOf(S.dugi.exp), onEnd: runEnd });
}
function runEnd(r){
  mode = 'runresult';
  $('runPad').hidden = true;
  const pay = Math.round((r.jelly * 3.6 + r.dist / 110 + (r.cleared ? 90 + r.hp * 45 : 0)) * payMult());
  const exp = Math.round(7 + r.jelly * 0.16 + r.dist / 950 + (r.cleared ? 12 : 0));
  const grade = r.cleared ? (r.score > 6000 ? 'S' : r.score > 4500 ? 'A' : r.score > 3200 ? 'B' : 'C') : '-';
  $('runTitle').textContent = r.cleared ? '도착!' : '아야…';
  $('runArt').src = SRC[r.cleared ? look().run : look().fall];
  $('runScore').textContent = Math.round(r.score).toLocaleString('ko-KR');
  $('rDist').textContent = Math.floor(r.dist / 10) + ' m';
  $('rJelly').textContent = r.jelly + ' / ' + r.total;
  $('rCombo').textContent = r.combo;
  $('rGrade').textContent = grade;
  if(r.score > (S.runBest || 0)){ S.runBest = Math.round(r.score); $('runBest').textContent = '새 기록!'; }
  else $('runBest').textContent = '최고 기록 ' + (S.runBest || 0).toLocaleString('ko-KR');
  payOut(pay, exp, 'runReward');
  showScreen($('runResult'));
  bgmStart();
}

/* ===== 처음 시작 ===== */
function askName(){
  showScreen($('introScreen'));
  $('introName').value = S.dugi.name;
  $('topbar').hidden = true;
  setTimeout(() => $('introName').focus(), 200);
}
function finishIntro(){
  const v = ($('introName').value || '').trim().slice(0, 6) || '두기';
  S.dugi.name = v; S.named = true; save();
  initAudio(); goHome();
  toast(v + '와(과) 함께!', '집을 돌아다니며 E로 돌봐주세요');
}

/* ===== 입력 ===== */
const KMAP = { KeyW:'w', KeyA:'a', KeyS:'s', KeyD:'d',
               ArrowUp:'w', ArrowLeft:'a', ArrowDown:'s', ArrowRight:'d' };

addEventListener('keydown', e => {
  audioKick();
  if(mode === 'run'){
    if(e.code === 'Escape'){ DugiRun.quit(); return; }
    if(!e.repeat) DugiRun.key(e.code, true);
    if(['Space','ArrowUp','ArrowDown','KeyW','KeyS','KeyE'].includes(e.code)) e.preventDefault();
    return;
  }
  if(mode === 'home' && !modalOpen){
    if(KMAP[e.code]){ e.preventDefault(); keys[KMAP[e.code]] = true; home.target = null; return; }
    if(e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter'){
      e.preventDefault(); if(home.near) act(home.near); return; }
  }
  if(modalOpen && e.code === 'Escape'){ closeModal(); return; }
  if(e.repeat) return;
  if(mode === 'cut'){
    if(e.code === 'Escape'){ e.preventDefault(); skipCut(); }
    else if(e.code === 'Space' || e.code === 'Enter'){ e.preventDefault(); advanceCut(); }
    return;
  }
  if(keyWait >= 0 && modalOpen === 'settings'){
    e.preventDefault();
    if(e.code !== 'Escape'){ settings.keys[keyWait] = e.code; save(); }
    keyWait = -1; openModal('settings'); return;
  }
  if(mode === 'play' && !modalOpen){
    const ln = laneOfCode(e.code);
    if(ln !== undefined){ e.preventDefault(); laneHold[ln] = true; hit(ln); return; }
  }
  if(e.code === 'Escape'){
    if(modalOpen) closeModal();
    else if(mode === 'play') pause();
    else if(mode === 'pause') resumePlay();
  }
});
addEventListener('keyup', e => {
  if(mode === 'run'){ DugiRun.key(e.code, false); return; }
  if(KMAP[e.code]) keys[KMAP[e.code]] = false;
  const ln = laneOfCode(e.code); if(ln !== undefined) laneHold[ln] = false;
});
addEventListener('blur', () => { for(const k in keys) keys[k] = false; });

cv.addEventListener('pointerdown', e => {
  audioKick();
  const r = cv.getBoundingClientRect();
  const mx = (e.clientX - r.left) / r.width * W, my = (e.clientY - r.top) / r.height * H;
  if(mode === 'run'){ DugiRun.pointer(my / H, true); return; }
  if(mode === 'cut'){ advanceCut(); return; }
  if(mode === 'home'){
    let spot = null;
    for(const s of homeSpots()) if(Math.abs(s.x * W - mx) < W * 0.05) spot = s;
    if(spot){ home.target = { x:spot.x, y:0.78 }; home.autoAct = spot; }
    else home.target = { x:Math.max(0.03, Math.min(0.97, mx / W)),
                         y:Math.max(0.60, Math.min(0.90, 0.6 + (my - walkTop()) / (walkBot() - walkTop()) * 0.3)) };
    return;
  }
  if(mode !== 'play') return;
  const ln = Math.max(0, Math.min(3, Math.floor((mx - fieldX()) / laneW())));
  touchLane[e.pointerId] = ln; laneHold[ln] = true; hit(ln);
});
cv.addEventListener('pointerup', e => {
  if(mode === 'run'){ DugiRun.pointer(0, false); return; }
  const ln = touchLane[e.pointerId];
  if(ln !== undefined){ laneHold[ln] = false; delete touchLane[e.pointerId]; }
});
cv.addEventListener('pointercancel', e => {
  const ln = touchLane[e.pointerId];
  if(ln !== undefined){ laneHold[ln] = false; delete touchLane[e.pointerId]; }
});
document.addEventListener('visibilitychange', () => { if(document.hidden && mode === 'play') pause(); });

document.addEventListener('pointerdown', e => {
  audioKick();
  if(e.target.closest('button,.songrow,.dcard,.lv,.cover,.sinfo,.shopcard,.outcard')) uiClick();
}, true);
function audioKick(){
  initAudio();
  if(mode !== 'pause' && !cdTimer && ctx.state === 'suspended') ctx.resume();
  if(mode === 'home' || mode === 'result' || mode === 'runresult') bgmStart();
}

/* 버튼 */
$('shopBtn').onclick = () => openModal('shop');
$('dexBtn').onclick  = () => openModal('wardrobe');
$('setBtn').onclick  = () => openModal('settings');
$('outBtn').onclick  = () => openModal('out');
$('modalClose').onclick = closeModal;
modal.addEventListener('pointerdown', e => { if(e.target === modal) closeModal(); });
$('pauseBtn').onclick = () => pause();
$('resumeBtn').onclick = () => resumePlay();
$('quitBtn').onclick = () => quitPlay();
$('againBtn').onclick = () => startGame();
$('homeBtn').onclick = () => goHome();
$('runAgain').onclick = () => startRun();
$('runHome').onclick = () => goHome();
$('introGo').onclick = () => finishIntro();
$('introName').addEventListener('keydown', e => { if(e.key === 'Enter') finishIntro(); });
$('skipBtn').onclick = () => skipCut();
$('fsBtn').onclick = () => toggleFs();
function toggleFs(){
  try{
    if(!document.fullscreenElement){
      const el = document.documentElement, r = el.requestFullscreen || el.webkitRequestFullscreen;
      if(r) Promise.resolve(r.call(el)).catch(() => {});
    }else if(document.exitFullscreen) document.exitFullscreen();
  }catch(e){}
}
document.addEventListener('fullscreenchange', () => {
  document.body.classList.toggle('fs', !!document.fullscreenElement); resize();
});
/* 런 조작 버튼 */
[['rJump', 'jump'], ['rSlide', 'slide'], ['rSkill', 'skill']].forEach(([id, k]) => {
  const el = $(id); if(!el) return;
  el.addEventListener('pointerdown', e => { e.preventDefault(); DugiRun.pad(k, true); });
  el.addEventListener('pointerup', () => DugiRun.pad(k, false));
  el.addEventListener('pointercancel', () => DugiRun.pad(k, false));
});

/* ===== 메인 루프 ===== */
function frame(ts){
  const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
  if(mode === 'cut' && cut){ drawCut(dt); }
  else if(mode === 'run' || mode === 'runresult'){ DugiRun.frame(dt, mode === 'run'); }
  else if(mode === 'play' || mode === 'pause' || mode === 'result'){ stepPlay(dt, ts); }
  else { updateHome(dt); drawHome(dt); }
  requestAnimationFrame(frame);
}

/* ===== 시작 ===== */
seedScenery();
resize();
applySkin();
if(S.named) goHome(); else askName();
refreshBar();
requestAnimationFrame(frame);
