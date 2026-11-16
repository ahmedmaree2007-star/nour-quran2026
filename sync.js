/* sync.js — ربط الموقع والأدمن بـ Firebase (Firestore REST) */
(function(){
const API_KEY="AIzaSyAGJCYP_RIXQaHVuQU1_slM9d-KCX2DiUs"; // تأكد منه من Firebase > Project settings
const PID="qurran2026-e15db";
const DOC="https://firestore.googleapis.com/v1/projects/"+PID+"/databases/(default)/documents/site/results";

if(document.getElementById("authForm")){
  /* ===== صفحة الأدمن ===== */
  let pw="",tok="",tokAt=0,timer=null;
  document.getElementById("authForm").addEventListener("submit",()=>{pw=document.getElementById("aPass").value},true);

  const b=document.createElement("div");
  b.style.cssText="position:fixed;bottom:12px;left:12px;color:#fff;padding:8px 14px;border-radius:10px;font:600 .85rem Cairo,sans-serif;z-index:99;display:none";
  document.body.appendChild(b);
  const st=(t,ok)=>{b.style.display="block";b.style.background=ok===false?"#b42318":"#0a3520";b.textContent=t;if(ok)setTimeout(()=>b.style.display="none",4000)};

  async function token(){
    if(tok&&Date.now()-tokAt<50*60*1000)return tok;
    const r=await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key="+API_KEY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:curEmail,password:pw,returnSecureToken:true})});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error&&j.error.message||"AUTH");
    tok=j.idToken;tokAt=Date.now();return tok;
  }

  const cache={};let cs="";
  async function publish(){
    if(cs!==db.salt){for(const k in cache)delete cache[k];cs=db.salt}
    st("⏳ جارٍ نشر النتائج...");
    try{
      const data={};
      for(const c of db.list){
        const h=cache[c.nid]||(cache[c.nid]=await hash(c.nid));
        data[h]=status(c)==="pass"?{n:c.name,s:"pass",l:c.level,m:c.m,t:c.t,x:total(c)}:{n:c.name,s:"fail"};
      }
      const t=await token();
      const body={fields:{json:{stringValue:JSON.stringify({salt:db.salt,iter:ITER,data})}}};
      const r=await fetch(DOC+"?key="+API_KEY,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body:JSON.stringify(body)});
      if(!r.ok)throw new Error("HTTP "+r.status);
      st("✅ تم نشر "+db.list.length+" متسابق على الموقع",true);
    }catch(e){st("❌ فشل النشر: "+e.message,false)}
  }

  /* نشر تلقائي بعد كل حفظ */
  const oldEnc=encryptDb;
  encryptDb=async function(){await oldEnc();clearTimeout(timer);if(pw)timer=setTimeout(publish,1500)};

  /* أزرار إضافية في تاب النشر */
  const sec=document.getElementById("publish"),d=document.createElement("div");
  d.className="card";
  d.innerHTML='<h3>☁️ النشر المباشر</h3><p class="hint">أي إضافة أو تعديل أو حذف يُنشر تلقائيًا على الموقع بعد ثانيتين.</p><button class="b gold" id="pubNow">نشر الآن</button> <button class="b red" id="clrAll">مسح كل المتسابقين</button>';
  sec.insertBefore(d,sec.children[1]);
  document.getElementById("pubNow").onclick=publish;
  document.getElementById("clrAll").onclick=async()=>{
    if(!db.list.length)return say(false,"لا يوجد متسابقين");
    if(!confirm("سيتم حذف "+db.list.length+" متسابق نهائيًا من الأدمن ومن الموقع. متأكد؟"))return;
    if(!confirm("تأكيد أخير: لا يمكن التراجع. هل صدّرت نسخة Excel احتياطية؟"))return;
    db.list=[];await save();say(true,"تم مسح الكل");
  };
}else{
  /* ===== صفحة المستخدمين ===== */
  const oldLoad=load;
  load=async function(){
    if(location.protocol==="file:")throw new Error("FILE");
    if(!window.crypto||!crypto.subtle)throw new Error("HTTPS");
    try{
      const r=await fetch(DOC+"?key="+API_KEY,{cache:"no-store"});
      if(r.ok){const j=await r.json();return JSON.parse(j.fields.json.stringValue)}
    }catch(e){}
    return oldLoad();
  };
}
})();
