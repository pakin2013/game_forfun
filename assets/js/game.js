    import {createRenderer} from "./game-renderer.js";

(() => {
      const canvas = document.getElementById("game");
      const ctx = canvas.getContext("2d");
      const goldEl = document.getElementById("gold");
      const livesEl = document.getElementById("lives");
      const waveEl = document.getElementById("wave");
      const enemiesEl = document.getElementById("enemies");
      const waveBtn = document.getElementById("wave-btn");
      const waveNote = document.getElementById("wave-note");
      const heroPanel = document.getElementById("hero-panel");
      const buildNote = document.getElementById("build-note");
      const pauseBtn = document.getElementById("pause-btn");
      const speedBtn = document.getElementById("speed-btn");
      const autoWaveInput = document.getElementById("auto-wave");
      const autoWaveDelayInput = document.getElementById("auto-wave-delay");
      const autoWaveNote = document.getElementById("auto-wave-note");
      const autoUpgradeInput = document.getElementById("auto-upgrade");
      const toastEl = document.getElementById("toast");
      const path = [
        {x:-35,y:130},{x:145,y:130},{x:145,y:330},{x:325,y:330},
        {x:325,y:180},{x:505,y:180},{x:505,y:390},{x:685,y:390},
        {x:685,y:255},{x:850,y:255},{x:935,y:255}
      ];
      const state = {gold:180,lives:20,wave:0,waveJustEnded:false,enemies:[],towers:[],shots:[],effects:[],selected:null,buildType:"mage",active:false,paused:false,speed:1,spawnLeft:0,spawnTimer:0,lastTime:0,over:false,autoWave:false,autoWaveDelay:8,autoWaveTimer:0,autoUpgrade:false};
      let toastTimer;
      const pointer={x:null,y:null,inside:false};

      function notify(message){
        toastEl.textContent=message;toastEl.classList.add("show");clearTimeout(toastTimer);
        toastTimer=setTimeout(()=>toastEl.classList.remove("show"),1900);
      }
      function updateHud(){
        goldEl.textContent=state.gold;livesEl.textContent=state.lives;waveEl.textContent=state.wave;
        enemiesEl.textContent=state.enemies.length+(state.active?state.spawnLeft:0);
        waveBtn.disabled=state.active||state.over;
        waveBtn.textContent=state.active?"กำลังต่อสู้…　⚔":`เริ่มคลื่นที่ ${state.wave+1}　▶`;
        waveNote.textContent=state.active?`เหลือศัตรูอีก ${state.spawnLeft} ตัว`:state.waveJustEnded?"จบคลื่น":(state.wave?"คลื่นถัดไปแข็งแกร่งขึ้น!":"เตรียมตัวให้พร้อมก่อนเริ่ม!");
        pauseBtn.textContent=state.paused?"▶ เล่นต่อ":"⏸ หยุดเกม";
        autoWaveInput.checked=state.autoWave;autoWaveDelayInput.value=state.autoWaveDelay;autoUpgradeInput.checked=state.autoUpgrade;
        document.querySelectorAll(".hero-choice").forEach(button=>button.classList.toggle("active",button.dataset.hero===state.buildType));
        const buildName=state.buildType==="skybird"?"นกเวหา":state.buildType==="lightning"?"ปืนสายฟ้า":state.buildType==="water"?"หมัดสายน้ำ":state.buildType==="knight"?"นักดาบ":state.buildType==="runner"?"นักวิ่ง":state.buildType==="wind"?"วิญญาณลม":"จอมเวท";
        buildNote.textContent=`เลือก ${buildName} แล้วคลิกพื้นว่างเพื่อวางได้อย่างอิสระ`;
        renderPanel();
      }
      function renderPanel(){
        const tower=state.towers.find(t=>t.id===state.selected);
        if(!tower){heroPanel.innerHTML='<p class="hint">เลือกฮีโร่แล้วคลิกพื้นว่างเพื่อวางได้อย่างอิสระ คลิกฮีโร่ที่วางแล้วเพื่อดูข้อมูลและอัปเกรด</p>';return}
        const cost=upgradeCost(tower);
        const isKnight=tower.type==="knight",isRunner=tower.type==="runner",isWind=tower.type==="wind",isWater=tower.type==="water",isLightning=tower.type==="lightning",isMage=tower.type==="mage",isSkybird=tower.type==="skybird";
        const heroName=isSkybird?"นกเวหา":isLightning?"ปืนสายฟ้า":isWater?"หมัดสายน้ำ":isWind?"วิญญาณลม":isRunner?"นักวิ่งพุ่งชน":isKnight?"นักดาบคริติคอล":"ผู้พิทักษ์เวทมนตร์";
        const role=isSkybird?"ยิงขนนก · บินชนวงกว้าง":isMage?"ยิงพลังเวท · วงแหวนเวทวงกว้าง":isLightning?"ยิงสายฟ้าใส่ศัตรู 3 ตัว":isWater?"หมัดตรง · หมัดหนัก":isWind?`พายุผลักถอยหลัง ${Math.round(tower.knockbackChance*100)}%`:isRunner?"พุ่งชน · กลับไปยังจุดยืน":isKnight?`ประชิด · คริติคอล ${Math.round(tower.critChance*100)}% ×${tower.critMultiplier}`:"ระยะไกล · กระสุนเวท";
        const blastRadius=82+(tower.level-1)*10;
        const stat2=isSkybird?`ระยะยิง<b>${tower.range} · บินชน ${tower.diveRadius}</b>`:isMage?`ระยะยิง<b>${tower.range} · วงแหวนรัศมี ${blastRadius}</b>`:isWater?`ระยะประชิด<b>${tower.range} · ทั้งสองหมัด</b>`:isLightning?`เป้าหมาย<b>3 ตัว · ระยะ ${tower.range}</b>`:isWind?`โอกาสผลัก<b>${Math.round(tower.knockbackChance*100)}%</b>`:isRunner?`ระยะพุ่ง<b>${tower.range}</b>`:isKnight?`ระยะประชิด<b>${tower.range}</b>`:`ระยะยิง<b>${tower.range}</b>`;
        const icon=isSkybird?"🦅":isMage?"🧙":isLightning?"⚡":isWater?"🥊":isWind?"🌪️":isRunner?"🏃":isKnight?"🗡️":"🧙";
        heroPanel.innerHTML=`<div class="hero-row"><div class="hero-icon">${icon}</div><div><div class="hero-name">${heroName}</div><div class="hero-level">ระดับ ${tower.level} · ${tower.level>=5?"ระดับสูงสุด":role}</div></div></div>
          <div class="hero-stats"><div>${isSkybird?"ขนนก / บินชน":isMage?"พลังเวท / วงแหวน":isWater?"หมัดตรง / หมัดหนัก":"พลังโจมตี"}<b>${isSkybird?`${tower.featherDamage} / ${tower.diveDamage}`:isMage?`${tower.magicDamage} / ${tower.ringDamage}`:isWater?`${tower.damage} / ${tower.heavyDamage}`:`${tower.damage}${isKnight?" + คริติคอล":""}`}</b></div><div>${stat2}</div></div>
          <div class="wallet"><span>🪙 เหรียญที่มี</span><strong id="upgrade-wallet">${state.gold.toLocaleString("th-TH")}</strong></div>
          ${isSkybird||isMage||isWater?`<div class="bird-cooldowns"><div><span>${isSkybird?"🪶 ขนนก":isMage?"✨ ยิงพลังเวท":"👊 หมัดตรง"} · ${(isSkybird?tower.featherRate:isMage?tower.magicRate:tower.rate).toFixed(2)} วิ</span><strong id="feather-cooldown-value">พร้อมโจมตี</strong><div class="cooldown-track"><div class="cooldown-fill" id="feather-cooldown-fill"></div></div></div><div><span>${isSkybird?"🦅 บินชน":isMage?"🔮 วงแหวนเวท":"💥 หมัดหนัก"} · ${(isSkybird?tower.diveRate:isMage?tower.ringRate:tower.heavyRate).toFixed(2)} วิ</span><strong id="dive-cooldown-value">พร้อมโจมตี</strong><div class="cooldown-track"><div class="cooldown-fill" id="dive-cooldown-fill"></div></div></div></div>`:`<div class="cooldown-readout"><span>คูลดาวน์โจมตี · ${tower.rate.toFixed(2)} วินาที</span><strong id="cooldown-value">พร้อมโจมตี</strong></div>
          <div class="cooldown-track"><div class="cooldown-fill" id="cooldown-fill"></div></div>`}
          <div class="hero-actions"><button class="action primary" id="upgrade-btn" ${tower.level>=5||state.gold<cost?"disabled":""}>⬆️ อัปเกรด <span class="upgrade-cost">${tower.level>=5?"เต็มแล้ว":`🪙 ${cost}`}</span></button><button class="action danger" id="sell-btn">🗑️ ลบ · คืน 🪙 ${Math.floor(tower.invested*.7)}</button></div>
          <p class="upgrade-next">ลบฮีโร่แล้วรับคืน 70% ของต้นทุนวางและอัปเกรด</p>
          ${tower.level<5?`<p class="upgrade-next">อัปเกรดถัดไป: ${isSkybird?"ขนนก +5 · บินชน +12 · วงกว้างขึ้น":isMage?"พลังเวท +5 · วงแหวน +13 · ระยะยิงเพิ่ม":isWater?"หมัดตรง +5 · หมัดหนัก +5 · ระยะประชิดเพิ่ม":`พลังโจมตี +${isLightning?10:isWind?12:isRunner?20:isKnight?18:13}${isLightning?" · เป้าหมาย 3 ตัว":isWind?" · โอกาสผลัก +5%":isKnight?" · โอกาสคริติคอล +5%":isRunner?" · คูลดาวน์ลดลง":""}`}</p>`:""}`;
        const button=document.getElementById("upgrade-btn");
        if(button)button.addEventListener("click",()=>upgradeTower());
        document.getElementById("sell-btn").addEventListener("click",sellTower);
      }
      function upgradeCost(tower){return 70+tower.level*55}
      function updateCooldownDisplay(){
        const tower=state.towers.find(t=>t.id===state.selected);
        if(tower?.type==="skybird"||tower?.type==="mage"||tower?.type==="water"){
          const cooldowns=tower.type==="skybird"?[[tower.featherCooldown,tower.featherRate],[tower.diveCooldown,tower.diveRate]]:tower.type==="mage"?[[tower.magicCooldown,tower.magicRate],[tower.ringCooldown,tower.ringRate]]:[[tower.cooldown,tower.rate],[tower.heavyCooldown,tower.heavyRate]];
          for(const [id,fillId,[cooldown,rate]] of [["feather-cooldown-value","feather-cooldown-fill",cooldowns[0]],["dive-cooldown-value","dive-cooldown-fill",cooldowns[1]]]){
            const value=document.getElementById(id),fill=document.getElementById(fillId);
            if(value&&fill){
              value.textContent=tower.stunned>0?`ถูกสตัน ${tower.stunned.toFixed(1)} วิ`:cooldown>0?`เหลือ ${cooldown.toFixed(1)} วิ`:"พร้อมโจมตี";
              fill.style.transform=`scaleX(${tower.stunned>0?0:Math.max(0,1-cooldown/rate)})`;
            }
          }
          return;
        }
        const value=document.getElementById("cooldown-value"),fill=document.getElementById("cooldown-fill");
        if(!tower||!value||!fill)return;
        if(tower.stunned>0)value.textContent=`ถูกสตัน ${tower.stunned.toFixed(1)} วิ`;
        else if(tower.dash?.phase==="out")value.textContent="กำลังพุ่งชน!";
        else if(tower.cooldown>0)value.textContent=`เหลือ ${tower.cooldown.toFixed(1)} วิ`;
        else value.textContent="พร้อมโจมตี";
        fill.style.transform=`scaleX(${tower.stunned>0?0:tower.dash?.phase==="out"?1:Math.max(0,1-tower.cooldown/tower.rate)})`;
      }
      function updateAutomationNote(){
        if(!state.autoWave){autoWaveNote.textContent="เริ่มคลื่นด้วยตนเอง";return}
        if(state.wave===0){autoWaveNote.textContent="เริ่มคลื่นแรกด้วยตนเองก่อน ระบบจะเริ่มคลื่นถัดไปให้อัตโนมัติ";return}
        if(state.active){autoWaveNote.textContent="จะเริ่มนับเวลาหลังจบคลื่นนี้";return}
        autoWaveNote.textContent=`คลื่นถัดไปจะเริ่มใน ${state.autoWaveTimer.toFixed(1)} วินาที`;
      }
      function addTower(pad){
        const isKnight=state.buildType==="knight",isRunner=state.buildType==="runner",isWind=state.buildType==="wind",isWater=state.buildType==="water",isLightning=state.buildType==="lightning",isMage=state.buildType==="mage",isSkybird=state.buildType==="skybird",cost=isSkybird?140:isLightning?150:isWater?100:isWind?120:isRunner?110:isKnight?125:100;
        if(state.gold<cost){notify(`เหรียญไม่พอ! ต้องใช้ ${cost} เหรียญ`);return}
        state.gold-=cost;
        const tower={id:Date.now()+Math.random(),type:state.buildType,x:pad.x,y:pad.y,drawX:pad.x,drawY:pad.y,level:1,invested:cost,damage:isLightning?20:isWater?10:isWind?18:isRunner?42:isKnight?31:isMage?20:22,heavyDamage:20,heavyRate:1,heavyCooldown:.2,magicDamage:20,ringDamage:50,magicRate:.75,ringRate:5,magicCooldown:.2,ringCooldown:.2,range:isSkybird?220:isLightning?240:isWater?100:isWind?185:isRunner?210:isKnight?112:isMage?180:145,rate:isLightning?1:isWater?.25:isWind?.78:isRunner?1.25:isKnight?.72:isMage?5:.82,cooldown:.2,featherDamage:15,diveDamage:40,featherRate:.4,diveRate:6,featherCooldown:.2,diveCooldown:.2,diveRadius:92,critChance:isKnight?.25:0,critMultiplier:2.2,knockbackChance:isWind?.25:0,attackAnim:0,dash:null,stunned:0};
        state.towers.push(tower);state.selected=tower.id;notify(isSkybird?"วางนกเวหาสำเร็จ!":isLightning?"วางปืนสายฟ้าสำเร็จ!":isWater?"วางหมัดสายน้ำสำเร็จ!":isWind?"เรียกวิญญาณลมสำเร็จ!":isRunner?"วางนักวิ่งพุ่งชนสำเร็จ!":isKnight?"วางนักดาบคริติคอลสำเร็จ!":"วางผู้พิทักษ์เวทมนตร์สำเร็จ!");updateHud();
      }
      function sellTower(){
        const tower=state.towers.find(t=>t.id===state.selected);if(!tower)return;
        const refund=Math.floor(tower.invested*.7);
        state.towers=state.towers.filter(item=>item.id!==tower.id);state.gold+=refund;state.selected=null;
        const upgraded=autoUpgradeTowers();
        notify(`ลบฮีโร่แล้ว รับคืน ${refund} เหรียญ${upgraded?` · อัปเกรดอัตโนมัติ ${upgraded} ครั้ง`:""}`);updateHud();
      }
      function upgradeTower(tower=state.towers.find(t=>t.id===state.selected),notifyUser=true,refresh=true){
        if(!tower||tower.level>=5)return false;
        const cost=upgradeCost(tower);
        if(state.gold<cost){if(notifyUser)notify("เหรียญไม่พอสำหรับการอัปเกรด");return false}
        state.gold-=cost;tower.invested+=cost;tower.level++;
        if(tower.type==="skybird"){tower.featherDamage+=5;tower.diveDamage+=12;tower.diveRadius+=8}
        else if(tower.type==="mage"){tower.magicDamage+=5;tower.ringDamage+=13;tower.range+=12}
        else if(tower.type==="lightning"){tower.damage+=10;tower.range+=10}
        else if(tower.type==="water"){tower.damage+=5;tower.heavyDamage+=5;tower.range+=5}
        else if(tower.type==="knight"){tower.damage+=18;tower.range+=5;tower.rate=Math.max(.36,tower.rate-.055);tower.critChance=Math.min(.5,tower.critChance+.05)}
        else if(tower.type==="runner"){tower.damage+=20;tower.range+=12;tower.rate=Math.max(.6,tower.rate-.1)}
        else if(tower.type==="wind"){tower.damage+=12;tower.range+=8;tower.rate=Math.max(.55,tower.rate-.08);tower.knockbackChance=Math.min(.7,tower.knockbackChance+.05)}
        else{tower.damage+=13;tower.range+=12;tower.rate=Math.max(.36,tower.rate-.08)}
        if(notifyUser)notify(`อัปเกรดฮีโร่เป็นระดับ ${tower.level} แล้ว!`);
        if(refresh)updateHud();
        return true;
      }
      function autoUpgradeTowers(){
        if(!state.autoUpgrade)return 0;
        let upgraded=0;
        while(true){
          const tower=state.towers.filter(item=>item.level<5&&state.gold>=upgradeCost(item)).sort((a,b)=>a.level-b.level||a.id-b.id)[0];
          if(!tower||!upgradeTower(tower,false,false))break;
          upgraded++;
        }
        if(upgraded)updateHud();
        return upgraded;
      }
      function startWave(){
        if(state.active||state.over)return;
        state.wave++;state.waveJustEnded=false;state.active=true;state.autoWaveTimer=0;state.spawnLeft=6+state.wave*2;state.spawnTimer=.35;
        notify(state.wave%5===0?`คลื่นที่ ${state.wave} กำลังมา! ระวังบอสมังกร 🐉`:`คลื่นที่ ${state.wave} กำลังมา!`);updateHud();
      }
      function spawnEnemy(){
        const boss=state.wave%5===0&&state.spawnLeft===1;
        const fast=!boss&&state.spawnLeft>0&&state.spawnLeft%4===0;
        const explosive=!boss&&!fast&&state.spawnLeft%5===0;
        const baseHp=100+(state.wave-1)*100;
        const bossHp=2000+(state.wave-1)*1500;
        const hp=boss?bossHp:baseHp;
        const baseSpeed=48+Math.min(24,state.wave*1.5);
        state.enemies.push({x:path[0].x,y:path[0].y,hp,maxHp:hp,speed:boss?37:fast?baseSpeed*2.15:explosive?baseSpeed*.82:baseSpeed,progress:0,boss,dragon:boss,stunTimer:5,fast,explosive,explodeRadius:105,radius:boss?17:fast?11:explosive?13:12});
      }
      function knockbackEnemy(enemy,distance){
        let remaining=distance;
        while(remaining>0&&enemy.progress>=0){
          const start=path[enemy.progress],dx=start.x-enemy.x,dy=start.y-enemy.y,toStart=Math.hypot(dx,dy);
          if(toStart>0){
            const step=Math.min(remaining,toStart);
            enemy.x+=dx/toStart*step;enemy.y+=dy/toStart*step;remaining-=step;
            if(remaining<=0||step<toStart)break;
          }
          if(enemy.progress===0)break;
          enemy.progress--;
        }
      }
      function canPlaceTower(x,y){
        if(x<30||x>870||y<30||y>490)return false;
        if(path.some((point,index)=>index<path.length-1&&pointSegmentDistance(x,y,point,path[index+1])<43))return false;
        return !state.towers.some(tower=>Math.hypot(tower.x-x,tower.y-y)<48);
      }
      function placeTower(x,y){
        if(!canPlaceTower(x,y)){notify("เลือกพื้นว่างที่ไม่ทับเส้นทางหรือฮีโร่ตัวอื่น");return}
        addTower({x,y});
      }
      function update(dt){
        if(state.paused||state.over)return;
        dt*=state.speed;
        if(state.autoWave&&state.wave>0&&!state.active){
          state.autoWaveTimer=Math.max(0,state.autoWaveTimer-dt);
          if(state.autoWaveTimer===0)startWave();
        }
        if(state.active){
          state.spawnTimer-=dt;
          if(state.spawnLeft>0&&state.spawnTimer<=0){spawnEnemy();state.spawnLeft--;state.spawnTimer=Math.max(.42,.92-state.wave*.018)}
        }
        for(const enemy of state.enemies){
          let remaining=enemy.speed*dt;
          while(remaining>0&&enemy.progress<path.length-1){
            const next=path[enemy.progress+1],dx=next.x-enemy.x,dy=next.y-enemy.y,distance=Math.hypot(dx,dy);
            if(distance<=remaining){enemy.x=next.x;enemy.y=next.y;remaining-=distance;enemy.progress++}
            else{enemy.x+=dx/distance*remaining;enemy.y+=dy/distance*remaining;remaining=0}
          }
          if(enemy.explosive){
            const targets=state.towers.filter(tower=>Math.hypot(tower.drawX-enemy.x,tower.drawY-enemy.y)<=enemy.explodeRadius);
            if(targets.length){
              enemy.hp=0;
              state.effects.push({type:"stun-explosion",x:enemy.x,y:enemy.y,radius:enemy.explodeRadius,duration:.75,life:.75});
              for(const tower of targets){
                tower.stunned=Math.max(tower.stunned,2.5);
                state.effects.push({type:"text",x:tower.drawX,y:tower.drawY-31,text:"ระเบิดสตัน 2.5 วิ!",duration:1,life:1,color:"#ffad82"});
              }
            }
          }
          if(enemy.dragon){
            enemy.stunTimer-=dt;
            if(enemy.stunTimer<=0){
              enemy.stunTimer=5;
              state.effects.push({type:"dragon-roar",x:enemy.x,y:enemy.y,radius:Math.hypot(canvas.width,canvas.height),duration:1.2,life:1.2});
              state.effects.push({type:"text",x:enemy.x,y:enemy.y-47,text:"คำราม!",duration:1,life:1,color:"#ffd27a"});
              for(const tower of state.towers){
                tower.stunned=Math.max(tower.stunned,2);
                state.effects.push({type:"text",x:tower.drawX,y:tower.drawY-31,text:"สตัน 2 วิ!",duration:.8,life:.8,color:"#ffd27a"});
              }
            }
          }
        }
        const escaped=state.enemies.filter(e=>e.hp>0&&e.progress>=path.length-1);
        if(escaped.length){state.enemies=state.enemies.filter(e=>e.hp<=0||e.progress<path.length-1);state.lives=Math.max(0,state.lives-escaped.length)}
        for(const tower of state.towers){
          tower.attackAnim=Math.max(0,tower.attackAnim-dt);
          tower.cooldown=Math.max(0,tower.cooldown-dt);
          if(tower.type==="skybird"){
            tower.featherCooldown=Math.max(0,tower.featherCooldown-dt);
            tower.diveCooldown=Math.max(0,tower.diveCooldown-dt);
          }else if(tower.type==="mage"){
            tower.magicCooldown=Math.max(0,tower.magicCooldown-dt);
            tower.ringCooldown=Math.max(0,tower.ringCooldown-dt);
          }else if(tower.type==="water"){
            tower.heavyCooldown=Math.max(0,tower.heavyCooldown-dt);
          }
          tower.stunned=Math.max(0,tower.stunned-dt);
          if(tower.stunned>0)continue;
          if(tower.dash){
            const dash=tower.dash;
            if(dash.phase==="out"&&state.enemies.includes(dash.target)){
              const dx=dash.target.x-tower.drawX,dy=dash.target.y-tower.drawY,distance=Math.hypot(dx,dy),step=470*dt;
              if(distance<=step+dash.target.radius+7){
                const target=dash.target;
                target.hp-=tower.damage;tower.cooldown=tower.rate;tower.attackAnim=.28;dash.phase="return";
                state.effects.push({type:"impact",x:target.x,y:target.y,duration:.32,life:.32,color:"#ffad72"});
                state.effects.push({type:"text",x:target.x,y:target.y-20,text:`-${tower.damage}`,duration:.7,life:.7,color:"#ffd0a1"});
                for(let i=0;i<8;i++)state.effects.push({type:"spark",x:target.x,y:target.y,vx:(Math.random()-.5)*140,vy:(Math.random()-.5)*140,duration:.35,life:.35,color:"#ffad72"});
              }else{tower.drawX+=dx/distance*step;tower.drawY+=dy/distance*step}
            }else if(dash.phase==="out"){dash.phase="return"}
            if(dash.phase==="return"){
              const dx=tower.x-tower.drawX,dy=tower.y-tower.drawY,distance=Math.hypot(dx,dy),step=520*dt;
              if(distance<=step){tower.drawX=tower.x;tower.drawY=tower.y;tower.dash=null}
              else{tower.drawX+=dx/distance*step;tower.drawY+=dy/distance*step}
            }
          }else if(tower.type==="skybird"){
            const targets=state.enemies.filter(enemy=>Math.hypot(enemy.x-tower.x,enemy.y-tower.y)<=tower.range).sort((a,b)=>b.progress-a.progress);
            if(targets.length&&tower.featherCooldown<=0){
              const target=targets[0];
              tower.featherCooldown=tower.featherRate;tower.attackAnim=.24;
              state.shots.push({type:"feather",x:tower.x,y:tower.y,target,damage:tower.featherDamage,speed:520});
            }
            if(targets.length&&tower.diveCooldown<=0){
              const target=targets[0],hitTargets=state.enemies.filter(enemy=>Math.hypot(enemy.x-target.x,enemy.y-target.y)<=tower.diveRadius);
              tower.diveCooldown=tower.diveRate;tower.attackAnim=.38;
              for(const enemy of hitTargets){
                enemy.hp-=tower.diveDamage;
                state.effects.push({type:"text",x:enemy.x,y:enemy.y-20,text:`-${tower.diveDamage}`,duration:.7,life:.7,color:"#ffe5a1"});
                for(let i=0;i<4;i++)state.effects.push({type:"spark",x:enemy.x,y:enemy.y,vx:(Math.random()-.5)*150,vy:(Math.random()-.5)*150,duration:.35,life:.35,color:i%2?"#ffe5a1":"#a9ecff"});
              }
              state.effects.push({type:"sky-dive",x:target.x,y:target.y,radius:tower.diveRadius,duration:.65,life:.65});
            }
          }else if(tower.type==="water"){
            const target=state.enemies.filter(enemy=>Math.hypot(enemy.x-tower.x,enemy.y-tower.y)<=tower.range).sort((a,b)=>b.progress-a.progress)[0];
            if(target&&tower.cooldown<=0){
              tower.cooldown=tower.rate;tower.attackAnim=.24;target.hp-=tower.damage;
              state.effects.push({type:"impact",x:target.x,y:target.y,duration:.24,life:.24,color:"#65dcff"});
              state.effects.push({type:"text",x:target.x,y:target.y-19,text:`-${tower.damage}`,duration:.6,life:.6,color:"#b9f2ff"});
              for(let i=0;i<4;i++)state.effects.push({type:"spark",x:target.x,y:target.y,vx:(Math.random()-.5)*110,vy:(Math.random()-.5)*110,duration:.28,life:.28,color:"#65dcff"});
            }
            if(target&&tower.heavyCooldown<=0){
              tower.heavyCooldown=tower.heavyRate;tower.attackAnim=.38;target.hp-=tower.heavyDamage;
              state.effects.push({type:"impact",x:target.x,y:target.y,duration:.38,life:.38,color:"#ffc66d"});
              state.effects.push({type:"text",x:target.x,y:target.y-25,text:`หมัดหนัก -${tower.heavyDamage}`,duration:.8,life:.8,color:"#ffe5a1"});
              for(let i=0;i<7;i++)state.effects.push({type:"spark",x:target.x,y:target.y,vx:(Math.random()-.5)*145,vy:(Math.random()-.5)*145,duration:.36,life:.36,color:i%2?"#ffe5a1":"#65dcff"});
            }
          }else if(tower.type==="mage"){
            const target=state.enemies.filter(enemy=>Math.hypot(enemy.x-tower.x,enemy.y-tower.y)<=tower.range).sort((a,b)=>b.progress-a.progress)[0];
            if(target&&tower.magicCooldown<=0){
              tower.magicCooldown=tower.magicRate;tower.attackAnim=.24;
              state.shots.push({type:"mage-bolt",x:tower.x,y:tower.y-12,target,damage:tower.magicDamage,speed:460});
            }
            if(target&&tower.ringCooldown<=0){
              tower.ringCooldown=tower.ringRate;tower.attackAnim=.38;
              const blastRadius=82+(tower.level-1)*10;
              const targets=state.enemies.filter(enemy=>Math.hypot(enemy.x-target.x,enemy.y-target.y)<=blastRadius);
              for(const enemy of targets){
                enemy.hp-=tower.ringDamage;
                state.effects.push({type:"text",x:enemy.x,y:enemy.y-20,text:`-${tower.ringDamage}`,duration:.7,life:.7,color:"#e6d5ff"});
                for(let i=0;i<5;i++)state.effects.push({type:"spark",x:enemy.x,y:enemy.y,vx:(Math.random()-.5)*130,vy:(Math.random()-.5)*130,duration:.38,life:.38,color:i%2?"#c9a5ff":"#fff0a8"});
              }
              state.effects.push({type:"arcane-blast",x:target.x,y:target.y,radius:blastRadius,duration:.85,life:.85});
            }
          }else if(tower.cooldown<=0){
            const target=state.enemies.filter(e=>Math.hypot(e.x-tower.x,e.y-tower.y)<=tower.range).sort((a,b)=>b.progress-a.progress)[0];
            if(target){
              tower.attackAnim=.24;
              if(tower.type==="runner"){
                tower.dash={phase:"out",target};
              }else if(tower.type==="knight"){
                tower.cooldown=tower.rate;
                const critical=Math.random()<tower.critChance,damage=Math.round(tower.damage*(critical?tower.critMultiplier:1));
                target.hp-=damage;state.effects.push({type:"slash",x:tower.x,y:tower.y,target,duration:.25,life:.25,critical});
                state.effects.push({type:"text",x:target.x,y:target.y-20,text:critical?`คริติคอล! ${damage}`:`-${damage}`,duration:.75,life:.75,color:critical?"#ffe06a":"#fff3cf"});
                if(critical)for(let i=0;i<9;i++)state.effects.push({type:"spark",x:target.x,y:target.y,vx:(Math.random()-.5)*150,vy:(Math.random()-.5)*150,duration:.35,life:.35,color:"#ffe06a"});
              }else if(tower.type==="lightning"){
                tower.cooldown=tower.rate;
                const targets=state.enemies.filter(enemy=>Math.hypot(enemy.x-tower.x,enemy.y-tower.y)<=tower.range)
                  .sort((a,b)=>b.progress-a.progress).slice(0,3);
                for(const enemy of targets){
                  enemy.hp-=tower.damage;
                  state.effects.push({type:"lightning",x:tower.x,y:tower.y,target:enemy,duration:.24,life:.24});
                  state.effects.push({type:"text",x:enemy.x,y:enemy.y-20,text:`-${tower.damage}`,duration:.6,life:.6,color:"#fff3a1"});
                  for(let i=0;i<3;i++)state.effects.push({type:"spark",x:enemy.x,y:enemy.y,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,duration:.24,life:.24,color:"#fff078"});
                }
              }else if(tower.type==="wind"){
                tower.cooldown=tower.rate;
                state.shots.push({type:"wind",x:tower.x,y:tower.y,target,damage:tower.damage,speed:350,knockbackChance:tower.knockbackChance});
              }else{tower.cooldown=tower.rate;state.shots.push({x:tower.x,y:tower.y-12,target,damage:tower.damage,speed:420})}
            }
          }
        }
        for(const shot of state.shots){
          if(!state.enemies.includes(shot.target)){shot.life=0;continue}
          const dx=shot.target.x-shot.x,dy=shot.target.y-shot.y,distance=Math.hypot(dx,dy),step=shot.speed*dt;
          if(distance<=step+shot.target.radius){
            const target=shot.target,hitX=target.x,hitY=target.y;target.hp-=shot.damage;shot.life=0;
            if(shot.type==="wind"){
              const knockback=Math.random()<shot.knockbackChance;
              state.effects.push({type:"gust",x:hitX,y:hitY,duration:.48,life:.48});
              state.effects.push({type:"text",x:hitX,y:hitY-19,text:knockback?"ผลักถอยหลัง!":`-${shot.damage}`,duration:.7,life:.7,color:knockback?"#baf5ff":"#e7f6ff"});
              if(knockback){
                knockbackEnemy(target,85);
                for(let i=0;i<11;i++)state.effects.push({type:"spark",x:hitX,y:hitY,vx:(Math.random()-.5)*170,vy:(Math.random()-.5)*170,duration:.42,life:.42,color:"#9deaff"});
              }
            }else{
              const color=shot.type==="feather"?"#ffe5a1":shot.type==="mage-bolt"?"#caa5ff":"#8deaff";
              state.effects.push({type:"impact",x:hitX,y:hitY,duration:.25,life:.25,color});
              state.effects.push({type:"text",x:hitX,y:hitY-19,text:`-${shot.damage}`,duration:.6,life:.6,color:shot.type==="feather"?"#fff0c4":shot.type==="mage-bolt"?"#eadcff":"#e7f6ff"});
              for(let i=0;i<5;i++)state.effects.push({type:"spark",x:hitX,y:hitY,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,duration:.25,life:.25,color});
            }
          }else{shot.x+=dx/distance*step;shot.y+=dy/distance*step;shot.life=1}
        }
        state.shots=state.shots.filter(s=>s.life>0);
        for(const effect of state.effects){
          effect.life-=dt;
          if(effect.type==="spark"){effect.x+=effect.vx*dt;effect.y+=effect.vy*dt;effect.vy+=95*dt}
          if(effect.type==="text")effect.y-=27*dt;
        }
        state.effects=state.effects.filter(effect=>effect.life>0);
        const defeated=state.enemies.filter(e=>e.hp<=0);
        if(defeated.length){
          state.gold+=defeated.reduce((total,e)=>total+(e.boss?36:12),0);state.enemies=state.enemies.filter(e=>e.hp>0);
          for(const enemy of defeated){state.effects.push({type:"coin",x:enemy.x,y:enemy.y,duration:.7,life:.7});for(let i=0;i<7;i++)state.effects.push({type:"spark",x:enemy.x,y:enemy.y,vx:(Math.random()-.5)*125,vy:(Math.random()-.5)*125,duration:.32,life:.32,color:"#a8f2ba"})}
          const upgraded=autoUpgradeTowers();
          if(upgraded)notify(`อัปเกรดอัตโนมัติ ${upgraded} ครั้ง`);
          updateHud();
        }
        if(state.active&&state.spawnLeft===0&&state.enemies.length===0){
          state.active=false;state.waveJustEnded=true;const reward=35+state.wave*5;state.gold+=reward;
          const upgraded=autoUpgradeTowers();
          state.autoWaveTimer=state.autoWave?state.autoWaveDelay:0;
          notify(`จบคลื่น! รับโบนัส ${reward} เหรียญ${upgraded?` · อัปเกรด ${upgraded} ครั้ง`:""}`);updateHud();
        }
        if(state.lives===0){state.over=true;document.getElementById("result-text").textContent=`ป้องกันได้ ${state.wave} คลื่น และกำจัดศัตรูไปแล้ว!`;document.getElementById("game-over").classList.add("show");updateHud()}
      }
      function pointSegmentDistance(x,y,a,b){
        const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
        return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
      }
      const {draw}=createRenderer({canvas,ctx,state,path,pointer,canPlaceTower,pointSegmentDistance});
      canvas.addEventListener("pointermove",event=>{
        const rect=canvas.getBoundingClientRect();
        pointer.x=(event.clientX-rect.left)*canvas.width/rect.width;
        pointer.y=(event.clientY-rect.top)*canvas.height/rect.height;
        pointer.inside=true;
      });
      canvas.addEventListener("pointerleave",()=>{pointer.inside=false});
      canvas.addEventListener("click",event=>{
        if(state.over)return;
        const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*canvas.width/rect.width,y=(event.clientY-rect.top)*canvas.height/rect.height;
        const tower=state.towers.find(t=>Math.hypot(t.drawX-x,t.drawY-y)<29)||state.towers.find(t=>Math.hypot(t.x-x,t.y-y)<29);
        if(tower){state.selected=tower.id;updateHud();return}
        placeTower(x,y);
      });
      waveBtn.addEventListener("click",startWave);
      document.querySelectorAll(".hero-choice").forEach(button=>button.addEventListener("click",()=>{
        state.buildType=button.dataset.hero;updateHud();
      }));
      autoWaveInput.addEventListener("change",()=>{
        state.autoWave=autoWaveInput.checked;
        state.autoWaveTimer=state.autoWave&&!state.active&&state.wave>0?state.autoWaveDelay:0;
        updateHud();
      });
      autoWaveDelayInput.addEventListener("change",()=>{
        const requested=Number.parseInt(autoWaveDelayInput.value,10);
        state.autoWaveDelay=Number.isFinite(requested)?Math.max(3,Math.min(60,requested)):8;
        if(state.autoWave&&!state.active&&state.wave>0)state.autoWaveTimer=state.autoWaveDelay;
        updateHud();
      });
      autoUpgradeInput.addEventListener("change",()=>{
        state.autoUpgrade=autoUpgradeInput.checked;
        const upgraded=autoUpgradeTowers();
        if(upgraded)notify(`อัปเกรดอัตโนมัติ ${upgraded} ครั้ง`);
        else notify(state.autoUpgrade?"เปิดอัปเกรดอัตโนมัติแล้ว":"ปิดอัปเกรดอัตโนมัติแล้ว");
        updateHud();
      });
      pauseBtn.addEventListener("click",()=>{state.paused=!state.paused;updateHud()});
      speedBtn.addEventListener("click",()=>{state.speed=state.speed===1?1.7:1;speedBtn.textContent=state.speed===1?"⏩ เร่งความเร็ว":"▶ ความเร็วปกติ";notify(state.speed===1.7?"เร่งความเร็วเกมแล้ว":"กลับสู่ความเร็วปกติ")});
      document.getElementById("restart-btn").addEventListener("click",()=>location.reload());
      function frame(time){
        const dt=Math.min((time-state.lastTime)/1000||0,.05);state.lastTime=time;
        update(dt);updateCooldownDisplay();updateAutomationNote();draw();requestAnimationFrame(frame);
      }
      updateHud();requestAnimationFrame(frame);
    })();
