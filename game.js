(() => {
  'use strict';
  const canvas = document.querySelector('#screen');
  const ctx = canvas.getContext('2d');
  const soundButton = document.querySelector('#sound');
  const pauseButton = document.querySelector('#pause');
  const toast = document.querySelector('#toast');
  const controls = document.querySelector('.touch-controls');
  const held = new Set();
  let W = 0, H = 0, dpr = 1, portrait = false;
  let mode = 'title', paused = false, soundOn = true, last = 0, elapsed = 0;
  let round = 1, timer = 99, roundDelay = 0, screenShake = 0, hitStop = 0, flash = 0;
  let particles = [], projectiles = [], toastTimer = 0, audioCtx;
  const clamp = (n,a,b)=>Math.max(a,Math.min(b,n));
  const rand = (a,b)=>a+Math.random()*(b-a);
  const mix = (a,b,t)=>a+(b-a)*t;
  const player = makeFighter('mai', .28);
  const enemy = makeFighter('bear', .72);
  function makeFighter(kind, pos) {
    return {kind, x:0, home:pos, y:0, vy:0, hp:100, meter:35, facing:kind==='mai'?1:-1,
      state:'idle', action:0, hitDone:false, invuln:0, stun:0, combo:0, comboTime:0, aiWait:0, block:0, wins:0};
  }
  function resize(){
    const rect=canvas.getBoundingClientRect(); W=rect.width; H=rect.height; portrait=H>W;
    dpr=Math.min(window.devicePixelRatio||1,2); canvas.width=Math.round(W*dpr); canvas.height=Math.round(H*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(mode==='title'||mode==='select'){player.x=W*.28;enemy.x=W*.72;player.y=enemy.y=0;}
  }
  window.addEventListener('resize',resize,{passive:true}); resize();
  function resetRound(){
    player.x=W*.27; enemy.x=W*.73; player.y=enemy.y=0; player.vy=enemy.vy=0;
    player.hp=enemy.hp=100; player.meter=Math.max(25,player.meter); enemy.meter=30;
    player.state=enemy.state='idle'; player.action=enemy.action=0; player.stun=enemy.stun=0;
    player.hitDone=enemy.hitDone=false; timer=99; projectiles=[]; particles=[];
    player.facing=1;enemy.facing=-1;roundDelay=1.5;mode='fight';toastShow(round===1?'ROUND 1':'ROUND '+round,1.3);
  }
  function start(){round=1;player.wins=enemy.wins=0;player.meter=35;resetRound();}
  function toastShow(text,time=.8){toast.textContent=text;toastTimer=time;}
  function sound(freq=180,duration=.08,type='sine',volume=.035){
    if(!soundOn)return;
    try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.setValueAtTime(volume,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(_){ }
  }
  function action(f,kind){
    if(mode!=='fight'||paused||roundDelay>0||f.stun>0||['attack','special','hit','ko'].includes(f.state))return;
    const moves={punch:{duration:.37,active:.14,damage:7,reach:W*.105,stun:.32},kick:{duration:.53,active:.22,damage:11,reach:W*.145,stun:.48},special:{duration:.72,active:.24,damage:14,reach:W*.5,stun:.58}};
    if(kind==='special'&&f.meter<35){toastShow('NEED 35 ENERGY');sound(120,.12,'square');return;}
    if(kind==='special')f.meter-=35;
    f.state=kind==='special'?'special':'attack'; f.move=kind; f.action=0; f.hitDone=false; f.moveData=moves[kind];
    if(kind==='special'&&f.kind==='mai'){
      projectiles.push({x:f.x+f.facing*38,y:floorY()-H*.19,vx:f.facing*W*.55,owner:f,life:1.5,damage:16});
      burst(f.x+f.facing*40,floorY()-H*.2,'#ffb9d1',9);
    }
    if(kind==='special'&&f.kind==='bear'){
      // A powerful advancing body rush, with clear startup and generous close-range reach.
      f.moveData.reach=W*.18;f.moveData.damage=17;f.moveData.stun=.72;
    }
    sound(kind==='kick'?125:kind==='special'?340:220,.12,kind==='special'?'sawtooth':'triangle',.04);
  }
  function jump(f){if(mode!=='fight'||paused||roundDelay>0||f.y<1||f.stun>0)return;f.vy=-H*.74;f.state='jump';sound(280,.06,'sine',.02);}
  function setBlock(f,on){if(on&&mode==='fight'&&!paused&&f.stun<=0&&f.state==='idle'&&f.y===0){f.state='block';f.block=.1;}else if(!on&&f.state==='block'){f.state='idle';}}
  function floorY(){return H*(portrait?.72:.785);}
  function handlePress(key){
    if(key==='enter'||key===' '){if(mode==='title'||mode==='over'){start();return;}if(mode==='fight'&&paused){paused=false;return;}}
    if(key==='escape'||key==='p'){if(mode==='fight'){paused=!paused;return;}}
    if(mode==='title'||mode==='over')return;
    if(key==='a'||key==='arrowleft')held.add('left');if(key==='d'||key==='arrowright')held.add('right');
    if(key==='w'||key==='arrowup')jump(player);if(key==='s'||key==='arrowdown')setBlock(player,true);
    if(key==='j')action(player,'punch');if(key==='k')action(player,'kick');if(key==='l')action(player,'special');
  }
  function handleRelease(key){
    if(key==='a'||key==='arrowleft')held.delete('left');if(key==='d'||key==='arrowright')held.delete('right');
    if(key==='s'||key==='arrowdown')setBlock(player,false);
  }
  window.addEventListener('keydown',e=>{const key=e.key.toLowerCase();if([' ','arrowleft','arrowright','arrowup','arrowdown'].includes(key))e.preventDefault();if(!e.repeat)handlePress(key);});
  window.addEventListener('keyup',e=>handleRelease(e.key.toLowerCase()));
  document.querySelectorAll('[data-control]').forEach(btn=>{
    const key=btn.dataset.control;
    const down=e=>{e.preventDefault();btn.classList.add('pressed');if(key==='left'||key==='right')held.add(key);else if(key==='jump')jump(player);else if(key==='block')setBlock(player,true);else action(player,key);};
    const up=e=>{e.preventDefault();btn.classList.remove('pressed');if(key==='left'||key==='right')held.delete(key);if(key==='block')setBlock(player,false);};
    btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('lostpointercapture',up);
  });
  canvas.addEventListener('pointerdown',()=>{if(mode==='title'||mode==='over')start();else if(paused)paused=false;});
  soundButton.addEventListener('click',()=>{soundOn=!soundOn;soundButton.textContent=soundOn?'♪':'×';toastShow(soundOn?'SOUND ON':'SOUND OFF');});
  pauseButton.addEventListener('click',()=>{if(mode==='fight'){paused=!paused;pauseButton.textContent=paused?'▶':'Ⅱ';}});
  function burst(x,y,color,n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:rand(-W*.18,W*.18),vy:rand(-H*.27,H*.12),life:rand(.22,.55),max:.55,color,size:rand(3,8)});}
  function fighterUpdate(f,dt){
    f.action=Math.max(0,f.action-dt);f.block=Math.max(0,f.block-dt);f.invuln=Math.max(0,f.invuln-dt);f.stun=Math.max(0,f.stun-dt);f.comboTime=Math.max(0,f.comboTime-dt);
    if(f.comboTime===0)f.combo=0;
    if(f.y<0||f.vy<0){f.y+=f.vy*dt;f.vy+=H*1.95*dt;if(f.y>=0){f.y=0;f.vy=0;if(f.state==='jump')f.state='idle';burst(f.x,floorY()-3,'#d7eaff',4);}}
    if(f.state==='attack'||f.state==='special'){
      const m=f.moveData;
      if(!f.hitDone&&f.action<=m.duration-m.active){
        f.hitDone=true;
        if(f===player&&f.move==='special'&&f.kind==='mai'){}else resolveHit(f===player?enemy:player,f,m.damage,m.stun,m.reach);
      }
      if(f.action<=0){f.state=f.y<0?'jump':'idle';f.move='';}
    } else if(f.state==='hit'&&f.action<=0){f.state=f.y<0?'jump':'idle';}
    if(f.state==='block'&&f.block<=0)f.state='idle';
    if(f.stun>0&&f.state!=='hit'){f.state='hit';f.action=f.stun;}
  }
  function resolveHit(target,attacker,damage,stun,reach){
    if(target.invuln>0||target.state==='ko'||target.hp<=0)return;
    const gap=Math.abs(target.x-attacker.x);if(gap>reach+(target.kind==='bear'?W*.045:0))return;
    if(Math.abs(target.y-attacker.y)>H*.15)return;
    const blocked=target.state==='block'&&target.facing===-attacker.facing;
    const actual=blocked?Math.ceil(damage*.16):damage;
    target.hp=clamp(target.hp-actual,0,100);target.stun=blocked?.14:stun;target.state=blocked?'block':'hit';target.action=target.stun;target.invuln=blocked?.12:.38;
    attacker.meter=clamp(attacker.meter+(blocked?4:9),0,100);target.meter=clamp(target.meter+3,0,100);
    if(attacker===player){player.combo++;player.comboTime=1.2;}else{enemy.combo++;enemy.comboTime=1.2;}
    screenShake=blocked?.06:.16;hitStop=.045;flash=blocked?.08:.12;
    burst(target.x,target.y+floorY()-H*.2,blocked?'#fff2a8':'#ff6991',blocked?5:12);
    sound(blocked?270:90+Math.random()*90,blocked?.06:.16,blocked?'triangle':'sawtooth',.055);
    if(target.hp<=0){target.state='ko';target.stun=0;roundDelay=2.2;}
  }
  function aiUpdate(dt){
    if(enemy.stun>0||enemy.state==='attack'||enemy.state==='special'||enemy.state==='hit'||enemy.state==='ko'||roundDelay>0)return;
    enemy.aiWait-=dt;
    const dist=Math.abs(player.x-enemy.x);enemy.facing=player.x>enemy.x?1:-1;
    if(dist>W*.16){enemy.state='walk';enemy.x+=enemy.facing*W*.14*dt;}
    else if(enemy.aiWait<=0){
      enemy.aiWait=rand(.35,.9);
      if(player.state==='attack'&&Math.random()<.42){enemy.state='block';enemy.block=.38;}
      else if(dist<W*.15&&Math.random()<.68)action(enemy,Math.random()<.36?'kick':'punch');
      else if(dist<W*.23&&enemy.meter>=35&&Math.random()<.28)action(enemy,'special');
      else if(Math.random()<.2)jump(enemy);
    }
    if(enemy.state==='walk'&&dist<W*.13)enemy.state='idle';
  }
  function update(dt){
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toast.textContent='';}
    if(mode!=='fight'||paused)return;
    if(hitStop>0){hitStop-=dt;return;}
    if(roundDelay>0){roundDelay-=dt;if(roundDelay<=0&&(player.hp<=0||enemy.hp<=0))finishRound();return;}
    timer=Math.max(0,timer-dt);if(timer<=0){finishRound(true);return;}
    player.facing=enemy.x>player.x?1:-1;enemy.facing=player.x>enemy.x?1:-1;
    if(player.stun<=0&&!['attack','special','hit','ko'].includes(player.state)){
      const move=(held.has('right')?1:0)-(held.has('left')?1:0);
      if(move){player.x+=move*W*.24*dt;player.state='walk';}else if(player.state==='walk')player.state='idle';
      if(held.has('left')&&player.x<enemy.x)player.facing=-1;
      if(held.has('right')&&player.x>enemy.x)player.facing=1;
    }
    aiUpdate(dt);
    player.x=clamp(player.x,W*.055,W*.945);enemy.x=clamp(enemy.x,W*.055,W*.945);
    if(Math.abs(player.x-enemy.x)<W*.095&&player.y===0&&enemy.y===0){const sign=player.x<enemy.x?-1:1;player.x+=sign*W*.03;enemy.x-=sign*W*.03;}
    fighterUpdate(player,dt);fighterUpdate(enemy,dt);
    for(let i=projectiles.length-1;i>=0;i--){const p=projectiles[i];p.x+=p.vx*dt;p.life-=dt;
      const target=p.owner===player?enemy:player;
      if(Math.abs(p.x-target.x)<W*.055&&Math.abs((floorY()-p.y)-(-target.y+H*.19))<H*.25){resolveHit(target,p.owner,p.damage,.62,W*.1);burst(p.x,p.y,'#ffb5d1',16);projectiles.splice(i,1);continue;}
      if(p.life<=0||p.x<0||p.x>W)projectiles.splice(i,1);
    }
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=H*.5*dt;p.life-=dt;});particles=particles.filter(p=>p.life>0);
    screenShake=Math.max(0,screenShake-dt);flash=Math.max(0,flash-dt);
  }
  function finishRound(timeout=false){
    if(mode!=='fight')return;
    const winner=timeout?(player.hp>=enemy.hp?player:enemy):(player.hp>0?player:enemy);
    winner.wins++;
    if(winner===player){toastShow(timeout?'TIME UP — MAI WINS':'MAI WINS THE ROUND',1.8);sound(660,.3,'triangle',.05);}else{toastShow(timeout?'TIME UP — BIG BEAR WINS':'BIG BEAR WINS THE ROUND',1.8);sound(110,.35,'sawtooth',.05);}
    roundDelay=0;mode='roundover';setTimeout(()=>{if(mode!=='roundover')return;if(player.wins>=2||enemy.wins>=2){mode='over';}else{round++;resetRound();}},1800);
  }
  const lerp=(a,b,t)=>a+(b-a)*t;
  function rr(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
  function bg(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#111326');sky.addColorStop(.52,'#41234b');sky.addColorStop(1,'#f08364');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    const sun=ctx.createRadialGradient(W*.5,H*.43,5,W*.5,H*.43,H*.36);sun.addColorStop(0,'#ffd986a8');sun.addColorStop(.45,'#ff8a8a40');sun.addColorStop(1,'#ff8a8a00');ctx.fillStyle=sun;ctx.fillRect(0,H*.1,W,H*.65);
    // layered skyline and lantern-lit arena
    for(let layer=0;layer<3;layer++){
      const base=H*(.58+layer*.065),height=H*(.13+layer*.035),color=['#27233c','#1c1c32','#161827'][layer];ctx.fillStyle=color;
      for(let x=-20;x<W+50;x+=W*.075){const bw=W*.055+((x*13+layer*31)%35);const bh=height*(.45+((Math.abs(Math.sin(x*3+layer))*0.55)));ctx.fillRect(x,base-bh,bw,bh);ctx.fillStyle=layer===0?'#ffbf6a55':'#f9778155';for(let wy=base-bh+10;wy<base-4;wy+=H*.035)for(let wx=x+7;wx<x+bw-5;wx+=W*.022)ctx.fillRect(wx,wy,3,5);ctx.fillStyle=color;}
    }
    // temple roof silhouettes
    ctx.fillStyle='#141727';ctx.beginPath();ctx.moveTo(W*.1,H*.58);ctx.lineTo(W*.3,H*.43);ctx.lineTo(W*.48,H*.58);ctx.lineTo(W*.44,H*.58);ctx.lineTo(W*.3,H*.49);ctx.lineTo(W*.14,H*.59);ctx.fill();
    ctx.beginPath();ctx.moveTo(W*.58,H*.58);ctx.lineTo(W*.76,H*.43);ctx.lineTo(W*.96,H*.58);ctx.lineTo(W*.91,H*.58);ctx.lineTo(W*.76,H*.49);ctx.lineTo(W*.63,H*.59);ctx.fill();
    // lanterns
    for(let i=0;i<7;i++){const x=W*(.08+i*.14),y=H*(.39+(i%2)*.07);ctx.save();ctx.shadowColor='#ff576f';ctx.shadowBlur=18;const g=ctx.createRadialGradient(x,y,1,x,y,14);g.addColorStop(0,'#ffe7a4');g.addColorStop(.4,'#ff647c');g.addColorStop(1,'#bd3154');ctx.fillStyle=g;rr(ctx,x-8,y-13,16,27,6);ctx.fill();ctx.restore();}
    const horizon=floorY();const ground=ctx.createLinearGradient(0,horizon,0,H);ground.addColorStop(0,'#3b2944');ground.addColorStop(.25,'#221f35');ground.addColorStop(1,'#101522');ctx.fillStyle=ground;ctx.fillRect(0,horizon,W,H-horizon);
    ctx.strokeStyle='#ffcb9c31';ctx.lineWidth=1;
    for(let i=0;i<13;i++){const y=horizon+(H-horizon)*(i/13)**1.5;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    for(let i=-6;i<=6;i++){ctx.beginPath();ctx.moveTo(W*.5+i*W*.018,horizon);ctx.lineTo(W*.5+i*W*.14,H);ctx.stroke();}
    ctx.strokeStyle='#ffc17b4c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,horizon);ctx.lineTo(W,horizon);ctx.stroke();
    const vignette=ctx.createRadialGradient(W*.5,H*.5,H*.18,W*.5,H*.5,H*.8);vignette.addColorStop(.55,'#0000');vignette.addColorStop(1,'#060713a6');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  }
  function drawFighter(f){
    const floor=floorY(),s=H/720*(portrait?.83:1)*(f.kind==='bear'?1.08:1),bob=f.state==='idle'?Math.sin(elapsed*4+(f.kind==='bear'?1:0))*H*.004:0;
    const walk=f.state==='walk'?Math.sin(elapsed*13)*.75:0,attack=(f.state==='attack'||f.state==='special')?1-f.action/(f.moveData?.duration||.5):0;
    const hit=f.state==='hit',guard=f.state==='block',jumping=f.y<0,ko=f.state==='ko';
    ctx.save();ctx.translate(f.x,floor+f.y+bob);ctx.scale(f.facing*s,s);if(ko){ctx.rotate(-.16);ctx.scale(1,.75);}
    // soft stage shadow
    ctx.save();ctx.scale(1,.22);const shadow=ctx.createRadialGradient(0,0,10,0,0,90);shadow.addColorStop(0,'#060713aa');shadow.addColorStop(1,'#06071300');ctx.fillStyle=shadow;ctx.beginPath();ctx.ellipse(0,0,88,25,0,0,Math.PI*2);ctx.fill();ctx.restore();
    const bear=f.kind==='bear';
    if(!bear){
      // ponytail and hair ribbon
      ctx.fillStyle='#25132b';ctx.beginPath();ctx.moveTo(-12,-148);ctx.quadraticCurveTo(-68,-180,-72,-226);ctx.quadraticCurveTo(-35,-195,-16,-174);ctx.fill();
      ctx.fillStyle='#de405a';ctx.beginPath();ctx.moveTo(-42,-190);ctx.quadraticCurveTo(-75,-215,-96,-210);ctx.quadraticCurveTo(-66,-196,-49,-180);ctx.fill();
      // legs and tabi boots
      limb(-12,-67,-23+walk*8,-22,'#f7e6df',14);limb(-23+walk*8,-22,-39+walk*9,-4,'#bd263f',17);
      limb(13,-67,25-walk*8,-22,'#fff0e8',14);limb(25-walk*8,-22,37-walk*8,-4,'#c52d48',17);
      // torso red sleeveless kunoichi outfit
      gradientShape([[-24,-136],[24,-136],[29,-73],[0,-60],[-27,-73]],'#e84c68','#8f2349');
      ctx.fillStyle='#fff0e7';ctx.beginPath();ctx.moveTo(-21,-134);ctx.lineTo(-1,-114);ctx.lineTo(-12,-85);ctx.lineTo(-30,-113);ctx.fill();
      ctx.fillStyle='#f8eadd';rr(ctx,-30,-90,60,8,4);ctx.fill();ctx.fillStyle='#ffd46a';ctx.beginPath();ctx.arc(0,-86,7,0,Math.PI*2);ctx.fill();
      // arms, attack extends lead hand
      limb(-21,-127,-39,-98,'#f1c2a8',12);limb(-39,-98,-25,-78,'#f1c2a8',11);wrap(-25,-78,'#fff0e8');
      const ext=guard?-8:attack?lerp(0,48,Math.min(1,attack*1.8)):10+walk*6;
      limb(19,-128,35+ext*.35,-110,'#efc0a7',12);limb(35+ext*.35,-110,44+ext,-102,'#efc0a7',11);wrap(44+ext,-102,'#fff0e8');
      // face
      ctx.fillStyle='#f1c5aa';ctx.beginPath();ctx.ellipse(0,-154,22,27,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#25142b';ctx.beginPath();ctx.arc(0,-161,23,Math.PI,Math.PI*2);ctx.lineTo(22,-150);ctx.quadraticCurveTo(8,-164,-4,-157);ctx.lineTo(-21,-146);ctx.fill();
      ctx.fillStyle='#392033';ctx.beginPath();ctx.arc(-18,-156,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe9dc';ctx.fillRect(8,-158,5,2);ctx.fillStyle='#402334';ctx.fillRect(11,-158,2,2);
      // fan flashes in special
      if(f.state==='special'&&f.move==='special'){ctx.save();ctx.translate(53,-113);ctx.rotate(-.8+attack*.2);ctx.fillStyle='#fff1f4';ctx.beginPath();for(let i=0;i<=7;i++){const a=-1.05+i*.3;ctx.lineTo(Math.cos(a)*25,Math.sin(a)*25);}ctx.closePath();ctx.fill();ctx.strokeStyle='#f04b75';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
    }else{
      // massive boots and legs
      limb(-21,-72,-25+walk*9,-30,'#203f58',24);limb(-25+walk*9,-30,-37+walk*8,-4,'#18243a',30);
      limb(20,-72,27-walk*9,-30,'#2d5366',24);limb(27-walk*9,-30,40-walk*8,-4,'#18243a',30);
      // singlet / barrel torso
      ctx.fillStyle='#183a57';ctx.beginPath();ctx.moveTo(-38,-137);ctx.quadraticCurveTo(-62,-120,-50,-77);ctx.quadraticCurveTo(0,-58,51,-78);ctx.quadraticCurveTo(62,-118,37,-138);ctx.lineTo(20,-146);ctx.lineTo(-19,-146);ctx.closePath();const bg=ctx.createLinearGradient(-40,-140,40,-70);bg.addColorStop(0,'#4797a5');bg.addColorStop(.35,'#235b75');bg.addColorStop(1,'#102b48');ctx.fillStyle=bg;ctx.fill();
      ctx.fillStyle='#d5a74e';rr(ctx,-44,-86,88,12,4);ctx.fill();ctx.fillStyle='#f1ce7b';rr(ctx,-7,-88,15,16,3);ctx.fill();
      // giant arms, one raised block / swings
      const bext=guard?-8:attack?lerp(0,52,Math.min(1,attack*1.6)):4+walk*5;
      limb(-37,-124,-57,-100,'#d69465',24);limb(-57,-100,-45,-78,'#d69465',23);wrap(-45,-78,'#314b60');
      limb(37,-124,51+bext*.35,-105,'#d99568',24);limb(51+bext*.35,-105,57+bext,-96,'#d99568',25);wrap(57+bext,-96,'#314b60');
      // broad head, hair and beard
      ctx.fillStyle='#d8996b';ctx.beginPath();ctx.ellipse(0,-158,31,34,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#3c261f';ctx.beginPath();ctx.arc(0,-172,32,Math.PI,Math.PI*2);ctx.lineTo(29,-160);ctx.quadraticCurveTo(3,-178,-28,-158);ctx.fill();
      ctx.fillStyle='#39241e';ctx.beginPath();ctx.moveTo(-24,-151);ctx.quadraticCurveTo(-16,-130,0,-134);ctx.quadraticCurveTo(17,-130,26,-151);ctx.lineTo(18,-141);ctx.lineTo(5,-134);ctx.lineTo(-9,-138);ctx.lineTo(-21,-143);ctx.fill();
      ctx.fillStyle='#f6d8b8';ctx.fillRect(15,-162,6,3);ctx.fillStyle='#41251f';ctx.fillRect(18,-162,3,3);
      // red headband
      ctx.strokeStyle='#c73c44';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-28,-175);ctx.quadraticCurveTo(0,-184,27,-175);ctx.stroke();ctx.strokeStyle='#ef6970';ctx.beginPath();ctx.moveTo(23,-176);ctx.quadraticCurveTo(44,-187,51,-175);ctx.stroke();
      if(f.state==='special'){ctx.save();ctx.globalAlpha=.5+Math.sin(elapsed*24)*.3;ctx.strokeStyle='#82eeff';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,-103,57,-1.2,.7);ctx.stroke();ctx.restore();}
    }
    // rim-light
    ctx.globalAlpha=.38;ctx.strokeStyle=bear?'#8feaff':'#ffc1d7';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-23,-139);ctx.quadraticCurveTo(-35,-114,-24,-83);ctx.stroke();ctx.globalAlpha=1;
    if(hit&&Math.sin(elapsed*55)>0) {ctx.globalAlpha=.25;ctx.fillStyle='#fff';ctx.beginPath();ctx.ellipse(0,-100,54,78,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}
    ctx.restore();
    if(f.combo>1&&f.comboTime>0&&f===player){ctx.save();ctx.font=`900 ${Math.max(14,H*.027)}px system-ui`;ctx.textAlign='center';ctx.fillStyle='#ffdf73';ctx.shadowColor='#ff5a78';ctx.shadowBlur=16;ctx.fillText(`${f.combo} HIT`,f.x,floor-H*.44);ctx.restore();}
  }
  function limb(x1,y1,x2,y2,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.arc(x2,y2,width*.48,0,Math.PI*2);ctx.fill();}
  function wrap(x,y,color){ctx.save();ctx.translate(x,y);ctx.rotate(-.4);ctx.fillStyle=color;rr(ctx,-9,-5,18,11,3);ctx.fill();ctx.restore();}
  function gradientShape(points,c1,c2){const g=ctx.createLinearGradient(-35,-140,30,-65);g.addColorStop(0,c1);g.addColorStop(1,c2);ctx.fillStyle=g;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();}
  function drawProjectile(p){ctx.save();ctx.translate(p.x,p.y);ctx.scale(Math.sign(p.vx),1);const glow=ctx.createRadialGradient(0,0,2,0,0,36);glow.addColorStop(0,'#fff7dd');glow.addColorStop(.3,'#ff93b9');glow.addColorStop(1,'#ff3e8b00');ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(0,0,42,27,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff1ee';ctx.beginPath();ctx.moveTo(-24,0);ctx.quadraticCurveTo(0,-28,28,-1);ctx.quadraticCurveTo(0,29,-24,0);ctx.fill();ctx.strokeStyle='#e84879';ctx.lineWidth=2;ctx.stroke();ctx.restore();}
  function bar(x,y,w,h,val,color,flip=false){ctx.save();ctx.fillStyle='#0a0c19cc';rr(ctx,x-3,y-3,w+6,h+6,8);ctx.fill();ctx.fillStyle='#30263b';rr(ctx,x,y,w,h,5);ctx.fill();const fw=w*clamp(val,0,100)/100;const grad=ctx.createLinearGradient(x,y,x+w,y);grad.addColorStop(0,color[0]);grad.addColorStop(1,color[1]);ctx.fillStyle=grad;if(flip)ctx.fillRect(x+w-fw,y,fw,h);else ctx.fillRect(x,y,fw,h);ctx.fillStyle='#ffffff3c';ctx.fillRect(x,y,w,h*.16);ctx.restore();}
  function hud(){
    const margin=W*.055,barW=W*.36,bh=Math.max(13,H*.024),y=H*(portrait?.12:.075);
    ctx.save();ctx.font=`900 ${Math.max(12,H*.025)}px system-ui`;ctx.textBaseline='middle';ctx.fillStyle='#fff';ctx.shadowColor='#000';ctx.shadowBlur=8;
    ctx.textAlign='left';ctx.fillText('MAI SHIRANUI',margin,y-bh*.76);ctx.textAlign='right';ctx.fillText('BIG BEAR',W-margin,y-bh*.76);
    bar(margin,y,barW,bh,player.hp,['#ffe16a','#ff477e']);bar(W-margin-barW,y,barW,bh,enemy.hp,['#77f1ff','#5b6dff'],true);
    bar(margin,y+bh+8,barW*.62,5,player.meter,['#ffbfe0','#d15cff']);bar(W-margin-barW*.62,y+bh+8,barW*.62,5,enemy.meter,['#b1fdff','#588dff'],true);
    ctx.textAlign='center';ctx.fillStyle='#fff4cf';ctx.font=`900 ${Math.max(22,H*.047)}px system-ui`;ctx.fillText(String(Math.ceil(timer)).padStart(2,'0'),W/2,y+bh*.3);
    ctx.font=`700 ${Math.max(9,H*.014)}px system-ui`;ctx.fillStyle='#ffc8d4';ctx.fillText('ROUND '+round,W/2,y+bh+16);
    for(let i=0;i<2;i++){for(let side=0;side<2;side++){const cx=side===0?margin+i*14:W-margin-i*14;ctx.beginPath();ctx.arc(cx,y+bh+20,4,0,Math.PI*2);ctx.fillStyle=(side===0?player.wins:enemy.wins)>i?'#ffdf78':'#4c4658';ctx.fill();}}
    ctx.restore();
  }
  function title(){
    ctx.save();const mobile=portrait;ctx.textAlign='center';ctx.textBaseline='middle';
    const titleY=H*(mobile?.25:.24);ctx.shadowColor='#ff4d8b';ctx.shadowBlur=32;ctx.fillStyle='#fff';ctx.font=`1000 ${Math.min(W*.1,H*.105)}px system-ui`;ctx.fillText('NEON BRAWL',W/2,titleY);
    ctx.shadowBlur=0;ctx.fillStyle='#ffcc75';ctx.font=`900 ${Math.max(12,Math.min(W*.027,H*.03))}px system-ui`;ctx.letterSpacing='0.22em';ctx.fillText('SHIRANUI  //  SHOWDOWN',W/2,titleY+H*.065);ctx.letterSpacing='0';
    ctx.fillStyle='#ffffffc7';ctx.font=`700 ${Math.max(12,H*.019)}px system-ui`;ctx.fillText('MAI SHIRANUI',W*.28,floorY()-H*.46);ctx.fillText('BIG BEAR',W*.72,floorY()-H*.46);
    ctx.font=`600 ${Math.max(12,H*.018)}px system-ui`;ctx.fillStyle='#e4d8ef';ctx.fillText('A fierce 1v1 under the lanterns. Can you take two rounds?',W/2,H*(mobile?.49:.43));
    const pulse=.72+.28*Math.sin(elapsed*4);ctx.globalAlpha=pulse;ctx.fillStyle='#ff577e';rr(ctx,W*.5-W*.16,H*(mobile?.57:.51),W*.32,H*.065,18);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.font=`900 ${Math.max(13,H*.022)}px system-ui`;ctx.fillText('TAP TO FIGHT  •  PRESS ENTER',W/2,H*(mobile?.602:.543));
    ctx.fillStyle='#ffffffa8';ctx.font=`600 ${Math.max(10,H*.015)}px system-ui`;ctx.fillText(mobile?'◀ ▶ MOVE     ⬆ JUMP     ◒ BLOCK':'MOVE  A / D     JUMP  W     BLOCK  S',W/2,H*(mobile?.68:.64));ctx.fillText(mobile?'PUNCH • KICK • FAN SPECIAL':'PUNCH  J     KICK  K     FAN SPECIAL  L',W/2,H*(mobile?.715:.675));
    ctx.fillStyle='#ffd67a';ctx.font=`700 ${Math.max(10,H*.014)}px system-ui`;ctx.fillText('FILL THE GOLD METER TO UNLEASH MAI’S FAN!',W/2,H*(mobile?.755:.715));ctx.restore();
  }
  function overlay(text,sub){ctx.save();ctx.fillStyle='#0809169c';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#ff5481';ctx.shadowBlur=24;ctx.fillStyle='#fff';ctx.font=`1000 ${Math.min(W*.09,H*.1)}px system-ui`;ctx.fillText(text,W/2,H*.44);ctx.shadowBlur=0;ctx.fillStyle='#ffe2a8';ctx.font=`700 ${Math.max(14,H*.023)}px system-ui`;ctx.fillText(sub,W/2,H*.52);ctx.restore();}
  function render(){
    ctx.save();if(screenShake>0){ctx.translate(rand(-8,8)*screenShake/.16,rand(-6,6)*screenShake/.16);}
    bg();if(mode!=='title'){drawFighter(player);drawFighter(enemy);projectiles.forEach(drawProjectile);particles.forEach(p=>{ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;});hud();}else{drawFighter(player);drawFighter(enemy);}
    if(mode==='title')title();if(mode==='fight'&&paused)overlay('PAUSED','TAP SCREEN OR PRESS ENTER TO RESUME');if(mode==='over')overlay(player.wins>enemy.wins?'MAI WINS!':'BIG BEAR WINS!','TAP TO PLAY AGAIN');
    if(flash>0){ctx.fillStyle=`rgba(255,244,232,${flash*1.5})`;ctx.fillRect(0,0,W,H);}ctx.restore();
  }
  function loop(now){const dt=Math.min(.033,(now-last)/1000||0);last=now;elapsed+=dt;if(!paused)update(dt);render();requestAnimationFrame(loop);}
  requestAnimationFrame(loop);
})();
