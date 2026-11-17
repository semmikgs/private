/* MTV Abrechnung (Vereinsversion) – Login + Cloud-Speicher über Supabase, ohne Fremdbibliothek
   Tabelle public.user_docs (user_id, key, data, updated_at), RLS = jeder sieht nur seine eigenen Daten.
   Zugang nur auf Einladung: Konten legt der Admin im Supabase-Dashboard an.
   Lokale Kopie in localStorage, damit es auch ohne Netz in der Halle funktioniert. */
(function(){
'use strict';
const CFG={
  url:'https://igirlnoegyhietojxpds.supabase.co',   // Supabase-Projekt "Handball"
  key:'sb_publishable_FqIAHj2wPerBC4Fv3YbqDQ_53_Z-GaY'
};
const P='mtvv_',LS_SESSION=P+'session',LS_DOC=P+'doc_',LS_MAIL=P+'email';
const ls={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
          del(k){try{localStorage.removeItem(k);}catch(e){}}};
let session=ls.get(LS_SESSION);
const listeners=new Set();
function emit(state){listeners.forEach(f=>{try{f(state);}catch(e){}});}
const here=()=>location.origin+location.pathname;

async function authReq(path,body,method){
  const r=await fetch(CFG.url+'/auth/v1/'+path,{method:method||'POST',headers:{'apikey':CFG.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error_description||j.msg||j.message||('Fehler '+r.status));
  return j;
}
function setSession(j){
  session={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000,user:{id:j.user.id,email:j.user.email}};
  ls.set(LS_SESSION,session);
}
let refreshing=null;
async function token(){
  if(!session)throw new Error('nicht angemeldet');
  if(Date.now()<session.expires_at-60000)return session.access_token;
  if(!refreshing)refreshing=authReq('token?grant_type=refresh_token',{refresh_token:session.refresh_token})
    .then(j=>{setSession(j);}).catch(e=>{if(/invalid|expired|not found/i.test(e.message)){session=null;ls.del(LS_SESSION);emit('logout');}throw e;})
    .finally(()=>{refreshing=null;});
  await refreshing;return session.access_token;
}
async function rest(method,query,body,extra){
  const t=await token();
  const r=await fetch(CFG.url+'/rest/v1/user_docs'+query,{method,headers:Object.assign({'apikey':CFG.key,'Authorization':'Bearer '+t,'Content-Type':'application/json'},extra||{}),body:body?JSON.stringify(body):undefined});
  if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.message||('Fehler '+r.status));}
  return r.status===204?null:r.json();
}

/* Dokument laden: Server gewinnt, außer lokal liegen ungesicherte neuere Änderungen */
async function load(key,fallback){
  const local=ls.get(LS_DOC+key);
  try{
    const rows=await rest('GET','?key=eq.'+encodeURIComponent(key)+'&select=data,updated_at');
    const srv=rows[0];
    if(local&&local.dirty&&(!srv||local.ts>Date.parse(srv.updated_at))){await push(key,local.data);return local.data;}
    if(srv){ls.set(LS_DOC+key,{data:srv.data,ts:Date.parse(srv.updated_at),dirty:false});return srv.data;}
    if(local)return local.data;
    return fallback;
  }catch(e){
    emit('offline');
    return local?local.data:fallback;
  }
}
/* Nur lesen, ohne lokale Kopie (für die Übernahme alter Daten) */
async function peek(key){
  try{const rows=await rest('GET','?key=eq.'+encodeURIComponent(key)+'&select=data');return rows[0]?rows[0].data:null;}
  catch(e){return null;}
}
async function push(key,data){
  const ts=Date.now();
  await rest('POST','?on_conflict=user_id,key',{key,data,updated_at:new Date(ts).toISOString()},{'Prefer':'resolution=merge-duplicates,return=minimal'});
  ls.set(LS_DOC+key,{data,ts,dirty:false});
  emit('saved');
}
const timers={};
function save(key,data){
  ls.set(LS_DOC+key,{data,ts:Date.now(),dirty:true});
  emit('saving');
  clearTimeout(timers[key]);
  timers[key]=setTimeout(()=>{push(key,data).catch(()=>emit('offline'));},700);
}
async function flush(){
  for(const k of Object.keys(localStorage).filter(k=>k.startsWith(LS_DOC))){
    const d=ls.get(k);if(d&&d.dirty){try{await push(k.slice(LS_DOC.length),d.data);}catch(e){emit('offline');return;}}
  }
}
window.addEventListener('online',()=>{if(session)flush();});

function pwError(m){
  return /different/i.test(m)?'Das neue Passwort muss sich vom alten unterscheiden.'
    :/at least|short|weak/i.test(m)?'Das Passwort ist zu kurz oder zu schwach (mind. 8 Zeichen).'
    :/reauth/i.test(m)?'Supabase verlangt eine erneute Bestätigung – bitte beim Admin melden.':m;
}
async function setPassword(newPw){
  const r=await fetch(CFG.url+'/auth/v1/user',{method:'PUT',headers:{'apikey':CFG.key,'Authorization':'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify({password:newPw})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(pwError(j.msg||j.message||j.error_description||('Fehler '+r.status)));
}
/* Passwort ändern: altes Passwort wird zur Sicherheit erst geprüft */
async function changePassword(oldPw,newPw){
  if(!session)throw new Error('nicht angemeldet');
  try{setSession(await authReq('token?grant_type=password',{email:session.user.email,password:oldPw}));}
  catch(e){throw new Error('Aktuelles Passwort ist falsch.');}
  await setPassword(newPw);
}
async function login(email,pw){setSession(await authReq('token?grant_type=password',{email,password:pw}));emit('login');}
async function resetMail(email){await authReq('recover?redirect_to='+encodeURIComponent(here()),{email});}
function logout(){session=null;ls.del(LS_SESSION);Object.keys(localStorage).filter(k=>k.startsWith(LS_DOC)).forEach(k=>ls.del(k));emit('logout');}

/* Links aus Einladungs- oder Passwort-Mails auswerten.
   a) eigene Mailvorlage:  ...?token_hash=XYZ&type=invite|recovery
   b) Standard-Vorlage:    ...#access_token=...&refresh_token=...&type=invite|recovery */
async function fromLink(){
  const q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.slice(1));
  let type=null;
  try{
    if(q.get('token_hash')){
      type=q.get('type');
      setSession(await authReq('verify',{type,token_hash:q.get('token_hash')}));
    }else if(h.get('access_token')){
      type=h.get('type');
      const r=await fetch(CFG.url+'/auth/v1/user',{headers:{'apikey':CFG.key,'Authorization':'Bearer '+h.get('access_token')}});
      const u=await r.json();if(!r.ok)throw new Error(u.msg||'Link ungültig');
      setSession({access_token:h.get('access_token'),refresh_token:h.get('refresh_token'),expires_in:+h.get('expires_in')||3600,user:u});
    }else if(h.get('error_description')||q.get('error_description')){
      throw new Error((h.get('error_description')||q.get('error_description')).replace(/\+/g,' '));
    }
  }catch(e){history.replaceState(null,'',here());return {error:/expired|invalid/i.test(e.message)?'Der Link ist abgelaufen oder wurde schon benutzt. Bitte neu anfordern.':e.message};}
  if(type)history.replaceState(null,'',here());
  return {type:/invite|recovery|signup|magiclink/.test(type||'')?type:null};
}

const CSS=`<style>
  .cl-ov{position:fixed;inset:0;z-index:9999;background:rgba(10,10,12,.72);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.4 -apple-system,system-ui,sans-serif}
  .cl-ov form{background:#fff;color:#1a1a1a;border-radius:16px;padding:22px;width:100%;max-width:360px;box-shadow:0 20px 50px rgba(0,0,0,.4);border-top:4px solid #c8102e}
  .cl-ov h2{margin:0 0 4px;font-size:19px}.cl-ov p{margin:0 0 14px;color:#666;font-size:13px}
  .cl-ov input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;border:1px solid #ccc;border-radius:10px;font-size:16px}
  .cl-ov button{width:100%;padding:12px;border:0;border-radius:10px;background:#c8102e;color:#fff;font-weight:700;font-size:16px;cursor:pointer}
  .cl-ov .err{color:#c8102e;font-size:13px;min-height:18px;margin-top:8px}
  .cl-ov .ok{color:#1f9d55}
  .cl-ov a{display:block;text-align:center;margin-top:12px;color:#666;font-size:13px;cursor:pointer}</style>`;
function overlay(html){const ov=document.createElement('div');ov.className='cl-ov';ov.innerHTML=CSS+html;document.body.appendChild(ov);return ov;}

/* Neues Passwort festlegen (nach Einladung oder „Passwort vergessen“) */
function newPasswordForm(opts,type,done){
  const ov=overlay(`<form>${opts.logo?`<img src="${opts.logo}" alt="" style="display:block;height:64px;margin:0 auto 10px">`:''}
    <h2>${type==='invite'?'Willkommen!':'Neues Passwort'}</h2>
    <p>${type==='invite'?'Lege jetzt dein Passwort fest. Damit meldest du dich künftig an.':'Lege ein neues Passwort fest.'}<br><b>${session.user.email}</b></p>
    <input type="password" name="p1" placeholder="Neues Passwort (mind. 8 Zeichen)" autocomplete="new-password" minlength="8" required>
    <input type="password" name="p2" placeholder="Passwort wiederholen" autocomplete="new-password" required>
    <button type="submit">Passwort speichern</button><div class="err"></div></form>`);
  const fm=ov.querySelector('form'),err=ov.querySelector('.err');
  fm.addEventListener('submit',async e=>{
    e.preventDefault();
    if(fm.p1.value!==fm.p2.value){err.textContent='Die Passwörter stimmen nicht überein.';return;}
    err.textContent='…';
    try{await setPassword(fm.p1.value);ls.set(LS_MAIL,session.user.email);ov.remove();done();}
    catch(x){err.textContent=x.message;}
  });
}

/* Login-Maske: ruft onReady(user, info) auf, sobald eine Sitzung vorhanden ist */
async function requireLogin(onReady,opts){
  opts=opts||{};
  const link=await fromLink();
  if(link.type&&session){newPasswordForm(opts,link.type,()=>onReady(session.user,{first:link.type==='invite'}));return;}
  if(session){onReady(session.user,{});return;}
  const ov=overlay(`<form>${opts.logo?`<img src="${opts.logo}" alt="" style="display:block;height:64px;margin:0 auto 10px">`:''}<h2>${opts.title||'Anmelden'}</h2>
    <p>Zugang nur auf Einladung. Melde dich mit deiner E-Mail und deinem Passwort an.</p>
    <input type="email" name="e" placeholder="E-Mail" autocomplete="username" required>
    <input type="password" name="p" placeholder="Passwort" autocomplete="current-password">
    <button type="submit">Anmelden</button><div class="err">${link.error||''}</div>
    <a data-a="forgot">Passwort vergessen?</a>${opts.back?`<a href="${opts.back}">← zurück</a>`:''}</form>`);
  const fm=ov.querySelector('form'),err=ov.querySelector('.err'),last=ls.get(LS_MAIL);
  if(last){fm.e.value=last;setTimeout(()=>fm.p.focus(),50);}
  fm.addEventListener('submit',async e=>{
    e.preventDefault();
    if(!fm.p.value){err.textContent='Bitte Passwort eingeben.';return;}
    err.className='err';err.textContent='…';
    try{await login(fm.e.value.trim(),fm.p.value);ls.set(LS_MAIL,fm.e.value.trim());ov.remove();onReady(session.user,{});}
    catch(x){err.textContent=/invalid/i.test(x.message)?'E-Mail oder Passwort falsch.':/not confirmed/i.test(x.message)?'Konto noch nicht bestätigt – bitte den Link aus der Einladung nutzen.':x.message;}
  });
  ov.querySelector('[data-a=forgot]').addEventListener('click',async()=>{
    const m=fm.e.value.trim();
    if(!m||!fm.e.checkValidity()){err.className='err';err.textContent='Bitte oben zuerst deine E-Mail eintragen.';fm.e.focus();return;}
    err.className='err';err.textContent='…';
    try{await resetMail(m);err.className='err ok';err.textContent='Falls ein Konto existiert, kommt gleich eine Mail mit einem Link.';}
    catch(x){err.textContent=/rate|limit|smtp|sending/i.test(x.message)?'Mail konnte nicht gesendet werden – bitte beim Admin melden.':x.message;}
  });
}

window.Cloud={load,peek,save,flush,login,logout,requireLogin,changePassword,
  user:()=>session&&session.user,on:f=>listeners.add(f),configured:()=>!/HIER_/.test(CFG.url+CFG.key)};
})();
