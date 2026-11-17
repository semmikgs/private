/* MTV Abrechnung – Speicher für Übungsleiter mit Zugangscode (Supabase-Funktionen ul_get / ul_save)
   Code kommt per Link (?c=MTV-XXXX-XXXX) oder Eingabe und wird nur auf diesem Gerät gemerkt.
   Lokale Kopie in localStorage, damit es auch ohne Netz in der Halle funktioniert. */
(function(){
'use strict';
const CFG={url:'https://igirlnoegyhietojxpds.supabase.co',key:'sb_publishable_FqIAHj2wPerBC4Fv3YbqDQ_53_Z-GaY'};
const LS_CODE='mtvv_code',LS_DOC='mtvv_data';
const ls={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
          del(k){try{localStorage.removeItem(k);}catch(e){}}};
const listeners=new Set();
function emit(s){listeners.forEach(f=>{try{f(s);}catch(e){}});}
let code=ls.get(LS_CODE),name='';
const norm=c=>{const s=String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'').replace(/^MTV/,'');return s.length===8?'MTV-'+s.slice(0,4)+'-'+s.slice(4):null;};

async function rpc(fn,args){
  const r=await fetch(CFG.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'apikey':CFG.key,'Content-Type':'application/json'},body:JSON.stringify(args)});
  const j=await r.json().catch(()=>null);
  if(!r.ok){const e=new Error(j&&j.message||('Fehler '+r.status));e.invalid=/ungültig/i.test(e.message);throw e;}
  return j;
}
/* Laden: Server gewinnt, außer lokal liegen ungesicherte neuere Änderungen */
async function load(){
  const local=ls.get(LS_DOC);
  try{
    const s=await rpc('ul_get',{p_code:code});
    name=s.name||'';
    const srvTs=s.updated_at?Date.parse(s.updated_at):0;
    if(local&&local.dirty&&local.ts>srvTs){await push(local.data);return local.data;}
    if(s.data){ls.set(LS_DOC,{data:s.data,ts:srvTs,dirty:false});return s.data;}
    return local?local.data:null;
  }catch(e){
    if(e.invalid)throw e;
    emit('offline');return local?local.data:null;
  }
}
async function push(data){
  const t=await rpc('ul_save',{p_code:code,p_data:data});
  ls.set(LS_DOC,{data,ts:Date.parse(t),dirty:false});emit('saved');
}
let timer=null;
function save(data){
  ls.set(LS_DOC,{data,ts:Date.now(),dirty:true});emit('saving');
  clearTimeout(timer);timer=setTimeout(()=>{push(data).catch(()=>emit('offline'));},700);
}
window.addEventListener('online',()=>{const d=ls.get(LS_DOC);if(code&&d&&d.dirty)push(d.data).catch(()=>emit('offline'));});
function logout(){code=null;ls.del(LS_CODE);ls.del(LS_DOC);}

/* Zugang: Code aus Link übernehmen, sonst Eingabemaske. onReady(name) */
async function requireCode(onReady,opts){
  opts=opts||{};
  const q=new URLSearchParams(location.search),fromUrl=norm(q.get('c'));
  if(q.has('c'))history.replaceState(null,'',location.pathname);
  if(fromUrl&&fromUrl!==code){logout();code=fromUrl;ls.set(LS_CODE,code);}
  if(code){
    try{const d=await load();onReady(name,d);return;}
    catch(e){logout();return ask(onReady,opts,'Dieser Zugangscode gilt nicht mehr. Bitte neuen Code bei Ole anfragen.');}
  }
  ask(onReady,opts,'');
}
function ask(onReady,opts,msg){
  const ov=document.createElement('div');
  ov.innerHTML=`<style>
    .cd-ov{position:fixed;inset:0;z-index:9999;background:rgba(10,10,12,.72);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.4 -apple-system,system-ui,sans-serif}
    .cd-ov form{background:#fff;color:#1a1a1a;border-radius:16px;padding:22px;width:100%;max-width:360px;box-shadow:0 20px 50px rgba(0,0,0,.4);border-top:4px solid #c8102e}
    .cd-ov h2{margin:0 0 4px;font-size:19px}.cd-ov p{margin:0 0 14px;color:#666;font-size:13px}
    .cd-ov input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;border:1px solid #ccc;border-radius:10px;font-size:18px;text-transform:uppercase;letter-spacing:1px;text-align:center}
    .cd-ov button{width:100%;padding:12px;border:0;border-radius:10px;background:#c8102e;color:#fff;font-weight:700;font-size:16px;cursor:pointer}
    .cd-ov .err{color:#c8102e;font-size:13px;min-height:18px;margin-top:8px}</style>
    <div class="cd-ov"><form>${opts.logo?`<img src="${opts.logo}" alt="" style="display:block;height:64px;margin:0 auto 10px">`:''}
    <h2>${opts.title||'Zugang'}</h2><p>Gib deinen Zugangscode ein. Du findest ihn in der Nachricht mit dem Link.</p>
    <input name="c" placeholder="MTV-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false" required>
    <button type="submit">Weiter</button><div class="err">${msg}</div></form></div>`;
  document.body.appendChild(ov);
  const fm=ov.querySelector('form'),err=ov.querySelector('.err');
  fm.addEventListener('submit',async e=>{
    e.preventDefault();
    const c=norm(fm.c.value);if(!c){err.textContent='Der Code hat das Format MTV-XXXX-XXXX.';return;}
    err.textContent='…';code=c;
    try{const d=await load();ls.set(LS_CODE,code);ov.remove();onReady(name,d);}
    catch(x){code=null;err.textContent=x.invalid?'Code unbekannt. Bitte genau abtippen oder bei Ole nachfragen.':'Keine Verbindung – bitte später erneut versuchen.';}
  });
}

window.Store={load,save,logout,requireCode,on:f=>listeners.add(f),name:()=>name,code:()=>code};
})();
