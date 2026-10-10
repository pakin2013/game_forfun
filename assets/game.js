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
      const state = {gold:180,lives:20,wave:0,enemies:[],towers:[],shots:[],effects:[],selected:null,buildType:"mage",active:false,paused:false,speed:1,spawnLeft:0,spawnTimer:0,lastTime:0,over:false,autoWave:false,autoWaveDelay:8,autoWaveTimer:0,autoUpgrade:false};
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
        waveNote.textContent=state.active?`เหลือศัตรูอีก ${state.spawnLeft} ตัว`:(state.wave?"คลื่นถัดไปแข็งแกร่งขึ้น!":"เตรียมตัวให้พร้อมก่อนเริ่ม!");
        pauseBtn.textContent=state.paused?"▶ เล่นต่อ":"⏸ หยุดเกม";
        autoWaveInput.checked=state.autoWave;autoWaveDelayInput.value=state.autoWaveDelay;autoUpgradeInput.checked=state.autoUpgrade;
        document.querySelectorAll(".hero-choice").forEach(button=>button.classList.toggle("active",button.dataset.hero===state.buildType));
        const buildName=state.buildType==="knight"?"นักดาบ":state.buildType==="runner"?"นักวิ่ง":state.buildType==="wind"?"วิญญาณลม":"จอมเวท";
        buildNote.textContent=`เลือก ${buildName} แล้วคลิกพื้นว่างเพื่อวางได้อย่างอิสระ`;
        renderPanel();
      }
      function renderPanel(){
        const tower=state.towers.find(t=>t.id===state.selected);
        if(!tower){heroPanel.innerHTML='<p class="hint">เลือกฮีโร่แล้วคลิกพื้นว่างเพื่อวางได้อย่างอิสระ คลิกฮีโร่ที่วางแล้วเพื่อดูข้อมูลและอัปเกรด</p>';return}
        const cost=upgradeCost(tower);
        const isKnight=tower.type==="knight",isRunner=tower.type==="runner",isWind=tower.type==="wind";
        const heroName=isWind?"วิญญาณลม":isRunner?"นักวิ่งพุ่งชน":isKnight?"นักดาบคริติคอล":"ผู้พิทักษ์เวทมนตร์";
        const role=isWind?`พายุผลักถอยหลัง ${Math.round(tower.knockbackChance*100)}%`:isRunner?"พุ่งชน · กลับไปยังจุดยืน":isKnight?`ประชิด · คริติคอล ${Math.round(tower.critChance*100)}% ×${tower.critMultiplier}`:"ระยะไกล · กระสุนเวท";
        const stat2=isWind?`โอกาสผลัก<b>${Math.round(tower.knockbackChance*100)}%</b>`:isRunner?`ระยะพุ่ง<b>${tower.range}</b>`:isKnight?`ระยะประชิด<b>${tower.range}</b>`:`ระยะยิง<b>${tower.range}</b>`;
        const icon=isWind?"🌪️":isRunner?"🏃":isKnight?"🗡️":"🧙";
        heroPanel.innerHTML=`<div class="hero-row"><div class="hero-icon">${icon}</div><div><div class="hero-name">${heroName}</div><div class="hero-level">ระดับ ${tower.level} · ${tower.level>=5?"ระดับสูงสุด":role}</div></div></div>
          <div class="hero-stats"><div>พลังโจมตี<b>${tower.damage}${isKnight?" + คริติคอล":""}</b></div><div>${stat2}</div></div>
          <div class="wallet"><span>🪙 เหรียญที่มี</span><strong id="upgrade-wallet">${state.gold.toLocaleString("th-TH")}</strong></div>
          <div class="cooldown-readout"><span>คูลดาวน์โจมตี · ${tower.rate.toFixed(2)} วินาที</span><strong id="cooldown-value">พร้อมโจมตี</strong></div>
          <div class="cooldown-track"><div class="cooldown-fill" id="cooldown-fill"></div></div>
          <div class="hero-actions"><button class="action primary" id="upgrade-btn" ${tower.level>=5||state.gold<cost?"disabled":""}>⬆️ อัปเกรด <span class="upgrade-cost">${tower.level>=5?"เต็มแล้ว":`🪙 ${cost}`}</span></button><button class="action danger" id="sell-btn">🗑️ ลบ · คืน 🪙 ${Math.floor(tower.invested*.7)}</button></div>
          <p class="upgrade-next">ลบฮีโร่แล้วรับคืน 70% ของต้นทุนวางและอัปเกรด</p>
          ${tower.level<5?`<p class="upgrade-next">อัปเกรดถัดไป: พลังโจมตี +${isWind?12:isRunner?20:isKnight?18:13}${isWind?" · โอกาสผลัก +5%":isKnight?" · โอกาสคริติคอล +5%":isRunner?" · คูลดาวน์ลดลง":""}</p>`:""}`;
        const button=document.getElementById("upgrade-btn");
        if(button)button.addEventListener("click",()=>upgradeTower());
        document.getElementById("sell-btn").addEventListener("click",sellTower);
      }
      function upgradeCost(tower){return 70+tower.level*55}
      function updateCooldownDisplay(){
        const tower=state.towers.find(t=>t.id===state.selected);
        const value=document.getElementById("cooldown-value"),fill=document.getElementById("cooldown-fill");
        if(!tower||!value||!fill)return;
        if(tower.dash?.phase==="out")value.textContent="กำลังพุ่งชน!";
        else if(tower.cooldown>0)value.textContent=`เหลือ ${tower.cooldown.toFixed(1)} วิ`;
        else value.textContent="พร้อมโจมตี";
        fill.style.transform=`scaleX(${tower.dash?.phase==="out"?1:Math.max(0,1-tower.cooldown/tower.rate)})`;
      }
      function updateAutomationNote(){
        if(!state.autoWave){autoWaveNote.textContent="เริ่มคลื่นด้วยตนเอง";return}
        if(state.wave===0){autoWaveNote.textContent="เริ่มคลื่นแรกด้วยตนเองก่อน ระบบจะเริ่มคลื่นถัดไปให้อัตโนมัติ";return}
        if(state.active){autoWaveNote.textContent="จะเริ่มนับเวลาหลังจบคลื่นนี้";return}
        autoWaveNote.textContent=`คลื่นถัดไปจะเริ่มใน ${state.autoWaveTimer.toFixed(1)} วินาที`;
      }
      function addTower(pad){
        const isKnight=state.buildType==="knight",isRunner=state.buildType==="runner",isWind=state.buildType==="wind",cost=isWind?120:isRunner?110:isKnight?125:100;
        if(state.gold<cost){notify(`เหรียญไม่พอ! ต้องใช้ ${cost} เหรียญ`);return}
        state.gold-=cost;
        const tower={id:Date.now()+Math.random(),type:state.buildType,x:pad.x,y:pad.y,drawX:pad.x,drawY:pad.y,level:1,invested:cost,damage:isWind?18:isRunner?42:isKnight?31:22,range:isWind?185:isRunner?210:isKnight?112:145,rate:isWind?.5:isRunner?1.25:isKnight?.72:.82,cooldown:.2,critChance:isKnight?.25:0,critMultiplier:2.2,knockbackChance:isWind?.25:0,attackAnim:0,dash:null};
        state.towers.push(tower);state.selected=tower.id;notify(isWind?"เรียกวิญญาณลมสำเร็จ!":isRunner?"วางนักวิ่งพุ่งชนสำเร็จ!":isKnight?"วางนักดาบคริติคอลสำเร็จ!":"วางผู้พิทักษ์เวทมนตร์สำเร็จ!");updateHud();
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
        if(tower.type==="knight"){tower.damage+=18;tower.range+=5;tower.rate=Math.max(.36,tower.rate-.055);tower.critChance=Math.min(.5,tower.critChance+.05)}
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
        state.wave++;state.active=true;state.autoWaveTimer=0;state.spawnLeft=6+state.wave*2;state.spawnTimer=.35;
        notify(`คลื่นที่ ${state.wave} กำลังมา!`);updateHud();
      }
      function spawnEnemy(){
        const boss=state.wave%5===0&&state.spawnLeft===1;
        const fast=!boss&&state.spawnLeft>0&&state.spawnLeft%4===0;
        const hp=(34+state.wave*13)*(boss?5:fast?0.72:1);
        const baseSpeed=48+Math.min(24,state.wave*1.5);
        state.enemies.push({x:path[0].x,y:path[0].y,hp,maxHp:hp,speed:boss?37:fast?baseSpeed*2.15:baseSpeed,progress:0,boss,fast,radius:boss?17:fast?11:12});
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
        }
        const escaped=state.enemies.filter(e=>e.progress>=path.length-1);
        if(escaped.length){state.enemies=state.enemies.filter(e=>e.progress<path.length-1);state.lives=Math.max(0,state.lives-escaped.length)}
        for(const tower of state.towers){
          tower.attackAnim=Math.max(0,tower.attackAnim-dt);
          tower.cooldown=Math.max(0,tower.cooldown-dt);
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
              state.effects.push({type:"impact",x:hitX,y:hitY,duration:.25,life:.25});
              state.effects.push({type:"text",x:hitX,y:hitY-19,text:`-${shot.damage}`,duration:.6,life:.6,color:"#e7f6ff"});
              for(let i=0;i<5;i++)state.effects.push({type:"spark",x:hitX,y:hitY,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,duration:.25,life:.25,color:"#8deaff"});
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
          state.active=false;const reward=35+state.wave*5;state.gold+=reward;
          const upgraded=autoUpgradeTowers();
          state.autoWaveTimer=state.autoWave?state.autoWaveDelay:0;
          notify(`ผ่านคลื่นที่ ${state.wave}! รับโบนัส ${reward} เหรียญ${upgraded?` · อัปเกรด ${upgraded} ครั้ง`:""}`);updateHud();
        }
        if(state.lives===0){state.over=true;document.getElementById("result-text").textContent=`ป้องกันได้ ${state.wave} คลื่น และกำจัดศัตรูไปแล้ว!`;document.getElementById("game-over").classList.add("show");updateHud()}
      }
      function roundedRect(x,y,w,h,r){
        ctx.beginPath();ctx.roundRect(x,y,w,h,r);
      }
      function draw(){
        const w=canvas.width,h=canvas.height;
        ctx.clearRect(0,0,w,h);
        ctx.fillStyle="#365849";ctx.fillRect(0,0,w,h);
        ctx.fillStyle="#ffffff08";
        for(let y=12;y<h;y+=34)for(let x=(y%2?9:23);x<w;x+=38){ctx.beginPath();ctx.arc(x,y,1.1,0,Math.PI*2);ctx.fill()}
        for(let i=0;i<12;i++){
          const x=(i*137+42)%w,y=(i*83+28)%h;
          if(path.some((p,j)=>j<path.length-1&&pointSegmentDistance(x,y,p,path[j+1])<48))continue;
          ctx.fillStyle=i%2?"#27483c":"#42654b";ctx.beginPath();ctx.arc(x,y,5+i%4,0,Math.PI*2);ctx.fill();
          ctx.fillStyle="#779062";ctx.beginPath();ctx.arc(x-2,y-2,2,0,Math.PI*2);ctx.fill();
        }
        ctx.lineCap="round";ctx.lineJoin="round";ctx.shadowColor="#f8c76a66";ctx.shadowBlur=25;ctx.strokeStyle="#493e37";ctx.lineWidth=76;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const p of path.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();ctx.shadowBlur=0;
        ctx.strokeStyle="#98734e";ctx.lineWidth=63;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const p of path.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();
        ctx.strokeStyle="#dfc38c";ctx.lineWidth=53;ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const p of path.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();
        ctx.strokeStyle="#f4dda9";ctx.lineWidth=2;ctx.setLineDash([7,17]);ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const p of path.slice(1))ctx.lineTo(p.x,p.y);ctx.stroke();ctx.setLineDash([]);
        if(pointer.inside&&pointer.x!==null&&pointer.y!==null){
          const valid=canPlaceTower(pointer.x,pointer.y),wind=state.buildType==="wind",melee=state.buildType==="knight"||state.buildType==="runner";
          const color=valid?(wind?"#8deaff":melee?"#ffad72":"#70e1bc"):"#ff7777";
          const radius=state.buildType==="wind"?185:state.buildType==="runner"?210:state.buildType==="knight"?112:145;
          ctx.fillStyle=color+"0d";ctx.beginPath();ctx.arc(pointer.x,pointer.y,radius,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle=color+"88";ctx.lineWidth=2;ctx.setLineDash([5,6]);ctx.beginPath();ctx.arc(pointer.x,pointer.y,24,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
          ctx.fillStyle=color;ctx.font="20px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(valid?"＋":"×",pointer.x,pointer.y);
        }
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.font="30px sans-serif";ctx.fillText("🏰",850,214);ctx.font="12px sans-serif";ctx.fillStyle="#fff";ctx.fillText("ปราสาท",850,292);
        ctx.font="23px sans-serif";ctx.fillText("🚩",17,89);
        for(const tower of state.towers){
          const knight=tower.type==="knight",runner=tower.type==="runner",wind=tower.type==="wind",accent=wind?"#8deaff":runner||knight?"#ffad72":"#9beeff",drawX=tower.drawX,drawY=tower.drawY;
          if(tower.id===state.selected){ctx.fillStyle=wind?"#8deaff12":runner||knight?"#ffad7212":"#70e1bc13";ctx.beginPath();ctx.arc(tower.x,tower.y,tower.range,0,Math.PI*2);ctx.fill();ctx.strokeStyle=wind?"#8deaff44":runner||knight?"#ffad7244":"#70e1bc38";ctx.lineWidth=1;ctx.stroke()}
          if(runner&&tower.dash){ctx.strokeStyle="#ffad7277";ctx.lineWidth=3;ctx.setLineDash([5,6]);ctx.beginPath();ctx.moveTo(tower.x,tower.y);ctx.lineTo(drawX,drawY);ctx.stroke();ctx.setLineDash([])}
          ctx.fillStyle="#10192377";ctx.beginPath();ctx.ellipse(drawX,drawY+15,23,9,0,0,Math.PI*2);ctx.fill();
          const base=ctx.createRadialGradient(drawX-7,drawY-8,2,drawX,drawY,26);base.addColorStop(0,wind?"#e1fcff":runner||knight?"#ffe3bd":"#ecffff");base.addColorStop(.5,wind?"#68bfd0":runner||knight?"#d58957":"#5595ad");base.addColorStop(1,wind?"#315e7b":runner||knight?"#784b3e":"#314d72");
          ctx.fillStyle=base;ctx.beginPath();ctx.arc(drawX,drawY,22,0,Math.PI*2);ctx.fill();
          ctx.strokeStyle=tower.id===state.selected?"#fff0bd":accent;ctx.lineWidth=tower.id===state.selected?3:2;ctx.stroke();
          ctx.save();ctx.translate(drawX,drawY);ctx.rotate(tower.attackAnim?-.35:0);
          ctx.font="25px sans-serif";ctx.fillStyle="#fff";ctx.fillText(wind?"🌪️":runner?"🏃":knight?"🗡️":"🧙",0,1);ctx.restore();
          ctx.fillStyle="#172236";ctx.beginPath();ctx.arc(drawX+16,drawY-17,9,0,Math.PI*2);ctx.fill();
          ctx.font="bold 10px sans-serif";ctx.fillStyle="#fff";ctx.fillText(tower.level,drawX+16,drawY-17);
          if(tower.attackAnim>0){ctx.strokeStyle=wind?"#baf5ff":runner||knight?"#fff0b8":"#9beeff";ctx.globalAlpha=tower.attackAnim/.28;ctx.lineWidth=3;ctx.beginPath();ctx.arc(drawX,drawY,28+tower.attackAnim*28,runner?-1.5:knight?-.9:-2.7,runner?1.5:knight?1.3:-1.1);ctx.stroke();ctx.globalAlpha=1}
        }
        for(const enemy of state.enemies){
          if(enemy.fast){ctx.strokeStyle="#bbf5ff99";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(enemy.x-23,enemy.y-4);ctx.lineTo(enemy.x-11,enemy.y-4);ctx.moveTo(enemy.x-20,enemy.y+3);ctx.lineTo(enemy.x-9,enemy.y+3);ctx.stroke()}
          ctx.font=enemy.boss?"30px sans-serif":"23px sans-serif";ctx.fillText(enemy.boss?"👹":enemy.fast?"🐇":"👾",enemy.x,enemy.y);
          const bw=enemy.boss?38:29,bh=4,bx=enemy.x-bw/2,by=enemy.y-enemy.radius-9;
          ctx.fillStyle="#311d26";roundedRect(bx,by,bw,bh,3);ctx.fill();
          ctx.fillStyle=enemy.boss?"#f88383":enemy.fast?"#93eaff":"#83e3a1";roundedRect(bx,by,bw*Math.max(0,enemy.hp/enemy.maxHp),bh,3);ctx.fill();
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
          }else if(effect.type==="spark"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.fillStyle=effect.color;ctx.shadowColor=effect.color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(effect.x,effect.y,2+effect.life/effect.duration*2,0,Math.PI*2);ctx.fill();
          }else if(effect.type==="text"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.fillStyle=effect.color;ctx.shadowColor="#000";ctx.shadowBlur=5;ctx.font=effect.text.startsWith("คริติคอล")?"bold 15px Kanit, sans-serif":"bold 13px Kanit, sans-serif";ctx.textAlign="center";ctx.fillText(effect.text,effect.x,effect.y);
          }else if(effect.type==="coin"){
            ctx.globalAlpha=effect.life/effect.duration;ctx.font="17px sans-serif";ctx.textAlign="center";ctx.fillText("🪙",effect.x,effect.y-25-progress*24);
          }
          ctx.restore();
        }
        for(const shot of state.shots){
          if(shot.type==="wind"){
            const angle=Math.atan2(shot.target.y-shot.y,shot.target.x-shot.x);ctx.save();ctx.translate(shot.x,shot.y);ctx.rotate(angle);
            ctx.strokeStyle="#c6f4ff";ctx.lineWidth=4;ctx.shadowColor="#67dcff";ctx.shadowBlur=17;ctx.beginPath();ctx.moveTo(-21,0);ctx.quadraticCurveTo(-9,-9,3,0);ctx.quadraticCurveTo(10,7,18,0);ctx.stroke();ctx.restore();ctx.shadowBlur=0;
          }else{ctx.fillStyle="#c6f4ff";ctx.shadowColor="#67dcff";ctx.shadowBlur=17;ctx.beginPath();ctx.arc(shot.x,shot.y,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0}
        }
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
