/* ===== Fach: Religion – Mose (Klasse 3) =====
   Nach den Arbeitsblättern „1 Die Israeliten in Ägypten“ und „3 Der Riss in Moses Leben“;
   Teil 2 „Mose wird gerettet“ ergänzt (2. Mose 2).
   Aufgabenarten: Lesetext + Frage, Lückentext, richtig/falsch, Reihenfolge.
   Lückentext und Reihenfolge sind wiederverwendbar: lueckentext(...), reihenfolge(...). */
(function(){

/* ---------- Texte ---------- */
const TEXT = {
  aegypten: { titel:"Die Israeliten in Ägypten", absaetze:[
    "Vor langer Zeit lebte das Volk der Israeliten in Ägypten. Das Volk wurde immer größer und größer.",
    "Der Pharao, der König von Ägypten, bekam Angst. Er dachte: „Wenn die Israeliten zu mächtig werden, kämpfen sie vielleicht gegen mich.“",
    "Darum mussten die Israeliten hart für ihn arbeiten. Sie holten Wasser, formten Ziegelsteine aus Lehm, schleppten schwere Lasten und bauten die Städte Pitom und Ramesse.",
    "Aber das Volk wurde trotzdem immer größer. Der Plan des Pharaos war missglückt. Da gab er einen furchtbaren Befehl: Alle neugeborenen Jungen der Israeliten sollten in den Nil geworfen werden. Die Mädchen durften am Leben bleiben." ]},
  rettung: { titel:"Mose wird gerettet", absaetze:[
    "Eine israelitische Mutter bekam einen kleinen Jungen. Drei Monate lang versteckte sie ihn zu Hause.",
    "Dann ging es nicht mehr. Sie flocht ein Körbchen aus Schilf und machte es mit Pech wasserdicht. Sie legte ihr Baby hinein und setzte das Körbchen ins Schilf am Ufer des Nils. Die große Schwester Mirjam passte von weitem auf.",
    "Da kam die Tochter des Pharaos zum Baden an den Fluss. Sie entdeckte das Körbchen. Das Baby weinte, und sie hatte Mitleid mit ihm.",
    "Mirjam lief herbei und fragte: „Soll ich eine Frau holen, die das Kind für dich versorgt?“ Sie holte die eigene Mutter. So durfte die Mutter ihr Kind noch eine Zeit lang pflegen.",
    "Als der Junge größer war, lebte er bei der Tochter des Pharaos im Palast. Sie nannte ihn Mose, denn sie sagte: „Ich habe ihn aus dem Wasser gezogen.“" ]},
  riss: { titel:"Der Riss in Moses Leben", absaetze:[
    "Mose wächst als ägyptischer Prinz im Palast auf. Er versteht sich gut mit seinem Stiefbruder Ramses.",
    "Eines Tages ist Mose auf den Baustellen in Pitom und Ramesse. Dort sieht er, wie ein ägyptischer Aufseher einen israelitischen Arbeiter misshandelt und fast tötet.",
    "Wutentbrannt läuft Mose auf den Aufseher zu und schlägt ihn tot. Danach hat Mose Angst und weiß nicht, was er tun soll. Er vergräbt den toten Aufseher im Sand.",
    "Dann flieht er in das Land Midian. Dort findet er Zuflucht bei dem Priester Jitro und seinen Töchtern.",
    "Von nun an ist alles anders: Mose kann nicht mehr als Prinz in Ägypten leben. Sein Leben hat einen Riss bekommen." ]},
};
let lastKey=null, sinceOpen=0;   // Text bei direkt folgenden Fragen zum selben Text eingeklappt zeigen
function textBox(key){ const t=TEXT[key]; const open = key!==lastKey || sinceOpen>=4; lastKey=key; sinceOpen = open? 1 : sinceOpen+1;
  return `<details class="lesetext" ${open?"open":""}><summary>📖 ${t.titel} – ${open?"Text lesen":"Text nochmal lesen (antippen)"}</summary>${t.absaetze.map(p=>`<p>${p}</p>`).join("")}</details>`; }

/* ---------- Bausteine ---------- */
// Lesefrage: [Frage, richtig, [falsch…], Erklärung]
function lesefrage(key, pool){ return function(){ const [q,a,f,ex]=pick(pool); const opts=shuffle([a,...f]);
  return {q, small:true, extra:textBox(key), type:"mc", one:opts.some(o=>o.length>14), ans:a, opts, ex}; }; }
function rf(pool){ return function(){ const [s,wahr,ex]=pick(pool);
  return {q:`Stimmt das?<br><i>„${s}“</i>`, small:true, type:"mc", ans:wahr?"richtig":"falsch", opts:["richtig","falsch"], ex}; }; }

/* Lückentext: teile = ["Text ", ["Lösung"], " Text …"], extra = Ablenkwörter */
function lueckentext(titel, teile, extra=[]){
  const loes = teile.filter(Array.isArray).map(x=>x[0]);
  const vollText = teile.map(x=>Array.isArray(x)?`<b>${x[0]}</b>`:x).join("");
  return { q:`Trage die passenden Wörter ein.`, small:true, type:"custom",
    showAns: "siehe Text unten", ex: vollText, givenText: g=>g.split("|").join(", "),
    check: g=> g===loes.join("|"),
    mount(el, submit){
      const fill=loes.map(()=>null); let act=0;
      const bank=shuffle([...loes, ...extra]).map((w,i)=>({w,i,used:false}));
      const draw=()=>{ let gi=0;
        const html=teile.map(x=>{ if(!Array.isArray(x)) return x; const i=gi++; const b=fill[i];
          return `<button class="gap ${i===act?"act":""} ${b?"full":""}" data-g="${i}">${b?esc(b.w):"&nbsp;"}</button>`; }).join("");
        el.innerHTML=`<div class="ltext">${titel?`<b>${titel}</b><br>`:""}${html}</div>
          <div class="wordbank">${bank.map(b=>`<button class="word" data-w="${b.i}" ${b.used?"disabled":""}>${esc(b.w)}</button>`).join("")}</div>
          <button class="btn wide" style="margin-top:12px;background:var(--ok);box-shadow:0 4px 0 #1f8a51" data-a="ok">✓ Fertig</button><div class="err center" id="lmsg"></div>`;
        el.querySelectorAll(".gap").forEach(g=>g.onclick=()=>{ const i=+g.dataset.g; if(fill[i]){ fill[i].used=false; fill[i]=null; } act=i; draw(); });
        el.querySelectorAll(".word").forEach(w=>w.onclick=()=>{ const b=bank[+w.dataset.w]; if(b.used) return;
          if(fill[act]) fill[act].used=false; fill[act]=b; b.used=true;
          const next=fill.findIndex(x=>!x); act= next<0? act : next; draw(); });
        el.querySelector('[data-a="ok"]').onclick=()=>{ if(fill.some(x=>!x)){ el.querySelector("#lmsg").textContent="Fülle zuerst alle Lücken."; return; }
          el.querySelectorAll(".gap").forEach((g,i)=>{ g.classList.remove("act"); g.classList.add(fill[i].w===loes[i]?"good":"badg"); });
          el.querySelectorAll("button").forEach(b=>b.disabled=true);
          submit(fill.map(x=>x.w).join("|")); };
      };
      draw(); } };
}

/* Reihenfolge: Sätze in richtiger Reihenfolge antippen */
function reihenfolge(saetze, frage="Was passiert zuerst? Tippe die Sätze in der richtigen Reihenfolge an."){
  return { q:frage, small:true, type:"custom",
    showAns: "<ol style='text-align:left;margin:6px 0'>"+saetze.map(s=>`<li>${s}</li>`).join("")+"</ol>",
    givenText: g=>g.split("|").map(i=>+i+1).join("-"),
    check: g=> g===saetze.map((_,i)=>i).join("|"),
    ex:"",
    mount(el, submit){
      const order=[]; const mix=shuffle(saetze.map((s,i)=>i));
      const draw=()=>{
        el.innerHTML=`<div class="olist">${order.map((i,k)=>`<button class="oitem" data-o="${k}"><span class="onum">${k+1}</span>${saetze[i]}</button>`).join("")||`<p class="muted center" style="margin:6px">Noch nichts ausgewählt</p>`}</div>
          <div class="opool">${mix.filter(i=>!order.includes(i)).map(i=>`<button class="opt" style="font-size:1.05rem;justify-content:flex-start;text-align:left" data-i="${i}">${saetze[i]}</button>`).join("")}</div>
          ${order.length===saetze.length?`<button class="btn wide" style="margin-top:12px;background:var(--ok);box-shadow:0 4px 0 #1f8a51" data-a="ok">✓ Fertig</button>`:""}`;
        el.querySelectorAll(".opool .opt").forEach(b=>b.onclick=()=>{ order.push(+b.dataset.i); draw(); });
        el.querySelectorAll(".oitem").forEach(b=>b.onclick=()=>{ order.splice(+b.dataset.o,1); draw(); });
        const ok=el.querySelector('[data-a="ok"]'); if(ok) ok.onclick=()=>{
          el.querySelectorAll(".oitem").forEach((b,k)=>b.classList.add(order[k]===k?"good":"badg"));
          el.querySelectorAll("button").forEach(b=>b.disabled=true); ok.remove();
          submit(order.join("|")); };
      };
      draw(); } };
}

/* ---------- Inhalte ---------- */
const F_AEG = [
  ["Wer war der König von Ägypten?", "der Pharao", ["Mose","Ramses der Bauer","der Priester Jitro"], "Der König von Ägypten hieß Pharao."],
  ["Warum bekam der Pharao Angst?", "Das Volk der Israeliten wurde immer größer.", ["Er hatte kein Wasser mehr.","Die Israeliten wollten wegziehen.","Er hatte sich im Palast verlaufen."], "Die Israeliten wurden immer mehr – der Pharao fürchtete, dass sie gegen ihn kämpfen."],
  ["Welche Städte mussten die Israeliten bauen?", "Pitom und Ramesse", ["Berlin und Hamburg","Midian und Jitro","Nil und Schilf"], "Die Israeliten bauten die Städte Pitom und Ramesse."],
  ["Woraus formten die Israeliten Ziegelsteine?", "aus Lehm", ["aus Holz","aus Gold","aus Schnee"], "Die Ziegel wurden aus Lehm geformt."],
  ["Was befahl der Pharao am Ende?", "Neugeborene Jungen sollten in den Nil geworfen werden.", ["Alle sollten ein Fest feiern.","Die Israeliten durften nach Hause gehen.","Alle Mädchen sollten im Palast wohnen."], "Das war der neue, furchtbare Befehl des Pharaos."],
  ["Was durfte nach dem Befehl mit den Mädchen geschehen?", "Sie durften am Leben bleiben.", ["Sie mussten auch in den Nil.","Sie mussten Städte bauen.","Sie wurden Prinzessinnen."], "Nur die Jungen waren vom Befehl betroffen – die Mädchen durften leben."],
  ["Warum gab der Pharao den neuen Befehl?", "Sein Plan war missglückt – das Volk wurde trotzdem größer.", ["Er war gerade gut gelaunt.","Die Israeliten hatten ihn darum gebeten.","Der Nil hatte zu wenig Wasser."], "Trotz der harten Arbeit wurde das Volk immer größer."],
];
const RF_AEG = [
  ["Die Israeliten lebten in Ägypten.", true, "Ja, das Volk der Israeliten lebte in Ägypten."],
  ["Der Pharao freute sich, dass die Israeliten immer mehr wurden.", false, "Nein, er bekam Angst."],
  ["Die Israeliten mussten hart für den Pharao arbeiten.", true, "Ja, sie mussten Städte bauen und Ziegel formen."],
  ["Die Israeliten bauten die Städte Pitom und Ramesse.", true, "Richtig."],
  ["Nach der harten Arbeit wurde das Volk kleiner.", false, "Nein, es wurde trotzdem immer größer."],
  ["Der Pharao ist der König von Ägypten.", true, "Richtig."],
];
const ARBEIT_JA = ["Wasser holen","Ziegelsteine aus Lehm formen","schwere Lasten tragen","Städte bauen","Steine schleppen"];
const ARBEIT_NEIN = ["im Palast feiern","Fußball spielen","im Nil baden gehen","Geschenke auspacken","Bücher lesen"];

const F_RET = [
  ["Wie lange versteckte die Mutter ihr Baby zu Hause?", "drei Monate", ["drei Tage","drei Jahre","eine Stunde"], "Drei Monate lang versteckte sie ihren Sohn."],
  ["Woraus war das Körbchen gemacht?", "aus Schilf", ["aus Eisen","aus Lehm","aus Plastik"], "Die Mutter flocht das Körbchen aus Schilf."],
  ["Warum ging das Körbchen nicht unter?", "Es war mit Pech wasserdicht gemacht.", ["Es war aus Gold.","Mirjam hielt es fest.","Der Nil war ausgetrocknet."], "Mit Pech wurde das Körbchen wasserdicht."],
  ["Wer passte von weitem auf das Baby auf?", "Mirjam, die große Schwester", ["der Pharao","ein Aufseher","Ramses"], "Die Schwester Mirjam passte auf."],
  ["Wer fand das Körbchen?", "die Tochter des Pharaos", ["der Pharao selbst","ein Fischer","Jitro"], "Die Tochter des Pharaos kam zum Baden und fand das Körbchen."],
  ["Was fühlte die Tochter des Pharaos, als das Baby weinte?", "Sie hatte Mitleid.", ["Sie war wütend.","Sie lachte es aus.","Sie hatte Angst vor ihm."], "Sie hatte Mitleid mit dem weinenden Kind."],
  ["Wen holte Mirjam, um das Baby zu versorgen?", "die eigene Mutter", ["die Tochter des Pharaos","eine Ägypterin aus dem Palast","den Priester"], "Mirjam holte geschickt die eigene Mutter."],
  ["Was bedeutet der Name Mose?", "Ich habe ihn aus dem Wasser gezogen.", ["Der König ist stark.","Kleiner Fisch.","Der Nil ist lang."], "Die Tochter des Pharaos sagte: „Ich habe ihn aus dem Wasser gezogen.“"],
  ["Wo wuchs Mose später auf?", "im Palast des Pharaos", ["in Midian","im Schilf am Nil","auf einer Baustelle"], "Er lebte bei der Tochter des Pharaos im Palast."],
];
const RF_RET = [
  ["Die Mutter setzte ihr Baby in einem Körbchen auf den Nil.", true, "Ja – ins Schilf am Ufer des Nils."],
  ["Der Pharao selbst fand das Körbchen.", false, "Nein, es war seine Tochter."],
  ["Mirjam ist die große Schwester von Mose.", true, "Richtig."],
  ["Die Mutter durfte ihr Kind noch eine Zeit lang pflegen.", true, "Ja, Mirjam hatte sie geholt."],
  ["Mose bedeutet: Ich habe ihn aus dem Feuer geholt.", false, "Nein: „Ich habe ihn aus dem Wasser gezogen.“"],
];

const F_RISS = [
  ["Wo wächst Mose auf?", "im Palast als ägyptischer Prinz", ["auf einer Baustelle","in Midian","bei den Fischern am Nil"], "Mose wächst als ägyptischer Prinz im Palast auf."],
  ["Wie heißt der Stiefbruder von Mose?", "Ramses", ["Jitro","Pitom","Mirjam"], "Mose versteht sich gut mit seinem Stiefbruder Ramses."],
  ["Was sieht Mose auf der Baustelle?", "Ein Aufseher misshandelt einen israelitischen Arbeiter.", ["Ein Arbeiter feiert Geburtstag.","Der Pharao baut selbst mit.","Ein Körbchen schwimmt im Nil."], "Ein ägyptischer Aufseher misshandelt einen Israeliten und tötet ihn fast."],
  ["Wohin flieht Mose?", "in das Land Midian", ["zurück in den Palast","nach Pitom","in den Nil"], "Mose flieht in das Land Midian."],
  ["Bei wem findet Mose Zuflucht?", "bei dem Priester Jitro und seinen Töchtern", ["bei Ramses","beim Pharao","bei dem Aufseher"], "In Midian findet er Zuflucht bei Jitro."],
  ["Was macht Mose mit dem toten Aufseher?", "Er vergräbt ihn im Sand.", ["Er bringt ihn zum Pharao.","Er wirft ihn in den Nil.","Er erzählt es allen."], "Mose hat Angst und vergräbt den Aufseher im Sand."],
  ["Was bedeutet der „Riss“ in Moses Leben?", "Sein Leben ändert sich plötzlich – er kann nicht mehr Prinz in Ägypten sein.", ["Sein Gewand ist kaputt.","Er hat sich am Bein verletzt.","Der Palast hat eine Mauer mit einem Loch."], "Nach der Tat muss Mose fliehen. Sein altes Leben als Prinz ist vorbei."],
];
const RF_RISS = [
  ["Mose versteht sich gut mit Ramses.", true, "Ja, die beiden sind Stiefbrüder und verstehen sich gut."],
  ["Mose freut sich über das, was er getan hat.", false, "Nein, er hat Angst und weiß nicht, was er tun soll."],
  ["Mose flieht in das Land Midian.", true, "Richtig."],
  ["Mose bleibt danach als Prinz im Palast.", false, "Nein, er muss fliehen – das ist der Riss in seinem Leben."],
  ["Jitro ist ein Priester in Midian.", true, "Richtig."],
];
const GEFUEHL = [
  ["„Wieso habe ich das getan?“", "Er bereut es.", ["Er ist stolz.","Er ist fröhlich.","Ihm ist langweilig."]],
  ["„Ich fühle mich so schuldig.“", "Er fühlt sich schuldig.", ["Er fühlt sich wie ein Held.","Er ist müde.","Er ist hungrig."]],
  ["„Was soll ich nur tun?“", "Er ist ratlos und hat Angst.", ["Er hat einen tollen Plan.","Er freut sich auf morgen.","Er ist wütend auf Ramses."]],
];

const TOPICS = [
{ id:"rel_aegypten", name:"Die Israeliten in Ägypten", icon:"🧱", gens:[
  {sub:"lesen", label:"Text lesen und Fragen beantworten", w:4, f:lesefrage("aegypten",F_AEG)},
  {sub:"luecke", label:"Lückentext", w:3, f(){ return pick([
     ()=>lueckentext("", ["Das Volk der Israeliten wurde immer größer und ",["größer"],". Daher befahl der Pharao zunächst, dass die ",["Israeliten"]," in den Städten Pitom und Ramesse arbeiten sollten. Der Pharao hatte Angst, dass die Israeliten mächtig werden und gegen ihn ",["kämpfen"]," könnten. Da das Vorhaben des Pharaos aber ",["missglückt"]," war, gab er einen neuen, furchtbaren Befehl."]),
     ()=>lueckentext("Der Befehl des Pharaos:", ["Alle neugeborenen ",["Jungen"]," der Israeliten sollen in den ",["Nil"]," geworfen werden. Die ",["Mädchen"]," dürfen am Leben bleiben."], ["Pitom"]),
     ()=>lueckentext("", ["Der ",["Pharao"]," war der König von Ägypten. Die Israeliten mussten Ziegelsteine aus ",["Lehm"]," formen und die Städte Pitom und ",["Ramesse"]," bauen."], ["Schilf"]),
   ])(); }},
  {sub:"arbeit", label:"Welche Arbeiten mussten sie machen?", w:2, f(){ const ja=Math.random()<.5;
     if(ja){ const a=pick(ARBEIT_JA); return {q:"Welche Arbeit mussten die Israeliten für den Pharao machen?", small:true, type:"mc", one:true, ans:a, opts:shuffle([a,...shuffle(ARBEIT_NEIN).slice(0,3)]), ex:"Die Israeliten holten Wasser, formten Ziegel aus Lehm, trugen schwere Lasten und bauten Städte."}; }
     const n=pick(ARBEIT_NEIN); return {q:"Welche Arbeit mussten die Israeliten <u>nicht</u> machen?", small:true, type:"mc", one:true, ans:n, opts:shuffle([n,...shuffle(ARBEIT_JA).slice(0,3)]), ex:"Feiern oder spielen durften sie nicht – sie mussten schwer arbeiten."}; }},
  {sub:"rf", label:"Richtig oder falsch?", w:2, f:rf(RF_AEG)},
  {sub:"ordnen", label:"Geschichte ordnen", w:1, f(){ return reihenfolge([
     "Die Israeliten leben in Ägypten und werden immer mehr.",
     "Der Pharao bekommt Angst.",
     "Die Israeliten müssen hart arbeiten und Städte bauen.",
     "Der Pharao gibt einen furchtbaren Befehl." ]); }},
]},
{ id:"rel_rettung", name:"Mose wird gerettet", icon:"🧺", gens:[
  {sub:"lesen", label:"Text lesen und Fragen beantworten", w:4, f:lesefrage("rettung",F_RET)},
  {sub:"luecke", label:"Lückentext", w:3, f(){ return pick([
     ()=>lueckentext("", ["Die Mutter legte ihr Baby in ein ",["Körbchen"]," aus Schilf. Die große Schwester ",["Mirjam"]," passte von weitem auf. Die ",["Tochter"]," des Pharaos fand das Kind. Sie nannte es ",["Mose"],", denn sie hatte es aus dem ",["Wasser"]," gezogen."], ["Ramses"]),
     ()=>lueckentext("", ["Drei ",["Monate"]," lang versteckte die Mutter ihr Kind. Das Körbchen machte sie mit ",["Pech"]," wasserdicht. Die Tochter des Pharaos hatte ",["Mitleid"]," mit dem weinenden Baby."], ["Angst"]),
   ])(); }},
  {sub:"rf", label:"Richtig oder falsch?", w:2, f:rf(RF_RET)},
  {sub:"ordnen", label:"Geschichte ordnen", w:2, f(){ return reihenfolge([
     "Die Mutter versteckt ihr Baby drei Monate lang.",
     "Sie legt das Baby in ein Körbchen ins Schilf am Nil.",
     "Die Tochter des Pharaos findet das Körbchen.",
     "Mirjam holt die eigene Mutter.",
     "Mose wächst im Palast auf." ]); }},
]},
{ id:"rel_riss", name:"Der Riss in Moses Leben", icon:"⚡", gens:[
  {sub:"lesen", label:"Text lesen und Fragen beantworten", w:4, f:lesefrage("riss",F_RISS)},
  {sub:"luecke", label:"Lückentext", w:3, f(){ return lueckentext("", ["Mose wächst als ägyptischer ",["Prinz"]," im Palast auf. Sein Stiefbruder heißt ",["Ramses"],". Auf der Baustelle sieht Mose, wie ein ",["Aufseher"]," einen israelitischen Arbeiter misshandelt. Danach flieht Mose in das Land ",["Midian"],". Dort findet er Zuflucht bei dem Priester ",["Jitro"],"."], ["Mirjam"]); }},
  {sub:"gefuehl", label:"Wie fühlt sich Mose?", w:2, f(){ const [s,a,o]=pick(GEFUEHL);
     return {q:`Mose denkt nach der Tat:<br><i>${s}</i><br>Wie fühlt er sich?`, small:true, type:"mc", one:true, ans:a, opts:shuffle([a,...o]), ex:"Mose hat Angst, er bereut seine Tat und weiß nicht, wie es weitergehen soll."}; }},
  {sub:"rf", label:"Richtig oder falsch?", w:2, f:rf(RF_RISS)},
  {sub:"ordnen", label:"Geschichte ordnen", w:1, f(){ return reihenfolge([
     "Mose wächst als Prinz im Palast auf.",
     "Mose sieht, wie ein Aufseher einen Arbeiter misshandelt.",
     "Mose schlägt den Aufseher tot und vergräbt ihn im Sand.",
     "Mose flieht nach Midian zu Jitro." ]); }},
]},
{ id:"rel_ganz", name:"Die ganze Geschichte", icon:"📜", gens:[
  {sub:"ordnen", label:"Ganze Geschichte ordnen", w:3, f(){ const alle=[
     "Die Israeliten müssen für den Pharao Städte bauen.",
     "Der Pharao befiehlt, die Jungen in den Nil zu werfen.",
     "Moses Mutter legt ihn in ein Körbchen auf den Nil.",
     "Die Tochter des Pharaos findet Mose.",
     "Mose wächst als Prinz im Palast auf.",
     "Mose schlägt einen Aufseher tot.",
     "Mose flieht nach Midian." ];
     const start=r(0,alle.length-5); return reihenfolge(alle.slice(start,start+5)); }},
  {sub:"wer", label:"Wer ist das?", w:3, f(){ const P=[["der König von Ägypten","Pharao"],["die große Schwester von Mose","Mirjam"],["der Stiefbruder von Mose","Ramses"],["der Priester in Midian","Jitro"],["sie fand das Körbchen im Schilf","Tochter des Pharaos"],["wurde aus dem Wasser gezogen","Mose"]];
     const [d,a]=pick(P); return {q:`Wer ist das?<br><i>${d}</i>`, small:true, type:"mc", ans:a, opts:shuffle([a,...shuffle(P.map(x=>x[1]).filter(x=>x!==a)).slice(0,3)]), ex:`${d.charAt(0).toUpperCase()+d.slice(1)}: ${a}.`}; }},
  {sub:"wo", label:"Wo passiert das?", w:2, f(){ const O=[["Hier mussten die Israeliten Städte bauen.","Pitom und Ramesse"],["Hier wurde das Körbchen ins Schilf gesetzt.","am Nil"],["Hier wuchs Mose als Prinz auf.","im Palast"],["Hierhin floh Mose.","Midian"]];
     const [d,a]=pick(O); return {q:`Wo passiert das?<br><i>${d}</i>`, small:true, type:"mc", ans:a, opts:shuffle(O.map(x=>x[1])), ex:`${a}.`}; }},
  {sub:"mix", label:"Fragen zu allen Texten", w:3, f(){ return pick([lesefrage("aegypten",F_AEG),lesefrage("rettung",F_RET),lesefrage("riss",F_RISS)])(); }},
]},
];

registerFach({ id:"religion", name:"Religion", icon:"🕊️", color:"#2fb36d", info:"Mose und der Auszug aus Ägypten", topics:TOPICS });
})();
