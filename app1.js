// app1.js — Firebase init + core functions (Part 1/2)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged,
  sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc, deleteDoc,
  collection, query, where, orderBy, limit, onSnapshot, getDocs,
  serverTimestamp, increment, arrayUnion, arrayRemove, Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCTGnFOK7m_xNod8mwBPB5HTgTP2BrNm6o",
  authDomain: "cyberintel-d0d4f.firebaseapp.com",
  projectId: "cyberintel-d0d4f",
  storageBucket: "cyberintel-d0d4f.appspot.com",
  messagingSenderId: "533279564815",
  appId: "1:533279564815:web:d373567c2be86311127af7a"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ client_id: "355037443320-g3s1413hs3krs1gpj4r1b9ifnigendqr.apps.googleusercontent.com" });

const IMGBB_KEY = "36b0e2658ed6fad2ca48081442f1539b";
const SITE_URL = "https://404error.qd.je";
const SITE_NAME = "404";
const SUPPORT_EMAIL = "soudadteam@gmail.com";
const ADMIN_EMAILS = ["khwailedapp@gmail.com", "khaledahmedelbrbary80@gmail.com"];
const APP_EMAIL = "khwailedapp@gmail.com";
const LOGO_URL = "https://ibb.co/WN3DTcGc";
const ICON_URL = "https://ibb.co/rKD2MxX7";
const DEFAULT_AVATAR = "https://files.cdn-files-a.com/uploads/9487240/2000_699b80b0c7cc4.jpg";

// ── Global State ──
let currentUser = null;
let currentUserData = null;
let currentPage = "home";
let regStep = 1;
let regData = {};
let pinBuffer = "";
let confirmPin = "";
let pinMode = "enter"; // enter | set | confirm
let notifUnsubscribe = null;
let feedUnsubscribe = null;
let chatUnsubscribe = null;
let currentChatUser = null;
let notifSound = null;
let postsPage = 1;
let selectedMediaFile = null;
let selectedMediaType = null;

// ── Countries list ──
const COUNTRIES = [
  { name: "مصر", code: "+20", iso: "EG" },
  { name: "السعودية", code: "+966", iso: "SA" },
  { name: "الإمارات", code: "+971", iso: "AE" },
  { name: "الكويت", code: "+965", iso: "KW" },
  { name: "قطر", code: "+974", iso: "QA" },
  { name: "البحرين", code: "+973", iso: "BH" },
  { name: "عُمان", code: "+968", iso: "OM" },
  { name: "الأردن", code: "+962", iso: "JO" },
  { name: "لبنان", code: "+961", iso: "LB" },
  { name: "سوريا", code: "+963", iso: "SY" },
  { name: "العراق", code: "+964", iso: "IQ" },
  { name: "اليمن", code: "+967", iso: "YE" },
  { name: "ليبيا", code: "+218", iso: "LY" },
  { name: "تونس", code: "+216", iso: "TN" },
  { name: "الجزائر", code: "+213", iso: "DZ" },
  { name: "المغرب", code: "+212", iso: "MA" },
  { name: "السودان", code: "+249", iso: "SD" },
  { name: "الصومال", code: "+252", iso: "SO" },
  { name: "موريتانيا", code: "+222", iso: "MR" },
  { name: "فلسطين", code: "+970", iso: "PS" },
  { name: "جيبوتي", code: "+253", iso: "DJ" },
  { name: "جزر القمر", code: "+269", iso: "KM" },
  { name: "تركيا", code: "+90", iso: "TR" },
  { name: "إيران", code: "+98", iso: "IR" },
  { name: "باكستان", code: "+92", iso: "PK" },
  { name: "الهند", code: "+91", iso: "IN" },
  { name: "بنغلاديش", code: "+880", iso: "BD" },
  { name: "إندونيسيا", code: "+62", iso: "ID" },
  { name: "ماليزيا", code: "+60", iso: "MY" },
  { name: "نيجيريا", code: "+234", iso: "NG" },
  { name: "السنغال", code: "+221", iso: "SN" },
  { name: "غانا", code: "+233", iso: "GH" },
  { name: "المملكة المتحدة", code: "+44", iso: "GB" },
  { name: "الولايات المتحدة", code: "+1", iso: "US" },
  { name: "كندا", code: "+1", iso: "CA" },
  { name: "أستراليا", code: "+61", iso: "AU" },
  { name: "ألمانيا", code: "+49", iso: "DE" },
  { name: "فرنسا", code: "+33", iso: "FR" },
  { name: "إيطاليا", code: "+39", iso: "IT" },
  { name: "إسبانيا", code: "+34", iso: "ES" },
  { name: "هولندا", code: "+31", iso: "NL" },
  { name: "بلجيكا", code: "+32", iso: "BE" },
  { name: "السويد", code: "+46", iso: "SE" },
  { name: "النرويج", code: "+47", iso: "NO" },
  { name: "الدنمارك", code: "+45", iso: "DK" },
  { name: "فنلندا", code: "+358", iso: "FI" },
  { name: "سويسرا", code: "+41", iso: "CH" },
  { name: "النمسا", code: "+43", iso: "AT" },
  { name: "البرتغال", code: "+351", iso: "PT" },
  { name: "بولندا", code: "+48", iso: "PL" },
  { name: "روسيا", code: "+7", iso: "RU" },
  { name: "اليابان", code: "+81", iso: "JP" },
  { name: "الصين", code: "+86", iso: "CN" },
  { name: "كوريا الجنوبية", code: "+82", iso: "KR" },
  { name: "البرازيل", code: "+55", iso: "BR" },
  { name: "الأرجنتين", code: "+54", iso: "AR" },
  { name: "المكسيك", code: "+52", iso: "MX" },
  { name: "جنوب أفريقيا", code: "+27", iso: "ZA" },
  { name: "إثيوبيا", code: "+251", iso: "ET" },
  { name: "كينيا", code: "+254", iso: "KE" }
];

// ─────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function $q(sel, ctx = document) { return ctx.querySelector(sel); }
function $qa(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function timeAgo(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}ي`;
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
}

function showToast(msg, type = "info", dur = 3000) {
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>`
  };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icons[type]}<span>${msg}</span>`;
  const container = $("toast-container");
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("removing");
    setTimeout(() => toast.remove(), 300);
  }, dur);
}

function playNotifSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(); osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

function sanitizeText(t) {
  return String(t).replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function linkify(text) {
  const urlReg = /(https?:\/\/[^\s]+)/g;
  return sanitizeText(text).replace(urlReg, url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`);
}

function generateUniqueLink(uid) {
  return `${SITE_URL}/u/${uid}`;
}

async function uploadToImgBB(file) {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: form });
  const json = await res.json();
  if (json.success) return json.data.url;
  throw new Error("فشل رفع الصورة");
}

function verifyBadge(userData) {
  if (!userData) return "";
  if (userData.verificationType === "app") return `<span class="verify-icon verify-app" title="${userData.verifyNote || 'حساب التطبيق'}">✦</span>`;
  if (userData.verificationType === "dev") return `<span class="verify-icon verify-dev" title="${userData.verifyNote || 'مبرمج'}">⟨/⟩</span>`;
  if (userData.verificationType === "verified") return `<span class="verify-icon verify-verified" title="${userData.verifyNote || 'موثق'}">✓</span>`;
  if (userData.verificationType === "pro") return `<span class="verify-icon verify-pro" title="${userData.verifyNote || 'Pro'}">★</span>`;
  return "";
}

function planBadge(userData) {
  if (!userData) return "";
  if (userData.role === "admin") return `<span class="badge badge-app">أدمن</span>`;
  if (userData.isPro) return `<span class="badge badge-pro">Pro</span>`;
  if (userData.isPlus) return `<span class="badge badge-plus">Plus</span>`;
  return "";
}

// ─────────────────────────────────────────────
//  LOADING SCREEN
// ─────────────────────────────────────────────
function hideLoading() {
  setTimeout(() => { $("loading-screen").classList.add("hidden"); }, 1000);
}

// ─────────────────────────────────────────────
//  PIN SYSTEM
// ─────────────────────────────────────────────
function showPinScreen(mode = "enter") {
  pinMode = mode;
  pinBuffer = "";
  $("pin-screen").classList.remove("hidden");
  renderPinDots();
  const subtitle = $("pin-subtitle");
  if (mode === "set") subtitle.textContent = "اختر رمز PIN من 6 أرقام";
  else if (mode === "confirm") subtitle.textContent = "أكد رمز PIN";
  else subtitle.textContent = "أدخل رمز PIN للمتابعة";
}

function hidePinScreen() { $("pin-screen").classList.add("hidden"); }

function renderPinDots() {
  $qa(".pin-dot").forEach((d, i) => {
    d.classList.toggle("filled", i < pinBuffer.length);
    d.classList.remove("error");
  });
}

function pinPress(val) {
  if (val === "del") { pinBuffer = pinBuffer.slice(0, -1); renderPinDots(); return; }
  if (pinBuffer.length >= 6) return;
  pinBuffer += val;
  renderPinDots();
  if (pinBuffer.length === 6) setTimeout(handlePinComplete, 150);
}

async function handlePinComplete() {
  const stored = localStorage.getItem("userPin");
  if (pinMode === "enter") {
    if (pinBuffer === stored) {
      hidePinScreen(); showApp();
    } else {
      $qa(".pin-dot").forEach(d => d.classList.add("error"));
      $("pin-dots-wrap").classList.add("pin-shake");
      setTimeout(() => { $("pin-dots-wrap").classList.remove("pin-shake"); pinBuffer = ""; renderPinDots(); }, 600);
      showToast("رمز PIN غير صحيح", "error");
    }
  } else if (pinMode === "set") {
    confirmPin = pinBuffer;
    pinBuffer = "";
    renderPinDots();
    showPinScreen("confirm");
  } else if (pinMode === "confirm") {
    if (pinBuffer === confirmPin) {
      localStorage.setItem("userPin", pinBuffer);
      await updateDoc(doc(db, "users", currentUser.uid), { pinHash: pinBuffer });
      hidePinScreen(); showApp();
      showToast("تم ضبط رمز PIN بنجاح ✓", "success");
    } else {
      $qa(".pin-dot").forEach(d => d.classList.add("error"));
      showToast("الرمزان غير متطابقان", "error");
      pinBuffer = ""; renderPinDots();
    }
  }
}

// ─────────────────────────────────────────────
//  AUTH STATE
// ─────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  hideLoading();
  if (!user) { showAuthSection(); return; }
  currentUser = user;
  const snap = await getDoc(doc(db, "users", user.uid));
  if (!snap.exists()) { showAuthSection(); return; }
  currentUserData = snap.data();

  if (currentUserData.banned) { showBannedScreen(); return; }

  const storedPin = localStorage.getItem("userPin");
  if (storedPin) showPinScreen("enter");
  else showApp();
});

// ─────────────────────────────────────────────
//  SHOW/HIDE SECTIONS
// ─────────────────────────────────────────────
function showAuthSection() {
  $("auth-section").classList.remove("hidden");
  $("app").classList.add("hidden");
  $("pin-screen").classList.add("hidden");
  $("banned-screen").classList.add("hidden");
  showLoginForm();
}

function showApp() {
  $("auth-section").classList.add("hidden");
  $("app").classList.remove("hidden");
  loadCurrentUserData();
  navigateTo("home");
  subscribeNotifications();
  buildBottomNav();
}

function showBannedScreen() {
  $("banned-screen").classList.remove("hidden");
  $("auth-section").classList.add("hidden");
  $("app").classList.add("hidden");
}

// ─────────────────────────────────────────────
//  LOAD USER DATA
// ─────────────────────────────────────────────
async function loadCurrentUserData() {
  if (!currentUser) return;
  const snap = await getDoc(doc(db, "users", currentUser.uid));
  if (snap.exists()) {
    currentUserData = snap.data();
    updateHeaderAvatar();
  }
}

function updateHeaderAvatar() {
  const avatars = $qa(".current-user-avatar");
  avatars.forEach(a => { a.src = currentUserData?.photoURL || DEFAULT_AVATAR; });
}

// ─────────────────────────────────────────────
//  REGISTRATION FLOW
// ─────────────────────────────────────────────
function showLoginForm() {
  $("register-form").style.display = "none";
  $("login-form").style.display = "block";
  $("forgot-form").style.display = "none";
}
function showRegisterForm() {
  $("login-form").style.display = "none";
  $("register-form").style.display = "block";
  regStep = 1;
  renderRegStep();
}
function showForgotForm() {
  $("login-form").style.display = "none";
  $("forgot-form").style.display = "block";
}

function renderRegStep() {
  $qa(".reg-step").forEach(s => s.style.display = "none");
  const el = $(`reg-step-${regStep}`);
  if (el) el.style.display = "block";
  $qa(".step-dot").forEach((d, i) => {
    d.classList.toggle("active", i + 1 === regStep);
    d.classList.toggle("done", i + 1 < regStep);
  });
  const labels = ["البيانات الشخصية", "بيانات التواصل", "بيانات الأمان", "أمان الدخول"];
  const lbl = $("step-label-text");
  if (lbl) lbl.textContent = labels[regStep - 1] || "";
}

async function nextRegStep() {
  if (regStep === 1) {
    const fullName = $("reg-fullname").value.trim();
    const dob = $("reg-dob").value;
    const nationality = $("reg-nationality").value;
    if (!fullName || !dob || !nationality) { showToast("أكمل جميع الحقول", "error"); return; }
    const age = Math.floor((Date.now() - new Date(dob)) / (365.25 * 24 * 3600 * 1000));
    regData = { fullName, dob, age, nationality };
    regStep = 2; renderRegStep(); return;
  }
  if (regStep === 2) {
    const countryCode = $("reg-country-code").value;
    const phone = $("reg-phone").value.trim();
    const email = $("reg-email").value.trim();
    const emailConfirm = $("reg-email-confirm").value.trim();
    const username = $("reg-username").value.trim().toLowerCase().replace(/\s+/g, "");
    if (!email || !emailConfirm || !phone || !username) { showToast("أكمل جميع الحقول", "error"); return; }
    if (email !== emailConfirm) { showToast("البريدان غير متطابقان", "error"); return; }
    if (username.length < 3) { showToast("اسم المستخدم قصير جداً", "error"); return; }
    // check username unique
    const usnap = await getDocs(query(collection(db, "users"), where("username", "==", username)));
    if (!usnap.empty) { showToast("اسم المستخدم مستخدم، جرب آخر", "error"); return; }
    regData = { ...regData, countryCode, phone, email, username };
    regStep = 3; renderRegStep(); return;
  }
  if (regStep === 3) {
    const password = $("reg-password").value;
    const passConfirm = $("reg-pass-confirm").value;
    if (password.length < 8) { showToast("كلمة المرور 8 أحرف على الأقل", "error"); return; }
    if (password !== passConfirm) { showToast("كلمتا المرور غير متطابقتين", "error"); return; }
    regData.password = password;
    regStep = 4; renderRegStep(); return;
  }
  if (regStep === 4) {
    const pin1 = $("reg-pin").value;
    const pin2 = $("reg-pin-confirm").value;
    if (!/^\d{6}$/.test(pin1)) { showToast("PIN يجب أن يكون 6 أرقام", "error"); return; }
    if (pin1 !== pin2) { showToast("رمزا PIN غير متطابقين", "error"); return; }
    regData.pin = pin1;
    await finishRegistration();
  }
}

async function finishRegistration() {
  const btn = $("reg-submit-btn");
  if (btn) { btn.disabled = true; btn.textContent = "جاري إنشاء الحساب..."; }
  try {
    const cred = await createUserWithEmailAndPassword(auth, regData.email, regData.password);
    const uid = cred.user.uid;
    const isAdminEmail = ADMIN_EMAILS.includes(regData.email);
    const isDevEmail = regData.email === "khaledahmedelbrbary80@gmail.com";
    const userData = {
      uid,
      fullName: regData.fullName,
      username: regData.username,
      email: regData.email,
      dob: regData.dob,
      age: regData.age,
      nationality: regData.nationality,
      countryCode: regData.countryCode,
      phone: regData.phone,
      photoURL: DEFAULT_AVATAR,
      bio: "",
      links: [],
      role: isAdminEmail ? "admin" : (isDevEmail ? "admin" : "user"),
      isPro: isAdminEmail || isDevEmail,
      isPlus: false,
      proExpiresAt: null,
      verificationType: isDevEmail ? "dev" : (isAdminEmail ? "app" : null),
      verifyNote: isDevEmail ? "مبرمج التطبيق" : (isAdminEmail ? "حساب التطبيق" : null),
      banned: false,
      isPrivate: false,
      followAutoAccept: true,
      followers: [],
      following: [],
      followRequests: [],
      postsCount: 0,
      profileLink: generateUniqueLink(uid),
      createdAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
      pinHash: regData.pin,
      notifCount: 0
    };
    await setDoc(doc(db, "users", uid), userData);
    localStorage.setItem("userPin", regData.pin);
    await updateProfile(cred.user, { displayName: regData.fullName });
    // Welcome notification
    await sendWelcomeNotification(uid, regData.fullName, regData.email);
    currentUserData = userData;
    showApp();
  } catch (e) {
    showToast(e.message || "خطأ في إنشاء الحساب", "error");
    if (btn) { btn.disabled = false; btn.textContent = "إنشاء الحساب"; }
  }
}

async function sendWelcomeNotification(uid, name, email) {
  // Add notification in db
  await addDoc(collection(db, "notifications"), {
    toUid: uid,
    type: "welcome",
    text: `أهلاً بك يا ${name} في تطبيق ${SITE_NAME} 👋`,
    read: false,
    createdAt: serverTimestamp()
  });
  // Email welcome via support account notification
  await addDoc(collection(db, "emailQueue"), {
    to: email,
    subject: `Welcome ${name} — ${SITE_NAME}`,
    body: `Welcome ${name}, a user has logged into your account and\n\nأهلاً بك يا ${name}، قام أحد المستخدمين بالدخول إلى حسابك\n\nالموقع: ${SITE_URL}`,
    createdAt: serverTimestamp()
  });
}

// ── Login ──
async function doLogin() {
  const email = $("login-email").value.trim();
  const password = $("login-password").value;
  if (!email || !password) { showToast("أدخل البريد وكلمة المرور", "error"); return; }
  const btn = $("login-btn");
  btn.disabled = true; btn.textContent = "جاري الدخول...";
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged handles the rest
  } catch (e) {
    showToast("بيانات غير صحيحة", "error");
    btn.disabled = false; btn.textContent = "تسجيل الدخول";
  }
}

async function doGoogleLogin() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      // Create basic profile for Google users
      const isAdminEmail = ADMIN_EMAILS.includes(user.email);
      const userData = {
        uid: user.uid,
        fullName: user.displayName || "مستخدم",
        username: user.email.split("@")[0].toLowerCase() + "_" + Date.now().toString(36),
        email: user.email,
        photoURL: user.photoURL || DEFAULT_AVATAR,
        bio: "",
        links: [],
        role: isAdminEmail ? "admin" : "user",
        isPro: isAdminEmail,
        isPlus: false,
        proExpiresAt: null,
        verificationType: isAdminEmail ? "app" : null,
        verifyNote: null,
        banned: false,
        isPrivate: false,
        followAutoAccept: true,
        followers: [],
        following: [],
        followRequests: [],
        postsCount: 0,
        profileLink: generateUniqueLink(user.uid),
        createdAt: serverTimestamp(),
        lastSeen: serverTimestamp(),
        pinHash: null,
        notifCount: 0,
        dob: "", age: 0, nationality: "", countryCode: "+20", phone: ""
      };
      await setDoc(doc(db, "users", user.uid), userData);
      await sendWelcomeNotification(user.uid, user.displayName, user.email);
      // Google users need PIN setup
      currentUserData = userData;
      showApp();
      setTimeout(() => showPinScreen("set"), 500);
    }
    // onAuthStateChanged will pick it up
  } catch (e) {
    showToast("فشل تسجيل الدخول بجوجل", "error");
  }
}

async function doForgotPassword() {
  const email = $("forgot-email").value.trim();
  if (!email) { showToast("أدخل بريدك الإلكتروني", "error"); return; }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast("تم إرسال رابط استعادة كلمة المرور", "success");
    showLoginForm();
  } catch {
    showToast("البريد غير موجود", "error");
  }
}

async function doLogout() {
  await signOut(auth);
  localStorage.removeItem("userPin");
  showAuthSection();
}

// ─────────────────────────────────────────────
//  NAVIGATION
// ─────────────────────────────────────────────
function navigateTo(page) {
  currentPage = page;
  $qa(".page").forEach(p => p.classList.remove("active"));
  const pg = $(`page-${page}`);
  if (pg) pg.classList.add("active");
  $qa(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.page === page));
  // Load page content
  if (page === "home") loadFeed();
  else if (page === "explore") loadExplore();
  else if (page === "messages") loadMessages();
  else if (page === "profile") loadOwnProfile();
  else if (page === "coding") loadCodingRoom();
  else if (page === "admin" && currentUserData?.role === "admin") loadAdminPanel();
}

function buildBottomNav() {
  const nav = $("bottom-nav");
  const isAdmin = currentUserData?.role === "admin";
  nav.innerHTML = `
    <div class="nav-btn active" data-page="home" onclick="navigateTo('home')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>
      <span>الرئيسية</span>
    </div>
    <div class="nav-btn" data-page="explore" onclick="navigateTo('explore')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
      <span>استكشاف</span>
    </div>
    <div class="nav-btn" data-page="coding" onclick="navigateTo('coding')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16,18 22,12 16,6"/><polyline points="8,6 2,12 8,18"/></svg>
      <span>البرمجة</span>
    </div>
    <div class="nav-btn" data-page="messages" onclick="navigateTo('messages')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
      <span>الرسائل</span>
    </div>
    <div class="nav-btn" data-page="profile" onclick="navigateTo('profile')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      <span>حسابي</span>
    </div>
    ${isAdmin ? `<div class="nav-btn" data-page="admin" onclick="navigateTo('admin')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
      <span>الإدارة</span>
    </div>` : ""}
  `;
}

// ─────────────────────────────────────────────
//  FEED
// ─────────────────────────────────────────────
async function loadFeed(tab = "all") {
  const container = $("feed-posts");
  if (!container) return;
  container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><p>جاري التحميل...</p></div>`;
  if (feedUnsubscribe) feedUnsubscribe();
  let q;
  if (tab === "following" && currentUserData?.following?.length) {
    q = query(collection(db, "posts"), where("uid", "in", currentUserData.following), orderBy("createdAt", "desc"), limit(30));
  } else {
    q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30));
  }
  feedUnsubscribe = onSnapshot(q, snap => {
    if (snap.empty) {
      container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg><h3>لا توجد منشورات بعد</h3><p>كن أول من ينشر!</p></div>`;
      return;
    }
    container.innerHTML = "";
    snap.forEach(d => renderPost(d.data(), d.id, container));
  });
}

function renderPost(post, postId, container) {
  const div = document.createElement("div");
  div.className = "post-card fade-in-up";
  div.dataset.postId = postId;
  const isLiked = post.likes?.includes(currentUser?.uid);
  const isBookmarked = post.bookmarks?.includes(currentUser?.uid);
  div.innerHTML = `
    <div class="post-header">
      <div class="post-avatar" onclick="viewProfile('${post.uid}')"><img src="${post.userPhoto || DEFAULT_AVATAR}" alt="" onerror="this.src='${DEFAULT_AVATAR}'"></div>
      <div class="post-user-info">
        <div class="post-display-name">
          <span>${sanitizeText(post.displayName || "مستخدم")}</span>
          ${post.verifyBadge || ""}
          ${post.planBadge || ""}
        </div>
        <div class="post-username">@${sanitizeText(post.username || "user")} · <span class="post-time" style="font-family:var(--font-time)">${timeAgo(post.createdAt)}</span></div>
      </div>
      <div class="post-more dropdown" onclick="togglePostMenu(this, '${postId}', '${post.uid}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        <div class="dropdown-menu" id="menu-${postId}"></div>
      </div>
    </div>
    <div class="post-body">${linkify(post.text || "")}</div>
    ${renderPostMedia(post)}
    <div class="post-actions">
      <div class="post-action-btn ${isLiked ? "liked" : ""}" onclick="toggleLike('${postId}', ${isLiked})">
        <svg viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <span class="post-action-count">${post.likesCount || 0}</span>
      </div>
      <div class="post-action-btn" onclick="openPost('${postId}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
        <span class="post-action-count">${post.commentsCount || 0}</span>
      </div>
      <div class="post-action-btn" onclick="repostPost('${postId}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>
        <span class="post-action-count">${post.repostsCount || 0}</span>
      </div>
      <div class="post-action-btn ${isBookmarked ? "bookmarked" : ""}" onclick="toggleBookmark('${postId}', ${isBookmarked})">
        <svg viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
      </div>
      <div class="post-action-btn" onclick="sharePost('${postId}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      </div>
    </div>
  `;
  container.appendChild(div);
}

function renderPostMedia(post) {
  if (!post.mediaUrl) return "";
  if (post.mediaType === "video") {
    return `<div class="post-media">
      <div class="video-player-wrap">
        <video id="vid-${Math.random().toString(36).substr(2,6)}" preload="metadata" playsinline>
          <source src="${post.mediaUrl}" type="video/mp4">
        </video>
        <div class="video-controls">
          <div class="video-play-btn" onclick="toggleVideo(this)"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></div>
          <div class="video-progress" onclick="seekVideo(this)"><div class="video-progress-fill" style="width:0%"></div></div>
          <span class="video-time-display">0:00</span>
          <div class="video-vol-btn" onclick="toggleMute(this)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg></div>
        </div>
      </div>
    </div>`;
  }
  if (post.mediaType === "audio") {
    return `<div class="post-media">
      <div class="audio-player">
        <div class="audio-play-btn" onclick="toggleAudio(this)"><svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg></div>
        <div class="audio-info">
          <div class="audio-name">${sanitizeText(post.mediaName || "صوت")}</div>
          <div class="audio-progress" onclick="seekAudio(this)"><div class="audio-progress-fill"></div></div>
          <div class="audio-times"><span class="audio-current">0:00</span><span class="audio-duration">0:00</span></div>
        </div>
        <audio src="${post.mediaUrl}" style="display:none"></audio>
      </div>
    </div>`;
  }
  if (post.mediaType === "pdf") {
    return `<div class="post-media">
      <div class="post-media-pdf" onclick="downloadPdf('${post.mediaUrl}', '${sanitizeText(post.mediaName || "ملف.pdf")}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
        <div>
          <div class="post-media-pdf-name">${sanitizeText(post.mediaName || "ملف PDF")}</div>
          <div class="post-media-pdf-size">اضغط للتحميل</div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:20px;height:20px;color:var(--text3)"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </div>
    </div>`;
  }
  return "";
}

function togglePostMenu(el, postId, postUid) {
  const menu = $(`menu-${postId}`);
  const isOwn = postUid === currentUser?.uid;
  const isAdmin = currentUserData?.role === "admin";
  menu.innerHTML = `
    <div class="dropdown-item" onclick="sharePost('${postId}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>مشاركة</div>
    <div class="dropdown-item" onclick="copyPostLink('${postId}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>نسخ الرابط</div>
    ${isOwn || isAdmin ? `<div class="dropdown-item danger" onclick="deletePost('${postId}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>حذف</div>` : ""}
    ${!isOwn ? `<div class="dropdown-item danger" onclick="reportPost('${postId}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>إبلاغ</div>` : ""}
  `;
  menu.classList.toggle("open");
  document.addEventListener("click", () => menu.classList.remove("open"), { once: true });
}

async function toggleLike(postId, isLiked) {
  if (!currentUser) return;
  const ref = doc(db, "posts", postId);
  if (isLiked) {
    await updateDoc(ref, { likes: arrayRemove(currentUser.uid), likesCount: increment(-1) });
  } else {
    await updateDoc(ref, { likes: arrayUnion(currentUser.uid), likesCount: increment(1) });
    const postSnap = await getDoc(ref);
    if (postSnap.exists() && postSnap.data().uid !== currentUser.uid) {
      await addNotification(postSnap.data().uid, "like", `${currentUserData.displayName || currentUserData.fullName} أعجب بمنشورك`);
    }
  }
}

async function toggleBookmark(postId, isBookmarked) {
  if (!currentUser) return;
  const ref = doc(db, "posts", postId);
  if (isBookmarked) {
    await updateDoc(ref, { bookmarks: arrayRemove(currentUser.uid) });
  } else {
    await updateDoc(ref, { bookmarks: arrayUnion(currentUser.uid) });
  }
  showToast(isBookmarked ? "تمت إزالة الحفظ" : "تم الحفظ ✓", "success");
}

async function repostPost(postId) {
  if (!currentUser) return;
  await updateDoc(doc(db, "posts", postId), { repostsCount: increment(1) });
  showToast("تمت إعادة النشر ✓", "success");
}

async function deletePost(postId) {
  if (!confirm("تأكيد حذف المنشور؟")) return;
  await deleteDoc(doc(db, "posts", postId));
  showToast("تم الحذف", "success");
}

function copyPostLink(postId) {
  const link = `${SITE_URL}/post/${postId}`;
  navigator.clipboard.writeText(link).then(() => showToast("تم نسخ الرابط ✓", "success"));
}

async function sharePost(postId) {
  const link = `${SITE_URL}/post/${postId}`;
  if (navigator.share) {
    await navigator.share({ title: `منشور على ${SITE_NAME}`, url: link });
  } else {
    navigator.clipboard.writeText(link);
    showToast("تم نسخ رابط المنشور ✓", "success");
  }
}

async function reportPost(postId) {
  await addDoc(collection(db, "reports"), {
    postId, reportedBy: currentUser.uid,
    createdAt: serverTimestamp()
  });
  showToast("تم الإبلاغ، سيراجعه الفريق", "info");
}

function downloadPdf(url, name) {
  const a = document.createElement("a");
  a.href = url; a.download = name; a.target = "_blank";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

// ── New Post ──
function openPostCompose() {
  $("compose-modal").classList.add("open");
  $("compose-textarea").focus();
  document.querySelector(".compose-modal-avatar").src = currentUserData?.photoURL || DEFAULT_AVATAR;
}

function closePostCompose() {
  $("compose-modal").classList.remove("open");
  $("compose-textarea").value = "";
  selectedMediaFile = null; selectedMediaType = null;
  $("compose-media-preview").style.display = "none";
}

async function submitPost() {
  const text = $("compose-textarea").value.trim();
  if (!text && !selectedMediaFile) { showToast("اكتب شيئاً", "error"); return; }
  const btn = $("post-submit-btn");
  btn.disabled = true; btn.textContent = "جاري النشر...";
  try {
    let mediaUrl = null, mediaType = null, mediaName = null;
    if (selectedMediaFile) {
      if (selectedMediaType === "image") {
        mediaUrl = await uploadToImgBB(selectedMediaFile);
        mediaType = "image";
      } else {
        const sref = storageRef(storage, `posts/${currentUser.uid}/${Date.now()}_${selectedMediaFile.name}`);
        await uploadBytes(sref, selectedMediaFile);
        mediaUrl = await getDownloadURL(sref);
        mediaType = selectedMediaType;
        mediaName = selectedMediaFile.name;
      }
    }
    const postData = {
      uid: currentUser.uid,
      username: currentUserData.username,
      displayName: currentUserData.fullName,
      userPhoto: currentUserData.photoURL || DEFAULT_AVATAR,
      verifyBadge: verifyBadge(currentUserData),
      planBadge: planBadge(currentUserData),
      text,
      mediaUrl, mediaType, mediaName,
      likes: [], likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      bookmarks: [],
      createdAt: serverTimestamp()
    };
    await addDoc(collection(db, "posts"), postData);
    await updateDoc(doc(db, "users", currentUser.uid), { postsCount: increment(1) });
    closePostCompose();
    showToast("تم النشر ✓", "success");
  } catch (e) {
    showToast("خطأ في النشر", "error");
  } finally {
    btn.disabled = false; btn.textContent = "نشر";
  }
}

function handleMediaAttach(type) {
  const input = document.createElement("input");
  input.type = "file";
  if (type === "image") input.accept = "image/*";
  else if (type === "video") input.accept = "video/mp4";
  else if (type === "audio") input.accept = "audio/mp3,audio/mpeg";
  else if (type === "pdf") input.accept = ".pdf";
  input.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    selectedMediaFile = file;
    selectedMediaType = type;
    const prev = $("compose-media-preview");
    prev.style.display = "flex";
    prev.querySelector(".post-media-preview-name").textContent = file.name;
  };
  input.click();
}

// ── Comments ──
async function openPost(postId) {
  const modal = $("post-detail-modal");
  modal.classList.add("open");
  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) return;
  const post = snap.data();
  const body = $("post-detail-body");
  body.innerHTML = `
    <div class="post-card" style="border-bottom:none">
      <div class="post-header">
        <div class="post-avatar" onclick="viewProfile('${post.uid}')"><img src="${post.userPhoto || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
        <div class="post-user-info">
          <div class="post-display-name">${sanitizeText(post.displayName)} ${post.verifyBadge || ""}</div>
          <div class="post-username">@${sanitizeText(post.username)}</div>
        </div>
      </div>
      <div class="post-body">${linkify(post.text || "")}</div>
      ${renderPostMedia(post)}
    </div>
    <div id="comments-list"></div>
    <div class="comment-input-area">
      <div class="avatar-sm"><img src="${currentUserData?.photoURL || DEFAULT_AVATAR}" class="current-user-avatar"></div>
      <input class="form-input" id="comment-input" placeholder="اكتب تعليقاً..." style="flex:1">
      <button class="btn btn-primary btn-sm" onclick="submitComment('${postId}')">إرسال</button>
    </div>
  `;
  loadComments(postId);
}

// Export all globals for app2.js
export { db, auth, storage, currentUser, currentUserData, DEFAULT_AVATAR,
  SITE_URL, ADMIN_EMAILS, SUPPORT_EMAIL, SITE_NAME, LOGO_URL, ICON_URL,
  IMGBB_KEY, generateUniqueLink, verifyBadge, planBadge, sanitizeText,
  linkify, timeAgo, formatTime, showToast, playNotifSound, $, $q, $qa,
  renderPost, renderPostMedia, addNotification, updateNotifBadge,
  loadFeed, loadExplore, searchUsers, navigateTo, openPostCompose,
  closePostCompose, submitPost, handleMediaAttach, openPost, closePostDetail,
  submitComment, toggleLike, toggleBookmark, repostPost, deletePost,
  copyPostLink, sharePost, reportPost, downloadPdf, togglePostMenu,
  viewProfile, loadOwnProfile, openEditProfile, closeEditProfile, saveProfile,
  copyProfileLink, switchProfileTab, openDmWith, loadMessages,
  openCodeCompose, closeCodeCompose, submitCodePost, toggleLikeCode,
  openNotifications, openSettings, closeSettings, renderSettingsContent,
  togglePrivacy, toggleAutoAccept, changePinFlow, openPricing, closePricing,
  openPayPal, toggleVideo, seekVideo, toggleMute, toggleAudio, seekAudio,
  loadAdminPanel, adminToggleBan, adminTogglePro, adminSetRole, adminSetVerify,
  adminBanUser, doLogin, doGoogleLogin, doForgotPassword, doLogout,
  showLoginForm, showRegisterForm, showForgotForm, nextRegStep, pinPress,
  loadCodingRoom, showApp, sendWelcomeNotification };
