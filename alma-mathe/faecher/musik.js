/* ===== Fach: Musik – Die Schrift der Musik (Klasse 3) =====
   Inhalte nach dem Arbeitsblatt „Die Schrift der Musik“ / „Übungsaufgaben“:
   Notenlinien, Notenschlüssel, Taktangabe, Taktstrich, Takt, Betonung der 1,
   Notenwerte (Ganze, Halbe, Viertel, Achtel), Pausen, hoch/tief.
   Noten werden als SVG gezeichnet (Funktion staff). */
(function(){
const G = 12;                 // Abstand der Notenlinien
const Y0 = 46;                // y der obersten Linie
const INK = "#2b2340", ORANGE = "#ff8a3d";
const yOf = p => Y0 + 4*G - p*G/2;   // p=0 unterste Linie, p=1 Zwischenraum darüber, …, p=8 oberste Linie
const DUR = {w:8, h:4, q:2, e:1};    // Dauer in Achteln
const NAME = {w:"Ganze", h:"Halbe", q:"Viertel", e:"Achtel"};
const NAME_ART = {w:"eine Ganze", h:"eine Halbe", q:"eine Viertel", e:"eine Achtel"};
const ZAHLWORT = ["null","eins","zwei","drei","vier","fünf","sechs","sieben","acht"];
const TAKTNAME = {2:"Zwei-Viertel-Takt", 3:"Drei-Viertel-Takt", 4:"Vier-Viertel-Takt"};

/* --- Zeichenbausteine --- */
function clefSVG(x){
  return `<g class="ink-s" transform="translate(${x},${Y0})" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round">
    <path d="M14 66 C 15 40 21 12 18 -8 C 16 -16 8 -8 10 3 C 12 14 27 20 27 34 C 27 47 12 50 6 42 C 0 34 8 24 16 26 C 23 28 22 38 15 38"/>
    <path d="M14 66 C 13 72 5 72 5 66" /><circle cx="6.5" cy="65" r="3.2" fill="${INK}" stroke="none"/></g>`;
}
function timeSVG(x, top, bottom){
  return `<g class="ink" fill="${INK}" font-family="Georgia,'Times New Roman',serif" font-weight="700" font-size="27" text-anchor="middle">
    <text x="${x}" y="${Y0+22}">${top}</text><text x="${x}" y="${Y0+46}">${bottom}</text></g>`;
}
function noteSVG(x, p, v, color){
  const c = color||INK, y = yOf(p);
  let s = "";
  // Hilfslinien
  for(let lp=-2; lp>=p; lp-=2) s += `<line x1="${x-12}" y1="${yOf(lp)}" x2="${x+12}" y2="${yOf(lp)}" stroke="${c}" stroke-width="2"/>`;
  for(let lp=10; lp<=p; lp+=2) s += `<line x1="${x-12}" y1="${yOf(lp)}" x2="${x+12}" y2="${yOf(lp)}" stroke="${c}" stroke-width="2"/>`;
  const hollow = (v==="w"||v==="h");
  const rx = v==="w"?8.2:7.2;
  s += hollow
    ? `<ellipse class="ink-s" cx="${x}" cy="${y}" rx="${rx}" ry="5.4" transform="rotate(-20 ${x} ${y})" fill="#fff" stroke="${c}" stroke-width="2.6"/>`
    : `<ellipse class="ink" cx="${x}" cy="${y}" rx="${rx}" ry="5.4" transform="rotate(-20 ${x} ${y})" fill="${c}" stroke="${c}" stroke-width="1"/>`;
  if(v!=="w"){
    const up = p < 4, sx = up? x+6.6 : x-6.6, sy = up? y-3.4*G : y+3.4*G;
    s += `<line class="ink-s" x1="${sx}" y1="${y}" x2="${sx}" y2="${sy}" stroke="${c}" stroke-width="2.2"/>`;
    if(v==="e") s += up
      ? `<path class="ink-s" d="M${sx} ${sy} C ${sx+2} ${sy+10} ${sx+13} ${sy+12} ${sx+9} ${sy+26}" fill="none" stroke="${c}" stroke-width="2.6"/>`
      : `<path class="ink-s" d="M${sx} ${sy} C ${sx+2} ${sy-10} ${sx+13} ${sy-12} ${sx+9} ${sy-26}" fill="none" stroke="${c}" stroke-width="2.6"/>`;
  }
  return s;
}
function restSVG(x, v){
  if(v==="w") return `<rect class="ink" x="${x-8}" y="${Y0+G}" width="16" height="6" fill="${INK}"/>`;
  return `<path class="ink-s" d="M${x-3} ${Y0+6} L${x+5} ${Y0+16} L${x-2} ${Y0+25} L${x+6} ${Y0+34} C ${x-4} ${Y0+30} ${x-6} ${Y0+40} ${x+1} ${Y0+45}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function arrowSVG(x, tipY){ return `<path d="M${x} ${tipY} l-10 -14 h7 v-16 h6 v16 h7 z" fill="${ORANGE}"/>`; }

/* Notenzeile zeichnen.
   items: {k:"n", v:"q", p:3} Note · {k:"r", v:"q"|"w"} Pause · {k:"bar"} Taktstrich · {k:"end"} Schlussstrich
   opt: clef (Standard true), time:[3,4], arrow:"clef"|"time"|Index, tap:"items"|"parts", mark:[von,bis] Bereich, labels:[...], scale */
function staff(items, opt={}){
  const parts = []; let x = 8;
  const clef = opt.clef!==false;
  if(clef){ parts.push({k:"clef", x, w:36}); x += 38; }
  if(opt.time){ parts.push({k:"time", x:x+10, w:26}); x += 30; }
  x += 8;
  items.forEach((it,i)=>{
    const w = it.k==="n" ? (it.v==="w"?46:40) : it.k==="r" ? 36 : 20;
    parts.push({...it, x: x + (it.k==="bar"||it.k==="end"?6:w/2), w, i}); x += w;
  });
  const W = Math.max(x+10, opt.minW||0), H = opt.h||150;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="${Math.round(W*(opt.scale||1.6))}" style="max-width:100%">`;
  if(opt.mark){ const a=parts.find(p=>p.i===opt.mark[0]), b=parts.find(p=>p.i===opt.mark[1]);
    s += `<rect x="${a.x+3}" y="${Y0-14}" width="${b.x-a.x-6}" height="${4*G+28}" rx="8" fill="#ffd36b" opacity=".55"/>`; }
  for(let i=0;i<5;i++) s += `<line x1="4" y1="${Y0+i*G}" x2="${W-4}" y2="${Y0+i*G}" stroke="${INK}" stroke-width="1.6"/>`;
  const wrapTap = (key, svg, x0, w) => `<g class="tapme" data-v="${esc(key)}"><rect class="hit" x="${x0}" y="0" width="${w}" height="${H-20}"/>${svg}</g>`;
  parts.forEach(p=>{
    let g = "";
    if(p.k==="clef") g = clefSVG(p.x);
    else if(p.k==="time") g = timeSVG(p.x, opt.time[0], opt.time[1]);
    else if(p.k==="n") g = noteSVG(p.x, p.p, p.v, p.color);
    else if(p.k==="r") g = restSVG(p.x, p.v);
    else if(p.k==="bar") g = `<line class="ink-s" x1="${p.x}" y1="${Y0}" x2="${p.x}" y2="${Y0+4*G}" stroke="${INK}" stroke-width="2.2"/>`;
    else if(p.k==="end") g = `<line x1="${p.x-4}" y1="${Y0}" x2="${p.x-4}" y2="${Y0+4*G}" stroke="${INK}" stroke-width="1.8"/><line x1="${p.x+1}" y1="${Y0}" x2="${p.x+1}" y2="${Y0+4*G}" stroke="${INK}" stroke-width="4.5"/>`;
    if(p.label) g += `<text x="${p.x}" y="${Y0+4*G+48}" text-anchor="middle" font-size="18" font-weight="700" fill="${ORANGE}">${p.label}</text>`;
    if(opt.tap==="items" && p.k==="n") g = wrapTap(p.i, g, p.x-p.w/2, p.w);
    else if(opt.tap==="parts" && p.tapKey) g = wrapTap(p.tapKey, g, p.x-p.w/2, p.w);
    else if(opt.tap==="parts" && p.k==="clef") g = wrapTap("Notenschlüssel", g, p.x-4, p.w);
    else if(opt.tap==="parts" && p.k==="time") g = wrapTap("Taktangabe", g, p.x-14, 28);
    s += g;
  });
  if(opt.arrow!==undefined){
    const p = opt.arrow==="clef"? parts.find(q=>q.k==="clef") : opt.arrow==="time"? parts.find(q=>q.k==="time") : parts.find(q=>q.i===opt.arrow);
    const ax = p.k==="clef"? p.x+16 : p.x;
    s += arrowSVG(ax, p.k==="clef"? Y0-16 : Y0-6);
  }
  return s + "</svg>";
}
/* einzelnes Notenzeichen ohne Linien (für Antwortknöpfe und große Darstellung) */
function symbol(v, kind="n", scale=1){
  const w=44, h=90; let g;
  if(kind==="n"){ const x=w/2-3, y=64; const fake = {w:"w",h:"h",q:"q",e:"e"}[v];
    g = (()=>{ // Note ohne Notenlinien an fester Stelle
      const hollow = fake==="w"||fake==="h"; let s = hollow
        ? `<ellipse cx="${x}" cy="${y}" rx="${fake==="w"?9:8}" ry="6" transform="rotate(-20 ${x} ${y})" fill="none" stroke="${INK}" stroke-width="3"/>`
        : `<ellipse cx="${x}" cy="${y}" rx="8" ry="6" transform="rotate(-20 ${x} ${y})" fill="${INK}"/>`;
      if(fake!=="w"){ s += `<line x1="${x+7.4}" y1="${y}" x2="${x+7.4}" y2="${y-46}" stroke="${INK}" stroke-width="2.6"/>`;
        if(fake==="e") s += `<path d="M${x+7.4} ${y-46} C ${x+10} ${y-34} ${x+22} ${y-32} ${x+17} ${y-16}" fill="none" stroke="${INK}" stroke-width="3"/>`; }
      return s; })();
  } else {
    g = v==="w" ? `<line x1="6" y1="40" x2="38" y2="40" stroke="${INK}" stroke-width="2"/><rect x="12" y="40" width="20" height="8" fill="${INK}"/>`
                : `<path d="M19 18 L29 32 L20 44 L30 58 C 18 52 16 66 24 72" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 ${w} ${h}" width="${Math.round(w*scale)}" height="${Math.round(h*scale)}">${g}</svg>`;
}
const frac = (a,b)=> `<span style="display:inline-flex;flex-direction:column;align-items:center;line-height:.95;font-family:Georgia,serif;font-size:1.7rem;font-weight:700">${a}<span>${b}</span></span>`;

/* zufällige Notenfolge mit genau `cap` Achteln (ohne Ganze, wenn cap<8) */
function fillMeasure(cap, allowE=true){
  for(;;){ const seq=[]; let left=cap;
    while(left>0){ const c=["h","q","q","e"].filter(v=>DUR[v]<=left && (allowE||v!=="e")); if(cap===8&&left===8&&Math.random()<.12){ seq.push("w"); left=0; break; }
      const v=pick(c); if(v==="e"){ if(left<2) { seq.push("e"); left-=1; continue; } seq.push("e","e"); left-=2; } else { seq.push(v); left-=DUR[v]; } }
    if(left===0) return seq; }
}
const posFor = () => pick([1,2,3,4,5,6,7]);
const sumDur = seq => seq.reduce((s,v)=>s+DUR[v],0);
const listNames = seq => { // "eine Achtel, drei Viertel, eine Achtel"
  const out=[]; for(let i=0;i<seq.length;){ let j=i; while(j<seq.length&&seq[j]===seq[i]) j++; const n=j-i;
    out.push(n===1? NAME_ART[seq[i]] : `${["","eine","zwei","drei","vier","fünf","sechs","sieben","acht"][n]} ${NAME[seq[i]]}`); i=j; }
  return out.length>1? out.slice(0,-1).join(", ")+" und "+out[out.length-1] : out[0]; };

/* ===== Themen ===== */
const FRAGEN = [
  ["Wie viele Linien hat die Notenlineatur?", "5", ["3","4","5","6"], "Noten stehen auf einer Lineatur aus fünf Linien."],
  ["Was steht ganz am Anfang der Notenlinien?", "der Notenschlüssel", ["der Notenschlüssel","ein Taktstrich","eine Pause","eine Achtel"], "Zu Beginn eines Liedes steht der Notenschlüssel."],
  ["Wie nennt man die zwei Zahlen nach dem Notenschlüssel?", "Taktangabe", ["Taktangabe","Taktstrich","Notenschlüssel","Pause"], "Die beiden Zahlen am Anfang heißen Taktangabe, z. B. 4/4."],
  ["Wie nennt man die senkrechten Striche auf den Notenlinien?", "Taktstriche", ["Taktstriche","Notenlinien","Notenhälse","Pausen"], "Die senkrechten Striche heißen Taktstriche."],
  ["Wie nennt man den Bereich von einem Taktstrich zum nächsten?", "Takt", ["Takt","Taktangabe","Lied","Pause"], "Ein Takt geht immer von einem Taktstrich zum nächsten."],
  ["Welche Zahl wird in einem Takt oft besonders betont?", "die 1", ["die 1","die 2","die 3","die 4"], "Man zählt 1 2 3 4 – die 1 wird oft betont."],
  ["Wo steht eine tief klingende Note?", "unten", ["unten","oben","in der Mitte","ganz am Anfang"], "Tiefe Noten stehen unten, hohe Noten weiter oben."],
  ["Wo steht eine hoch klingende Note?", "weiter oben", ["weiter oben","unten","am Taktstrich","vor dem Notenschlüssel"], "Hohe Noten stehen weiter oben."],
  ["Woran siehst du, wie lang eine Note klingt?", "an ihrem Aussehen", ["an ihrem Aussehen","an ihrer Farbe","am Notenschlüssel","an der Seitenzahl"], "Ganze, Halbe, Viertel und Achtel sehen unterschiedlich aus."],
  ["Wie erfährst du, wie ein Lied klingt?", "mit Hilfe von Noten", ["mit Hilfe von Noten","mit Hilfe von Zahlen","mit dem Lineal","gar nicht"], "Wie ein Lied klingt, erfährst du mit Hilfe von Noten."],
  ["Was ist außer Noten noch auf den Notenlinien eingezeichnet?", "Pausen", ["Pausen","Buchstaben","Bilder","Rechenzeichen"], "Außer Noten sind auch Pausen eingezeichnet."],
];
function beispielZeile(){ // Notenschlüssel, 4/4, 2 Takte mit einer Pause
  const m1 = fillMeasure(8,false).map(v=>({k:"n",v,p:posFor()}));
  const m2 = [{k:"n",v:"q",p:posFor()},{k:"r",v:"q"},{k:"n",v:"h",p:posFor()}];
  return [...m1,{k:"bar"},...m2,{k:"end"}];
}

const TOPICS = [
{ id:"mu_zeichen", name:"Notenlinien und Zeichen", icon:"🎼", gens:[
  {sub:"fragen", label:"Fragen zur Notenschrift", w:4, f(){ const [q,a,o,ex]=pick(FRAGEN);
     return {q, small:true, type:"mc", one:o.some(x=>x.length>12), ans:a, opts:shuffle(o), ex}; }},
  {sub:"zeigen", label:"Zeichen benennen (Pfeil)", w:3, f(){
     const items=beispielZeile(); const choice=pick(["Notenschlüssel","Taktangabe","Taktstrich","Note","Pause","Takt"]);
     let opt={time:[4,4]};
     if(choice==="Notenschlüssel") opt.arrow="clef"; else if(choice==="Taktangabe") opt.arrow="time";
     else if(choice==="Taktstrich") opt.arrow=items.findIndex(x=>x.k==="bar");
     else if(choice==="Pause") opt.arrow=items.findIndex(x=>x.k==="r");
     else if(choice==="Note") opt.arrow=pick(items.map((x,i)=>x.k==="n"?i:-1).filter(i=>i>=0));
     else { const b=items.findIndex(x=>x.k==="bar"); opt.mark=[b, items.length-1]; }
     const qtext = choice==="Takt" ? "Wie heißt der gelb markierte Bereich?" : "Wie heißt das Zeichen, auf das der Pfeil zeigt?";
     return {q:qtext, small:true, extra:staff(items,opt), type:"mc", ans:choice, opts:shuffle(["Notenschlüssel","Taktangabe","Taktstrich","Note","Pause","Takt"]).filter(x=>x!==choice).slice(0,3).concat(choice).sort(()=>Math.random()-.5),
       ex: {Notenschlüssel:"Der Notenschlüssel steht ganz am Anfang.", Taktangabe:"Die zwei Zahlen nach dem Notenschlüssel heißen Taktangabe.", Taktstrich:"Der senkrechte Strich heißt Taktstrich.", Note:"Das ist eine Note.", Pause:"Das ist eine Pause – hier wird nicht gesungen oder gespielt.", Takt:"Von einem Taktstrich zum nächsten geht ein Takt."}[choice]}; }},
  {sub:"antippen", label:"Zeichen im Bild antippen", w:3, f(){
     const items=beispielZeile().map(x=> x.k==="bar"?{...x,tapKey:"Taktstrich"} : x.k==="r"?{...x,tapKey:"Pause"} : x.k==="n"?{...x,tapKey:"Note_"+Math.random()}: x);
     const choice=pick(["Notenschlüssel","Taktangabe","Taktstrich","Pause"]);
     const art={Notenschlüssel:"den Notenschlüssel",Taktangabe:"die Taktangabe",Taktstrich:"den Taktstrich",Pause:"die Pause"}[choice];
     return {q:`Tippe auf ${art}.`, small:true, extra:staff(items,{time:[4,4],tap:"parts"}), type:"tap", ans:choice, showAns:choice, givenText:v=>String(v).startsWith("Note_")?"eine Note":v,
       ex:{Notenschlüssel:"Der Notenschlüssel steht ganz vorn.",Taktangabe:"Die Taktangabe sind die zwei Zahlen nach dem Notenschlüssel.",Taktstrich:"Der Taktstrich ist der senkrechte Strich.",Pause:"Die Pause sieht aus wie ein kleiner Blitz."}[choice]}; }},
  {sub:"teile", label:"Teile einer Note", w:1, f(){
     const part=pick(["Kopf","Hals","Fähnchen"]);
     const W=120,H=150, x=50, y=118;
     const tip = {Kopf:[x-30,y,x-10,y], Hals:[x+40,y-50,x+16,y-50], Fähnchen:[x+62,y-92,x+40,y-82]}[part];
     const svg=`<svg viewBox="0 0 ${W} ${H}" width="180"><ellipse cx="${x}" cy="${y}" rx="15" ry="11" transform="rotate(-20 ${x} ${y})" fill="${INK}"/>
       <line x1="${x+13.5}" y1="${y-2}" x2="${x+13.5}" y2="${y-105}" stroke="${INK}" stroke-width="4"/>
       <path d="M${x+13.5} ${y-105} C ${x+18} ${y-84} ${x+42} ${y-80} ${x+34} ${y-50}" fill="none" stroke="${INK}" stroke-width="5"/>
       <line x1="${tip[0]}" y1="${tip[1]}" x2="${tip[2]}" y2="${tip[3]}" stroke="${ORANGE}" stroke-width="5" marker-end="url(#ah)"/>
       <defs><marker id="ah" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0 0 L6 3 L0 6 z" fill="${ORANGE}"/></marker></defs></svg>`;
     return {q:"Wie heißt der Teil der Note, auf den der Pfeil zeigt?", small:true, extra:svg, type:"mc", ans:part, opts:shuffle(["Kopf","Hals","Fähnchen"]), ex:"Eine Achtelnote hat einen Kopf, einen Hals und ein Fähnchen."}; }},
]},
{ id:"mu_werte", name:"Notenwerte: Ganze, Halbe, Viertel, Achtel", icon:"🎵", gens:[
  {sub:"erkennen", label:"Note erkennen", w:4, f(){ const v=pick(["w","h","q","e"]);
     return {q:"Wie heißt diese Note?", small:true, extra:`<div style="display:flex;justify-content:center">${symbol(v,"n",1.6)}</div>`, type:"mc", ans:NAME[v], opts:shuffle(Object.values(NAME)),
       ex:{w:"Die Ganze ist ein leerer Kreis ohne Hals.",h:"Die Halbe ist leer und hat einen Hals.",q:"Die Viertel ist ausgemalt und hat einen Hals.",e:"Die Achtel ist ausgemalt und hat ein Fähnchen."}[v]}; }},
  {sub:"finden", label:"Notenzeichen zum Namen finden", w:3, f(){ const v=pick(["w","h","q","e"]); const labels={}; ["w","h","q","e"].forEach(k=>labels[NAME[k]]=symbol(k,"n",.8));
     return {q:`Welches Zeichen ist ${NAME_ART[v]}?`, small:true, type:"mc", ans:NAME[v], opts:shuffle(Object.values(NAME)), labels, showAns:NAME[v],
       ex:{w:"Ganze: leerer Kreis, kein Hals.",h:"Halbe: leer mit Hals.",q:"Viertel: ausgemalt mit Hals.",e:"Achtel: ausgemalt mit Hals und Fähnchen."}[v]}; }},
  {sub:"antippen", label:"Note in der Notenzeile antippen", w:2, f(){ const vs=shuffle(["w","h","q","e"]); const target=pick(vs);
     const items=vs.map(v=>({k:"n",v,p:pick([2,3,4,5])}));
     return {q:`Tippe auf ${NAME_ART[target]}.`, small:true, extra:staff(items,{clef:true,tap:"items"}), type:"tap", ans:vs.indexOf(target), showAns:NAME[target], givenText:i=>NAME[vs[i]]||i,
       ex:`${NAME[target]}: `+{w:"leerer Kreis, kein Hals.",h:"leer mit Hals.",q:"ausgemalt mit Hals.",e:"ausgemalt mit Fähnchen."}[target]}; }},
  {sub:"notepause", label:"Note oder Pause?", w:2, f(){ const isNote=Math.random()<.5; const v= isNote? pick(["w","h","q","e"]) : pick(["w","q"]);
     return {q:"Ist das eine Note oder eine Pause?", small:true, extra:`<div style="display:flex;justify-content:center">${symbol(v,isNote?"n":"r",1.5)}</div>`, type:"mc", ans:isNote?"Note":"Pause", opts:["Note","Pause"],
       ex: isNote? `Das ist eine Note (${NAME[v]}).` : "Das ist eine Pause – da ist es still."}; }},
  {sub:"laenge", label:"Wie lang klingen die Noten?", w:3, f(){ const t=r(0,4);
     if(t===0){ const [a,b]=shuffle(["w","h","q","e"]).slice(0,2); const longer=DUR[a]>DUR[b]?a:b;
       return {q:`Welche Note klingt länger?`, small:true, type:"mc", ans:NAME[longer], opts:[NAME[a],NAME[b]], labels:{[NAME[a]]:symbol(a,"n",.8)+"&nbsp;"+NAME[a],[NAME[b]]:symbol(b,"n",.8)+"&nbsp;"+NAME[b]}, showAns:NAME[longer],
         ex:"Am längsten klingt die Ganze, dann die Halbe, dann die Viertel, am kürzesten die Achtel."}; }
     if(t===1){ const v=pick(["h","w"]); return {q:`Wie viele Viertel dauern so lange wie ${NAME_ART[v]}?`, small:true, type:"num", ans:DUR[v]/2, ex:`${NAME_ART[v]} = ${DUR[v]/2} Viertel. Zähle: ${Array.from({length:DUR[v]/2},(_,i)=>i+1).join(" ")}.`}; }
     if(t===2) return {q:"Wie viele Achtel dauern so lange wie eine Viertel?", small:true, type:"num", ans:2, ex:"Zwei Achtel sind so lang wie eine Viertel."};
     if(t===3) return {q:"Wie viele Halbe dauern so lange wie eine Ganze?", small:true, type:"num", ans:2, ex:"Zwei Halbe sind so lang wie eine Ganze."};
     return {q:"Welche Note ist am kürzesten?", small:true, type:"mc", ans:"Achtel", opts:shuffle(Object.values(NAME)), ex:"Die Achtel ist die kürzeste von diesen Noten."}; }},
]},
{ id:"mu_takt", name:"Taktangabe und Takt", icon:"🥁", gens:[
  {sub:"angabe", label:"Taktangabe zuordnen", w:3, f(){ const n=pick([2,3,4]); const labels={}; [2,3,4].forEach(k=>labels[k+"/4"]=frac(k,4));
     if(Math.random()<.5) return {q:`Das Lied steht im <b>${TAKTNAME[n]}</b>.<br>Welche Taktangabe ist richtig?`, small:true, type:"mc", ans:n+"/4", opts:shuffle(["2/4","3/4","4/4"]), labels, showAns:frac(n,4),
       ex:`${TAKTNAME[n]}: oben steht die ${n}, unten die 4.`};
     return {q:"In welchem Takt steht dieses Lied?", small:true, extra:staff(fillMeasure(n*2).map(v=>({k:"n",v,p:posFor()})).concat({k:"end"}),{time:[n,4]}), type:"mc", one:true, ans:TAKTNAME[n], opts:shuffle(Object.values(TAKTNAME)),
       ex:`Die Taktangabe ${n}/4 bedeutet ${TAKTNAME[n]}.`}; }},
  {sub:"zaehlen", label:"Im Takt zählen", w:3, f(){ const n=pick([2,3,4]); const t=r(0,2);
     if(t===0) return {q:`Im ${TAKTNAME[n]} zählt man immer von 1 bis …`, small:true, type:"num", ans:n, ex:`${TAKTNAME[n]}: 1 ${n>1?"2 ":""}${n>2?"3 ":""}${n>3?"4 ":""}– dann fängt man wieder bei 1 an.`};
     if(t===1){ const seq=[]; for(let k=0;k<3;k++) for(let j=1;j<=n;j++) seq.push(j); const gap=r(n,seq.length-1); const ans=seq[gap];
       return {q:`Zähle im ${TAKTNAME[n]} weiter:<br>${seq.slice(0,gap).map((x,i)=>x+(i%n===n-1?" |":"")).join(" ")} ${BOX}`, small:true, type:"num", ans, ex:`Nach ${n} fängt man wieder bei 1 an.`}; }
     return {q:"Welche Zahl wird beim Zählen im Takt oft besonders betont?", small:true, type:"num", ans:1, ex:"Die 1 – also der Anfang jedes Taktes – wird oft betont: <u>1</u> 2 3 4 | <u>1</u> 2 3 4"}; }},
  {sub:"taktezaehlen", label:"Takte zählen", w:2, f(){ const n=pick([3,4]); const k=r(2,4); let items=[];
     for(let i=0;i<k;i++){ items=items.concat(fillMeasure(n*2,false).map(v=>({k:"n",v,p:posFor()}))); items.push({k:i<k-1?"bar":"end"}); }
     return {q:"Wie viele Takte siehst du?", small:true, extra:staff(items,{time:[n,4]}), type:"num", ans:k, ex:`Ein Takt geht von einem Taktstrich zum nächsten. Es sind ${k} Takte.`}; }},
  {sub:"fehlt", label:"Wie viele Viertel fehlen?", w:3, f(){ const n=pick([3,4,4]); const cap=n*2;
     for(;;){ const seq=fillMeasure(cap,false); const cut=r(1,seq.length-1); const part=seq.slice(0,cut); const missing=(cap-sumDur(part))/2;
       if(missing<1||missing%1) continue;
       return {q:`Der Takt ist noch nicht voll.<br>Wie viele <b>Viertel</b> fehlen noch?`, small:true, extra:staff(part.map(v=>({k:"n",v,p:posFor()})).concat({k:"end"}),{time:[n,4]}), type:"num", ans:missing,
         ex:`Im ${TAKTNAME[n]} passen ${n} Viertel in einen Takt. Da sind schon ${sumDur(part)/2} Viertel – es fehlen ${missing}.`}; } }},
  {sub:"voll", label:"Ist der Takt richtig voll?", w:2, f(){ const n=pick([3,4]); const cap=n*2;
     let seq=fillMeasure(cap); const correct=Math.random()<.5;
     if(!correct){ seq = Math.random()<.5 && seq.length>1 ? seq.slice(0,-1) : seq.concat(pick(["q","h"])); }
     const full=sumDur(seq)===cap;
     return {q:`Passt das genau in einen ${frac(n,4)}-Takt?`, small:true, extra:staff(seq.map(v=>({k:"n",v,p:posFor()})).concat({k:"end"}),{time:[n,4]}), type:"mc", ans:full?"Ja, genau richtig":"Nein", opts:["Ja, genau richtig","Nein"],
       ex:`${listNames(seq)} – das sind ${String(sumDur(seq)/2).replace(".",",")} Viertel. In den Takt passen ${n} Viertel.`}; }},
  {sub:"bauen", label:"Takt selbst füllen", w:3, f(){
     const presets=[["w"],["q","q","q","q"],["e","q","q","q","e"],["h","h"],["h","q","q"],["q","h","q"],["e","e","h","q"],["q","q","h"]];
     const free=Math.random()<.3; const n= free? pick([3,4]) : 4; const cap=n*2; const target= free? null : pick(presets);
     const q = free? `Fülle den ${frac(n,4)}-Takt ganz – mit Noten deiner Wahl.` : `Lege in den Takt: <b>${listNames(target)}</b>.`;
     return {q, small:true, type:"custom", showAns: free? `${n} Viertel (z. B. ${listNames(fillMeasure(cap,false))})` : listNames(target),
       givenText: g=> g? listNames(g.split(",")) : "nichts",
       check: g=> free? sumDur(g.split(","))===cap : g===target.join(","),
       ex: free? `In einen ${TAKTNAME[n]} passen ${n} Viertel. Eine Halbe = 2 Viertel, eine Ganze = 4 Viertel, zwei Achtel = 1 Viertel.` : `Von links nach rechts: ${listNames(target)}.`,
       mount(el, submit){ const seq=[];
         const draw=()=>{ const used=sumDur(seq);
           el.innerHTML=`<div class="fig">${staff(seq.map(v=>({k:"n",v,p:1})).concat({k:"end"}),{time:[n,4],minW:330})}</div>
           <p class="center muted" style="margin:4px 0">${String(used/2).replace(".",",")} von ${n} Vierteln</p>
           <div class="opts" style="grid-template-columns:repeat(4,1fr)">${["w","h","q","e"].map(v=>`<button class="opt" data-v="${v}" style="flex-direction:column;padding:6px">${symbol(v,"n",.7)}<small style="font-size:.85rem">${NAME[v]}</small></button>`).join("")}</div>
           <div class="row" style="margin-top:10px"><button class="btn sec" style="flex:1" data-a="del">⌫ Zurück</button><button class="btn" style="flex:1;background:var(--ok);box-shadow:0 4px 0 #1f8a51" data-a="ok">✓ Fertig</button></div>
           <div class="err center" id="bmsg"></div>`;
           el.querySelectorAll(".opt").forEach(b=>b.onclick=()=>{ const v=b.dataset.v; if(sumDur(seq)+DUR[v]>cap){ el.querySelector("#bmsg").textContent="Das passt nicht mehr in den Takt!"; return; } seq.push(v); draw(); });
           el.querySelector('[data-a="del"]').onclick=()=>{ seq.pop(); draw(); };
           el.querySelector('[data-a="ok"]').onclick=()=>{ if(!seq.length){ el.querySelector("#bmsg").textContent="Lege zuerst Noten in den Takt."; return; } el.querySelectorAll("button").forEach(b=>b.disabled=true); submit(seq.join(",")); };
         };
         draw(); }}; }},
]},
{ id:"mu_hochtief", name:"Hoch und tief", icon:"🎹", gens:[
  {sub:"extrem", label:"Höchste / tiefste Note antippen", w:4, f(){
     const k=r(3,5); let ps; do{ ps=Array.from({length:k},()=>r(-2,10)); }while(new Set(ps).size<k);
     const hi=Math.random()<.5; const target= hi? ps.indexOf(Math.max(...ps)) : ps.indexOf(Math.min(...ps));
     const items=ps.map(p=>({k:"n",v:pick(["q","q","h","e"]),p}));
     return {q:`Tippe auf die am <b>${hi?"höchsten":"tiefsten"}</b> klingende Note.`, small:true, extra:staff(items.concat({k:"end"}),{tap:"items",h:170}), type:"tap", ans:target, showAns:`Note ${target+1}`, givenText:i=>`Note ${+i+1}`,
       ex: hi? "Hoch klingende Noten stehen weiter oben." : "Tief klingende Noten stehen weiter unten."}; }},
  {sub:"vergleich", label:"Welche Note klingt höher?", w:3, f(){ let a=r(-1,9), b=r(-1,9); if(Math.random()<.15) b=a; const hi=Math.random()<.5;
     const items=[{k:"n",v:"q",p:a,label:"1"},{k:"n",v:"q",p:b,label:"2"},{k:"end"}];
     const ans = a===b? "gleich hoch" : ((hi? a>b : a<b)? "Note 1" : "Note 2");
     return {q:`Welche Note klingt <b>${hi?"höher":"tiefer"}</b>?`, small:true, extra:staff(items,{h:170}), type:"mc", ans, opts:["Note 1","Note 2","gleich hoch"],
       ex: a===b? "Beide Noten stehen an derselben Stelle – sie klingen gleich hoch." : `${hi?"Höher":"Tiefer"} klingt die Note, die weiter ${hi?"oben":"unten"} steht.`}; }},
  {sub:"melodie", label:"Wird die Melodie höher oder tiefer?", w:2, f(){ const t=pick(["höher","tiefer","gleich"]);
     const start = t==="höher"? r(-1,3) : t==="tiefer"? r(6,9) : r(1,7);
     const ps=[0,1,2,3].map(i=> t==="höher"? start+i*r(1,2) : t==="tiefer"? start-i*r(1,2) : start);
     const ans={höher:"Die Töne werden höher",tiefer:"Die Töne werden tiefer",gleich:"Die Töne bleiben gleich"}[t];
     return {q:"Wie verändert sich die Melodie?", small:true, extra:staff(ps.map(p=>({k:"n",v:"q",p})).concat({k:"end"}),{h:170}), type:"mc", one:true, ans, opts:["Die Töne werden höher","Die Töne werden tiefer","Die Töne bleiben gleich"],
       ex:"Geht es auf den Linien nach oben, werden die Töne höher – nach unten werden sie tiefer."}; }},
]},
];

registerFach({ id:"musik", name:"Musik", icon:"🎵", color:"#9b5de5", info:"Die Schrift der Musik", topics:TOPICS });
})();
