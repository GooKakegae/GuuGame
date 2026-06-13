'use strict';
// グーちゃんとのすれちがい v2
// 2DK: DK(共有) + 左洋室(グーちゃん) + 右洋室(俺・妻)

const C  = document.getElementById('gameCanvas');
const cx = C.getContext('2d');
const GW=320, GH=272, SC=2;
C.width=GW*SC; C.height=GH*SC;
cx.imageSmoothingEnabled=false;

// ─── Input ───────────────────────────────────────────────────
const K={}, JP={};
document.addEventListener('keydown',e=>{
  initAudio();
  if(!K[e.code])JP[e.code]=true;
  K[e.code]=true;
  e.preventDefault();
});
document.addEventListener('keyup',e=>delete K[e.code]);
function just(...cs){return cs.some(c=>{const v=!!JP[c];JP[c]=false;return v;});}

// ─── Touch Input ─────────────────────────────────────────────
C.addEventListener('touchstart',function(e){
  e.preventDefault();
  initAudio();
  var touch=e.touches[0];
  var rect=C.getBoundingClientRect();
  // タップ位置をゲーム座標に変換
  var tx=(touch.clientX-rect.left)/rect.width*GW;
  var ty=(touch.clientY-rect.top)/rect.height*GH;
  if(phase==='decide'){
    // 左半分→でる、右半分→でない
    if(tx<GW/2) JP['KeyZ']=true;
    else         JP['KeyX']=true;
  } else {
    // それ以外はタップ＝Zキー（決定・次へ）
    JP['KeyZ']=true;
  }
},{passive:false});

// ─── Draw helpers ────────────────────────────────────────────
const px=v=>v*SC;
function r(x,y,w,h,c){cx.fillStyle=c;cx.fillRect(px(x),px(y),px(w),px(h));}
function txt(s,x,y,size,col,align){
  cx.save();
  cx.font='bold '+px(size)+'px "Hiragino Sans","Meiryo",monospace';
  cx.textBaseline='top';
  cx.textAlign=align||'left';
  cx.fillStyle=col;
  cx.fillText(s,px(x),px(y));
  cx.restore();
}
function strokeBox(x,y,w,h,col,lw){
  var t=lw||1;
  cx.save();cx.strokeStyle=col;cx.lineWidth=t*SC;
  cx.strokeRect(px(x)+t*SC/2,px(y)+t*SC/2,px(w)-t*SC,px(h)-t*SC);
  cx.restore();
}
function ell(cx2,cy,rx,ry,col){
  cx.save();cx.fillStyle=col;
  cx.beginPath();cx.ellipse(px(cx2),px(cy),px(rx),px(ry),0,0,Math.PI*2);cx.fill();
  cx.restore();
}
function arc(cx2,cy,rad,a0,a1,col,lw){
  cx.save();cx.strokeStyle=col;cx.lineWidth=(lw||1)*SC;
  cx.beginPath();cx.arc(px(cx2),px(cy),px(rad),a0,a1);cx.stroke();
  cx.restore();
}

// ─── Audio ───────────────────────────────────────────────────
var AC=null;
var bgmTimer=null;

function initAudio(){
  if(AC)return;
  AC=new (window.AudioContext||window.webkitAudioContext)();
  if(AC.state==='suspended')AC.resume();
  setTimeout(startBGM,200);
}

function note(freq,type,vol,dur,t){
  if(!AC)return;
  var now=t||AC.currentTime;
  var osc=AC.createOscillator();
  var g=AC.createGain();
  var f=AC.createBiquadFilter();
  f.type='lowpass';f.frequency.value=2400;
  osc.type=type||'sine';osc.frequency.value=freq;
  g.gain.setValueAtTime(0,now);
  g.gain.linearRampToValueAtTime(vol||0.15,now+0.02);
  g.gain.exponentialRampToValueAtTime(0.001,now+dur);
  osc.connect(f);f.connect(g);g.connect(AC.destination);
  osc.start(now);osc.stop(now+dur+0.05);
}

function startBGM(){
  if(!AC)return;
  // Soft drone
  var drone=[130,164,196];
  drone.forEach(function(f){
    var osc=AC.createOscillator();
    var g=AC.createGain();
    var flt=AC.createBiquadFilter();
    flt.type='lowpass';flt.frequency.value=400;
    osc.type='triangle';osc.frequency.value=f;
    g.gain.value=0.035;
    osc.connect(flt);flt.connect(g);g.connect(AC.destination);
    osc.start();
  });
  // Melody loop
  var mel=[
    [262,0.5],[330,0.5],[392,0.5],[330,0.5],
    [294,0.5],[349,0.5],[440,0.5],[392,1.0],
    [262,0.5],[294,0.5],[330,0.5],[294,0.5],
    [262,0.5],[0,  0.5],[262,0.5],[0,  1.0]
  ];
  var loopLen=mel.reduce(function(a,n){return a+n[1];},0);
  function schedule(){
    if(!AC)return;
    var t=AC.currentTime+0.1;
    mel.forEach(function(n){
      if(n[0]>0)note(n[0],'triangle',0.055,n[1]*0.85,t);
      t+=n[1];
    });
    bgmTimer=setTimeout(schedule,(loopLen-0.6)*1000);
  }
  schedule();
}

function sfxAlert(){
  if(!AC)return;
  note(440,'sine',0.07,0.15);
  setTimeout(function(){note(550,'sine',0.055,0.12);},160);
}
function sfxDoor(){
  if(!AC)return;
  var osc=AC.createOscillator();
  var g=AC.createGain();
  osc.connect(g);g.connect(AC.destination);
  osc.type='sawtooth';
  osc.frequency.setValueAtTime(200,AC.currentTime);
  osc.frequency.exponentialRampToValueAtTime(60,AC.currentTime+0.6);
  g.gain.setValueAtTime(0.07,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.7);
  osc.start();osc.stop(AC.currentTime+0.8);
}
function sfxStep(){
  if(!AC)return;
  var buf=AC.createBuffer(1,Math.floor(AC.sampleRate*0.04),AC.sampleRate);
  var d=buf.getChannelData(0);
  for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  var src=AC.createBufferSource();
  var g=AC.createGain();
  var flt=AC.createBiquadFilter();
  flt.type='lowpass';flt.frequency.value=180;
  g.gain.value=0.12;
  src.buffer=buf;
  src.connect(flt);flt.connect(g);g.connect(AC.destination);
  src.start();
}
function sfxPurr(){
  if(!AC)return;
  var osc=AC.createOscillator();
  var lfo=AC.createOscillator();
  var lg=AC.createGain();
  var g=AC.createGain();
  var flt=AC.createBiquadFilter();
  flt.type='lowpass';flt.frequency.value=260;
  lfo.frequency.value=24;lg.gain.value=6;
  osc.type='sawtooth';osc.frequency.value=80;
  lfo.connect(lg);lg.connect(osc.frequency);
  g.gain.setValueAtTime(0.22,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+1.8);
  osc.connect(flt);flt.connect(g);g.connect(AC.destination);
  lfo.start();lfo.stop(AC.currentTime+2);
  osc.start();osc.stop(AC.currentTime+2);
}
function sfxGoron(){
  if(!AC)return;
  var notes=[523,659,784,880,1047];
  for(var i=0;i<notes.length;i++){
    note(notes[i],'triangle',0.11,0.32,AC.currentTime+i*0.1);
  }
  sfxPurr();
}
function sfxRoar(){
  if(!AC)return;
  var buf=AC.createBuffer(1,Math.floor(AC.sampleRate*0.9),AC.sampleRate);
  var d=buf.getChannelData(0);
  for(var i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length)*0.8;
  var src=AC.createBufferSource();
  var flt=AC.createBiquadFilter();
  var g=AC.createGain();
  flt.type='lowpass';flt.frequency.value=280;
  g.gain.value=0.45;
  src.buffer=buf;
  src.connect(flt);flt.connect(g);g.connect(AC.destination);
  src.start();
  var osc=AC.createOscillator();
  var g2=AC.createGain();
  osc.type='sawtooth';osc.frequency.value=55;
  osc.frequency.exponentialRampToValueAtTime(28,AC.currentTime+1.1);
  g2.gain.setValueAtTime(0.28,AC.currentTime);
  g2.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+1.2);
  osc.connect(g2);g2.connect(AC.destination);
  osc.start();osc.stop(AC.currentTime+1.3);
}
function sfxScare(){
  if(!AC)return;
  var osc=AC.createOscillator();
  var g=AC.createGain();
  osc.connect(g);g.connect(AC.destination);
  osc.type='square';
  osc.frequency.setValueAtTime(900,AC.currentTime);
  osc.frequency.exponentialRampToValueAtTime(180,AC.currentTime+0.4);
  g.gain.setValueAtTime(0.1,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+0.5);
  osc.start();osc.stop(AC.currentTime+0.6);
}

// ─── Layout ──────────────────────────────────────────────────
var AP={
  dk:   {x:10,y:10, w:300,h:103},
  left: {x:10,y:121,w:148,h:141},
  right:{x:162,y:121,w:148,h:141},
  wt:4,
  dlx:52, dlw:40,   // left door x, width
  drx:208,drw:40,   // right door x, width
  midX:158          // vertical wall between rooms
};
// Positions
var POS={
  guuSofa:{x:38,y:178},   // sleeping on sofa
  guuDK:  {x:152,y:62},   // ゴロン in DK
  visDoor:{x:220,y:121},  // visitor start (at right door)
  visDK:  {x:218,y:72}    // visitor target in DK
};

// ─── Draw Apartment ──────────────────────────────────────────
function drawApartment(){
  // Floors
  r(0,0,GW,GH,'#D8D0C8');
  r(AP.dk.x,   AP.dk.y,   AP.dk.w,   AP.dk.h,   '#F4EED8');
  r(AP.left.x, AP.left.y, AP.left.w, AP.left.h, '#F0E8D8');
  r(AP.right.x,AP.right.y,AP.right.w,AP.right.h,'#E4E8F0');

  // Floor patterns
  floorLines(AP.dk.x+2,AP.dk.y+2,AP.dk.w-4,AP.dk.h-4,'#E8E0C8',5);
  floorLines(AP.left.x+2,AP.left.y+2,AP.left.w-4,AP.left.h-4,'#E8D8C0',7);
  floorLines(AP.right.x+2,AP.right.y+2,AP.right.w-4,AP.right.h-4,'#D8DCE8',7);

  // Outer wall
  strokeBox(AP.dk.x,AP.dk.y,AP.dk.w,AP.dk.h+AP.left.h+AP.wt+7,'#1E1818',3);

  // Horizontal partition
  var hwY=AP.dk.y+AP.dk.h;
  r(AP.dk.x,   hwY, AP.dlx-AP.dk.x, AP.wt+1,'#1E1818');
  r(AP.dlx+AP.dlw, hwY, AP.drx-(AP.dlx+AP.dlw), AP.wt+1,'#1E1818');
  r(AP.drx+AP.drw, hwY, AP.dk.x+AP.dk.w-(AP.drx+AP.drw), AP.wt+1,'#1E1818');

  // Vertical middle wall
  r(AP.midX,hwY+AP.wt,AP.wt,AP.left.h+1,'#1E1818');

  // Door frames
  r(AP.dlx,hwY,AP.dlw,2,'#8B6030');
  r(AP.drx,hwY,AP.drw,2,'#8B6030');
  r(AP.dlx,hwY-1,2,4,'#5A3018');r(AP.dlx+AP.dlw-2,hwY-1,2,4,'#5A3018');
  r(AP.drx,hwY-1,2,4,'#5A3018');r(AP.drx+AP.drw-2,hwY-1,2,4,'#5A3018');

  // Door arcs
  cx.save();cx.strokeStyle='#C0A888';cx.lineWidth=SC;
  cx.setLineDash([2*SC,2*SC]);
  cx.beginPath();cx.arc(px(AP.dlx),px(hwY),px(AP.dlw),-Math.PI/2,0);cx.stroke();
  cx.beginPath();cx.arc(px(AP.drx+AP.drw),px(hwY),px(AP.drw),-Math.PI,-Math.PI/2);cx.stroke();
  cx.setLineDash([]);cx.restore();

  // Room labels
  txt('DK',AP.dk.x+8,AP.dk.y+5,7,'#806848');
  txt('グーちゃんの部屋',AP.left.x+5,AP.left.y+5,5,'#906040');
  txt('俺・妻の部屋',AP.right.x+5,AP.right.y+5,5,'#405070');

  // DK table
  drawTable(AP.dk.x+22,AP.dk.y+18);

  // Sofa in left room
  drawSofa(AP.left.x+6,AP.left.y+58);

  // Right room bed/desk
  r(AP.right.x+10,AP.right.y+18,52,32,'#6880A8');
  r(AP.right.x+12,AP.right.y+20,48,28,'#8898B8');
  strokeBox(AP.right.x+10,AP.right.y+18,52,32,'#5070A0',1);
  txt('ベッド',AP.right.x+22,AP.right.y+28,5,'#4060A0');
}

function floorLines(x,y,w,h,col,sp){
  cx.save();cx.fillStyle=col;
  for(var j=y;j<y+h;j+=sp)cx.fillRect(px(x),px(j),px(w),SC);
  for(var i=x;i<x+w;i+=sp*1.5)cx.fillRect(px(i),px(y),SC,px(h));
  cx.restore();
}

function drawTable(x,y){
  r(x,y,58,40,'#C4A060');
  r(x+2,y+2,54,36,'#D8B870');
  r(x+3,y+3,52,34,'#E0C880');
  strokeBox(x,y,58,40,'#A07840',1);
  // chairs
  r(x+8,y-9,12,10,'#8B6030');r(x+9,y-7,10,6,'#A07840');
  r(x+38,y-9,12,10,'#8B6030');r(x+39,y-7,10,6,'#A07840');
  r(x+8,y+40,12,10,'#8B6030');r(x+9,y+42,10,6,'#A07840');
  r(x+38,y+40,12,10,'#8B6030');r(x+39,y+42,10,6,'#A07840');
}

function drawSofa(x,y){
  // top-down sofa view
  var w=68,h=38;
  r(x,y,w,8,'#7A4828');       // backrest
  r(x+1,y+1,w-2,6,'#9A5C30');
  r(x,y+8,w,h-8,'#C47848');  // seat
  r(x+2,y+10,w-4,h-12,'#D8906A');
  r(x+w/3,y+8,2,h-8,'#A86038');
  r(x+2*w/3,y+8,2,h-8,'#A86038');
  r(x,y+8,5,h-8,'#8B4820');r(x+w-5,y+8,5,h-8,'#8B4820');
  strokeBox(x,y,w,h,'#5A3010',1);
}

// ─── グーちゃん Sprite (top-down, cat) ───────────────────────
function drawGuu(fx,fy,state,frame){
  var x=Math.floor(fx),y=Math.floor(fy);
  var fr=Math.floor(frame/10)%2;
  var GR='#9090A0',DK2='#383848',WH='#F4F4F2',PK='#F0A0B0',BK='#181020',EY='#C8D820';

  // shadow
  cx.save();cx.globalAlpha=0.14;ell(x+8,y+16,8,3,'#000');cx.globalAlpha=1;cx.restore();

  if(state==='sleep'){
    // Curled on sofa, top-down
    r(x+2,y+4, 12,9,GR);r(x+3,y+3, 10,10,GR);
    r(x+4,y+5, 8, 6,WH);r(x+5,y+4, 6, 4,DK2); // ハチワレ
    r(x+1,y+5, 6, 6,GR);r(x+2,y+4, 5, 5,GR); // head
    // Tiny ears folded
    r(x+1,y+3,3,3,DK2);r(x+2,y+3,2,2,GR);r(x+5,y+2,3,3,DK2);r(x+6,y+3,2,2,GR);
    r(x+3,y+7,2,1,BK); // sleepy eye
    // Tail
    r(x+12,y+5,4,3,GR);r(x+14,y+7,2,5,GR);r(x+12,y+11,4,2,GR);r(x+10,y+12,5,2,DK2);
    if(fr){txt('z',x+12,y-4,6,'#90A8C8');txt('z',x+15,y-8,4,'#90A8C8');}
  }
  else if(state==='alert'){
    // Sitting, big ears up
    r(x+2,y+7, 12,9,GR);r(x+1,y+9, 14,7,GR);r(x+4,y+9,8,7,WH); // body
    r(x+3,y+2, 10,8,GR);r(x+2,y+4, 12,7,GR); // head
    r(x+3,y+2, 10,5,DK2);r(x+7,y+2,2,7,GR);  // ハチワレ
    // BIG EARS
    r(x+2,y-4,5,8,DK2);r(x+3,y-3,3,6,GR);r(x+4,y-2,2,5,PK);r(x+4,y-5,2,2,DK2);
    r(x+9,y-4,5,8,DK2);r(x+10,y-3,3,6,GR);r(x+11,y-2,2,5,PK);r(x+10,y-5,2,2,DK2);
    // Eyes
    r(x+5,y+5,2,2,EY);r(x+9,y+5,2,2,EY);
    r(x+6,y+5,1,2,BK);r(x+10,y+5,1,2,BK);
    r(x+5,y+5,1,1,WH);r(x+9,y+5,1,1,WH);
    r(x+7,y+8,2,2,'#E08090'); // nose
    // Tail
    r(x+14,y+8,3,5,GR);r(x+15,y+12,3,2,GR);r(x+14,y+13,4,2,DK2);
  }
  else if(state==='walk'){
    r(x+2,y+5, 12,9,GR);r(x+1,y+7, 14,6,GR);r(x+4,y+7,8,6,WH); // body
    r(x+3,y+1, 10,7,GR);r(x+2,y+3, 12,6,GR); // head
    r(x+3,y+1, 10,5,DK2);r(x+7,y+1,2,6,GR);
    r(x+3,y-3,4,7,DK2);r(x+4,y-2,3,6,GR);r(x+5,y-2,2,4,PK);r(x+4,y-4,2,2,DK2);
    r(x+9,y-3,4,7,DK2);r(x+10,y-2,3,6,GR);r(x+11,y-2,2,4,PK);r(x+10,y-4,2,2,DK2);
    r(x+5,y+4,2,2,EY);r(x+9,y+4,2,2,EY);r(x+6,y+4,1,2,BK);r(x+10,y+4,1,2,BK);
    var la=fr;
    r(x+(la?1:3),y+13,3,4,GR);r(x+(la?1:3)+1,y+14,2,2,PK);
    r(x+(la?9:11),y+13,3,4,GR);r(x+(la?9:11)+1,y+14,2,2,PK);
    r(x+14,y+6,3,5,GR);r(x+15,y+10,2,4,GR);r(x+14,y+13,3,2,DK2);
  }
  else if(state==='goron'){
    // BELLY UP in DK - very visible!
    var af=Math.floor(frame/8)%4;
    var pw=af%2; // paw wiggle
    // Belly (white, large, prominent)
    r(x+1,y+5, 16,10,WH);r(x+0,y+7, 18,7, WH);r(x+2,y+4, 14,11,WH);
    // Fur border around belly
    r(x+0,y+5,3,9,GR);r(x+15,y+5,3,9,GR);r(x+3,y+2,12,4,GR);r(x+3,y+14,12,4,GR);
    r(x+7,y+4,4,10,'#EEEEE8'); // ハチワレ belly stripe
    // HEAD at top
    r(x+4,y-1,10,6,GR);r(x+3,y+1,12,5,GR);
    r(x+4,y-1,10,4,DK2);r(x+7,y-1,4,5,GR);
    // Ears (pointing outward)
    r(x+2,y-3,4,5,DK2);r(x+3,y-2,3,4,GR);r(x+4,y-2,2,3,PK);r(x+3,y-4,2,2,DK2);
    r(x+12,y-3,4,5,DK2);r(x+13,y-2,3,4,GR);r(x+14,y-2,2,3,PK);r(x+13,y-4,2,2,DK2);
    // Happy squint eyes
    r(x+5,y+1,4,2,DK2);r(x+9,y+1,4,2,DK2);
    r(x+6,y+0,2,1,WH);r(x+10,y+0,2,1,WH);
    // 4 PAWS UP (all sticking out!)
    r(x+(pw?-2:0),y+6, 5,4,GR);r(x+(pw?-1:1),y+7, 3,2,PK);
    r(x+(pw?15:14),y+6,5,4,GR);r(x+(pw?16:15),y+7,3,2,PK);
    r(x+(pw?-2:0),y+11,5,4,GR);r(x+(pw?-1:1),y+12,3,2,PK);
    r(x+(pw?15:14),y+11,5,4,GR);r(x+(pw?16:15),y+12,3,2,PK);
    // Tail wiggling
    r(x+6,y+17,6,3,GR);r(x+(pw?4:8),y+18,4,3,DK2);
  }
  else if(state==='scared'){
    // Puffed up cat
    r(x+0,y+3,18,13,GR);r(x+1,y+2,16,14,GR);r(x+3,y+4,12,10,WH);
    // Spiky fur
    for(var si=0;si<8;si++){
      var sa=si*Math.PI*2/8;
      r(x+9+Math.round(Math.cos(sa)*9),y+9+Math.round(Math.sin(sa)*8),2,2,GR);
      r(x+9+Math.round(Math.cos(sa)*11),y+9+Math.round(Math.sin(sa)*10),2,2,DK2);
    }
    r(x+3,y+3,12,8,GR);r(x+3,y+3,12,4,DK2);r(x+7,y+3,4,6,GR);
    r(x+2,y-1,4,6,DK2);r(x+3,y+0,3,5,GR);r(x+4,y+0,2,3,PK);r(x+3,y-2,2,2,DK2);
    r(x+12,y-1,4,6,DK2);r(x+13,y+0,3,5,GR);r(x+14,y+0,2,3,PK);r(x+13,y-2,2,2,DK2);
    // Big scared eyes
    r(x+4,y+5,4,4,WH);r(x+10,y+5,4,4,WH);
    r(x+5,y+6,3,3,EY);r(x+11,y+6,3,3,EY);
    r(x+6,y+6,2,3,BK);r(x+12,y+6,2,3,BK);
    r(x+5,y+5,1,1,WH);r(x+11,y+5,1,1,WH);
  }
  else if(state==='sad'){
    r(x+3,y+7,10,8,GR);r(x+2,y+9,12,6,GR);r(x+4,y+9,8,5,WH);
    r(x+3,y+2,10,8,GR);r(x+2,y+4,12,6,GR);
    r(x+3,y+2,10,4,DK2);r(x+7,y+2,2,7,GR);
    r(x+3,y+0,3,5,DK2);r(x+4,y+1,2,4,GR);
    r(x+10,y+0,3,5,DK2);r(x+11,y+1,2,4,GR);
    r(x+5,y+5,2,1,BK);r(x+9,y+5,2,1,BK);
    r(x+13,y+11,2,6,GR);r(x+12,y+16,4,2,DK2);
  }
}

// ─── Visitor Sprites ─────────────────────────────────────────
function drawVisitor(type,fx,fy,frame,happy){
  var x=Math.floor(fx),y=Math.floor(fy);
  var fr=Math.floor(frame/10)%2;

  cx.save();cx.globalAlpha=0.14;ell(x+7,y+22,7,3,'#000');cx.globalAlpha=1;cx.restore();

  if(type==='ore'){
    r(x+3,y+1, 10,10,'#F8C8A0');r(x+4,y+2,8,8,'#F0B888');
    r(x+3,y+1, 10,5, '#1E1810');r(x+3,y+1,2,7,'#1E1810');r(x+11,y+1,2,7,'#1E1810');
    if(happy){
      r(x+5,y+7,2,1,'#282820');r(x+9,y+7,2,1,'#282820');r(x+6,y+9,4,2,'#C05050');
    }else{
      r(x+5,y+6,2,2,'#282820');r(x+9,y+6,2,2,'#282820');r(x+7,y+9,2,1,'#C08070');
    }
    r(x+1,y+11,14,9,'#3858A8');r(x+6,y+11,4,3,'#F8F8F0');
    r(x+0,y+11,2,7,'#F8C8A0');r(x+14,y+11,2,7,'#F8C8A0');
    r(x+2,y+19,5,5,'#282838');r(x+9,y+19,5,5,'#282838');
    if(fr){r(x+2,y+22,4,2,'#181820');r(x+10,y+20,4,2,'#181820');}
    else  {r(x+2,y+20,4,2,'#181820');r(x+10,y+22,4,2,'#181820');}
  }
  else if(type==='tsuma'){
    r(x+3,y+1, 10,10,'#F8D0A8');r(x+4,y+2,8,8,'#F8C898');
    r(x+2,y+0, 12,5, '#8B5018');r(x+2,y+0,2,12,'#8B5018');r(x+12,y+0,2,12,'#8B5018');
    r(x+2,y+10,2,6,'#8B5018');r(x+12,y+10,2,6,'#8B5018');
    if(happy){
      r(x+5,y+7,2,1,'#282820');r(x+9,y+7,2,1,'#282820');r(x+6,y+9,4,2,'#D05070');
      r(x+4,y+8,1,1,'#F090A0');r(x+11,y+8,1,1,'#F090A0');
    }else{
      r(x+5,y+6,2,2,'#282820');r(x+9,y+6,2,2,'#282820');
      r(x+4,y+7,1,1,'#F0A0A0');r(x+11,y+7,1,1,'#F0A0A0');
      r(x+7,y+9,2,1,'#C07880');
    }
    r(x+2,y+11,12,9,'#E87898');r(x+6,y+11,4,3,'#F8F0F4');
    r(x+0,y+11,2,7,'#F8D0A8');r(x+14,y+11,2,7,'#F8D0A8');
    r(x+1,y+19,14,5,'#F0B0C8');
    r(x+3,y+23,4,2,'#F8D0A8');r(x+9,y+23,4,2,'#F8D0A8');
    if(fr){r(x+3,y+24,3,1,'#D8A0A0');r(x+10,y+23,3,1,'#D8A0A0');}
    else  {r(x+3,y+23,3,1,'#D8A0A0');r(x+10,y+24,3,1,'#D8A0A0');}
  }
  else if(type==='gorilla'){
    r(x-2,y+3, 20,14,'#1E1008');r(x-1,y+2,18,15,'#2A1810');r(x+0,y+1,16,14,'#2A1810');
    r(x+2,y+3, 12,10,'#381808');r(x+3,y+5,10,8,'#281008');
    r(x+4,y+3, 3,4,  '#E01010');r(x+9,y+3,3,4,'#E01010');
    r(x+5,y+4, 2,3,  '#FF4040');r(x+10,y+4,2,3,'#FF4040');
    r(x+5,y+3, 1,1,  '#FFD0D0');r(x+10,y+3,1,1,'#FFD0D0');
    r(x-4,y+8, 7,12, '#1E1008');r(x+13,y+8,7,12,'#1E1008');
    r(x-5,y+16,7,5,  '#2A1810');r(x+14,y+16,7,5,'#2A1810');
    r(x+0,y+17,16,8,'#1E1008');
    r(x+2,y+23,5,5,  '#1E1008');r(x+9,y+23,5,5,'#1E1008');
    r(x+6,y+8, 4,4,  '#100808');r(x+7,y+9,2,3,'#1E0808');
  }
}

// ─── Particles ───────────────────────────────────────────────
var parts=[];
function addParts(x,y,col,n,spd){
  for(var i=0;i<(n||10);i++){
    var a=Math.random()*Math.PI*2;
    var s=0.5+Math.random()*(spd||2.5);
    parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-0.8,col:col,life:55,ml:55,sz:1.5+Math.random()*2,heart:false});
  }
}
function addHearts(x,y,n){
  for(var i=0;i<(n||6);i++){
    var a=-Math.PI/2+(Math.random()-0.5)*1.4;
    var s=0.6+Math.random()*1.8;
    var cols=['#FF6080','#FF8080','#FFB0C0','#FF4060'];
    parts.push({x:x,y:y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,col:cols[Math.floor(Math.random()*4)],life:70,ml:70,sz:2.5+Math.random()*2,heart:true});
  }
}
function updateParts(){
  parts=parts.filter(function(p){p.x+=p.vx;p.y+=p.vy;p.vy+=0.05;p.life--;return p.life>0;});
}
function drawParts(){
  cx.save();
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    cx.globalAlpha=p.life/p.ml;
    if(p.heart){
      cx.fillStyle=p.col;
      cx.beginPath();
      cx.arc(px(p.x-p.sz/2),px(p.y-p.sz/2),px(p.sz/2),Math.PI,0);
      cx.arc(px(p.x+p.sz/2),px(p.y-p.sz/2),px(p.sz/2),Math.PI,0);
      cx.lineTo(px(p.x),px(p.y+p.sz));
      cx.closePath();cx.fill();
    }else{
      r(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz,p.col);
    }
  }
  cx.globalAlpha=1;cx.restore();
}

// ─── Clue database ───────────────────────────────────────────
var CLUES=[
  {sym:'👟',text:'軽い足音',       h:{ore:3,tsuma:3,gorilla:0}},
  {sym:'🦶',text:'重い足音',       h:{ore:1,tsuma:0,gorilla:4}},
  {sym:'🗝',text:'鍵ジャラジャラ', h:{ore:5,tsuma:5,gorilla:0}},
  {sym:'🚪',text:'ドアの音',        h:{ore:2,tsuma:2,gorilla:2}},
  {sym:'😤',text:'うなり声',        h:{ore:0,tsuma:0,gorilla:5}},
  {sym:'📱',text:'スマホの音',      h:{ore:4,tsuma:4,gorilla:0}},
  {sym:'💥',text:'大きな物音',      h:{ore:0,tsuma:0,gorilla:4}},
  {sym:'🎵',text:'鼻歌',            h:{ore:3,tsuma:4,gorilla:0}},
  {sym:'👛',text:'バッグの音',      h:{ore:2,tsuma:3,gorilla:0}},
  {sym:'💨',text:'圧倒的な気配',    h:{ore:0,tsuma:0,gorilla:5}},
  {sym:'🌸',text:'いい香り',        h:{ore:0,tsuma:5,gorilla:0}},
  {sym:'🍜',text:'いい匂い',        h:{ore:2,tsuma:3,gorilla:0}}
];

var VISITORS=[
  {type:'ore',    name:'主人！',   prob:0.42},
  {type:'tsuma',  name:'奥さん！', prob:0.38},
  {type:'gorilla',name:'ゴリラ！', prob:0.20}
];

function pickVisitor(){
  var rv=Math.random(),acc=0;
  for(var i=0;i<VISITORS.length;i++){acc+=VISITORS[i].prob;if(rv<acc)return VISITORS[i];}
  return VISITORS[0];
}
function pickClues(vtype,n){
  var result=[];
  for(var i=0;i<n;i++){
    var pool=[];
    for(var j=0;j<CLUES.length;j++){
      var w=(CLUES[j].h[vtype]||0)+1;
      for(var k=0;k<w;k++)pool.push(CLUES[j]);
    }
    result.push(pool[Math.floor(Math.random()*pool.length)]);
  }
  return result;
}

// ─── Game State ──────────────────────────────────────────────
var gs='title';
var ROUND=0,SCORE=0,MAX_ROUNDS=8,comboCount=0;
var visitor=null,clues=[],clueVisible=0;
var phase='sleep';
var ptimer=0,anim=0,guuFrame=0;
var guuX=POS.guuSofa.x,guuY=POS.guuSofa.y;
var guuState='sleep';
var visX=POS.visDoor.x,visY=POS.visDoor.y+30;
var doorOA=0,resultStr='';
var visHappy=false,showPeek=false;
var titleT=0,stepT=0;

function startGame(){
  ROUND=0;SCORE=0;comboCount=0;
  nextRound();gs='game';
}
function nextRound(){
  ROUND++;
  visitor=pickVisitor();
  var n=2+(ROUND>3?1:0)+(ROUND>6?1:0);
  clues=pickClues(visitor.type,n);
  clueVisible=0;ptimer=0;anim=0;guuFrame=0;
  guuX=POS.guuSofa.x;guuY=POS.guuSofa.y;guuState='sleep';
  visX=POS.visDoor.x;visY=POS.visDoor.y+30;
  doorOA=0;resultStr='';parts=[];visHappy=false;showPeek=false;
  phase='sleep';
}

function update(){
  anim++;guuFrame++;ptimer++;stepT++;
  switch(phase){
    case 'sleep':
      if(ptimer>65){phase='alert';ptimer=0;guuState='alert';sfxAlert();}
      break;
    case 'alert':
      if(ptimer>50){phase='clue';ptimer=0;clueVisible=1;}
      break;
    case 'clue':
      if(ptimer>80){ptimer=0;clueVisible++;if(clueVisible>clues.length){phase='decide';ptimer=0;}}
      break;
    case 'decide':
      if(just('KeyZ','Space','Enter')){phase='walk';ptimer=0;guuState='walk';}
      else if(just('KeyX','Backspace')||ptimer>150){
        phase='dooropen';ptimer=0;
        resultStr=(visitor.type!=='gorilla')?'staylose':'staywin';
      }
      break;
    case 'walk':{
      var tx=POS.guuDK.x,ty=POS.guuDK.y;
      var dx=tx-guuX,dy=ty-guuY,d=Math.sqrt(dx*dx+dy*dy);
      if(stepT>14){sfxStep();stepT=0;}
      if(d<2){guuX=tx;guuY=ty;phase='dooropen';ptimer=0;}
      else{guuX+=dx/d*2.4;guuY+=dy/d*2.4;}
      break;}
    case 'dooropen':
      doorOA=Math.min(1,ptimer/30);
      if(ptimer===8)sfxDoor();
      if(ptimer>38){phase='reveal';ptimer=0;visX=POS.visDoor.x;visY=POS.visDoor.y;}
      break;
    case 'reveal':{
      var tx2=POS.visDK.x,ty2=POS.visDK.y;
      var dx2=tx2-visX,dy2=ty2-visY,d2=Math.sqrt(dx2*dx2+dy2*dy2);
      if(d2>2){visX+=dx2/d2*1.8;visY+=dy2/d2*1.8;}
      if(stepT>12){sfxStep();stepT=0;}
      if(ptimer===35&&resultStr===''){
        if(visitor.type!=='gorilla'){
          resultStr='goron';guuState='goron';sfxGoron();
          addHearts(POS.guuDK.x+8,POS.guuDK.y,12);
          addParts(POS.guuDK.x+8,POS.guuDK.y+8,'#FFD040',12,3);
          addParts(POS.guuDK.x+8,POS.guuDK.y+8,'#FF8080',8,2);
          setTimeout(function(){visHappy=true;addHearts(POS.visDK.x+7,POS.visDK.y,8);},500);
          setTimeout(function(){showPeek=true;},900);
          comboCount++;
        }else{
          resultStr='scared';guuState='scared';sfxRoar();
          setTimeout(sfxScare,400);
          addParts(guuX+8,guuY+8,'#404050',8,2.5);
          comboCount=0;
        }
      }
      if(ptimer===35&&(resultStr==='staywin'||resultStr==='staylose')){
        if(resultStr==='staylose'){guuState='sad';comboCount=0;}
        else{guuState='alert';addParts(guuX+8,guuY+8,'#80FF80',6,1.5);comboCount++;}
      }
      if(ptimer>110&&just('KeyZ','Space','Enter','KeyX')){
        if(resultStr==='goron')SCORE+=2;
        else if(resultStr==='staywin')SCORE+=1;
        else if(resultStr==='staylose')SCORE-=1;
        if(ROUND>=MAX_ROUNDS)gs='gameover';
        else nextRound();
      }
      break;}
  }
  updateParts();
}

// ─── Draw Clue ───────────────────────────────────────────────
function drawClue(c,idx){
  var bx=AP.left.x+2,by=AP.left.y+50+idx*27;
  var bw=142,bh=22;
  r(bx+2,by+2,bw,bh,'rgba(0,0,0,0)');
  r(bx,by,bw,bh,'#FDFDF0');
  strokeBox(bx,by,bw,bh,'#C0B080',1);
  r(bx+bw,by+9,5,2,'#FDFDF0');
  r(bx+bw,by+9,4,1,'#C0B080');
  txt(c.sym+' '+c.text,bx+4,by+6,5,'#403818');
}

// ─── Decide UI ───────────────────────────────────────────────
function drawDecideUI(){
  var by=GH-52;
  r(0,by,GW,52,'#18120C');r(0,by,GW,2,'#504030');
  // タイマーバー
  var tl=Math.max(0,1-ptimer/150);
  r(0,by+2,GW,5,'#100E08');r(0,by+2,GW*tl,5,tl>0.4?'#50D830':'#E06820');
  // 左ボタン（でる）
  r(4, by+9,152,36,'#182858');strokeBox(4, by+9,152,36,'#3060C0',1.5);
  // 右ボタン（でない）
  r(164,by+9,152,36,'#581818');strokeBox(164,by+9,152,36,'#C03030',1.5);
  txt('👈 でる',  18, by+14, 9,'#80C0FF');
  txt('タップ/Z', 18, by+29, 5,'#6090D8');
  txt('でない 👉',176,by+14, 9,'#FFA0A0');
  txt('タップ/X', 184,by+29, 5,'#D07070');
}

// ─── Result UI ───────────────────────────────────────────────
function drawResultUI(){
  if(ptimer<55)return;
  var by=GH-62;
  var msg='',col='#F8F0D0',sub='',pts='';
  if(resultStr==='goron'){
    msg='ゴロン！';col='#FFD040';
    sub=(visitor.type==='ore'?'主人':'奥さん')+'だった！うれしい♪';
    pts='+2点'+(comboCount>1?' '+comboCount+'連続!!':'');
  }else if(resultStr==='scared'){
    msg='こわかった…';col='#B0B0C8';sub='ゴリラだった！';pts='0点';
  }else if(resultStr==='staywin'){
    msg='セーフ！';col='#80FF80';sub='でなくて正解！';pts='+1点';
  }else if(resultStr==='staylose'){
    msg='みすごした…';col='#FF9090';sub='ゴロンできたのに！';pts='-1点';
  }
  r(20,by,280,52,'#12100C');strokeBox(20,by,280,52,'#605040',1.5);
  txt(msg,GW/2,by+6,12,col,'center');
  txt(sub,GW/2,by+23,6,'#C0B090','center');
  txt(pts,GW/2,by+35,8,col,'center');
  txt('Zキーで次へ',GW/2,by+46,5,'#706050','center');
}

// ─── Second person peek ──────────────────────────────────────
function drawPeek(){
  if(!showPeek)return;
  var peekType=visitor.type==='ore'?'tsuma':'ore';
  var px2=AP.dlx+16,py2=AP.dk.y+AP.dk.h-24;
  drawVisitor(peekType,px2-6,py2-8,anim,true);
  r(px2-38,py2-38,58,18,'#FDFDF0');
  strokeBox(px2-38,py2-38,58,18,'#D0B090',1);
  txt('かわい!!',px2-36,py2-34,5,'#C04060');
}

// ─── HUD ─────────────────────────────────────────────────────
function drawHUD(){
  r(0,0,GW,10,'#18100C');
  txt('R'+ROUND+'/'+MAX_ROUNDS,4,1,6,'#C0A870');
  txt('SCORE: '+SCORE,GW/2,1,6,'#F8E040','center');
  if(comboCount>1)txt('x'+comboCount+' COMBO',GW-54,1,5,'#F8A040');
}

// ─── Title ───────────────────────────────────────────────────
function drawTitle(){
  titleT++;
  r(0,0,GW,GH,'#0C0A08');r(0,50,GW,GH-50,'#121808');r(0,130,GW,GH-130,'#182010');
  // Moon
  ell(250,22,12,12,'#F8F0B0');ell(252,20,9,9,'#FDFAD8');
  // Stars
  for(var i=0;i<22;i++){
    if(Math.floor(titleT/28+i*9)%3)continue;
    r((i*67+11)%280+10,(i*41+3)%95+5,1,1,'#F8F8E8');
  }
  txt('グーちゃんとの',GW/2,50,10,'#F8F0C0','center');
  txt('すれちがい',GW/2,66,13,'#F8D840','center');
  drawGuu(GW/2-8,96,Math.floor(titleT/50)%2===0?'alert':'goron',titleT);
  updateParts();drawParts();
  r(22,128,276,104,'#100E08');strokeBox(22,128,276,104,'#504030',1);
  txt('あそびかた',GW/2,132,7,'#C0A870','center');
  txt('物音のヒントから誰が来たか判断！',GW/2,145,5,'#A09080','center');
  txt('Z → DKへでる（主人か奥さんなら◎）',28,158,5,'#6090E8');
  txt('X → でない（ゴリラなら◎）',28,168,5,'#E07070');
  txt('ゴロン成功 = +2点',28,180,5,'#F8D040');
  txt('ゴリラを正しく回避 = +1点',28,190,5,'#80FF80');
  txt('ゴリラに遭遇 = 0点',28,200,5,'#C0C0D0');
  txt('見逃し = -1点',28,210,5,'#FF9090');
  txt('8ラウンド勝負！',GW/2,222,5,'#A09078','center');
  if(Math.floor(titleT/25)%2===0)txt('Z キーではじめる',GW/2,238,8,'#F8E040','center');
  if(just('KeyZ','Space','Enter'))startGame();
}

// ─── Game Over ───────────────────────────────────────────────
function drawGameOver(){
  titleT++;
  r(0,0,GW,GH,'#0C0A08');r(0,100,GW,GH-100,'#121008');
  updateParts();drawParts();
  if(SCORE>=14&&Math.random()<0.06)addParts(Math.random()*GW,Math.random()*50,'#FFD040',1,3);
  txt('ゲームクリア！',GW/2,22,13,'#F8E040','center');
  txt('スコア: '+SCORE+' 点',GW/2,48,10,'#F8F0D0','center');
  var rank;
  if(SCORE>=16)rank={t:'完璧猫！最高！',col:'#FFD040',st:'goron'};
  else if(SCORE>=12)rank={t:'天才猫！',col:'#80FF80',st:'goron'};
  else if(SCORE>=8) rank={t:'デキる猫',col:'#F0C080',st:'alert'};
  else if(SCORE>=4) rank={t:'ふつうの猫',col:'#E08080',st:'sad'};
  else              rank={t:'ダメダメ猫…',col:'#B0B0C8',st:'sleep'};
  r(50,66,220,24,'#1A1408');strokeBox(50,66,220,24,'#605030',1);
  txt(rank.t,GW/2,70,9,rank.col,'center');
  drawGuu(GW/2-8,100,rank.st,titleT);
  txt('Z キーでもう一度',GW/2,155,8,Math.floor(titleT/25)%2===0?'#F8E040':'#C0A820','center');
  if(just('KeyZ','Space','Enter')){gs='title';titleT=0;}
}

// ─── Draw Game Scene ─────────────────────────────────────────
function drawScene(){
  drawApartment();
  drawHUD();
  // Clues
  if(phase!=='sleep'){
    for(var i=0;i<Math.min(clueVisible,clues.length);i++)drawClue(clues[i],i);
  }
  // Alert waves
  if(phase==='alert'){
    cx.save();cx.globalAlpha=Math.max(0,1-ptimer/50)*0.5;
    for(var wi=1;wi<=3;wi++){
      cx.strokeStyle='#D0A840';cx.lineWidth=1.5;
      cx.beginPath();cx.arc(px(AP.right.x+12),px(AP.dk.y+AP.dk.h+8),px(wi*9+ptimer/3),0,Math.PI*2);cx.stroke();
    }
    cx.globalAlpha=1;cx.restore();
  }
  if(phase==='decide')drawDecideUI();
  // グーちゃん
  drawGuu(guuX,guuY,guuState,guuFrame);
  // Visitor
  if(phase==='reveal'||(phase==='dooropen'&&ptimer>28)){
    drawVisitor(visitor.type,visX,visY,anim,visHappy);
  }
  // Door open animation
  if(phase==='dooropen'||phase==='reveal'){
    var hwY=AP.dk.y+AP.dk.h;
    var ow=Math.max(1,AP.drw*(1-doorOA));
    r(AP.drx,hwY,AP.drw,AP.wt+1,AP.dk.col==='#F4EED8'?'#F4EED8':'#F4EED8');
    if(ow>1){r(AP.drx,hwY,ow,AP.wt,'#8B6030');r(AP.drx,hwY,ow,1,'#C09050');}
  }
  // Second person peek (when goron)
  if(phase==='reveal'&&resultStr==='goron'&&ptimer>45)drawPeek();
  // Result
  if(phase==='reveal'&&resultStr!=='')drawResultUI();
  drawParts();
}

// ─── Main Loop ───────────────────────────────────────────────
function loop(){
  requestAnimationFrame(loop);
  cx.clearRect(0,0,C.width,C.height);
  switch(gs){
    case 'title':    drawTitle();break;
    case 'game':     update();drawScene();break;
    case 'gameover': drawGameOver();break;
  }
  Object.keys(JP).forEach(function(k){JP[k]=false;});
}
loop();
