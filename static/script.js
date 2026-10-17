let tickets=[],current=null,selectedHyp=null,xp=0,rep=0;
const $=id=>document.getElementById(id);
const esc=x=>String(x).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");

async function load(){
 tickets=await (await fetch("/api/tickets")).json();
 $("count").textContent=tickets.length;
 renderTickets();
 if(tickets.length) openTicket(tickets[0].id);
}

function renderTickets(){
 const search=$("search").value.toLowerCase();
 $("tickets").innerHTML=tickets
  .filter(t=>(t.title+" "+t.area+" "+t.id).toLowerCase().includes(search))
  .map(t=>`<button class="t ${current?.id===t.id?"active":""}" data-id="${t.id}" onclick="openTicket('${t.id}')">
    <small>${t.id} · ${esc(t.area)} · ${"★".repeat(t.difficulty)}</small>
    <b>${esc(t.title)}</b>
    <span>${esc(t.user)} · ${esc(t.department)}</span>
  </button>`).join("");
}

async function openTicket(id){
 current=await (await fetch("/api/tickets/"+id)).json();
 selectedHyp=null;
 renderTickets();

 $("empty").classList.add("hidden");
 $("ticket").classList.remove("hidden");
 $("id").textContent=current.id;
 $("title").textContent=current.title;
 $("meta").textContent=`${current.area} · ${current.department} · ${current.priority}`;
 $("difficulty").textContent="★".repeat(current.difficulty);
 $("user").textContent=current.user;
 $("dept").textContent=current.department;
 $("avatar").textContent=current.user.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
 $("description").textContent=current.description;

 $("symptoms").innerHTML=current.symptoms.map(x=>`<li>${esc(x)}</li>`).join("");

 $("questions").innerHTML=current.questions.map(q=>`
   <button class="q" onclick="this.classList.toggle('open')">
     <b>${esc(q.question)}</b>
     <div class="answer"><strong>User:</strong> ${esc(q.answer)}
       <div class="why">Why: ${esc(q.why)}</div>
     </div>
   </button>`).join("");

 $("tools").innerHTML=Object.entries(current.tools).map(([id,t])=>`
   <button class="tool" onclick="runTool('${id}')">
     <b>${esc(t.name)}</b><span>${esc(t.description)}</span>
   </button>`).join("");

 $("hypotheses").innerHTML=current.hypotheses.map(h=>`
   <button class="hyp" id="hyp-${h.id}" onclick="chooseHyp('${h.id}')">
     <b>${esc(h.name)}</b>
   </button>`).join("");

 $("evidence").className="evidence hidden";
 $("feedback").className="feedback hidden";
 $("reasoning").value="";
}

function chooseHyp(id){
 selectedHyp=id;
 document.querySelectorAll(".hyp").forEach(x=>x.classList.remove("selected"));
 $("hyp-"+id).classList.add("selected");
}

async function runTool(id){
 const d=await (await fetch(`/api/tickets/${current.id}/tools/${id}`)).json();
 const e=$("evidence");
 e.className="evidence";
 e.innerHTML=`<pre>${esc(d.output)}</pre><div><b>Why this matters:</b> ${esc(d.why)}</div>`;
}

async function submitCase(){
 if(!selectedHyp){alert("Choose a hypothesis first.");return;}
 const reasoning=$("reasoning").value.trim();
 if(!reasoning){alert("Explain your reasoning before submitting.");return;}

 const d=await (await fetch(`/api/tickets/${current.id}/submit`,{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({hypothesis:selectedHyp,reasoning})
 })).json();

 xp=Math.max(0,xp+d.score);
 rep+=d.correct?d.score:Math.min(0,d.score);
 updateStats();

 const f=$("feedback");
 f.className="feedback "+(d.correct?"good":"bad");
 f.innerHTML=`<b>${d.correct?"✓ Diagnosis correct":"✕ Diagnosis incorrect"}</b><br>
   ${esc(d.feedback)}
   <div class="coach">${esc(d.coach)}<br><br><b>Score:</b> ${d.score>0?"+":""}${d.score} XP</div>`;
}

function updateStats(){
 $("xp").textContent=xp;
 $("rep").textContent=rep;
 $("level").textContent=Math.floor(xp/250)+1;
}

load();
