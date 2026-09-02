/* ===================================================================
   404 — منطق التطبيق
   =================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut,
  sendPasswordResetEmail, confirmPasswordReset, verifyPasswordResetCode
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc,
  query, where, orderBy, limit, onSnapshot, serverTimestamp,
  arrayUnion, arrayRemove, getDocs, startAt, endAt, increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

window.__appBooted = true; // إشارة إن الملف اتحمّل واشتغل فعليًا (تُستخدم في شاشة الحماية بـ index.html)

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
const ADMIN_WELCOME_EMAIL = "soudadteam@gmail.com";
const ADMIN_EMAILS = ["khwailedapp@gmail.com", "soudadteam@gmail.com"];
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
  const withLinks = escaped.replace(/((https?:\/\/|www\.)[^\s]+)/g, (m)=>{
    const href = m.startsWith("http") ? m : "https://"+m;
    return `<a href="${href}" target="_blank" rel="noopener">${m}</a>`;
  });
  return withLinks.replace(/(^|[\s])#([\u0600-\u06FFa-zA-Z0-9_]{2,40})/g, (m, pre, tag)=>{
    return `${pre}<span class="hashtag" data-hashtag="${tag}">#${tag}</span>`;
  });
}
function extractHashtags(text){
  const tags = new Set();
  const re = /#([\u0600-\u06FFa-zA-Z0-9_]{2,40})/g;
  let m;
  while((m = re.exec(text))){ tags.add(m[1].toLowerCase()); }
  return [...tags];
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
function lockChip(){
  return `<span class="chip" style="gap:4px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> خاص</span>`;
}
function socialLinkChip(l){
  if(typeof l === "string"){ l = { platform:"other", url:l }; }
  if(!l || !l.url) return "";
  const label = (SOCIAL_PLATFORMS[l.platform]||SOCIAL_PLATFORMS.other).label;
  let href = String(l.url).trim();
  if(l.platform==="phone" && !href.startsWith("tel:")) href = "tel:"+href.replace(/\s/g,"");
  else if(!href.startsWith("http") && !href.startsWith("tel:")) href = "https://"+href;
  return `<a class="chip" href="${href}" target="_blank" rel="noopener">${socialIconSvg(l.platform)} ${label}</a>`;
}
function sortByCreatedAtDesc(arr){
  return arr.sort((a,b)=>{
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt ? new Date(a.createdAt).getTime() : 0);
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt ? new Date(b.createdAt).getTime() : 0);
    return tb - ta;
  });
}
function planExpiryLabel(profile){
  if(!profile.planTier || profile.planTier==="free") return null;
  if(!profile.proExpiresAt) return null;
  const d = profile.proExpiresAt.toDate ? profile.proExpiresAt.toDate() : new Date(profile.proExpiresAt);
  if(d.getTime() < Date.now()) return null;
  const label = profile.planTier==="pro" ? "Pro" : "Plus";
  return `${label} — ساري حتى ${d.toLocaleDateString("ar-EG")}`;
}
function linkLimitFor(profile){
  if(profile.verifiedType) return 8;
  if(profile.planTier==="pro") return 8;
  if(profile.planTier==="plus") return 3;
  return 1;
}
function planChip(profile){
  if(profile.verifiedType) return "";
  if(profile.planTier==="pro") return '<span class="chip">Pro</span>';
  if(profile.planTier==="plus") return '<span class="chip">Plus</span>';
  return "";
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
  awaitingManualFlow = true;
  try{
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    currentUser = res.user;
    const uref = doc(db, USERS_COL, res.user.uid);
    const snap = await getDoc(uref);
    if(!snap.exists()){
      // مفيش حساب مسجّل بالإيميل ده مسبقًا — نرفض الدخول ونطلب منه يعمل حساب الأول
      awaitingManualFlow = false;
      await signOut(auth);
      toast("مفيش حساب عندك بالإيميل ده، سجّل حساب جديد الأول");
      show("screen-register");
      return;
    }
    awaitingManualFlow = false;
    await proceedAfterAuth(res.user, { id: res.user.uid, ...snap.data() });
  }catch(err){
    awaitingManualFlow = false;
    console.error(err);
    toast("تعذر الدخول بحساب جوجل، حاول تاني");
  }
};

$("link-forgot").onclick = (e)=>{
  e.preventDefault();
  openForgotPasswordModal();
};

function openForgotPasswordModal(){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet" style="text-align:right;">
      <div class="modal-sheet-handle"></div>
      <h3 style="margin:0 0 6px;">استعادة كلمة المرور</h3>
      <p class="subtitle" style="margin:0 0 14px; text-align:right;">اكتب بريدك الإلكتروني وهنبعتلك رابط لتعيين كلمة مرور جديدة</p>
      <div class="field"><input type="email" id="forgot-email-input" placeholder="name@email.com"></div>
      <p id="forgot-email-error" style="color:var(--danger); font-size:13px; display:none;"></p>
      <button class="btn btn-primary" id="btn-forgot-send">إرسال رابط إعادة التعيين</button>
    </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  const input = overlay.querySelector("#forgot-email-input");
  input.focus();
  overlay.querySelector("#btn-forgot-send").onclick = async ()=>{
    const email = input.value.trim();
    const err = overlay.querySelector("#forgot-email-error");
    err.style.display = "none";
    if(!email || !email.includes("@")){ err.textContent = "اكتب بريد إلكتروني صحيح"; err.style.display="block"; return; }
    const btn = overlay.querySelector("#btn-forgot-send");
    btn.innerHTML = '<div class="spinner"></div>'; btn.disabled = true;
    try{
      await sendPasswordResetEmail(auth, email, { url: `${location.origin}${location.pathname}`, handleCodeInApp:false });
      overlay.querySelector(".modal-sheet").innerHTML = `<div class="modal-sheet-handle"></div><h3 style="margin:0 0 8px;">تم الإرسال</h3><p class="subtitle" style="text-align:right;">لو البريد ده مسجّل عندنا، هيوصلّك رابط لتعيين كلمة مرور جديدة خلال دقائق. راجع صندوق الوارد أو الرسائل غير المرغوب فيها.</p><button class="btn btn-outline" style="margin-top:14px;" id="btn-forgot-close">تمام</button>`;
      overlay.querySelector("#btn-forgot-close").onclick = ()=> overlay.remove();
    }catch(e){
      btn.textContent = "إرسال رابط إعادة التعيين"; btn.disabled = false;
      err.textContent = e.code==="auth/invalid-email" ? "صيغة البريد غير صحيحة" : "تعذر إرسال الرابط، حاول مرة أخرى";
      err.style.display = "block";
    }
  };
}

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
  inputs.forEach((inp,i)=>{ if(i>0) inp.disabled = true; });
  inputs.forEach((inp,i)=>{
    inp.addEventListener("input", ()=>{
      inp.value = inp.value.replace(/\D/g,"");
      if(inp.value && i<inputs.length-1){ inputs[i+1].disabled = false; inputs[i+1].focus(); }
    });
    inp.addEventListener("keydown",(e)=>{
      if(e.key==="Backspace" && !inp.value && i>0){ inputs[i-1].focus(); inputs[i-1].value=""; for(let j=i;j<inputs.length;j++) inputs[j].disabled = true; }
    });
  });
}
setupPinAutoAdvance("pinlock-inputs");
setupPinAutoAdvance("reg-pin-inputs");
setupPinAutoAdvance("reg-pin-confirm-inputs");
function pinValue(containerId){ return [...$(containerId).querySelectorAll("input")].map(i=>i.value).join(""); }
function clearPinInputs(containerId){
  const inputs = [...$(containerId).querySelectorAll("input")];
  inputs.forEach((i,idx)=>{ i.value=""; i.disabled = idx>0; });
  inputs[0].focus();
}

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
  awaitingManualFlow = true;
  try{
    const cred = await createUserWithEmailAndPassword(auth, $("r-email").value.trim(), $("r-pass").value);
    currentUser = cred.user;
    const pinHash = await sha256(pin);
    const username = await generateUniqueUsername($("r-fullname").value);
    const profileData = {
      fullName: $("r-fullname").value.trim(),
      dob: $("r-dob").value,
      age: Number($("r-age").value)||null,
      nationality: $("r-nationality").value,
      countryCode: $("r-countrycode").value,
      phone: $("r-phone").value.trim(),
      email: $("r-email").value.trim(),
      username, bio:"", links:[], socials:{}, profilePic: DEFAULT_AVATAR,
      isPrivate:false, autoAcceptFollow:true, isAdmin:false, isPro:false, planTier:"free",
      verifiedType:null, verificationStatus:null, followers:[], following:[], followRequests:[],
      banned:false, pinHash, usernameChangedAt:null, createdAt: serverTimestamp()
    };
    await setDoc(doc(db, USERS_COL, cred.user.uid), profileData);
    sessionStorage.setItem("pinVerified","1");
    awaitingManualFlow = false;
    myProfile = { id: cred.user.uid, ...profileData };
    toast("تم إنشاء الحساب بنجاح");
    sendAdminWelcomeChat(cred.user.uid, myProfile);
    enterApp();
  }catch(e){
    awaitingManualFlow = false;
    console.error(e);
    err.textContent = e.code==="auth/email-already-in-use" ? "البريد الإلكتروني مستخدم بالفعل"
      : e.code==="permission-denied" ? "حصلت مشكلة، حاول تاني بعد شوية"
      : "حدث خطأ، حاول مرة أخرى";
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
$("btn-pinlock-logout").onclick = async ()=>{ sessionStorage.removeItem("pinVerified"); sessionStorage.removeItem("welcomeSent"); await signOut(auth); };
$("btn-logout").onclick = async ()=>{ sessionStorage.removeItem("pinVerified"); sessionStorage.removeItem("welcomeSent"); await signOut(auth); };

/* ============================================================
   دورة حياة المصادقة
   ============================================================ */
let awaitingManualFlow = false;

async function proceedAfterAuth(user, profile){
  myProfile = profile;

  // منح صلاحية الأدمن تلقائيًا لحسابات فريق الإدارة المعروفة
  if(ADMIN_EMAILS.includes((myProfile.email||"").toLowerCase()) && !myProfile.isAdmin){
    try{
      await updateDoc(doc(db, USERS_COL, user.uid), { isAdmin:true, planTier:"pro", isPro:true, verifiedType: myProfile.verifiedType || "app" });
      myProfile.isAdmin = true; myProfile.planTier = "pro"; myProfile.isPro = true;
      if(!myProfile.verifiedType) myProfile.verifiedType = "app";
    }catch(e){ console.error("تعذر منح صلاحية الأدمن:", e); }
  }

  if(myProfile.banned){ renderBannedScreen(); return; }

  if(!myProfile.pinHash){
    show("screen-register"); goRegStep(4);
    clearPinInputs("reg-pin-inputs"); clearPinInputs("reg-pin-confirm-inputs");
    $("btn-finish-register").onclick = async ()=>{
      const pin = pinValue("reg-pin-inputs"); const pinConfirm = pinValue("reg-pin-confirm-inputs");
      if(pin.length!==6){ toast("اكتب 6 أرقام"); return; }
      if(pin!==pinConfirm){ toast("الرمز غير متطابق"); return; }
      const hash = await sha256(pin);
      await updateDoc(doc(db, USERS_COL, user.uid), { pinHash: hash });
      myProfile.pinHash = hash;
      sessionStorage.setItem("pinVerified","1");
      enterApp();
    };
    return;
  }

  if(sessionStorage.getItem("pinVerified")==="1"){ enterApp(); }
  else{ show("screen-pinlock"); clearPinInputs("pinlock-inputs"); }

  sendLoginWelcome(user, myProfile);
}

let resettingPassword = false;
onAuthStateChanged(auth, async (user)=>{
  currentUser = user;
  if(unsubFeed) unsubFeed(); if(unsubCodeFeed) unsubCodeFeed(); if(unsubNotifs) unsubNotifs();
  $("splash").classList.add("hide"); sessionStorage.removeItem("__autoRetried");
  if(resettingPassword) return; // فتح رابط استعادة كلمة المرور — منسيبش أي تنقل يقاطعه
  if(!user){ myProfile=null; $("tabbar").classList.add("hidden"); show("screen-login"); return; }
  if(awaitingManualFlow) return; // شاشة التسجيل بتتظبط يدويًا بعد ما المستند يتحفظ

  try{
    const uref = doc(db, USERS_COL, user.uid);
    const snap = await getDoc(uref);
    if(!snap.exists()){ show("screen-register"); return; }
    await proceedAfterAuth(user, { id:user.uid, ...snap.data() });
  }catch(e){
    console.error(e);
    toast("تعذر الاتصال، حاول تاني");
    show("screen-login");
  }
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

async function sendLoginWelcome(user, profile){
  if(sessionStorage.getItem("welcomeSent")==="1") return;
  sessionStorage.setItem("welcomeSent","1");
  try{
    await addDoc(collection(db,"mail"), {
      to:[user.email],
      message:{
        subject:`Welcome ${profile.fullName} — تسجيل دخول جديد على 404`,
        text:`Welcome ${profile.fullName}, a user has logged into your account on 404.\nأهلاً بك يا ${profile.fullName}، قام أحد المستخدمين بالدخول إلى حسابك على تطبيق 404.\n\nفريق الدعم — ${ADMIN_WELCOME_EMAIL}`,
        from: `فريق 404 <${ADMIN_WELCOME_EMAIL}>`
      }
    });
  }catch(e){ /* يتطلب تفعيل إضافة Trigger Email من Firebase Extensions */ }
  try{
    await addDoc(collection(db, USERS_COL, user.uid, "notifications"), {
      text:`مرحبًا بك يا ${profile.fullName}، رسالة ترحيب من فريق الإدارة (${ADMIN_WELCOME_EMAIL})`,
      fromAdmin:true, createdAt: serverTimestamp()
    });
  }catch(e){ /* لو فشل الإشعار، الرسالة بالبريد اتبعتت بالفعل */ }
}

function enterApp(){
  $("tabbar").classList.remove("hidden");
  $("mini-avatar").src = myProfile.profilePic || DEFAULT_AVATAR;
  $("composer-admin-tools").style.display = myProfile.isAdmin ? "flex" : "none";
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

/* ---------- إرفاق صورة في المنشور (متاح لكل المستخدمين) ---------- */
let pendingComposerImageUrl = null;
$("btn-composer-image").onclick = ()=> $("composer-image-file").click();
$("composer-image-file").addEventListener("change", async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const btn = $("btn-composer-image"); btn.innerHTML = '<div class="spinner spinner-dark"></div>';
  try{
    const fd = new FormData(); fd.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method:"POST", body:fd });
    const data = await res.json();
    if(data.success){
      pendingComposerImageUrl = data.data.url;
      $("composer-media-preview").innerHTML = `<div class="composer-media-preview protected-media"><img src="${pendingComposerImageUrl}" oncontextmenu="return false" draggable="false"><div class="remove-media" id="btn-remove-composer-image"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></div></div>`;
      $("btn-remove-composer-image").onclick = ()=>{ pendingComposerImageUrl=null; $("composer-media-preview").innerHTML=""; };
    }else{ toast("تعذر رفع الصورة"); }
  }catch(err){ toast("تعذر رفع الصورة"); }
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
  e.target.value = "";
});
/* ---------- أزرار إرفاق PDF/فيديو/صوت للأدمن فقط عبر نافذة أنيقة (بدل الرابط اليدوي) ---------- */
let pendingAdminMedia = null;
function renderAdminMediaPreview(){
  const chip = $("admin-media-preview-chip");
  if(!pendingAdminMedia){ chip.style.display="none"; chip.textContent=""; return; }
  const labels = { pdf:"ملف PDF مرفق", video:"فيديو مرفق", audio:"رسالة صوتية مرفقة" };
  chip.style.display = "inline-flex";
  chip.textContent = labels[pendingAdminMedia.type] + " ✕";
  chip.onclick = ()=>{ pendingAdminMedia=null; renderAdminMediaPreview(); };
}
function openAdminMediaModal(type, title, placeholder){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:right;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 10px;">${title}</h3>
    <div class="field"><input id="admin-media-url-input" placeholder="${placeholder}"></div>
    <button class="btn btn-primary" id="btn-admin-media-confirm">إرفاق</button>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  const input = overlay.querySelector("#admin-media-url-input"); input.focus();
  overlay.querySelector("#btn-admin-media-confirm").onclick = ()=>{
    const url = input.value.trim();
    if(!url.startsWith("http")){ toast("اكتب رابط صحيح يبدأ بـ http"); return; }
    pendingAdminMedia = { type, url };
    renderAdminMediaPreview();
    overlay.remove();
  };
}
$("btn-attach-pdf").onclick = ()=> openAdminMediaModal("pdf","إرفاق ملف PDF","رابط الملف ينتهي بـ .pdf");
$("btn-attach-video").onclick = ()=> openAdminMediaModal("video","إرفاق فيديو","رابط الفيديو ينتهي بـ .mp4");
$("btn-attach-audio").onclick = ()=> openAdminMediaModal("audio","إرفاق رسالة صوتية","رابط الصوت ينتهي بـ .mp3");

/* ---------- اكتشاف روابط PDF / فيديو / صوت — نشرها للأدمن فقط ---------- */
function extractMediaLink(text){
  const m = text.match(/https?:\/\/[^\s]+?\.(pdf|mp4|mp3|wav|m4a)(\?[^\s]*)?/i);
  if(!m) return null;
  const ext = m[1].toLowerCase();
  const type = ext==="pdf" ? "pdf" : (ext==="mp4" ? "video" : "audio");
  return { type, url:m[0] };
}

async function submitPost(textarea, maxLen, isCode){
  const text = textarea.value.trim();
  if(!text && !pendingComposerImageUrl && !pendingAdminMedia){ toast("اكتب شيئًا أولاً"); return; }
  if(text.length > maxLen){ toast("النص طويل جدًا"); return; }

  const detectedMedia = extractMediaLink(text);
  const finalMedia = myProfile.isAdmin ? (pendingAdminMedia || detectedMedia) : null;
  const hashtags = extractHashtags(text);

  try{
    const postData = {
      authorId: currentUser.uid,
      authorUsername: myProfile.username,
      authorName: myProfile.fullName,
      authorNameColor: myProfile.nameColor || null,
      authorSignature: (myProfile.planTier==="pro"||myProfile.isAdmin) ? (myProfile.signature||null) : null,
      authorPic: myProfile.profilePic || DEFAULT_AVATAR,
      authorVerified: myProfile.verifiedType || null,
      authorPlan: myProfile.isAdmin ? "admin" : (myProfile.planTier||"free"),
      text, room: isCode ? "code" : "general",
      imageUrl: !isCode && pendingComposerImageUrl ? pendingComposerImageUrl : null,
      mediaType: finalMedia ? finalMedia.type : null,
      mediaUrl: finalMedia ? finalMedia.url : null,
      hashtags,
      pinned:false, globalPinned:false,
      likes:[], commentsCount:0, createdAt: serverTimestamp()
    };
    await addDoc(collection(db, POSTS_COL), postData);
    textarea.value=""; textarea.dispatchEvent(new Event("input"));
    pendingComposerImageUrl = null; $("composer-media-preview") && ($("composer-media-preview").innerHTML="");
    pendingAdminMedia = null; renderAdminMediaPreview();
    toast("تم النشر");
  }catch(e){ toast("تعذر النشر، حاول مرة أخرى"); }
}

function mediaBlockHTML(p){
  let html = "";
  if(p.imageUrl){
    html += `<div class="post-image-wrap protected-media"><img src="${p.imageUrl}" oncontextmenu="return false" draggable="false" loading="lazy"></div>`;
  }
  if(p.mediaType==="pdf" && p.mediaUrl){
    html += `<div class="post-media-card">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg>
      <div class="media-info"><b>ملف PDF من فريق 404</b><span class="post-username">اضغط للتحميل المباشر</span></div>
      <a class="btn btn-primary btn-sm" href="${p.mediaUrl}" download target="_blank" rel="noopener">تحميل</a>
    </div>`;
  }
  if(p.mediaType==="video" && p.mediaUrl){
    html += `<div class="post-video-wrap protected-media"><video src="${p.mediaUrl}" controls controlsList="nodownload" disablePictureInPicture oncontextmenu="return false"></video></div>`;
  }
  if(p.mediaType==="audio" && p.mediaUrl){
    html += `<div class="post-audio-wrap protected-media"><audio src="${p.mediaUrl}" controls controlsList="nodownload" oncontextmenu="return false"></audio></div>`;
  }
  return html;
}

function postRowHTML(p){
  const liked = (p.likes||[]).includes(currentUser?.uid);
  const nameStyle = p.authorNameColor ? `style="color:${p.authorNameColor}"` : "";
  const avatarHTML = (p.authorPlan==="pro" || p.authorPlan==="admin")
    ? `<span class="avatar-pro-ring"><img class="avatar" style="width:38px;height:38px;" src="${p.authorPic||DEFAULT_AVATAR}"></span>`
    : `<img class="avatar" src="${p.authorPic||DEFAULT_AVATAR}">`;
  const pinTag = (p.pinned||p.globalPinned) ? `<div class="pinned-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l1.5 5.5L19 9l-4 3.5L16 18l-4-3-4 3 1-5.5L5 9l5.5-1.5L12 2z"/></svg>${p.globalPinned?'مثبّت من الإدارة':'منشور مثبّت'}</div>` : "";
  const isOwner = myProfile && myProfile.id===p.authorId;
  const canPinOwn = isOwner && (myProfile.planTier==="pro" || myProfile.isAdmin);
  const isAdmin = myProfile && myProfile.isAdmin;
  const showMenu = isOwner || isAdmin || (myProfile && !isOwner);
  const signatureHTML = p.authorSignature ? `<div class="post-time meta-font" style="margin-top:8px; color:var(--muted); font-style:italic;">${linkify(p.authorSignature)}</div>` : "";

  return `
  <div class="glass-card post" data-id="${p.id}">
    ${pinTag}
    <div class="post-head">
      ${avatarHTML}
      <div style="flex:1;">
        <div class="post-author" data-open-user="${p.authorUsername}" ${nameStyle}>${p.authorName||"مستخدم"} ${badgeHTML(p.authorVerified)}</div>
        <div class="post-username">@${p.authorUsername||""}</div>
        <div class="post-time meta-font">${timeAgo(p.createdAt)}</div>
      </div>
      ${showMenu ? `<button class="icon-btn post-menu-btn" data-post-menu="${p.id}" data-owner="${isOwner}" data-pinned="${!!p.pinned}" data-global-pinned="${!!p.globalPinned}" data-canpin="${canPinOwn}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg></button>` : ""}
    </div>
    <div class="post-text">${linkify(p.text||"")}</div>
    ${mediaBlockHTML(p)}
    ${signatureHTML}
    <div class="post-actions">
      <button class="post-action like-btn ${liked?"liked":""}" data-id="${p.id}" data-liked="${liked}">
        <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>
        <span class="like-count" data-open-likers="${p.id}">${(p.likes||[]).length}</span>
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

function postMenuOptions(btn){
  const postId = btn.dataset.postMenu;
  const isOwner = btn.dataset.owner==="true";
  const canPin = btn.dataset.canpin==="true";
  const pinned = btn.dataset.pinned==="true";
  const globalPinned = btn.dataset.globalPinned==="true";
  const opts = [];
  if(canPin) opts.push({ label: pinned?"إلغاء تثبيت المنشور":"تثبيت في بروفايلي", action:()=>toggleOwnPinAction(postId, pinned) });
  if(myProfile.isAdmin) opts.push({ label: globalPinned?"إلغاء التثبيت العام":"تثبيت في الفيد للجميع", action:()=>toggleGlobalPinAction(postId, globalPinned) });
  if(isOwner || myProfile.isAdmin) opts.push({ label:"حذف المنشور", danger:true, action:()=>deletePostAction(postId) });
  if(!isOwner) opts.push({ label:"إبلاغ عن المنشور", action:()=>openReportModal(postId) });
  return opts;
}

async function toggleOwnPinAction(postId, currentlyPinned){
  const newState = !currentlyPinned;
  try{
    if(newState){
      const prev = await getDocs(query(collection(db,POSTS_COL), where("authorId","==",myProfile.id), where("pinned","==",true), limit(5)));
      await Promise.all(prev.docs.map(d=> updateDoc(doc(db,POSTS_COL,d.id), { pinned:false })));
    }
    await updateDoc(doc(db, POSTS_COL, postId), { pinned:newState });
    toast(newState ? "تم تثبيت المنشور في بروفايلك" : "تم إلغاء التثبيت");
  }catch(e){ toast("تعذر تنفيذ العملية"); }
}
async function toggleGlobalPinAction(postId, currentlyPinned){
  const newState = !currentlyPinned;
  try{
    if(newState){
      const prev = await getDocs(query(collection(db,POSTS_COL), where("globalPinned","==",true), limit(5)));
      await Promise.all(prev.docs.map(d=> updateDoc(doc(db,POSTS_COL,d.id), { globalPinned:false })));
    }
    await updateDoc(doc(db, POSTS_COL, postId), { globalPinned:newState });
    toast(newState ? "تم تثبيت المنشور للجميع" : "تم إلغاء التثبيت العام");
  }catch(e){ toast("تعذر تنفيذ العملية"); }
}
async function deletePostAction(postId){
  if(!confirm("تأكيد حذف المنشور؟ الإجراء ده نهائي")) return;
  try{ await deleteDoc(doc(db, POSTS_COL, postId)); toast("تم حذف المنشور"); }
  catch(e){ toast("تعذر حذف المنشور، حاول تاني"); }
}
function openReportModal(postId){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:right;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 10px;">إبلاغ عن المنشور</h3>
    <div class="field"><label>سبب الإبلاغ</label><textarea id="report-reason-input" rows="3" placeholder="اكتب سبب الإبلاغ بالتفصيل..."></textarea></div>
    <button class="btn btn-danger" id="btn-submit-report">إرسال البلاغ</button>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  overlay.querySelector("#btn-submit-report").onclick = async ()=>{
    const reason = overlay.querySelector("#report-reason-input").value.trim();
    if(!reason){ toast("اكتب سبب الإبلاغ"); return; }
    try{
      await addDoc(collection(db,"reports"), { postId, reason, reporterId: currentUser.uid, reporterUsername: myProfile.username, status:"pending", createdAt: serverTimestamp() });
      toast("تم إرسال البلاغ، شكرًا لك");
      overlay.remove();
    }catch(e){ toast("تعذر إرسال البلاغ"); }
  };
}

function attachPostEvents(container){
  container.querySelectorAll(".like-btn").forEach(btn=>{
    btn.onclick = async (e)=>{
      if(e.target.closest("[data-open-likers]")) return;
      const id = btn.dataset.id; const liked = btn.dataset.liked==="true";
      btn.disabled = true;
      try{
        const pref = doc(db, POSTS_COL, id);
        await updateDoc(pref, { likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
      }catch(err){
        console.error(err);
        toast("تعذر تسجيل الإعجاب، حاول تاني");
      }
      btn.disabled = false;
    };
  });
  container.querySelectorAll("[data-open-likers]").forEach(el=>{
    el.onclick = async (e)=>{ e.stopPropagation(); openLikersModal(el.dataset.openLikers); };
  });
  container.querySelectorAll(".comment-btn").forEach(btn=>{
    btn.onclick = ()=> openCommentsModal(btn.dataset.id);
  });
  container.querySelectorAll(".share-btn").forEach(btn=>{
    btn.onclick = ()=>{
      const url = `${location.origin}${location.pathname}?post=${btn.dataset.id}`;
      navigator.clipboard?.writeText(url);
      toast("تم نسخ رابط المنشور");
    };
  });
  container.querySelectorAll("[data-own-pin]").forEach(btn=>{
    btn.onclick = async ()=>{
      const newState = !(btn.dataset.state==="true");
      if(newState){
        // نلغي أي تثبيت سابق لباقي منشورات نفس المستخدم أولًا
        const prev = await getDocs(query(collection(db,POSTS_COL), where("authorId","==",myProfile.id), where("pinned","==",true), limit(5)));
        await Promise.all(prev.docs.map(d=> updateDoc(doc(db,POSTS_COL,d.id), { pinned:false })));
      }
      await updateDoc(doc(db, POSTS_COL, btn.dataset.ownPin), { pinned:newState });
      toast(newState ? "تم تثبيت المنشور في بروفايلك" : "تم إلغاء التثبيت");
    };
  });
  container.querySelectorAll("[data-global-pin]").forEach(btn=>{
    btn.onclick = async ()=>{
      const newState = !(btn.dataset.state==="true");
      if(newState){
        const prev = await getDocs(query(collection(db,POSTS_COL), where("globalPinned","==",true), limit(5)));
        await Promise.all(prev.docs.map(d=> updateDoc(doc(db,POSTS_COL,d.id), { globalPinned:false })));
      }
      await updateDoc(doc(db, POSTS_COL, btn.dataset.globalPin), { globalPinned:newState });
      toast(newState ? "تم تثبيت المنشور للجميع" : "تم إلغاء التثبيت العام");
    };
  });
  container.querySelectorAll("[data-open-user]").forEach(el=>{
    el.style.cursor="pointer";
    el.onclick = ()=> openOtherProfile(el.dataset.openUser);
  });
  container.querySelectorAll(".hashtag").forEach(el=>{
    el.onclick = ()=> openHashtagResults(el.dataset.hashtag);
  });
  container.querySelectorAll("[data-post-menu]").forEach(btn=>{
    btn.onclick = (e)=>{ e.stopPropagation(); openPostMenu(btn); };
  });
}

function openPostMenu(btn){
  document.querySelectorAll(".dropdown-menu").forEach(m=>m.remove());
  const opts = postMenuOptions(btn);
  if(!opts.length) return;
  const rect = btn.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "dropdown-menu";
  menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.innerHTML = opts.map((o,i)=>`<button data-opt-idx="${i}" class="${o.danger?'danger':''}">${o.label}</button>`).join("");
  document.body.appendChild(menu);
  menu.querySelectorAll("button").forEach((b,i)=>{
    b.onclick = ()=>{ menu.remove(); opts[i].action(); };
  });
  setTimeout(()=>{
    document.addEventListener("click", function closeMenu(e){
      if(!menu.contains(e.target)){ menu.remove(); document.removeEventListener("click", closeMenu); }
    });
  }, 0);
}

async function openHashtagResults(tag){
  show("screen-hashtag");
  $("hashtag-title").textContent = "#"+tag;
  $("hashtag-results").innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
  try{
    const q = query(collection(db, POSTS_COL), where("hashtags","array-contains", tag.toLowerCase()), limit(60));
    const snap = await getDocs(q);
    if(snap.empty){ $("hashtag-results").innerHTML = `<div class="empty-state"><p>مفيش منشورات بالهاشتاج ده لسه</p></div>`; return; }
    const posts = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id,...d.data()})));
    $("hashtag-results").innerHTML = posts.map(p=>postRowHTML(p)).join("");
    attachPostEvents($("hashtag-results"));
  }catch(e){ console.error(e); $("hashtag-results").innerHTML = `<div class="empty-state"><p>تعذر تحميل النتائج</p></div>`; }
}

async function openCommentsModal(postId){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-sheet" style="max-height:80vh; display:flex; flex-direction:column; padding-bottom:10px;">
      <div class="modal-sheet-handle"></div>
      <h3 style="margin:0 0 10px;">التعليقات</h3>
      <div id="comments-list-inner" style="flex:1; overflow-y:auto; margin-bottom:10px;"><div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div></div>
      <div class="glass-card composer" style="padding:10px;">
        <textarea id="new-comment-input" placeholder="اكتب تعليقك..." rows="1" style="min-height:20px;"></textarea>
        <div class="composer-actions">
          <span class="chip" id="comment-counter">0 / 300</span>
          <button class="btn btn-accent btn-sm" id="btn-submit-comment">إرسال</button>
        </div>
      </div>
    </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  const input = overlay.querySelector("#new-comment-input");
  input.addEventListener("input", ()=>{ overlay.querySelector("#comment-counter").textContent = `${input.value.length} / 300`; });

  async function loadComments(){
    const snap = await getDocs(query(collection(db, POSTS_COL, postId, "comments"), limit(100)));
    const comments = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id,...d.data()})));
    const listEl = overlay.querySelector("#comments-list-inner");
    if(!comments.length){ listEl.innerHTML = `<div class="empty-state"><p>لسه مفيش تعليقات، اكتب الأول</p></div>`; return; }
    listEl.innerHTML = comments.map(c=>`
      <div class="likers-row" style="align-items:flex-start;">
        <img class="avatar avatar-sm" src="${c.authorPic||DEFAULT_AVATAR}">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:13px; display:flex; align-items:center; gap:5px;" data-open-user="${c.authorUsername||''}">${c.authorName||"مستخدم"} ${badgeHTML(c.authorVerified)}</div>
          <div class="post-text" style="font-size:13.5px; margin-top:2px; user-select:text; -webkit-user-select:text;">${linkify(c.text||"")}</div>
          <div class="post-time meta-font" style="margin-top:3px;">${timeAgo(c.createdAt)}</div>
        </div>
      </div>`).join("");
    listEl.querySelectorAll("[data-open-user]").forEach(el=>{
      if(!el.dataset.openUser) return;
      el.style.cursor="pointer";
      el.onclick = ()=>{ overlay.remove(); openOtherProfile(el.dataset.openUser); };
    });
  }
  loadComments();

  overlay.querySelector("#btn-submit-comment").onclick = async ()=>{
    const text = input.value.trim();
    if(!text) return;
    if(text.length>300){ toast("التعليق طويل جدًا"); return; }
    const btn = overlay.querySelector("#btn-submit-comment"); btn.disabled = true;
    try{
      await addDoc(collection(db, POSTS_COL, postId, "comments"), {
        authorId: currentUser.uid, authorName: myProfile.fullName, authorUsername: myProfile.username,
        authorPic: myProfile.profilePic || DEFAULT_AVATAR, authorVerified: myProfile.verifiedType || null,
        text, createdAt: serverTimestamp()
      });
      const postSnap = await getDoc(doc(db, POSTS_COL, postId));
      await updateDoc(doc(db, POSTS_COL, postId), { commentsCount: (postSnap.data().commentsCount||0)+1 });
      input.value = ""; input.dispatchEvent(new Event("input"));
      loadComments();
    }catch(e){ toast("تعذر إرسال التعليق"); }
    btn.disabled = false;
  };
}
  const psnap = await getDoc(doc(db, POSTS_COL, postId));
  if(!psnap.exists()) return;
  const likes = psnap.data().likes || [];
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet"><div class="modal-sheet-handle"></div><h3 style="margin:0 0 10px;">الإعجابات (${likes.length})</h3><div id="likers-list-inner"></div></div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  const inner = overlay.querySelector("#likers-list-inner");
  if(!likes.length){ inner.innerHTML = `<p class="subtitle">محدش عمل لايك لسه</p>`; return; }
  const chunks = [];
  for(let i=0;i<likes.length;i+=10) chunks.push(likes.slice(i,i+10));
  let html = "";
  for(const chunk of chunks){
    const q = query(collection(db, USERS_COL), where("__name__","in",chunk));
    const snap = await getDocs(q);
    snap.docs.forEach(d=>{
      const u = d.data();
      html += `<div class="likers-row"><img class="avatar avatar-sm" src="${u.profilePic||DEFAULT_AVATAR}"><div style="font-weight:600; font-size:13.5px;">${u.fullName} ${badgeHTML(u.verifiedType)}</div></div>`;
    });
  }
  inner.innerHTML = html || `<p class="subtitle">محدش عمل لايك لسه</p>`;
}

function startFeedListener(){
  const q = query(collection(db, POSTS_COL), where("room","==","general"), limit(80));
  unsubFeed = onSnapshot(q, (snap)=>{
    const list = $("feed-list");
    if(snap.empty){ list.innerHTML=""; $("feed-empty").classList.remove("hidden"); return; }
    $("feed-empty").classList.add("hidden");
    const docs = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id, ...d.data()})));
    docs.sort((a,b)=> (b.globalPinned===true) - (a.globalPinned===true));
    list.innerHTML = docs.map(p=>postRowHTML(p)).join("");
    attachPostEvents(list);
  }, (err)=>{ console.error("feed error:", err); toast("تعذر تحميل الفيد، حاول تاني"); });
}
function startCodeFeedListener(){
  const q = query(collection(db, POSTS_COL), where("room","==","code"), limit(80));
  unsubCodeFeed = onSnapshot(q, (snap)=>{
    const list = $("code-feed-list");
    if(snap.empty){ list.innerHTML=""; $("code-feed-empty").classList.remove("hidden"); return; }
    $("code-feed-empty").classList.add("hidden");
    const docs = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id, ...d.data()})));
    list.innerHTML = docs.map(p=>postRowHTML(p)).join("");
    attachPostEvents(list);
  }, (err)=>{ console.error("code feed error:", err); toast("تعذر تحميل غرفة البرمجة، حاول تاني"); });
}

/* ============================================================
   الإشعارات — مع صوت عند وصول إشعار جديد
   ============================================================ */
function playNotifSound(){
  try{
    const ctx = new (window.AudioContext||window.webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+0.35);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime+0.36);
  }catch(e){}
}
let notifsFirstLoad = true;
function startNotifsListener(){
  notifsFirstLoad = true;
  const q = query(collection(db, USERS_COL, currentUser.uid, "notifications"), orderBy("createdAt","desc"), limit(40));
  unsubNotifs = onSnapshot(q, (snap)=>{
    if(!notifsFirstLoad){
      snap.docChanges().forEach(ch=>{ if(ch.type==="added") playNotifSound(); });
    }
    notifsFirstLoad = false;
    const list = $("notifs-list");
    if(snap.empty){ list.innerHTML=""; $("notifs-empty").classList.remove("hidden"); return; }
    $("notifs-empty").classList.add("hidden");
    list.innerHTML = snap.docs.map(d=>{
      const n = d.data();
      return `<div class="notif-item">${n.fromAdmin?'<div class="notif-dot" style="background:var(--gold);"></div>':'<div class="notif-dot"></div>'}<div>${n.fromAdmin?'<div class="chip" style="margin-bottom:5px;">رسالة من الإدارة</div>':''}<div style="font-size:14px;">${n.text||""}</div><div class="post-time meta-font" style="margin-top:4px;">${timeAgo(n.createdAt)}</div></div></div>`;
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
    <div class="profile-cover" style="${p.coverPhoto?`background-image:url('${p.coverPhoto}'); background-size:cover; background-position:center;`:''}"></div>
    <div class="profile-head">
      <img class="profile-avatar" src="${p.profilePic||DEFAULT_AVATAR}">
      <div class="profile-name">${p.fullName} ${badgeHTML(p.verifiedType)} ${planChip(p)}</div>
      <div class="post-username">@${p.username} ${p.isPrivate?lockChip():''}</div>
      ${p.bio?`<div class="profile-bio">${linkify(p.bio)}</div>`:""}
      ${(p.links&&p.links.length)?`<div class="profile-links">${p.links.map(l=>socialLinkChip(l)).join("")}</div>`:""}
      <div class="profile-stats">
        <div><b>${(p.followers||[]).length}</b> <span>متابِع</span></div>
        <div><b>${(p.following||[]).length}</b> <span>متابَع</span></div>
      </div>
      ${expiry?`<div class="locked-note" style="margin-top:14px;">${expiry}</div>`:""}
      ${(!p.planTier || p.planTier==="free")?`<button class="btn btn-accent" style="margin-top:14px;" id="btn-goto-plans">الترقية إلى Plus أو Pro</button>`:""}
    </div>
    <div class="divider"></div>
    <div class="feed" id="my-posts-feed"></div>
  `;
  $("btn-goto-plans") && ($("btn-goto-plans").onclick = ()=>{ renderPlans(); show("screen-plans"); });

  const q = query(collection(db, POSTS_COL), where("authorId","==",currentUser.uid), limit(60));
  const psnap = await getDocs(q);
  const wrap = $("my-posts-feed");
  const myPosts = sortByCreatedAtDesc(psnap.docs.map(d=>({id:d.id,...d.data()})));
  myPosts.sort((a,b)=> (b.pinned===true) - (a.pinned===true));
  wrap.innerHTML = psnap.empty ? `<div class="empty-state"><p>لسه مفيش منشورات</p></div>` : myPosts.map(p=>postRowHTML(p)).join("");
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

  trackProfileVisit(uid);

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
    <div class="profile-cover" style="${u.coverPhoto?`background-image:url('${u.coverPhoto}'); background-size:cover; background-position:center;`:''}"></div>
    <div class="profile-head">
      <img class="profile-avatar" src="${u.profilePic||DEFAULT_AVATAR}">
      <div class="profile-name">${u.fullName} ${badgeHTML(u.verifiedType)}</div>
      <div class="post-username">@${u.username} ${u.isPrivate?lockChip():''}</div>
      ${u.bio?`<div class="profile-bio">${linkify(u.bio)}</div>`:""}
      ${(u.links&&u.links.length)?`<div class="profile-links">${u.links.map(l=>socialLinkChip(l)).join("")}</div>`:""}
      <div class="profile-stats"><div><b>${(u.followers||[]).length}</b> <span>متابِع</span></div><div><b>${(u.following||[]).length}</b> <span>متابَع</span></div></div>
      <div style="margin-top:14px; display:flex; gap:10px;">${followBtn}<button class="btn btn-outline" id="btn-message-user" style="flex:0; padding:12px 16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button></div>
    </div>
    <div class="divider"></div>
    <div class="feed" id="other-posts-feed">
      ${isLockedForMe ? `<div class="locked-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> الحساب خاص، تابِعه عشان تشوف منشوراته</div>` : `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`}
    </div>
  `;

  const followBtnEl = $("btn-follow-toggle");
  if(followBtnEl) followBtnEl.onclick = ()=> toggleFollow(uid, u, iAmFollowing, requested);
  $("btn-message-user").onclick = ()=> openChatWithUser(uid);

  if(!isLockedForMe){
    const pq = query(collection(db, POSTS_COL), where("authorId","==",uid), where("room","==","general"), limit(60));
    const psnap = await getDocs(pq);
    const wrap = $("other-posts-feed");
    const theirPosts = sortByCreatedAtDesc(psnap.docs.map(d=>({id:d.id,...d.data()})));
    wrap.innerHTML = psnap.empty ? `<div class="empty-state"><p>لا يوجد منشورات</p></div>` : theirPosts.map(p=>postRowHTML(p)).join("");
    attachPostEvents(wrap);
  }
}

async function trackProfileVisit(uid){
  try{
    await updateDoc(doc(db, USERS_COL, uid), { profileViews: increment(1) });
    await addDoc(collection(db, USERS_COL, uid, "visitors"), {
      visitorId: currentUser.uid, visitorName: myProfile.fullName, visitorUsername: myProfile.username,
      visitorPic: myProfile.profilePic || DEFAULT_AVATAR, createdAt: serverTimestamp()
    });
  }catch(e){ /* لو الصلاحيات مش مفعّلة، العداد مش هيتحدث بس باقي التطبيق يشتغل عادي */ }
}

async function renderVisitorsScreen(){
  const wrap = $("visitors-list-wrap");
  const p = myProfile;
  if(p.planTier!=="plus" && p.planTier!=="pro" && !p.isAdmin){
    wrap.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      <p>ميزة زوار البروفايل متاحة لمشتركي Plus وPro</p>
      <button class="btn btn-accent btn-sm" id="btn-visitors-upgrade" style="margin-top:10px;">عرض الباقات</button>
    </div>`;
    $("btn-visitors-upgrade").onclick = ()=>{ renderPlans(); show("screen-plans"); };
    return;
  }
  wrap.innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
  const totalViews = p.profileViews || 0;

  if(p.planTier==="plus" && !p.isAdmin){
    wrap.innerHTML = `<div class="glass-card section-pad" style="text-align:center;">
      <div style="font-size:34px; font-weight:800;">${totalViews}</div>
      <p class="subtitle">إجمالي زيارات بروفايلك</p>
      <p class="feature-lock-note" style="justify-content:center; margin-top:14px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        قائمة أسماء الزوار بالتفصيل متاحة لمشتركي Pro
      </p>
    </div>`;
    return;
  }

  // Pro / Admin: قائمة تفصيلية بالزوار
  const snap = await getDocs(query(collection(db, USERS_COL, currentUser.uid, "visitors"), limit(100)));
  const visitors = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id, ...d.data()}))).slice(0,30);
  let html = `<div class="glass-card section-pad" style="text-align:center; margin-bottom:14px;">
    <div style="font-size:34px; font-weight:800;">${totalViews}</div>
    <p class="subtitle">إجمالي زيارات بروفايلك</p>
  </div>`;
  if(!visitors.length){
    html += `<div class="empty-state"><p>محدش زار بروفايلك لسه</p></div>`;
  }else{
    html += `<div class="glass-card" style="padding:0;">` + visitors.map((v,i)=>`
      <div class="likers-row" style="padding:12px 16px; ${i<visitors.length-1?'':'border-bottom:none;'}" data-visit-user="${v.visitorUsername}">
        <img class="avatar avatar-sm" src="${v.visitorPic||DEFAULT_AVATAR}">
        <div style="flex:1;"><div style="font-weight:600; font-size:13.5px;">${v.visitorName}</div><div class="post-time meta-font">${timeAgo(v.createdAt)}</div></div>
      </div>`).join("") + `</div>`;
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll("[data-visit-user]").forEach(el=> el.style.cursor="pointer");
  wrap.querySelectorAll("[data-visit-user]").forEach(el=> el.onclick = ()=> openOtherProfile(el.dataset.visitUser));
}
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

const SOCIAL_PLATFORMS = {
  phone:     { label:"هاتف",     icon:`<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.4 2.1L8.1 9.7a16 16 0 006.2 6.2l1.2-1.2a2 2 0 012.1-.4c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z"/>` },
  whatsapp:  { label:"واتساب",   icon:`<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>` },
  telegram:  { label:"تيليجرام", icon:`<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>` },
  linkedin:  { label:"لينكدإن",  icon:`<rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/><path d="M9 21v-9a2 2 0 012-2h1a4 4 0 014 4v7"/><path d="M9 12h.01"/>` },
  instagram: { label:"انستجرام", icon:`<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>` },
  snapchat:  { label:"سناب شات", icon:`<circle cx="12" cy="12" r="10"/><path d="M8 13c1 1.5 2.5 2 4 2s3-.5 4-2"/><path d="M9 9h.01M15 9h.01"/>` },
  youtube:   { label:"يوتيوب",   icon:`<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l6 3-6 3V9z"/>` },
  x:         { label:"X (تويتر)", icon:`<path d="M4 4l16 16M20 4L4 20"/>` },
  other:     { label:"رابط آخر", icon:`<path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>` }
};
function socialIconSvg(key){
  const p = SOCIAL_PLATFORMS[key] || SOCIAL_PLATFORMS.other;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${p.icon}</svg>`;
}

/* ============================================================
   الإعدادات
   ============================================================ */
function renderSettings(){
  const p = myProfile;
  $("set-fullname").value = p.fullName || "";
  $("set-bio").value = p.bio || "";
  $("set-username").value = p.username || "";
  $("toggle-private").checked = !!p.isPrivate;
  $("toggle-autoaccept").checked = !!p.autoAcceptFollow;
  renderSocialInputs(p.links || []);
  $("links-limit-note").textContent = `أقصى عدد روابط حسب باقتك: ${linkLimitFor(p)}`;

  const cd = usernameCooldownDaysLeft(p);
  if(cd > 0){
    $("username-cooldown-note").classList.remove("hidden");
    $("username-cooldown-note").textContent = `تقدر تغيّر اسم المستخدم تاني بعد ${cd} يوم`;
    $("set-username").disabled = true; $("btn-save-username").disabled = true;
  }else{
    $("username-cooldown-note").classList.add("hidden");
    $("set-username").disabled = false; $("btn-save-username").disabled = false;
  }

  renderVerifyBox(p);
  renderMyPerks(p);
  renderNameColorPicker(p);

  const status = planExpiryLabel(p);
  $("settings-pro-status").innerHTML = status
    ? `<p class="subtitle" style="text-align:right;">${status}</p><button class="btn btn-outline" id="btn-manage-plan">إدارة الاشتراك</button>`
    : `<p class="subtitle" style="text-align:right;">مفيش اشتراك Plus أو Pro حاليًا</p><button class="btn btn-accent" id="btn-manage-plan">عرض الباقات</button>`;
  $("btn-manage-plan").onclick = ()=>{ renderPlans(); show("screen-plans"); };

  if(p.isAdmin){ $("settings-admin-box").classList.remove("hidden"); }
  else{ $("settings-admin-box").classList.add("hidden"); }
}

/* ---------- عرض المميزات الحالية المتاحة فعليًا لصاحب الحساب ---------- */
function renderMyPerks(p){
  const check = `<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>`;
  const perks = [];
  perks.push("نشر منشورات، صور، إعجاب وتعليق ومشاركة، وغرفة برمجة");
  perks.push(`حتى ${linkLimitFor(p)} روابط تواصل في البروفايل`);
  if(p.isAdmin){
    perks.push("نشر ملفات PDF وفيديوهات ورسائل صوتية تفتح عند الجميع");
    perks.push("تثبيت أي منشور في الفيد العام لكل المستخدمين");
    perks.push("إدارة كاملة: حظر، تفعيل باقات، منح توثيق، مراجعة طلبات التوثيق");
  }else if(p.planTier==="pro"){
    perks.push("تلوين اسمك في المنشورات");
    perks.push("تثبيت منشور واحد أعلى بروفايلك");
    perks.push("هالة مميزة حول صورتك في كل منشور");
    perks.push("إمكانية التقديم على شارة توثيق");
  }else if(p.planTier==="plus"){
    perks.push("تلوين اسمك في المنشورات");
    perks.push("فتح كل مميزات التطبيق ما عدا التوثيق والتثبيت");
  }else{
    perks.push("رابط واحد بس في البروفايل — رقّي لـ Plus أو Pro عشان تفتح مميزات أكتر");
  }
  $("my-perks-list").innerHTML = perks.map(t=>`<li>${check}${t}</li>`).join("");
}

/* ---------- اختيار لون الاسم (Plus وPro) ---------- */
const NAME_COLORS = ["#0B0B0C","#0A84FF","#FF3B30","#30D158","#C89B3C","#5E5CE6","#FF9F0A","#FF2D92"];
function renderNameColorPicker(p){
  const unlocked = p.planTier==="plus" || p.planTier==="pro" || p.isAdmin;
  const wrap = $("name-color-swatches");
  if(!unlocked){
    wrap.innerHTML = "";
    $("name-color-locked").classList.remove("hidden");
    return;
  }
  $("name-color-locked").classList.add("hidden");
  wrap.innerHTML = NAME_COLORS.map(c=>`<div class="color-swatch ${p.nameColor===c?'active':''}" style="background:${c};" data-color="${c}"></div>`).join("");
  wrap.querySelectorAll("[data-color]").forEach(sw=>{
    sw.onclick = async ()=>{
      const color = sw.dataset.color;
      await updateDoc(doc(db, USERS_COL, currentUser.uid), { nameColor: color });
      myProfile.nameColor = color;
      renderNameColorPicker(myProfile);
      toast("تم تحديث لون اسمك");
    };
  });
}

function usernameCooldownDaysLeft(p){
  if(!p.usernameChangedAt) return 0;
  const d = p.usernameChangedAt.toDate ? p.usernameChangedAt.toDate() : new Date(p.usernameChangedAt);
  const diffDays = (Date.now() - d.getTime()) / 86400000;
  return diffDays >= 18 ? 0 : Math.ceil(18 - diffDays);
}
$("btn-save-username").onclick = async ()=>{
  const newUsername = $("set-username").value.trim().toLowerCase().replace(/[^a-z0-9_\u0600-\u06FF]/g,"");
  if(!newUsername || newUsername.length < 3){ toast("اسم المستخدم قصير جدًا"); return; }
  if(newUsername === myProfile.username){ toast("ده نفس اسم المستخدم الحالي"); return; }
  const q = query(collection(db, USERS_COL), where("username","==",newUsername), limit(1));
  const snap = await getDocs(q);
  if(!snap.empty){ toast("اسم المستخدم ده محجوز بالفعل"); return; }
  await updateDoc(doc(db, USERS_COL, currentUser.uid), { username:newUsername, usernameChangedAt: serverTimestamp() });
  myProfile.username = newUsername; myProfile.usernameChangedAt = new Date();
  toast("تم تغيير اسم المستخدم");
  renderSettings();
};

function renderSocialInputs(rawLinks){
  const wrap = $("set-socials-wrap");
  const maxLinks = linkLimitFor(myProfile);
  wrap.dataset.max = maxLinks;
  const links = (rawLinks||[]).map(l=> typeof l==="string" ? {platform:"other", url:l} : (l||{platform:"other",url:""}));
  wrap.innerHTML = links.map((l,i)=>`
    <div class="field" style="display:flex; gap:8px; align-items:center;">
      <select data-social-platform="${i}" style="width:120px; flex-shrink:0;">
        ${Object.entries(SOCIAL_PLATFORMS).map(([k,v])=>`<option value="${k}" ${l.platform===k?'selected':''}>${v.label}</option>`).join("")}
      </select>
      <input value="${l.url||''}" data-social-url="${i}" placeholder="الرابط أو الرقم">
      <button class="icon-btn" data-remove-link="${i}" style="flex-shrink:0;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
    </div>`).join("");
  wrap.querySelectorAll("[data-remove-link]").forEach(b=> b.onclick = ()=>{ links.splice(Number(b.dataset.removeLink),1); renderSocialInputs(links); });
}
$("btn-add-link").onclick = ()=>{
  const wrap = $("set-socials-wrap");
  const current = [...wrap.querySelectorAll("select")].map((sel,i)=>({ platform: sel.value, url: wrap.querySelectorAll("input")[i].value }));
  const max = Number(wrap.dataset.max || 1);
  if(current.length >= max){ toast(`الحد الأقصى ${max} روابط حسب باقتك`); return; }
  current.push({platform:"other", url:""});
  renderSocialInputs(current);
};

/* ---------------- طلب التوثيق ---------------- */
let pendingVerifyIdUrl = null;
function renderVerifyBox(p){
  const box = $("verify-status-box"); const form = $("verify-form");
  if(p.verifiedType){
    box.innerHTML = `<div class="locked-note">حسابك موثّق بالفعل (${p.verifiedType==='pro'?'برو':p.verifiedType==='investigator'?'محقق منه':'مبرمج'})</div>`;
    form.classList.add("hidden");
  }else if(p.verificationStatus==="pending"){
    box.innerHTML = `<div class="locked-note">طلب التوثيق قيد المراجعة من الفريق</div>`;
    form.classList.add("hidden");
  }else if(p.planTier!=="pro" && !p.isAdmin){
    box.innerHTML = `<p class="feature-lock-note">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      التقديم على التوثيق متاح لمشتركي Pro فقط
    </p><button class="btn btn-accent btn-sm" style="margin-top:10px;" id="btn-verify-upgrade">الترقية إلى Pro</button>`;
    form.classList.add("hidden");
    $("btn-verify-upgrade").onclick = ()=>{ renderPlans(); show("screen-plans"); };
  }else{
    box.innerHTML = p.verificationStatus==="rejected" ? `<p class="subtitle" style="text-align:right; color:var(--danger);">تم رفض طلبك السابق، تقدر تعيد التقديم</p>` : "";
    form.classList.remove("hidden");
  }
}
$("btn-upload-id").onclick = ()=> $("verify-id-file").click();
$("verify-id-file").addEventListener("change", async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const btn = $("btn-upload-id"); btn.innerHTML='<div class="spinner spinner-dark"></div>'; btn.disabled=true;
  try{
    const fd = new FormData(); fd.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method:"POST", body:fd });
    const data = await res.json();
    if(data.success){ pendingVerifyIdUrl = data.data.url; $("verify-id-status").textContent = "تم رفع الصورة بنجاح"; }
    else{ toast("تعذر رفع الصورة"); }
  }catch(err){ toast("تعذر رفع الصورة"); }
  btn.textContent = "رفع صورة الهوية"; btn.disabled=false;
});
$("btn-submit-verify").onclick = async ()=>{
  if(!pendingVerifyIdUrl){ toast("ارفع صورة الهوية الأول"); return; }
  await addDoc(collection(db,"verificationRequests"), {
    uid: currentUser.uid, username: myProfile.username, fullName: myProfile.fullName,
    type: $("verify-type").value, idPhotoUrl: pendingVerifyIdUrl, status:"pending", createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, USERS_COL, currentUser.uid), { verificationStatus:"pending" });
  myProfile.verificationStatus = "pending";
  toast("تم إرسال طلب التوثيق");
  renderVerifyBox(myProfile);
};

$("btn-open-verify-requests").onclick = ()=>{ renderVerifyRequests(); show("screen-verify-requests"); };
$("btn-verify-requests-back").onclick = ()=> show("screen-settings");
async function renderVerifyRequests(){
  const snap = await getDocs(query(collection(db,"verificationRequests"), where("status","==","pending")));
  const wrap = $("verify-requests-list");
  if(snap.empty){ wrap.innerHTML = `<div class="empty-state"><p>مفيش طلبات توثيق حاليًا</p></div>`; return; }
  const typeLabel = {pro:"توثيق برو", investigator:"محقق منه", developer:"مبرمجين"};
  const reqs = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id, ...d.data()})));
  wrap.innerHTML = reqs.map(r=>{
    return `<div class="glass-card section-pad" style="margin-bottom:12px;">
      <div style="font-weight:700;">${r.fullName} <span class="post-username">@${r.username}</span></div>
      <div class="chip" style="margin-top:8px;">${typeLabel[r.type]||r.type}</div>
      <img src="${r.idPhotoUrl}" style="width:100%; border-radius:14px; margin-top:10px; border:1px solid var(--line);">
      <div style="display:flex; gap:8px; margin-top:12px;">
        <button class="btn btn-primary btn-sm" data-approve="${r.id}" data-uid="${r.uid}" data-type="${r.type}">قبول</button>
        <button class="btn btn-outline btn-sm" data-reject="${r.id}" data-uid="${r.uid}">رفض</button>
      </div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-approve]").forEach(b=> b.onclick = async ()=>{
    await updateDoc(doc(db, USERS_COL, b.dataset.uid), { verifiedType: b.dataset.type, verificationStatus:"approved" });
    await updateDoc(doc(db,"verificationRequests", b.dataset.approve), { status:"approved" });
    renderVerifyRequests();
  });
  wrap.querySelectorAll("[data-reject]").forEach(b=> b.onclick = async ()=>{
    await updateDoc(doc(db, USERS_COL, b.dataset.uid), { verificationStatus:"rejected" });
    await updateDoc(doc(db,"verificationRequests", b.dataset.reject), { status:"rejected" });
    renderVerifyRequests();
  });
}

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

$("btn-upload-cover").onclick = ()=> $("set-cover-file").click();
$("set-cover-file").addEventListener("change", async (e)=>{
  const file = e.target.files[0]; if(!file) return;
  const btn = $("btn-upload-cover"); const original = btn.textContent; btn.innerHTML='<div class="spinner spinner-dark"></div>'; btn.disabled=true;
  try{
    const fd = new FormData(); fd.append("image", file);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method:"POST", body:fd });
    const data = await res.json();
    if(data.success){
      await updateDoc(doc(db, USERS_COL, currentUser.uid), { coverPhoto: data.data.url });
      myProfile.coverPhoto = data.data.url;
      toast("تم تحديث صورة الغلاف");
    }else{ toast("تعذر رفع الصورة"); }
  }catch(err){ toast("تعذر رفع الصورة"); }
  btn.textContent = original; btn.disabled=false;
});

$("btn-save-profile").onclick = async ()=>{
  const wrap = $("set-socials-wrap");
  const selects = [...wrap.querySelectorAll("select")]; const urlInputs = [...wrap.querySelectorAll("input")];
  const links = selects.map((sel,i)=>({ platform: sel.value, url: urlInputs[i].value.trim() })).filter(l=>l.url);
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
   قائمة الصفحات
   ============================================================ */
/* ============================================================
   الشات — إرسال مسموح فقط لو متابع الطرف التاني (أو هو موثّق/أدمن)
   ============================================================ */
$("btn-open-chats").onclick = ()=>{ renderChatsList(); show("screen-chats"); };
$("btn-chats-back").onclick = ()=> show("screen-feed");
$("btn-chat-room-back").onclick = ()=>{ if(unsubChatMessages) unsubChatMessages(); show("screen-chats"); };

function chatIdFor(uidA, uidB){ return [uidA, uidB].sort().join("_"); }

async function renderChatsList(){
  const wrap = $("chats-list-wrap");
  wrap.innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
  try{
    const snap = await getDocs(query(collection(db,"chats"), where("participants","array-contains", currentUser.uid), limit(50)));
    if(snap.empty){ wrap.innerHTML = `<div class="empty-state"><p>لسه مفيش محادثات، ابدأ من بروفايل أي حد بتتابعه</p></div>`; return; }
    const chats = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id, ...d.data(), createdAt:d.data().lastMessageAt})));
    wrap.innerHTML = chats.map(c=>{
      const otherUid = c.participants.find(id=>id!==currentUser.uid);
      const info = c.participantInfo?.[otherUid] || {};
      return `<div class="chat-list-item" data-open-chat="${otherUid}">
        <img class="avatar" src="${info.pic||DEFAULT_AVATAR}">
        <div class="chat-meta">
          <div style="font-weight:700; font-size:14px; display:flex; align-items:center; gap:5px;">${info.name||"مستخدم"} ${badgeHTML(info.verifiedType)}</div>
          <div class="chat-last">${(c.lastMessage||"").slice(0,50)}</div>
        </div>
        <div class="post-time meta-font">${timeAgo(c.lastMessageAt)}</div>
      </div>`;
    }).join("");
    wrap.querySelectorAll("[data-open-chat]").forEach(el=> el.onclick = ()=> openChatWithUser(el.dataset.openChat));
  }catch(e){ console.error(e); wrap.innerHTML = `<div class="empty-state"><p>تعذر تحميل المحادثات</p></div>`; }
}

let unsubChatMessages = null;
let currentChatOtherUid = null;
async function openChatWithUser(otherUid){
  currentChatOtherUid = otherUid;
  const otherSnap = await getDoc(doc(db, USERS_COL, otherUid));
  if(!otherSnap.exists()) return;
  const other = otherSnap.data();
  $("chat-room-avatar").src = other.profilePic || DEFAULT_AVATAR;
  $("chat-room-title").textContent = other.fullName;
  show("screen-chat-room");

  const iFollow = (myProfile.following||[]).includes(otherUid);
  const chatId = chatIdFor(currentUser.uid, otherUid);
  const chatDoc = await getDoc(doc(db,"chats",chatId));
  const conversationExists = chatDoc.exists();
  const canSend = iFollow || other.verifiedType || other.isAdmin || conversationExists;

  $("chat-input-bar").style.display = canSend ? "flex" : "none";
  $("chat-locked-note").classList.toggle("hidden", canSend);
  if(!canSend){
    $("chat-locked-note").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> لازم تتابع ${other.fullName} الأول عشان تقدر تبعتله رسالة`;
  }

  if(unsubChatMessages) unsubChatMessages();
  const msgsWrap = $("chat-messages-wrap");
  msgsWrap.innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
  unsubChatMessages = onSnapshot(query(collection(db,"chats",chatId,"messages"), orderBy("createdAt","asc"), limit(200)), (snap)=>{
    if(snap.empty){ msgsWrap.innerHTML = `<div class="empty-state"><p>ابدأ المحادثة</p></div>`; return; }
    msgsWrap.innerHTML = snap.docs.map(d=>{
      const m = d.data();
      const mine = m.senderId===currentUser.uid;
      return `<div class="msg-bubble ${mine?'msg-mine':'msg-theirs'}">${linkify(m.text||"")}<div class="msg-time">${timeAgo(m.createdAt)}</div></div>`;
    }).join("");
    msgsWrap.scrollTop = msgsWrap.scrollHeight;
  }, (err)=>{ console.error(err); msgsWrap.innerHTML = `<div class="empty-state"><p>تعذر تحميل الرسائل، حاول تاني</p></div>`; });

  $("btn-chat-send").onclick = ()=> sendChatMessage(otherUid, other);
}

async function sendChatMessage(otherUid, otherProfile){
  const input = $("chat-message-input");
  const text = input.value.trim();
  if(!text) return;
  const chatId = chatIdFor(currentUser.uid, otherUid);
  try{
    await setDoc(doc(db,"chats",chatId), {
      participants:[currentUser.uid, otherUid],
      participantInfo:{
        [currentUser.uid]: { name: myProfile.fullName, pic: myProfile.profilePic||DEFAULT_AVATAR, verifiedType: myProfile.verifiedType||null },
        [otherUid]: { name: otherProfile.fullName, pic: otherProfile.profilePic||DEFAULT_AVATAR, verifiedType: otherProfile.verifiedType||null }
      },
      lastMessage:text, lastMessageAt: serverTimestamp()
    }, { merge:true });
    await addDoc(collection(db,"chats",chatId,"messages"), { senderId: currentUser.uid, text, createdAt: serverTimestamp() });
    input.value = "";
  }catch(e){ console.error(e); toast("تعذر إرسال الرسالة، حاول تاني"); }
}
$("chat-message-input").addEventListener("keydown", (e)=>{ if(e.key==="Enter" && currentChatOtherUid) $("btn-chat-send").click(); });

/* ---------- رسالة ترحيب تلقائية من حساب الإدارة عند كل تسجيل حساب جديد ---------- */
async function sendAdminWelcomeChat(newUserUid, newUserProfile){
  try{
    const adminSnap = await getDocs(query(collection(db, USERS_COL), where("email","==",ADMIN_WELCOME_EMAIL), limit(1)));
    if(adminSnap.empty) return;
    const adminUid = adminSnap.docs[0].id; const admin = adminSnap.docs[0].data();
    const chatId = chatIdFor(newUserUid, adminUid);
    await setDoc(doc(db,"chats",chatId), {
      participants:[newUserUid, adminUid],
      participantInfo:{
        [newUserUid]: { name:newUserProfile.fullName, pic:newUserProfile.profilePic||DEFAULT_AVATAR, verifiedType:null },
        [adminUid]: { name:admin.fullName||"فريق 404", pic:admin.profilePic||DEFAULT_AVATAR, verifiedType:admin.verifiedType||"app" }
      },
      lastMessage:"أهلاً بيك في 404!", lastMessageAt: serverTimestamp()
    }, { merge:true });
    await addDoc(collection(db,"chats",chatId,"messages"), { senderId: adminUid, text:`أهلاً بيك يا ${newUserProfile.fullName} في 404! لو احتجت أي مساعدة إحنا هنا.`, createdAt: serverTimestamp() });
    // متابعة إجبارية لحساب الإدارة عند كل تسجيل جديد
    await updateDoc(doc(db, USERS_COL, newUserUid), { following: arrayUnion(adminUid) });
    await updateDoc(doc(db, USERS_COL, adminUid), { followers: arrayUnion(newUserUid) });
  }catch(e){ console.error("تعذر إرسال رسالة الترحيب من الإدارة:", e); }
}

$("btn-open-pages-list").onclick = ()=>{ renderPagesList(); show("screen-pages-list"); };
$("btn-pages-list-back").onclick = ()=> show("screen-settings");
function renderPagesList(){
  const items = [
    { icon:`<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>`, label:"الرئيسية", target:"screen-feed", tab:true },
    { icon:`<path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/>`, label:"غرفة البرمجة", target:"screen-code", tab:true },
    { icon:`<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`, label:"البحث", target:"screen-search", tab:true },
    { icon:`<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>`, label:"الإشعارات", target:"screen-notifs" },
    { icon:`<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>`, label:"حسابي", target:"screen-profile", tab:true },
    { icon:`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09A1.65 1.65 0 0015 4.6a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.36.4.66.74.85`, label:"الإعدادات", target:"screen-settings" },
    { icon:`<path d="M12 2l1.5 5.5L19 9l-4 3.5L16 18l-4-3-4 3 1-5.5L5 9l5.5-1.5L12 2z"/>`, label:"باقات Plus وPro", target:"screen-plans", action: ()=>renderPlans() },
  ];
  if(myProfile.isAdmin){
    items.push({ icon:`<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 014-4h6a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M22 21v-2a4 4 0 00-3-3.87"/>`, label:"إدارة المستخدمين", target:"screen-admin", action:()=>renderAdmin() });
    items.push({ icon:`<path d="M20 6L9 17l-5-5"/>`, label:"طلبات التوثيق", target:"screen-verify-requests", action:()=>renderVerifyRequests() });
  }
  items.push({ icon:`<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.4 2.1L8.1 9.7a16 16 0 006.2 6.2l1.2-1.2a2 2 0 012.1-.4c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z"/>`, label:"تواصل مع الدعم الفني", mail:SUPPORT_EMAIL });

  $("pages-list-content").innerHTML = items.map((it,i)=>`
    <div class="page-list-item" data-page-idx="${i}" style="${i<items.length-1?'border-bottom:1px solid var(--line);':''}">
      <div class="icon-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="17" height="17">${it.icon}</svg></div>
      <span>${it.label}</span>
    </div>`).join("");
  $("pages-list-content").querySelectorAll("[data-page-idx]").forEach(el=>{
    const it = items[Number(el.dataset.pageIdx)];
    el.onclick = ()=>{
      if(it.mail){ window.location.href = `mailto:${it.mail}`; return; }
      if(it.action) it.action();
      if(it.tab){ document.querySelector(`.tab-item[data-target="${it.target}"]`)?.click(); }
      else show(it.target);
    };
  });
}

/* ============================================================
   الباقات والدفع (PayPal)
   ============================================================ */
const FREE_FEATURES = ["نشر منشورات نصية بلا حدود","إعجاب وتعليق ومشاركة","غرفة البرمجة والدردشات العامة","رابط واحد فقط في البروفايل","ملف شخصي عام أو خاص"];
const PLANS = {
  plus: { name:"باقة Plus", features:["فتح كل مميزات التطبيق ما عدا التوثيق","رفع صور وفيديوهات وملفات بلا حدود إضافية","دعم فني بأولوية","شارة مميزة على المنشورات","حتى 3 روابط في البروفايل"],
    tiers:[{label:"أسبوعي", egp:60, usd:1, days:7},{label:"شهري", egp:150, usd:2, days:30},{label:"3 أشهر", egp:450, usd:5, days:90},{label:"سنوي", egp:1800, usd:20, days:365}] },
  pro: { name:"باقة Pro (مبرمجين وتوثيق)", features:["كل مميزات Plus مضافًا إليها","إمكانية التقديم على شارة توثيق","حتى 8 روابط في البروفايل","دخول مبكر لمميزات غرفة البرمجة","دعم فني مباشر من الفريق"],
    tiers:[{label:"شهري", egp:250, usd:4, days:30},{label:"نصف سنوي", egp:1400, usd:20, days:182},{label:"سنة كاملة", egp:2800, usd:35, days:365}] }
};
function renderPlans(){
  const wrap = $("plans-content");
  wrap.innerHTML = `
    <div class="glass-card plan-card" style="margin-bottom:16px;">
      <h3 style="margin:0;">الباقة المجانية</h3>
      <ul class="plan-list">${FREE_FEATURES.map(f=>`<li><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${f}</li>`).join("")}</ul>
    </div>` +
    Object.entries(PLANS).map(([key,plan])=>`
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
          await updateDoc(doc(db, USERS_COL, currentUser.uid), { planTier: slot.dataset.plan, isPro: slot.dataset.plan!=="free", proExpiresAt: expires, proTier: slot.dataset.label });
          myProfile.planTier = slot.dataset.plan; myProfile.proExpiresAt = expires;
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
  try{
    const snap = await getDocs(query(collection(db, USERS_COL), orderBy("createdAt","desc"), limit(100)));
    renderAdminList(snap.docs.map(d=>({id:d.id,...d.data()})));
  }catch(e){
    console.error(e);
    $("admin-users-list").innerHTML = `<div class="empty-state"><p>تعذر تحميل قائمة المستخدمين، حاول تاني</p></div>`;
  }
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
        <button class="btn btn-sm btn-outline" data-pro="${u.id}" data-state="${u.planTier||'free'}">${u.planTier==='pro'?'إرجاع لمجاني':(u.planTier==='plus'?'ترقية لـPro':'تفعيل Plus')}</button>
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
    try{
      await updateDoc(doc(db,USERS_COL,b.dataset.ban), { banned: !(b.dataset.state==="true") });
      renderAdmin();
    }catch(e){ console.error(e); toast("تعذر تنفيذ العملية، حاول تاني"); }
  });
  $("admin-users-list").querySelectorAll("[data-pro]").forEach(b=> b.onclick = async ()=>{
    try{
      const cur = b.dataset.state;
      const next = cur==="free" ? "plus" : (cur==="plus" ? "pro" : "free");
      await updateDoc(doc(db,USERS_COL,b.dataset.pro), { planTier: next, isPro: next!=="free" });
      renderAdmin();
    }catch(e){ console.error(e); toast("تعذر تنفيذ العملية، حاول تاني"); }
  });
  $("admin-users-list").querySelectorAll("[data-admin]").forEach(b=> b.onclick = async ()=>{
    try{
      await updateDoc(doc(db,USERS_COL,b.dataset.admin), { isAdmin: !(b.dataset.state==="true") });
      renderAdmin();
    }catch(e){ console.error(e); toast("تعذر تنفيذ العملية، حاول تاني"); }
  });
  $("admin-users-list").querySelectorAll("[data-verify]").forEach(sel=> sel.onchange = async ()=>{
    try{ await updateDoc(doc(db,USERS_COL,sel.dataset.verify), { verifiedType: sel.value || null }); }
    catch(e){ console.error(e); toast("تعذر تنفيذ العملية، حاول تاني"); }
  });
}
$("admin-search").addEventListener("input", async ()=>{
  try{
    const term = $("admin-search").value.trim().toLowerCase();
    const snap = await getDocs(query(collection(db, USERS_COL), orderBy("createdAt","desc"), limit(200)));
    const all = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderAdminList(term ? all.filter(u=> (u.username||"").includes(term) || (u.fullName||"").toLowerCase().includes(term)) : all);
  }catch(e){ console.error(e); toast("تعذر تحميل المستخدمين، حاول تاني"); }
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
  const mode = params.get("mode");
  const oobCode = params.get("oobCode");

  if(mode==="resetPassword" && oobCode){
    resettingPassword = true;
    $("splash").classList.add("hide"); sessionStorage.removeItem("__autoRetried");
    handlePasswordResetLink(oobCode);
    return;
  }

  const u = params.get("u");
  const postId = params.get("post");
  const knownFirebaseParams = ["mode","oobCode","apiKey","continueUrl","lang"];
  const otherKeys = [...params.keys()].filter(k=> !knownFirebaseParams.includes(k));
  const hasUnknownParam = otherKeys.length>0 && !u && !postId;

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

/* ---------- إعادة تعيين كلمة المرور داخل التطبيق (بدل صفحة Firebase الافتراضية) ---------- */
async function handlePasswordResetLink(oobCode){
  show("screen-reset-password");
  try{
    const email = await verifyPasswordResetCode(auth, oobCode);
    $("reset-password-email-note").textContent = `تعيين كلمة مرور جديدة لحساب ${email}`;
  }catch(e){
    $("reset-password-email-note").textContent = "الرابط ده منتهي الصلاحية أو تم استخدامه من قبل";
    $("btn-confirm-reset-password").disabled = true;
  }
  $("btn-confirm-reset-password").onclick = async ()=>{
    const p1 = $("reset-new-pass").value; const p2 = $("reset-new-pass-confirm").value;
    const err = $("reset-password-error"); err.style.display="none";
    if(p1.length < 8){ err.textContent="كلمة المرور لازم تكون 8 أحرف على الأقل"; err.style.display="block"; return; }
    if(p1 !== p2){ err.textContent="كلمة المرور غير متطابقة"; err.style.display="block"; return; }
    const btn = $("btn-confirm-reset-password"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
    try{
      await confirmPasswordReset(auth, oobCode, p1);
      document.querySelector("#screen-reset-password .center-screen").innerHTML = `
        <div class="brand-mark"><img src="https://i.ibb.co/WN3DTcGc/logo.jpg"></div>
        <h2>تم تغيير كلمة المرور</h2>
        <p class="subtitle">تقدر تسجّل دخولك دلوقتي بكلمة المرور الجديدة</p>
        <button class="btn btn-primary" style="width:auto; padding:12px 26px;" id="btn-reset-done">تسجيل الدخول</button>`;
      $("btn-reset-done").onclick = ()=>{
        resettingPassword = false;
        history.replaceState(null,"", location.pathname);
        show("screen-login");
      };
    }catch(e){
      btn.textContent = "حفظ كلمة المرور الجديدة"; btn.disabled=false;
      err.textContent = "تعذر تغيير كلمة المرور، الرابط يمكن يكون منتهي"; err.style.display="block";
    }
  };
}

// أي محاولة فتح شاشة غير معرّفة داخل التطبيق تروح لصفحة 404
window.addEventListener("hashchange", ()=>{
  const target = location.hash.replace("#","");
  if(target && !document.getElementById(target)){ showNotFound(); }
});

/* ---------- منع نسخ نصوص المنشورات والنبذة، مع إبقاء اسم المستخدم قابل للنسخ ---------- */
document.addEventListener("copy", (e)=>{
  const target = e.target;
  if(target && target.closest && (target.closest(".post-text") || target.closest(".profile-bio"))){
    if(!target.closest(".post-username")){ e.preventDefault(); }
  }
});
document.addEventListener("contextmenu", (e)=>{
  if(e.target && e.target.closest && (e.target.closest(".post-text") || e.target.closest(".profile-bio")) && !e.target.closest(".post-username")){
    e.preventDefault();
  }
});

/* ---------------- تسجيل Service Worker (PWA) ---------------- */
if("serviceWorker" in navigator){
  window.addEventListener("load", ()=>{ navigator.serviceWorker.register("sw.js").catch(()=>{}); });
}

/* ---------------- حماية أخيرة: لو حصل أي خطأ غير متوقع، امنع شاشة اللوجو من التعليق للأبد ---------------- */
window.addEventListener("error", ()=>{
  setTimeout(()=>{
    const splash = document.getElementById("splash");
    if(splash && !splash.classList.contains("hide")){
      splash.classList.add("hide");
      if(!document.querySelector(".screen.active")){
        const login = document.getElementById("screen-login");
        if(login) login.classList.add("active");
      }
    }
  }, 300);
});
setTimeout(()=>{
  const splash = document.getElementById("splash");
  if(splash && !splash.classList.contains("hide")){
    splash.classList.add("hide");
    if(!document.querySelector(".screen.active")){
      const login = document.getElementById("screen-login");
      if(login) login.classList.add("active");
    }
  }
}, 8000);
