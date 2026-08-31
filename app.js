// ================================================
//  404 Social App — app.js — Full v4
//  Firebase + All features + PWA
// ================================================
import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import{getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,signInWithPopup,GoogleAuthProvider,signOut,onAuthStateChanged,sendPasswordResetEmail,updateProfile}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import{getFirestore,doc,getDoc,setDoc,updateDoc,addDoc,deleteDoc,collection,query,where,orderBy,limit,onSnapshot,getDocs,serverTimestamp,increment,arrayUnion,arrayRemove,Timestamp}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import{getStorage,ref as sRef,uploadBytes,getDownloadURL}from"https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── Config ──
const app=initializeApp({apiKey:"AIzaSyCTGnFOK7m_xNod8mwBPB5HTgTP2BrNm6o",authDomain:"cyberintel-d0d4f.firebaseapp.com",projectId:"cyberintel-d0d4f",storageBucket:"cyberintel-d0d4f.appspot.com",messagingSenderId:"533279564815",appId:"1:533279564815:web:d373567c2be86311127af7a"});
const auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
const gp=new GoogleAuthProvider();
gp.setCustomParameters({client_id:"355037443320-g3s1413hs3krs1gpj4r1b9ifnigendqr.apps.googleusercontent.com"});

// ── Constants ──
const IMGBB="36b0e2658ed6fad2ca48081442f1539b";
const SITE="https://404error.qd.je";
const SUPPORT="soudadteam@gmail.com";
const ADMINS=["khwailedapp@gmail.com","khaledahmedelbrbary80@gmail.com"];
const DEF_AV="https://files.cdn-files-a.com/uploads/9487240/2000_699b80b0c7cc4.jpg";
const LOGO="https://i.ibb.co/KcrzVfTT/logo.png";
const ICON="https://i.ibb.co/nMmhQHsv/icon.png";

// ── State ──
let CU=null,CD=null,CP="home";
let regStep=1,regData={};
let pinBuf="",pinConfirm="",pinMode="enter";
let feedUnsub=null,notifUnsub=null,chatUnsub=null;
let chatId=null;
let mediaFile=null,mediaType=null;

// ── Utils ──
const $=id=>document.getElementById(id);
const $$=(s,c=document)=>c.querySelector(s);
const $qa=(s,c=document)=>[...c.querySelectorAll(s)];

function ago(ts){if(!ts)return"";const d=ts.toDate?ts.toDate():new Date(ts),diff=Date.now()-d.getTime(),m=Math.floor(diff/60000);if(m<1)return"الآن";if(m<60)return m+"د";const h=Math.floor(m/60);if(h<24)return h+"س";const dy=Math.floor(h/24);if(dy<7)return dy+"ي";return d.toLocaleDateString("ar-EG",{day:"numeric",month:"short"})}

function toast(msg,type="info",dur=3200){
  const ic={success:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,error:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,info:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`};
  const t=document.createElement("div");t.className=`toast ${type}`;t.innerHTML=`${ic[type]}<span>${msg}</span>`;
  $("tc").appendChild(t);setTimeout(()=>{t.classList.add("rm");setTimeout(()=>t.remove(),300)},dur);
}
window.showToast=toast;

function esc(t){return String(t).replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function linkify(text){
  return esc(text)
    .replace(/(https?:\/\/[^\s]+)/g,u=>`<a href="${u}" target="_blank" rel="noopener">${u}</a>`)
    .replace(/@(\w+)/g,(_,u)=>`<span class="pmention" onclick="byUsername('${u}')">@${u}</span>`);
}
function beep(){try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.connect(g);g.connect(c.destination);o.frequency.setValueAtTime(880,c.currentTime);o.frequency.exponentialRampToValueAtTime(440,c.currentTime+.1);g.gain.setValueAtTime(.22,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.3);o.start();o.stop(c.currentTime+.3)}catch{}}
function ulink(uid){return`${SITE}/u/${uid}`}

function vbadge(u){if(!u)return"";const m={app:`<span class="vi va" title="${u.verifyNote||'حساب التطبيق'}">✦</span>`,dev:`<span class="vi vd" title="${u.verifyNote||'مبرمج'}">⟨/⟩</span>`,verified:`<span class="vi vv" title="${u.verifyNote||'موثق'}">✓</span>`,pro:`<span class="vi vp" title="${u.verifyNote||'Pro'}">★</span>`};return m[u.verificationType]||""}
function pbadge(u){if(!u)return"";if(u.role==="admin")return`<span class="badge ba">أدمن</span>`;if(u.isPro)return`<span class="badge bp">Pro</span>`;if(u.isPlus)return`<span class="badge bl">Plus</span>`;return""}

async function imgbb(file){const f=new FormData();f.append("image",file);const r=await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB}`,{method:"POST",body:f});const j=await r.json();if(j.success)return j.data.url;throw new Error("فشل رفع الصورة")}

// Copy protection
document.addEventListener("copy",e=>{if(e.target?.closest?.(".mb,.chat-msgs,.code-blk,.cmts-text")){e.preventDefault();toast("النسخ غير مسموح هنا","error")}});
document.addEventListener("contextmenu",e=>{if(e.target.tagName==="IMG")e.preventDefault()});
document.addEventListener("dragstart",e=>{if(e.target.tagName==="IMG")e.preventDefault()});

// ── PWA Manifest inline ──
function injectManifest(){
  const m={name:"404",short_name:"404",description:"شبكة اجتماعية من عالم مختلف",start_url:"/",scope:"/",display:"standalone",background_color:"#000",theme_color:"#000",orientation:"portrait-primary",lang:"ar",dir:"rtl",
    icons:[{src:ICON,sizes:"192x192",type:"image/png",purpose:"any maskable"},{src:ICON,sizes:"512x512",type:"image/png",purpose:"any maskable"}]};
  const blob=new Blob([JSON.stringify(m)],{type:"application/json"});
  const link=document.createElement("link");link.rel="manifest";link.href=URL.createObjectURL(blob);
  document.head.appendChild(link);
}
injectManifest();

// ── Service Worker ──
if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{});

// ── PWA Install ──
let deferredInstall=null;
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;setTimeout(showInstallBanner,4000)});
function showInstallBanner(){
  if(!deferredInstall)return;
  const b=document.createElement("div");
  b.id="install-banner";
  b.style.cssText="position:fixed;bottom:72px;left:10px;right:10px;z-index:999;background:rgba(18,18,18,.98);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.15);border-radius:16px;padding:13px 14px;display:flex;align-items:center;gap:11px;box-shadow:0 8px 32px rgba(0,0,0,.6);animation:fiu .4s ease";
  b.innerHTML=`<img src="${ICON}" style="width:38px;height:38px;border-radius:10px;flex-shrink:0;object-fit:contain" onerror="this.style.display='none'"><div style="flex:1"><div style="font-size:.88rem;font-weight:700;margin-bottom:1px">ثبّت تطبيق 404</div><div style="font-size:.73rem;color:rgba(255,255,255,.45)">تجربة أفضل كتطبيق</div></div><button onclick="installPWA()" style="background:#fff;color:#000;border:none;border-radius:20px;padding:7px 14px;font-weight:700;font-size:.83rem;cursor:pointer">تثبيت</button><button onclick="this.closest('#install-banner').remove()" style="background:none;border:none;color:rgba(255,255,255,.35);cursor:pointer;font-size:1.2rem;padding:0 2px">×</button>`;
  document.body.appendChild(b);
  setTimeout(()=>b.remove(),16000);
}
async function installPWA(){if(!deferredInstall)return;deferredInstall.prompt();const{outcome}=await deferredInstall.userChoice;if(outcome==="accepted")toast("تم تثبيت التطبيق ✓","success");deferredInstall=null;$("install-banner")?.remove()}
window.addEventListener("appinstalled",()=>toast("تم تثبيت 404 ✓","success"));

// ── Loading ──
function hideLoad(){setTimeout(()=>$("loading-screen")?.classList.add("hidden"),1100)}

// ── Cookies ──
function initCookies(){if(!localStorage.getItem("cookieConsent"))setTimeout(()=>$("cookie-banner")?.classList.remove("hidden"),2200)}
window.acceptCookies=()=>{localStorage.setItem("cookieConsent","all");$("cookie-banner").classList.add("hidden");toast("تم قبول الكوكيز ✓","success")};
window.declineCookies=()=>{localStorage.setItem("cookieConsent","minimal");$("cookie-banner").classList.add("hidden")};

// ── PIN ──
function showPin(mode="enter"){
  pinMode=mode;pinBuf="";
  $("pin-screen").classList.remove("hidden");
  renderDots();
  const m={enter:"أدخل رمز PIN للمتابعة",set:"اختر رمز PIN من 6 أرقام",confirm:"أكد رمز PIN"};
  $("pin-sub").textContent=m[mode];
}
function hidePin(){$("pin-screen").classList.add("hidden")}
function renderDots(){$qa(".pin-dot").forEach((d,i)=>{d.classList.toggle("filled",i<pinBuf.length);d.classList.remove("error")})}

function pinPress(v){
  if(v==="del"){pinBuf=pinBuf.slice(0,-1);renderDots();return}
  if(pinBuf.length>=6)return;
  pinBuf+=v;renderDots();
  if(pinBuf.length===6)setTimeout(pinDone,150);
}

async function pinDone(){
  const stored=localStorage.getItem("userPin");
  if(pinMode==="enter"){
    if(pinBuf===stored){hidePin();showApp()}
    else{
      $qa(".pin-dot").forEach(d=>d.classList.add("error"));
      $("pin-dots").classList.add("pin-shake");
      setTimeout(()=>{$("pin-dots").classList.remove("pin-shake");pinBuf="";renderDots()},600);
      toast("رمز PIN غير صحيح","error");
    }
  }else if(pinMode==="set"){
    pinConfirm=pinBuf;pinBuf="";renderDots();showPin("confirm");
  }else{
    if(pinBuf===pinConfirm){
      localStorage.setItem("userPin",pinBuf);
      if(CU)await updateDoc(doc(db,"users",CU.uid),{pinHash:pinBuf}).catch(()=>{});
      hidePin();showApp();toast("تم ضبط رمز PIN ✓","success");
    }else{
      $qa(".pin-dot").forEach(d=>d.classList.add("error"));
      toast("الرمزان غير متطابقين","error");pinBuf="";renderDots();
    }
  }
}
window.pinPress=pinPress;
window.tryBiometric=()=>toast("البصمة ستكون متاحة قريباً","info");

// ── Auth State ──
onAuthStateChanged(auth,async user=>{
  hideLoad();initCookies();
  if(!user){showAuthSection();return}
  CU=user;
  try{
    const snap=await getDoc(doc(db,"users",user.uid));
    if(!snap.exists()){showAuthSection();return}
    CD=snap.data();
    if(CD.banned){showBanned(CD.banReason);return}
    localStorage.setItem("lastUid",user.uid);
    // check pro expiry
    if(CD.proExpiresAt&&CD.isPro){
      const exp=CD.proExpiresAt.toDate?.()??new Date(CD.proExpiresAt);
      if(exp<new Date()){await updateDoc(doc(db,"users",user.uid),{isPro:false,isPlus:false,proExpiresAt:null});CD.isPro=false;CD.isPlus=false}
    }
    const pin=localStorage.getItem("userPin");
    if(pin)showPin("enter");
    else if(!CD.pinHash)showPin("set");
    else showApp();
    updateDoc(doc(db,"users",user.uid),{lastSeen:serverTimestamp()}).catch(()=>{});
  }catch{toast("خطأ في تحميل البيانات","error");showAuthSection()}
});

// ── Sections ──
function showAuthSection(){$("auth-section").classList.remove("hidden");$("app").classList.add("hidden");$("pin-screen").classList.add("hidden");$("banned-screen").classList.add("hidden");showLogin()}
function showApp(){
  $("auth-section").classList.add("hidden");$("app").classList.remove("hidden");$("pin-screen").classList.add("hidden");
  buildNav();loadMeData();go("home");subNotifs();
  history.replaceState({page:"home"},"","#home");window._ns=["home"];
}
function showBanned(reason){
  $("banned-screen").classList.remove("hidden");$("auth-section").classList.add("hidden");$("app").classList.add("hidden");
  const rb=$("ban-reason");if(rb&&reason){rb.textContent="السبب: "+reason;rb.style.display="block"}
}
async function loadMeData(){if(!CU)return;const s=await getDoc(doc(db,"users",CU.uid));if(s.exists()){CD=s.data();$qa(".cu-av").forEach(a=>a.src=CD?.photoURL||DEF_AV)}}

// ── Auth forms ──
function showLogin(){$("register-form").style.display="none";$("login-form").style.display="block";$("forgot-form").style.display="none"}
function showRegister(){$("login-form").style.display="none";$("register-form").style.display="block";$("forgot-form").style.display="none";regStep=1;renderReg()}
function showForgot(){$("login-form").style.display="none";$("forgot-form").style.display="block"}
window.showLogin=showLogin;window.showRegister=showRegister;window.showForgot=showForgot;

function renderReg(){
  $qa(".reg-step").forEach(s=>s.style.display="none");
  const el=$(`rs${regStep}`);if(el)el.style.display="block";
  $qa(".step-dot").forEach((d,i)=>{d.classList.toggle("active",i+1===regStep);d.classList.toggle("done",i+1<regStep)});
  const ls=["البيانات الشخصية","بيانات التواصل","بيانات الأمان","أمان الدخول"];
  const l=$("slbl");if(l)l.textContent=ls[regStep-1]||"";
  const b=$("reg-btn");if(b)b.textContent=regStep<4?"التالي":"إنشاء الحساب";
}

async function nextReg(){
  if(regStep===1){
    const fn=$("r-fn").value.trim(),dob=$("r-dob").value,nat=$("r-nat").value;
    if(!fn||!dob||!nat){toast("أكمل جميع الحقول","error");return}
    regData={fullName:fn,dob,age:Math.floor((Date.now()-new Date(dob))/(365.25*24*3600*1000)),nationality:nat};regStep=2;renderReg();
  }else if(regStep===2){
    const un=$("r-un").value.trim().toLowerCase(),cc=$("r-cc").value,ph=$("r-ph").value.trim(),em=$("r-em").value.trim(),ec=$("r-ec").value.trim();
    if(!un||!ph||!em||!ec){toast("أكمل جميع الحقول","error");return}
    if(em!==ec){toast("البريدان غير متطابقان","error");return}
    if(un.length<3){toast("اسم المستخدم قصير","error");return}
    const usnap=await getDocs(query(collection(db,"users"),where("username","==",un)));
    if(!usnap.empty){toast("اسم المستخدم مستخدم بالفعل","error");return}
    regData={...regData,username:un,countryCode:cc,phone:ph,email:em};regStep=3;renderReg();
  }else if(regStep===3){
    const pw=$("r-pw").value,pc=$("r-pc").value;
    if(pw.length<8){toast("كلمة المرور 8 أحرف على الأقل","error");return}
    if(pw!==pc){toast("كلمتا المرور غير متطابقتين","error");return}
    regData.password=pw;regStep=4;renderReg();
  }else{
    const p1=$("r-pin").value,p2=$("r-pinc").value;
    if(!/^\d{6}$/.test(p1)){toast("PIN يجب أن يكون 6 أرقام","error");return}
    if(p1!==p2){toast("رمزا PIN غير متطابقين","error");return}
    regData.pin=p1;await doReg();
  }
}
window.nextReg=nextReg;

async function doReg(){
  const b=$("reg-btn");if(b){b.disabled=true;b.textContent="جاري الإنشاء..."}
  try{
    const cred=await createUserWithEmailAndPassword(auth,regData.email,regData.password);
    const uid=cred.user.uid,isA=ADMINS.includes(regData.email),isDev=regData.email==="khaledahmedelbrbary80@gmail.com";
    const ud={uid,fullName:regData.fullName,username:regData.username,email:regData.email,dob:regData.dob,age:regData.age,nationality:regData.nationality,countryCode:regData.countryCode,phone:regData.phone,photoURL:DEF_AV,bio:"",links:[],role:isA?"admin":"user",isPro:isA,isPlus:false,proExpiresAt:null,verificationType:isDev?"dev":isA?"app":null,verifyNote:isDev?"مبرمج التطبيق":isA?"حساب التطبيق":null,banned:false,banReason:"",isPrivate:false,followAutoAccept:true,followers:[],following:[],followRequests:[],postsCount:0,pinnedPost:null,profileLink:ulink(uid),createdAt:serverTimestamp(),lastSeen:serverTimestamp(),pinHash:regData.pin,notifCount:0};
    await setDoc(doc(db,"users",uid),ud);
    localStorage.setItem("userPin",regData.pin);
    await updateProfile(cred.user,{displayName:regData.fullName});
    await welcomeNotif(uid,regData.fullName,regData.email);
    CD=ud;showApp();
  }catch(e){toast(e.message||"خطأ في إنشاء الحساب","error");if(b){b.disabled=false;b.textContent="إنشاء الحساب"}}
}

async function welcomeNotif(uid,name,email){
  await addDoc(collection(db,"notifications"),{toUid:uid,type:"welcome",text:`أهلاً بك يا ${name} في تطبيق 404 👋`,fromUid:"system",fromPhoto:LOGO,read:false,createdAt:serverTimestamp()}).catch(()=>{});
  await addDoc(collection(db,"emailQueue"),{to:email,subject:`Welcome ${name} — 404`,body:`Welcome ${name}, a user has logged into your account and\n\nأهلاً بك يا ${name}، قام أحد المستخدمين بالدخول إلى حسابك\n\n${SITE}`,createdAt:serverTimestamp()}).catch(()=>{});
}

async function doLogin(){
  const em=$("l-em").value.trim(),pw=$("l-pw").value;
  if(!em||!pw){toast("أدخل البريد وكلمة المرور","error");return}
  const b=$("l-btn");b.disabled=true;b.textContent="جاري الدخول...";
  try{await signInWithEmailAndPassword(auth,em,pw)}
  catch{toast("بيانات غير صحيحة","error");b.disabled=false;b.textContent="تسجيل الدخول"}
}
window.doLogin=doLogin;

async function doGoogleLogin(){
  try{
    const res=await signInWithPopup(auth,gp);
    const user=res.user;
    const snap=await getDoc(doc(db,"users",user.uid));
    if(!snap.exists()){
      // Need to complete profile
      window._gcCb=async gd=>{
        const isA=ADMINS.includes(user.email),isDev=user.email==="khaledahmedelbrbary80@gmail.com";
        const us=await getDocs(query(collection(db,"users"),where("username","==",gd.username)));
        if(!us.empty){toast("اسم المستخدم مستخدم","error");return false}
        const age=Math.floor((Date.now()-new Date(gd.dob))/(365.25*24*3600*1000));
        const ud={uid:user.uid,fullName:user.displayName||gd.username,username:gd.username,email:user.email,dob:gd.dob,age,nationality:gd.nationality,countryCode:gd.countryCode,phone:gd.phone,photoURL:user.photoURL||DEF_AV,bio:"",links:[],role:isA?"admin":"user",isPro:isA,isPlus:false,proExpiresAt:null,verificationType:isDev?"dev":isA?"app":null,verifyNote:isDev?"مبرمج التطبيق":isA?"حساب التطبيق":null,banned:false,banReason:"",isPrivate:false,followAutoAccept:true,followers:[],following:[],followRequests:[],postsCount:0,pinnedPost:null,profileLink:ulink(user.uid),createdAt:serverTimestamp(),lastSeen:serverTimestamp(),pinHash:gd.pin,notifCount:0};
        await setDoc(doc(db,"users",user.uid),ud);
        localStorage.setItem("userPin",gd.pin);
        await welcomeNotif(user.uid,ud.fullName,user.email);
        CU=user;CD=ud;$("gc-modal").classList.remove("open");showApp();return true;
      };
      openGCModal();
    }
  }catch(e){toast("فشل تسجيل الدخول بجوجل: "+(e.message||""),"error")}
}
window.doGoogleLogin=doGoogleLogin;

function openGCModal(){$("gc-modal").classList.add("open");window._gcStep=1;renderGC()}
function renderGC(){
  const s=window._gcStep||1;
  ["gc1","gc2","gc3"].forEach((id,i)=>{const el=$(id);if(el)el.style.display=i+1===s?"block":"none"});
  $qa("#gc-ind .step-dot").forEach((d,i)=>{d.classList.toggle("active",i+1===s);d.classList.toggle("done",i+1<s)});
  const ls=["البيانات الشخصية","بيانات التواصل","رمز الأمان"];
  const l=$("gc-lbl");if(l)l.textContent=ls[s-1]||"";
  const b=$("gc-btn");if(b)b.textContent=s<3?"التالي":"إنشاء الحساب";
}
async function gcNext(){
  const s=window._gcStep||1;
  if(s===1){
    const u=$("gc-un")?.value.trim().toLowerCase(),dob=$("gc-dob")?.value,nat=$("gc-nat")?.value;
    if(!u||!dob||!nat){toast("أكمل جميع الحقول","error");return}
    window._gcD={username:u,dob,nationality:nat};window._gcStep=2;renderGC();
  }else if(s===2){
    const cc=$("gc-cc")?.value,ph=$("gc-ph")?.value.trim();
    if(!ph){toast("أدخل رقم الهاتف","error");return}
    window._gcD={...window._gcD,countryCode:cc,phone:ph};window._gcStep=3;renderGC();
  }else{
    const p=$("gc-pin")?.value,pc=$("gc-pinc")?.value;
    if(!/^\d{6}$/.test(p)){toast("PIN يجب أن يكون 6 أرقام","error");return}
    if(p!==pc){toast("رمزا PIN غير متطابقين","error");return}
    window._gcD.pin=p;
    const b=$("gc-btn");if(b){b.disabled=true;b.textContent="جاري الإنشاء..."}
    const ok=await window._gcCb?.(window._gcD);
    if(!ok&&b){b.disabled=false;b.textContent="إنشاء الحساب"}
  }
}
window.gcNext=gcNext;

async function doForgot(){
  const em=$("f-em").value.trim();
  if(!em){toast("أدخل بريدك الإلكتروني","error");return}
  try{await sendPasswordResetEmail(auth,em);toast("تم إرسال رابط الاستعادة ✓","success");showLogin()}
  catch{toast("البريد غير موجود","error")}
}
window.doForgot=doForgot;

async function doLogout(){
  if(notifUnsub)notifUnsub();if(feedUnsub)feedUnsub();
  await signOut(auth);localStorage.removeItem("userPin");showAuthSection();
}
window.doLogout=doLogout;

// ── Navigation ──
function go(page,push=true){
  CP=page;
  $qa(".page").forEach(p=>p.classList.remove("active"));
  $(`page-${page}`)?.classList.add("active");
  $qa(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  if(push){window._ns=window._ns||[];window._ns.push(page);try{history.pushState({page},"","#"+page)}catch{}}
  if(page==="home")loadFeed();
  else if(page==="explore")loadExplore();
  else if(page==="messages")loadMessages();
  else if(page==="profile")loadOwnProfile();
  else if(page==="coding")loadCoding();
  else if(page==="admin"&&CD?.role==="admin")loadAdmin();
}
window.navigateTo=go;

window.addEventListener("popstate",e=>{
  const s=window._ns||[];
  if(s.length>1){s.pop();go(s[s.length-1],false)}
  else{
    history.pushState({page:"home"},"","#home");
    const modals=$qa(".modal.open,.gc-modal.open");
    if(modals.length)modals[modals.length-1].classList.remove("open");
    else{
      if(!window._ep){window._ep=true;toast("اضغط مرة أخرى للخروج","info",2000);setTimeout(()=>window._ep=false,2200)}
    }
  }
});

function buildNav(){
  const nav=$("bot-nav");if(!nav)return;
  const isA=CD?.role==="admin";
  nav.innerHTML=`
    <div class="nav-btn active" data-page="home" onclick="navigateTo('home')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg><span>الرئيسية</span></div>
    <div class="nav-btn" data-page="explore" onclick="navigateTo('explore')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><span>استكشاف</span></div>
    <div class="nav-btn" data-page="coding" onclick="navigateTo('coding')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg><span>البرمجة</span></div>
    <div class="nav-btn" data-page="messages" onclick="navigateTo('messages')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><span>الرسائل</span></div>
    <div class="nav-btn" data-page="profile" onclick="navigateTo('profile')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><span>حسابي</span></div>
    ${isA?`<div class="nav-btn" data-page="admin" onclick="navigateTo('admin')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg><span>الإدارة</span></div>`:""}`;
}

// ── Stories ──
async function loadStories(){
  const bar=$("stories-bar");if(!bar)return;
  bar.innerHTML=`<div class="story-item" onclick="addStory()"><div class="story-add"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div><div class="story-name">قصتك</div></div>`;
  try{
    const q=query(collection(db,"stories"),where("expiresAt",">=",Timestamp.now()),orderBy("expiresAt"),limit(20));
    const snap=await getDocs(q);const seen=new Set();
    snap.forEach(d=>{
      const s=d.data();if(seen.has(s.uid))return;seen.add(s.uid);
      const div=document.createElement("div");div.className="story-item";
      div.innerHTML=`<div class="story-av ${s.seen?.includes(CU?.uid)?"":" hs"}"><img src="${s.userPhoto||DEF_AV}" onerror="this.src='${DEF_AV}'"></div><div class="story-name">${esc(s.displayName?.split(" ")[0]||"")}</div>`;
      div.onclick=()=>viewStory(s.uid);bar.appendChild(div);
    });
  }catch{}
}

async function addStory(){
  const input=document.createElement("input");input.type="file";input.accept="image/*";
  input.onchange=async e=>{
    const file=e.target.files[0];if(!file)return;
    toast("جاري نشر القصة...","info");
    try{
      const url=await imgbb(file);
      await addDoc(collection(db,"stories"),{uid:CU.uid,username:CD.username,displayName:CD.fullName,userPhoto:CD.photoURL||DEF_AV,type:"image",mediaUrl:url,text:"",seen:[],createdAt:serverTimestamp(),expiresAt:Timestamp.fromDate(new Date(Date.now()+86400000))});
      toast("تم نشر القصة ✓","success");loadStories();
    }catch{toast("فشل نشر القصة","error")}
  };input.click();
}
window.addStory=addStory;

async function viewStory(uid){
  const viewer=$("story-viewer");if(!viewer)return;
  viewer.classList.remove("hidden");
  try{
    const q=query(collection(db,"stories"),where("uid","==",uid),where("expiresAt",">=",Timestamp.now()),orderBy("expiresAt"));
    const snap=await getDocs(q);const stories=snap.docs.map(d=>({...d.data(),id:d.id}));
    if(!stories.length){viewer.classList.add("hidden");return}
    let idx=0,timer=null;
    function render(i){
      const s=stories[i];if(!s){viewer.classList.add("hidden");return}
      const bars=$("sv-bars");bars.innerHTML="";
      stories.forEach((_,j)=>{const b=document.createElement("div");b.className="sv-bar";b.innerHTML=`<div class="sv-fill" id="svf${j}" style="width:${j<i?"100%":"0%"}"></div>`;bars.appendChild(b)});
      $("sv-av-img").src=s.userPhoto||DEF_AV;$("sv-nm").textContent=s.displayName||"";$("sv-ti").textContent=ago(s.createdAt);
      const cnt=$("sv-cnt");cnt.innerHTML=s.type==="image"?`<img src="${s.mediaUrl}" class="sv-img no-copy" alt="">`:  `<div class="sv-txt">${esc(s.text||"")}</div>`;
      if(!s.seen?.includes(CU?.uid))updateDoc(doc(db,"stories",s.id),{seen:arrayUnion(CU.uid)}).catch(()=>{});
      if(timer)clearInterval(timer);const fill=$(`svf${i}`);let pct=0;
      timer=setInterval(()=>{pct+=100/50;fill.style.width=pct+"%";if(pct>=100){clearInterval(timer);if(idx<stories.length-1){idx++;render(idx)}else viewer.classList.add("hidden")}},100);
    }
    render(idx);
    $("sv-close").onclick=()=>{clearInterval(timer);viewer.classList.add("hidden")};
    $("sv-next-zone").onclick=()=>{clearInterval(timer);if(idx<stories.length-1){idx++;render(idx)}else viewer.classList.add("hidden")};
    $("sv-prev-zone").onclick=()=>{clearInterval(timer);if(idx>0){idx--;render(idx)}};
  }catch{viewer.classList.add("hidden")}
}
window.viewStory=viewStory;

// ── Feed ──
async function loadFeed(tab="all"){
  const c=$("feed-posts");if(!c)return;
  c.innerHTML=`<div class="empty"><p style="color:var(--t3)">جاري التحميل...</p></div>`;
  if(feedUnsub)feedUnsub();
  loadStories();
  let q;
  if(tab==="following"&&CD?.following?.length)q=query(collection(db,"posts"),where("uid","in",CD.following.slice(0,10)),orderBy("createdAt","desc"),limit(30));
  else q=query(collection(db,"posts"),orderBy("createdAt","desc"),limit(30));
  feedUnsub=onSnapshot(q,snap=>{
    if(snap.empty){c.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><h3>لا توجد منشورات</h3><p>كن أول من ينشر!</p></div>`;return}
    c.innerHTML="";snap.forEach(d=>renderPost(d.data(),d.id,c));
  });
}
window.loadFeed=loadFeed;

function renderPost(post,pid,container){
  const div=document.createElement("div");div.className="post fiu";div.dataset.pid=pid;
  const liked=post.likes?.includes(CU?.uid),bookd=post.bookmarks?.includes(CU?.uid),pinned=post.pinned;
  div.innerHTML=`
    ${pinned?`<div class="pin-ind"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/></svg>منشور مثبّت</div>`:""}
    <div class="ph">
      <div class="pav" onclick="viewProfile('${post.uid}')"><img src="${post.userPhoto||DEF_AV}" onerror="this.src='${DEF_AV}'"></div>
      <div class="pui">
        <div class="pdn">${esc(post.displayName||"مستخدم")}${post.verifyBadge||""}${post.planBadge||""}</div>
        <div class="pun">@${esc(post.username||"user")} · <span class="pt">${ago(post.createdAt)}</span></div>
      </div>
      <div class="pmore dd" onclick="postMenu(this,'${pid}','${post.uid}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        <div class="ddm" id="pm-${pid}"></div>
      </div>
    </div>
    <div class="pbody">${linkify(post.text||"")}</div>
    ${postMedia(post)}${postPoll(post,pid)}
    <div class="pacts">
      <div class="pact ${liked?"liked":""}" onclick="toggleLike('${pid}',${!!liked})">
        <svg viewBox="0 0 24 24" fill="${liked?"currentColor":"none"}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <span class="pac">${post.likesCount||0}</span>
      </div>
      <div class="pact" onclick="openPost('${pid}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span class="pac">${post.commentsCount||0}</span>
      </div>
      <div class="pact" onclick="repost('${pid}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
        <span class="pac">${post.repostsCount||0}</span>
      </div>
      <div class="pact ${bookd?"bookd":""}" onclick="toggleBookmark('${pid}',${!!bookd})">
        <svg viewBox="0 0 24 24" fill="${bookd?"currentColor":"none"}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
      </div>
      <div class="pact" onclick="sharePost('${pid}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </div>
    </div>`;
  container.appendChild(div);
}

function postMedia(p){
  if(!p.mediaUrl)return"";
  if(p.mediaType==="video")return`<div class="pmedia"><div class="vid-wrap"><video preload="metadata" playsinline><source src="${p.mediaUrl}" type="video/mp4"></video><div class="vid-ctrl"><div class="vid-play" onclick="tvid(this)"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></div><div class="vid-prog" onclick="svid(this)"><div class="vid-fill" style="width:0%"></div></div><span class="vid-time">0:00</span><div class="vid-vol" onclick="mvid(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/></svg></div></div></div></div>`;
  if(p.mediaType==="audio")return`<div class="pmedia"><div class="aud-player"><div class="aud-play" onclick="taud(this)"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></div><div class="aud-inf"><div class="aud-name">${esc(p.mediaName||"صوت")}</div><div class="aud-prog" onclick="saud(this)"><div class="aud-fill"></div></div><div class="aud-times"><span class="ac">0:00</span><span class="ad">0:00</span></div></div><audio src="${p.mediaUrl}" style="display:none"></audio></div></div>`;
  if(p.mediaType==="pdf")return`<div class="pmedia"><div class="pdf-block" onclick="dlPdf('${p.mediaUrl}','${esc(p.mediaName||"ملف.pdf")}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><div><div class="pdf-name">${esc(p.mediaName||"ملف PDF")}</div><div class="pdf-size">اضغط للتحميل</div></div><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:17px;height:17px;color:var(--t3)"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg></div></div>`;
  return"";
}

function postPoll(post,pid){
  if(!post.poll)return"";
  const total=post.poll.options.reduce((s,o)=>s+(o.votes||0),0)||1;
  const voted=post.poll.voters?.[CU?.uid];
  return`<div class="poll">${post.poll.options.map((o,i)=>{
    const pct=Math.round(((o.votes||0)/total)*100);
    const isW=i===post.poll.options.reduce((mi,op,idx)=>op.votes>post.poll.options[mi].votes?idx:mi,0);
    return`<div class="poll-opt${voted===i?" voted":""}${voted!==undefined&&isW?" win":""}" onclick="votePoll('${pid}',${i})"><div class="poll-fill" style="width:${voted!==undefined?pct:0}%"></div><span class="poll-lbl">${esc(o.label)}</span>${voted!==undefined?`<span class="poll-pct">${pct}%</span>`:""}</div>`;
  }).join("")}<div class="poll-meta">${total===1?0:total-1} صوت</div></div>`;
}

async function votePoll(pid,idx){
  if(!CU)return;const ref=doc(db,"posts",pid);const snap=await getDoc(ref);
  if(!snap.exists())return;const p=snap.data();
  if(p.poll?.voters?.[CU.uid]!==undefined){toast("لقد صوّت بالفعل","info");return}
  const opts=[...p.poll.options];opts[idx]={...opts[idx],votes:(opts[idx].votes||0)+1};
  await updateDoc(ref,{"poll.options":opts,[`poll.voters.${CU.uid}`]:idx});
}
window.votePoll=votePoll;

function postMenu(el,pid,puid){
  const menu=$(`pm-${pid}`);const isOwn=puid===CU?.uid,isAdm=CD?.role==="admin",isPro=CD?.isPro;
  menu.innerHTML=`
    <div class="ddi" onclick="copyLink('${pid}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>نسخ الرابط</div>
    <div class="ddi" onclick="sharePost('${pid}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>مشاركة</div>
    ${(isOwn||isAdm)?`<div class="ddi danger" onclick="delPost('${pid}','${puid}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>حذف</div>`:""}
    ${isPro&&isOwn?`<div class="ddi" onclick="pinPost('${pid}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/></svg>تثبيت</div>`:""}
    ${!isOwn?`<div class="ddi danger" onclick="reportPost('${pid}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>إبلاغ</div>`:""}`;
  menu.classList.toggle("open");
  document.addEventListener("click",()=>menu.classList.remove("open"),{once:true});
}
window.postMenu=postMenu;

async function toggleLike(pid,liked){if(!CU)return;const ref=doc(db,"posts",pid);await updateDoc(ref,{likes:liked?arrayRemove(CU.uid):arrayUnion(CU.uid),likesCount:increment(liked?-1:1)});if(!liked){const s=await getDoc(ref);if(s.exists()&&s.data().uid!==CU.uid)addNotif(s.data().uid,"like",`${CD.fullName} أعجب بمنشورك`)}}
async function toggleBookmark(pid,bookd){if(!CU)return;await updateDoc(doc(db,"posts",pid),{bookmarks:bookd?arrayRemove(CU.uid):arrayUnion(CU.uid)});toast(bookd?"تمت إزالة الحفظ":"تم الحفظ ✓","success")}
async function repost(pid){await updateDoc(doc(db,"posts",pid),{repostsCount:increment(1)});toast("تمت إعادة النشر ✓","success")}
async function delPost(pid,puid){
  const isAdm=CD?.role==="admin";
  const reason=isAdm?prompt("سبب الحذف (الإدارة):"):null;
  if(!confirm("تأكيد حذف المنشور؟"))return;
  if(reason){const s=await getDoc(doc(db,"posts",pid));if(s.exists())addNotif(s.data().uid,"post_deleted",`تم حذف منشورك من قِبل الإدارة. السبب: ${reason}`)}
  await deleteDoc(doc(db,"posts",pid));toast("تم الحذف","success");
}
async function pinPost(pid){await updateDoc(doc(db,"posts",pid),{pinned:true});await updateDoc(doc(db,"users",CU.uid),{pinnedPost:pid});toast("تم التثبيت ✓","success")}
function copyLink(pid){navigator.clipboard.writeText(`${SITE}/post/${pid}`).then(()=>toast("تم نسخ الرابط ✓","success"))}
async function sharePost(pid){const link=`${SITE}/post/${pid}`;if(navigator.share)await navigator.share({title:"404",url:link});else{navigator.clipboard.writeText(link);toast("تم نسخ الرابط ✓","success")}}
async function reportPost(pid){await addDoc(collection(db,"reports"),{postId:pid,reportedBy:CU.uid,createdAt:serverTimestamp()});toast("تم الإبلاغ، سيراجعه الفريق","info")}
function dlPdf(url,name){const a=document.createElement("a");a.href=url;a.download=name;a.target="_blank";document.body.appendChild(a);a.click();document.body.removeChild(a)}
window.toggleLike=toggleLike;window.toggleBookmark=toggleBookmark;window.repost=repost;window.delPost=delPost;window.pinPost=pinPost;window.copyLink=copyLink;window.sharePost=sharePost;window.reportPost=reportPost;window.dlPdf=dlPdf;

// Compose
function openCompose(){$("compose-modal").classList.add("open");$("compose-ta").focus();$qa(".cu-av").forEach(a=>a.src=CD?.photoURL||DEF_AV)}
function closeCompose(){$("compose-modal").classList.remove("open");$("compose-ta").value="";mediaFile=null;mediaType=null;const p=$("compose-prev");if(p)p.style.display="none"}
window.openCompose=openCompose;window.closeCompose=closeCompose;

async function submitPost(){
  const text=$("compose-ta").value.trim();
  if(!text&&!mediaFile){toast("اكتب شيئاً","error");return}
  const b=$("post-btn");b.disabled=true;b.textContent="جاري النشر...";
  try{
    let mu=null,mt=null,mn=null;
    if(mediaFile){
      if(mediaType==="image"){mu=await imgbb(mediaFile);mt="image"}
      else{const r=sRef(storage,`posts/${CU.uid}/${Date.now()}_${mediaFile.name}`);await uploadBytes(r,mediaFile);mu=await getDownloadURL(r);mt=mediaType;mn=mediaFile.name}
    }
    await addDoc(collection(db,"posts"),{uid:CU.uid,username:CD.username,displayName:CD.fullName,userPhoto:CD.photoURL||DEF_AV,verifyBadge:vbadge(CD),planBadge:pbadge(CD),text,mediaUrl:mu,mediaType:mt,mediaName:mn,likes:[],likesCount:0,commentsCount:0,repostsCount:0,bookmarks:[],pinned:false,createdAt:serverTimestamp()});
    await updateDoc(doc(db,"users",CU.uid),{postsCount:increment(1)});
    closeCompose();toast("تم النشر ✓","success");
  }catch{toast("خطأ في النشر","error")}
  finally{b.disabled=false;b.textContent="نشر"}
}
window.submitPost=submitPost;

function attachMedia(type){
  const input=document.createElement("input");input.type="file";
  if(type==="image")input.accept="image/*";else if(type==="video")input.accept="video/mp4";else if(type==="audio")input.accept="audio/mp3,audio/mpeg";else if(type==="pdf")input.accept=".pdf";
  input.onchange=e=>{const f=e.target.files[0];if(!f)return;mediaFile=f;mediaType=type;const p=$("compose-prev");if(p){p.style.display="flex";p.querySelector(".mprev-name").textContent=f.name}};
  input.click();
}
window.attachMedia=attachMedia;

// Mention autocomplete
async function setupMention(ta,dd){
  ta.addEventListener("input",async()=>{
    const v=ta.value,ai=v.lastIndexOf("@");
    if(ai===-1||(v.length-ai>15)){dd.classList.remove("open");return}
    const q_=v.slice(ai+1).split(" ")[0];if(!q_){dd.classList.remove("open");return}
    const cands=[...(CD?.following||[]),...(CD?.followers||[])].slice(0,10);
    if(!cands.length)return;
    const snap=await getDocs(query(collection(db,"users"),where("uid","in",cands)));
    const res=snap.docs.map(d=>d.data()).filter(u=>u.username.includes(q_)||u.fullName.includes(q_));
    if(!res.length){dd.classList.remove("open");return}
    dd.innerHTML=res.slice(0,5).map(u=>`<div class="mdd-item" onclick="insertMention('${u.username}','${ta.id}','${dd.id}')"><img src="${u.photoURL||DEF_AV}" onerror="this.src='${DEF_AV}'"><div><div class="mdd-name">${esc(u.fullName)}${vbadge(u)}</div><div class="mdd-user">@${esc(u.username)}</div></div></div>`).join("");
    dd.classList.add("open");
  });
  ta.addEventListener("blur",()=>setTimeout(()=>dd.classList.remove("open"),200));
}
function insertMention(username,taId,ddId){const ta=$(taId);if(!ta)return;const v=ta.value,ai=v.lastIndexOf("@");if(ai!==-1)ta.value=v.slice(0,ai)+`@${username} `;$(ddId)?.classList.remove("open");ta.focus()}
window.insertMention=insertMention;

// Post detail + comments
async function openPost(pid){
  $("post-modal").classList.add("open");
  const snap=await getDoc(doc(db,"posts",pid));if(!snap.exists())return;
  const post=snap.data();
  $("post-detail").innerHTML=`
    <div class="post" style="border-bottom:none">
      <div class="ph"><div class="pav" onclick="viewProfile('${post.uid}')"><img src="${post.userPhoto||DEF_AV}" onerror="this.src='${DEF_AV}'"></div>
      <div class="pui"><div class="pdn">${esc(post.displayName)}${post.verifyBadge||""}</div><div class="pun">@${esc(post.username)}</div></div></div>
      <div class="pbody">${linkify(post.text||"")}</div>${postMedia(post)}
    </div>
    <div id="cmts-list"></div>
    <div class="cmts-inp-area" style="position:relative">
      <div class="avsm"><img src="${CD?.photoURL||DEF_AV}" class="cu-av"></div>
      <div style="flex:1;position:relative">
        <input class="fi" id="cmts-inp" placeholder="اكتب تعليقاً... @ للمنشن">
        <div class="mention-dd" id="cmts-mdd"></div>
      </div>
      <button class="btn btn-p btn-sm" onclick="submitCmt('${pid}')">إرسال</button>
    </div>`;
  loadCmts(pid);
  const ci=$("cmts-inp"),cd=$("cmts-mdd");if(ci&&cd)setupMention(ci,cd);
}
function closePost(){$("post-modal").classList.remove("open")}
window.openPost=openPost;window.closePost=closePost;

function loadCmts(pid){
  const c=$("cmts-list");if(!c)return;
  const q=query(collection(db,"posts",pid,"comments"),orderBy("createdAt","asc"),limit(60));
  onSnapshot(q,snap=>{
    c.innerHTML="";
    snap.forEach(d=>{
      const cm=d.data();const liked=cm.likes?.includes(CU?.uid);
      const div=document.createElement("div");div.className="cmts-item";
      div.innerHTML=`<div class="cmts-av" onclick="viewProfile('${cm.uid}')"><img src="${cm.userPhoto||DEF_AV}" onerror="this.src='${DEF_AV}'"></div>
      <div class="cmts-body">
        <div class="cmts-user">${esc(cm.displayName)}<span style="font-weight:400;color:var(--t3);font-size:.7rem">@${esc(cm.username)}</span></div>
        <div class="cmts-text no-copy">${linkify(cm.text)}</div>
        <div class="cmts-acts">
          <span class="cmts-act ${liked?"liked":""}" onclick="likeCmt('${pid}','${d.id}',${!!liked})"><svg viewBox="0 0 24 24" fill="${liked?"currentColor":"none"}" stroke="currentColor" stroke-width="2" style="width:12px;height:12px"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>${cm.likesCount||0}</span>
          <span class="cmts-act" onclick="replyCmt('${cm.username}')">رد</span>
          <span class="cmts-act" style="font-family:var(--fm)">${ago(cm.createdAt)}</span>
          ${cm.uid===CU?.uid?`<span class="cmts-act" style="color:var(--red)" onclick="delCmt('${pid}','${d.id}')">حذف</span>`:""}
        </div>
      </div>`;
      c.appendChild(div);
    });
  });
}

async function likeCmt(pid,cid,liked){const r=doc(db,"posts",pid,"comments",cid);await updateDoc(r,{likes:liked?arrayRemove(CU.uid):arrayUnion(CU.uid),likesCount:increment(liked?-1:1)})}
async function delCmt(pid,cid){await deleteDoc(doc(db,"posts",pid,"comments",cid));await updateDoc(doc(db,"posts",pid),{commentsCount:increment(-1)})}
function replyCmt(un){const ci=$("cmts-inp");if(ci){ci.value=`@${un} `;ci.focus()}}
async function submitCmt(pid){
  const ci=$("cmts-inp");const text=ci.value.trim();if(!text)return;
  await addDoc(collection(db,"posts",pid,"comments"),{uid:CU.uid,username:CD.username,displayName:CD.fullName,userPhoto:CD.photoURL||DEF_AV,text,likes:[],likesCount:0,createdAt:serverTimestamp()});
  await updateDoc(doc(db,"posts",pid),{commentsCount:increment(1)});ci.value="";
  const s=await getDoc(doc(db,"posts",pid));if(s.exists()&&s.data().uid!==CU.uid)addNotif(s.data().uid,"comment",`${CD.fullName} علّق على منشورك`);
}
window.likeCmt=likeCmt;window.delCmt=delCmt;window.replyCmt=replyCmt;window.submitCmt=submitCmt;

// ── Explore + Search ──
async function loadExplore(){
  const c=$("explore-users");if(!c)return;
  c.innerHTML=`<div class="empty"><p>جاري التحميل...</p></div>`;
  const snap=await getDocs(query(collection(db,"users"),limit(30)));
  renderUsers(snap.docs.map(d=>d.data()).filter(u=>u.uid!==CU?.uid),c);
}

async function searchUsers(q_){
  const c=$("explore-users");if(!c)return;
  if(!q_){loadExplore();return}
  c.innerHTML=`<div class="empty"><p>جاري البحث...</p></div>`;
  const[bu,bn]=await Promise.all([
    getDocs(query(collection(db,"users"),where("username",">=",q_.toLowerCase()),where("username","<=",q_.toLowerCase()+"\uf8ff"),limit(15))),
    getDocs(query(collection(db,"users"),where("fullName",">=",q_),where("fullName","<=",q_+"\uf8ff"),limit(15)))
  ]);
  const seen=new Set(),users=[];
  [...bu.docs,...bn.docs].forEach(d=>{const u=d.data();if(!seen.has(u.uid)&&u.uid!==CU?.uid){seen.add(u.uid);users.push(u)}});
  if(!users.length){c.innerHTML=`<div class="empty"><p>لا توجد نتائج</p></div>`;return}
  renderUsers(users,c);
}
window.searchUsers=searchUsers;

function renderUsers(users,c){
  c.innerHTML="";
  users.forEach(u=>{
    const isF=CD?.following?.includes(u.uid);
    const div=document.createElement("div");div.className="usr-row";
    div.innerHTML=`<div class="usr-av"><img src="${u.photoURL||DEF_AV}" onerror="this.src='${DEF_AV}'"></div>
      <div class="usr-inf"><div class="usr-dn">${esc(u.fullName)}${vbadge(u)}${pbadge(u)}</div><div class="usr-un">@${esc(u.username)}</div><div class="usr-bio">${esc(u.bio||"")}</div></div>
      <button class="btn btn-g btn-sm" onclick="toggleFollow('${u.uid}',this)">${isF?"متابَع":"متابعة"}</button>`;
    div.querySelector(".usr-av").onclick=()=>viewProfile(u.uid);c.appendChild(div);
  });
}

// ── Follow ──
async function toggleFollow(uid,btn){
  if(!CU||uid===CU.uid)return;
  const isF=CD?.following?.includes(uid);
  const ts=await getDoc(doc(db,"users",uid));if(!ts.exists())return;const tu=ts.data();
  if(isF){
    await updateDoc(doc(db,"users",CU.uid),{following:arrayRemove(uid)});
    await updateDoc(doc(db,"users",uid),{followers:arrayRemove(CU.uid)});
    CD.following=(CD.following||[]).filter(i=>i!==uid);if(btn)btn.textContent="متابعة";
  }else{
    if(tu.isPrivate&&!tu.followAutoAccept){
      await updateDoc(doc(db,"users",uid),{followRequests:arrayUnion(CU.uid)});
      addNotif(uid,"followRequest",`${CD.fullName} طلب متابعتك`);
      if(btn)btn.textContent="طلب أُرسل";toast("تم إرسال طلب المتابعة","info");return;
    }
    await updateDoc(doc(db,"users",CU.uid),{following:arrayUnion(uid)});
    await updateDoc(doc(db,"users",uid),{followers:arrayUnion(CU.uid)});
    CD.following=[...(CD.following||[]),uid];if(btn)btn.textContent="متابَع";
    addNotif(uid,"follow",`${CD.fullName} بدأ متابعتك`);
  }
}
window.toggleFollow=toggleFollow;

// ── Profile ──
async function loadOwnProfile(){if(CU)renderProfile(CD,true)}
async function viewProfile(uid){
  if(uid===CU?.uid){go("profile");return}
  const s=await getDoc(doc(db,"users",uid));if(!s.exists()){toast("المستخدم غير موجود","error");return}
  renderProfile(s.data(),false);go("profile");
}
async function byUsername(un){
  const s=await getDocs(query(collection(db,"users"),where("username","==",un),limit(1)));
  if(s.empty){toast("المستخدم غير موجود","error");return}
  viewProfile(s.docs[0].data().uid);
}
window.viewProfile=viewProfile;window.byUsername=byUsername;

function renderProfile(u,isOwn){
  const page=$("page-profile");if(!page)return;
  const isF=CD?.following?.includes(u.uid),isAdm=CD?.role==="admin";
  const canView=!u.isPrivate||isOwn||isF||isAdm||u.verificationType;
  const isPro=u.isPro||u.role==="admin";
  const anlt=isPro&&isOwn?`<div class="anlt-card"><div class="anlt-title">إحصائيات</div><div class="anlt-row"><div class="anlt-item"><span class="anlt-n">${u.postsCount||0}</span><span class="anlt-l">منشور</span></div><div class="anlt-item"><span class="anlt-n">${(u.followers||[]).length}</span><span class="anlt-l">متابع</span></div><div class="anlt-item"><span class="anlt-n">${(u.following||[]).length}</span><span class="anlt-l">يتابع</span></div></div></div>`:"";
  page.innerHTML=`
    <div class="prof-cover"></div>
    <div class="prof-av-wrap"><div class="prof-av"><img src="${u.photoURL||DEF_AV}" onerror="this.src='${DEF_AV}'" class="no-copy"></div></div>
    <div class="prof-body">
      <div class="prof-acts">
        ${isOwn?`<button class="btn btn-g btn-sm" onclick="openEdit()">تعديل</button><button class="btn btn-g btn-sm" onclick="cpLink('${u.profileLink||ulink(u.uid)}')">نسخ الرابط</button><button class="btn btn-g btn-sm" onclick="openSettings()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg></button>`
        :`<button class="btn btn-p btn-sm" onclick="toggleFollow('${u.uid}',this)">${isF?"متابَع":"متابعة"}</button><button class="btn btn-g btn-sm" onclick="openDm('${u.uid}')">رسالة</button>${isAdm?`<button class="btn btn-d btn-sm" onclick="promptBan('${u.uid}')">حظر</button>`:""}`}
      </div>
      <div class="prof-name">${esc(u.fullName)}${vbadge(u)}${pbadge(u)}</div>
      <div class="prof-uname">@${esc(u.username)}${u.isPrivate?`<span class="badge bl" style="font-size:.65rem">🔒 خاص</span>`:""}</div>
      ${u.bio?`<div class="prof-bio">${esc(u.bio)}</div>`:""}
      ${(u.links||[]).length?`<div class="prof-links">${u.links.map(l=>`<a href="${l}" class="prof-link" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>${esc(l)}</a>`).join("")}</div>`:""}
      <div class="prof-stats">
        <div class="pstat"><span class="pstat-n">${u.postsCount||0}</span><span class="pstat-l">منشور</span></div>
        <div class="pstat"><span class="pstat-n">${(u.followers||[]).length}</span><span class="pstat-l">متابع</span></div>
        <div class="pstat"><span class="pstat-n">${(u.following||[]).length}</span><span class="pstat-l">يتابع</span></div>
      </div>
      ${anlt}
      <div class="ptabs">
        <div class="ptab active" onclick="switchPTab('posts',this,'${u.uid}')">المنشورات</div>
        ${isOwn?`<div class="ptab" onclick="switchPTab('bookmarks',this,'${u.uid}')">المحفوظات</div>`:""}
      </div>
      <div id="prof-posts">
        ${canView?"":` <div class="priv-wall"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><h3>حساب خاص</h3><p>تابع هذا الحساب لرؤية منشوراته</p></div>`}
      </div>
    </div>`;
  if(canView)loadPPosts(u.uid,"posts");
}

async function loadPPosts(uid,tab){
  const c=$("prof-posts");if(!c)return;
  let q;
  if(tab==="bookmarks")q=query(collection(db,"posts"),where("bookmarks","array-contains",uid),orderBy("createdAt","desc"),limit(20));
  else q=query(collection(db,"posts"),where("uid","==",uid),orderBy("createdAt","desc"),limit(20));
  const snap=await getDocs(q);c.innerHTML="";
  if(snap.empty){c.innerHTML=`<div class="empty"><p>لا توجد منشورات</p></div>`;return}
  snap.forEach(d=>renderPost(d.data(),d.id,c));
}

function switchPTab(tab,el,uid){$qa(".ptab").forEach(t=>t.classList.remove("active"));el.classList.add("active");loadPPosts(uid,tab)}
function cpLink(l){navigator.clipboard.writeText(l||SITE).then(()=>toast("تم نسخ الرابط ✓","success"))}
window.loadOwnProfile=loadOwnProfile;window.switchPTab=switchPTab;window.cpLink=cpLink;

// Edit profile
function openEdit(){
  $("edit-modal").classList.add("open");
  $("e-fn").value=CD?.fullName||"";$("e-bio").value=CD?.bio||"";
  $("e-links").value=(CD?.links||[]).join("\n");
  const p=$("e-av-prev");if(p)p.src=CD?.photoURL||DEF_AV;
}
function closeEdit(){$("edit-modal").classList.remove("open")}
window.openEdit=openEdit;window.closeEdit=closeEdit;

async function saveProfile(){
  const fn=$("e-fn").value.trim(),bio=$("e-bio").value.trim(),lr=$("e-links").value.trim();
  const maxL=CD?.verificationType&&CD.verificationType!=="pro"?8:CD?.isPro?3:CD?.isPlus?5:1;
  const links=lr.split("\n").map(l=>l.trim()).filter(Boolean).slice(0,maxL);
  let photoURL=CD?.photoURL;
  const pf=$("e-ph-inp").files[0];
  if(pf){try{photoURL=await imgbb(pf)}catch{toast("فشل رفع الصورة","error");return}}
  await updateDoc(doc(db,"users",CU.uid),{fullName:fn,bio,links,photoURL});
  CD={...CD,fullName:fn,bio,links,photoURL};
  closeEdit();loadOwnProfile();toast("تم تحديث الملف ✓","success");
}
window.saveProfile=saveProfile;

// ── Messages ──
async function loadMessages(){
  const c=$("dm-list");if(!c)return;
  const q=query(collection(db,"chats"),where("participants","array-contains",CU.uid),orderBy("lastAt","desc"));
  onSnapshot(q,snap=>{
    c.innerHTML="";
    if(snap.empty){c.innerHTML=`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><h3>لا توجد رسائل</h3></div>`;return}
    snap.forEach(d=>{const ch=d.data();const ou=ch.participants.find(i=>i!==CU.uid);renderDm(ch,d.id,ou,c)});
  });
}

async function renderDm(chat,cid,ouid,c){
  const s=await getDoc(doc(db,"users",ouid));if(!s.exists())return;const u=s.data();
  const div=document.createElement("div");div.className="dm-item";
  div.innerHTML=`<div class="dm-av"><img src="${u.photoURL||DEF_AV}" onerror="this.src='${DEF_AV}'"></div><div class="dm-inf"><div class="dm-nm">${esc(u.fullName)}${vbadge(u)}</div><div class="dm-prev">${esc(chat.lastMsg||"")}</div></div><div class="dm-time">${ago(chat.lastAt)}</div>`;
  div.onclick=()=>openDm(ouid);c.appendChild(div);
}

async function openDm(ouid){
  if(ouid===CU?.uid)return;
  const cid=[CU.uid,ouid].sort().join("_");
  const cr=doc(db,"chats",cid);const s=await getDoc(cr);
  if(!s.exists())await setDoc(cr,{participants:[CU.uid,ouid],lastMsg:"",lastAt:serverTimestamp()});
  chatId=cid;
  const us=await getDoc(doc(db,"users",ouid));const u=us.exists()?us.data():{};
  $("chat-win").classList.remove("hidden");
  $("chat-hdr-nm").textContent=u.fullName||"مستخدم";
  const ha=$("chat-hdr-av-img");if(ha)ha.src=u.photoURL||DEF_AV;
  const msgs=$("chat-msgs");msgs.innerHTML="";
  if(chatUnsub)chatUnsub();
  const q=query(collection(db,"chats",cid,"messages"),orderBy("createdAt","asc"),limit(60));
  chatUnsub=onSnapshot(q,snap=>{msgs.innerHTML="";snap.forEach(d=>renderMsg(d.data(),msgs));msgs.scrollTop=msgs.scrollHeight});
  $("chat-send").onclick=()=>sendMsg(cid);
  $("chat-inp").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg(cid)}};
  go("messages");
}
window.openDm=openDm;

function renderMsg(msg,c){
  const isMe=msg.uid===CU?.uid;const div=document.createElement("div");div.className=`mw ${isMe?"me":""}`;
  div.innerHTML=`<div class="mav"><img src="${msg.userPhoto||DEF_AV}" onerror="this.src='${DEF_AV}'"></div>
  <div class="mb ${isMe?"me":"them"} no-copy">
    ${msg.mediaType==="pdf"?`<div class="msg-pdf" onclick="dlPdf('${msg.mediaUrl}','${esc(msg.mediaName||"ملف.pdf")}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>${esc(msg.mediaName||"ملف")}</span></div>`:""}
    ${msg.text?`<span>${linkify(msg.text)}</span>`:""}
    <span class="msg-time">${ago(msg.createdAt)}</span>
  </div>`;c.appendChild(div);
}

async function sendMsg(cid){
  const ci=$("chat-inp");const text=ci.value.trim();if(!text)return;ci.value="";
  await addDoc(collection(db,"chats",cid,"messages"),{uid:CU.uid,userPhoto:CD.photoURL||DEF_AV,text,mediaUrl:null,mediaType:null,mediaName:null,createdAt:serverTimestamp()});
  await updateDoc(doc(db,"chats",cid),{lastMsg:text,lastAt:serverTimestamp()});
}

function closeChatWin(){$("chat-win")?.classList.add("hidden")}
window.closeChatWin=closeChatWin;
window.attachChatFile=()=>toast("رفع الملفات في الشات قريباً","info");

// ── Coding ──
async function loadCoding(){
  const c=$("coding-posts");if(!c)return;
  const can=CD?.role==="admin"||CD?.isPro||CD?.isPlus||CD?.verificationType;
  const jb=$("coding-join");if(jb)jb.style.display=can?"none":"flex";
  const q=query(collection(db,"codingPosts"),orderBy("createdAt","desc"),limit(30));
  onSnapshot(q,snap=>{
    c.innerHTML="";
    if(snap.empty){c.innerHTML=`<div class="empty"><p>لا توجد منشورات برمجية بعد</p></div>`;return}
    snap.forEach(d=>renderCode(d.data(),d.id,c));
  });
}

function renderCode(post,pid,c){
  const div=document.createElement("div");div.className="code-post";
  div.innerHTML=`<div class="cp-hdr"><div class="pav" style="width:28px;height:28px" onclick="viewProfile('${post.uid}')"><img src="${post.userPhoto||DEF_AV}"></div><div style="flex:1"><div style="font-size:.83rem;font-weight:600">${esc(post.displayName)}</div><div style="font-size:.68rem;color:var(--t3);font-family:var(--fm)">${ago(post.createdAt)}</div></div><span class="cp-lang">${esc(post.language||"code")}</span></div>
  ${post.text?`<div style="padding:10px 12px;font-size:.86rem;border-bottom:1px solid var(--b1)">${linkify(post.text)}</div>`:""}
  ${post.code?`<pre class="code-blk no-copy">${esc(post.code)}</pre>`:""}
  <div class="cp-acts"><div class="pact" onclick="likeCode('${pid}')"><svg viewBox="0 0 24 24" fill="${post.likes?.includes(CU?.uid)?"currentColor":"none"}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg><span>${post.likesCount||0}</span></div></div>`;
  c.appendChild(div);
}

function openCode(){
  if(!CD?.role&&!CD?.isPro&&!CD?.isPlus&&!CD?.verificationType){toast("غرفة البرمجة للمشتركين فقط","error");return}
  $("code-modal").classList.add("open");
}
function closeCode(){$("code-modal").classList.remove("open")}
window.openCode=openCode;window.closeCode=closeCode;

async function submitCode(){
  const text=$("code-text").value.trim(),code=$("code-cnt").value.trim(),lang=$("code-lang").value;
  if(!code&&!text){toast("أضف محتوى","error");return}
  await addDoc(collection(db,"codingPosts"),{uid:CU.uid,username:CD.username,displayName:CD.fullName,userPhoto:CD.photoURL||DEF_AV,text,code,language:lang,likes:[],likesCount:0,createdAt:serverTimestamp()});
  closeCode();toast("تم النشر ✓","success");
}
window.submitCode=submitCode;

async function likeCode(pid){
  const r=doc(db,"codingPosts",pid);const s=await getDoc(r);
  const liked=s.data()?.likes?.includes(CU.uid);
  await updateDoc(r,{likes:liked?arrayRemove(CU.uid):arrayUnion(CU.uid),likesCount:increment(liked?-1:1)});
}
window.likeCode=likeCode;

// ── Notifications ──
async function addNotif(toUid,type,text){
  await addDoc(collection(db,"notifications"),{toUid,type,text,fromUid:CU?.uid,fromPhoto:CD?.photoURL||DEF_AV,read:false,createdAt:serverTimestamp()}).catch(()=>{});
  await updateDoc(doc(db,"users",toUid),{notifCount:increment(1)}).catch(()=>{});
}

function subNotifs(){
  if(!CU)return;if(notifUnsub)notifUnsub();
  const q=query(collection(db,"notifications"),where("toUid","==",CU.uid),where("read","==",false),orderBy("createdAt","desc"),limit(1));
  notifUnsub=onSnapshot(q,snap=>{snap.docChanges().forEach(ch=>{if(ch.type==="added"){beep();updNotifBadge()}})});
}

async function updNotifBadge(){
  if(!CU)return;
  const q=query(collection(db,"notifications"),where("toUid","==",CU.uid),where("read","==",false));
  const s=await getDocs(q);const badge=$("nbadge");
  if(badge){badge.textContent=s.size>9?"9+":s.size;badge.style.display=s.size>0?"flex":"none"}
}

async function openNotifs(){
  const panel=$("notif-panel");panel.classList.toggle("open");
  if(!panel.classList.contains("open"))return;
  const list=$("notif-list");list.innerHTML="";
  const q=query(collection(db,"notifications"),where("toUid","==",CU.uid),orderBy("createdAt","desc"),limit(40));
  const snap=await getDocs(q);
  snap.forEach(d=>{
    const n=d.data();const div=document.createElement("div");div.className=`ni ${n.read?"":"unrd"}`;
    div.innerHTML=`<div class="ni-av"><img src="${n.fromPhoto||DEF_AV}" onerror="this.src='${DEF_AV}'"></div><div class="ni-cnt"><div class="ni-txt">${esc(n.text||"")}</div><div class="ni-time">${ago(n.createdAt)}</div></div>${!n.read?`<div class="ni-dot"></div>`:""}`;
    list.appendChild(div);
    if(!n.read)updateDoc(doc(db,"notifications",d.id),{read:true});
  });
  await updateDoc(doc(db,"users",CU.uid),{notifCount:0}).catch(()=>{});
  const badge=$("nbadge");if(badge)badge.style.display="none";
}
window.openNotifs=openNotifs;

// ── Admin ──
async function loadAdmin(){
  if(CD?.role!=="admin")return;const panel=$("admin-content");if(!panel)return;
  panel.innerHTML=`<div class="empty"><p>جاري التحميل...</p></div>`;
  const[us,ps,rs]=await Promise.all([getDocs(collection(db,"users")),getDocs(collection(db,"posts")),getDocs(collection(db,"reports"))]);
  panel.innerHTML=`<div class="adm-grid"><div class="adm-card"><span class="adm-n">${us.size}</span><span class="adm-l">المستخدمون</span></div><div class="adm-card"><span class="adm-n">${ps.size}</span><span class="adm-l">المنشورات</span></div><div class="adm-card"><span class="adm-n">${rs.size}</span><span class="adm-l">البلاغات</span></div><div class="adm-card"><span class="adm-n">${us.docs.filter(d=>d.data().isPro).length}</span><span class="adm-l">Pro</span></div></div>
  <div class="adm-sec"><div class="adm-sec-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>إدارة المستخدمين</div><div id="adm-list"></div></div>`;
  const list=$("adm-list");
  us.forEach(d=>{
    const u=d.data();const div=document.createElement("div");div.className="adm-row";
    div.innerHTML=`<div class="adm-av"><img src="${u.photoURL||DEF_AV}" onerror="this.src='${DEF_AV}'"></div>
    <div class="adm-ui"><div class="adm-un">${esc(u.fullName)}${vbadge(u)}${pbadge(u)}</div><div class="adm-us">@${esc(u.username)} · ${u.email}</div></div>
    <div class="adm-aa">
      <select class="fsel" style="padding:4px 7px;font-size:.7rem;width:auto" onchange="setVerify('${u.uid}',this.value)">
        <option value="">توثيق</option><option value="pro" ${u.verificationType==="pro"?"selected":""}>Pro★</option>
        <option value="verified" ${u.verificationType==="verified"?"selected":""}>موثق✓</option>
        <option value="dev" ${u.verificationType==="dev"?"selected":""}>مبرمج</option>
        <option value="app" ${u.verificationType==="app"?"selected":""}>تطبيق</option>
      </select>
      <button class="btn btn-sm ${u.isPro?"btn-p":"btn-g"}" onclick="tPro('${u.uid}',${u.isPro})">${u.isPro?"إلغاء Pro":"Pro"}</button>
      <button class="btn btn-sm ${u.isPlus?"btn-p":"btn-g"}" onclick="tPlus('${u.uid}',${u.isPlus})">${u.isPlus?"إلغاء Plus":"Plus"}</button>
      <button class="btn btn-sm ${u.banned?"btn-p":"btn-d"}" onclick="${u.banned?`unban('${u.uid}')`:`promptBan('${u.uid}')`}">${u.banned?"رفع الحظر":"حظر"}</button>
      <button class="btn btn-sm btn-g" onclick="tRole('${u.uid}','${u.role}')">${u.role==="admin"?"إلغاء أدمن":"أدمن"}</button>
    </div>`;list.appendChild(div);
  });
}

function promptBan(uid){const r=prompt("سبب الحظر:");if(r===null)return;banUser(uid,r||"")}
async function banUser(uid,reason=""){
  await updateDoc(doc(db,"users",uid),{banned:true,banReason:reason});
  await addDoc(collection(db,"notifications"),{toUid:uid,type:"banned",text:`تم حظر حسابك${reason?` — السبب: ${reason}`:""} · للتواصل: ${SUPPORT}`,fromUid:CU.uid,fromPhoto:DEF_AV,read:false,createdAt:serverTimestamp()}).catch(()=>{});
  toast("تم الحظر","success");loadAdmin();
}
async function unban(uid){await updateDoc(doc(db,"users",uid),{banned:false,banReason:""});toast("تم رفع الحظر","success");loadAdmin()}
async function tPro(uid,p){await updateDoc(doc(db,"users",uid),{isPro:!p,proExpiresAt:p?null:Timestamp.fromDate(new Date(Date.now()+30*86400000))});toast(!p?"تم تفعيل Pro":"تم إلغاء Pro","success");loadAdmin()}
async function tPlus(uid,p){await updateDoc(doc(db,"users",uid),{isPlus:!p});toast(!p?"تم تفعيل Plus":"تم إلغاء Plus","success");loadAdmin()}
async function tRole(uid,role){await updateDoc(doc(db,"users",uid),{role:role==="admin"?"user":"admin"});toast("تم تغيير الصلاحية","success");loadAdmin()}
async function setVerify(uid,type){const note=type?prompt("نص دليل التوثيق:")||"":"";await updateDoc(doc(db,"users",uid),{verificationType:type||null,verifyNote:note});toast("تم التوثيق ✓","success")}
window.promptBan=promptBan;window.unban=unban;window.tPro=tPro;window.tPlus=tPlus;window.tRole=tRole;window.setVerify=setVerify;

// ── Settings ──
function openSettings(){$("settings-modal").classList.add("open");renderSettings()}
function closeSettings(){$("settings-modal").classList.remove("open")}
window.openSettings=openSettings;window.closeSettings=closeSettings;

function renderSettings(){
  const c=$("settings-content");if(!c||!CD)return;
  c.innerHTML=`<div class="stt-pg">
  <div class="stt-sec"><div class="stt-sec-ttl">الحساب</div>
    <div class="stt-item" onclick="openEdit()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg><div class="stt-txt"><div>تعديل الملف الشخصي</div></div></div>
    <div class="stt-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      <div class="stt-txt"><div>حساب خاص</div><div class="stt-sub">إخفاء منشوراتك عن غير المتابعين</div></div>
      <label class="tgl"><input type="checkbox" ${CD.isPrivate?"checked":""} onchange="setPrivate(this.checked)"><span class="tgl-sl"></span></label>
    </div>
    <div class="stt-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
      <div class="stt-txt"><div>قبول المتابعة تلقائياً</div></div>
      <label class="tgl"><input type="checkbox" ${CD.followAutoAccept?"checked":""} onchange="setAutoAccept(this.checked)"><span class="tgl-sl"></span></label>
    </div>
  </div>
  <div class="stt-sec"><div class="stt-sec-ttl">الأمان</div>
    <div class="stt-item" onclick="changPin()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><div class="stt-txt"><div>تغيير رمز PIN</div></div></div>
  </div>
  <div class="stt-sec"><div class="stt-sec-ttl">الباقات</div>
    <div class="stt-item" onclick="openPricing()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
      <div class="stt-txt"><div>الترقية والباقات</div><div class="stt-sub">${CD.isPro?"أنت مشترك في Pro ✓":CD.isPlus?"أنت مشترك في Plus ✓":"ترقية لـ Plus أو Pro"}</div></div></div>
  </div>
  <div class="stt-sec"><div class="stt-sec-ttl">الحساب</div>
    <div class="stt-item" onclick="doLogout()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg><div class="stt-txt" style="color:var(--red)"><div>تسجيل الخروج</div></div></div>
  </div></div>`;
}

async function setPrivate(v){await updateDoc(doc(db,"users",CU.uid),{isPrivate:v});CD.isPrivate=v;toast(v?"الحساب أصبح خاصاً":"الحساب أصبح عاماً","success")}
async function setAutoAccept(v){await updateDoc(doc(db,"users",CU.uid),{followAutoAccept:v});CD.followAutoAccept=v}
function changPin(){closeSettings();showPin("set")}
window.setPrivate=setPrivate;window.setAutoAccept=setAutoAccept;window.changPin=changPin;

// ── Pricing ──
function openPricing(){$("pricing-modal").classList.add("open")}
function closePricing(){$("pricing-modal").classList.remove("open")}
function showPlan(p,el){document.querySelectorAll(".price-tab").forEach(t=>t.classList.remove("active"));el.classList.add("active");$("plan-plus").style.display=p==="plus"?"block":"none";$("plan-pro").style.display=p==="pro"?"block":"none"}
function paypal(amt,cur,name){window.open(`https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=AW_M1acPABnrPp2AJklYALUDZ1OUA2NS6CPGp3D3ZB9fVIfmfD87le9WZmHF3fOCqINDO3RAtQGWLteZ&amount=${amt}&currency_code=${cur}&item_name=${encodeURIComponent(name)}&return=${encodeURIComponent(SITE+"/payment-success")}&cancel_return=${encodeURIComponent(SITE+"/payment-cancel")}`,"_blank");toast("تم التوجيه لبوابة الدفع","info")}
window.openPricing=openPricing;window.closePricing=closePricing;window.showPlan=showPlan;window.paypal=paypal;

// ── Media controls ──
function tvid(btn){const w=btn.closest(".vid-wrap"),v=w.querySelector("video");if(v.paused){v.play();btn.innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`}else{v.pause();btn.innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`}v.ontimeupdate=()=>{const p=(v.currentTime/v.duration)*100||0;w.querySelector(".vid-fill").style.width=p+"%";const m=Math.floor(v.currentTime/60),s=Math.floor(v.currentTime%60);w.querySelector(".vid-time").textContent=`${m}:${String(s).padStart(2,"0")}`}}
function svid(el){const v=el.closest(".vid-wrap").querySelector("video");const r=el.getBoundingClientRect();v.currentTime=((event.clientX-r.left)/r.width)*v.duration}
function mvid(btn){const v=btn.closest(".vid-wrap").querySelector("video");v.muted=!v.muted}
function taud(btn){const w=btn.closest(".aud-player"),a=w.querySelector("audio");if(a.paused){a.play();btn.innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;a.ontimeupdate=()=>{const p=(a.currentTime/a.duration)*100||0;w.querySelector(".aud-fill").style.width=p+"%";const f=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}`;w.querySelector(".ac").textContent=f(a.currentTime);w.querySelector(".ad").textContent=f(a.duration||0)}}else{a.pause();btn.innerHTML=`<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`}}
function saud(el){const a=el.closest(".aud-player").querySelector("audio");const r=el.getBoundingClientRect();a.currentTime=((event.clientX-r.left)/r.width)*a.duration}
window.tvid=tvid;window.svid=svid;window.mvid=mvid;window.taud=taud;window.saud=saud;
