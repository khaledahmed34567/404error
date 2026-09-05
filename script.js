/* ===================================================================
   404 — منطق التطبيق
   =================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, deleteUser,
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
const STORIES_COL = "stories";
const SUPPORT_EMAIL = "404team@404error.qd.je";
const ADMIN_WELCOME_EMAIL = SUPPORT_EMAIL; // كل الرسائل والإشعارات الآلية تُرسل من حساب الدعم الرسمي فقط، وإيميله لا يظهر لأي مستخدم
const ADMIN_EMAILS = ["khwailedapp@gmail.com", "soudadteam@gmail.com", "404team@404error.qd.je"];
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
function badgeIcon(type){
  if(type==="student") return `<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>`;
  if(type==="developer") return `<path d="M8 6L2 12l6 6M16 6l6 6-6 6"/>`;
  if(type==="engineer") return `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 005 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>`;
  if(type==="company") return `<path d="M3 21h18M6 21V8l6-4 6 4v13M9 21v-5h6v5M9 12h.01M9 15h.01M15 12h.01M15 15h.01"/>`;
  if(type==="general") return `<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>`;
  if(type==="app") return `<path d="M12 2l7 3v6c0 5-3 8.5-7 11-4-2.5-7-6-7-11V5l7-3z"/><path d="M9.5 12l1.8 1.8L15 10"/>`;
  return `<path d="M20 6L9 17l-5-5"/>`;
}
function badgeHTML(type, username){
  if(!type) return "";
  const map = {
    pro: {cls:"badge-pro", title:"حساب موثّق برو"},
    investigator: {cls:"badge-investigator", title:"شخصية موثّقة ومحقق منها"},
    developer: {cls:"badge-developer", title:"مبرمج موثّق"},
    app: {cls:"badge-app", title:"حساب رسمي للتطبيق"},
    student: {cls:"badge-student", title:"طالب موثّق"},
    engineer: {cls:"badge-engineer", title:"مهندس موثّق"},
    company: {cls:"badge-company", title:"شركة موثّقة"},
    general: {cls:"badge-general", title:"حساب موثّق"}
  };
  const c = map[type]; if(!c) return "";
  const clickAttr = username ? `data-badge-user="${username}" data-badge-type="${type}"` : "";
  return `<span class="badge ${c.cls}" title="${c.title}" ${clickAttr}><svg viewBox="0 0 24 24">${badgeIcon(type)}</svg></span>`;
}
const VERIFICATION_REASON_DEFAULTS = {
  pro: "حساب مشترك في باقة Pro — تم تفعيل التوثيق كجزء من مميزات الباقة.",
  investigator: "شخصية عامة تم التحقق من هويتها وتوثيقها رسميًا من فريق 404.",
  developer: "مبرمج تم توثيقه من فريق 404 لمساهماته وخبرته التقنية في غرفة البرمجة.",
  app: "هذا الحساب الرسمي لفريق تطبيق 404.",
  student: "طالب تم التحقق من هويته الجامعية أو المدرسية وتوثيقه من فريق 404.",
  engineer: "مهندس تم التحقق من صفته المهنية وتوثيقه رسميًا من فريق 404.",
  company: "حساب شركة أو علامة تجارية تم التحقق من صحته وتوثيقه رسميًا من فريق 404.",
  general: "حساب موثّق ضمن التوثيق العام المتاح لمشتركي Plus."
};
const VERIFICATION_FEATURES = {
  pro: ["شارة ذهبية مميزة بجانب اسمك في كل مكان بالتطبيق","أولوية الظهور في نتائج البحث والاقتراحات","علامة حساب موثوق تزيد ثقة متابعينك في محتواك","دعوة لتجربة أي ميزة جديدة قبل الجميع","تثبيت شارتك في أي منشور معاد مشاركته"],
  investigator: ["شارة بنفسجية توضح إنك شخصية تم التحقق من هويتها","حماية إضافية من حسابات انتحال الشخصية","أولوية الرد من فريق الدعم في أي بلاغ","ظهور مميز لاسمك في نتائج البحث","علامة موثوقية على كل تعليق ومنشور تكتبه"],
  developer: ["شارة زرقاء-بنفسجية بتصميم </> يوضح خبرتك التقنية","دخول مبكر لأي ميزة جديدة في غرفة البرمجة","تثبيت منشور دائم في أعلى غرفة البرمجة","أولوية الرد على أسئلتك من فريق الدعم التقني","عرض خبير موثّق بجانب أي إجابة تكتبها"],
  app: ["شارة سوداء تدل إنه حساب رسمي تابع لفريق 404","ظهور تلقائي في أعلى نتائج البحث دائمًا","الحساب الوحيد المسموح له يبعت إشعارات نظامية","حماية كاملة من الحظر أو التقييد","أولوية قصوى في كل تفاعل داخل التطبيق","صلاحية الوصول لكل التقارير والبلاغات في لوحة الإدارة","القدرة على تعديل بيانات أي مستخدم مباشرة","القدرة على تفعيل أو إلغاء أي نوع توثيق لأي حساب","استقبال كل طلبات توثيق الطلاب والموافقة عليها","حساب لا يظهر بريده الإلكتروني في أي إشعار أو رسالة"],
  engineer: ["شارة برتقالية مميزة توضح إنك مهندس موثّق باحترافيتك","إمكانية إضافة تخصصك الهندسي في بروفايلك","أولوية الظهور في نتائج البحث ضمن فئة المهندسين","شارة موثوقية على كل منشور تقني تنشره","دعم فني بأولوية عند أي استفسار"],
  student: ["شارة توثيق طالب خاصة بتصميم ولون مختلف (أخضر مميز)","فتح كل مميزات باقة Plus مجانًا طول فترة التوثيق","رفع حتى 5 صور في المنشور الواحد بعرض كاروسيل","متابعة حتى 10 أسئلة في غرفة البرمجة مع التنبيه بالرد","ترقية تلقائية لباقة Pro مجانًا بعد شهر واحد من التوثيق"],
  company: ["شارة زرقاء مميزة لأي حساب شركة أو علامة تجارية موثّقة","ظهور الشركة ضمن تصنيف خاص بالحسابات التجارية","إمكانية إضافة رابط الموقع الرسمي في أعلى البروفايل","دعم فني مخصص لحسابات الشركات","أولوية الرد على استفسارات العملاء عبر الشات"],
  general: ["شارة توثيق عامة تناسب مشتركي باقة Plus","زيادة ثقة متابعينك بحسابك الموثّق","أولوية أعلى قليلاً في نتائج البحث","إمكانية تقديم بلاغات بأولوية أعلى","علامة موثوقية تظهر في كل تعليقاتك"]
};
async function showVerificationReason(username, type){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay verify-reason-overlay";
  const colorMap = { pro:"var(--gold)", investigator:"var(--violet)", developer:"linear-gradient(135deg,#0A84FF,#5E5CE6)", app:"var(--ink)", student:"linear-gradient(135deg,#0FA968,#0C7A4E)", engineer:"linear-gradient(135deg,#F5A623,#D9720A)", company:"linear-gradient(135deg,#17A2B8,#0D6E7D)", general:"var(--accent)" };
  /* المبرمجين بياخدوا الـ5 مميزات الخاصة بيهم + الـ5 مميزات بتاعة Pro مضافة عليهم = 10 */
  const features = type==="developer" ? [...VERIFICATION_FEATURES.developer, ...VERIFICATION_FEATURES.pro] : (VERIFICATION_FEATURES[type] || []);
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:center;">
    <div class="modal-sheet-handle"></div>
    <div class="verify-reason-icon" style="background:${colorMap[type]||'var(--ink)'};">
      <svg viewBox="0 0 24 24">${badgeIcon(type)}</svg>
    </div>
    <h3 style="margin:0 0 8px;">سبب التوثيق</h3>
    <p id="verify-reason-text" style="font-size:13px; color:var(--ink-soft); line-height:1.8;">جاري التحميل...</p>
    ${features.length ? `<h3 style="margin:14px 0 0; font-size:14px;">مميزات هذا التوثيق</h3><ul class="verify-feature-list">${features.map(f=>`<li><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${f}</li>`).join("")}</ul>` : ""}
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  let reason = VERIFICATION_REASON_DEFAULTS[type] || "حساب موثّق من فريق 404.";
  try{
    if(username){
      const snap = await getDocs(query(collection(db, USERS_COL), where("username","==",username), limit(1)));
      if(!snap.empty && snap.docs[0].data().verificationReason) reason = snap.docs[0].data().verificationReason;
    }
  }catch(e){ /* استخدم النص الافتراضي عند أي خطأ */ }
  const textEl = overlay.querySelector("#verify-reason-text");
  if(textEl) textEl.textContent = reason;
}
document.addEventListener("click", (e)=>{
  const b = e.target.closest && e.target.closest(".badge[data-badge-user]");
  if(!b) return;
  e.stopPropagation();
  showVerificationReason(b.dataset.badgeUser, b.dataset.badgeType);
});
/* ---------------- حساب الدعم الرسمي: إشعارات كلها عبر شات هذا الحساب بدل الإيميل، وإيميله مخفي دائمًا عن المستخدمين ---------------- */
function chatIdFor(uidA, uidB){ return [uidA, uidB].sort().join("_"); }
/* ---------------- تشفير رسائل الشات: مفتاح AES-GCM مشتق من معرّف المحادثة نفسه، فمحدش يقدر يقرا النص من قاعدة البيانات مباشرة ---------------- */
const __chatKeyCache = {};
async function deriveChatKey(chatId){
  if(__chatKeyCache[chatId]) return __chatKeyCache[chatId];
  const enc = new TextEncoder().encode("404-chat-"+chatId);
  const hash = await crypto.subtle.digest("SHA-256", enc);
  const key = await crypto.subtle.importKey("raw", hash, {name:"AES-GCM"}, false, ["encrypt","decrypt"]);
  __chatKeyCache[chatId] = key;
  return key;
}
function bufToB64(buf){ return btoa(String.fromCharCode(...new Uint8Array(buf))); }
function b64ToBuf(b64){ return Uint8Array.from(atob(b64), c=>c.charCodeAt(0)); }
async function encryptChatText(chatId, text){
  if(!text) return { encText:null, iv:null };
  try{
    const key = await deriveChatKey(chatId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, new TextEncoder().encode(text));
    return { encText: bufToB64(cipher), iv: bufToB64(iv) };
  }catch(e){ console.error("تعذر تشفير الرسالة:", e); return { encText:null, iv:null }; }
}
async function decryptChatText(chatId, encText, iv){
  if(!encText || !iv) return "";
  try{
    const key = await deriveChatKey(chatId);
    const plain = await crypto.subtle.decrypt({name:"AES-GCM", iv:b64ToBuf(iv)}, key, b64ToBuf(encText));
    return new TextDecoder().decode(plain);
  }catch(e){ return "[تعذر فك تشفير الرسالة]"; }
}
let supportAccountCache = null;
async function getSupportAccount(){
  if(supportAccountCache) return supportAccountCache;
  try{
    const snap = await getDocs(query(collection(db, USERS_COL), where("email","==",SUPPORT_EMAIL), limit(1)));
    if(snap.empty) return null;
    supportAccountCache = { id: snap.docs[0].id, ...snap.docs[0].data() };
    return supportAccountCache;
  }catch(e){ return null; }
}
/* الحساب الرسمي هو الوحيد المسموح له يبدأ الشات؛ محدش يقدر يبعتله أو يرد عليه */
async function sendSupportChatMessage(uid, text, extra){
  try{
    const admin = await getSupportAccount();
    if(!admin || admin.id===uid) return;
    const targetSnap = await getDoc(doc(db, USERS_COL, uid));
    const target = targetSnap.exists() ? targetSnap.data() : {};
    const chatId = chatIdFor(uid, admin.id);
    const { encText, iv } = await encryptChatText(chatId, text);
    await setDoc(doc(db,"chats",chatId), {
      participants:[uid, admin.id],
      participantInfo:{
        [uid]: { name: target.fullName||"مستخدم", pic: target.profilePic||DEFAULT_AVATAR, verifiedType: target.verifiedType||null, username: target.username||null },
        [admin.id]: { name: admin.fullName||"فريق 404", pic: admin.profilePic||DEFAULT_AVATAR, verifiedType: admin.verifiedType||"app", username: admin.username||null }
      },
      lastMessageEnc: encText, lastMessageIv: iv, lastMessageAt: serverTimestamp()
    }, { merge:true });
    await addDoc(collection(db,"chats",chatId,"messages"), { senderId: admin.id, encText, iv, createdAt: serverTimestamp(), ...(extra||{}) });
  }catch(e){ console.error("تعذر إرسال رسالة الدعم:", e); }
}
/* بديل موحّد لأي إشعار: يتسجل في قائمة الإشعارات وبالتوازي يوصل كرسالة من حساب الدعم في الشات، بدل أي إيميل */
async function notifyUser(uid, text, fromAdmin){
  try{ await addDoc(collection(db, USERS_COL, uid, "notifications"), { text, fromAdmin: !!fromAdmin, createdAt: serverTimestamp() }); }catch(e){ /* استمر حتى لو فشل تسجيل الإشعار */ }
  sendSupportChatMessage(uid, text);
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
/* تسجيل الدخول بالبريد الإلكتروني أو اسم المستخدم أو رقم الهاتف — كلها تتحول لإيميل قبل مصادقة Firebase */
async function resolveLoginIdentifierToEmail(identifier){
  let raw = identifier.trim();
  if(raw.startsWith("@")) raw = raw.slice(1);
  if(raw.includes("@") && raw.includes(".")) return raw; // إيميل مباشر

  const isPhoneLike = /^[0-9+\s-]{5,}$/.test(raw);
  if(isPhoneLike){
    const snap = await getDocs(query(collection(db, USERS_COL), where("phone","==",raw), limit(1)));
    if(!snap.empty) return snap.docs[0].data().email;
    // محاولة أخيرة بدون رموز/مسافات
    const digitsOnly = raw.replace(/[^0-9]/g,"");
    const all = await getDocs(query(collection(db, USERS_COL), limit(300)));
    const match = all.docs.find(d=> (d.data().phone||"").replace(/[^0-9]/g,"").endsWith(digitsOnly.slice(-8)) && digitsOnly.length>=8);
    if(match) return match.data().email;
    return null;
  }
  // اسم مستخدم
  const uname = raw.toLowerCase();
  const snap = await getDocs(query(collection(db, USERS_COL), where("username","==",uname), limit(1)));
  if(!snap.empty) return snap.docs[0].data().email;
  return null;
}

$("btn-login").onclick = async ()=>{
  const identifier = $("login-email").value.trim();
  const pass = $("login-password").value;
  $("login-error").style.display="none";
  if(!identifier || !pass){ $("login-error").textContent="اكتب بيانات الدخول وكلمة المرور"; $("login-error").style.display="block"; return; }
  const btn = $("btn-login"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
  try{
    const email = await resolveLoginIdentifierToEmail(identifier);
    if(!email){
      $("login-error").textContent = "مفيش حساب بالبيانات دي";
      $("login-error").style.display="block";
    }else{
      await signInWithEmailAndPassword(auth, email, pass);
    }
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
      if(e.code==="auth/invalid-email") err.textContent = "صيغة البريد غير صحيحة";
      else if(e.code==="auth/too-many-requests") err.textContent = "محاولات كتير في وقت قصير، استنى شوية وجرب تاني";
      else err.textContent = "تعذر إرسال الرابط، حاول مرة أخرى";
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
$("r-username").addEventListener("input", (e)=>{
  const cleaned = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"");
  if(cleaned !== e.target.value) e.target.value = cleaned;
});
$("btn-step1-next").onclick = async ()=>{
  const uErr = $("r-username-error"); uErr.style.display="none";
  const username = $("r-username").value.trim();
  if(!$("r-fullname").value.trim() || !$("r-dob").value || !$("r-nationality").value){ toast("من فضلك أكمل كل الحقول"); return; }
  if(!username){ uErr.textContent="اكتب اسم مستخدم"; uErr.style.display="block"; return; }
  if(!/^[a-z][a-z0-9_]{2,15}$/.test(username)){
    uErr.textContent="اسم المستخدم لازم يبدأ بحرف إنجليزي صغير، وميحتويش إلا على حروف إنجليزية صغيرة وأرقام و_ (من 3 لـ16 حرف)";
    uErr.style.display="block";
    return;
  }
  const btn = $("btn-step1-next"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
  try{
    const dup = await getDocs(query(collection(db, USERS_COL), where("username","==",username), limit(1)));
    if(!dup.empty){ uErr.textContent="اسم المستخدم ده مستخدم بالفعل"; uErr.style.display="block"; btn.innerHTML="التالي"; btn.disabled=false; return; }
  }catch(e){ /* لو فشل الفحص، هيتفحص تاني وقت إنشاء الحساب */ }
  btn.innerHTML="التالي"; btn.disabled=false;
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
    /* إصلاح: لو فيه حساب مصادقة (Auth) اتعمل قبل كده بنجاح لكن مستند البروفايل فشل يتحفظ (مشكلة شبكة مثلًا)،
       متعملش حساب جديد تاني (هيدي auth/email-already-in-use) — كمّل واحفظ المستند الناقص بس لنفس الحساب. */
    let uid;
    if(auth.currentUser && auth.currentUser.email===$("r-email").value.trim()){
      uid = auth.currentUser.uid;
      currentUser = auth.currentUser;
    }else{
      const cred = await createUserWithEmailAndPassword(auth, $("r-email").value.trim(), $("r-pass").value);
      uid = cred.user.uid;
      currentUser = cred.user;
    }
    const pinHash = await sha256(pin);
    const username = $("r-username").value.trim() || await generateUniqueUsername($("r-fullname").value);
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
      banned:false, pinHash, usernameChangedAt:null, bookmarks:[], signature:"", createdAt: serverTimestamp()
    };
    await setDoc(doc(db, USERS_COL, uid), profileData);
    sessionStorage.setItem("pinVerified","1");
    awaitingManualFlow = false;
    myProfile = { id: uid, ...profileData };
    toast("تم إنشاء الحساب بنجاح");
    sendAdminWelcomeChat(uid, myProfile);
    enterApp();
  }catch(e){
    awaitingManualFlow = false;
    console.error(e);
    err.textContent = e.code==="auth/email-already-in-use" ? "البريد الإلكتروني مستخدم بالفعل، سجل دخول بدل الإنشاء"
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
async function doLogout(){
  const uid = currentUser?.uid; const name = myProfile?.fullName;
  sessionStorage.removeItem("pinVerified"); sessionStorage.removeItem("welcomeSent");
  if(uid) await sendLogoutNotice(uid, name);
  await signOut(auth);
}
$("btn-pinlock-logout").onclick = doLogout;
$("btn-logout").onclick = doLogout;

/* تصدير نسخة من بيانات المستخدم (بروفايله ومنشوراته) بصيغة JSON — متاحة للجميع */
$("btn-export-data").onclick = async ()=>{
  const btn = $("btn-export-data"); const originalHTML = btn.innerHTML;
  btn.innerHTML = '<div class="spinner spinner-dark"></div><span>جاري التجهيز...</span>';
  try{
    const postsSnap = await getDocs(query(collection(db, POSTS_COL), where("authorId","==",currentUser.uid), limit(500)));
    const posts = postsSnap.docs.map(d=>({ id:d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.().toISOString() || null }));
    const exportData = {
      exportedAt: new Date().toISOString(),
      profile: { ...myProfile, id: undefined },
      posts
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `404-data-${myProfile.username}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    toast("تم تنزيل بياناتك");
  }catch(e){ console.error(e); toast("تعذر تجهيز البيانات، حاول تاني"); }
  btn.innerHTML = originalHTML;
};

/* حذف الحساب نهائيًا — يمسح مستند المستخدم من قاعدة البيانات ثم حساب المصادقة */
$("btn-delete-account").onclick = ()=>{
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:center;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 8px; color:var(--danger);">حذف الحساب نهائيًا؟</h3>
    <p style="font-size:13px; color:var(--muted); line-height:1.8;">هيتحذف حسابك وكل بياناتك بشكل نهائي ومينفعش ترجعه تاني. متأكد إنك عايز تكمل؟</p>
    <button class="btn btn-primary" id="btn-confirm-delete-account" style="background:var(--danger); margin-top:14px;">تأكيد الحذف النهائي</button>
    <button class="btn btn-outline" id="btn-cancel-delete-account" style="margin-top:10px;">إلغاء</button>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#btn-cancel-delete-account").onclick = ()=> overlay.remove();
  overlay.querySelector("#btn-confirm-delete-account").onclick = async ()=>{
    const btn = overlay.querySelector("#btn-confirm-delete-account"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
    try{
      await deleteDoc(doc(db, USERS_COL, currentUser.uid));
      await deleteUser(currentUser);
      overlay.remove();
    }catch(e){
      console.error(e);
      toast("محتاج تسجل دخول تاني قبل الحذف لأسباب أمان — سجل خروج وادخل تاني وجرب من جديد");
      overlay.remove();
    }
  };
};

/* ============================================================
   دورة حياة المصادقة
   ============================================================ */
let awaitingManualFlow = false;

async function proceedAfterAuth(user, profile){
  myProfile = profile;
  updateDoc(doc(db, USERS_COL, user.uid), { lastActiveAt: serverTimestamp() }).catch(()=>{});

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
  if(!myProfile.isAdmin) autoFollowAllAdmins(user.uid);
  checkStudentFreeProUpgrade();
  checkVerificationTrialExpiry();
}
/* بعد شهر من توثيق الطالب، تفعيل باقة Pro مجانًا تلقائيًا (مكافأة الطلاب) */
async function checkStudentFreeProUpgrade(){
  if(!myProfile.isStudentVerified || myProfile.studentAutoProGranted || !myProfile.studentVerifiedAt) return;
  const verifiedMs = myProfile.studentVerifiedAt?.toMillis ? myProfile.studentVerifiedAt.toMillis() : new Date(myProfile.studentVerifiedAt).getTime();
  const THIRTY_DAYS = 30*24*3600*1000;
  if(Date.now() - verifiedMs < THIRTY_DAYS) return;
  try{
    await updateDoc(doc(db, USERS_COL, currentUser.uid), { planTier:"pro", studentAutoProGranted:true, planFreeForStudent:true });
    myProfile.planTier = "pro"; myProfile.studentAutoProGranted = true;
    notifyUser(currentUser.uid, "مبروك! اتفعّلت باقة Pro مجانًا كمكافأة لأنك طالب موثّق معانا من شهر");
    toast("مبروك! باقة Pro اتفعّلت مجانًا كمكافأة توثيق الطالب");
  }catch(e){ console.error(e); }
}
/* تجربة التوثيق (شركات/عام) مجانية 3 أيام، وبعدها لازم دفع أو التواصل مع الفريق — شاشة الدفع تفضل ظاهرة لحد ما يتحل الموضوع */
const VERIFICATION_TRIAL_DAYS = 3;
async function checkVerificationTrialExpiry(){
  if(!myProfile.trialActive || !myProfile.trialStartedAt) return;
  const startMs = myProfile.trialStartedAt?.toMillis ? myProfile.trialStartedAt.toMillis() : new Date(myProfile.trialStartedAt).getTime();
  const trialMs = VERIFICATION_TRIAL_DAYS*24*3600*1000;
  if(Date.now() - startMs < trialMs) return;
  try{
    await updateDoc(doc(db, USERS_COL, currentUser.uid), { trialActive:false, paywallLocked:true });
    myProfile.trialActive = false; myProfile.paywallLocked = true;
    notifyUser(currentUser.uid, "انتهت فترة تجربة التوثيق المجانية — ادفع للاستمرار أو تواصل مع الفريق من صفحة الباقات");
  }catch(e){ console.error(e); }
}
/* شاشة دفع دائمة تظهر كل ما يفتح التطبيق لحد ما يدفع أو الفريق يرفع القفل بعد التواصل */
function showPaywallOverlayIfLocked(){
  if(!myProfile.paywallLocked) return;
  if(document.getElementById("paywall-lock-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "paywall-lock-overlay";
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:center;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 8px;">انتهت فترة التجربة المجانية</h3>
    <p style="font-size:13px; color:var(--muted); line-height:1.8;">تجربة التوثيق المجانية (3 أيام) خلصت. ادفع الآن للاستمرار في التوثيق، أو تواصل مع الفريق وهيراجعوا حالتك.</p>
    <button class="btn btn-primary" id="btn-paywall-pay" style="margin-top:14px;">الدفع الآن</button>
    <button class="btn btn-outline" id="btn-paywall-contact" style="margin-top:10px;">${myProfile.paywallContactRequested ? "تم إرسال طلبك، في انتظار الرد" : "تواصل مع الفريق"}</button>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("#btn-paywall-pay").onclick = ()=>{ overlay.remove(); renderPlans(); show("screen-plans"); };
  const contactBtn = overlay.querySelector("#btn-paywall-contact");
  if(myProfile.paywallContactRequested) contactBtn.disabled = true;
  contactBtn.onclick = async ()=>{
    try{
      await updateDoc(doc(db, USERS_COL, currentUser.uid), { paywallContactRequested:true });
      myProfile.paywallContactRequested = true;
      toast("تم إرسال طلبك للفريق، هيتراجع في أقرب وقت");
      contactBtn.textContent = "تم إرسال طلبك، في انتظار الرد";
      contactBtn.disabled = true;
    }catch(e){ toast("تعذر إرسال الطلب"); }
  };
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

/* تسجيل الدخول/الخروج بيوصل كرسالة من حساب الدعم في الشات، بدون أي إيميل حقيقي وبدون إظهار إيميل الفريق للمستخدم */
async function sendLoginWelcome(user, profile){
  if(sessionStorage.getItem("welcomeSent")==="1") return;
  sessionStorage.setItem("welcomeSent","1");
  await notifyUser(user.uid, `تم تسجيل الدخول إلى حسابك يا ${profile.fullName} — لو مش إنت، غيّر كلمة المرور فورًا من الإعدادات`, true);
}
async function sendLogoutNotice(uid, fullName){
  if(!uid) return;
  await notifyUser(uid, `تم تسجيل الخروج من حسابك يا ${fullName||"صديقنا"}`, true);
}

function enterApp(){
  $("tabbar").classList.remove("hidden");
  $("mini-avatar").src = myProfile.profilePic || DEFAULT_AVATAR;
  $("composer-admin-tools").style.display = myProfile.isAdmin ? "flex" : "none";
  $("composer-counter").textContent = `${$("composer-text").value.length} / ${postCharLimit()}`;
  $("composer-schedule-wrap").style.display = (myProfile.planTier==="pro" || myProfile.isAdmin) ? "block" : "none";
  document.querySelector('.tab-item[data-target="screen-feed"]').click();
  startFeedListener();
  startCodeFeedListener();
  startNotifsListener();
  renderStoriesBar();
  showPaywallOverlayIfLocked();
}

/* ============================================================
   الفيد — المنشورات
   ============================================================ */
function postCharLimit(){ return (myProfile && (myProfile.planTier==="plus" || myProfile.planTier==="pro" || myProfile.isAdmin)) ? 800 : 500; }
$("composer-text").addEventListener("input", ()=>{ $("composer-counter").textContent = `${$("composer-text").value.length} / ${postCharLimit()}`; });
$("code-composer-text").addEventListener("input", ()=>{ $("code-composer-counter").textContent = `${$("code-composer-text").value.length} / 800`; });

$("btn-post-submit").onclick = ()=> submitPost($("composer-text"), postCharLimit(), false);
$("composer-schedule-toggle")?.addEventListener("change", (e)=>{
  $("composer-schedule-time").style.display = e.target.checked ? "block" : "none";
});
$("btn-code-post-submit").onclick = ()=> submitPost($("code-composer-text"), 800, true);

/* ---------- إرفاق صور في المنشور: مجاني صورة واحدة، Plus حتى 3، Pro حتى 10 بتصميم كاروسيل ---------- */
let pendingComposerImages = [];
function isPlusOrAbove(profileObj){
  const p = profileObj || myProfile;
  return p.planTier==="plus" || p.planTier==="pro" || p.isAdmin || p.isStudentVerified;
}
function maxPostImages(){
  if(myProfile.isAdmin || myProfile.planTier==="pro") return 10;
  if(myProfile.isStudentVerified) return 5;
  if(myProfile.planTier==="plus") return 3;
  return 1;
}
$("btn-composer-image").onclick = ()=>{
  $("composer-image-file").setAttribute("multiple", maxPostImages()>1 ? "multiple" : "");
  $("composer-image-file").click();
};
$("composer-image-file").addEventListener("change", async (e)=>{
  const max = maxPostImages();
  const room = pendingComposerImages.length;
  const files = [...e.target.files].slice(0, Math.max(0, max - room));
  if(!files.length){ e.target.value=""; return; }
  if(e.target.files.length > files.length) toast(`أقصى عدد صور تقدر ترفعه دلوقتي ${max}`);
  const btn = $("btn-composer-image"); btn.innerHTML = '<div class="spinner spinner-dark"></div>';
  for(const file of files){
    try{
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method:"POST", body:fd });
      const data = await res.json();
      if(data.success) pendingComposerImages.push(data.data.url);
      else toast("تعذر رفع إحدى الصور");
    }catch(err){ toast("تعذر رفع إحدى الصور"); }
  }
  renderComposerMediaPreview();
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
  e.target.value = "";
});
function renderComposerMediaPreview(){
  const wrap = $("composer-media-preview");
  if(!pendingComposerImages.length){ wrap.innerHTML=""; return; }
  wrap.innerHTML = `<div class="composer-media-grid">${pendingComposerImages.map((url,i)=>`
    <div class="composer-media-preview protected-media"><img src="${url}" oncontextmenu="return false" draggable="false"><div class="remove-media" data-rm-composer-img="${i}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg></div></div>
  `).join("")}</div>`;
  wrap.querySelectorAll("[data-rm-composer-img]").forEach(el=>{
    el.onclick = ()=>{ pendingComposerImages.splice(Number(el.dataset.rmComposerImg),1); renderComposerMediaPreview(); };
  });
}
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
  if(!text && !pendingComposerImages.length && !pendingAdminMedia){ toast("اكتب شيئًا أولاً"); return; }
  if(text.length > maxLen){ toast("النص طويل جدًا"); return; }

  const detectedMedia = extractMediaLink(text);
  const finalMedia = (myProfile.isAdmin || myProfile.planTier==="pro") ? (pendingAdminMedia || detectedMedia) : null;
  const hashtags = extractHashtags(text);
  const images = !isCode ? pendingComposerImages.slice(0, maxPostImages()) : [];
  let scheduledAt = null;
  if(!isCode && (myProfile.planTier==="pro"||myProfile.isAdmin) && $("composer-schedule-toggle")?.checked){
    const val = $("composer-schedule-time").value;
    if(!val){ toast("اختار وقت الجدولة الأول"); return; }
    const d = new Date(val);
    if(d.getTime() <= Date.now()){ toast("وقت الجدولة لازم يكون في المستقبل"); return; }
    scheduledAt = d;
  }

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
      images,
      imageUrl: images.length ? images[0] : null,
      mediaType: finalMedia ? finalMedia.type : null,
      mediaUrl: finalMedia ? finalMedia.url : null,
      hashtags,
      pinned:false, globalPinned:false,
      tag: isCode ? ($("code-tag-select")?.value || null) : null,
      subscribers: isCode ? [currentUser.uid] : [],
      isQuestion: isCode ? !!$("code-mark-question")?.checked : false,
      solved: false,
      scheduledAt,
      likes:[], commentsCount:0, createdAt: serverTimestamp()
    };
    await addDoc(collection(db, POSTS_COL), postData);
    if(isCode){
      const tagVal = postData.tag;
      if(tagVal){
        const subs = await getDocs(query(collection(db, USERS_COL), where("subscribedTags","array-contains",tagVal), limit(200)));
        subs.docs.filter(d=>d.id!==currentUser.uid).forEach(d=> notifyUser(d.id, `منشور جديد بوسم «${tagVal}»: ${text.slice(0,60)}`));
      }
    }
    textarea.value=""; textarea.dispatchEvent(new Event("input"));
    if(isCode && $("code-mark-question")) $("code-mark-question").checked = false;
    if($("composer-schedule-toggle")){ $("composer-schedule-toggle").checked=false; $("composer-schedule-time").style.display="none"; $("composer-schedule-time").value=""; }
    pendingComposerImages = []; $("composer-media-preview") && ($("composer-media-preview").innerHTML="");
    pendingAdminMedia = null; renderAdminMediaPreview();
    toast(scheduledAt ? "تم جدولة المنشور" : "تم النشر");
  }catch(e){ toast("تعذر النشر، حاول مرة أخرى"); }
}

function mediaBlockHTML(p){
  let html = "";
  const images = (p.images && p.images.length) ? p.images : (p.imageUrl ? [p.imageUrl] : []);
  const canDownloadOwn = images.length && myProfile && p.authorId===myProfile.id && (myProfile.planTier==="pro"||myProfile.isAdmin);
  const downloadBtn = canDownloadOwn ? `<div class="icon-btn download-own-media-btn" data-download-images='${JSON.stringify(images)}' title="تحميل نسخة أصلية" style="position:absolute; top:8px; left:8px; z-index:2; background:rgba(0,0,0,.5); color:#fff; width:32px; height:32px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg></div>` : "";
  if(images.length===1){
    html += `<div class="post-image-wrap protected-media">${downloadBtn}<img src="${images[0]}" oncontextmenu="return false" draggable="false" loading="lazy"></div>`;
  }else if(images.length>1){
    const cid = "carousel-"+Math.random().toString(36).slice(2,9);
    html += `<div class="post-carousel protected-media">${downloadBtn}
      <div class="post-carousel-count">1/${images.length}</div>
      <div class="post-carousel-track" id="${cid}" data-carousel>${images.map(url=>`<img src="${url}" oncontextmenu="return false" draggable="false" loading="lazy">`).join("")}</div>
      <div class="post-carousel-dots">${images.map((_,i)=>`<span class="${i===0?'active':''}"></span>`).join("")}</div>
    </div>`;
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

function codeify(text){
  const parts = text.split(/```([\s\S]*?)```/g);
  let out = "";
  parts.forEach((part, i)=>{
    if(i % 2 === 1){
      const escaped = part.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
      out += `<pre class="code-block">${escaped}</pre><div class="code-copy-btn" onclick="window.copyCodeBlock(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> نسخ الكود</div>`;
    }else{ out += linkify(part); }
  });
  return out;
}
window.copyCodeBlock = function(btn){
  const pre = btn.previousElementSibling;
  if(!pre) return;
  navigator.clipboard?.writeText(pre.textContent);
  toast("تم نسخ الكود");
};

function postRowHTML(p){
  const liked = (p.likes||[]).includes(currentUser?.uid);
  const nameStyle = p.authorNameColor ? `style="color:${p.authorNameColor}"` : "";
  const avatarHTML = (p.authorPlan==="pro" || p.authorPlan==="admin")
    ? `<span class="avatar-pro-ring"><img class="avatar" style="width:38px;height:38px;" src="${p.authorPic||DEFAULT_AVATAR}"></span>`
    : `<img class="avatar" src="${p.authorPic||DEFAULT_AVATAR}">`;
  const pinTag = (p.pinned||p.globalPinned) ? `<div class="pinned-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l1.5 5.5L19 9l-4 3.5L16 18l-4-3-4 3 1-5.5L5 9l5.5-1.5L12 2z"/></svg>${p.globalPinned?'مثبّت من الإدارة':'منشور مثبّت'}</div>` : "";
  const scheduledTag = (p.scheduledAt && p.authorId===myProfile?.id) ? `<div class="pinned-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>مجدول — هيظهر للكل قريبًا</div>` : "";
  const isOwner = myProfile && myProfile.id===p.authorId;
  const canPinOwn = isOwner && (myProfile.planTier==="pro" || myProfile.isAdmin);
  const isAdmin = myProfile && myProfile.isAdmin;
  const showMenu = isOwner || isAdmin || (myProfile && !isOwner);
  const signatureHTML = p.authorSignature ? `<div class="post-time meta-font" style="margin-top:8px; color:var(--muted); font-style:italic;">${linkify(p.authorSignature)}</div>` : "";
  const isQuestion = p.room==="code" && p.isQuestion;
  const questionTag = isQuestion
    ? `<span class="question-tag ${p.solved?'q-solved':'q-open'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 17h.01M9.5 9a2.5 2.5 0 015 0c0 1.5-2.5 2-2.5 4"/></svg>${p.solved?'تم الحل':'سؤال مفتوح'}</span>`
    : "";
  const tagBadge = (p.room==="code" && p.tag) ? `<span class="chip" style="margin-inline-end:6px;">${p.tag}</span>` : "";
  const isSubscribed = myProfile && (p.subscribers||[]).includes(myProfile.id);
  const canSubscribeUnlimited = myProfile && (myProfile.planTier==="pro" || myProfile.isAdmin);
  const subscribeBtn = (p.room==="code" && myProfile && !isOwner)
    ? `<button class="post-action" data-subscribe="${p.id}" data-state="${isSubscribed}" data-unlimited="${canSubscribeUnlimited}" title="${isSubscribed?'إلغاء متابعة السؤال':'تابع السؤال وهتوصلك إشعار بالرد'}">
        <svg viewBox="0 0 24 24" fill="${isSubscribed?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
      </button>` : "";
  const solveBtn = (isOwner && isQuestion)
    ? `<button class="post-action" data-toggle-solved="${p.id}" data-state="${!!p.solved}" title="${p.solved?'إلغاء علامة الحل':'تحديد كمحلول'}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
      </button>` : "";
  const canBookmark = myProfile && (myProfile.planTier==="plus" || myProfile.planTier==="pro" || myProfile.isAdmin);
  const isBookmarked = myProfile && (myProfile.bookmarks||[]).includes(p.id);
  const bookmarkBtn = canBookmark ? `<button class="post-action bookmark-btn ${isBookmarked?'saved':''}" data-bookmark="${p.id}" data-state="${!!isBookmarked}" title="حفظ المنشور">
      <svg viewBox="0 0 24 24" fill="${isBookmarked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
    </button>` : "";

  const isRepost = !!p.repostOf;
  const repostBanner = isRepost ? `<div class="repost-banner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>أعاد ${p.authorName||"مستخدم"} النشر</div>` : "";

  return `
  <div class="glass-card post" data-id="${p.id}">
    ${pinTag}${scheduledTag}${questionTag}${tagBadge}${repostBanner}
    <div class="post-head">
      ${avatarHTML}
      <div style="flex:1;">
        <div class="post-author" data-open-user="${p.authorUsername}" ${nameStyle}>${p.authorName||"مستخدم"} ${badgeHTML(p.authorVerified, p.authorUsername)}</div>
        <div class="post-username">@${p.authorUsername||""}</div>
        <div class="post-time meta-font">${timeAgo(p.createdAt)}</div>
      </div>
      ${showMenu ? `<button class="icon-btn post-menu-btn" data-post-menu="${p.id}" data-owner="${isOwner}" data-pinned="${!!p.pinned}" data-global-pinned="${!!p.globalPinned}" data-canpin="${canPinOwn}" data-room="${p.room||'general'}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg></button>` : ""}
    </div>
    ${p.text ? `<div class="post-text">${p.room==="code" ? codeify(p.text||"") : linkify(p.text||"")}</div>` : ""}
    ${isRepost ? `
      <div class="quoted-post-card" data-open-post="${p.repostOf}">
        <div class="post-head" style="margin-bottom:6px;">
          <img class="avatar" style="width:30px; height:30px;" src="${p.originalAuthorPic||DEFAULT_AVATAR}">
          <div style="flex:1;">
            <div class="post-author" style="font-size:13px;">${p.originalAuthorName||"مستخدم"} ${badgeHTML(p.originalAuthorVerified, p.originalAuthorUsername)}</div>
            <div class="post-username">@${p.originalAuthorUsername||""}</div>
          </div>
        </div>
        ${p.originalText ? `<div class="post-text" style="font-size:13.5px;">${linkify(p.originalText)}</div>` : ""}
        ${mediaBlockHTML({images:p.originalImages||[], imageUrl:p.originalImageUrl||null})}
      </div>` : mediaBlockHTML(p)}
    ${signatureHTML}
    <div class="post-actions">
      <button class="post-action like-btn ${liked?"liked":""}" data-id="${p.id}" data-liked="${liked}" data-author="${p.authorId}">
        <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>
        <span class="like-count" data-open-likers="${p.id}">${(p.likes||[]).length}</span>
      </button>
      <button class="post-action comment-btn" data-id="${p.id}">
        <svg viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>
        <span>${p.commentsCount||0}</span>
      </button>
      <button class="post-action share-btn" data-id="${p.id}">
        <svg viewBox="0 0 24 24"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg>
        <span>${p.repostsCount ? p.repostsCount : "مشاركة"}</span>
      </button>
      ${bookmarkBtn}${solveBtn}${subscribeBtn}
    </div>
  </div>`;
}

/* شيت مشاركة المنشور: نسخ رابط / إعادة نشر داخل التطبيق / مشاركة كصورة */
function openShareActionSheet(postId){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet">
    <div class="modal-sheet-handle"></div>
    <div class="share-sheet-item" id="share-copy-link"><svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0L4.1 13.83a5 5 0 007.07 7.07l1.5-1.5"/></svg>نسخ رابط المنشور</div>
    <div class="share-sheet-item" id="share-repost"><svg viewBox="0 0 24 24"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>إعادة النشر في فيدك</div>
    <div class="share-sheet-item" id="share-as-image"><svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>مشاركة كصورة</div>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  overlay.querySelector("#share-copy-link").onclick = ()=>{
    const url = `${location.origin}${location.pathname}?post=${postId}`;
    navigator.clipboard?.writeText(url);
    toast("تم نسخ رابط المنشور");
    overlay.remove();
  };
  overlay.querySelector("#share-repost").onclick = ()=>{ overlay.remove(); repostPost(postId); };
  overlay.querySelector("#share-as-image").onclick = ()=>{ overlay.remove(); sharePostAsImage(postId); };
}

async function repostPost(postId){
  try{
    const snap = await getDoc(doc(db, POSTS_COL, postId));
    if(!snap.exists()){ toast("المنشور ده مش موجود"); return; }
    const orig = snap.data();
    if(orig.repostOf){ toast("مينفعش تعيد نشر منشور معاد نشره بالفعل"); return; }
    if(orig.authorId===currentUser.uid){ toast("مينفعش تعيد نشر منشورك"); return; }
    await addDoc(collection(db, POSTS_COL), {
      authorId: currentUser.uid, authorUsername: myProfile.username, authorName: myProfile.fullName,
      authorNameColor: myProfile.nameColor||null, authorPic: myProfile.profilePic||DEFAULT_AVATAR,
      authorVerified: myProfile.verifiedType||null, authorPlan: myProfile.isAdmin?"admin":(myProfile.planTier||"free"),
      text:"", room: orig.room||"general", images:[], imageUrl:null, hashtags:[], pinned:false, globalPinned:false,
      likes:[], commentsCount:0,
      repostOf: postId,
      originalAuthorName: orig.authorName, originalAuthorUsername: orig.authorUsername, originalAuthorPic: orig.authorPic||DEFAULT_AVATAR,
      originalAuthorVerified: orig.authorVerified||null, originalText: orig.text||"", originalImages: orig.images||[], originalImageUrl: orig.imageUrl||null,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(db, POSTS_COL, postId), { repostsCount: increment(1) });
    if(orig.authorId) notifyUser(orig.authorId, `${myProfile.fullName} أعاد نشر منشورك`);
    toast("تم إعادة النشر في فيدك");
  }catch(e){ console.error(e); toast("تعذر إعادة النشر، حاول تاني"); }
}

/* مشاركة المنشور كصورة واحدة — بتضم صورة البروفايل والاسم ونص المنشور وصورته لو موجودة */
async function sharePostAsImage(postId){
  toast("جاري تجهيز الصورة...");
  try{
    const snap = await getDoc(doc(db, POSTS_COL, postId));
    if(!snap.exists()){ toast("المنشور ده مش موجود"); return; }
    const p = snap.data();
    const images = (p.images&&p.images.length) ? p.images : (p.imageUrl?[p.imageUrl]:[]);
    const W = 1080;
    const hasImage = images.length>0;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    const ctx = canvas.getContext("2d");

    function loadImg(src){
      return new Promise((resolve,reject)=>{
        const img = new Image(); img.crossOrigin = "anonymous";
        img.onload = ()=>resolve(img); img.onerror = reject;
        img.src = src;
      });
    }
    function wrapText(text, x, y, maxWidth, lineHeight, maxLines){
      const words = text.split(" ");
      let line = ""; let lines = [];
      for(const w of words){
        const test = line ? line+" "+w : w;
        if(ctx.measureText(test).width > maxWidth && line){ lines.push(line); line = w; }
        else line = test;
        if(lines.length >= maxLines) break;
      }
      if(line && lines.length < maxLines) lines.push(line);
      lines.forEach((l,i)=> ctx.fillText(l, x, y + i*lineHeight, maxWidth));
      return lines.length*lineHeight;
    }

    const avatar = await loadImg(p.authorPic||DEFAULT_AVATAR).catch(()=>null);
    let postImg = null;
    if(hasImage) postImg = await loadImg(images[0]).catch(()=>null);

    const headerH = 130;
    const footerH = 90;
    const imgAreaH = (hasImage && postImg) ? Math.round(W * (postImg.height/postImg.width)) : 0;
    const textAreaH = p.text ? 220 : 40;
    canvas.height = headerH + imgAreaH + textAreaH + footerH;

    ctx.fillStyle = "#ffffff"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.direction = "rtl"; ctx.textAlign = "right";

    if(avatar){
      ctx.save();
      ctx.beginPath(); ctx.arc(W-90, 65, 42, 0, Math.PI*2); ctx.clip();
      ctx.drawImage(avatar, W-132, 23, 84, 84);
      ctx.restore();
    }
    ctx.fillStyle = "#0B0B0C"; ctx.font = "700 34px 'IBM Plex Sans Arabic', sans-serif";
    ctx.fillText(p.authorName||"مستخدم", W-150, 55, 480);
    ctx.fillStyle = "#86868B"; ctx.font = "500 24px 'IBM Plex Sans Arabic', sans-serif";
    ctx.fillText("@"+(p.authorUsername||""), W-150, 90, 480);

    if(hasImage && postImg){
      ctx.drawImage(postImg, 0, headerH, W, imgAreaH);
    }

    if(p.text){
      ctx.fillStyle = "#0B0B0C"; ctx.font = "400 30px 'IBM Plex Sans Arabic', sans-serif";
      wrapText(p.text, W-40, headerH+imgAreaH+50, W-80, 42, 4);
    }

    ctx.fillStyle = "#86868B"; ctx.font = "600 26px 'IBM Plex Sans Arabic', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("404", W/2, canvas.height-35);

    canvas.toBlob(async (blob)=>{
      if(!blob){ toast("تعذر إنشاء الصورة"); return; }
      const file = new File([blob], `404-post-${postId}.png`, { type:"image/png" });
      if(navigator.canShare && navigator.canShare({ files:[file] })){
        try{ await navigator.share({ files:[file], title:"404" }); return; }catch(e){ /* المستخدم لغى المشاركة أو مش مدعومة، هنزل الصورة بدلاً من كده */ }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `404-post-${postId}.png`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast("تم تنزيل صورة المنشور");
    }, "image/png");
  }catch(e){ console.error(e); toast("تعذر إنشاء صورة المنشور، حاول تاني"); }
}
  const postId = btn.dataset.postMenu;
  const isOwner = btn.dataset.owner==="true";
  const canPin = btn.dataset.canpin==="true";
  const pinned = btn.dataset.pinned==="true";
  const globalPinned = btn.dataset.globalPinned==="true";
  const isCodeRoom = btn.dataset.room==="code";
  const opts = [];
  if(canPin) opts.push({ label: pinned?(isCodeRoom?"إلغاء التثبيت في الغرفة":"إلغاء تثبيت المنشور"):(isCodeRoom?"تثبيت في أعلى غرفة البرمجة":"تثبيت في بروفايلي"), action:()=>toggleOwnPinAction(postId, pinned) });
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
  container.querySelectorAll("[data-download-images]").forEach(btn=>{
    btn.onclick = async (e)=>{
      e.stopPropagation();
      let urls = [];
      try{ urls = JSON.parse(btn.dataset.downloadImages); }catch(_){}
      for(let i=0;i<urls.length;i++){
        try{
          const res = await fetch(urls[i]);
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = objUrl; a.download = `404-post-image-${i+1}.jpg`;
          document.body.appendChild(a); a.click(); a.remove();
          URL.revokeObjectURL(objUrl);
        }catch(err){ window.open(urls[i], "_blank"); }
      }
      toast(urls.length>1 ? "جاري تنزيل الصور" : "جاري تنزيل الصورة");
    };
  });
  container.querySelectorAll("[data-carousel]").forEach(track=>{
    const wrap = track.closest(".post-carousel");
    const dots = wrap.querySelectorAll(".post-carousel-dots span");
    const countEl = wrap.querySelector(".post-carousel-count");
    const total = track.children.length;
    track.addEventListener("scroll", ()=>{
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      dots.forEach((d,i)=> d.classList.toggle("active", i===idx));
      countEl.textContent = `${idx+1}/${total}`;
    });
  });
  container.querySelectorAll("[data-subscribe]").forEach(btn=>{
    btn.onclick = async ()=>{
      const postId = btn.dataset.subscribe;
      const subscribed = btn.dataset.state==="true";
      const unlimited = btn.dataset.unlimited==="true";
      const cap = myProfile.isStudentVerified ? 10 : 5;
      if(!subscribed && !unlimited){
        const mySubs = await getDocs(query(collection(db,POSTS_COL), where("room","==","code"), where("subscribers","array-contains",myProfile.id), limit(cap+1)));
        if(mySubs.size >= cap){ toast(`وصلت للحد الأقصى (${cap} أسئلة) — Pro يفتح متابعة بلا حدود`); return; }
      }
      try{
        await updateDoc(doc(db,POSTS_COL,postId), { subscribers: subscribed ? arrayRemove(myProfile.id) : arrayUnion(myProfile.id) });
        toast(subscribed ? "تم إلغاء متابعة السؤال" : "هتوصلك إشعار عند أي رد على السؤال ده");
        btn.dataset.state = String(!subscribed);
        btn.classList.toggle("liked", !subscribed);
      }catch(e){ toast("تعذر تنفيذ العملية"); }
    };
  });
  container.querySelectorAll(".like-btn").forEach(btn=>{
    btn.onclick = async (e)=>{
      if(e.target.closest("[data-open-likers]")) return;
      const id = btn.dataset.id; const liked = btn.dataset.liked==="true"; const authorId = btn.dataset.author;
      btn.disabled = true;
      try{
        const pref = doc(db, POSTS_COL, id);
        await updateDoc(pref, { likes: liked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
        if(!liked && authorId && authorId!==currentUser.uid) notifyUser(authorId, `${myProfile.fullName} أعجب بمنشورك`);
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
    btn.onclick = ()=> openShareActionSheet(btn.dataset.id);
  });
  container.querySelectorAll("[data-open-post]").forEach(el=>{
    el.onclick = (e)=>{ e.stopPropagation(); openPostDirect(el.dataset.openPost); };
  });
  container.querySelectorAll("[data-bookmark]").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.dataset.bookmark; const saved = btn.dataset.state==="true";
      btn.disabled = true;
      try{
        await updateDoc(doc(db, USERS_COL, currentUser.uid), { bookmarks: saved ? arrayRemove(id) : arrayUnion(id) });
        if(saved){ myProfile.bookmarks = (myProfile.bookmarks||[]).filter(x=>x!==id); }
        else{ myProfile.bookmarks = [...(myProfile.bookmarks||[]), id]; }
        btn.dataset.state = (!saved).toString();
        btn.classList.toggle("saved", !saved);
        btn.querySelector("svg").setAttribute("fill", !saved ? "currentColor" : "none");
        toast(saved ? "تمت إزالة المنشور من المحفوظات" : "تم حفظ المنشور");
      }catch(e){ toast("تعذر تنفيذ العملية، حاول تاني"); }
      btn.disabled = false;
    };
  });
  container.querySelectorAll("[data-toggle-solved]").forEach(btn=>{
    btn.onclick = async ()=>{
      const id = btn.dataset.toggleSolved; const newState = !(btn.dataset.state==="true");
      try{ await updateDoc(doc(db, POSTS_COL, id), { solved:newState }); }
      catch(e){ toast("تعذر تنفيذ العملية، حاول تاني"); }
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
  menu.innerHTML = opts.map((o,i)=>`<button data-opt-idx="${i}" class="${o.danger?'danger':''}">${o.label}</button>`).join("");
  document.body.appendChild(menu);

  const menuWidth = menu.offsetWidth || 180;
  const menuHeight = menu.offsetHeight || 120;
  let left = rect.right - menuWidth; // نحاذي القائمة مع يمين الزر (اتجاه RTL)
  left = Math.max(10, Math.min(left, window.innerWidth - menuWidth - 10));
  let top = rect.bottom + 6;
  if(top + menuHeight > window.innerHeight - 10){ top = rect.top - menuHeight - 6; } // لو مفيش مساحة تحت، افتحها فوق الزرار
  menu.style.left = `${left}px`;
  menu.style.top = `${Math.max(10, top)}px`;

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

  const postSnapForModal = await getDoc(doc(db, POSTS_COL, postId));
  const postForModal = postSnapForModal.exists() ? postSnapForModal.data() : {};
  const isOwnerOfQuestion = myProfile && postForModal.authorId===myProfile.id && postForModal.room==="code" && postForModal.isQuestion;
  const canPinComment = myProfile && postForModal.authorId===myProfile.id && isPlusOrAbove();

  async function loadComments(){
    const snap = await getDocs(query(collection(db, POSTS_COL, postId, "comments"), limit(100)));
    let comments = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id,...d.data()})));
    comments.sort((a,b)=> (b.isBest===true) - (a.isBest===true));
    comments.sort((a,b)=> (b.pinned===true) - (a.pinned===true));
    const listEl = overlay.querySelector("#comments-list-inner");
    if(!comments.length){ listEl.innerHTML = `<div class="empty-state"><p>لسه مفيش تعليقات، اكتب الأول</p></div>`; return; }
    listEl.innerHTML = comments.map(c=>{
      const nameStyle = c.authorNameColor ? `style="color:${c.authorNameColor}"` : "";
      return `
      <div class="likers-row" style="align-items:flex-start;">
        <img class="avatar avatar-sm" src="${c.authorPic||DEFAULT_AVATAR}">
        <div style="flex:1;">
          ${c.pinned ? `<div class="pinned-tag" style="margin-bottom:3px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l1.5 5.5L19 9l-4 3.5L16 18l-4-3-4 3 1-5.5L5 9l5.5-1.5L12 2z"/></svg>تعليق مثبّت</div>` : ""}
          <div style="font-weight:600; font-size:13px; display:flex; align-items:center; gap:5px;" data-open-user="${c.authorUsername||''}"><span ${nameStyle}>${c.authorName||"مستخدم"}</span> ${badgeHTML(c.authorVerified, c.authorUsername)}</div>
          <div class="post-text" style="font-size:13.5px; margin-top:2px;">${linkify(c.text||"")}</div>
          <div class="post-time meta-font" style="margin-top:3px;">${timeAgo(c.createdAt)}</div>
          <div style="display:flex; gap:12px; align-items:center; margin-top:4px;">
            ${c.isBest ? `<div class="best-answer-tag"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6L9 17l-5-5"/></svg> أفضل إجابة</div>` : (isOwnerOfQuestion ? `<span class="mark-best-btn" data-mark-best="${c.id}">تحديد كأفضل إجابة</span>` : "")}
            ${canPinComment ? `<span class="mark-best-btn" data-toggle-pin-comment="${c.id}" data-pinned="${!!c.pinned}">${c.pinned?'إلغاء التثبيت':'تثبيت التعليق'}</span>` : ""}
          </div>
        </div>
      </div>`;
    }).join("");
    listEl.querySelectorAll("[data-open-user]").forEach(el=>{
      if(!el.dataset.openUser) return;
      el.style.cursor="pointer";
      el.onclick = ()=>{ overlay.remove(); openOtherProfile(el.dataset.openUser); };
    });
    listEl.querySelectorAll("[data-mark-best]").forEach(el=>{
      el.onclick = async ()=>{
        try{
          const commentDoc = comments.find(c=>c.id===el.dataset.markBest);
          const prevBest = await getDocs(query(collection(db, POSTS_COL, postId, "comments"), where("isBest","==",true), limit(5)));
          await Promise.all(prevBest.docs.map(d=> updateDoc(doc(db, POSTS_COL, postId, "comments", d.id), { isBest:false })));
          await updateDoc(doc(db, POSTS_COL, postId, "comments", el.dataset.markBest), { isBest:true });
          if(commentDoc?.authorId) updateDoc(doc(db, USERS_COL, commentDoc.authorId), { bestAnswersCount: increment(1) }).catch(()=>{});
          toast("تم تحديد أفضل إجابة");
          loadComments();
        }catch(e){ toast("تعذر تنفيذ العملية"); }
      };
    });
    listEl.querySelectorAll("[data-toggle-pin-comment]").forEach(el=>{
      el.onclick = async ()=>{
        const wasPinned = el.dataset.pinned==="true";
        try{
          if(!wasPinned){
            const prevPinned = await getDocs(query(collection(db, POSTS_COL, postId, "comments"), where("pinned","==",true), limit(5)));
            await Promise.all(prevPinned.docs.map(d=> updateDoc(doc(db, POSTS_COL, postId, "comments", d.id), { pinned:false })));
          }
          await updateDoc(doc(db, POSTS_COL, postId, "comments", el.dataset.togglePinComment), { pinned: !wasPinned });
          toast(wasPinned ? "تم إلغاء تثبيت التعليق" : "تم تثبيت التعليق");
          loadComments();
        }catch(e){ toast("تعذر تنفيذ العملية"); }
      };
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
        authorNameColor: isPlusOrAbove() ? (myProfile.nameColor||null) : null,
        pinned:false, isBest:false,
        text, createdAt: serverTimestamp()
      });
      const postSnap = await getDoc(doc(db, POSTS_COL, postId));
      const postData = postSnap.data();
      await updateDoc(doc(db, POSTS_COL, postId), { commentsCount: (postData.commentsCount||0)+1 });
      if(postData.authorId && postData.authorId!==currentUser.uid) notifyUser(postData.authorId, `${myProfile.fullName} علّق على منشورك: ${text.slice(0,60)}`);
      if(postData.room==="code" && Array.isArray(postData.subscribers)){
        postData.subscribers.filter(uid=> uid!==currentUser.uid && uid!==postData.authorId).forEach(uid=>{
          notifyUser(uid, `${myProfile.fullName} رد على سؤال بتتابعه في غرفة البرمجة: ${text.slice(0,60)}`);
        });
      }
      input.value = ""; input.dispatchEvent(new Event("input"));
      loadComments();
    }catch(e){ toast("تعذر إرسال التعليق"); }
    btn.disabled = false;
  };
}

async function openLikersModal(postId){
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
      html += `<div class="likers-row"><img class="avatar avatar-sm" src="${u.profilePic||DEFAULT_AVATAR}"><div style="font-weight:600; font-size:13.5px;">${u.fullName} ${badgeHTML(u.verifiedType, u.username)}</div></div>`;
    });
  }
  inner.innerHTML = html || `<p class="subtitle">محدش عمل لايك لسه</p>`;
}

function isScheduledHidden(p){
  if(!p.scheduledAt) return false;
  if(p.authorId===currentUser?.uid) return false;
  const t = p.scheduledAt?.toMillis ? p.scheduledAt.toMillis() : new Date(p.scheduledAt).getTime();
  return t > Date.now();
}
function startFeedListener(){
  const q = query(collection(db, POSTS_COL), where("room","==","general"), limit(80));
  unsubFeed = onSnapshot(q, (snap)=>{
    const list = $("feed-list");
    if(snap.empty){ list.innerHTML=""; $("feed-empty").classList.remove("hidden"); return; }
    let docs = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id, ...d.data()})));
    docs = docs.filter(p=> !isScheduledHidden(p));
    if(!docs.length){ list.innerHTML=""; $("feed-empty").classList.remove("hidden"); return; }
    $("feed-empty").classList.add("hidden");
    docs.sort((a,b)=> (b.globalPinned===true) - (a.globalPinned===true));
    list.innerHTML = docs.map(p=>postRowHTML(p)).join("");
    attachPostEvents(list);
  }, (err)=>{ console.error("feed error:", err); toast("تعذر تحميل الفيد، حاول تاني"); });
}
let __lastCodeDocs = [];
document.addEventListener("DOMContentLoaded", ()=>{
  const list = document.getElementById("code-room-features-list");
  if(list) list.innerHTML = CODE_ROOM_FEATURES.map(f=>`<li>${f}</li>`).join("");
});
function startCodeFeedListener(){
  const q = query(collection(db, POSTS_COL), where("room","==","code"), limit(80));
  unsubCodeFeed = onSnapshot(q, (snap)=>{
    const list = $("code-feed-list");
    if(snap.empty){ list.innerHTML=""; __lastCodeDocs=[]; $("code-feed-empty").classList.remove("hidden"); return; }
    $("code-feed-empty").classList.add("hidden");
    __lastCodeDocs = sortByCreatedAtDesc(snap.docs.map(d=>({id:d.id, ...d.data()})));
    renderCodeFeedFiltered();
  }, (err)=>{ console.error("code feed error:", err); toast("تعذر تحميل غرفة البرمجة، حاول تاني"); });
}
let __codeTagFilter = "";
let __codeSort = "new";
function renderCodeStatsBar(){
  const bar = $("code-stats-bar"); if(!bar) return;
  const questions = __lastCodeDocs.filter(p=>p.isQuestion);
  const solved = questions.filter(p=>p.solved).length;
  bar.innerHTML = `<span>${__lastCodeDocs.length} منشور</span><span>${questions.length} سؤال</span><span>${solved} تم حله</span><span>${questions.length-solved} مفتوح</span>`;
}
function updateFollowTagButton(){
  const btn = $("btn-follow-current-tag");
  if(!btn) return;
  if(!__codeTagFilter || !myProfile){ btn.style.display="none"; return; }
  const subscribed = (myProfile.subscribedTags||[]).includes(__codeTagFilter);
  btn.style.display = "inline-flex";
  btn.classList.toggle("active", subscribed);
  btn.textContent = subscribed ? `إلغاء متابعة «${__codeTagFilter}»` : `تابع وسم «${__codeTagFilter}»`;
}
function renderCodeFeedFiltered(){
  const term = ($("code-search-input")?.value||"").trim().toLowerCase();
  const list = $("code-feed-list");
  let docs = __lastCodeDocs;
  if(__codeTagFilter) docs = docs.filter(p=> p.tag===__codeTagFilter);
  if(term) docs = docs.filter(p=> (p.text||"").toLowerCase().includes(term) || (p.authorUsername||"").toLowerCase().includes(term));
  docs = [...docs];
  if(__codeSort==="top") docs.sort((a,b)=> ((b.likes||[]).length+(b.commentsCount||0)) - ((a.likes||[]).length+(a.commentsCount||0)));
  docs.sort((a,b)=> (b.pinned===true) - (a.pinned===true));
  list.innerHTML = docs.length ? docs.map(p=>postRowHTML(p)).join("") : `<div class="empty-state" style="color:#6E6E73;"><p>مفيش نتائج مطابقة</p></div>`;
  attachPostEvents(list);
  renderCodeStatsBar();
  updateFollowTagButton();
}
document.querySelectorAll("#code-tag-filters [data-tag-filter]").forEach(chip=>{
  chip.onclick = ()=>{
    __codeTagFilter = chip.dataset.tagFilter;
    document.querySelectorAll("#code-tag-filters [data-tag-filter]").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    renderCodeFeedFiltered();
  };
});
document.querySelectorAll("#code-sort-bar [data-sort]").forEach(chip=>{
  chip.onclick = ()=>{
    __codeSort = chip.dataset.sort;
    document.querySelectorAll("#code-sort-bar [data-sort]").forEach(c=>c.classList.remove("active"));
    chip.classList.add("active");
    renderCodeFeedFiltered();
  };
});
$("btn-follow-current-tag")?.addEventListener("click", async ()=>{
  if(!__codeTagFilter) return;
  const subscribed = (myProfile.subscribedTags||[]).includes(__codeTagFilter);
  try{
    await updateDoc(doc(db, USERS_COL, currentUser.uid), { subscribedTags: subscribed ? arrayRemove(__codeTagFilter) : arrayUnion(__codeTagFilter) });
    myProfile.subscribedTags = subscribed ? (myProfile.subscribedTags||[]).filter(t=>t!==__codeTagFilter) : [...(myProfile.subscribedTags||[]), __codeTagFilter];
    toast(subscribed ? "تم إلغاء متابعة الوسم" : "هتوصلك إشعار بأي منشور جديد بالوسم ده");
    updateFollowTagButton();
  }catch(e){ toast("تعذر تنفيذ العملية"); }
});
let codeSearchDebounce;
$("code-search-input")?.addEventListener("input", ()=>{
  clearTimeout(codeSearchDebounce);
  codeSearchDebounce = setTimeout(renderCodeFeedFiltered, 250);
});

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
      <div><div style="font-weight:700; display:flex; align-items:center; gap:5px;">${u.fullName} ${badgeHTML(u.verifiedType, u.username)}</div><div class="post-username">@${u.username}</div></div>
    </div>`;
  }).join("");
  wrap.querySelectorAll("[data-open-user]").forEach(el=> el.onclick = ()=> openOtherProfile(el.dataset.openUser));
}

/* ============================================================
   البروفايل الشخصي
   ============================================================ */
function openHighlightLightbox(url){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="protected-media" style="max-width:92vw; max-height:85vh; border-radius:16px; overflow:hidden;"><img src="${url}" oncontextmenu="return false" draggable="false" style="width:100%; display:block;"></div>`;
  overlay.onclick = ()=> overlay.remove();
  document.body.appendChild(overlay);
}
async function renderMyProfile(){
  const snap = await getDoc(doc(db, USERS_COL, currentUser.uid));
  myProfile = { id:currentUser.uid, ...snap.data() };
  const p = myProfile;
  const expiry = planExpiryLabel(p);
  $("profile-content").innerHTML = `
    <div class="profile-cover" style="${p.coverPhoto?`background-image:url('${p.coverPhoto}'); background-size:cover; background-position:center;`:''}"></div>
    <div class="profile-head">
      <img class="profile-avatar" src="${p.profilePic||DEFAULT_AVATAR}">
      <div class="profile-name">${p.fullName} ${badgeHTML(p.verifiedType, p.username)} ${planChip(p)}</div>
      <div class="post-username">@${p.username} ${p.isPrivate?lockChip():''}</div>
      ${p.bio?`<div class="profile-bio">${linkify(p.bio)}</div>`:""}
      ${(p.verifiedType==="engineer" && p.engineeringField)?`<div class="chip" style="margin-top:6px;">${p.engineeringField}</div>`:""}
      ${(p.links&&p.links.length)?`<div class="profile-links">${p.links.map(l=>socialLinkChip(l)).join("")}</div>`:""}
      <div class="profile-stats">
        <div><b>${(p.followers||[]).length}</b> <span>متابِع</span></div>
        <div><b>${(p.following||[]).length}</b> <span>متابَع</span></div>
        ${p.bestAnswersCount ? `<div><b>${p.bestAnswersCount}</b> <span>إجابة مميزة</span></div>` : ""}
      </div>
      ${expiry?`<div class="locked-note" style="margin-top:14px;">${expiry}</div>`:""}
      ${(!p.planTier || p.planTier==="free")?`<button class="btn btn-accent" style="margin-top:14px;" id="btn-goto-plans">الترقية إلى Plus أو Pro</button>`:""}
      ${(p.highlights && p.highlights.length) ? `<div class="highlights-row">${p.highlights.map((h,i)=>`<div class="highlight-circle" data-highlight="${i}"><img src="${h.url}"></div>`).join("")}</div>` : ""}
      ${(p.verifiedType==="developer" && p.pinnedSnippet) ? `<div class="dev-snippet-box">${p.pinnedSnippet.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>` : ""}
      ${(p.verifiedType==="engineer" && p.engineeringProjects && p.engineeringProjects.length) ? p.engineeringProjects.map(pr=>`<div class="engineering-project-card"><h4>${pr.title}</h4><p>${pr.desc}</p></div>`).join("") : ""}
    </div>
    <div class="divider"></div>
    <div class="feed" id="my-posts-feed"></div>
  `;
  $("btn-goto-plans") && ($("btn-goto-plans").onclick = ()=>{ renderPlans(); show("screen-plans"); });
  $("profile-content").querySelectorAll("[data-highlight]").forEach(el=>{
    el.onclick = ()=> openHighlightLightbox(myProfile.highlights[Number(el.dataset.highlight)].url);
  });

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

  const lastActiveMs = u.lastActiveAt?.toMillis ? u.lastActiveAt.toMillis() : (u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0);
  const isOnlineNow = lastActiveMs && (Date.now()-lastActiveMs < 5*60*1000);
  const showOnlineDot = isOnlineNow && (u.planTier==="pro" || u.isAdmin);
  const showLastSeen = !showOnlineDot && lastActiveMs && isPlusOrAbove(u);
  const hideCounts = u.planTier==="pro" || u.verifiedType==="developer" || u.isAdmin;

  let followBtn = "";
  if(!u.isPrivate || u.autoAcceptFollow){
    followBtn = `<button class="btn ${iAmFollowing?'btn-outline':'btn-accent'}" id="btn-follow-toggle">${iAmFollowing?'إلغاء المتابعة':'متابعة'}</button>`;
  }else{
    followBtn = `<button class="btn ${requested?'btn-outline':'btn-accent'}" id="btn-follow-toggle" ${requested?'disabled':''}>${iAmFollowing?'إلغاء المتابعة':(requested?'تم إرسال الطلب':'طلب متابعة')}</button>`;
  }

  $("other-profile-content").innerHTML = `
    <div class="profile-cover" style="${u.coverPhoto?`background-image:url('${u.coverPhoto}'); background-size:cover; background-position:center;`:''}"></div>
    <div class="profile-head">
      <div style="position:relative; display:inline-block;">
        <img class="profile-avatar" src="${u.profilePic||DEFAULT_AVATAR}">
        ${showOnlineDot ? `<span style="position:absolute; bottom:4px; left:4px; width:14px; height:14px; border-radius:50%; background:var(--green); border:2px solid #fff;" title="متصل الآن"></span>` : ""}
      </div>
      <div class="profile-name">${u.fullName} ${badgeHTML(u.verifiedType, u.username)}</div>
      <div class="post-username">@${u.username} ${u.isPrivate?lockChip():''}</div>
      ${showLastSeen ? `<div class="post-time meta-font" style="margin-top:2px;">آخر ظهور ${timeAgo(u.lastActiveAt)}</div>` : ""}
      ${u.bio?`<div class="profile-bio">${linkify(u.bio)}</div>`:""}
      ${(u.verifiedType==="engineer" && u.engineeringField)?`<div class="chip" style="margin-top:6px;">${u.engineeringField}</div>`:""}
      ${(u.links&&u.links.length)?`<div class="profile-links">${u.links.map(l=>socialLinkChip(l)).join("")}</div>`:""}
      ${hideCounts ? "" : `<div class="profile-stats"><div><b>${(u.followers||[]).length}</b> <span>متابِع</span></div><div><b>${(u.following||[]).length}</b> <span>متابَع</span></div>${u.bestAnswersCount ? `<div><b>${u.bestAnswersCount}</b> <span>إجابة مميزة</span></div>` : ""}</div>`}
      <div style="margin-top:14px; display:flex; gap:10px;">${followBtn}<button class="btn btn-outline" id="btn-message-user" style="flex:0; padding:12px 16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="17" height="17"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg></button>
      ${(u.verifiedType==="engineer" && u.id!==myProfile.id) ? `<button class="btn btn-outline endorse-btn" id="btn-endorse-engineer" data-endorsed="${(u.endorsedBy||[]).includes(myProfile.id)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z"/></svg>${(u.endorsedBy||[]).includes(myProfile.id)?'تراجع عن التوصية':'أوصي بيه'} (${(u.endorsedBy||[]).length})</button>` : ""}</div>
      ${(u.highlights && u.highlights.length) ? `<div class="highlights-row">${u.highlights.map((h,i)=>`<div class="highlight-circle" data-other-highlight="${i}"><img src="${h.url}"></div>`).join("")}</div>` : ""}
      ${(u.verifiedType==="developer" && u.pinnedSnippet) ? `<div class="dev-snippet-box">${u.pinnedSnippet.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</div>` : ""}
      ${(u.verifiedType==="engineer" && u.engineeringProjects && u.engineeringProjects.length) ? u.engineeringProjects.map(pr=>`<div class="engineering-project-card"><h4>${pr.title}</h4><p>${pr.desc}</p></div>`).join("") : ""}
    </div>
    <div class="divider"></div>
    <div class="feed" id="other-posts-feed">
      ${isLockedForMe ? `<div class="locked-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> الحساب خاص، تابِعه عشان تشوف منشوراته</div>` : `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`}
    </div>
  `;
  $("other-profile-content").querySelectorAll("[data-other-highlight]").forEach(el=>{
    el.onclick = ()=> openHighlightLightbox(u.highlights[Number(el.dataset.otherHighlight)].url);
  });

  const followBtnEl = $("btn-follow-toggle");
  if(followBtnEl) followBtnEl.onclick = ()=> toggleFollow(uid, u, iAmFollowing, requested);
  $("btn-message-user").onclick = ()=> openChatWithUser(uid);
  $("btn-endorse-engineer")?.addEventListener("click", async ()=>{
    const endorsed = (u.endorsedBy||[]).includes(myProfile.id);
    try{
      await updateDoc(doc(db, USERS_COL, uid), { endorsedBy: endorsed ? arrayRemove(myProfile.id) : arrayUnion(myProfile.id) });
      if(!endorsed) notifyUser(uid, `${myProfile.fullName} أوصى بيك كمهندس محترف`);
      toast(endorsed ? "تم التراجع عن التوصية" : "تم إرسال توصيتك");
      openOtherProfile(u.username);
    }catch(e){ toast("تعذر تنفيذ العملية"); }
  });

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

async function renderBookmarks(){
  const wrap = $("bookmarks-list");
  const ids = myProfile.bookmarks || [];
  if(!ids.length){ wrap.innerHTML = `<div class="empty-state"><p>لسه مفيش منشورات محفوظة</p></div>`; return; }
  wrap.innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
  try{
    const chunks = [];
    for(let i=0;i<ids.length;i+=10) chunks.push(ids.slice(i,i+10));
    let posts = [];
    for(const chunk of chunks){
      const snap = await getDocs(query(collection(db, POSTS_COL), where("__name__","in",chunk)));
      posts.push(...snap.docs.map(d=>({id:d.id, ...d.data()})));
    }
    posts = sortByCreatedAtDesc(posts);
    wrap.innerHTML = posts.length ? posts.map(p=>postRowHTML(p)).join("") : `<div class="empty-state"><p>لسه مفيش منشورات محفوظة</p></div>`;
    attachPostEvents(wrap);
  }catch(e){ console.error(e); wrap.innerHTML = `<div class="empty-state"><p>تعذر تحميل المحفوظات</p></div>`; }
}
$("btn-bookmarks-back").onclick = ()=> document.querySelector('.tab-item[data-target="screen-feed"]').click();

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

async function toggleFollow(uid, u, iAmFollowing, requested){
  const myRef = doc(db, USERS_COL, currentUser.uid);
  const otherRef = doc(db, USERS_COL, uid);
  if(iAmFollowing){
    await updateDoc(myRef, { following: arrayRemove(uid) });
    await updateDoc(otherRef, { followers: arrayRemove(currentUser.uid) });
  }else if(!u.isPrivate || u.autoAcceptFollow){
    await updateDoc(myRef, { following: arrayUnion(uid) });
    await updateDoc(otherRef, { followers: arrayUnion(currentUser.uid) });
    await notifyUser(uid, `${myProfile.fullName} بدأ متابعتك`);
  }else if(!requested){
    await updateDoc(otherRef, { followRequests: arrayUnion(currentUser.uid) });
    await notifyUser(uid, `${myProfile.fullName} أرسل طلب متابعة`);
  }
  openOtherProfile(viewingUsername);
}

const SOCIAL_PLATFORMS = {
  phone:     { label:"Phone",     icon:`<path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.3 1.8.6 2.7a2 2 0 01-.4 2.1L8.1 9.7a16 16 0 006.2 6.2l1.2-1.2a2 2 0 012.1-.4c.9.3 1.8.5 2.7.6a2 2 0 011.7 2z"/>` },
  whatsapp:  { label:"WhatsApp",  icon:`<path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>` },
  telegram:  { label:"Telegram",  icon:`<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>` },
  linkedin:  { label:"LinkedIn",  icon:`<rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/><path d="M9 21v-9a2 2 0 012-2h1a4 4 0 014 4v7"/><path d="M9 12h.01"/>` },
  instagram: { label:"Instagram", icon:`<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>` },
  snapchat:  { label:"Snapchat",  icon:`<circle cx="12" cy="12" r="10"/><path d="M8 13c1 1.5 2.5 2 4 2s3-.5 4-2"/><path d="M9 9h.01M15 9h.01"/>` },
  youtube:   { label:"YouTube",   icon:`<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l6 3-6 3V9z"/>` },
  x:         { label:"X",         icon:`<path d="M4 4l16 16M20 4L4 20"/>` },
  other:     { label:"Other Link", icon:`<path d="M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1"/><path d="M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1"/>` }
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
  renderSignatureBox(p);
  const hideNote = (p.planTier==="pro" || p.verifiedType==="developer" || p.isAdmin);
  $("hide-counts-wrap").style.display = "block";
  $("hide-counts-label").textContent = hideNote
    ? "عدد المتابعين والمتابَعين مخفي تلقائيًا عن الزوار (حسابات Pro والمبرمجين والأدمن)"
    : "عدد متابعينك ومتابَعينك ظاهر للزوار";
  $("btn-toggle-hide-counts").onclick = ()=>{};
  $("btn-toggle-hide-counts").style.cursor = "default";
  renderAccountStats(p);
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
    perks.push("حفظ المنشورات، إحصائيات الحساب، وتوقيع شخصي");
  }else if(p.planTier==="pro"){
    perks.push("تلوين اسمك في المنشورات");
    perks.push("تثبيت منشور واحد أعلى بروفايلك");
    perks.push("هالة مميزة حول صورتك في كل منشور");
    perks.push("إمكانية التقديم على شارة توثيق");
    perks.push("توقيع شخصي يظهر تحت كل منشور");
    perks.push("إحصائيات مفصّلة لحسابك");
    perks.push("حفظ المنشورات وحد أعلى للحروف 800");
  }else if(p.planTier==="plus"){
    perks.push("تلوين اسمك في المنشورات");
    perks.push("حفظ المنشورات (المحفوظات)");
    perks.push("حد أعلى للحروف في المنشور 800 بدل 500");
  }else{
    perks.push("رابط واحد بس في البروفايل — رقّي لـ Plus أو Pro عشان تفتح مميزات أكتر");
  }
  $("my-perks-list").innerHTML = perks.map(t=>`<li>${check}${t}</li>`).join("");
}

/* ---------- التوقيع الشخصي (Pro) ---------- */
function renderSignatureBox(p){
  const isPro = p.planTier==="pro" || p.isAdmin;
  $("set-signature").disabled = !isPro;
  $("set-signature").value = p.signature || "";
  $("btn-save-signature").disabled = !isPro;
  $("signature-locked").classList.toggle("hidden", isPro);
}
$("btn-save-signature").onclick = async ()=>{
  const val = $("set-signature").value.trim();
  try{
    await updateDoc(doc(db, USERS_COL, currentUser.uid), { signature: val });
    myProfile.signature = val;
    toast("تم حفظ التوقيع");
  }catch(e){ toast("تعذر الحفظ، حاول تاني"); }
};

/* ---------- إحصائيات الحساب (Pro) ---------- */
async function renderAccountStats(p){
  const isPro = p.planTier==="pro" || p.isAdmin;
  const box = $("account-stats-box");
  if(!isPro){
    box.innerHTML = `<p class="feature-lock-note">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      الإحصائيات المفصّلة متاحة لمشتركي Pro فقط
    </p>`;
    return;
  }
  box.innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
  try{
    const snap = await getDocs(query(collection(db, POSTS_COL), where("authorId","==",currentUser.uid), limit(300)));
    const posts = snap.docs.map(d=>d.data());
    const totalLikes = posts.reduce((s,post)=> s + (post.likes||[]).length, 0);
    const totalComments = posts.reduce((s,post)=> s + (post.commentsCount||0), 0);
    box.innerHTML = `
      <div style="display:flex; gap:10px; text-align:center;">
        <div style="flex:1;"><div style="font-size:22px; font-weight:800;">${posts.length}</div><div class="post-username">منشور</div></div>
        <div style="flex:1;"><div style="font-size:22px; font-weight:800;">${totalLikes}</div><div class="post-username">إعجاب</div></div>
        <div style="flex:1;"><div style="font-size:22px; font-weight:800;">${totalComments}</div><div class="post-username">تعليق</div></div>
        <div style="flex:1;"><div style="font-size:22px; font-weight:800;">${(p.followers||[]).length}</div><div class="post-username">متابِع</div></div>
      </div>`;
  }catch(e){ box.innerHTML = `<p class="subtitle">تعذر تحميل الإحصائيات</p>`; }
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
  const typeLabels = { pro:"برو", investigator:"محقق منه", developer:"مبرمج", engineer:"مهندس", app:"حساب رسمي", student:"طالب" };
  if(p.verifiedType){
    box.innerHTML = `<div class="locked-note">حسابك موثّق بالفعل (${typeLabels[p.verifiedType]||p.verifiedType})</div>`;
    if(p.verifiedType==="engineer"){
      const projects = p.engineeringProjects||[];
      box.innerHTML += `<div class="field" style="margin-top:10px;"><label>تخصصك الهندسي</label><input id="engineering-field-input" value="${p.engineeringField||''}" placeholder="مثال: هندسة مدنية"></div>
        <button class="btn btn-outline btn-sm" id="btn-save-engineering-field" style="margin-top:8px;">حفظ التخصص</button>
        <div class="page-rule"></div>
        <label style="font-size:13px; color:var(--ink-soft);">مشاريعك الهندسية</label>
        <div id="engineering-projects-list">${projects.map((pr,i)=>`<div class="engineering-project-card"><h4>${pr.title}</h4><p>${pr.desc}</p><span class="mark-best-btn" data-rm-project="${i}">حذف</span></div>`).join("")}</div>
        <div class="field" style="margin-top:10px;"><label>اسم مشروع جديد</label><input id="new-project-title" placeholder="مثال: تصميم جسر معلق"></div>
        <div class="field" style="margin-top:8px;"><label>وصف مختصر</label><input id="new-project-desc" placeholder="وصف مختصر للمشروع"></div>
        <button class="btn btn-outline btn-sm" id="btn-add-project" style="margin-top:8px;">إضافة المشروع</button>`;
      $("btn-save-engineering-field")?.addEventListener("click", async ()=>{
        try{
          const val = $("engineering-field-input").value.trim();
          await updateDoc(doc(db, USERS_COL, currentUser.uid), { engineeringField: val });
          myProfile.engineeringField = val;
          toast("تم حفظ التخصص");
        }catch(e){ toast("تعذر الحفظ"); }
      });
      $("btn-add-project")?.addEventListener("click", async ()=>{
        const title = $("new-project-title").value.trim();
        const desc = $("new-project-desc").value.trim();
        if(!title){ toast("اكتب اسم المشروع"); return; }
        try{
          const updated = [...(myProfile.engineeringProjects||[]), { title, desc }];
          await updateDoc(doc(db, USERS_COL, currentUser.uid), { engineeringProjects: updated });
          myProfile.engineeringProjects = updated;
          toast("تمت إضافة المشروع");
          renderVerifyBox(myProfile);
        }catch(e){ toast("تعذر الحفظ"); }
      });
      document.querySelectorAll("[data-rm-project]").forEach(el=>{
        el.onclick = async ()=>{
          try{
            const updated = (myProfile.engineeringProjects||[]).filter((_,i)=>i!==Number(el.dataset.rmProject));
            await updateDoc(doc(db, USERS_COL, currentUser.uid), { engineeringProjects: updated });
            myProfile.engineeringProjects = updated;
            renderVerifyBox(myProfile);
          }catch(e){ toast("تعذر الحذف"); }
        };
      });
    }
    if(p.verifiedType==="developer"){
      box.innerHTML += `<div class="field" style="margin-top:10px;"><label>مقتطف كود مفضّل يظهر في بروفايلك</label><textarea id="dev-snippet-input" rows="4" placeholder="حط أي كود حابب تعرضه في بروفايلك">${p.pinnedSnippet||''}</textarea></div>
        <button class="btn btn-outline btn-sm" id="btn-save-snippet" style="margin-top:8px;">حفظ المقتطف</button>`;
      $("btn-save-snippet")?.addEventListener("click", async ()=>{
        try{
          const val = $("dev-snippet-input").value;
          await updateDoc(doc(db, USERS_COL, currentUser.uid), { pinnedSnippet: val });
          myProfile.pinnedSnippet = val;
          toast("تم حفظ المقتطف");
        }catch(e){ toast("تعذر الحفظ"); }
      });
    }
    form.classList.add("hidden");
  }else if(p.verificationStatus==="pending"){
    box.innerHTML = `<div class="locked-note">طلب التوثيق قيد المراجعة من الفريق</div>`;
    form.classList.add("hidden");
  }else if(p.planTier!=="pro" && p.planTier!=="plus" && !p.isAdmin && !p.isStudentVerified){
    box.innerHTML = `<p class="feature-lock-note">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
      التقديم على التوثيق متاح لمشتركي Plus وPro
    </p><button class="btn btn-accent btn-sm" style="margin-top:10px;" id="btn-verify-upgrade">الترقية إلى Plus أو Pro</button>`;
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
          <div style="font-weight:700; font-size:14px; display:flex; align-items:center; gap:5px;">${info.name||"مستخدم"} ${badgeHTML(info.verifiedType, info.username)}</div>
          <div class="chat-last" id="chat-last-${c.id}">${c.lastMessageEnc ? "..." : (c.lastMessage||"")}</div>
        </div>
        <div class="post-time meta-font">${timeAgo(c.lastMessageAt)}</div>
      </div>`;
    }).join("");
    wrap.querySelectorAll("[data-open-chat]").forEach(el=> el.onclick = ()=> openChatWithUser(el.dataset.openChat));
    chats.filter(c=>c.lastMessageEnc).forEach(async c=>{
      const plain = await decryptChatText(c.id, c.lastMessageEnc, c.lastMessageIv);
      const el = document.getElementById(`chat-last-${c.id}`);
      if(el) el.textContent = plain.slice(0,50);
    });
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

  const isOfficialSupportAccount = (other.email||"").toLowerCase() === SUPPORT_EMAIL.toLowerCase();
  const iFollow = (myProfile.following||[]).includes(otherUid);
  const chatId = chatIdFor(currentUser.uid, otherUid);
  const chatDoc = await getDoc(doc(db,"chats",chatId));
  const conversationExists = chatDoc.exists();
  // الحساب الرسمي (404team@404error.qd.je) هو اللي يبدأ ويبعت بس؛ محدش يقدر يبعتله أو يرد عليه
  const canSend = isOfficialSupportAccount ? false : (iFollow || other.verifiedType || other.isAdmin || conversationExists);

  $("chat-input-bar").style.display = canSend ? "flex" : "none";
  $("chat-locked-note").classList.toggle("hidden", canSend);
  if(!canSend){
    $("chat-locked-note").innerHTML = isOfficialSupportAccount
      ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> ده حساب رسمي للإشعارات فقط، مش بيستقبل ردود`
      : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> لازم تتابع ${other.fullName} الأول عشان تقدر تبعتله رسالة`;
  }

  if(unsubChatMessages) unsubChatMessages();
  const msgsWrap = $("chat-messages-wrap");
  msgsWrap.innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
  unsubChatMessages = onSnapshot(query(collection(db,"chats",chatId,"messages"), orderBy("createdAt","asc"), limit(200)), (snap)=>{
    if(snap.empty){ msgsWrap.innerHTML = `<div class="empty-state"><p>ابدأ المحادثة</p></div>`; return; }
    msgsWrap.innerHTML = snap.docs.map(d=>{
      const m = d.data();
      const mine = m.senderId===currentUser.uid;
      const imgHTML = m.imageUrl ? `<div class="protected-media"><img src="${m.imageUrl}" oncontextmenu="return false" draggable="false"></div>` : "";
      const storyTagHTML = m.sharedStory ? `<div class="chip" style="margin-bottom:4px;">إعادة مشاركة ستوري</div>` : "";
      return `<div class="msg-bubble ${mine?'msg-mine':'msg-theirs'} ${m.imageUrl?'msg-story-share':''}" id="msg-${d.id}">${storyTagHTML}${imgHTML}<span class="msg-text-slot"></span><div class="msg-time">${timeAgo(m.createdAt)}</div></div>`;
    }).join("");
    msgsWrap.scrollTop = msgsWrap.scrollHeight;
    /* فك تشفير كل رسالة نصية بشكل غير متزامن بعد الرسم */
    snap.docs.forEach(async d=>{
      const m = d.data();
      if(!m.encText) return;
      const plain = await decryptChatText(chatId, m.encText, m.iv);
      const bubble = document.getElementById(`msg-${d.id}`);
      const slot = bubble?.querySelector(".msg-text-slot");
      if(slot) slot.innerHTML = linkify(plain);
    });
  }, (err)=>{ console.error(err); msgsWrap.innerHTML = `<div class="empty-state"><p>تعذر تحميل الرسائل، حاول تاني</p></div>`; });

  $("btn-chat-send").onclick = ()=> sendChatMessage(otherUid, other);

  /* إرسال صور في الشات — متاح لمشتركي Plus وPro والأدمن فقط */
  const canSendImages = canSend && isPlusOrAbove();
  $("btn-chat-attach-image").style.display = canSendImages ? "flex" : "none";
  $("btn-chat-attach-image").onclick = ()=>{
    if(!canSendImages){ toast("إرسال الصور في الشات متاح لمشتركي Plus وPro"); return; }
    $("chat-image-file").click();
  };
  $("chat-image-file").onchange = async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    e.target.value = "";
    const attachBtn = $("btn-chat-attach-image"); attachBtn.innerHTML = '<div class="spinner spinner-dark"></div>';
    try{
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method:"POST", body:fd });
      const data = await res.json();
      if(data.success) await sendChatMessage(otherUid, other, { imageUrl: data.data.url, text:"" });
      else toast("تعذر رفع الصورة");
    }catch(err){ toast("تعذر رفع الصورة"); }
    attachBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>`;
  };
}

async function sendChatMessage(otherUid, otherProfile, opts){
  const input = $("chat-message-input");
  const text = opts?.text ?? input.value.trim();
  const imageUrl = opts?.imageUrl || null;
  const sharedStory = !!opts?.sharedStory;
  if(!text && !imageUrl) return;
  const chatId = chatIdFor(currentUser.uid, otherUid);
  try{
    const previewText = imageUrl ? (sharedStory?"📷 إعادة مشاركة ستوري":"📷 صورة") : text;
    const { encText: lastMessageEnc, iv: lastMessageIv } = await encryptChatText(chatId, previewText);
    await setDoc(doc(db,"chats",chatId), {
      participants:[currentUser.uid, otherUid],
      participantInfo:{
        [currentUser.uid]: { name: myProfile.fullName, pic: myProfile.profilePic||DEFAULT_AVATAR, verifiedType: myProfile.verifiedType||null, username: myProfile.username||null },
        [otherUid]: { name: otherProfile.fullName, pic: otherProfile.profilePic||DEFAULT_AVATAR, verifiedType: otherProfile.verifiedType||null, username: otherProfile.username||null }
      },
      lastMessageEnc, lastMessageIv, lastMessageAt: serverTimestamp()
    }, { merge:true });
    const { encText, iv } = await encryptChatText(chatId, text||"");
    await addDoc(collection(db,"chats",chatId,"messages"), { senderId: currentUser.uid, encText, iv, imageUrl, sharedStory, createdAt: serverTimestamp() });
    if(!opts) input.value = "";
  }catch(e){ console.error(e); toast("تعذر إرسال الرسالة، حاول تاني"); }
}
$("chat-message-input").addEventListener("keydown", (e)=>{ if(e.key==="Enter" && currentChatOtherUid) $("btn-chat-send").click(); });

/* ---------- رسالة ترحيب تلقائية من حساب الإدارة عند كل تسجيل حساب جديد ---------- */
async function sendAdminWelcomeChat(newUserUid, newUserProfile){
  try{
    const adminSnap = await getDocs(query(collection(db, USERS_COL), where("email","==",ADMIN_WELCOME_EMAIL), limit(1)));
    if(!adminSnap.empty){
      const adminUid = adminSnap.docs[0].id; const admin = adminSnap.docs[0].data();
      const chatId = chatIdFor(newUserUid, adminUid);
      const welcomeText = `أهلاً بيك يا ${newUserProfile.fullName} في 404! لو احتجت أي مساعدة إحنا هنا.`;
      const { encText: lastMessageEnc, iv: lastMessageIv } = await encryptChatText(chatId, "أهلاً بيك في 404!");
      await setDoc(doc(db,"chats",chatId), {
        participants:[newUserUid, adminUid],
        participantInfo:{
          [newUserUid]: { name:newUserProfile.fullName, pic:newUserProfile.profilePic||DEFAULT_AVATAR, verifiedType:null, username:newUserProfile.username||null },
          [adminUid]: { name:admin.fullName||"فريق 404", pic:admin.profilePic||DEFAULT_AVATAR, verifiedType:admin.verifiedType||"app", username:admin.username||null }
        },
        lastMessageEnc, lastMessageIv, lastMessageAt: serverTimestamp()
      }, { merge:true });
      const { encText, iv } = await encryptChatText(chatId, welcomeText);
      await addDoc(collection(db,"chats",chatId,"messages"), { senderId: adminUid, encText, iv, createdAt: serverTimestamp() });
    }
    await autoFollowAllAdmins(newUserUid);
  }catch(e){ console.error("تعذر إرسال رسالة الترحيب من الإدارة:", e); }
}
/* أي مستخدم جديد (وأي مستخدم قديم عند الدخول) بيتابع كل حسابات الأدمن تلقائيًا */
async function autoFollowAllAdmins(uid){
  try{
    const adminsSnap = await getDocs(query(collection(db, USERS_COL), where("isAdmin","==",true), limit(50)));
    const adminIds = adminsSnap.docs.map(d=>d.id).filter(id=>id!==uid);
    if(!adminIds.length) return;
    await updateDoc(doc(db, USERS_COL, uid), { following: arrayUnion(...adminIds) });
    await Promise.all(adminIds.map(aid=> updateDoc(doc(db, USERS_COL, aid), { followers: arrayUnion(uid) })));
  }catch(e){ console.error("تعذر إتمام المتابعة التلقائية للأدمنز:", e); }
}

/* ============================================================
   الاستوريز — مدة العرض حسب الباقة:
   مجاني: 24 ساعة ثابتة | Plus: يختار 24 أو 12 ساعة | Pro: مدة مخصّصة بالساعة والدقيقة
   ============================================================ */
function storyTierOptions(){
  const p = myProfile;
  if(p.isAdmin || p.planTier==="pro") return "pro";
  if(p.planTier==="plus" || p.isStudentVerified) return "plus";
  return "free";
}
let pendingStoryImageUrl = null;
let pendingStoryDurationMs = 24*3600*1000;
function openStoryComposerModal(){
  const tier = storyTierOptions();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  pendingStoryImageUrl = null;
  pendingStoryDurationMs = 24*3600*1000;
  let durationHTML = "";
  if(tier==="free"){
    durationHTML = `<p class="subtitle" style="text-align:right; margin:10px 0 0;">الستوري هتختفي تلقائيًا بعد 24 ساعة</p>`;
  }else if(tier==="plus"){
    durationHTML = `<div class="story-duration-opts">
      <div class="chip active" data-dur="86400000">24 ساعة</div>
      <div class="chip" data-dur="43200000">12 ساعة</div>
    </div>`;
  }else{
    durationHTML = `<div class="field" style="display:flex; gap:8px; margin-top:10px;">
      <div style="flex:1;"><label>ساعات</label><input type="number" id="story-dur-hours" min="0" max="72" value="24"></div>
      <div style="flex:1;"><label>دقايق</label><input type="number" id="story-dur-minutes" min="0" max="59" value="0"></div>
    </div>`;
  }
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:right;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 10px;">إضافة ستوري</h3>
    <input type="file" id="story-image-file" accept="image/*" style="display:none;">
    <button class="btn btn-ghost" id="btn-story-pick-image" style="width:100%;">اختيار صورة</button>
    <div id="story-image-preview" style="margin-top:10px;"></div>
    ${durationHTML}
    <button class="btn btn-primary" id="btn-story-publish" style="margin-top:14px;">نشر الستوري</button>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  if(tier==="plus"){
    overlay.querySelectorAll("[data-dur]").forEach(chip=>{
      chip.onclick = ()=>{
        overlay.querySelectorAll("[data-dur]").forEach(c=>c.classList.remove("active"));
        chip.classList.add("active");
        pendingStoryDurationMs = Number(chip.dataset.dur);
      };
    });
  }

  overlay.querySelector("#btn-story-pick-image").onclick = ()=> overlay.querySelector("#story-image-file").click();
  overlay.querySelector("#story-image-file").addEventListener("change", async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const btn = overlay.querySelector("#btn-story-pick-image"); btn.innerHTML = '<div class="spinner spinner-dark"></div>';
    try{
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method:"POST", body:fd });
      const data = await res.json();
      if(data.success){
        pendingStoryImageUrl = data.data.url;
        overlay.querySelector("#story-image-preview").innerHTML = `<div class="protected-media" style="border-radius:14px; overflow:hidden; max-height:260px;"><img src="${pendingStoryImageUrl}" oncontextmenu="return false" draggable="false" style="width:100%; display:block;"></div>`;
      }else{ toast("تعذر رفع الصورة"); }
    }catch(err){ toast("تعذر رفع الصورة"); }
    btn.textContent = "اختيار صورة";
  });

  overlay.querySelector("#btn-story-publish").onclick = async ()=>{
    if(!pendingStoryImageUrl){ toast("اختار صورة الأول"); return; }
    let durationMs = pendingStoryDurationMs;
    if(tier==="pro"){
      const h = Number(overlay.querySelector("#story-dur-hours").value)||0;
      const m = Number(overlay.querySelector("#story-dur-minutes").value)||0;
      durationMs = (h*3600 + m*60) * 1000;
      if(durationMs <= 0){ toast("حدد مدة أكبر من صفر"); return; }
    }
    const btn = overlay.querySelector("#btn-story-publish"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
    try{
      await addDoc(collection(db, STORIES_COL), {
        authorId: currentUser.uid, authorName: myProfile.fullName, authorUsername: myProfile.username,
        authorPic: myProfile.profilePic || DEFAULT_AVATAR, authorVerified: myProfile.verifiedType || null,
        mediaUrl: pendingStoryImageUrl, mediaType:"image",
        createdAt: serverTimestamp(), expiresAt: new Date(Date.now() + durationMs)
      });
      toast("تم نشر الستوري");
      overlay.remove();
      renderStoriesBar();
    }catch(e){ console.error(e); toast("تعذر نشر الستوري، حاول تاني"); btn.textContent="نشر الستوري"; btn.disabled=false; }
  };
}

let __seenStoryAuthors = new Set(JSON.parse(sessionStorage.getItem("seenStoryAuthors")||"[]"));
async function renderStoriesBar(){
  const wrap = $("stories-bar");
  if(!wrap || !myProfile) return;
  try{
    const snap = await getDocs(query(collection(db, STORIES_COL), orderBy("createdAt","desc"), limit(300)));
    const now = Date.now();
    const allowedAuthors = new Set([...(myProfile.following||[]), myProfile.id]);
    const active = snap.docs.map(d=>({id:d.id,...d.data()})).filter(s=>{
      const exp = s.expiresAt?.toMillis ? s.expiresAt.toMillis() : new Date(s.expiresAt).getTime();
      return exp > now && allowedAuthors.has(s.authorId);
    });
    const byAuthor = {};
    active.forEach(s=>{ if(!byAuthor[s.authorId]) byAuthor[s.authorId]=[]; byAuthor[s.authorId].push(s); });
    Object.values(byAuthor).forEach(arr=> arr.sort((a,b)=>{
      const ta=a.createdAt?.toMillis?a.createdAt.toMillis():0, tb=b.createdAt?.toMillis?b.createdAt.toMillis():0; return ta-tb;
    }));

    const myStories = byAuthor[myProfile.id] || [];
    let html = `<div class="story-circle" id="story-my-circle">
      <div class="story-ring ${myStories.length && __seenStoryAuthors.has(myProfile.id) ? 'seen':''}" style="${myStories.length?'':'display:none;'}">
        <img src="${myProfile.profilePic||DEFAULT_AVATAR}">
      </div>
      <div class="story-add-btn" id="story-add-btn" style="${myStories.length?'display:none;':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></div>
      <span>${myStories.length?'ستوريك':'إضافة'}</span>
    </div>`;

    Object.keys(byAuthor).filter(uid=>uid!==myProfile.id).forEach(uid=>{
      const s = byAuthor[uid][0];
      const seen = __seenStoryAuthors.has(uid);
      html += `<div class="story-circle" data-open-story-author="${uid}">
        <div class="story-ring ${seen?'seen':''}"><img src="${s.authorPic||DEFAULT_AVATAR}"></div>
        <span>${(s.authorName||'').split(' ')[0]}</span>
      </div>`;
    });
    wrap.innerHTML = html;

    const myCircle = $("story-my-circle");
    if(myStories.length){
      myCircle.onclick = ()=> openStoryViewer(myProfile.id, myStories);
    }
    const addBtn = $("story-add-btn");
    if(addBtn) addBtn.onclick = (e)=>{ e.stopPropagation(); openStoryComposerModal(); };
    wrap.querySelectorAll("[data-open-story-author]").forEach(el=>{
      el.onclick = ()=> openStoryViewer(el.dataset.openStoryAuthor, byAuthor[el.dataset.openStoryAuthor]);
    });
  }catch(e){ console.error("تعذر تحميل الاستوريز:", e); }
}

let storyViewerState = null;
async function openStoryViewer(authorUid, stories){
  if(!stories || !stories.length) return;
  storyViewerState = { authorUid, stories, index:0, timer:null };
  __seenStoryAuthors.add(authorUid);
  sessionStorage.setItem("seenStoryAuthors", JSON.stringify([...__seenStoryAuthors]));
  show("screen-story-viewer");
  renderStorySlide();
}
function renderStorySlide(){
  const st = storyViewerState; if(!st) return;
  clearTimeout(st.timer);
  const s = st.stories[st.index];
  const isMine = s.authorId === myProfile.id;
  const wrap = $("story-viewer-content");
  wrap.innerHTML = `
    <div class="story-progress-row">
      ${st.stories.map((_,i)=>`<div class="story-progress-track"><div class="story-progress-fill" id="story-fill-${i}" style="width:${i<st.index?'100':'0'}%;"></div></div>`).join("")}
    </div>
    <div class="story-slide-head">
      <img class="avatar avatar-sm" src="${s.authorPic||DEFAULT_AVATAR}">
      <div style="flex:1;"><b>${s.authorName}</b><div class="post-time meta-font" style="color:rgba(255,255,255,.7);">${timeAgo(s.createdAt)}</div></div>
    </div>
    <div class="icon-btn story-close" id="btn-story-close" style="background:rgba(255,255,255,.14); color:#fff;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="16" height="16"><path d="M18 6L6 18M6 6l12 12"/></svg>
    </div>
    ${(isMine && (myProfile.planTier==="pro"||myProfile.isAdmin)) ? `<div class="icon-btn story-save-highlight" id="btn-story-save-highlight" style="background:rgba(255,255,255,.14); color:#fff;" title="حفظ كلحظة دائمة">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
    </div>` : ""}
    <div class="story-slide-media protected-media"><img src="${s.mediaUrl}" oncontextmenu="return false" draggable="false"></div>
    <div class="story-tap-zone" id="story-tap-prev" style="right:0;"></div>
    <div class="story-tap-zone" id="story-tap-next" style="left:0;"></div>
    ${isMine ? `<div class="story-viewers-link" id="story-viewers-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/></svg> عرض المشاهدين
      </div>` : ""}
    <div class="story-bottom-bar">
      ${isMine ? "" : `<input class="story-reply-input" id="story-reply-input" placeholder="اكتب ردًا...">
      <div class="story-quick-btn" id="story-react-btn" title="تفاعل"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg></div>
      <div class="story-quick-btn" id="story-share-btn" title="إعادة مشاركة"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v14"/></svg></div>`}
    </div>`;

  if(!isMine) trackStoryView(s);

  $("btn-story-close").onclick = closeStoryViewer;
  $("btn-story-save-highlight")?.addEventListener("click", async ()=>{
    try{
      await updateDoc(doc(db, USERS_COL, currentUser.uid), { highlights: arrayUnion({ url:s.mediaUrl, savedAt: Date.now() }) });
      toast("اتحفظت كلحظة دائمة على بروفايلك");
    }catch(e){ toast("تعذر الحفظ، حاول تاني"); }
  });
  $("story-tap-prev").onclick = ()=> stepStory(-1);
  $("story-tap-next").onclick = ()=> stepStory(1);
  if(isMine){
    $("story-viewers-link").onclick = ()=> openStoryViewersModal(s);
  }else{
    $("story-react-btn").onclick = ()=> reactToStory(s);
    $("story-share-btn").onclick = ()=> reshareStoryToChat(s);
    $("story-reply-input").addEventListener("keydown", (e)=>{
      if(e.key==="Enter" && e.target.value.trim()) replyToStory(s, e.target.value.trim());
    });
  }

  const fill = $(`story-fill-${st.index}`);
  requestAnimationFrame(()=>{ if(fill) fill.style.transition="width 5.5s linear"; if(fill) fill.style.width="100%"; });
  st.timer = setTimeout(()=> stepStory(1), 5500);
}
function stepStory(dir){
  const st = storyViewerState; if(!st) return;
  clearTimeout(st.timer);
  st.index += dir;
  if(st.index < 0){ closeStoryViewer(); return; }
  if(st.index >= st.stories.length){ closeStoryViewer(); return; }
  renderStorySlide();
}
function closeStoryViewer(){
  if(storyViewerState) clearTimeout(storyViewerState.timer);
  storyViewerState = null;
  document.querySelector('.tab-item[data-target="screen-feed"]').click();
  renderStoriesBar();
}
async function trackStoryView(story){
  try{
    const existing = await getDocs(query(collection(db, STORIES_COL, story.id, "views"), where("viewerId","==",currentUser.uid), limit(1)));
    if(!existing.empty) return;
    await addDoc(collection(db, STORIES_COL, story.id, "views"), {
      viewerId: currentUser.uid, viewerName: myProfile.fullName, viewerUsername: myProfile.username,
      viewerPic: myProfile.profilePic||DEFAULT_AVATAR, viewedAt: serverTimestamp()
    });
  }catch(e){ /* صامت */ }
}
async function reactToStory(story){
  const emojis = ["❤️","😂","😮","😢","👏","🔥"];
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:center;"><div class="modal-sheet-handle"></div>
    <div style="display:flex; justify-content:space-around; font-size:30px;">${emojis.map(em=>`<span data-emoji="${em}" style="cursor:pointer;">${em}</span>`).join("")}</div></div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  overlay.querySelectorAll("[data-emoji]").forEach(el=>{
    el.onclick = async ()=>{
      const emoji = el.dataset.emoji;
      overlay.remove();
      try{
        await addDoc(collection(db, STORIES_COL, story.id, "reactions"), {
          viewerId: currentUser.uid, viewerName: myProfile.fullName, viewerPic: myProfile.profilePic||DEFAULT_AVATAR, emoji, createdAt: serverTimestamp()
        });
        notifyUser(story.authorId, `${myProfile.fullName} تفاعل مع ستوريك بـ ${emoji}`);
        toast("تم إرسال التفاعل");
      }catch(e){ toast("تعذر إرسال التفاعل"); }
    };
  });
}
async function replyToStory(story, text){
  $("story-reply-input").value = "";
  try{
    await sendChatMessage(story.authorId, { fullName:story.authorName, profilePic:story.authorPic, verifiedType:story.authorVerified }, { text:`رد على ستوريك: ${text}` });
    toast("تم إرسال الرد");
  }catch(e){ toast("تعذر إرسال الرد"); }
}
async function reshareStoryToChat(story){
  if(story.authorId===myProfile.id){ toast("مينفعش تعيد مشاركة ستوريك لنفسك"); return; }
  try{
    await sendChatMessage(story.authorId, { fullName:story.authorName, profilePic:story.authorPic, verifiedType:story.authorVerified }, { imageUrl: story.mediaUrl, sharedStory:true, text:"" });
    toast("تم إعادة مشاركة الستوري في الشات");
  }catch(e){ toast("تعذر إعادة المشاركة"); }
}
async function openStoryViewersModal(story){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="max-height:75vh; overflow-y:auto;"><div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 10px;">مشاهدو الستوري</h3><div id="story-viewers-inner"><div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div></div></div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  const canSeeDetails = myProfile.planTier==="pro" || myProfile.isAdmin;
  const canSeeCount = canSeeDetails || myProfile.planTier==="plus";
  const inner = overlay.querySelector("#story-viewers-inner");
  if(!canSeeCount){
    inner.innerHTML = `<p class="feature-lock-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> قائمة المشاهدين متاحة لمشتركي Plus وPro</p>`;
    return;
  }
  const [viewsSnap, reactsSnap] = await Promise.all([
    getDocs(query(collection(db, STORIES_COL, story.id, "views"), limit(200))),
    getDocs(query(collection(db, STORIES_COL, story.id, "reactions"), limit(200)))
  ]);
  const reactMap = {};
  reactsSnap.docs.forEach(d=>{ const r=d.data(); reactMap[r.viewerId]=r.emoji; });
  if(!canSeeDetails){
    inner.innerHTML = `<div class="glass-card section-pad" style="text-align:center;"><div style="font-size:30px; font-weight:800;">${viewsSnap.size}</div><p class="subtitle">مشاهدة إجمالية</p>
      <p class="feature-lock-note" style="justify-content:center; margin-top:10px;">أسماء المشاهدين والرد عليهم متاح لمشتركي Pro</p></div>`;
    return;
  }
  if(viewsSnap.empty){ inner.innerHTML = `<div class="empty-state"><p>محدش شاف ستوريك لسه</p></div>`; return; }
  inner.innerHTML = viewsSnap.docs.map(d=>{
    const v = d.data();
    return `<div class="story-viewer-row" data-msg-viewer="${v.viewerId}" data-name="${v.viewerName}" data-pic="${v.viewerPic}">
      <img class="avatar avatar-sm" src="${v.viewerPic||DEFAULT_AVATAR}"><div style="flex:1;">${v.viewerName}</div>
      ${reactMap[v.viewerId] ? `<span class="reaction-emoji">${reactMap[v.viewerId]}</span>` : ""}
    </div>`;
  }).join("");
  inner.querySelectorAll("[data-msg-viewer]").forEach(row=>{
    row.onclick = ()=>{ overlay.remove(); closeStoryViewer(); openChatWithUser(row.dataset.msgViewer); };
  });
}

/* ============================================================
   توثيق الطلاب — اشتراك مجاني بشارة خاصة مقابل رفع هوية طالب
   ============================================================ */
let pendingStudentIdUrl = null;
/* لوحة أفضل المبرمجين — ترتيب حسب عدد الإجابات المميزة، مربوطة مباشرة بقاعدة البيانات */
/* لوحة التحقق العامة — أي حد يقدر يبحث بيوزر ويشوف حالة توثيقه الحقيقية وسببها ومميزاته */
function openVerificationCenter(){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="max-height:80vh; overflow-y:auto;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 6px;">لوحة التحقق</h3>
    <p class="subtitle" style="margin:0 0 12px;">اكتب اسم المستخدم عشان تتأكد من حالة توثيق أي حساب</p>
    <div class="identity-row" style="display:flex; gap:8px;">
      <input id="vc-username-input" placeholder="username" dir="ltr" style="flex:1; text-align:left; padding:12px 14px; border-radius:14px; border:1px solid var(--line-strong);">
      <button class="btn btn-primary btn-sm" id="vc-search-btn">بحث</button>
    </div>
    <div id="vc-result" style="margin-top:14px;"></div>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  const doSearch = async ()=>{
    const uname = overlay.querySelector("#vc-username-input").value.trim().toLowerCase().replace(/^@/,"");
    const resultEl = overlay.querySelector("#vc-result");
    if(!uname) return;
    resultEl.innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
    try{
      const snap = await getDocs(query(collection(db, USERS_COL), where("username","==",uname), limit(1)));
      if(snap.empty){ resultEl.innerHTML = `<div class="empty-state"><p>مفيش حساب بالاسم ده</p></div>`; return; }
      const u = snap.docs[0].data();
      if(!u.verifiedType){
        resultEl.innerHTML = `<div class="glass-card section-pad" style="text-align:center;">
          <img class="avatar" style="width:50px; height:50px; margin:0 auto 8px;" src="${u.profilePic||DEFAULT_AVATAR}">
          <div style="font-weight:700;">${u.fullName}</div><div class="post-username">@${u.username}</div>
          <p class="feature-lock-note" style="justify-content:center; margin-top:10px;">الحساب ده مش موثّق</p>
        </div>`;
        return;
      }
      const typeLabels = { pro:"برو", investigator:"محقق منه", developer:"مبرمج", engineer:"مهندس", app:"حساب رسمي", student:"طالب", company:"شركة", general:"توثيق عام" };
      const features = u.verifiedType==="developer" ? [...VERIFICATION_FEATURES.developer, ...VERIFICATION_FEATURES.pro] : (VERIFICATION_FEATURES[u.verifiedType]||[]);
      resultEl.innerHTML = `<div class="glass-card section-pad">
        <div style="display:flex; align-items:center; gap:10px;">
          <img class="avatar" style="width:50px; height:50px;" src="${u.profilePic||DEFAULT_AVATAR}">
          <div style="flex:1;"><div style="font-weight:700; display:flex; align-items:center; gap:5px;">${u.fullName} ${badgeHTML(u.verifiedType)}</div><div class="post-username">@${u.username}</div></div>
        </div>
        <p style="font-size:12.5px; color:var(--ink-soft); line-height:1.8; margin-top:10px;">${u.verificationReason || VERIFICATION_REASON_DEFAULTS[u.verifiedType] || ""}</p>
        <p style="font-size:11px; color:var(--muted); margin:10px 0 4px;">نوع التوثيق: ${typeLabels[u.verifiedType]||u.verifiedType}</p>
        <ul class="verify-feature-list">${features.map(f=>`<li><svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>${f}</li>`).join("")}</ul>
      </div>`;
    }catch(e){ console.error(e); resultEl.innerHTML = `<div class="empty-state"><p>تعذر البحث، حاول تاني</p></div>`; }
  };
  overlay.querySelector("#vc-search-btn").onclick = doSearch;
  overlay.querySelector("#vc-username-input").addEventListener("keydown", (e)=>{ if(e.key==="Enter") doSearch(); });
}

/* صفحات الخصوصية والشروط — محتوى ثابت */
const LEGAL_CONTENT = {
  privacy: {
    title: "سياسة الخصوصية",
    html: `
      <h3>البيانات اللي بنجمعها</h3>
      <p>بنجمع بياناتك الأساسية وقت التسجيل (الاسم، البريد، رقم الهاتف)، بالإضافة للمحتوى اللي بتنشره أو ترفعه بنفسك.</p>
      <h3>استخدام البيانات</h3>
      <p>بنستخدم بياناتك عشان نشغّل حسابك، نحسّن تجربتك، ونتواصل معاك بخصوص أي تحديثات أو مشاكل في حسابك.</p>
      <h3>مشاركة البيانات</h3>
      <p>مبنبيعش أو مبنشاركش بياناتك مع أي طرف تالت لأغراض تجارية. بياناتك بتتخزن بشكل آمن على خوادم Firebase.</p>
      <h3>الرسائل والمحادثات</h3>
      <p>نصوص الرسائل بين المستخدمين مشفّرة قبل التخزين، وميقدرش يوصلها إلا الأطراف المشتركة في المحادثة أو فريق الإدارة لأغراض الإشراف والأمان.</p>
      <h3>حقك في حذف بياناتك</h3>
      <p>تقدر تصدّر نسخة من بياناتك أو تحذف حسابك نهائيًا في أي وقت من صفحة الإعدادات.</p>
    `
  },
  terms: {
    title: "الشروط والأحكام",
    html: `
      <h3>استخدام التطبيق</h3>
      <p>باستخدامك لتطبيق 404 إنت موافق على الالتزام بهذه الشروط. لازم تكون بياناتك المسجلة صحيحة ومحدّثة.</p>
      <h3>المحتوى المسموح</h3>
      <p>ممنوع نشر محتوى مسيء، يحض على الكراهية، ينتهك حقوق ملكية فكرية، أو يخالف القانون. الإدارة لها الحق تحذف أي محتوى مخالف أو توقف أي حساب يخالف الشروط.</p>
      <h3>الباقات والدفع</h3>
      <p>الاشتراك في أي باقة مدفوعة (Plus أو Pro) أو توثيق مدفوع بيتجدد حسب المدة المختارة، وأي تجربة مجانية بتتحول لدفع إجباري بعد انتهائها ما لم يتم الإلغاء.</p>
      <h3>التوثيق</h3>
      <p>شارات التوثيق بتتمنح حسب تقدير فريق 404، وممكن تتسحب في أي وقت لو ثبت مخالفة أو معلومات غير صحيحة.</p>
      <h3>تعديل الشروط</h3>
      <p>ممكن نعدّل هذه الشروط من وقت للتاني، واستمرارك في استخدام التطبيق بعد التعديل يعتبر موافقة عليه.</p>
    `
  }
};
function openLegalPage(key){
  const data = LEGAL_CONTENT[key];
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="max-height:82vh; overflow-y:auto; text-align:right;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 12px;">${data.title}</h3>
    <div style="font-size:12.5px; color:var(--ink-soft); line-height:1.85;">${data.html}</div>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
}

async function openDeveloperLeaderboard(){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="max-height:75vh; overflow-y:auto;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 10px;">أفضل المبرمجين</h3>
    <div id="dev-leaderboard-inner"><div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div></div>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  const inner = overlay.querySelector("#dev-leaderboard-inner");
  try{
    const snap = await getDocs(query(collection(db, USERS_COL), where("verifiedType","==","developer"), limit(100)));
    const devs = snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.bestAnswersCount||0)-(a.bestAnswersCount||0)).slice(0,10);
    if(!devs.length){ inner.innerHTML = `<div class="empty-state"><p>لسه مفيش مبرمجين موثّقين</p></div>`; return; }
    inner.innerHTML = devs.map((u,i)=>`
      <div class="leaderboard-row" data-open-dev="${u.username}">
        <span class="rank">${i+1}</span>
        <img class="avatar avatar-sm" src="${u.profilePic||DEFAULT_AVATAR}">
        <div style="flex:1;">${u.fullName} ${badgeHTML(u.verifiedType,u.username)}</div>
        <b>${u.bestAnswersCount||0}</b><span class="post-time meta-font">إجابة مميزة</span>
      </div>`).join("");
    inner.querySelectorAll("[data-open-dev]").forEach(row=>{
      row.onclick = ()=>{ overlay.remove(); openOtherProfile(row.dataset.openDev); };
    });
  }catch(e){ console.error(e); inner.innerHTML = `<div class="empty-state"><p>تعذر تحميل اللوحة</p></div>`; }
}
function openStudentVerifyModal(){
  if(myProfile.studentStatus==="pending"){ toast("طلبك قيد المراجعة، هيوصلك إشعار أول ما يتم الرد"); return; }
  if(myProfile.isStudentVerified){ toast("حسابك موثّق كطالب بالفعل"); return; }
  pendingStudentIdUrl = null;
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:right;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 6px;">توثيق الطلاب — مجانًا بالكامل</h3>
    <p style="font-size:12.5px; color:var(--muted); line-height:1.8; margin:0 0 12px;">ارفع صورة هويتك الجامعية أو المدرسية عشان تفتح شارة الطالب و9 مميزات فخمة من غير أي مقابل.</p>
    <div class="field"><label>اسم الجامعة أو المدرسة</label><input id="student-school-name" placeholder="اكتب اسم الجامعة أو المدرسة"></div>
    <input type="file" id="student-id-file" accept="image/*" style="display:none;">
    <button class="btn btn-ghost" id="btn-student-pick-id" style="width:100%; margin-top:10px;">رفع صورة الهوية الجامعية/المدرسية</button>
    <div id="student-id-preview" style="margin-top:10px;"></div>
    <p class="err-msg" id="student-verify-error" style="color:var(--danger); font-size:12.5px; display:none; margin-top:6px;"></p>
    <button class="btn btn-primary" id="btn-student-submit" style="margin-top:14px;">إرسال طلب التوثيق</button>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  overlay.querySelector("#btn-student-pick-id").onclick = ()=> overlay.querySelector("#student-id-file").click();
  overlay.querySelector("#student-id-file").addEventListener("change", async (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const btn = overlay.querySelector("#btn-student-pick-id"); btn.innerHTML = '<div class="spinner spinner-dark"></div>';
    try{
      const fd = new FormData(); fd.append("image", file);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method:"POST", body:fd });
      const data = await res.json();
      if(data.success){
        pendingStudentIdUrl = data.data.url;
        overlay.querySelector("#student-id-preview").innerHTML = `<div class="protected-media" style="border-radius:14px; overflow:hidden; max-height:220px;"><img src="${pendingStudentIdUrl}" oncontextmenu="return false" draggable="false" style="width:100%; display:block;"></div>`;
      }else{ toast("تعذر رفع الصورة"); }
    }catch(err){ toast("تعذر رفع الصورة"); }
    btn.textContent = "رفع صورة الهوية الجامعية/المدرسية";
  });

  overlay.querySelector("#btn-student-submit").onclick = async ()=>{
    const school = overlay.querySelector("#student-school-name").value.trim();
    const errEl = overlay.querySelector("#student-verify-error"); errEl.style.display="none";
    if(!school){ errEl.textContent="اكتب اسم الجامعة أو المدرسة"; errEl.style.display="block"; return; }
    if(!pendingStudentIdUrl){ errEl.textContent="لازم ترفع صورة الهوية"; errEl.style.display="block"; return; }
    const btn = overlay.querySelector("#btn-student-submit"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
    try{
      await updateDoc(doc(db, USERS_COL, currentUser.uid), {
        studentStatus:"pending", studentIdUrl: pendingStudentIdUrl, studentSchool: school, studentRequestedAt: serverTimestamp()
      });
      myProfile.studentStatus = "pending";
      toast("تم إرسال طلبك، هيوصلك إشعار بعد المراجعة");
      overlay.remove();
    }catch(e){ console.error(e); errEl.textContent="تعذر إرسال الطلب، حاول تاني"; errEl.style.display="block"; btn.disabled=false; btn.textContent="إرسال طلب التوثيق"; }
  };
}

$("btn-open-pages-list").onclick = ()=>{ renderPagesList(); show("screen-pages-list"); };
$("btn-home-pages-list").onclick = ()=>{ renderPagesList(); show("screen-pages-list"); };
$("btn-pages-list-back").onclick = ()=> document.querySelector('.tab-item[data-target="screen-feed"]').click();
function renderPagesList(){
  const items = [
    { icon:`<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>`, label:"الرئيسية", target:"screen-feed", tab:true },
    { icon:`<path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/>`, label:"غرفة البرمجة", target:"screen-code", tab:true },
    { icon:`<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>`, label:"البحث", target:"screen-search", tab:true },
    { icon:`<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>`, label:"الإشعارات", target:"screen-notifs" },
    { icon:`<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>`, label:"حسابي", target:"screen-profile", tab:true },
    { icon:`<path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>`, label:"المحفوظات", target:"screen-bookmarks", action: ()=>renderBookmarks() },
    { icon:`<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>`, label:"إضافة ستوري", action: ()=>openStoryComposerModal() },
    { icon:`<path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/>`, label:"توثيق الطلاب (مجانًا)", action: ()=>openStudentVerifyModal() },
    { icon:`<path d="M8 21l4-13 4 13M9 15h6"/><path d="M12 3v2"/>`, label:"أفضل المبرمجين", action: ()=>openDeveloperLeaderboard() },
    { icon:`<circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/>`, label:"لوحة التحقق", action: ()=>openVerificationCenter() },
    { icon:`<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>`, label:"سياسة الخصوصية", action: ()=>openLegalPage("privacy") },
    { icon:`<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>`, label:"الشروط والأحكام", action: ()=>openLegalPage("terms") },
    { icon:`<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/>`, label:"زوار بروفايلك", target:"screen-visitors", action: ()=>renderVisitorsScreen() },
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
      else if(it.target) show(it.target);
    };
  });
}

/* ============================================================
   الباقات والدفع (PayPal)
   ============================================================ */
const FREE_FEATURES = ["نشر منشورات نصية بلا حدود","إعجاب وتعليق ومشاركة","غرفة البرمجة والدردشات العامة","رابط واحد فقط في البروفايل","ملف شخصي عام أو خاص","نشر ستوري تختفي تلقائيًا بعد 24 ساعة","تصدير نسخة من بياناتك في أي وقت","حذف حسابك نهائيًا من الإعدادات وقتما تحب","إشعارات فورية بأي رد أو تفاعل عبر شات فريق الدعم"];
const CODE_ROOM_FEATURES = ["نسخ أي كود بزر واحد مباشرة للحافظة","بحث فوري داخل كل منشورات الغرفة","تصنيف المنشورات بوسم (سؤال / شرح / مشروع / أدوات / وظائف) وفلترة بيها","تحديد تعليق كـ«أفضل إجابة» على أي سؤال","متابعة سؤال معيّن وأخذ إشعار فوري بأي رد جديد عليه","تثبيت منشور في أعلى الغرفة (لمشتركي Pro والأدمن)","فرز المنشورات حسب الأحدث أو الأكثر تفاعلاً","متابعة وسم كامل وأخذ إشعار بأي منشور جديد بيه","شريط إحصائيات فوري: عدد الأسئلة المفتوحة والمحلولة","شارة «إجابات مميزة» على بروفايلك تتزايد تلقائيًا"];
const PLANS = {
  plus: { name:"باقة Plus", features:["فتح معظم مميزات التطبيق بما فيها التقديم على توثيق عام","رفع صور وفيديوهات وملفات بلا حدود إضافية","دعم فني بأولوية","شارة مميزة على المنشورات","حتى 3 روابط في البروفايل","اختيار مدة الستوري (24 أو 12 ساعة)","معرفة عدد مشاهدات الستوري الإجمالي","إرسال الصور في الشات","متابعة حتى 5 أسئلة في غرفة البرمجة والتنبيه عند الرد عليها","شارة اسمك المميزة تظهر في التعليقات أيضًا","تثبيت تعليق واحد في أعلى تعليقات منشورك","عرض آخر ظهور لك في بروفايلك للمتابعين"],
    tiers:[{label:"أسبوعي", egp:60, usd:1, days:7},{label:"شهري", egp:150, usd:2, days:30},{label:"3 أشهر", egp:450, usd:5, days:90},{label:"سنوي", egp:1800, usd:20, days:365}] },
  pro: { name:"باقة Pro (مبرمجين وتوثيق)", features:["كل مميزات Plus مضافًا إليها","إمكانية التقديم على شارة توثيق برو أو مبرمج أو شركة","إخفاء عدد المتابعين والمتابَعين عن الزوار تلقائيًا","حتى 8 روابط في البروفايل","دخول مبكر لمميزات غرفة البرمجة","دعم فني مباشر من الفريق","تحديد مدة مخصصة للستوري بالساعة والدقيقة","قائمة تفصيلية بمن شاهد الستوري وتفاعل معها مع إمكانية الرد عليهم","إعادة مشاركة الستوري في الشات حتى لو كانت صورة","رفع حتى 10 صور في المنشور الواحد بعرض كاروسيل زي إنستجرام","تثبيت منشوراتك في أعلى غرفة البرمجة","إرسال أكتر من صورة في نفس محادثة الشات","متابعة عدد غير محدود من الأسئلة في غرفة البرمجة","أولوية ظهور منشوراتك في الاقتراحات والبحث","جدولة نشر منشوراتك لوقت لاحق تختاره","حفظ الاستوريز كـ«لحظات» دائمة على بروفايلك","تحميل نسخة أصلية من صور منشوراتك الخاصة","تضمين روابط يوتيوب والفيديوهات تلقائيًا داخل منشوراتك","نقطة «متصل الآن» خضراء حية بجانب صورتك الشخصية"],
    tiers:[{label:"شهري", egp:250, usd:4, days:30},{label:"نصف سنوي", egp:1400, usd:20, days:182},{label:"سنة كاملة", egp:2800, usd:35, days:365}] }
};
const STUDENT_FEATURES = VERIFICATION_FEATURES.student;
function renderPlans(){
  const wrap = $("plans-content");
  const studentCardHTML = myProfile.isStudentVerified
    ? `<div class="glass-card plan-card" style="margin-bottom:16px; border:1.5px solid #0FA968;">
        <h3 style="margin:0; color:#0FA968;">حسابك موثّق كطالب ✓</h3>
        <ul class="plan-list">${STUDENT_FEATURES.map(f=>`<li><svg viewBox="0 0 24 24" style="stroke:#0FA968;"><path d="M20 6L9 17l-5-5"/></svg>${f}</li>`).join("")}</ul>
      </div>`
    : `<div class="glass-card plan-card" style="margin-bottom:16px; border:1.5px solid #0FA968;">
        <h3 style="margin:0; color:#0FA968;">توثيق الطلاب — مجانًا بالكامل</h3>
        <p class="subtitle" style="margin:6px 0 10px;">ارفع هويتك الجامعية أو المدرسية وافتح 9 مميزات فخمة بلا أي مقابل مادي.</p>
        <ul class="plan-list">${STUDENT_FEATURES.map(f=>`<li><svg viewBox="0 0 24 24" style="stroke:#0FA968;"><path d="M20 6L9 17l-5-5"/></svg>${f}</li>`).join("")}</ul>
        <button class="btn" style="background:#0FA968; color:#fff; margin-top:10px;" id="btn-plans-student-verify">${myProfile.studentStatus==="pending"?"طلبك قيد المراجعة":"ابدأ توثيق الطالب"}</button>
      </div>`;
  wrap.innerHTML = studentCardHTML + `
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
  $("btn-plans-student-verify")?.addEventListener("click", openStudentVerifyModal);
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
  let allUsers = [];
  try{
    const snap = await getDocs(query(collection(db, USERS_COL), orderBy("createdAt","desc"), limit(100)));
    allUsers = snap.docs.map(d=>({id:d.id,...d.data()}));
    renderAdminList(allUsers);
  }catch(e){
    console.error(e);
    $("admin-users-list").innerHTML = `<div class="empty-state"><p>تعذر تحميل قائمة المستخدمين، حاول تاني</p></div>`;
  }
  renderAdminStats(allUsers);
  renderStudentRequests();
  renderPaywallRequests();
}
/* إحصائيات حية للأدمن — مربوطة بقاعدة البيانات مباشرة */
function renderAdminStats(users){
  const bar = $("admin-stats-bar"); if(!bar) return;
  const now = Date.now();
  const onlineNow = users.filter(u=>{
    const ms = u.lastActiveAt?.toMillis ? u.lastActiveAt.toMillis() : (u.lastActiveAt ? new Date(u.lastActiveAt).getTime() : 0);
    return ms && (now-ms < 5*60*1000);
  }).length;
  const verifiedCount = users.filter(u=>u.verifiedType).length;
  const studentsCount = users.filter(u=>u.isStudentVerified).length;
  bar.innerHTML = `<div class="admin-stats-grid">
    <div class="admin-stat-card"><b>${users.length}</b><span>آخر 100 مستخدم</span></div>
    <div class="admin-stat-card"><b>${onlineNow}</b><span>متصل الآن</span></div>
    <div class="admin-stat-card"><b>${verifiedCount}</b><span>حساب موثّق</span></div>
    <div class="admin-stat-card"><b>${studentsCount}</b><span>طالب موثّق</span></div>
    <div class="admin-stat-card"><b>${users.filter(u=>u.planTier==='pro').length}</b><span>مشترك Pro</span></div>
    <div class="admin-stat-card"><b>${users.filter(u=>u.planTier==='plus').length}</b><span>مشترك Plus</span></div>
  </div>`;
}
$("btn-admin-broadcast").onclick = ()=>{
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:right;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 10px;">إشعار جماعي لكل المستخدمين</h3>
    <textarea id="broadcast-text" rows="4" placeholder="اكتب نص الإشعار اللي هيوصل لكل المستخدمين..."></textarea>
    <button class="btn btn-primary" id="btn-send-broadcast" style="margin-top:12px;">إرسال للجميع</button>
  </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  overlay.querySelector("#btn-send-broadcast").onclick = async ()=>{
    const text = overlay.querySelector("#broadcast-text").value.trim();
    if(!text) return;
    const btn = overlay.querySelector("#btn-send-broadcast"); btn.innerHTML='<div class="spinner"></div>'; btn.disabled=true;
    try{
      const snap = await getDocs(query(collection(db, USERS_COL), limit(500)));
      snap.docs.forEach(d=>{ if(d.id!==currentUser.uid) notifyUser(d.id, text, true); });
      toast(`تم إرسال الإشعار لـ${snap.size} مستخدم`);
      overlay.remove();
    }catch(e){ console.error(e); toast("تعذر إرسال الإشعار الجماعي"); btn.disabled=false; btn.textContent="إرسال للجميع"; }
  };
};

/* ---------------- تقارير قابلة للطباعة بشعار التطبيق ---------------- */
const REPORT_LOGO = "https://i.ibb.co/WN3DTcGc/logo.jpg";
function openPrintableDocument(title, bodyHTML){
  const win = window.open("", "_blank");
  if(!win){ toast("المتصفح منع فتح نافذة جديدة، اسمح بالنوافذ المنبثقة وحاول تاني"); return; }
  win.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>${title}</title>
    <style>
      body{ font-family:"IBM Plex Sans Arabic",Arial,sans-serif; padding:30px; color:#0B0B0C; }
      .rep-head{ display:flex; align-items:center; gap:12px; border-bottom:2px solid #0B0B0C; padding-bottom:14px; margin-bottom:20px; }
      .rep-head img{ width:44px; height:44px; border-radius:12px; }
      .rep-head h1{ font-size:20px; margin:0; }
      .rep-head span{ font-size:12px; color:#86868B; }
      table{ width:100%; border-collapse:collapse; margin-top:10px; font-size:13px; }
      th,td{ border:1px solid #ddd; padding:8px 10px; text-align:right; }
      th{ background:#f5f5f7; }
      h2{ font-size:15px; margin-top:22px; }
      @media print{ button{ display:none; } }
    </style></head><body>
    <div class="rep-head"><img src="${REPORT_LOGO}"><div><h1>404</h1><span>تقرير رسمي — ${new Date().toLocaleDateString("ar-EG")}</span></div></div>
    ${bodyHTML}
    <button onclick="window.print()" style="margin-top:20px; padding:10px 22px; border-radius:10px; background:#0B0B0C; color:#fff; border:none; cursor:pointer;">طباعة / حفظ PDF</button>
    </body></html>`);
  win.document.close();
}
$("btn-admin-print-report").onclick = async ()=>{
  toast("جاري تجهيز التقرير...");
  try{
    const snap = await getDocs(query(collection(db, USERS_COL), limit(1000)));
    const users = snap.docs.map(d=>d.data());
    const byPlan = { free:0, plus:0, pro:0 };
    users.forEach(u=> byPlan[u.planTier||"free"] = (byPlan[u.planTier||"free"]||0)+1);
    const byVerify = {};
    users.forEach(u=>{ if(u.verifiedType) byVerify[u.verifiedType] = (byVerify[u.verifiedType]||0)+1; });
    const postsSnap = await getDocs(query(collection(db, POSTS_COL), limit(2000)));
    const body = `
      <h2>ملخص عام</h2>
      <table><tr><th>البند</th><th>العدد</th></tr>
        <tr><td>إجمالي المستخدمين</td><td>${users.length}</td></tr>
        <tr><td>إجمالي المنشورات</td><td>${postsSnap.size}</td></tr>
        <tr><td>مشتركي Plus</td><td>${byPlan.plus||0}</td></tr>
        <tr><td>مشتركي Pro</td><td>${byPlan.pro||0}</td></tr>
        <tr><td>حسابات مجانية</td><td>${byPlan.free||0}</td></tr>
      </table>
      <h2>التوثيق حسب النوع</h2>
      <table><tr><th>النوع</th><th>العدد</th></tr>
        ${Object.entries(byVerify).map(([k,v])=>`<tr><td>${k}</td><td>${v}</td></tr>`).join("") || `<tr><td colspan="2">لا يوجد</td></tr>`}
      </table>`;
    openPrintableDocument("تقرير عام — 404", body);
  }catch(e){ console.error(e); toast("تعذر تجهيز التقرير"); }
};
function printUserReport(u){
  const body = `
    <h2>بيانات المستخدم</h2>
    <table>
      <tr><td>الاسم الكامل</td><td>${u.fullName||""}</td></tr>
      <tr><td>اسم المستخدم</td><td>@${u.username||""}</td></tr>
      <tr><td>البريد الإلكتروني</td><td>${u.email||""}</td></tr>
      <tr><td>رقم الهاتف</td><td>${u.phone||""}</td></tr>
      <tr><td>الباقة</td><td>${u.planTier||"مجاني"}</td></tr>
      <tr><td>نوع التوثيق</td><td>${u.verifiedType||"بدون توثيق"}</td></tr>
      <tr><td>عدد المتابعين</td><td>${(u.followers||[]).length}</td></tr>
      <tr><td>عدد المتابَعين</td><td>${(u.following||[]).length}</td></tr>
      <tr><td>عدد الإجابات المميزة</td><td>${u.bestAnswersCount||0}</td></tr>
      <tr><td>حالة الحساب</td><td>${u.banned?"محظور":"نشط"}</td></tr>
    </table>`;
  openPrintableDocument(`تقرير المستخدم — @${u.username}`, body);
}

/* ---------------- مراقبة المحادثات (للأدمن فقط) — عرض وفك تشفير أي محادثة لأغراض الإشراف ---------------- */
$("btn-admin-chats-monitor").onclick = async ()=>{
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="max-height:80vh; overflow-y:auto;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 10px;">مراقبة المحادثات</h3>
    <div id="admin-chats-inner"><div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  const inner = overlay.querySelector("#admin-chats-inner");
  try{
    const snap = await getDocs(query(collection(db,"chats"), limit(100)));
    if(snap.empty){ inner.innerHTML = `<div class="empty-state"><p>مفيش محادثات لسه</p></div>`; return; }
    const chats = snap.docs.map(d=>({id:d.id,...d.data()}));
    inner.innerHTML = chats.map(c=>{
      const names = c.participants.map(uid=> c.participantInfo?.[uid]?.name || "مستخدم").join(" ↔ ");
      return `<div class="leaderboard-row" data-open-monitor-chat="${c.id}"><div style="flex:1;">${names}</div><span class="post-time meta-font">${timeAgo(c.lastMessageAt)}</span></div>`;
    }).join("");
    inner.querySelectorAll("[data-open-monitor-chat]").forEach(row=>{
      row.onclick = async ()=>{
        const chatId = row.dataset.openMonitorChat;
        inner.innerHTML = `<div class="empty-state"><div class="spinner spinner-dark" style="margin:0 auto;"></div></div>`;
        const msnap = await getDocs(query(collection(db,"chats",chatId,"messages"), orderBy("createdAt","asc"), limit(300)));
        const rows = await Promise.all(msnap.docs.map(async d=>{
          const m = d.data();
          const plain = m.encText ? await decryptChatText(chatId, m.encText, m.iv) : (m.imageUrl ? "[صورة]" : "");
          return `<div class="likers-row"><b>${m.senderId.slice(0,6)}</b>: ${plain}</div>`;
        }));
        inner.innerHTML = `<button class="btn btn-outline btn-sm" id="btn-back-chats-list" style="margin-bottom:10px;">رجوع للقائمة</button>` + (rows.join("") || `<div class="empty-state"><p>مفيش رسائل</p></div>`);
        inner.querySelector("#btn-back-chats-list").onclick = ()=> $("btn-admin-chats-monitor").click();
      };
    });
  }catch(e){ console.error(e); inner.innerHTML = `<div class="empty-state"><p>تعذر تحميل المحادثات</p></div>`; }
};
async function renderPaywallRequests(){
  const wrap = $("admin-paywall-requests");
  try{
    const snap = await getDocs(query(collection(db, USERS_COL), where("paywallContactRequested","==",true), limit(50)));
    if(snap.empty){ wrap.innerHTML=""; return; }
    wrap.innerHTML = `<h3 style="margin:0 0 8px;">طلبات رفع قفل الدفع (${snap.size})</h3>` + snap.docs.map(d=>{
      const u = d.data();
      return `<div class="glass-card section-pad" style="margin-bottom:10px; display:flex; align-items:center; gap:10px;">
        <img class="avatar avatar-sm" src="${u.profilePic||DEFAULT_AVATAR}">
        <div style="flex:1;"><div style="font-weight:700;">${u.fullName}</div><div class="post-username">@${u.username} — توثيق ${u.trialPlan==='company'?'شركات':'عام'}</div></div>
        <button class="btn btn-primary btn-sm" data-lift-paywall="${d.id}">رفع القفل</button>
      </div>`;
    }).join("") + `<div class="page-rule"></div>`;
    wrap.querySelectorAll("[data-lift-paywall]").forEach(btn=>{
      btn.onclick = async ()=>{
        const uid = btn.dataset.liftPaywall;
        try{
          await updateDoc(doc(db, USERS_COL, uid), { paywallLocked:false, paywallContactRequested:false });
          notifyUser(uid, "تم رفع قفل الدفع بعد مراجعة الفريق لطلبك — تقدر تكمل استخدام التطبيق عادي");
          toast("تم رفع القفل");
          renderPaywallRequests();
        }catch(e){ toast("تعذر تنفيذ العملية"); }
      };
    });
  }catch(e){ console.error(e); }
}
async function renderStudentRequests(){
  const wrap = $("admin-student-requests");
  try{
    const snap = await getDocs(query(collection(db, USERS_COL), where("studentStatus","==","pending"), limit(50)));
    if(snap.empty){ wrap.innerHTML=""; return; }
    wrap.innerHTML = `<h3 style="margin:0 0 8px;">طلبات توثيق الطلاب (${snap.size})</h3>` + snap.docs.map(d=>{
      const u = d.data();
      return `<div class="glass-card section-pad" style="margin-bottom:10px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <img class="avatar avatar-sm" src="${u.profilePic||DEFAULT_AVATAR}">
          <div style="flex:1;"><div style="font-weight:700;">${u.fullName}</div><div class="post-username">@${u.username} — ${u.studentSchool||''}</div></div>
        </div>
        <div class="protected-media" style="margin-top:10px; border-radius:12px; overflow:hidden; max-height:200px;"><img src="${u.studentIdUrl}" oncontextmenu="return false" draggable="false" style="width:100%; display:block;"></div>
        <div style="display:flex; gap:8px; margin-top:10px;">
          <button class="btn btn-primary btn-sm" data-approve-student="${d.id}" data-school="${(u.studentSchool||'').replace(/"/g,'&quot;')}" style="flex:1;">قبول</button>
          <button class="btn btn-outline btn-sm" data-reject-student="${d.id}" style="flex:1; color:var(--danger);">رفض</button>
        </div>
      </div>`;
    }).join("") + `<div class="page-rule"></div>`;
    wrap.querySelectorAll("[data-approve-student]").forEach(btn=>{
      btn.onclick = async ()=>{
        const uid = btn.dataset.approveStudent;
        try{
          await updateDoc(doc(db, USERS_COL, uid), { isStudentVerified:true, verifiedType:"student", studentStatus:"approved", studentVerifiedAt: serverTimestamp(), studentAutoProGranted:false, verificationReason: `طالب موثّق في ${btn.dataset.school||'جهة تعليمية'}` });
          notifyUser(uid, "تهانينا! اتقبل طلب توثيقك كطالب — استمتع بـ9 مميزات فخمة مجانًا");
          toast("تم قبول الطالب");
          renderStudentRequests();
        }catch(e){ toast("تعذر تنفيذ العملية"); }
      };
    });
    wrap.querySelectorAll("[data-reject-student]").forEach(btn=>{
      btn.onclick = async ()=>{
        const uid = btn.dataset.rejectStudent;
        try{
          await updateDoc(doc(db, USERS_COL, uid), { studentStatus:"rejected" });
          notifyUser(uid, "للأسف طلب توثيق الطالب اتّرفض، تأكد إن صورة الهوية واضحة وحاول تاني");
          toast("تم رفض الطلب");
          renderStudentRequests();
        }catch(e){ toast("تعذر تنفيذ العملية"); }
      };
    });
  }catch(e){ console.error(e); }
}
function renderAdminList(users){
  $("admin-users-list").innerHTML = users.map(u=>`
    <div class="glass-card section-pad" style="margin-bottom:10px;">
      <div style="display:flex; align-items:center; gap:10px;">
        <img class="avatar avatar-sm" src="${u.profilePic||DEFAULT_AVATAR}">
        <div style="flex:1;"><div style="font-weight:700; display:flex; align-items:center; gap:5px;">${u.fullName} ${badgeHTML(u.verifiedType, u.username)}</div><div class="post-username">@${u.username}</div></div>
        ${u.banned?'<span class="chip" style="color:var(--danger);">محظور</span>':''}
      </div>
      <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:12px;">
        <button class="btn btn-sm ${u.banned?'btn-outline':'btn-danger'}" data-ban="${u.id}" data-state="${u.banned}">${u.banned?'إلغاء الحظر':'حظر'}</button>
        <button class="btn btn-sm btn-outline" data-pro="${u.id}" data-state="${u.planTier||'free'}">${u.planTier==='pro'?'إرجاع لمجاني':(u.planTier==='plus'?'ترقية لـPro':'تفعيل Plus')}</button>
        <button class="btn btn-sm btn-outline" data-admin="${u.id}" data-state="${u.isAdmin}">${u.isAdmin?'إزالة أدمن':'تعيين أدمن'}</button>
        <button class="btn btn-sm btn-outline" data-edit-user="${u.id}">تعديل بيانات المستخدم</button>
        <button class="btn btn-sm btn-outline" data-print-user="${u.id}">طباعة تقرير المستخدم</button>
        <select class="btn btn-sm btn-outline" data-verify="${u.id}" style="appearance:auto;">
          <option value="">بدون توثيق</option>
          <option value="pro" ${u.verifiedType==='pro'?'selected':''}>توثيق برو</option>
          <option value="investigator" ${u.verifiedType==='investigator'?'selected':''}>محقق منه</option>
          <option value="developer" ${u.verifiedType==='developer'?'selected':''}>مبرمجين</option>
          <option value="engineer" ${u.verifiedType==='engineer'?'selected':''}>مهندسين</option>
          <option value="company" ${u.verifiedType==='company'?'selected':''}>شركات</option>
          <option value="general" ${u.verifiedType==='general'?'selected':''}>توثيق عام (Plus)</option>
          <option value="app" ${u.verifiedType==='app'?'selected':''}>حساب التطبيق</option>
        </select>
        <button class="btn btn-sm btn-outline" data-edit-reason="${u.id}" data-reason="${(u.verificationReason||'').replace(/"/g,'&quot;')}">سبب التوثيق</button>
      </div>
    </div>`).join("");

  $("admin-users-list").querySelectorAll("[data-edit-reason]").forEach(b=> b.onclick = ()=>{
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `<div class="modal-sheet" style="text-align:right;">
      <div class="modal-sheet-handle"></div>
      <h3 style="margin:0 0 10px;">سبب التوثيق</h3>
      <textarea id="admin-reason-input" rows="3" placeholder="اكتب سبب التوثيق اللي هيظهر للمستخدمين">${b.dataset.reason}</textarea>
      <button class="btn btn-primary" id="btn-save-reason" style="margin-top:12px;">حفظ</button>
    </div>`;
    document.body.appendChild(overlay);
    overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
    overlay.querySelector("#btn-save-reason").onclick = async ()=>{
      try{
        await updateDoc(doc(db,USERS_COL,b.dataset.editReason), { verificationReason: overlay.querySelector("#admin-reason-input").value.trim() });
        toast("تم حفظ سبب التوثيق");
        overlay.remove();
        renderAdmin();
      }catch(e){ toast("تعذر الحفظ"); }
    };
  });

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
    try{
      const isTrialType = sel.value==="company" || sel.value==="general";
      const update = { verifiedType: sel.value || null };
      if(isTrialType){
        Object.assign(update, { trialActive:true, trialUsed:true, trialPlan: sel.value, trialStartedAt: serverTimestamp(), paywallLocked:false });
      }
      await updateDoc(doc(db,USERS_COL,sel.dataset.verify), update);
      if(isTrialType) notifyUser(sel.dataset.verify, `تم تفعيل توثيق «${sel.value==='company'?'الشركات':'العام'}» لحسابك — عندك تجربة مجانية 3 أيام، وبعدها هيلزم الدفع للاستمرار`);
    }
    catch(e){ console.error(e); toast("تعذر تنفيذ العملية، حاول تاني"); }
  });
  $("admin-users-list").querySelectorAll("[data-edit-user]").forEach(b=> b.onclick = ()=>{
    const u = users.find(x=>x.id===b.dataset.editUser);
    if(u) openAdminEditUserModal(u);
  });
  $("admin-users-list").querySelectorAll("[data-print-user]").forEach(b=> b.onclick = ()=>{
    const u = users.find(x=>x.id===b.dataset.printUser);
    if(u) printUserReport(u);
  });
}
/* لوحة الأدمن: تعديل بيانات أي مستخدم (اسم المستخدم، الاسم الكامل، البايو) مباشرة على قاعدة البيانات */
function openAdminEditUserModal(u){
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal-sheet" style="text-align:right;">
    <div class="modal-sheet-handle"></div>
    <h3 style="margin:0 0 12px;">تعديل بيانات @${u.username}</h3>
    <div class="field"><label>اسم المستخدم</label><input id="admin-edit-username" value="${u.username||''}"></div>
    <div class="field" style="margin-top:10px;"><label>الاسم الكامل</label><input id="admin-edit-fullname" value="${u.fullName||''}"></div>
    <div class="field" style="margin-top:10px;"><label>البايو</label><textarea id="admin-edit-bio" rows="3">${u.bio||''}</textarea></div>
    <p class="err-msg" id="admin-edit-error" style="color:var(--danger); font-size:12.5px; display:none; margin-top:6px;"></p>
    <button class="btn btn-primary" id="btn-admin-edit-save" style="margin-top:14px;">حفظ التعديلات</button>
  </div>`;
  overlay.onclick = (e)=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);
  overlay.querySelector("#btn-admin-edit-save").onclick = async ()=>{
    const newUsername = overlay.querySelector("#admin-edit-username").value.trim().toLowerCase().replace(/[^a-z0-9_.]/g,"");
    const newFullName = overlay.querySelector("#admin-edit-fullname").value.trim();
    const newBio = overlay.querySelector("#admin-edit-bio").value.trim();
    const errEl = overlay.querySelector("#admin-edit-error"); errEl.style.display="none";
    if(!newUsername || !newFullName){ errEl.textContent="اسم المستخدم والاسم الكامل مطلوبين"; errEl.style.display="block"; return; }
    const btn = overlay.querySelector("#btn-admin-edit-save"); btn.disabled=true; btn.textContent="جاري الحفظ...";
    try{
      if(newUsername !== u.username){
        const dup = await getDocs(query(collection(db,USERS_COL), where("username","==",newUsername), limit(1)));
        if(!dup.empty){ errEl.textContent="اسم المستخدم ده مستخدم بالفعل"; errEl.style.display="block"; btn.disabled=false; btn.textContent="حفظ التعديلات"; return; }
      }
      await updateDoc(doc(db,USERS_COL,u.id), { username:newUsername, fullName:newFullName, bio:newBio });
      toast("تم تعديل بيانات المستخدم");
      overlay.remove();
      renderAdmin();
    }catch(e){ console.error(e); errEl.textContent="تعذر الحفظ، حاول تاني"; errEl.style.display="block"; btn.disabled=false; btn.textContent="حفظ التعديلات"; }
  };
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

/* ---------------- منع الخروج من التطبيق بزر الرجوع في الموبايل ---------------- */
(function trapExitButton(){
  history.pushState({app404:true}, "", location.href);
  window.addEventListener("popstate", ()=>{
    // بدل ما يسيب التطبيق أو يرجع لصفحة قبله، نرجّع نفس الحالة تاني فورًا فيبقى الزرار من غير أي أثر
    history.pushState({app404:true}, "", location.href);
  });
})();

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
