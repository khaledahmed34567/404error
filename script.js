/* ===================================================================
   404 — منطق التطبيق
   =================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, collection, addDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove, getDocs, startAt, endAt
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------------- Firebase ---------------- */
const firebaseConfig = {
  apiKey: "AIzaSyCTGnFOK7m_xNod8mwBPB5HTgTP2BrNm6o",
  authDomain: "cyberintel-d0d4f.firebaseapp.com",
  projectId: "cyberintel-d0d4f",
  storageBucket: "cyberintel-d0d4f.appspot.com",
  messagingSenderId: "533279564815",
  appId: "1:533279564815:web:d373567c2be86311127af7a"
};
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

const USERS_COL = "moustagdem";
const POSTS_COL = "posssst";
const SUPPORT_EMAIL = "khwailedapp@gmail.com";
const IMGBB_KEY = "36b0e2658ed6fad2ca48081442f1539b";
const PAYPAL_CLIENT_ID = "AW_M1acPABnrPp2AJklYALUDZ1OUA2NS6CPGp3D3ZB9fVIfmfD87le9WZmHF3fOCqINDO3RAtQGWLteZ";
const LOGO_URL = "https://i.ibb.co/WN3DTcGc/logo.jpg";
const DEFAULT_AVATAR = "https://files.cdn-files-a.com/uploads/9487240/2000_699b80b0c7cc4.jpg";

/* ---------------- حالة التطبيق ---------------- */
let currentUser = null;      // Firebase auth user
let myProfile = null;        // Firestore doc from moustagdem
let unsubFeed = null, unsubCodeFeed = null, unsubNotifs = null;
let viewingUsername = null;

/* ---------------- أدوات مساعدة ---------------- */
const $ = (id) => document.getElementById(id);
function show(id){ document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active")); $(id).classList.add("active"); window.scrollTo(0,0); }
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); clearTimeout(window._toastT); window._toastT=setTimeout(()=>t.classList.remove("show"),2600); }
async function sha256(text){
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function linkify(text){
  const escaped = text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  return escaped.replace(/((https?:\/\/|www\.)[^\s]+)/g, (m)=>{
    const href = m.startsWith("http") ? m : "https://"+m;
    return `<a href="${href}" target="_blank" rel="noopener">${m}</a>`;
  });
}
function timeAgo(ts){
  if(!ts) return "الآن";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now()-d.getTime())/1000);
  if(s<60) return "الآن";
  if(s<3600) return Math.floor(s/60)+" د";
  if(s<86400) return Math.floor(s/3600)+" س";
  if(s<2592000) return Math.floor(s/86400)+" يوم";
  return d.toLocaleDateString("ar-EG");
}
function badgeHTML(type){
  if(!type) return "";
  const map = {
    pro: {cls:"badge-pro", title:"حساب موثّق برو"},
    investigator: {cls:"badge-investigator", title:"شخصية موثّقة ومحقق منها"},
    developer: {cls:"badge-developer", title:"مبرمج موثّق"},
    app: {cls:"badge-app", title:"حساب رسمي للتطبيق"}
  };
  const c = map[type]; if(!c) return "";
  return `<span class="badge ${c.cls}" title="${c.title}"><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg></span>`;
}
function planExpiryLabel(profile){
  if(!profile.isPro) return null;
  if(!profile.proExpiresAt) return "برو (بدون تاريخ انتهاء)";
  const d = profile.proExpiresAt.toDate ? profile.proExpiresAt.toDate() : new Date(profile.proExpiresAt);
  if(d.getTime() < Date.now()) return null;
  return "ساري حتى " + d.toLocaleDateString("ar-EG");
}

/* ---------------- قوائم الجنسيات وأكواد الدول ---------------- */
const COUNTRIES = ["مصر","السعودية","الإمارات","الكويت","قطر","البحرين","عمان","الأردن","لبنان","سوريا","العراق","فلسطين","اليمن","ليبيا","تونس","الجزائر","المغرب","السودان","موريتانيا","الصومال","جيبوتي","جزر القمر","تركيا","إيران","باكستان","الهند","بنغلاديش","إندونيسيا","ماليزيا","الصين","اليابان","كوريا الجنوبية","روسيا","أوكرانيا","بولندا","ألمانيا","فرنسا","إيطاليا","إسبانيا","البرتغال","هولندا","بلجيكا","سويسرا","النمسا","السويد","النرويج","الدنمارك","فنلندا","المملكة المتحدة","إيرلندا","اليونان","قبرص","الولايات المتحدة","كندا","المكسيك","البرازيل","الأرجنتين","تشيلي","كولومبيا","بيرو","أستراليا","نيوزيلندا","جنوب أفريقيا","نيجيريا","كينيا","إثيوبيا","غانا","السنغال","أخرى"];
const COUNTRY_CODES = ["+20 مصر","+966 السعودية","+971 الإمارات","+965 الكويت","+974 قطر","+973 البحرين","+968 عُمان","+962 الأردن","+961 لبنان","+963 سوريا","+964 العراق","+970 فلسطين","+967 اليمن","+218 ليبيا","+216 تونس","+213 الجزائر","+212 المغرب","+249 السودان","+90 تركيا","+98 إيران","+92 باكستان","+91 الهند","+44 بريطانيا","+1 أمريكا/كندا","+49 ألمانيا","+33 فرنسا","+39 إيطاليا","+34 إسبانيا","+7 روسيا","+86 الصين","+81 اليابان","+82 كوريا الجنوبية","+61 أستراليا"];

function fillSelect(sel, arr, placeholder){
  sel.innerHTML = `<option value="">${placeholder}</option>` + arr.map(c=>`<option value="${c}">${c}</option>`).join("");
}
fillSelect($("r-nationality"), COUNTRIES, "اختر الجنسية");
fillSelect($("r-countrycode"), COUNTRY_CODES, "الكود");

/* ---------------- منطق تنقل عام ---------------- */
document.querySelectorAll(".tab-item").forEach(tab=>{
  tab.addEventListener("click", ()=>{
    document.querySelectorAll(".tab-item").forEach(t=>t.classList.remove("active"));
    tab.classList.add("active");
    show(tab.dataset.target);
    if(tab.dataset.target==="screen-profile") renderMyProfile();
  });
});
$("btn-open-notifs").onclick = ()=> show("screen-notifs");
$("btn-notifs-back").onclick = ()=> show("screen-feed");
$("btn-code-back").onclick = ()=> { document.querySelector('.tab-item[data-target="screen-feed"]').click(); };
$("btn-open-settings").onclick = ()=> { renderSettings(); show("screen-settings"); };
$("btn-settings-back").onclick = ()=> show("screen-profile");
$("btn-open-profile-mini").onclick = ()=> { document.querySelector('.tab-item[data-target="screen-profile"]').click(); };
$("btn-other-back").onclick = ()=> show("screen-feed");
$("btn-plans-back").onclick = ()=> show("screen-settings");
$("btn-admin-back").onclick = ()=> show("screen-settings");
$("link-goto-register").onclick = (e)=>{ e.preventDefault(); show("screen-register"); };
$("link-goto-login").onclick = (e)=>{ e.preventDefault(); show("screen-login"); };

/* ============================================================
   تسجيل الدخول
   ============================================================ */
$("btn-login").onclick = async ()=>{
  const email = $("login-email").value.trim();
  const pass = $("login-password").value;
  $("login-error").style.display="none";
  if(!email || !pass){ $("login-error").textContent="اكتب البريد وكلمة المرور"; $("login-error").style.display="block"; return; }
  const btn = $("btn-login"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
  try{
    await signInWithEmailAndPassword(auth, email, pass);
  }catch(err){
    $("login-error").textContent = "بيانات الدخول غير صحيحة";
    $("login-error").style.display="block";
  }
  btn.innerHTML="دخول"; btn.disabled=false;
};

$("btn-google-login").onclick = async ()=>{
  try{
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    const uref = doc(db, USERS_COL, res.user.uid);
    const snap = await getDoc(uref);
    if(!snap.exists()){
      // حساب جديد بجوجل — ننشئ بروفايل مبدئي ونطلب منه ضبط PIN
      const username = await generateUniqueUsername(res.user.displayName || "user");
      await setDoc(uref, {
        fullName: res.user.displayName || "مستخدم 404",
        email: res.user.email,
        username, bio:"", links:[], profilePic: res.user.photoURL || DEFAULT_AVATAR,
        isPrivate:false, autoAcceptFollow:true, isAdmin:false, isPro:false,
        verifiedType:null, followers:[], following:[], followRequests:[],
        banned:false, pinHash:null, createdAt: serverTimestamp()
      });
    }
  }catch(err){ toast("تعذر الدخول بحساب جوجل"); }
};

$("link-forgot").onclick = async (e)=>{
  e.preventDefault();
  const email = prompt("اكتب بريدك الإلكتروني لإرسال رابط إعادة تعيين كلمة المرور:");
  if(!email) return;
  try{ await sendPasswordResetEmail(auth, email); toast("تم إرسال رابط إعادة التعيين إلى بريدك"); }
  catch(err){ toast("تعذر إرسال الرابط، تأكد من البريد"); }
};

/* ============================================================
   إنشاء حساب — التنقل بين الخطوات
   ============================================================ */
let regStep = 1;
function goRegStep(n){
  document.querySelectorAll(".reg-step").forEach(s=>s.classList.add("hidden"));
  $("reg-step-"+n).classList.remove("hidden");
  document.querySelectorAll("#reg-dots span").forEach((d,i)=> d.classList.toggle("done", i < n));
  regStep = n;
}
$("r-dob").addEventListener("change", ()=>{
  const d = new Date($("r-dob").value);
  if(isNaN(d)) return;
  const age = Math.floor((Date.now()-d.getTime())/(365.25*24*3600*1000));
  $("r-age").value = age >= 0 ? age : "";
});
$("btn-step1-next").onclick = ()=>{
  if(!$("r-fullname").value.trim() || !$("r-dob").value || !$("r-nationality").value){ toast("من فضلك أكمل كل الحقول"); return; }
  goRegStep(2);
};
$("btn-step2-back").onclick = ()=> goRegStep(1);
$("btn-step2-next").onclick = ()=>{
  const err = $("r-step2-error"); err.style.display="none";
  if(!$("r-countrycode").value || !$("r-phone").value.trim() || !$("r-email").value.trim() || !$("r-email-confirm").value.trim()){
    err.textContent="من فضلك أكمل كل الحقول"; err.style.display="block"; return;
  }
  if($("r-email").value.trim().toLowerCase() !== $("r-email-confirm").value.trim().toLowerCase()){
    err.textContent="البريد الإلكتروني غير متطابق"; err.style.display="block"; return;
  }
  goRegStep(3);
};
$("btn-step3-back").onclick = ()=> goRegStep(2);
$("btn-step3-next").onclick = ()=>{
  const err = $("r-step3-error"); err.style.display="none";
  if($("r-pass").value.length < 8){ err.textContent="كلمة المرور لازم تكون 8 أحرف على الأقل"; err.style.display="block"; return; }
  if($("r-pass").value !== $("r-pass-confirm").value){ err.textContent="كلمة المرور غير متطابقة"; err.style.display="block"; return; }
  goRegStep(4);
};
$("btn-step4-back").onclick = ()=> goRegStep(3);

function setupPinAutoAdvance(containerId){
  const inputs = [...$(containerId).querySelectorAll("input")];
  inputs.forEach((inp,i)=>{
    inp.addEventListener("input", ()=>{
      inp.value = inp.value.replace(/\D/g,"");
      if(inp.value && i<inputs.length-1) inputs[i+1].focus();
    });
    inp.addEventListener("keydown",(e)=>{ if(e.key==="Backspace" && !inp.value && i>0) inputs[i-1].focus(); });
  });
}
setupPinAutoAdvance("pinlock-inputs");
setupPinAutoAdvance("reg-pin-inputs");
setupPinAutoAdvance("reg-pin-confirm-inputs");
function pinValue(containerId){ return [...$(containerId).querySelectorAll("input")].map(i=>i.value).join(""); }
function clearPinInputs(containerId){ $(containerId).querySelectorAll("input").forEach(i=>i.value=""); $(containerId).querySelector("input").focus(); }

async function generateUniqueUsername(base){
  let clean = base.toString().trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g,"").slice(0,16) || "user404";
  let username = clean;
  let tries = 0;
  while(tries < 8){
    const q = query(collection(db, USERS_COL), where("username","==",username), limit(1));
    const snap = await getDocs(q);
    if(snap.empty) return username;
    username = clean + Math.floor(1000+Math.random()*9000);
    tries++;
  }
  return clean + Date.now().toString().slice(-6);
}

$("btn-finish-register").onclick = async ()=>{
  const err = $("r-step4-error"); err.style.display="none";
  const pin = pinValue("reg-pin-inputs");
  const pinConfirm = pinValue("reg-pin-confirm-inputs");
  if(pin.length!==6){ err.textContent="اكتب رمز مكوّن من 6 أرقام"; err.style.display="block"; return; }
  if(pin !== pinConfirm){ err.textContent="الرمز غير متطابق"; err.style.display="block"; clearPinInputs("reg-pin-confirm-inputs"); return; }

  const btn = $("btn-finish-register"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
  try{
    const cred = await createUserWithEmailAndPassword(auth, $("r-email").value.trim(), $("r-pass").value);
    const pinHash = await sha256(pin);
    const username = await generateUniqueUsername($("r-fullname").value);
    await setDoc(doc(db, USERS_COL, cred.user.uid), {
      fullName: $("r-fullname").value.trim(),
      dob: $("r-dob").value,
      age: Number($("r-age").value)||null,
      nationality: $("r-nationality").value,
      countryCode: $("r-countrycode").value,
      phone: $("r-phone").value.trim(),
      email: $("r-email").value.trim(),
      username, bio:"", links:[], profilePic: DEFAULT_AVATAR,
      isPrivate:false, autoAcceptFollow:true, isAdmin:false, isPro:false,
      verifiedType:null, followers:[], following:[], followRequests:[],
      banned:false, pinHash, createdAt: serverTimestamp()
    });
    sessionStorage.setItem("pinVerified","1");
    toast("تم إنشاء الحساب بنجاح");
  }catch(e){
    err.textContent = e.code==="auth/email-already-in-use" ? "البريد الإلكتروني مستخدم بالفعل" : "حدث خطأ، حاول مرة أخرى";
    err.style.display="block";
  }
  btn.innerHTML="إنشاء الحساب"; btn.disabled=false;
};

/* ============================================================
   قفل PIN عند فتح التطبيق
   ============================================================ */
$("pinlock-inputs").addEventListener("input", async ()=>{
  const val = pinValue("pinlock-inputs");
  if(val.length===6){
    const hash = await sha256(val);
    if(myProfile && hash === myProfile.pinHash){
      sessionStorage.setItem("pinVerified","1");
      $("pinlock-error").style.display="none";
      enterApp();
    }else{
      $("pinlock-error").style.display="block";
      clearPinInputs("pinlock-inputs");
    }
  }
});
$("btn-pinlock-logout").onclick = async ()=>{ sessionStorage.removeItem("pinVerified"); await signOut(auth); };
$("btn-logout").onclick = async ()=>{ sessionStorage.removeItem("pinVerified"); await signOut(auth); };

/* ============================================================
   دورة حياة المصادقة
   ============================================================ */
onAuthStateChanged(auth, async (user)=>{
  currentUser = user;
  if(unsubFeed) unsubFeed(); if(unsubCodeFeed) unsubCodeFeed(); if(unsubNotifs) unsubNotifs();
  $("splash").classList.add("hide");
  if(!user){ myProfile=null; $("tabbar").classList.add("hidden"); show("screen-login"); return; }

  const uref = doc(db, USERS_COL, user.uid);
  const snap = await getDoc(uref);
  if(!snap.exists()){ show("screen-register"); return; }
  myProfile = { id:user.uid, ...snap.data() };

  if(myProfile.banned){ renderBannedScreen(); return; }

  if(!myProfile.pinHash){
    // مستخدم جوجل جديد بدون PIN — نوجهه لضبط الرمز عبر خطوة التسجيل الرابعة فقط
    show("screen-register"); goRegStep(4);
    $("btn-finish-register").onclick = async ()=>{
      const pin = pinValue("reg-pin-inputs"); const pinConfirm = pinValue("reg-pin-confirm-inputs");
      if(pin.length!==6){ toast("اكتب 6 أرقام"); return; }
      if(pin!==pinConfirm){ toast("الرمز غير متطابق"); return; }
      await updateDoc(uref, { pinHash: await sha256(pin) });
      myProfile.pinHash = await sha256(pin);
      sessionStorage.setItem("pinVerified","1");
      enterApp();
    };
    return;
  }

  if(sessionStorage.getItem("pinVerified")==="1"){ enterApp(); }
  else{ show("screen-pinlock"); }

  sendLoginNotificationMail(user, myProfile);
});

function showNotFound(reason){
  $("tabbar").classList.add("hidden");
  if(reason) $("notfound-reason").textContent = reason;
  else $("notfound-reason").textContent = "يمكن الرابط اتغيّر، أو المحتوى اتشال، أو كتبت حاجة غلط";
  // إعادة تشغيل حركة الأرقام في كل مرة
  const num = $("notfound-num");
  num.querySelectorAll("span").forEach(s=>{ s.style.animation="none"; void s.offsetWidth; s.style.animation=""; });
  show("screen-404");
}
$("btn-404-home").onclick = ()=>{
  $("tabbar").classList.remove("hidden");
  history.replaceState(null,"", location.pathname);
  document.querySelector('.tab-item[data-target="screen-feed"]').click();
};

function renderBannedScreen(){
  $("app").innerHTML = `<div class="center-screen" style="min-height:100vh;">
    <div class="brand-mark"><img src="${LOGO_URL}"></div>
    <h2>عذرًا، تم حظر حسابك</h2>
    <p class="subtitle">يمكنك التواصل مع الفريق لمعرفة المشكلة</p>
    <a class="btn btn-primary" style="width:auto; padding:12px 24px;" href="mailto:${SUPPORT_EMAIL}">تواصل مع الفريق</a>
  </div>`;
}

async function sendLoginNotificationMail(user, profile){
  try{
    await addDoc(collection(db,"mail"), {
      to:[user.email],
      message:{
        subject:`Welcome ${profile.fullName} — تسجيل دخول جديد`,
        text:`Welcome ${profile.fullName}, a user has logged into your account on 404.\nأهلاً بك يا ${profile.fullName}، قام أحد المستخدمين بالدخول إلى حسابك على تطبيق 404.`
      }
    });
  }catch(e){ /* يتطلب تفعيل إضافة Trigger Email من Firebase Extensions */ }
}

function enterApp(){
  $("tabbar").classList.remove("hidden");
  $("mini-avatar").src = myProfile.profilePic || DEFAULT_AVATAR;
  document.querySelector('.tab-item[data-target="screen-feed"]').click();
  startFeedListener();
  startCodeFeedListener();
  startNotifsListener();
}

/* ============================================================
   الفيد — المنشورات
   ============================================================ */
$("composer-text").addEventListener("input", ()=>{ $("composer-counter").textContent = `${$("composer-text").value.length} / 500`; });
$("code-composer-text").addEventListener("input", ()=>{ $("code-composer-counter").textContent = `${$("code-composer-text").value.length} / 800`; });

$("btn-post-submit").onclick = ()=> submitPost($("composer-text"), 500, false);
$("btn-code-post-submit").onclick = ()=> submitPost($("code-composer-text"), 800, true);

async function submitPost(textarea, maxLen, isCode){
  const text = textarea.value.trim();
  if(!text){ toast("اكتب شيئًا أولاً"); return; }
  if(text.length > maxLen){ toast("النص طويل جدًا"); return; }
  try{
    await addDoc(collection(db, POSTS_COL), {
      authorId: currentUser.uid,
      authorUsername: myProfile.username,
      authorName: myProfile.fullName,
      authorPic: myProfile.profilePic || DEFAULT_AVATAR,
      authorVerified: myProfile.verifiedType || null,
      text, room: isCode ? "code" : "general",
      likes:[], commentsCount:0, createdAt: serverTimestamp()
    });
    textarea.value=""; textarea.dispatchEvent(new Event("input"));
    toast("تم النشر");
  }catch(e){ toast("تعذر النشر، حاول مرة أخرى"); }
}

function postRowHTML(p, dark){
  const liked = (p.likes||[]).includes(currentUser?.uid);
  return `
  <div class="glass-card post" data-id="${p.id}">
    <div class="post-head">
      <img class="avatar" src="${p.authorPic||DEFAULT_AVATAR}">
      <div>
        <div class="post-author" data-open-user="${p.authorUsername}">${p.authorName||"مستخدم"} ${badgeHTML(p.authorVerified)}</div>
        <div class="post-username">@${p.authorUsername||""}</div>
        <div class="post-time meta-font">${timeAgo(p.createdAt)}</div>
      </div>
    </div>
    <div class="post-text">${linkify(p.text||"")}</div>
    <div class="post-actions">
      <button class="post-action like-btn ${liked?"liked":""}" data-id="${p.id}" data-liked="${liked}">
        <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>
        <span>${(p.likes||[]).length}</span>
      </button>
      <button class="post-action comment-btn" data-id="${p.id}">
        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
        <span>${p.commentsCount||0}</span>
      </button>
      <button class="post-action share-btn" data-id="${p.id}">
        <svg viewBox="0 0 24 24"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>
        <span>مشاركة</span>
      </button>
    </div>
  </div>`;
}

function attachPostEvents(container){
  container.querySelectorAll(".like-btn").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.dataset.id; const liked = btn.dataset.liked==="true";
      const pref = doc(db, POSTS_COL, id);
      await updateDoc(pref, { likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
    };
  });
  container.querySelectorAll(".comment-btn").forEach(btn=>{
    btn.onclick = async ()=>{
      const text = prompt("اكتب تعليقك:");
      if(!text || !text.trim()) return;
      const id = btn.dataset.id;
      await addDoc(collection(db, POSTS_COL, id, "comments"), { authorId: currentUser.uid, authorName: myProfile.fullName, text: text.trim(), createdAt: serverTimestamp() });
      await updateDoc(doc(db, POSTS_COL, id), { commentsCount: (Number(btn.querySelector("span").textContent)||0)+1 });
    };
  });
  container.querySelectorAll(".share-btn").forEach(btn=>{
    btn.onclick = ()=>{
      const url = `${location.origin}${location.pathname}?post=${btn.dataset.id}`;
      navigator.clipboard?.writeText(url);
      toast("تم نسخ رابط المنشور");
    };
  });
  container.querySelectorAll("[data-open-user]").forEach(el=>{
    el.style.cursor="pointer";
    el.onclick = ()=> openOtherProfile(el.dataset.openUser);
  });
}

function startFeedListener(){
  const q = query(collection(db, POSTS_COL), where("room","==","general"), orderBy("createdAt","desc"), limit(60));
  unsubFeed = onSnapshot(q, (snap)=>{
    const list = $("feed-list");
    if(snap.empty){ list.innerHTML=""; $("feed-empty").classList.remove("hidden"); return; }
    $("feed-empty").classList.add("hidden");
    list.innerHTML = snap.docs.map(d=>postRowHTML({id:d.id, ...d.data()})).join("");
    attachPostEvents(list);
  });
}
function startCodeFeedListener(){
  const q = query(collection(db, POSTS_COL), where("room","==","code"), orderBy("createdAt","desc"), limit(60));
  unsubCodeFeed = onSnapshot(q, (snap)=>{
    const list = $("code-feed-list");
    if(snap.empty){ list.innerHTML=""; $("code-feed-empty").classList.remove("hidden"); return; }
    $("code-feed-empty").classList.add("hidden");
    list.innerHTML = snap.docs.map(d=>postRowHTML({id:d.id, ...d.data()})).join("");
    attachPostEvents(list);
  });
}

/* ============================================================
   الإشعارات
   ============================================================ */
function startNotifsListener(){
  const q = query(collection(db, USERS_COL, currentUser.uid, "notifications"), orderBy("createdAt","desc"), limit(40));
  unsubNotifs = onSnapshot(q, (snap)=>{
    const list = $("notifs-list");
    if(snap.empty){ list.innerHTML=""; $("notifs-empty").classList.remove("hidden"); return; }
    $("notifs-empty").classList.add("hidden");
    list.innerHTML = snap.docs.map(d=>{
      const n = d.data();
      return `<div class="notif-item"><div class="notif-dot"></div><div><div style="font-size:14px;">${n.text||""}</div><div class="post-time meta-font" style="margin-top:4px;">${timeAgo(n.createdAt)}</div></div></div>`;
    }).join("");
  });
}

/* ============================================================
   البحث
   ============================================================ */
let searchDebounce;
$("search-input").addEventListener("input", ()=>{
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(runSearch, 350);
});
async function runSearch(){
  const term = $("search-input").value.trim().toLowerCase();
  const wrap = $("search-results");
  if(!term){ wrap.innerHTML=""; return; }
  const q = query(collection(db, USERS_COL), orderBy("username"), startAt(term), endAt(term+"\uf8ff"), limit(20));
  const snap = await getDocs(q);
  if(snap.empty){ wrap.innerHTML = `<div class="empty-state"><p>مفيش نتائج</p></div>`; return; }
  wrap.innerHTML = snap.docs.map(d=>{
    const u = d.data();
    return `<div class="glass-card section-pad" style="display:flex; align-items:center; gap:12px; margin-bottom:10px; cursor:pointer;" data-open-user="${u.username}">
      <img class="avatar" src="${u.profilePic||DEFAULT_AVATAR}">
      <div><div style="font-weight:700; display:flex; align-items:center; gap:5px;">${u.fullName} ${badgeHTML(u.verifiedType)}</div><div class="post-username">@${u.username}</div></div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-open-user]").forEach(el=> el.onclick = ()=> openOtherProfile(el.dataset.openUser));
}

/* ============================================================
   البروفايل الشخصي
   ============================================================ */
async function renderMyProfile(){
  const snap = await getDoc(doc(db, USERS_COL, currentUser.uid));
  myProfile = { id:currentUser.uid, ...snap.data() };
  const p = myProfile;
  const expiry = planExpiryLabel(p);
  $("profile-content").innerHTML = `
    <div class="profile-cover"></div>
    <div class="profile-head">
      <img class="profile-avatar" src="${p.profilePic||DEFAULT_AVATAR}">
      <div class="profile-name">${p.fullName} ${badgeHTML(p.verifiedType)} ${p.isPro?'<span class="chip">Pro</span>':''}</div>
      <div class="post-username">@${p.username} ${p.isPrivate?'· 🔒 خاص':''}</div>
      ${p.bio?`<div class="profile-bio">${linkify(p.bio)}</div>`:""}
      ${(p.links&&p.links.length)?`<div class="profile-links">${p.links.map(l=>`<a class="chip" href="${l}" target="_blank">${l.replace(/^https?:\/\//,"").slice(0,26)}</a>`).join("")}</div>`:""}
      <div class="profile-stats">
        <div><b>${(p.followers||[]).length}</b> <span>متابِع</span></div>
        <div><b>${(p.following||[]).length}</b> <span>متابَع</span></div>
      </div>
      ${expiry?`<div class="locked-note" style="margin-top:14px;">${expiry}</div>`:""}
      ${!p.isPro?`<button class="btn btn-accent" style="margin-top:14px;" id="btn-goto-plans">الترقية إلى برو</button>`:""}
    </div>
    <div class="divider"></div>
    <div class="feed" id="my-posts-feed"></div>
  `;
  $("btn-goto-plans") && ($("btn-goto-plans").onclick = ()=>{ renderPlans(); show("screen-plans"); });

  const q = query(collection(db, POSTS_COL), where("authorId","==",currentUser.uid), orderBy("createdAt","desc"), limit(40));
  const psnap = await getDocs(q);
  const wrap = $("my-posts-feed");
  wrap.innerHTML = psnap.empty ? `<div class="empty-state"><p>لسه مفيش منشورات</p></div>` : psnap.docs.map(d=>postRowHTML({id:d.id,...d.data()})).join("");
  attachPostEvents(wrap);
}

$("btn-share-profile").onclick = ()=>{
  const url = `${location.origin}${location.pathname}?u=${myProfile.username}`;
  navigator.clipboard?.writeText(url);
  toast("تم نسخ رابط حسابك");
};

/* ---------------- بروفايل مستخدم آخر ---------------- */
async function openOtherProfile(username){
  if(username === myProfile.username){ document.querySelector('.tab-item[data-target="screen-profile"]').click(); return; }
  show("screen-other-profile");
  $("other-profile-content").innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
  const q = query(collection(db, USERS_COL), where("username","==",username), limit(1));
  const snap = await getDocs(q);
  if(snap.empty){ showNotFound(`الحساب @${username} مش موجود، يمكن اتغيّر اسمه أو اتحذف`); return; }
  const uid = snap.docs[0].id; const u = snap.docs[0].data();
  $("other-profile-title").textContent = "@"+u.username;
  viewingUsername = username;

  const iAmFollowing = (u.followers||[]).includes(currentUser.uid);
  const requested = (u.followRequests||[]).includes(currentUser.uid);
  const isLockedForMe = u.isPrivate && !iAmFollowing && u.verifiedType==null;

  let followBtn = "";
  if(!u.isPrivate || u.autoAcceptFollow){
    followBtn = `<button class="btn ${iAmFollowing?'btn-outline':'btn-accent'}" id="btn-follow-toggle">${iAmFollowing?'إلغاء المتابعة':'متابعة'}</button>`;
  }else{
    followBtn = `<button class="btn ${requested?'btn-outline':'btn-accent'}" id="btn-follow-toggle" ${requested?'disabled':''}>${iAmFollowing?'إلغاء المتابعة':(requested?'تم إرسال الطلب':'طلب متابعة')}</button>`;
  }

  $("other-profile-content").innerHTML = `
    <div class="profile-cover"></div>
    <div class="profile-head">
      <img class="profile-avatar" src="${u.profilePic||DEFAULT_AVATAR}">
      <div class="profile-name">${u.fullName} ${badgeHTML(u.verifiedType)}</div>
      <div class="post-username">@${u.username} ${u.isPrivate?'· 🔒 خاص':''}</div>
      ${u.bio?`<div class="profile-bio">${linkify(u.bio)}</div>`:""}
      ${(u.links&&u.links.length)?`<div class="profile-links">${u.links.map(l=>`<a class="chip" href="${l}" target="_blank">${l.replace(/^https?:\/\//,"").slice(0,26)}</a>`).join("")}</div>`:""}
      <div class="profile-stats"><div><b>${(u.followers||[]).length}</b> <span>متابِع</span></div><div><b>${(u.following||[]).length}</b> <span>متابَع</span></div></div>
      <div style="margin-top:14px; display:flex; gap:10px;">${followBtn}</div>
    </div>
    <div class="divider"></div>
    <div class="feed" id="other-posts-feed">
      ${isLockedForMe ? `<div class="locked-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> الحساب خاص، تابِعه عشان تشوف منشوراته</div>` : `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`}
    </div>
  `;

  const followBtnEl = $("btn-follow-toggle");
  if(followBtnEl) followBtnEl.onclick = ()=> toggleFollow(uid, u, iAmFollowing, requested);

  if(!isLockedForMe){
    const pq = query(collection(db, POSTS_COL), where("authorId","==",uid), where("room","==","general"), orderBy("createdAt","desc"), limit(40));
    const psnap = await getDocs(pq);
    const wrap = $("other-posts-feed");
    wrap.innerHTML = psnap.empty ? `<div class="empty-state"><p>لا يوجد منشورات</p></div>` : psnap.docs.map(d=>postRowHTML({id:d.id,...d.data()})).join("");
    attachPostEvents(wrap);
  }
}

async function toggleFollow(uid, u, iAmFollowing, requested){
  const myRef = doc(db, USERS_COL, currentUser.uid);
  const otherRef = doc(db, USERS_COL, uid);
  if(iAmFollowing){
    await updateDoc(myRef, { following: arrayRemove(uid) });
    await updateDoc(otherRef, { followers: arrayRemove(currentUser.uid) });
  }else if(!u.isPrivate || u.autoAcceptFollow){
    await updateDoc(myRef, { following: arrayUnion(uid) });
    await updateDoc(otherRef, { followers: arrayUnion(currentUser.uid) });
    await addDoc(collection(db, USERS_COL, uid, "notifications"), { text:`${myProfile.fullName} بدأ متابعتك`, createdAt: serverTimestamp() });
  }else if(!requested){
    await updateDoc(otherRef, { followRequests: arrayUnion(currentUser.uid) });
    await addDoc(collection(db, USERS_COL, uid, "notifications"), { text:`${myProfile.fullName} أرسل طلب متابعة`, createdAt: serverTimestamp() });
  }
  openOtherProfile(viewingUsername);
}

/* ============================================================
   الإعدادات
   ============================================================ */
function renderSettings(){
  const p = myProfile;
  $("set-fullname").value = p.fullName || "";
  $("set-bio").value = p.bio || "";
  $("toggle-private").checked = !!p.isPrivate;
  $("toggle-autoaccept").checked = !!p.autoAcceptFollow;
  renderLinkInputs(p.links || []);

  const status = planExpiryLabel(p);
  $("settings-pro-status").innerHTML = status
    ? `<p class="subtitle" style="text-align:right;">${status}</p><button class="btn btn-outline" id="btn-manage-plan">إدارة الاشتراك</button>`
    : `<p class="subtitle" style="text-align:right;">مفيش اشتراك برو حاليًا</p><button class="btn btn-accent" id="btn-manage-plan">عرض الباقات</button>`;
  $("btn-manage-plan").onclick = ()=>{ renderPlans(); show("screen-plans"); };

  if(p.isAdmin){ $("settings-admin-box").classList.remove("hidden"); }
  else{ $("settings-admin-box").classList.add("hidden"); }
}
function renderLinkInputs(links){
  const wrap = $("set-links-wrap");
  const maxLinks = myProfile.verifiedType ? 8 : (myProfile.isPro ? 3 : 1);
  wrap.innerHTML = links.map((l,i)=>`<div class="field" style="display:flex; gap:8px;"><input value="${l}" data-link-idx="${i}"><button class="btn btn-ghost btn-sm" data-remove-link="${i}">حذف</button></div>`).join("");
  wrap.dataset.max = maxLinks;
  wrap.querySelectorAll("[data-remove-link]").forEach(b=> b.onclick = ()=>{ links.splice(Number(b.dataset.removeLink),1); renderLinkInputs(links); });
}
$("btn-add-link").onclick = ()=>{
  const wrap = $("set-links-wrap");
  const current = [...wrap.querySelectorAll("input")].map(i=>i.value);
  const max = Number(wrap.dataset.max || 1);
  if(current.length >= max){ toast(`الحد الأقصى ${max} روابط حسب باقتك`); return; }
  current.push("");
  renderLinkInputs(current);
};

$("btn-upload-avatar").onclick = ()=> $("set-avatar-file").click();
$("set-avatar-file").addEventListener("change", async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const btn = $("btn-upload-avatar"); const original = btn.textContent; btn.innerHTML='<div class="spinner spinner-dark"></div>'; btn.disabled=true;
  try{
    const fd = new FormData(); fd.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method:"POST", body:fd });
    const data = await res.json();
    if(data.success){
      await updateDoc(doc(db, USERS_COL, currentUser.uid), { profilePic: data.data.url });
      myProfile.profilePic = data.data.url;
      $("mini-avatar").src = data.data.url;
      toast("تم تحديث الصورة");
    }else{ toast("تعذر رفع الصورة"); }
  }catch(err){ toast("تعذر رفع الصورة"); }
  btn.textContent = original; btn.disabled=false;
});

$("btn-save-profile").onclick = async ()=>{
  const links = [...$("set-links-wrap").querySelectorAll("input")].map(i=>i.value.trim()).filter(Boolean);
  await updateDoc(doc(db, USERS_COL, currentUser.uid), { fullName: $("set-fullname").value.trim(), bio: $("set-bio").value.trim(), links });
  myProfile.fullName = $("set-fullname").value.trim(); myProfile.bio = $("set-bio").value.trim(); myProfile.links = links;
  toast("تم حفظ التغييرات");
};
$("toggle-private").addEventListener("change", async ()=>{
  if(myProfile.verifiedType){ toast("الحسابات الموثّقة لا تدعم قفل الملف الشخصي"); $("toggle-private").checked=false; return; }
  await updateDoc(doc(db, USERS_COL, currentUser.uid), { isPrivate: $("toggle-private").checked });
  myProfile.isPrivate = $("toggle-private").checked;
});
$("toggle-autoaccept").addEventListener("change", async ()=>{
  await updateDoc(doc(db, USERS_COL, currentUser.uid), { autoAcceptFollow: $("toggle-autoaccept").checked });
  myProfile.autoAcceptFollow = $("toggle-autoaccept").checked;
});
$("btn-open-admin").onclick = ()=>{ renderAdmin(); show("screen-admin"); };

/* ============================================================
   الباقات والدفع (PayPal)
   ============================================================ */
const PLANS = {
  plus: { name:"باقة Plus", features:["فتح كل مميزات التطبيق ما عدا التوثيق","رفع صور وفيديوهات وملفات بلا حدود إضافية","دعم فني بأولوية","شارة مميزة على المنشورات","حتى 3 روابط في البروفايل"],
    tiers:[{label:"أسبوعي", egp:60, usd:1, days:7},{label:"شهري", egp:150, usd:2, days:30},{label:"3 أشهر", egp:450, usd:5, days:90},{label:"سنوي", egp:1800, usd:20, days:365}] },
  pro: { name:"باقة Pro (مبرمجين وتوثيق)", features:["كل مميزات Plus مضافًا إليها","إمكانية التقديم على شارة توثيق","حتى 8 روابط في البروفايل","دخول مبكر لمميزات غرفة البرمجة","دعم فني مباشر من الفريق"],
    tiers:[{label:"شهري", egp:250, usd:4, days:30},{label:"نصف سنوي", egp:1400, usd:20, days:182},{label:"سنة كاملة", egp:2800, usd:35, days:365}] }
};
function renderPlans(){
  const wrap = $("plans-content");
  wrap.innerHTML = Object.entries(PLANS).map(([key,plan])=>`
    <div class="glass-card plan-card" style="margin-bottom:16px;">
      <h3 style="margin:0;">${plan.name}</h3>
      <ul class="plan-list">${plan.features.map(f=>`<li><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${f}</li>`).join("")}</ul>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:8px;">
        ${plan.tiers.map(t=>`
          <div class="row-between" style="padding:10px 12px; background:var(--bg-sunk); border-radius:12px;">
            <div><b>${t.label}</b><div class="post-username">${t.egp} جنيه / ${t.usd}$</div></div>
            <div class="paypal-slot" data-plan="${key}" data-days="${t.days}" data-usd="${t.usd}" data-label="${t.label}"></div>
          </div>`).join("")}
      </div>
    </div>`).join("");
  loadPayPalSDK().then(()=>{
    document.querySelectorAll(".paypal-slot").forEach(slot=>{
      paypal.Buttons({
        style:{ layout:"horizontal", tagline:false, height:34, label:"pay" },
        createOrder:(data,actions)=> actions.order.create({ purchase_units:[{ amount:{ value: slot.dataset.usd } }] }),
        onApprove: async (data,actions)=>{
          await actions.order.capture();
          const days = Number(slot.dataset.days);
          const expires = new Date(Date.now() + days*86400000);
          await updateDoc(doc(db, USERS_COL, currentUser.uid), { isPro:true, proExpiresAt: expires, proPlan: slot.dataset.plan, proTier: slot.dataset.label });
          myProfile.isPro = true; myProfile.proExpiresAt = expires;
          toast("تم تفعيل اشتراكك، أهلاً بك في برو");
          show("screen-settings"); renderSettings();
        },
        onError:()=> toast("حدث خطأ في عملية الدفع")
      }).render(slot);
    });
  });
}
function loadPayPalSDK(){
  return new Promise((resolve)=>{
    if(window.paypal) return resolve();
    const s = document.createElement("script");
    s.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    s.onload = resolve; document.head.appendChild(s);
  });
}

/* ============================================================
   لوحة الإدارة
   ============================================================ */
async function renderAdmin(){
  const snap = await getDocs(query(collection(db, USERS_COL), orderBy("createdAt","desc"), limit(100)));
  renderAdminList(snap.docs.map(d=>({id:d.id,...d.data()})));
}
function renderAdminList(users){
  $("admin-users-list").innerHTML = users.map(u=>`
    <div class="glass-card section-pad" style="margin-bottom:10px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <img class="avatar avatar-sm" src="${u.profilePic||DEFAULT_AVATAR}">
        <div style="flex:1;"><div style="font-weight:700; display:flex; align-items:center; gap:5px;">${u.fullName} ${badgeHTML(u.verifiedType)}</div><div class="post-username">@${u.username}</div></div>
        ${u.banned?'<span class="chip" style="color:var(--danger);">محظور</span>':''}
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:12px;">
        <button class="btn btn-sm ${u.banned?'btn-outline':'btn-danger'}" data-ban="${u.id}" data-state="${u.banned}">${u.banned?'إلغاء الحظر':'حظر'}</button>
        <button class="btn btn-sm btn-outline" data-pro="${u.id}" data-state="${u.isPro}">${u.isPro?'إلغاء برو':'تفعيل برو'}</button>
        <button class="btn btn-sm btn-outline" data-admin="${u.id}" data-state="${u.isAdmin}">${u.isAdmin?'إزالة أدمن':'تعيين أدمن'}</button>
        <select class="btn btn-sm btn-outline" data-verify="${u.id}" style="appearance:auto;">
          <option value="">بدون توثيق</option>
          <option value="pro" ${u.verifiedType==='pro'?'selected':''}>توثيق برو</option>
          <option value="investigator" ${u.verifiedType==='investigator'?'selected':''}>محقق منه</option>
          <option value="developer" ${u.verifiedType==='developer'?'selected':''}>مبرمجين</option>
          <option value="app" ${u.verifiedType==='app'?'selected':''}>حساب التطبيق</option>
        </select>
      </div>
    </div>`).join("");

  $("admin-users-list").querySelectorAll("[data-ban]").forEach(b=> b.onclick = async ()=>{
    await updateDoc(doc(db,USERS_COL,b.dataset.ban), { banned: !(b.dataset.state==="true") });
    renderAdmin();
  });
  $("admin-users-list").querySelectorAll("[data-pro]").forEach(b=> b.onclick = async ()=>{
    await updateDoc(doc(db,USERS_COL,b.dataset.pro), { isPro: !(b.dataset.state==="true") });
    renderAdmin();
  });
  $("admin-users-list").querySelectorAll("[data-admin]").forEach(b=> b.onclick = async ()=>{
    await updateDoc(doc(db,USERS_COL,b.dataset.admin), { isAdmin: !(b.dataset.state==="true") });
    renderAdmin();
  });
  $("admin-users-list").querySelectorAll("[data-verify]").forEach(sel=> sel.onchange = async ()=>{
    await updateDoc(doc(db,USERS_COL,sel.dataset.verify), { verifiedType: sel.value || null });
  });
}
$("admin-search").addEventListener("input", async ()=>{
  const term = $("admin-search").value.trim().toLowerCase();
  const snap = await getDocs(query(collection(db, USERS_COL), orderBy("createdAt","desc"), limit(200)));
  const all = snap.docs.map(d=>({id:d.id,...d.data()}));
  renderAdminList(term ? all.filter(u=> (u.username||"").includes(term) || (u.fullName||"").toLowerCase().includes(term)) : all);
});

/* ============================================================
   فتح روابط مباشرة: بروفايل (?u=) أو منشور (?post=)
   أي مسار أو معرف غير موجود يوديك لصفحة 404 المميزة
   ============================================================ */
async function openPostDirect(postId){
  try{
    const snap = await getDoc(doc(db, POSTS_COL, postId));
    if(!snap.exists()){ showNotFound("المنشور ده مش موجود، يمكن اتحذف"); return; }
    const p = { id: snap.id, ...snap.data() };
    show("screen-other-profile");
    $("other-profile-title").textContent = "منشور";
    $("other-profile-content").innerHTML = `<div class="feed">${postRowHTML(p)}</div>`;
    attachPostEvents($("other-profile-content"));
  }catch(e){ showNotFound(); }
}

window.addEventListener("load", ()=>{
  const params = new URLSearchParams(location.search);
  const u = params.get("u");
  const postId = params.get("post");
  const validKeys = ["u","post",""];
  const hasUnknownParam = [...params.keys()].length>0 && !u && !postId;

  if(u || postId || hasUnknownParam){
    const check = setInterval(()=>{
      if(myProfile){
        clearInterval(check);
        if(u) openOtherProfile(u);
        else if(postId) openPostDirect(postId);
        else showNotFound();
      }
    }, 400);
  }
});

// أي محاولة فتح شاشة غير معرّفة داخل التطبيق تروح لصفحة 404
window.addEventListener("hashchange", ()=>{
  const target = location.hash.replace("#","");
  if(target && !document.getElementById(target)){ showNotFound(); }
});

/* ---------------- تسجيل Service Worker (PWA) ---------------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); });
}
