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
      let toastTimer,pointer={x:null,y:null,inside:false};

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
        const role=isSkybird?"ยิงขนนก · บินชนวงกว้าง":isMage?"ยิงพลังเวท · วงแหวนเวทวงกว้าง":isLightning?"ยิงสายฟ้าใส่ศัตรู 3 ตัว":isWater?"ประชิด":isWind?`พายุผลักถอยหลัง ${Math.round(tower.knockbackChance*100)}%`:isRunner?"พุ่งชน · กลับไปยังจุดยืน":isKnight?`ประชิด · คริติคอล ${Math.round(tower.critChance*100)}% ×${tower.critMultiplier}`:"ระยะไกล · กระสุนเวท";
        const blastRadius=82+(tower.level-1)*10;
        const stat2=isSkybird?`ระยะยิง<b>${tower.range} · วงบินชน ${tower.diveRadius}</b>`:isMage?`ระยะยิง<b>${tower.range} · วงแหวนรัศมี ${blastRadius}</b>`:isLightning?`เป้าหมาย<b>3 ตัว · ระยะ ${tower.range}</b>`:isWind?`โอกาสผลัก<b>${Math.round(tower.knockbackChance*100)}%</b>`:isRunner?`ระยะพุ่ง<b>${tower.range}</b>`:isKnight||isWater?`ระยะประชิด<b>${tower.range}</b>`:`ระยะยิง<b>${tower.range}</b>`;
        const icon=isSkybird?"🦅":isMage?"🧙":isLightning?"⚡":isWater?"🥊":isWind?"🌪️":isRunner?"🏃":isKnight?"🗡️":"🧙";
        heroPanel.innerHTML=`<div class="hero-row"><div class="hero-icon">${icon}</div><div><div class="hero-name">${heroName}</div><div class="hero-level">ระดับ ${tower.level} · ${tower.level>=5?"ระดับสูงสุด":role}</div></div></div>
          <div class="hero-stats"><div>${isSkybird?"ขนนก / บินชน":isMage?"พลังเวท / วงแหวน":"พลังโจมตี"}<b>${isSkybird?`${tower.featherDamage} / ${tower.diveDamage}`:isMage?`${tower.magicDamage} / ${tower.ringDamage}`:`${tower.damage}${isKnight?" + คริติคอล":""}`}</b></div><div>${stat2}</div></div>
          <div class="wallet"><span>🪙 เหรียญที่มี</span><strong id="upgrade-wallet">${state.gold.toLocaleString("th-TH")}</strong></div>
          ${isSkybird||isMage?`<div class="bird-cooldowns"><div><span>${isSkybird?"🪶 ขนนก":"✨ ยิงพลังเวท"} · ${(isSkybird?tower.featherRate:tower.magicRate).toFixed(2)} วิ</span><strong id="feather-cooldown-value">พร้อมโจมตี</strong><div class="cooldown-track"><div class="cooldown-fill" id="feather-cooldown-fill"></div></div></div><div><span>${isSkybird?"🦅 บินชน":"🔮 วงแหวนเวท"} · ${(isSkybird?tower.diveRate:tower.ringRate).toFixed(2)} วิ</span><strong id="dive-cooldown-value">พร้อมโจมตี</strong><div class="cooldown-track"><div class="cooldown-fill" id="dive-cooldown-fill"></div></div></div></div>`:`<div class="cooldown-readout"><span>คูลดาวน์โจมตี · ${tower.rate.toFixed(2)} วินาที</span><strong id="cooldown-value">พร้อมโจมตี</strong></div>
          <div class="cooldown-track"><div class="cooldown-fill" id="cooldown-fill"></div></div>`}
          <div class="hero-actions"><button class="action primary" id="upgrade-btn" ${tower.level>=5||state.gold<cost?"disabled":""}>⬆️ อัปเกรด <span class="upgrade-cost">${tower.level>=5?"เต็มแล้ว":`🪙 ${cost}`}</span></button><button class="action danger" id="sell-btn">🗑️ ลบ · คืน 🪙 ${Math.floor(tower.invested*.7)}</button></div>
          <p class="upgrade-next">ลบฮีโร่แล้วรับคืน 70% ของต้นทุนวางและอัปเกรด</p>
          ${tower.level<5?`<p class="upgrade-next">อัปเกรดถัดไป: ${isSkybird?"ขนนก +5 · บินชน +12 · วงกว้างขึ้น":isMage?"พลังเวท +5 · วงแหวน +13 · ระยะยิงเพิ่ม":`พลังโจมตี +${isLightning?10:isWater?5:isWind?12:isRunner?20:isKnight?18:13}${isLightning?" · เป้าหมาย 3 ตัว":isWater?" · ระยะ +5":isWind?" · โอกาสผลัก +5%":isKnight?" · โอกาสคริติคอล +5%":isRunner?" · คูลดาวน์ลดลง":""}`}</p>`:""}`;
        const button=document.getElementById("upgrade-btn");
        if(button)button.addEventListener("click",()=>upgradeTower());
        document.getElementById("sell-btn").addEventListener("click",sellTower);
      }
      function upgradeCost(tower){return 70+tower.level*55}
      function updateCooldownDisplay(){
        const tower=state.towers.find(t=>t.id===state.selected);
        if(tower?.type==="skybird"||tower?.type==="mage"){
          const cooldowns=tower.type==="skybird"?[[tower.featherCooldown,tower.featherRate],[tower.diveCooldown,tower.diveRate]]:[[tower.magicCooldown,tower.magicRate],[tower.ringCooldown,tower.ringRate]];
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
        const tower={id:Date.now()+Math.random(),type:state.buildType,x:pad.x,y:pad.y,drawX:pad.x,drawY:pad.y,level:1,invested:cost,damage:isLightning?20:isWater?10:isWind?18:isRunner?42:isKnight?31:isMage?20:22,magicDamage:20,ringDamage:50,magicRate:.75,ringRate:5,magicCooldown:.2,ringCooldown:.2,range:isSkybird?220:isLightning?240:isWater?100:isWind?185:isRunner?210:isKnight?112:isMage?180:145,rate:isLightning?1:isWater?.25:isWind?.78:isRunner?1.25:isKnight?.72:isMage?.75:.82,cooldown:.2,featherDamage:15,diveDamage:40,featherRate:.4,diveRate:6,featherCooldown:.2,diveCooldown:.2,diveRadius:92,critChance:isKnight?.25:0,critMultiplier:2.2,knockbackChance:isWind?.25:0,attackAnim:0,dash:null,stunned:0};
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
        else if(tower.type==="water"){tower.damage+=5;tower.range+=5}
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
        const hp=boss?1000:(34+state.wave*13)*(fast?0.72:explosive?1.35:1);
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
              }else if(tower.type==="water"){
                tower.cooldown=tower.rate;target.hp-=tower.damage;
                state.effects.push({type:"impact",x:target.x,y:target.y,duration:.24,life:.24,color:"#65dcff"});
                state.effects.push({type:"text",x:target.x,y:target.y-19,text:`-${tower.damage}`,duration:.6,life:.6,color:"#b9f2ff"});
                for(let i=0;i<4;i++)state.effects.push({type:"spark",x:target.x,y:target.y,vx:(Math.random()-.5)*110,vy:(Math.random()-.5)*110,duration:.28,life:.28,color:"#65dcff"});
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
      function roundedRect(x,y,w,h,r){
        ctx.beginPath();ctx.roundRect(x,y,w,h,r);
      }
      function draw(){
        const w=canvas.width,h=canvas.height;
        const now=performance.now()*.001;
        ctx.clearRect(0,0,w,h);
        const ground=ctx.createLinearGradient(0,0,w,h);
        ground.addColorStop(0,"#183b3b");ground.addColorStop(.5,"#315849");ground.addColorStop(1,"#1c3a3e");
        ctx.fillStyle=ground;ctx.fillRect(0,0,w,h);
        const mist=ctx.createRadialGradient(w*.5,h*.5,25,w*.5,h*.5,w*.75);
        mist.addColorStop(0,"#a2d99d0d");mist.addColorStop(1,"#06131d55");
        ctx.fillStyle=mist;ctx.fillRect(0,0,w,h);
        for(let i=0;i<34;i++){
          const x=(i*197+61)%w,y=(i*113+29)%h;
          if(path.some((p,j)=>j<path.length-1&&pointSegmentDistance(x,y,p,path[j+1])<54))continue;
          const pulse=.35+.65*(.5+.5*Math.sin(now*1.7+i*2.4)),radius=1.1+(i%3)*.55;
          ctx.globalAlpha=pulse;ctx.fillStyle=i%4===0?"#d8c3ff":"#c3edbd";ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=7;
          ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;ctx.shadowBlur=0;
        for(let i=0;i<12;i++){
          const x=(i*137+42)%w,y=(i*83+28)%h;
          if(path.some((p,j)=>j<path.length-1&&pointSegmentDistance(x,y,p,path[j+1])<54))continue;
          const sway=Math.sin(now*.7+i)*2;
          ctx.fillStyle=i%2?"#203f39":"#3f664b";ctx.beginPath();ctx.ellipse(x,y,9+i%4,6+i%3,sway,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#92ad68";ctx.globalAlpha=.75;ctx.beginPath();ctx.ellipse(x-2,y-2,4,2.5,sway,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
        }
        ctx.lineCap="round";ctx.lineJoin="round";
        ctx.shadowColor="#ffbd6388";ctx.shadowBlur=28;ctx.strokeStyle="#171e2b";ctx.lineWidth=82;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const p of path.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();
        ctx.shadowColor="#ffd57c77";ctx.shadowBlur=18;ctx.strokeStyle="#735239";ctx.lineWidth=70;ctx.stroke();
        ctx.shadowBlur=0;ctx.strokeStyle="#a8784e";ctx.lineWidth=60;ctx.stroke();
        const road=ctx.createLinearGradient(0,90,w,h);
        road.addColorStop(0,"#f3d99e");road.addColorStop(.48,"#d7b77c");road.addColorStop(1,"#f6dda0");
        ctx.strokeStyle=road;ctx.lineWidth=52;ctx.stroke();
        ctx.strokeStyle="#fff0bd88";ctx.lineWidth=2;ctx.setLineDash([2,17]);ctx.lineDashOffset=-now*22;ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
        ctx.strokeStyle="#fff2c833";ctx.lineWidth=1;ctx.setLineDash([7,19]);ctx.lineDashOffset=now*9;ctx.stroke();ctx.setLineDash([]);ctx.lineDashOffset=0;
        if(pointer.inside&&pointer.x!==null&&pointer.y!==null){
          const valid=canPlaceTower(pointer.x,pointer.y),wind=state.buildType==="wind",water=state.buildType==="water",lightning=state.buildType==="lightning",mage=state.buildType==="mage",skybird=state.buildType==="skybird",melee=water||state.buildType==="knight"||state.buildType==="runner";
          const color=valid?(skybird?"#a9ecff":lightning?"#fff078":mage?"#c69aff":water?"#65dcff":wind?"#8deaff":melee?"#ffad72":"#70e1bc"):"#ff7777";
          const radius=skybird?220:lightning?240:mage?180:water?100:wind?185:state.buildType==="runner"?210:state.buildType==="knight"?112:145;
          ctx.fillStyle=color+"0d";ctx.beginPath();ctx.arc(pointer.x,pointer.y,radius,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle=color+"88";ctx.lineWidth=2;ctx.setLineDash([5,6]);ctx.beginPath();ctx.arc(pointer.x,pointer.y,24,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
          ctx.fillStyle=color;ctx.font="20px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(valid?"＋":"×",pointer.x,pointer.y);
        }
        ctx.textAlign="center";ctx.textBaseline="middle";
        drawCastle(ctx,850,214);
        drawStartGate(ctx,17,89);
        for(const tower of state.towers){
          const knight=tower.type==="knight",runner=tower.type==="runner",wind=tower.type==="wind",water=tower.type==="water",lightning=tower.type==="lightning",mage=tower.type==="mage",skybird=tower.type==="skybird",accent=skybird?"#a9ecff":lightning?"#fff078":mage?"#c69aff":water?"#65dcff":wind?"#8deaff":runner||knight?"#ffad72":"#9beeff",drawX=tower.drawX,drawY=tower.drawY;
          if(tower.id===state.selected){ctx.fillStyle=skybird?"#a9ecff12":lightning?"#fff07812":mage?"#c69aff12":water?"#65dcff12":wind?"#8deaff12":runner||knight?"#ffad7212":"#70e1bc13";ctx.beginPath();ctx.arc(tower.x,tower.y,tower.range,0,Math.PI*2);ctx.fill();ctx.strokeStyle=skybird?"#a9ecff55":lightning?"#fff07844":mage?"#c69aff55":water?"#65dcff44":wind?"#8deaff44":runner||knight?"#ffad7244":"#70e1bc38";ctx.lineWidth=1;ctx.stroke();if(skybird){ctx.strokeStyle="#ffe5a155";ctx.setLineDash([5,6]);ctx.beginPath();ctx.arc(tower.x,tower.y,tower.diveRadius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}}
          if(runner&&tower.dash){ctx.strokeStyle="#ffad7277";ctx.lineWidth=3;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(tower.x,tower.y);ctx.lineTo(drawX,drawY);ctx.stroke();ctx.setLineDash([])}
          if(mage){
            const rotation=performance.now()*.00016;
            ctx.save();ctx.globalAlpha=tower.cooldown>0?.35:.7;ctx.strokeStyle="#d7b0ff";ctx.shadowColor="#b875ff";ctx.shadowBlur=12;ctx.lineWidth=1.5;
            ctx.beginPath();ctx.arc(drawX,drawY+7,29,rotation,rotation+Math.PI*1.68);ctx.stroke();
            ctx.strokeStyle="#ffe6a0";ctx.beginPath();ctx.arc(drawX,drawY+7,24,-rotation*1.3,-rotation*1.3+Math.PI*1.45);ctx.stroke();
            for(let mark=0;mark<4;mark++){
              const angle=rotation+mark*Math.PI/2;
              ctx.fillStyle=mark%2?"#ffe6a0":"#d7b0ff";ctx.beginPath();ctx.arc(drawX+Math.cos(angle)*29,drawY+7+Math.sin(angle)*29,2,0,Math.PI*2);ctx.fill();
            }
            ctx.restore();
          }
          const aura=ctx.createRadialGradient(drawX,drawY+4,4,drawX,drawY+4,35);
          aura.addColorStop(0,accent+"33");aura.addColorStop(1,accent+"00");
          ctx.fillStyle=aura;ctx.beginPath();ctx.arc(drawX,drawY+4,35,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#10192377";ctx.beginPath();ctx.ellipse(drawX,drawY+15,23,9,0,0,Math.PI*2);ctx.fill();
          drawHeroModel(ctx,tower,now,accent);
          ctx.fillStyle="#172236";ctx.beginPath();ctx.arc(drawX+16,drawY-17,9,0,Math.PI*2);ctx.fill();
          ctx.font="bold 10px sans-serif";ctx.fillStyle="#fff";ctx.fillText(tower.level,drawX+16,drawY-17);
          if(tower.stunned>0){
            const spin=now*5+tower.id;
            ctx.strokeStyle="#ffe7a0";ctx.fillStyle="#fff4c8";ctx.shadowColor="#ffc45e";ctx.shadowBlur=9;ctx.lineWidth=1.4;
            ctx.beginPath();ctx.ellipse(drawX,drawY-30,10,4,spin,0,Math.PI*2);ctx.stroke();
            for(let star=0;star<3;star++){
              const angle=spin+star*Math.PI*2/3,sx=drawX+Math.cos(angle)*10,sy=drawY-30+Math.sin(angle)*4;
              ctx.beginPath();ctx.arc(sx,sy,2,0,Math.PI*2);ctx.fill();
            }
            ctx.shadowBlur=0;
          }
          if(tower.attackAnim>0){ctx.strokeStyle=skybird?"#ffe5a1":lightning?"#fff078":mage?"#e4c6ff":water?"#9cecff":wind?"#baf5ff":runner||knight?"#fff0b8":"#9beeff";ctx.globalAlpha=tower.attackAnim/.38;ctx.lineWidth=3;ctx.beginPath();ctx.arc(drawX,drawY,28+tower.attackAnim*28,runner?-1.5:knight||water?-.9:-2.7,runner?1.5:knight||water?1.3:-1.1);ctx.stroke();ctx.globalAlpha=1}
        }
        for(const enemy of state.enemies){
          if(enemy.fast){ctx.strokeStyle="#bbf5ff99";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(enemy.x-23,enemy.y-4);ctx.lineTo(enemy.x-11,enemy.y-4);ctx.moveTo(enemy.x-20,enemy.y+3);ctx.lineTo(enemy.x-9,enemy.y+3);ctx.stroke()}
          if(enemy.explosive){const aura=ctx.createRadialGradient(enemy.x,enemy.y,3,enemy.x,enemy.y,38);aura.addColorStop(0,"#ffb36566");aura.addColorStop(1,"#ff563300");ctx.fillStyle=aura;ctx.beginPath();ctx.arc(enemy.x,enemy.y,38,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#ff9a6866";ctx.setLineDash([4,5]);ctx.beginPath();ctx.arc(enemy.x,enemy.y,enemy.explodeRadius,0,Math.PI*2);ctx.stroke();ctx.setLineDash([])}
          drawEnemyModel(ctx,enemy,now);
          const bw=enemy.dragon?76:42,bh=enemy.dragon?9:6,bx=enemy.x-bw/2,by=enemy.y-enemy.radius-(enemy.dragon?29:9);
          ctx.textBaseline="bottom";ctx.font=enemy.dragon?"bold 12px Kanit, sans-serif":"bold 10px Kanit, sans-serif";
          ctx.fillStyle=enemy.dragon?"#ffd3a0":enemy.explosive?"#ffcb9b":"#fff";ctx.shadowColor=enemy.dragon||enemy.explosive?"#b72d29":"#142018";ctx.shadowBlur=5;
          ctx.fillText(enemy.dragon?`มังกร · ${Math.max(0,Math.ceil(enemy.hp))}/1000`:enemy.explosive?`ระเบิด · ${Math.max(0,Math.ceil(enemy.hp))}/${Math.ceil(enemy.maxHp)}`:`${Math.max(0,Math.ceil(enemy.hp))}/${Math.ceil(enemy.maxHp)}`,enemy.x,by-3);ctx.shadowBlur=0;ctx.textBaseline="middle";
          const health=ctx.createLinearGradient(bx,by,bx+bw,by);
          health.addColorStop(0,enemy.dragon||enemy.explosive?"#ff554f":"#83e3a1");health.addColorStop(1,enemy.dragon||enemy.explosive?"#ffc265":"#a6f2b1");
          ctx.fillStyle="#17211e";roundedRect(bx,by,bw,bh,5);ctx.fill();
          ctx.fillStyle=health;roundedRect(bx,by,bw*Math.max(0,enemy.hp/enemy.maxHp),bh,5);ctx.fill();
          ctx.strokeStyle=enemy.dragon?"#ffe0aa":"#ffffffaa";ctx.lineWidth=1.5;roundedRect(bx,by,bw,bh,5);ctx.stroke();
        }
        for(const effect of state.effects){
          const progress=1-effect.life/effect.duration;ctx.save();
          if(effect.type==="slash"){
            if(!effect.target||!state.enemies.includes(effect.target)){ctx.restore();continue}
            const angle=Math.atan2(effect.target.y-effect.y,effect.target.x-effect.x);
            ctx.translate(effect.x,effect.y);ctx.rotate(angle);ctx.globalAlpha=effect.life/effect.duration;ctx.strokeStyle=effect.critical?"#fff08a":"#f3e6c8";ctx.lineWidth=effect.critical?8:6;ctx.shadowColor=effect.critical?"#ffb64d":"#fff1bf";ctx.shadowBlur=20;ctx.beginPath();ctx.arc(0,0,50,-.72+progress*.3,.72+progress*.3);ctx.stroke();
            if(effect.critical){ctx.strokeStyle="#ffb542";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,58,-.55+progress*.3,.55+progress*.3);ctx.stroke()}
          }else if(effect.type==="impact"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.strokeStyle=effect.color||"#9beeff";ctx.lineWidth=4;ctx.shadowColor=effect.color||"#70dcff";ctx.shadowBlur=15;ctx.beginPath();ctx.arc(effect.x,effect.y,9+progress*22,0,Math.PI*2);ctx.stroke();
          }else if(effect.type==="gust"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.strokeStyle="#a9efff";ctx.lineWidth=4;ctx.shadowColor="#71ddff";ctx.shadowBlur=19;
            for(let ring=0;ring<3;ring++){ctx.beginPath();ctx.arc(effect.x,effect.y,10+progress*44+ring*8,progress*4+ring*2,progress*4+ring*2+Math.PI*1.25);ctx.stroke()}
          }else if(effect.type==="lightning"){
            if(!state.enemies.includes(effect.target)){ctx.restore();continue}
            const dx=effect.target.x-effect.x,dy=effect.target.y-effect.y;
            ctx.globalAlpha=effect.life/effect.duration;ctx.strokeStyle="#fff7a0";ctx.lineWidth=4;ctx.shadowColor="#ffe94d";ctx.shadowBlur=22;
            ctx.beginPath();ctx.moveTo(effect.x,effect.y);
            for(let segment=1;segment<7;segment++){
              const t=segment/7,offset=Math.sin(segment*12.9+progress*10)*13;
              ctx.lineTo(effect.x+dx*t-dy/Math.max(1,Math.hypot(dx,dy))*offset,effect.y+dy*t+dx/Math.max(1,Math.hypot(dx,dy))*offset);
            }
            ctx.lineTo(effect.target.x,effect.target.y);ctx.stroke();
          }else if(effect.type==="arcane-blast"){
            const radius=effect.radius*(.35+progress*.75),alpha=Math.sin(progress*Math.PI);
            ctx.globalAlpha=alpha*.2;
            const glow=ctx.createRadialGradient(effect.x,effect.y,2,effect.x,effect.y,radius);
            glow.addColorStop(0,"#efe0ff");glow.addColorStop(.55,"#a96cff");glow.addColorStop(1,"#4c1e9b00");
            ctx.fillStyle=glow;ctx.beginPath();ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=alpha;ctx.shadowColor="#c59aff";ctx.shadowBlur=28;ctx.lineWidth=5;ctx.strokeStyle="#ead7ff";
            ctx.beginPath();ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);ctx.stroke();
            ctx.lineWidth=2;ctx.strokeStyle="#ffd56f";ctx.beginPath();ctx.arc(effect.x,effect.y,radius*.72,-progress*4,Math.PI*2-progress*4);ctx.stroke();
            for(let rune=0;rune<8;rune++){
              const angle=rune*Math.PI/4-progress*2.5,rx=effect.x+Math.cos(angle)*radius*.86,ry=effect.y+Math.sin(angle)*radius*.86;
              ctx.save();ctx.translate(rx,ry);ctx.rotate(angle);ctx.font="bold 15px sans-serif";ctx.fillStyle="#fff0a8";ctx.fillText(rune%2?"✦":"ᛟ",0,0);ctx.restore();
            }
          }else if(effect.type==="dragon-roar"){
            const reach=effect.radius*progress;
            ctx.globalAlpha=(1-progress)*.24;ctx.fillStyle="#ff553b";ctx.fillRect(0,0,w,h);
            ctx.globalAlpha=1-progress;ctx.shadowColor="#ff6c43";ctx.shadowBlur=24;
            for(let ring=0;ring<4;ring++){
              const radius=Math.max(2,reach-ring*22);
              ctx.strokeStyle=ring%2?"#ffd27a":"#ff7654";ctx.lineWidth=5-ring*.6;
              ctx.beginPath();ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);ctx.stroke();
            }
          }else if(effect.type==="stun-pulse"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.strokeStyle="#ffd27a";ctx.lineWidth=5;ctx.shadowColor="#ffbd59";ctx.shadowBlur=22;ctx.beginPath();ctx.arc(effect.x,effect.y,progress*effect.radius,0,Math.PI*2);ctx.stroke();
          }else if(effect.type==="stun-explosion"){
            const radius=effect.radius*(.25+progress*.8);
            ctx.globalAlpha=(1-progress)*.24;ctx.fillStyle="#ff6338";ctx.fillRect(0,0,w,h);
            ctx.globalAlpha=1-progress;ctx.shadowColor="#ff8b52";ctx.shadowBlur=24;
            const glow=ctx.createRadialGradient(effect.x,effect.y,2,effect.x,effect.y,radius);
            glow.addColorStop(0,"#fff3bd");glow.addColorStop(.35,"#ffb35e");glow.addColorStop(1,"#ff583000");
            ctx.fillStyle=glow;ctx.beginPath();ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);ctx.fill();
            ctx.lineWidth=5;ctx.strokeStyle="#ffe0a0";ctx.beginPath();ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);ctx.stroke();
          }else if(effect.type==="sky-dive"){
            const radius=effect.radius*(.35+progress*.75),alpha=Math.sin(progress*Math.PI);
            ctx.globalAlpha=alpha*.22;const glow=ctx.createRadialGradient(effect.x,effect.y,3,effect.x,effect.y,radius);
            glow.addColorStop(0,"#fff3c4");glow.addColorStop(.5,"#84dfff");glow.addColorStop(1,"#5bbaff00");
            ctx.fillStyle=glow;ctx.beginPath();ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);ctx.fill();
            ctx.globalAlpha=alpha;ctx.strokeStyle="#e7faff";ctx.shadowColor="#76dfff";ctx.shadowBlur=24;ctx.lineWidth=5;
            ctx.beginPath();ctx.arc(effect.x,effect.y,radius,0,Math.PI*2);ctx.stroke();
            for(let feather=0;feather<8;feather++){
              const angle=feather*Math.PI/4-progress*1.4;
              ctx.save();ctx.translate(effect.x+Math.cos(angle)*radius*.8,effect.y+Math.sin(angle)*radius*.8);ctx.rotate(angle);
              ctx.fillStyle="#fff0ba";ctx.font="bold 17px sans-serif";ctx.fillText("✦",0,0);ctx.restore();
            }
          }else if(effect.type==="spark"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.fillStyle=effect.color;ctx.shadowColor=effect.color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(effect.x,effect.y,2+effect.life/effect.duration*2,0,Math.PI*2);ctx.fill();
          }else if(effect.type==="text"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.fillStyle=effect.color;ctx.shadowColor="#000";ctx.shadowBlur=5;ctx.font=effect.text.startsWith("คริติคอล")?"bold 15px Kanit, sans-serif":"bold 13px Kanit, sans-serif";ctx.textAlign="center";ctx.fillText(effect.text,effect.x,effect.y);
          }else if(effect.type==="coin"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.translate(effect.x,effect.y-25-progress*24);ctx.rotate(progress*3);
            const coin=ctx.createRadialGradient(-3,-4,1,0,0,10);coin.addColorStop(0,"#fff0a2");coin.addColorStop(.55,"#ffd35c");coin.addColorStop(1,"#b87528");
            ctx.fillStyle=coin;ctx.beginPath();ctx.ellipse(0,0,8,10,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#fff0a2";ctx.lineWidth=1.5;ctx.stroke();
            ctx.fillStyle="#9b641e";ctx.font="bold 10px sans-serif";ctx.fillText("$",0,1);
          }
          ctx.restore();
        }
        for(const shot of state.shots){
          if(shot.type==="wind"){
            const angle=Math.atan2(shot.target.y-shot.y,shot.target.x-shot.x);ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(angle);
            ctx.strokeStyle="#c6f4ff";ctx.lineWidth=4;ctx.shadowColor="#67dcff";ctx.shadowBlur=17;ctx.beginPath();ctx.moveTo(-21,0);ctx.quadraticCurveTo(-9,-9,3,0);ctx.quadraticCurveTo(10,7,18,0);ctx.stroke();ctx.restore();ctx.shadowBlur=0;
          }else if(shot.type==="feather"){
            const angle=Math.atan2(shot.target.y-shot.y,shot.target.x-shot.x);ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(angle);
            ctx.fillStyle="#fff0ba";ctx.shadowColor="#85dcff";ctx.shadowBlur=18;ctx.beginPath();ctx.moveTo(-10,-4);ctx.quadraticCurveTo(1,-5,11,0);ctx.quadraticCurveTo(1,5,-10,4);ctx.closePath();ctx.fill();
            ctx.strokeStyle="#79c9e9";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(9,0);ctx.stroke();ctx.restore();ctx.shadowBlur=0;
          }else if(shot.type==="mage-bolt"){
            ctx.fillStyle="#e6d5ff";ctx.shadowColor="#b875ff";ctx.shadowBlur=20;ctx.beginPath();ctx.arc(shot.x,shot.y,6,0,Math.PI*2);ctx.fill();
            ctx.strokeStyle="#fff0c4";ctx.lineWidth=2;ctx.beginPath();ctx.arc(shot.x,shot.y,9,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
          }else{ctx.fillStyle="#c6f4ff";ctx.shadowColor="#67dcff";ctx.shadowBlur=17;ctx.beginPath();ctx.arc(shot.x,shot.y,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
        }
      }
      function drawHeroModel(ctx,tower,time,accent){
        const {x,y}=tower,scale=tower.type==="skybird"?1.12:1;
        ctx.save();ctx.translate(x,y+Math.sin(time*5+tower.id)*1.2);ctx.scale(scale,scale);
        ctx.rotate(tower.attackAnim>0?-.12:0);
        const path=(points,fill,stroke="#172337",line=1.3)=>{
          ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const point of points.slice(1))ctx.lineTo(point[0],point[1]);ctx.closePath();
          ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
        };
        const sphere=(cx,cy,r,fill,stroke="#172337",line=1.2)=>{
          ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
          if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
        };
        const shine=ctx.createLinearGradient(-16,-21,15,20);
        const palettes={
          mage:["#f3e6ff","#a979d8","#513875"],knight:["#fff0c9","#d6975c","#744638"],
          runner:["#ffe2ac","#e6874d","#753d43"],wind:["#e0fbff","#76cddd","#315e7b"],
          water:["#dcfbff","#36a8d2","#205879"],lightning:["#fff7c2","#d6bc42","#67531c"],
          skybird:["#f3fdff","#70c9df","#315e7b"]
        };
        const colors=palettes[tower.type]||palettes.mage;
        shine.addColorStop(0,colors[0]);shine.addColorStop(.48,colors[1]);shine.addColorStop(1,colors[2]);
        if(tower.type==="skybird"){
          const flap=Math.sin(time*11)*5;
          path([[-4,-2],[-24,-13-flap],[-19,-3],[-29,0],[-16,3],[-22,12],[-5,7]],"#a6dff0","#315e7b",1.5);
          path([[2,-2],[24,-13+flap],[19,-3],[29,0],[16,3],[22,12],[5,7]],"#e6faff","#315e7b",1.5);
          path([[-12,5],[-22,15],[-8,12],[-2,17],[5,10]],"#74bad1","#315e7b");
          path([[-12,-7],[-7,-17],[2,-20],[12,-15],[15,-7],[10,4],[1,10],[-9,5]],shine,"#315e7b",1.7);
          sphere(5,-15,7,"#effdff","#315e7b");
          path([[11,-16],[21,-12],[11,-9]],"#f3b553","#81502d");
          sphere(7,-16,1.35,"#15273b",null);
          path([[-4,9],[-2,15],[0,15],[1,9]],"#d5a24d","#765126");
          path([[3,9],[5,15],[7,15],[8,8]],"#d5a24d","#765126");
          for(let i=0;i<3;i++){
            ctx.strokeStyle="#f8ffff88";ctx.lineWidth=1;
            ctx.beginPath();ctx.moveTo(-13+i*3,-5-i*2);ctx.lineTo(-19+i*3,-7-i*2);ctx.stroke();
          }
          ctx.restore();return;
        }
        const robe=tower.type==="mage"||tower.type==="wind";
        if(tower.type==="runner"){
          path([[-8,-2],[-17,3],[-20,13],[-11,9],[-5,16],[3,12]],"#bd514b","#642f3b",1.5);
        }else if(tower.type==="knight"){
          path([[-10,0],[-14,7],[-11,13],[-3,11],[0,4]],"#a45442","#5c3030");
        }else if(robe){
          path([[-9,-3],[-15,8],[-12,17],[11,17],[15,8],[9,-3]],shine,"#47375d",1.6);
          path([[-4,3],[0,12],[4,3],[2,0]],"#fff0bd","#77528b",.8);
        }else{
          path([[-9,-3],[-13,5],[-10,12],[9,12],[13,5],[9,-3]],shine,tower.type==="lightning"?"#66512b":"#25465e",1.6);
        }
        path([[-8,12],[-7,18],[-1,18],[0,12]],"#332d3b","#1b2633");
        path([[2,12],[2,18],[9,18],[10,14]],"#3e3440","#1b2633");
        path([[-9,17],[-9,20],[-1,20],[0,18]],"#bd8b60","#4b3a34");
        path([[2,18],[2,20],[11,20],[10,17]],"#bd8b60","#4b3a34");
        sphere(-10,-1,4.2,shine,"#25364a");
        sphere(10,-1,4.2,shine,"#25364a");
        path([[-8,-13],[-7,-20],[0,-24],[8,-20],[9,-12],[6,-6],[0,-4],[-6,-7]],"#f0c49b","#563f47",1.4);
        sphere(-3,-15,1.1,"#203041",null);sphere(3,-15,1.1,"#203041",null);
        ctx.strokeStyle="#a35955";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-2,-9);ctx.quadraticCurveTo(0,-7,3,-9);ctx.stroke();
        if(tower.type==="mage"){
          path([[-12,-17],[-7,-24],[0,-35],[8,-23],[13,-17],[5,-19],[0,-17],[-6,-20]],"#573c86","#f0d6ff",1.5);
          ctx.strokeStyle="#ffdf8a";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(12,-3);ctx.lineTo(20,16);ctx.stroke();
          sphere(12,-4,3.4,"#e7c5ff","#fff0bd",1);sphere(20,16,2,"#ffe08a",null);
        }else if(tower.type==="knight"){
          path([[-10,-15],[-9,-23],[-4,-27],[5,-27],[10,-20],[8,-12],[1,-9],[-7,-11]],"#d6dce2","#6f7780",1.5);
          path([[-8,-23],[-4,-30],[4,-30],[9,-23],[2,-25]],"#bc634b","#763f39");
          path([[9,-2],[14,-8],[21,-22],[23,-21],[19,-5],[13,1]],"#dce9ee","#63747e",1.5);
          path([[18,-23],[24,-32],[26,-21]],"#ffe4a3","#82613b",1);
          sphere(0,1,2.5,"#fff0bd","#957047",.8);
        }else if(tower.type==="runner"){
          path([[-10,-16],[-7,-23],[0,-27],[8,-22],[11,-14],[4,-16],[0,-13],[-6,-15]],"#b94f4b","#663844",1.5);
          path([[7,-4],[15,0],[22,2],[21,5],[11,4],[4,1]],"#f1bf74","#744b3c");
          path([[-2,3],[-13,8],[-19,8],[-18,5],[-8,3]],"#f1bf74","#744b3c");
          ctx.strokeStyle="#f8ca77";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-3,0);ctx.lineTo(7,6);ctx.stroke();
        }else if(tower.type==="wind"){
          ctx.globalAlpha=.8;ctx.strokeStyle="#e2fbff";ctx.lineWidth=2;
          for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(0,0,13+i*4,time*1.5+i*2,time*1.5+i*2+Math.PI*1.15);ctx.stroke()}
          ctx.globalAlpha=1;sphere(0,1,3,"#f2ffff","#77d8ec",1);
          for(let i=0;i<3;i++)sphere(Math.cos(time*2+i*2)*17,Math.sin(time*2+i*2)*13,1.6,"#d9fbff",null);
        }else if(tower.type==="water"){
          path([[-10,-14],[-6,-24],[6,-24],[11,-14],[6,-11],[-6,-11]],"#235d8b","#9cecff",1.2);
          path([[-8,-2],[-2,5],[5,-2],[8,8],[0,12],[-8,8]],"#bdf8ff","#368db2",1);
          ctx.strokeStyle="#e8fcff";ctx.lineWidth=2;ctx.beginPath();ctx.arc(-12,-3,5,-1.2,1.1);ctx.stroke();ctx.beginPath();ctx.arc(12,-3,5,2.1,4.4);ctx.stroke();
          sphere(-12,-3,3.2,"#5bc5e5","#d3faff");sphere(12,-3,3.2,"#5bc5e5","#d3faff");
        }else if(tower.type==="lightning"){
          path([[-12,-15],[-9,-22],[-3,-25],[7,-23],[12,-16],[7,-12],[-6,-12]],"#d9c34a","#fff0a8",1.4);
          path([[8,-3],[13,-6],[18,-12],[22,-11],[18,-4],[12,1]],"#687486","#ffe88b",1.4);
          path([[18,-12],[21,-17],[24,-12],[22,-8]],"#fff19b","#8c7035",1);
          sphere(0,0,3,"#fff3aa","#a17a29");
        }
        ctx.strokeStyle=accent;ctx.globalAlpha=.8;ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(0,1,15,24,-.08,Math.PI*.08,Math.PI*.92);ctx.stroke();ctx.globalAlpha=1;
        ctx.restore();
      }
      function drawEnemyModel(ctx,enemy,time){
        const {x,y}=enemy,fast=enemy.fast,explosive=enemy.explosive,dragon=enemy.dragon;
        ctx.save();ctx.translate(x,y+Math.sin(time*6+enemy.progress)*1.5);
        const poly=(points,fill,stroke="#392c38",line=1.5)=>{
          ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const p of points.slice(1))ctx.lineTo(p[0],p[1]);ctx.closePath();
          ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();
        };
        const orb=(cx,cy,r,fill,stroke="#392c38",line=1.2)=>{
          ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke()}
        };
        if(dragon){
          const flap=Math.sin(time*7)*6;
          ctx.shadowColor="#ff673e";ctx.shadowBlur=18;
          poly([[-9,1],[-31,-19-flap],[-26,-3],[-43,-9],[-28,10],[-15,14]],"#7b2e37","#f59a65",1.8);
          poly([[9,1],[31,-19+flap],[26,-3],[43,-9],[28,10],[15,14]],"#a8443c","#f59a65",1.8);
          ctx.shadowBlur=0;
          ctx.strokeStyle="#f68054";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-9,8);ctx.quadraticCurveTo(-22,24,-34,15);ctx.stroke();
          poly([[-18,-7],[-10,-16],[4,-17],[16,-11],[19,1],[10,12],[-5,13],[-17,5]],"#c5523e","#602b3a",2);
          poly([[5,-12],[14,-24],[15,-13],[23,-18],[20,-8]],"#de7550","#68343a");
          poly([[11,-4],[24,-7],[19,1],[12,2]],"#f2b65e","#733d36",1.2);
          orb(13,-9,2.1,"#ffe768","#581e2c",.7);
          ctx.strokeStyle="#ffe4aa";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(-6,11);ctx.lineTo(1,17);ctx.lineTo(6,11);ctx.stroke();
          for(let i=0;i<3;i++){poly([[-13+i*8,-12],[-10+i*8,-20],[-7+i*8,-11]],"#f6a05e","#6a3038",.8)}
        }else if(fast){
          poly([[-13,-2],[-14,-19],[-5,-11],[0,-16],[7,-10],[15,-13],[14,5],[7,13],[-7,12]],"#c8edf0","#547887",1.5);
          poly([[-10,-13],[-13,-28],[-4,-17]],"#f4b5b9","#547887",1.2);
          poly([[1,-15],[7,-29],[10,-14]],"#f4b5b9","#547887",1.2);
          orb(7,-5,2.1,"#c83748",null);orb(8,-5,1,"#fff4d0",null);
          poly([[13,-4],[21,-1],[13,1]],"#d58a75","#547887",.8);
          ctx.strokeStyle="#638a94";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-8,10);ctx.lineTo(-12,15);ctx.moveTo(6,10);ctx.lineTo(10,15);ctx.stroke();
        }else if(explosive){
          const bomb=ctx.createRadialGradient(-7,-10,2,0,0,24);bomb.addColorStop(0,"#fff0cc");bomb.addColorStop(.35,"#ed9b5e");bomb.addColorStop(1,"#9b3e42");
          orb(0,2,17,bomb,"#632f3b",2);
          ctx.strokeStyle="#e9c48a";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(4,-13);ctx.quadraticCurveTo(14,-23,10,-29);ctx.stroke();
          ctx.shadowColor="#ffdc67";ctx.shadowBlur=12;poly([[8,-29],[11,-35],[13,-29],[19,-30],[14,-26],[16,-21],[11,-24],[7,-20],[8,-26],[3,-28]],"#ffda69","#fff2b3",.8);ctx.shadowBlur=0;
          orb(-6,-1,2,"#fff4cb",null);orb(6,-1,2,"#fff4cb",null);
          ctx.strokeStyle="#612e36";ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-5,7);ctx.lineTo(0,9);ctx.lineTo(5,7);ctx.stroke();
        }else{
          const skin=ctx.createRadialGradient(-7,-8,2,0,0,22);skin.addColorStop(0,"#e1d18a");skin.addColorStop(.55,"#8faa57");skin.addColorStop(1,"#42513e");
          poly([[-13,-6],[-20,-15],[-12,-14],[-8,-20],[-2,-14],[9,-17],[16,-10],[17,3],[11,13],[-9,12],[-16,5]],skin,"#35443a",1.8);
          poly([[-12,-10],[-18,-19],[-8,-14],[-3,-21],[1,-12]],"#d8b365","#514638");
          poly([[5,-12],[11,-20],[15,-12],[20,-14],[16,-7]],"#d8b365","#514638");
          orb(-6,-4,2.6,"#d94842","#442a32",.7);orb(7,-4,2.6,"#d94842","#442a32",.7);
          orb(-5,-4,1,"#fff4bd",null);orb(8,-4,1,"#fff4bd",null);
          poly([[-4,5],[0,8],[5,4],[4,10],[-2,10]],"#fff0ca","#68503c",.7);
          ctx.strokeStyle="#66463a";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,13);ctx.lineTo(-12,17);ctx.moveTo(8,13);ctx.lineTo(11,17);ctx.stroke();
        }
        ctx.restore();
      }
      function drawCastle(ctx,x,y){
        ctx.save();ctx.translate(x,y);
        ctx.fillStyle="#111a2888";ctx.beginPath();ctx.ellipse(0,28,28,8,0,0,Math.PI*2);ctx.fill();
        const wall=ctx.createLinearGradient(-20,-18,20,24);wall.addColorStop(0,"#fff1c0");wall.addColorStop(.42,"#d7b7e8");wall.addColorStop(1,"#785bad");
        ctx.shadowColor="#cfa0ff";ctx.shadowBlur=15;
        ctx.fillStyle=wall;ctx.beginPath();ctx.moveTo(-23,21);ctx.lineTo(-23,-4);ctx.lineTo(-17,-4);ctx.lineTo(-17,-13);ctx.lineTo(-10,-13);ctx.lineTo(-10,-4);ctx.lineTo(10,-4);ctx.lineTo(10,-13);ctx.lineTo(17,-13);ctx.lineTo(17,-4);ctx.lineTo(23,-4);ctx.lineTo(23,21);ctx.closePath();ctx.fill();
        ctx.fillStyle="#33284d";ctx.beginPath();ctx.arc(0,21,7,Math.PI,Math.PI*2);ctx.lineTo(7,26);ctx.lineTo(-7,26);ctx.closePath();ctx.fill();
        ctx.fillStyle="#fff0a4";ctx.fillRect(-17,2,4,6);ctx.fillRect(13,2,4,6);
        ctx.fillStyle="#e7bd63";ctx.fillRect(-3,-1,6,5);
        ctx.shadowBlur=0;ctx.strokeStyle="#fff0d1";ctx.lineWidth=1.5;ctx.strokeRect(-23,-4,46,25);
        ctx.restore();
      }
      function drawStartGate(ctx,x,y){
        ctx.save();ctx.translate(x,y);ctx.strokeStyle="#9b6746";ctx.lineWidth=3;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,25);ctx.stroke();
        ctx.fillStyle="#e05e73";ctx.beginPath();ctx.moveTo(1,1);ctx.lineTo(21,6);ctx.lineTo(1,12);ctx.closePath();ctx.fill();
        ctx.strokeStyle="#ffe1a0";ctx.lineWidth=1;ctx.stroke();ctx.restore();
      }
      function pointSegmentDistance(x,y,a,b){
        const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));
        return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);
      }
      canvas.addEventListener("pointermove",event=>{
        const rect=canvas.getBoundingClientRect();
        pointer={x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height,inside:true};
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
