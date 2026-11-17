/* MTV Abrechnung – Admin-Login (normales Supabase-Konto aus dem Trainer-Cockpit) + Funktionsaufrufe */
(function(){
'use strict';
const CFG={url:'https://igirlnoegyhietojxpds.supabase.co',key:'sb_publishable_FqIAHj2wPerBC4Fv3YbqDQ_53_Z-GaY'};
const LS_SESSION='mtvv_admin_session',LS_MAIL='mtvv_admin_email';
const ls={get(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},
          set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},
          del(k){try{localStorage.removeItem(k);}catch(e){}}};
let session=ls.get(LS_SESSION);

async function authReq(path,body){
  const r=await fetch(CFG.url+'/auth/v1/'+path,{method:'POST',headers:{'apikey':CFG.key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error_description||j.msg||j.message||('Fehler '+r.status));
  return j;
}
function setSession(j){
  session={access_token:j.access_token,refresh_token:j.refresh_token,expires_at:Date.now()+(j.expires_in||3600)*1000,user:{id:j.user.id,email:j.user.email}};
  ls.set(LS_SESSION,session);
}
async function token(){
  if(!session)throw new Error('nicht angemeldet');
  if(Date.now()<session.expires_at-60000)return session.access_token;
  try{setSession(await authReq('token?grant_type=refresh_token',{refresh_token:session.refresh_token}));}
  catch(e){session=null;ls.del(LS_SESSION);throw new Error('Sitzung abgelaufen – bitte neu anmelden.');}
  return session.access_token;
}
async function rpc(fn,args){
  const r=await fetch(CFG.url+'/rest/v1/rpc/'+fn,{method:'POST',headers:{'apikey':CFG.key,'Authorization':'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify(args||{})});
  const j=await r.json().catch(()=>null);
  if(!r.ok)throw new Error(j&&j.message||('Fehler '+r.status));
  return j;
}
/* eigenes Cockpit-Dokument lesen (für die Übernahme) */
async function doc(key){
  const r=await fetch(CFG.url+'/rest/v1/user_docs?key=eq.'+encodeURIComponent(key)+'&select=data',{headers:{'apikey':CFG.key,'Authorization':'Bearer '+await token()}});
  const j=await r.json().catch(()=>[]);return r.ok&&j[0]?j[0].data:null;
}
async function login(email,pw){setSession(await authReq('token?grant_type=password',{email,password:pw}));}
function logout(){session=null;ls.del(LS_SESSION);}

function requireLogin(onReady,opts){
  opts=opts||{};
  if(session){onReady(session.user);return;}
  const ov=document.createElement('div');
  ov.innerHTML=`<style>
    .cl-ov{position:fixed;inset:0;z-index:9999;background:rgba(10,10,12,.72);display:flex;align-items:center;justify-content:center;padding:16px;font:15px/1.4 -apple-system,system-ui,sans-serif}
    .cl-ov form{background:#fff;color:#1a1a1a;border-radius:16px;padding:22px;width:100%;max-width:360px;box-shadow:0 20px 50px rgba(0,0,0,.4);border-top:4px solid #c8102e}
    .cl-ov h2{margin:0 0 4px;font-size:19px}.cl-ov p{margin:0 0 14px;color:#666;font-size:13px}
    .cl-ov input{width:100%;box-sizing:border-box;margin:0 0 10px;padding:11px 12px;border:1px solid #ccc;border-radius:10px;font-size:16px}
    .cl-ov button{width:100%;padding:12px;border:0;border-radius:10px;background:#c8102e;color:#fff;font-weight:700;font-size:16px}
    .cl-ov .err{color:#c8102e;font-size:13px;min-height:18px;margin-top:8px}</style>
    <div class="cl-ov"><form><h2>${opts.title||'Admin'}</h2><p>Anmelden mit deinem Trainer-Cockpit-Konto.</p>
    <input type="email" name="e" placeholder="E-Mail" autocomplete="username" required>
    <input type="password" name="p" placeholder="Passwort" autocomplete="current-password" required>
    <button type="submit">Anmelden</button><div class="err"></div></form></div>`;
  document.body.appendChild(ov);
  const fm=ov.querySelector('form'),err=ov.querySelector('.err'),last=ls.get(LS_MAIL);
  if(last)fm.e.value=last;
  fm.addEventListener('submit',async e=>{
    e.preventDefault();err.textContent='…';
    try{await login(fm.e.value.trim(),fm.p.value);ls.set(LS_MAIL,fm.e.value.trim());ov.remove();onReady(session.user);}
    catch(x){err.textContent=/invalid/i.test(x.message)?'E-Mail oder Passwort falsch.':x.message;}
  });
}
window.Cloud={rpc,doc,login,logout,requireLogin,user:()=>session&&session.user};
})();
