/* Ferien & gesetzliche Feiertage Niedersachsen (Quelle: Nds. Kultusministerium / kalenderpedia, Stand 11/2026)
   Ferien jeweils inkl. Start- und Endtag. Bei Bedarf hier neue Schuljahre ergänzen. */
(function(){
'use strict';
const FERIEN=[
  ['2025-12-22','2026-01-05','Weihnachtsferien'],
  ['2026-02-02','2026-02-03','Halbjahresferien'],
  ['2026-03-23','2026-04-07','Osterferien'],
  ['2026-05-15','2026-05-15','Freier Tag'],
  ['2026-05-26','2026-05-26','Pfingstferien'],
  ['2026-07-02','2026-08-12','Sommerferien'],
  ['2026-10-12','2026-10-24','Herbstferien'],
  ['2026-12-23','2027-01-09','Weihnachtsferien'],
  ['2027-02-01','2027-02-02','Halbjahresferien'],
  ['2027-03-22','2027-04-03','Osterferien'],
  ['2027-05-07','2027-05-07','Freier Tag'],
  ['2027-05-18','2027-05-18','Pfingstferien'],
  ['2027-07-08','2027-08-18','Sommerferien'],
  ['2027-10-16','2027-10-30','Herbstferien'],
  ['2027-12-23','2028-01-08','Weihnachtsferien'],
  ['2028-01-31','2028-02-01','Halbjahresferien'],
  ['2028-04-10','2028-04-22','Osterferien'],
  ['2028-05-26','2028-05-26','Freier Tag'],
  ['2028-06-06','2028-06-06','Pfingstferien'],
  ['2028-07-20','2028-08-30','Sommerferien']
];
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return new Date(y,mo-1,da);}
const cache={};
function feiertage(y){
  if(cache[y])return cache[y];
  const e=easter(y),add=n=>{const d=new Date(e);d.setDate(d.getDate()+n);return iso(d);};
  return cache[y]={[y+'-01-01']:'Neujahr',[add(-2)]:'Karfreitag',[add(1)]:'Ostermontag',[y+'-05-01']:'Tag der Arbeit',
    [add(39)]:'Christi Himmelfahrt',[add(50)]:'Pfingstmontag',[y+'-10-03']:'Tag der Deutschen Einheit',
    [y+'-10-31']:'Reformationstag',[y+'-12-25']:'1. Weihnachtstag',[y+'-12-26']:'2. Weihnachtstag'};
}
function feiertag(s){return feiertage(+s.slice(0,4))[s]||null;}
function ferien(s){const f=FERIEN.find(f=>s>=f[0]&&s<=f[1]);return f?f[2]:null;}
function frei(s){return feiertag(s)||ferien(s);}
const lastYear=+FERIEN[FERIEN.length-1][1].slice(0,4);
window.Kal={iso,parse,feiertag,ferien,frei,lastYear,
  today:()=>iso(new Date()),
  de:s=>s?s.slice(8,10)+'.'+s.slice(5,7)+'.'+s.slice(0,4):'',
  wd:s=>['So','Mo','Di','Mi','Do','Fr','Sa'][parse(s).getDay()],
  days:(a,b)=>Math.round((parse(b)-parse(a))/864e5)};
})();
