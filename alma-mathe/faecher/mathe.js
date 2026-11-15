/* ===== Fach: Mathe (Klasse 3, 1. Lernzielkontrolle) =====
   Aufbau siehe README.md. Jedes Thema: {id, name, icon, gens:[{sub,label,w,f()}]}
   f() liefert eine Aufgabe {q, type, ans, ...}. Themen-IDs müssen über alle Fächer eindeutig sein. */
(function(){
/* Zahlwort 0..1000 */
const EIN=["","ein","zwei","drei","vier","fünf","sechs","sieben","acht","neun"];
const TEEN=["zehn","elf","zwölf","dreizehn","vierzehn","fünfzehn","sechzehn","siebzehn","achtzehn","neunzehn"];
const ZIG=["","","zwanzig","dreißig","vierzig","fünfzig","sechzig","siebzig","achtzig","neunzig"];
function wort2(n){ if(n===0) return ""; if(n===1) return "eins"; if(n<10) return EIN[n]; if(n<20) return TEEN[n-10];
  const z=Math.floor(n/10), e=n%10; return (e? (e===1?"ein":EIN[e])+"und":"")+ZIG[z]; }
function zahlwort(n){ if(n===1000) return "eintausend"; if(n===0) return "null"; const h=Math.floor(n/100), rest=n%100;
  return (h? EIN[h]+"hundert":"")+wort2(rest); }

/* Striche (Stellentafel) */
function strokes(n){
  if(n===0) return '<span class="muted" style="font-size:1rem">–</span>';
  let x=6, out=""; const h=40;
  for(let i=0;i<n;i++){ if(i>0 && i%5===0) x+=8; out+=`<line x1="${x}" y1="4" x2="${x}" y2="${h}" stroke="#2b2340" stroke-width="4" stroke-linecap="round"/>`; x+=9; }
  return `<svg width="${x}" height="${h+4}" viewBox="0 0 ${x} ${h+4}">${out}</svg>`;
}
function stTable(cells, opts={}){
  // cells: [h,z,e] Inhalte (HTML)
  const cls = opts.cls || "";
  return `<table class="st"><tr><th>H</th><th>Z</th><th>E</th></tr><tr>${cells.map((c,i)=>`<td class="${cls}" data-i="${i}">${c}</td>`).join("")}</tr></table>`;
}

/* Zahlenstrahl als SVG */
function numberLine(start, end, step, labelEvery, markVal){
  const W=640, H=140, x0=40, x1=W-40;
  const n=(end-start)/step;
  let s=`<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:640px"><line x1="${x0}" y1="70" x2="${x1}" y2="70" stroke="#2b2340" stroke-width="4"/>`;
  for(let i=0;i<=n;i++){
    const v=start+i*step, x=x0+(x1-x0)*i/n, big=(v-start)%labelEvery===0;
    s+=`<line x1="${x}" y1="${big?52:60}" x2="${x}" y2="${big?88:80}" stroke="#2b2340" stroke-width="${big?4:3}"/>`;
    if(big) s+=`<text x="${x}" y="124" text-anchor="middle" font-size="30" font-weight="700" fill="#2b2340">${v}</text>`;
  }
  if(markVal!==undefined){
    const x=x0+(x1-x0)*(markVal-start)/(end-start);
    s+=`<path d="M${x} 50 l-14 -24 h28 z" fill="#ff8a3d"/>`;
  }
  return s+"</svg>";
}

const TOPICS = [
{ id:"plusminus", name:"Plus und Minus bis 100", icon:"➕", gens:[
  {sub:"plus", label:"Plus bis 100", w:3, f(){ const a=r(12,78), b=r(11,100-a); const z=Math.floor(b/10)*10, e=b%10;
     return {q:`${a} + ${b} = ${BOX}`, type:"num", ans:a+b, ex:`Erst die Zehner: ${a} + ${z} = ${a+z}${e?`, dann die Einer: ${a+z} + ${e} = ${a+b}`:""}.`}; }},
  {sub:"minus", label:"Minus bis 100", w:3, f(){ const a=r(31,100), b=r(11,a-6); const z=Math.floor(b/10)*10, e=b%10;
     return {q:`${a} − ${b} = ${BOX}`, type:"num", ans:a-b, ex:`Erst die Zehner: ${a} − ${z} = ${a-z}${e?`, dann die Einer: ${a-z} − ${e} = ${a-b}`:""}.`}; }},
  {sub:"luecke_plus", label:"Lücke bei Plus", w:2, f(){ const a=r(11,70), b=r(5,100-a), s=a+b;
     return {q:`${a} + ${BOX} = ${s}`, type:"num", ans:b, ex:`Rechne umgekehrt: ${s} − ${a} = ${b}.`}; }},
  {sub:"luecke_minus", label:"Lücke bei Minus", w:2, f(){ const a=r(30,99), b=r(5,a-5), d=a-b;
     return {q:`${a} − ${BOX} = ${d}`, type:"num", ans:b, ex:`Wie viel fehlt von ${d} bis ${a}? ${a} − ${d} = ${b}.`}; }},
  {sub:"summe", label:"Zwei Ergebnisse addieren", w:1, f(){ const a=r(15,45), b=r(3,9);
     return {q:`Rechne ${a} + ${b} und ${a} − ${b}.<br>Addiere beide Ergebnisse.`, small:true, type:"num", ans:2*a, ex:`${a} + ${b} = ${a+b}, ${a} − ${b} = ${a-b}, zusammen ${a+b} + ${a-b} = ${2*a}.`}; }},
]},
{ id:"einmaleins", name:"Einmaleins: mal und geteilt", icon:"✖️", gens:[
  {sub:"mal", label:"Malaufgaben", w:4, f(){ const a=r(2,10), b=Math.random()<.08?0:r(1,10);
     return {q:`${a}${dot}${b} = ${BOX}`, type:"num", ans:a*b, ex:`${a}${dot}${b} = ${a*b}`+(b===0?" (mal 0 ist immer 0)":"")}; }},
  {sub:"geteilt", label:"Geteiltaufgaben", w:4, f(){ const b=r(2,10), q=Math.random()<.06?0:r(1,10), a=b*q;
     return {q:`${a} : ${b} = ${BOX}`, type:"num", ans:q, ex:`Probe: ${q}${dot}${b} = ${a}.`}; }},
  {sub:"faktor", label:"Fehlende Malzahl", w:2, f(){ const a=r(2,10), b=r(2,10), p=a*b;
     return Math.random()<.5 ? {q:`${BOX}${dot}${b} = ${p}`, type:"num", ans:a, ex:`${p} : ${b} = ${a}, also ${a}${dot}${b} = ${p}.`}
                             : {q:`${p} = ${a}${dot}${BOX}`, type:"num", ans:b, ex:`${p} : ${a} = ${b}, also ${a}${dot}${b} = ${p}.`}; }},
  {sub:"teiler", label:"Fehlende Geteiltzahl", w:2, f(){ const b=r(2,10), q=r(2,10), a=b*q;
     return {q:`${a} : ${BOX} = ${q}`, type:"num", ans:b, ex:`Rechne ${a} : ${q} = ${b}. Probe: ${q}${dot}${b} = ${a}.`}; }},
  {sub:"produkt", label:"Produkt (Fachwort)", w:1, f(){ const t=r(0,2);
     if(t===0){ const a=r(3,10), b=r(3,10); return {q:`Wie heißt das Produkt aus ${a} und ${b}?`, small:true, type:"num", ans:a*b, ex:`Produkt heißt: malnehmen. ${a}${dot}${b} = ${a*b}.`}; }
     if(t===1){ const a=r(3,10); return {q:`Multipliziere zwei gleiche Zahlen.<br>Das Produkt ist ${a*a}. Wie heißt die Zahl?`, small:true, type:"num", ans:a, ex:`${a}${dot}${a} = ${a*a}.`}; }
     const a=r(3,9), b=r(3,9); return {q:`Multipliziere eine Zahl mit ${b}.<br>Das Produkt ist ${a*b}. Wie heißt die Zahl?`, small:true, type:"num", ans:a, ex:`${a}${dot}${b} = ${a*b}.`}; }},
  {sub:"sach", label:"Sachaufgaben mal/geteilt", w:2, f(){ const t=r(0,2);
     if(t===0){ const b=r(3,8), q=r(2,9); return {q:`${b*q} Perlen, immer ${b} auf eine Schnur.<br>Wie viele Schnüre braucht man?`, small:true, type:"num", ans:q, ex:`${b*q} : ${b} = ${q}. Probe: ${q}${dot}${b} = ${b*q}.`}; }
     if(t===1){ const a=r(3,9), b=r(3,9); return {q:`Tim hat ${a} Tüten mit je ${b} Bonbons.<br>Wie viele Bonbons sind das?`, small:true, type:"num", ans:a*b, ex:`${a}${dot}${b} = ${a*b}.`}; }
     const k=r(2,6), q=r(3,9); return {q:`${k*q} Kekse werden gerecht an ${k} Kinder verteilt.<br>Wie viele bekommt jedes Kind?`, small:true, type:"num", ans:q, ex:`${k*q} : ${k} = ${q}.`}; }},
]},
{ id:"vergleich", name:"Größer, kleiner, gleich", icon:"⚖️", gens:[
  {sub:"prod_zahl", label:"Malaufgabe mit Zahl vergleichen", w:3, f(){ const a=r(2,9), b=r(2,9), p=a*b; const c=Math.random()<.3?p:Math.max(1,p+pick([-7,-4,-2,-1,1,2,3,5,8]));
     const left=Math.random()<.7; const ans = left ? (p<c?"<":p>c?">":"=") : (c<p?"<":c>p?">":"=");
     return {q: left?`${a}${dot}${b} &nbsp;${BOX}&nbsp; ${c}`:`${c} &nbsp;${BOX}&nbsp; ${a}${dot}${b}`, type:"cmp", ans, ex:`${a}${dot}${b} = ${p}. ${left?`${p} ${ans} ${c}`:`${c} ${ans} ${p}`}.`}; }},
  {sub:"prod_prod", label:"Zwei Malaufgaben vergleichen", w:2, f(){ let a=r(2,9),b=r(2,9),c,d;
     if(Math.random()<.3){ // gleiche Produkte
        const pairs=[[2,6,3,4],[4,6,3,8],[2,8,4,4],[3,6,2,9],[4,5,2,10],[6,6,4,9],[2,9,3,6],[8,3,6,4],[4,9,6,6]]; [a,b,c,d]=pick(pairs);
     } else { c=r(2,9); d=r(2,9); }
     const p=a*b, q=c*d, ans=p<q?"<":p>q?">":"=";
     return {q:`${a}${dot}${b} &nbsp;${BOX}&nbsp; ${c}${dot}${d}`, type:"cmp", ans, ex:`${a}${dot}${b} = ${p} und ${c}${dot}${d} = ${q}. Also ${p} ${ans} ${q}.`}; }},
  {sub:"geteilt", label:"Geteiltaufgabe vergleichen", w:2, f(){ const b=r(2,9), q=r(2,9), a=b*q; const c=Math.random()<.35?q:Math.max(0,q+pick([-2,-1,1,2]));
     const ans=q<c?"<":q>c?">":"=";
     return {q:`${a} : ${b} &nbsp;${BOX}&nbsp; ${c}`, type:"cmp", ans, ex:`${a} : ${b} = ${q}. Also ${q} ${ans} ${c}.`}; }},
  {sub:"einsetzen", label:"Welche Zahlen passen?", w:2, f(){
     for(;;){ const b=r(2,9), lim=r(10,80);
       if(Math.random()<.5){ // kleiner als -> groesste Zahl
         let m=-1; for(let x=0;x<=10;x++) if(x*b<lim) m=x; if(m<1||m>9) continue;
         return {q:`Welche Zahl ist die <u>größte</u>, die passt?<br>${BOX}${dot}${b} &lt; ${lim}`, small:true, type:"num", ans:m, ex:`${m}${dot}${b} = ${m*b} ist kleiner als ${lim}, aber ${m+1}${dot}${b} = ${(m+1)*b} nicht mehr.`};
       } else { let m=-1; for(let x=10;x>=0;x--) if(x*b>lim) m=x; if(m<1||m>9) continue;
         return {q:`Welche Zahl ist die <u>kleinste</u>, die passt?<br>${BOX}${dot}${b} &gt; ${lim}`, small:true, type:"num", ans:m, ex:`${m}${dot}${b} = ${m*b} ist größer als ${lim}, aber ${m-1}${dot}${b} = ${(m-1)*b} nicht.`}; } } }},
  {sub:"los", label:"Gewinnlose (größer/kleiner als)", w:1, f(){
     const gt=Math.random()<.5, lim=gt?pick([40,50,60]):pick([30,40,50]);
     for(;;){ const ls=[]; for(let i=0;i<4;i++){ ls.push([r(3,9),r(3,9)]); }
       const win=ls.filter(([a,b])=> gt? a*b>lim : a*b<lim);
       if(win.length!==1 || new Set(ls.map(x=>x.join())).size<4) continue; const w=win[0];
       return {q:`Gewinn: Produkt ${gt?"größer":"kleiner"} als ${lim}.<br>Welches Los gewinnt?`, small:true, type:"mc", ans:`${w[0]} · ${w[1]}`, opts:shuffle(ls.map(([a,b])=>`${a} · ${b}`)),
         ex: ls.map(([a,b])=>`${a}·${b}=${a*b}`).join(", ")+"."}; } }},
]},
{ id:"punkt", name:"Punkt vor Strich", icon:"🎯", gens:[
  {sub:"plus_mal", label:"Plus und mal", w:3, f(){ const b=r(2,9), c=r(2,9), p=b*c, a=r(2,Math.max(3,100-p)); const front=Math.random()<.5;
     return {q: front?`${a} + ${b}${dot}${c} = ${BOX}`:`${b}${dot}${c} + ${a} = ${BOX}`, type:"num", ans:a+p, ex:`Erst mal: ${b}${dot}${c} = ${p}. Dann plus: ${p} + ${a} = ${a+p}.`}; }},
  {sub:"minus_mal", label:"Minus und mal", w:3, f(){ const b=r(2,9), c=r(2,9), p=b*c;
     if(Math.random()<.5){ const a=r(p+1,Math.min(100,p+50)); return {q:`${a} − ${b}${dot}${c} = ${BOX}`, type:"num", ans:a-p, ex:`Erst mal: ${b}${dot}${c} = ${p}. Dann minus: ${a} − ${p} = ${a-p}.`}; }
     const a=r(1,p-1); return {q:`${b}${dot}${c} − ${a} = ${BOX}`, type:"num", ans:p-a, ex:`Erst mal: ${b}${dot}${c} = ${p}. Dann minus: ${p} − ${a} = ${p-a}.`}; }},
  {sub:"geteilt", label:"Plus/Minus und geteilt", w:2, f(){ const d=r(2,9), q=r(2,9), t=d*q;
     if(Math.random()<.5){ const a=r(2,80); return {q:`${a} + ${t} : ${d} = ${BOX}`, type:"num", ans:a+q, ex:`Erst geteilt: ${t} : ${d} = ${q}. Dann plus: ${a} + ${q} = ${a+q}.`}; }
     const a=r(q+1,90); return {q:`${a} − ${t} : ${d} = ${BOX}`, type:"num", ans:a-q, ex:`Erst geteilt: ${t} : ${d} = ${q}. Dann minus: ${a} − ${q} = ${a-q}.`}; }},
  {sub:"fehler", label:"Fehler finden", w:2, f(){ const a=r(2,9), b=r(2,9), c=r(2,9); const right=a+b*c, wrong=(a+b)*c;
     return {q:`Flo rechnet:<br>${a} + ${b}${dot}${c} = ${a+b}${dot}${c} = ${wrong}<br>Was ist das richtige Ergebnis?`, small:true, type:"mc", ans:String(right),
       opts:uniqOpts(right,[wrong, right+1, a*b+c, right-c, right+10]), ex:`Punkt vor Strich! Erst ${b}${dot}${c} = ${b*c}, dann ${a} + ${b*c} = ${right}.`}; }},
]},
{ id:"hunderter", name:"Rechnen mit Hundertern", icon:"💯", gens:[
  {sub:"plus", label:"Hunderter plus", w:3, f(){ const a=r(1,8), b=r(1,10-a);
     return {q:`${a*100} + ${b*100} = ${BOX}`, type:"num", ans:(a+b)*100, ex:`${a} Hunderter + ${b} Hunderter = ${a+b} Hunderter = ${(a+b)*100}.`}; }},
  {sub:"minus", label:"Hunderter minus", w:3, f(){ const a=Math.random()<.4?10:r(2,9), b=r(1,a);
     return {q:`${a*100} − ${b*100} = ${BOX}`, type:"num", ans:(a-b)*100, ex:`${a} Hunderter − ${b} Hunderter = ${a-b} Hunderter = ${(a-b)*100}.`}; }},
  {sub:"haus", label:"Ergänzen (Zahlenhaus)", w:2, f(){ const s=r(3,10), a=r(1,s-1);
     return {q:`${s*100} = ${a*100} + ${BOX}`, type:"num", ans:(s-a)*100, ex:`${s*100} − ${a*100} = ${(s-a)*100}.`}; }},
  {sub:"mal100", label:"Plus- zur Malaufgabe", w:2, f(){ const t=r(0,2);
     if(t===0){ const n=r(3,7); return {q:`${Array(n).fill("100").join(" + ")} = ${BOX}${dot}100`, small:true, type:"num", ans:n, ex:`Du zählst ${n}-mal die 100: ${n}${dot}100 = ${n*100}.`}; }
     if(t===1){ const n=r(2,9); return {q:`${n}${dot}100 = ${BOX}`, type:"num", ans:n*100, ex:`${n} Hunderter = ${n*100}.`}; }
     const d=pick([100,200,500]); return {q:`1000 = ${BOX}${dot}${d}`, type:"num", ans:1000/d, ex:`${1000/d}${dot}${d} = 1000.`}; }},
]},
{ id:"stellen", name:"Zahlen bis 1000 und Stellentafel", icon:"🧮", gens:[
  {sub:"striche", label:"Striche in der Stellentafel", w:4, f(){ const h=r(1,9), z=r(0,9), e=r(0,9), n=h*100+z*10+e;
     return {q:`Wie heißt die Zahl?`, small:true, extra: stTable([strokes(h),strokes(z),strokes(e)],{cls:"strokes"}), type:"num", ans:n,
       ex:`${h} Striche bei H, ${z} bei Z, ${e} bei E: ${h}H + ${z}Z + ${e}E = ${h*100} + ${z*10} + ${e} = ${n}.`}; }},
  {sub:"eintragen", label:"Zahl in die Stellentafel eintragen", w:3, f(){ const h=r(1,9), z=Math.random()<.2?0:r(0,9), e=Math.random()<.2?0:r(0,9), n=h*100+z*10+e;
     return {q:`Trage <b>${n}</b> in die Stellentafel ein.`, small:true, type:"place", ans:[h,z,e], ex:`${n} = ${h} Hunderter, ${z} Zehner, ${e} Einer.`}; }},
  {sub:"lesen", label:"Stellentafel lesen", w:2, f(){ const h=r(1,9), z=r(0,9), e=r(0,9), n=h*100+z*10+e;
     return {q:`Wie heißt die Zahl?`, small:true, extra: stTable([h,z,e]), type:"num", ans:n, ex:`${h*100} + ${z*10} + ${e} = ${n}.`}; }},
  {sub:"kurz", label:"H, Z, E in gemischter Reihenfolge", w:3, f(){ const h=r(1,9), z=r(0,9), e=r(0,9), n=h*100+z*10+e;
     let parts=[[h,"H"],[z,"Z"],[e,"E"]].filter(p=>p[0]>0); if(Math.random()<.6) parts=shuffle(parts);
     return {q:`${parts.map(p=>p[0]+p[1]).join(" + ")} = ${BOX}`, type:"num", ans:n, ex:`${h} Hunderter, ${z} Zehner, ${e} Einer: ${n}.`+((z===0||e===0)?" Achtung, eine Stelle ist leer – dort steht eine 0.":"")}; }},
  {sub:"zerlegen", label:"Zahlen zerlegen", w:3, f(){ const h=r(1,9), z=r(1,9), e=r(1,9), n=h*100+z*10+e; const t=r(0,2);
     const parts=[h*100,z*10,e]; const p=parts.map((v,i)=> i===t?BOX:v);
     return {q:`${n} = ${p.join(" + ")}`, type:"num", ans:parts[t], ex:`${n} = ${h*100} + ${z*10} + ${e}.`}; }},
  {sub:"zusammen", label:"Hunderter+Zehner+Einer zusammensetzen", w:2, f(){ const h=r(1,9), z=r(0,9), e=r(0,9), n=h*100+z*10+e;
     const p=[h*100]; if(z) p.push(z*10); if(e) p.push(e);
     return {q:`${p.join(" + ")} = ${BOX}`, type:"num", ans:n, ex:`${n}`+((z===0||e===0)?` – leere Stellen werden mit 0 aufgefüllt.`:"")}; }},
  {sub:"ziffer", label:"Welche Ziffer steht an welcher Stelle?", w:2, f(){ const n=r(102,987); const t=r(0,2), nm=["Hunderter","Zehner","Einer"][t];
     const d=String(n)[t];
     return {q:`Welche Ziffer steht in <b>${n}</b> bei den <b>${nm}n</b>?`, small:true, type:"num", ans:+d, ex:`${n}: H = ${String(n)[0]}, Z = ${String(n)[1]}, E = ${String(n)[2]}.`}; }},
  {sub:"buendeln", label:"Aufgepasst: mehr als 9 an einer Stelle", w:1, f(){
     if(Math.random()<.5){ const h=r(1,8), e=r(10,19); const n=h*100+e; return {q:`${h}H + ${e}E = ${BOX}`, type:"num", ans:n, ex:`${e} Einer sind 1 Zehner und ${e-10} Einer. Also ${h}H + 1Z + ${e-10}E = ${n}.`}; }
     const h=r(1,7), z=r(10,19), e=r(0,9); const n=h*100+z*10+e; return {q:`${h}H + ${z}Z + ${e}E = ${BOX}`, type:"num", ans:n, ex:`${z} Zehner sind 1 Hunderter und ${z-10} Zehner. Also ${h+1}H + ${z-10}Z + ${e}E = ${n}.`}; }},
  {sub:"zahlwort", label:"Zahlwörter", w:2, f(){ const h=r(1,9), z=r(0,9), e=r(1,9); const n=h*100+z*10+e;
     const cands=[h*100+e*10+z, z?z*100+h*10+e:null, e*100+z*10+h, h*100+z*10+((e+1)%10||2), n+10<1000?n+10:n-10].filter(x=>x && x!==n && x>=100);
     if(Math.random()<.5) return {q:`Welche Zahl ist das?<br><i>${zahlwort(n)}</i>`, small:true, type:"mc", ans:String(n), opts:uniqOpts(n,cands), ex:`${zahlwort(n)} = ${n}.`};
     const ws=cands.map(zahlwort); return {q:`Welches Zahlwort passt zu <b>${n}</b>?`, small:true, type:"mc", one:true, ans:zahlwort(n), opts:uniqOpts(zahlwort(n),ws), ex:`${n} = ${zahlwort(n)}.`}; }},
]},
{ id:"raetsel", name:"Zahlenrätsel", icon:"🕵️", gens:[
  {sub:"einfach", label:"H, Z, E im Text", w:2, f(){ const h=r(1,9), z=r(0,9), e=r(0,9), n=h*100+z*10+e;
     const parts=shuffle([`${h} Hunderter`,`${z} Zehner`,`${e} Einer`]);
     return {q:`Die Zahl hat ${parts[0]}, ${parts[1]} und ${parts[2]}.<br>Wie heißt die Zahl?`, small:true, type:"num", ans:n, ex:`${h}H ${z}Z ${e}E = ${n}.`}; }},
  {sub:"doppelt", label:"Doppelt so viele …", w:3, f(){ const t=r(0,1);
     if(t===0){ const h=r(1,4), z=2*h, e=r(0,9), n=h*100+z*10+e; return {q:`Die Zahl hat ${h} Hunderter, doppelt so viele Zehner und ${e} Einer.`, small:true, type:"num", ans:n, ex:`Doppelt so viele Zehner wie Hunderter: ${h}${dot}2 = ${z}. Die Zahl ist ${n}.`}; }
     const e=r(1,4), z=2*e, h=r(1,9), n=h*100+z*10+e; return {q:`Die Zahl hat ${e} Einer, doppelt so viele Zehner und ${h} Hunderter.`, small:true, type:"num", ans:n, ex:`Doppelt so viele Zehner wie Einer: ${e}${dot}2 = ${z}. Die Zahl ist ${n}.`}; }},
  {sub:"halb", label:"Halb so viele …", w:2, f(){ const h=pick([2,4,6,8]), e=h/2, z=r(0,9), n=h*100+z*10+e;
     return {q:`Die Zahl hat ${h} Hunderter, halb so viele Einer und ${z} Zehner.`, small:true, type:"num", ans:n, ex:`Die Hälfte von ${h} ist ${e}. Die Zahl ist ${n}.`}; }},
  {sub:"mehrweniger", label:"… mehr / weniger als …", w:2, f(){ const h=r(1,9), e=r(3,9), d=r(1,3);
     if(Math.random()<.5){ const z=e-d, n=h*100+z*10+e; return {q:`Die Zahl hat ${h} Hunderter und ${e} Einer.<br>Sie hat ${["","einen","zwei","drei"][d]} Zehner weniger als Einer.`, small:true, type:"num", ans:n, ex:`Zehner: ${e} − ${d} = ${z}. Die Zahl ist ${n}.`}; }
     const z=r(0,9-d), e2=z+d, n=h*100+z*10+e2; return {q:`Die Zahl hat ${h} Hunderter und ${z} Zehner.<br>Sie hat ${["","einen","zwei","drei"][d]} Einer mehr als Zehner.`, small:true, type:"num", ans:n, ex:`Einer: ${z} + ${d} = ${e2}. Die Zahl ist ${n}.`}; }},
  {sub:"karten", label:"Ziffernkarten legen", w:2, f(){ let ds; do{ ds=[r(1,9),r(1,9),r(1,9)]; }while(new Set(ds).size<3);
     const big=Math.random()<.5, s=ds.slice().sort((a,b)=>big?b-a:a-b), n=+s.join("");
     return {q:`Ziffernkarten: <b>${ds.join(" &nbsp; ")}</b><br>Lege die <u>${big?"größte":"kleinste"}</u> dreistellige Zahl.`, small:true, type:"num", ans:n, ex:`Die ${big?"größte":"kleinste"} Ziffer kommt nach vorn zu den Hundertern: ${n}.`}; }},
]},
{ id:"tafel", name:"Hundertertafel", icon:"🔢", gens:[
  {sub:"ausschnitt", label:"Ausschnitt ergänzen", w:4, f(){ const b=r(0,9), row=r(2,9), col=r(2,9), c=b*100+(row-1)*10+col;
     const cells=[]; for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) cells.push({dr,dc,v:c+dr*10+dc});
     const ask=pick(cells.filter(x=>!(x.dr===0&&x.dc===0)));
     const shown=new Set(["0,0"]); for(const x of shuffle(cells)){ if(shown.size>=3) break; if(x!==ask) shown.add(x.dr+","+x.dc); }
     const html='<div class="ht">'+cells.map(x=> x===ask?'<div class="q">?</div>': shown.has(x.dr+","+x.dc)?`<div>${x.v}</div>`:'<div class="e"></div>').join("")+'</div>';
     const dir = (ask.dr? (ask.dr>0?"unten: +10":"oben: −10"):"") + (ask.dr&&ask.dc?" und ":"") + (ask.dc?(ask.dc>0?"rechts: +1":"links: −1"):"");
     return {q:`Welche Zahl gehört an die Stelle mit dem <b style="color:var(--pri)">?</b>`, small:true, extra:html, type:"num", ans:ask.v, ex:`In der Hundertertafel gilt: nach ${dir}. Die Zahl ist ${ask.v}.`}; }},
  {sub:"nachbar", label:"Über, unter, links, rechts", w:3, f(){ const b=r(0,9), row=r(2,9), col=r(2,9), c=b*100+(row-1)*10+col;
     const d=pick([["direkt darunter",10],["direkt darüber",-10],["direkt rechts daneben",1],["direkt links daneben",-1]]);
     return {q:`Welche Zahl steht in der Hundertertafel ${d[0]}?<br><b>${c}</b>`, small:true, type:"num", ans:c+d[1], ex:`${d[1]===10?"Darunter: +10":d[1]===-10?"Darüber: −10":d[1]===1?"Rechts: +1":"Links: −1"} → ${c+d[1]}.`}; }},
  {sub:"muster", label:"Wie verändern sich die Zahlen?", w:1, f(){ const v=pick([["nach unten","immer 10 mehr"],["nach rechts","immer 1 mehr"],["schräg nach rechts unten","immer 11 mehr"],["nach oben","immer 10 weniger"]]);
     const opts=shuffle(["immer 10 mehr","immer 1 mehr","immer 11 mehr","immer 10 weniger"]);
     return {q:`Du gehst in der Hundertertafel ${v[0]}.<br>Wie verändern sich die Zahlen?`, small:true, type:"mc", one:true, ans:v[1], opts, ex:`Unten +10, rechts +1, schräg rechts unten +11, oben −10.`}; }},
]},
{ id:"strahl", name:"Zahlenstrahl", icon:"📏", gens:[
  {sub:"ablesen", label:"Zahl am Zahlenstrahl ablesen", w:3, f(){
     if(Math.random()<.5){ const s=r(0,9)*100, k=r(1,9), v=s+k*10; return {q:`Welche Zahl zeigt der Pfeil?`, small:true, extra:numberLine(s,s+100,10,50,v), type:"num", ans:v, ex:`Von ${s} bis ${s+100} geht jeder Strich 10 weiter. ${k} Striche nach ${s}: ${v}.`}; }
     const k=r(1,9), v=k*100; return {q:`Welche Zahl zeigt der Pfeil?`, small:true, extra:numberLine(0,1000,100,500,v), type:"num", ans:v, ex:`Jeder Strich ist 100 weiter. ${k} Striche: ${v}.`}; }},
  {sub:"mitte", label:"Zahl in der Mitte", w:2, f(){ const span=pick([200,100,100,50,20]); const a=r(0,(1000-span)/10)*10, b=a+span, m=(a+b)/2;
     if(m%1) return this.f();
     return {q:`Welche Zahl liegt genau in der Mitte?`, small:true, extra:numberLine(a,b,span/2,span), type:"num", ans:m, ex:`Der Abstand ist ${span}. Die Hälfte davon ist ${span/2}. ${a} + ${span/2} = ${m}.`}; }},
  {sub:"folge", label:"Zahlenfolgen fortsetzen", w:3, f(){ const st=pick([10,10,-10,11,5,100,-100,20,-5,25]);
     let a; if(st>0) a=r(0,Math.floor((1000-4*st)/5))*5; else a=r(Math.ceil(-4*st/5),200)*5;
     if(Math.abs(st)===100) a=r(0,5)*100+r(0,9)*10; if(st===-100) a=r(4,9)*100+r(0,9)*10;
     if(st===11) a=r(1,8)*100+r(0,5)*11; // z.B. 311, 322, 333
     const seq=[a,a+st,a+2*st]; const next=a+3*st; if(next<0||next>1000||seq.some(x=>x<0)) return this.f();
     return {q:`${seq.join(", ")}, ${BOX}`, type:"num", ans:next, ex:`Immer ${st>0?"plus":"minus"} ${Math.abs(st)}: ${seq[2]} ${st>0?"+":"−"} ${Math.abs(st)} = ${next}.`}; }},
  {sub:"nachbar", label:"Nachbarzehner / Nachbarhunderter", w:2, f(){ const n=r(101,989); if(n%10===0) return this.f();
     const t=pick([["Nachbarzehner davor",Math.floor(n/10)*10],["Nachbarzehner danach",Math.ceil(n/10)*10],["Nachbarhunderter davor",Math.floor(n/100)*100],["Nachbarhunderter danach",Math.ceil(n/100)*100]]);
     if(t[1]===n) return this.f();
     return {q:`Wie heißt der <b>${t[0]}</b> von <b>${n}</b>?`, small:true, type:"num", ans:t[1], ex:`${n} liegt zwischen ${t[0].includes("zehner")?Math.floor(n/10)*10+" und "+Math.ceil(n/10)*10:Math.floor(n/100)*100+" und "+Math.ceil(n/100)*100}.`}; }},
]},
];

registerFach({ id:"mathe", name:"Mathe", icon:"🔢", color:"#ff8a3d", info:"Lernzielkontrolle 10.11.", topics:TOPICS });
})();
