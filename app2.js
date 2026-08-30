// app2.js — Part 2/2 (admin, settings, patches)
import { db, auth, storage, DEFAULT_AVATAR, SITE_URL, ADMIN_EMAILS,
  SUPPORT_EMAIL, SITE_NAME, IMGBB_KEY, generateUniqueLink, verifyBadge,
  planBadge, sanitizeText, linkify, timeAgo, showToast, $, $q, $qa,
  renderPost, addNotification, updateNotifBadge, loadFeed, navigateTo,
  openPostCompose, closePostCompose, submitPost, handleMediaAttach,
  openPost, closePostDetail, submitComment, toggleLike, toggleBookmark,
  repostPost, deletePost, copyPostLink, sharePost, reportPost, downloadPdf,
  togglePostMenu, viewProfile, loadOwnProfile, openEditProfile, closeEditProfile,
  saveProfile, copyProfileLink, switchProfileTab, openDmWith, loadMessages,
  openCodeCompose, closeCodeCompose, submitCodePost, toggleLikeCode,
  openNotifications, openSettings, closeSettings, renderSettingsContent,
  togglePrivacy, toggleAutoAccept, changePinFlow, openPricing, closePricing,
  openPayPal, toggleVideo, seekVideo, toggleMute, toggleAudio, seekAudio,
  loadAdminPanel, adminToggleBan, adminTogglePro, adminSetRole, adminSetVerify,
  adminBanUser, doLogin, doGoogleLogin, doForgotPassword, doLogout,
  showLoginForm, showRegisterForm, showForgotForm, nextRegStep, pinPress,
  loadCodingRoom, showApp, sendWelcomeNotification, loadExplore, searchUsers }
  from "./app1.js";

import { getFirestore, doc, getDoc, setDoc, updateDoc, addDoc,
  collection, query, where, orderBy, limit, getDocs,
  serverTimestamp, increment, arrayUnion, arrayRemove }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


function closePostDetail() { $("post-detail-modal").classList.remove("open"); }

async function loadComments(postId) {
  const container = $("comments-list");
  const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt", "asc"), limit(50));
  onSnapshot(q, snap => {
    container.innerHTML = "";
    snap.forEach(d => {
      const c = d.data();
      const div = document.createElement("div");
      div.className = "comment-item";
      div.innerHTML = `
        <div class="comment-avatar"><img src="${c.userPhoto || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
        <div class="comment-body">
          <div class="comment-user">${sanitizeText(c.displayName)} <span style="font-weight:400;color:var(--text3);font-size:0.75rem">@${sanitizeText(c.username)}</span></div>
          <div class="comment-text">${linkify(c.text)}</div>
          <div class="comment-actions">
            <span class="comment-action" style="font-family:var(--font-time)">${timeAgo(c.createdAt)}</span>
          </div>
        </div>
      `;
      container.appendChild(div);
    });
  });
}

async function submitComment(postId) {
  const input = $("comment-input");
  const text = input.value.trim();
  if (!text) return;
  await addDoc(collection(db, "posts", postId, "comments"), {
    uid: currentUser.uid,
    username: currentUserData.username,
    displayName: currentUserData.fullName,
    userPhoto: currentUserData.photoURL || DEFAULT_AVATAR,
    text,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "posts", postId), { commentsCount: increment(1) });
  input.value = "";
  const snap = await getDoc(doc(db, "posts", postId));
  if (snap.exists() && snap.data().uid !== currentUser.uid) {
    await addNotification(snap.data().uid, "comment", `${currentUserData.fullName} علّق على منشورك`);
  }
}

// ─────────────────────────────────────────────
//  EXPLORE
// ─────────────────────────────────────────────
async function loadExplore() {
  const container = $("explore-users");
  if (!container) return;
  const q = query(collection(db, "users"), limit(20));
  const snap = await getDocs(q);
  container.innerHTML = "";
  snap.forEach(d => {
    const u = d.data();
    if (u.uid === currentUser?.uid) return;
    const div = document.createElement("div");
    div.className = "user-suggestion";
    div.innerHTML = `
      <div class="avatar"><img src="${u.photoURL || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
      <div class="user-info-main">
        <div class="user-display-name">${sanitizeText(u.fullName)} ${verifyBadge(u)}</div>
        <div class="user-username">@${sanitizeText(u.username)}</div>
        <div class="user-bio-short">${sanitizeText(u.bio || "")}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="toggleFollow('${u.uid}', this)">${currentUserData?.following?.includes(u.uid) ? "متابَع" : "متابعة"}</button>
    `;
    div.querySelector(".avatar").onclick = () => viewProfile(u.uid);
    container.appendChild(div);
  });
}

async function searchUsers(q_) {
  if (!q_) { loadExplore(); return; }
  const container = $("explore-users");
  const snap = await getDocs(query(collection(db, "users"), where("username", ">=", q_), where("username", "<=", q_ + "\uf8ff"), limit(15)));
  container.innerHTML = "";
  snap.forEach(d => {
    const u = d.data();
    if (u.uid === currentUser?.uid) return;
    const div = document.createElement("div");
    div.className = "user-suggestion";
    div.innerHTML = `
      <div class="avatar"><img src="${u.photoURL || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
      <div class="user-info-main">
        <div class="user-display-name">${sanitizeText(u.fullName)} ${verifyBadge(u)}</div>
        <div class="user-username">@${sanitizeText(u.username)}</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="toggleFollow('${u.uid}', this)">${currentUserData?.following?.includes(u.uid) ? "متابَع" : "متابعة"}</button>
    `;
    div.querySelector(".avatar").onclick = () => viewProfile(u.uid);
    container.appendChild(div);
  });
}

// ─────────────────────────────────────────────
//  FOLLOW SYSTEM
// ─────────────────────────────────────────────
async function toggleFollow(targetUid, btn) {
  if (!currentUser || targetUid === currentUser.uid) return;
  const isFollowing = currentUserData?.following?.includes(targetUid);
  const targetSnap = await getDoc(doc(db, "users", targetUid));
  if (!targetSnap.exists()) return;
  const target = targetSnap.data();

  if (isFollowing) {
    await updateDoc(doc(db, "users", currentUser.uid), { following: arrayRemove(targetUid) });
    await updateDoc(doc(db, "users", targetUid), { followers: arrayRemove(currentUser.uid) });
    currentUserData.following = (currentUserData.following || []).filter(id => id !== targetUid);
    if (btn) btn.textContent = "متابعة";
  } else {
    if (target.isPrivate && !target.followAutoAccept) {
      await updateDoc(doc(db, "users", targetUid), { followRequests: arrayUnion(currentUser.uid) });
      await addNotification(targetUid, "followRequest", `${currentUserData.fullName} طلب متابعتك`);
      if (btn) btn.textContent = "طلب أُرسل";
      showToast("تم إرسال طلب المتابعة", "info");
      return;
    }
    await updateDoc(doc(db, "users", currentUser.uid), { following: arrayUnion(targetUid) });
    await updateDoc(doc(db, "users", targetUid), { followers: arrayUnion(currentUser.uid) });
    currentUserData.following = [...(currentUserData.following || []), targetUid];
    if (btn) btn.textContent = "متابَع";
    await addNotification(targetUid, "follow", `${currentUserData.fullName} بدأ متابعتك`);
  }
}

// ─────────────────────────────────────────────
//  PROFILE
// ─────────────────────────────────────────────
async function loadOwnProfile() {
  if (!currentUser) return;
  renderProfilePage(currentUserData, true);
}

async function viewProfile(uid) {
  if (uid === currentUser?.uid) { navigateTo("profile"); return; }
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) { showToast("لم يُعثر على المستخدم", "error"); return; }
  const u = snap.data();
  renderProfilePage(u, false);
  navigateTo("profile");
}

function renderProfilePage(u, isOwn) {
  const page = $("page-profile");
  if (!page) return;
  const isFollowing = currentUserData?.following?.includes(u.uid);
  const isAdmin = currentUserData?.role === "admin";
  const canView = !u.isPrivate || isOwn || isFollowing || isAdmin || u.verificationType;

  page.innerHTML = `
    <div class="profile-header-img">
      <div class="profile-avatar-wrap">
        <div class="profile-avatar"><img src="${u.photoURL || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
      </div>
    </div>
    <div class="profile-body">
      <div class="profile-actions">
        ${isOwn ? `
          <button class="btn btn-ghost btn-sm" onclick="openEditProfile()">تعديل الملف</button>
          <button class="btn btn-ghost btn-sm" onclick="copyProfileLink('${u.profileLink}')">نسخ الرابط</button>
          <button class="btn btn-ghost btn-sm" onclick="openSettings()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
          </button>
        ` : `
          <button class="btn btn-primary btn-sm" onclick="toggleFollow('${u.uid}', this)">${isFollowing ? "متابَع" : "متابعة"}</button>
          <button class="btn btn-ghost btn-sm" onclick="openDmWith('${u.uid}')">رسالة</button>
          ${isAdmin ? `<button class="btn btn-danger btn-sm" onclick="adminBanUser('${u.uid}')">حظر</button>` : ""}
        `}
      </div>
      <div class="profile-name">${sanitizeText(u.fullName)} ${verifyBadge(u)} ${planBadge(u)}</div>
      <div class="profile-username">@${sanitizeText(u.username)}
        ${u.isPrivate ? '<span class="badge badge-plus" style="margin-right:4px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> خاص</span>' : ""}
      </div>
      ${u.bio ? `<div class="profile-bio">${sanitizeText(u.bio)}</div>` : ""}
      ${(u.links || []).length ? `<div class="profile-links">${(u.links).map(l => `<a href="${l}" class="profile-link" target="_blank"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>${l}</a>`).join("")}</div>` : ""}
      <div class="profile-stats">
        <div class="profile-stat"><span class="profile-stat-num">${u.postsCount || 0}</span><span class="profile-stat-label">منشوراً</span></div>
        <div class="profile-stat"><span class="profile-stat-num">${(u.followers || []).length}</span><span class="profile-stat-label">متابعون</span></div>
        <div class="profile-stat"><span class="profile-stat-num">${(u.following || []).length}</span><span class="profile-stat-label">يتابعون</span></div>
      </div>
      <div class="profile-tabs">
        <div class="profile-tab active" onclick="switchProfileTab('posts', this)">المنشورات</div>
        <div class="profile-tab" onclick="switchProfileTab('bookmarks', this)">المحفوظات</div>
      </div>
      <div id="profile-posts-container">
        ${canView ? "" : `<div class="private-wall"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg><h3>حساب خاص</h3><p>تابع هذا الحساب لرؤية منشوراته</p></div>`}
      </div>
    </div>
  `;
  if (canView) loadProfilePosts(u.uid, "posts");
}

async function loadProfilePosts(uid, tab = "posts") {
  const container = $("profile-posts-container");
  let q;
  if (tab === "bookmarks" && uid === currentUser?.uid) {
    q = query(collection(db, "posts"), where("bookmarks", "array-contains", uid), orderBy("createdAt", "desc"), limit(20));
  } else {
    q = query(collection(db, "posts"), where("uid", "==", uid), orderBy("createdAt", "desc"), limit(20));
  }
  const snap = await getDocs(q);
  if (!container) return;
  container.innerHTML = "";
  if (snap.empty) { container.innerHTML = `<div class="empty-state"><p>لا توجد منشورات</p></div>`; return; }
  snap.forEach(d => renderPost(d.data(), d.id, container));
}

function switchProfileTab(tab, el) {
  $qa(".profile-tab").forEach(t => t.classList.remove("active"));
  el.classList.add("active");
  const uid = currentUserData?.uid;
  if (uid) loadProfilePosts(uid, tab);
}

function copyProfileLink(link) {
  navigator.clipboard.writeText(link || SITE_URL).then(() => showToast("تم نسخ رابط الملف ✓", "success"));
}

// ── Edit Profile ──
function openEditProfile() {
  const modal = $("edit-profile-modal");
  modal.classList.add("open");
  $("edit-fullname").value = currentUserData?.fullName || "";
  $("edit-bio").value = currentUserData?.bio || "";
  $("edit-links").value = (currentUserData?.links || []).join("\n");
}

function closeEditProfile() { $("edit-profile-modal").classList.remove("open"); }

async function saveProfile() {
  const fullName = $("edit-fullname").value.trim();
  const bio = $("edit-bio").value.trim();
  const linksRaw = $("edit-links").value.trim();
  const isPro = currentUserData?.isPro;
  const isVerified = currentUserData?.verificationType && currentUserData.verificationType !== "pro";
  const maxLinks = isVerified ? 8 : isPro ? 3 : 1;
  const links = linksRaw.split("\n").map(l => l.trim()).filter(Boolean).slice(0, maxLinks);

  let photoURL = currentUserData?.photoURL;
  const photoFile = $("edit-photo-input").files[0];
  if (photoFile) {
    try { photoURL = await uploadToImgBB(photoFile); } catch { showToast("فشل رفع الصورة", "error"); return; }
  }

  await updateDoc(doc(db, "users", currentUser.uid), { fullName, bio, links, photoURL });
  currentUserData = { ...currentUserData, fullName, bio, links, photoURL };
  closeEditProfile();
  loadOwnProfile();
  showToast("تم تحديث الملف ✓", "success");
}

// ─────────────────────────────────────────────
//  MESSAGES / DM
// ─────────────────────────────────────────────
async function loadMessages() {
  const container = $("dm-list");
  if (!container) return;
  const q = query(collection(db, "chats"), where("participants", "array-contains", currentUser.uid), orderBy("lastAt", "desc"));
  onSnapshot(q, snap => {
    container.innerHTML = "";
    if (snap.empty) { container.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg><h3>لا توجد رسائل</h3><p>ابدأ محادثة جديدة</p></div>`; return; }
    snap.forEach(d => {
      const chat = d.data();
      const otherUid = chat.participants.find(id => id !== currentUser.uid);
      renderDmItem(chat, d.id, otherUid, container);
    });
  });
}

async function renderDmItem(chat, chatId, otherUid, container) {
  const usnap = await getDoc(doc(db, "users", otherUid));
  if (!usnap.exists()) return;
  const u = usnap.data();
  const div = document.createElement("div");
  div.className = "dm-item";
  div.innerHTML = `
    <div class="dm-item-avatar"><img src="${u.photoURL || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
    <div class="dm-item-info">
      <div class="dm-item-name">${sanitizeText(u.fullName)} ${verifyBadge(u)}</div>
      <div class="dm-item-preview">${sanitizeText(chat.lastMsg || "")}</div>
    </div>
    <div class="dm-item-time">${timeAgo(chat.lastAt)}</div>
  `;
  div.onclick = () => openDmWith(otherUid);
  container.appendChild(div);
}

async function openDmWith(otherUid) {
  if (otherUid === currentUser?.uid) return;
  const chatId = [currentUser.uid, otherUid].sort().join("_");
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    await setDoc(chatRef, { participants: [currentUser.uid, otherUid], lastMsg: "", lastAt: serverTimestamp() });
  }
  currentChatUser = otherUid;
  const usnap = await getDoc(doc(db, "users", otherUid));
  const u = usnap.exists() ? usnap.data() : {};
  openChatWindow(chatId, u);
  navigateTo("messages");
}

function openChatWindow(chatId, otherUser) {
  const window_ = $("chat-window");
  window_.classList.remove("hidden");
  $("chat-header-name").textContent = otherUser.fullName || "مستخدم";
  $("chat-header-avatar").src = otherUser.photoURL || DEFAULT_AVATAR;
  const msgs = $("chat-messages");
  msgs.innerHTML = "";
  if (chatUnsubscribe) chatUnsubscribe();
  const q = query(collection(db, "chats", chatId, "messages"), orderBy("createdAt", "asc"), limit(50));
  chatUnsubscribe = onSnapshot(q, snap => {
    msgs.innerHTML = "";
    snap.forEach(d => renderMessage(d.data(), msgs));
    msgs.scrollTop = msgs.scrollHeight;
  });
  $("chat-send-btn").onclick = () => sendMessage(chatId);
  $("chat-input").onkeydown = e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatId); } };
}

function renderMessage(msg, container) {
  const isMe = msg.uid === currentUser?.uid;
  const div = document.createElement("div");
  div.className = `msg-wrap ${isMe ? "me" : ""}`;
  div.innerHTML = `
    <div class="msg-avatar"><img src="${msg.userPhoto || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
    <div class="msg-bubble ${isMe ? "me" : "them"}">
      ${msg.mediaType === "pdf" ? `<div class="msg-pdf" onclick="downloadPdf('${msg.mediaUrl}','${sanitizeText(msg.mediaName||'file.pdf')}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>${sanitizeText(msg.mediaName||'ملف')}</span></div>` : ""}
      ${msg.text ? `<span>${linkify(msg.text)}</span>` : ""}
      <span class="msg-time">${timeAgo(msg.createdAt)}</span>
    </div>
  `;
  container.appendChild(div);
}

async function sendMessage(chatId) {
  const input = $("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  await addDoc(collection(db, "chats", chatId, "messages"), {
    uid: currentUser.uid,
    userPhoto: currentUserData.photoURL || DEFAULT_AVATAR,
    text,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "chats", chatId), { lastMsg: text, lastAt: serverTimestamp() });
}

// ─────────────────────────────────────────────
//  CODING ROOM
// ─────────────────────────────────────────────
async function loadCodingRoom() {
  const container = $("coding-posts");
  if (!container) return;
  const canPost = currentUserData?.role === "admin" || currentUserData?.isPro || currentUserData?.isPlus || currentUserData?.verificationType;
  const joinBtn = $("coding-join-btn");
  if (joinBtn) joinBtn.style.display = canPost ? "none" : "flex";
  const q = query(collection(db, "codingPosts"), orderBy("createdAt", "desc"), limit(30));
  onSnapshot(q, snap => {
    container.innerHTML = "";
    if (snap.empty) { container.innerHTML = `<div class="empty-state"><p>لا توجد منشورات برمجية بعد</p></div>`; return; }
    snap.forEach(d => renderCodePost(d.data(), d.id, container));
  });
}

function renderCodePost(post, postId, container) {
  const div = document.createElement("div");
  div.className = "code-post";
  div.innerHTML = `
    <div class="code-post-header">
      <div class="post-avatar" style="width:32px;height:32px"><img src="${post.userPhoto || DEFAULT_AVATAR}"></div>
      <div style="flex:1">
        <div style="font-size:0.85rem;font-weight:600">${sanitizeText(post.displayName)}</div>
        <div style="font-size:0.72rem;color:var(--text3);font-family:var(--font-time)">${timeAgo(post.createdAt)}</div>
      </div>
      <span class="code-post-lang">${sanitizeText(post.language || "code")}</span>
    </div>
    ${post.text ? `<div style="padding:12px 14px;font-size:0.9rem;border-bottom:1px solid var(--border)">${linkify(post.text)}</div>` : ""}
    ${post.code ? `<pre class="code-block">${sanitizeText(post.code)}</pre>` : ""}
    <div class="code-post-actions">
      <div class="post-action-btn" onclick="toggleLikeCode('${postId}')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
        <span>${post.likesCount || 0}</span>
      </div>
    </div>
  `;
  container.appendChild(div);
}

function openCodeCompose() {
  if (!currentUserData?.role && !currentUserData?.isPro && !currentUserData?.verificationType) {
    showToast("غرفة البرمجة للمشتركين فقط", "error"); return;
  }
  $("code-compose-modal").classList.add("open");
}

function closeCodeCompose() { $("code-compose-modal").classList.remove("open"); }

async function submitCodePost() {
  const text = $("code-text").value.trim();
  const code = $("code-content").value.trim();
  const language = $("code-lang").value;
  if (!code && !text) { showToast("أضف محتوى", "error"); return; }
  await addDoc(collection(db, "codingPosts"), {
    uid: currentUser.uid,
    username: currentUserData.username,
    displayName: currentUserData.fullName,
    userPhoto: currentUserData.photoURL || DEFAULT_AVATAR,
    text, code, language,
    likes: [], likesCount: 0,
    createdAt: serverTimestamp()
  });
  closeCodeCompose();
  showToast("تم النشر ✓", "success");
}

async function toggleLikeCode(postId) {
  const ref = doc(db, "codingPosts", postId);
  const snap = await getDoc(ref);
  const isLiked = snap.data()?.likes?.includes(currentUser.uid);
  await updateDoc(ref, { likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid), likesCount: increment(isLiked ? -1 : 1) });
}

// ─────────────────────────────────────────────
//  NOTIFICATIONS
// ─────────────────────────────────────────────
async function addNotification(toUid, type, text) {
  await addDoc(collection(db, "notifications"), {
    toUid, type, text,
    fromUid: currentUser?.uid,
    fromPhoto: currentUserData?.photoURL || DEFAULT_AVATAR,
    read: false,
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(db, "users", toUid), { notifCount: increment(1) });
}

function subscribeNotifications() {
  if (!currentUser) return;
  if (notifUnsubscribe) notifUnsubscribe();
  const q = query(collection(db, "notifications"), where("toUid", "==", currentUser.uid), where("read", "==", false), orderBy("createdAt", "desc"), limit(1));
  notifUnsubscribe = onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      if (change.type === "added") {
        playNotifSound();
        updateNotifBadge();
      }
    });
  });
}

async function updateNotifBadge() {
  if (!currentUser) return;
  const q = query(collection(db, "notifications"), where("toUid", "==", currentUser.uid), where("read", "==", false));
  const snap = await getDocs(q);
  const count = snap.size;
  const badge = $("notif-badge");
  if (badge) { badge.textContent = count > 9 ? "9+" : count; badge.style.display = count > 0 ? "flex" : "none"; }
}

async function openNotifications() {
  const panel = $("notif-panel");
  panel.classList.toggle("open");
  if (!panel.classList.contains("open")) return;
  const list = $("notif-list");
  list.innerHTML = "";
  const q = query(collection(db, "notifications"), where("toUid", "==", currentUser.uid), orderBy("createdAt", "desc"), limit(30));
  const snap = await getDocs(q);
  snap.forEach(d => {
    const n = d.data();
    const div = document.createElement("div");
    div.className = `notif-item ${n.read ? "" : "unread"}`;
    div.innerHTML = `
      <div class="notif-avatar"><img src="${n.fromPhoto || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
      <div class="notif-content">
        <div class="notif-text">${sanitizeText(n.text || "")}</div>
        <div class="notif-time">${timeAgo(n.createdAt)}</div>
      </div>
      ${!n.read ? `<div class="notif-unread-dot"></div>` : ""}
    `;
    list.appendChild(div);
    if (!n.read) updateDoc(doc(db, "notifications", d.id), { read: true });
  });
  await updateDoc(doc(db, "users", currentUser.uid), { notifCount: 0 });
  const badge = $("notif-badge");
  if (badge) badge.style.display = "none";
}

// ─────────────────────────────────────────────
//  ADMIN PANEL
// ─────────────────────────────────────────────
async function loadAdminPanel() {
  if (currentUserData?.role !== "admin") return;
  const panel = $("admin-panel-content");
  if (!panel) return;
  panel.innerHTML = `<div class="empty-state"><p>جاري تحميل لوحة الإدارة...</p></div>`;

  const [usersSnap, postsSnap, reportsSnap] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "posts")),
    getDocs(collection(db, "reports"))
  ]);

  panel.innerHTML = `
    <div class="admin-grid">
      <div class="admin-stat-card"><span class="admin-stat-num">${usersSnap.size}</span><span class="admin-stat-label">إجمالي المستخدمين</span></div>
      <div class="admin-stat-card"><span class="admin-stat-num">${postsSnap.size}</span><span class="admin-stat-label">إجمالي المنشورات</span></div>
      <div class="admin-stat-card"><span class="admin-stat-num">${reportsSnap.size}</span><span class="admin-stat-label">البلاغات</span></div>
      <div class="admin-stat-card"><span class="admin-stat-num">${usersSnap.docs.filter(d=>d.data().isPro).length}</span><span class="admin-stat-label">مشتركو Pro</span></div>
    </div>
    <div class="admin-section">
      <div class="admin-section-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>المستخدمون</div>
      <div id="admin-users-list"></div>
    </div>
  `;

  const list = $("admin-users-list");
  usersSnap.forEach(d => {
    const u = d.data();
    const div = document.createElement("div");
    div.className = "admin-user-row";
    div.innerHTML = `
      <div class="admin-user-avatar"><img src="${u.photoURL || DEFAULT_AVATAR}" onerror="this.src='${DEFAULT_AVATAR}'"></div>
      <div class="admin-user-info">
        <div class="admin-user-name">${sanitizeText(u.fullName)} ${verifyBadge(u)} ${planBadge(u)}</div>
        <div class="admin-user-sub">@${sanitizeText(u.username)} · ${u.email}</div>
      </div>
      <div class="admin-actions">
        <select class="form-select" style="padding:4px 8px;font-size:0.75rem;width:auto" onchange="adminSetVerify('${u.uid}', this.value)">
          <option value="">توثيق</option>
          <option value="pro" ${u.verificationType==="pro"?"selected":""}>Pro</option>
          <option value="verified" ${u.verificationType==="verified"?"selected":""}>محقق</option>
          <option value="dev" ${u.verificationType==="dev"?"selected":""}>مبرمج</option>
          <option value="app" ${u.verificationType==="app"?"selected":""}>تطبيق</option>
        </select>
        <button class="btn btn-sm ${u.isPro ? 'btn-primary' : 'btn-ghost'}" onclick="adminTogglePro('${u.uid}', ${u.isPro})">${u.isPro ? "إلغاء Pro" : "تفعيل Pro"}</button>
        <button class="btn btn-sm ${u.banned ? 'btn-primary' : 'btn-danger'}" onclick="adminToggleBan('${u.uid}', ${u.banned})">${u.banned ? "رفع الحظر" : "حظر"}</button>
        <button class="btn btn-sm btn-ghost" onclick="adminSetRole('${u.uid}', '${u.role}')">${u.role === "admin" ? "إلغاء أدمن" : "جعله أدمن"}</button>
      </div>
    `;
    list.appendChild(div);
  });
}

async function adminToggleBan(uid, isBanned) {
  await updateDoc(doc(db, "users", uid), { banned: !isBanned });
  if (!isBanned) {
    await addDoc(collection(db, "notifications"), {
      toUid: uid, type: "banned",
      text: `تم حظر حسابك. للتواصل: ${SUPPORT_EMAIL}`,
      fromUid: currentUser.uid, fromPhoto: DEFAULT_AVATAR,
      read: false, createdAt: serverTimestamp()
    });
  }
  showToast(!isBanned ? "تم الحظر" : "تم رفع الحظر", "success");
  loadAdminPanel();
}

async function adminTogglePro(uid, isPro) {
  await updateDoc(doc(db, "users", uid), {
    isPro: !isPro,
    proExpiresAt: isPro ? null : Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 3600 * 1000))
  });
  showToast(!isPro ? "تم تفعيل Pro" : "تم إلغاء Pro", "success");
  loadAdminPanel();
}

async function adminSetRole(uid, role) {
  const newRole = role === "admin" ? "user" : "admin";
  await updateDoc(doc(db, "users", uid), { role: newRole });
  showToast(`تم تغيير الصلاحية إلى ${newRole}`, "success");
  loadAdminPanel();
}

async function adminSetVerify(uid, type) {
  const note = type ? prompt("نص دليل التوثيق:") || "" : "";
  await updateDoc(doc(db, "users", uid), { verificationType: type || null, verifyNote: note });
  showToast("تم تحديث التوثيق ✓", "success");
}

async function adminBanUser(uid) {
  if (!confirm("هل أنت متأكد من حظر هذا المستخدم؟")) return;
  await adminToggleBan(uid, false);
}

// ─────────────────────────────────────────────
//  SETTINGS
// ─────────────────────────────────────────────
function openSettings() {
  $("settings-modal").classList.add("open");
  renderSettingsContent();
}

function closeSettings() { $("settings-modal").classList.remove("open"); }

function renderSettingsContent() {
  const container = $("settings-content");
  if (!container || !currentUserData) return;
  container.innerHTML = `
    <div class="settings-page">
      <div class="settings-section">
        <div class="settings-section-title">الحساب</div>
        <div class="settings-item" onclick="openEditProfile()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <div class="settings-item-text"><div>تعديل الملف الشخصي</div></div>
          <div class="settings-item-right"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></div>
        </div>
        <div class="settings-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <div class="settings-item-text">
            <div>حساب خاص</div>
            <div class="settings-item-sub">إخفاء منشوراتك عن غير المتابعين</div>
          </div>
          <label class="toggle"><input type="checkbox" ${currentUserData.isPrivate ? "checked" : ""} onchange="togglePrivacy(this.checked)"><span class="toggle-slider"></span></label>
        </div>
        <div class="settings-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          <div class="settings-item-text">
            <div>قبول المتابعة تلقائياً</div>
          </div>
          <label class="toggle"><input type="checkbox" ${currentUserData.followAutoAccept ? "checked" : ""} onchange="toggleAutoAccept(this.checked)"><span class="toggle-slider"></span></label>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">الأمان</div>
        <div class="settings-item" onclick="changePinFlow()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <div class="settings-item-text"><div>تغيير رمز PIN</div></div>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">الباقات</div>
        <div class="settings-item" onclick="openPricing()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          <div class="settings-item-text"><div>الترقية والباقات</div></div>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">الحساب</div>
        <div class="settings-item" onclick="doLogout()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <div class="settings-item-text" style="color:var(--red)"><div>تسجيل الخروج</div></div>
        </div>
      </div>
    </div>
  `;
}

async function togglePrivacy(val) {
  await updateDoc(doc(db, "users", currentUser.uid), { isPrivate: val });
  currentUserData.isPrivate = val;
  showToast(val ? "الحساب أصبح خاصاً" : "الحساب أصبح عاماً", "success");
}

async function toggleAutoAccept(val) {
  await updateDoc(doc(db, "users", currentUser.uid), { followAutoAccept: val });
  currentUserData.followAutoAccept = val;
}

function changePinFlow() {
  closeSettings();
  showPinScreen("set");
}

// ─────────────────────────────────────────────
//  PRICING
// ─────────────────────────────────────────────
function openPricing() {
  $("pricing-modal").classList.add("open");
}
function closePricing() { $("pricing-modal").classList.remove("open"); }

function openPayPal(amount, currency, planName) {
  const returnUrl = encodeURIComponent(SITE_URL + "/payment-success");
  const cancelUrl = encodeURIComponent(SITE_URL + "/payment-cancel");
  const paypalUrl = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=AW_M1acPABnrPp2AJklYALUDZ1OUA2NS6CPGp3D3ZB9fVIfmfD87le9WZmHF3fOCqINDO3RAtQGWLteZ&amount=${amount}&currency_code=${currency}&item_name=${encodeURIComponent(planName)}&return=${returnUrl}&cancel_return=${cancelUrl}`;
  window.open(paypalUrl, "_blank");
  showToast("تم توجيهك لبوابة الدفع", "info");
}

// ─────────────────────────────────────────────
//  VIDEO / AUDIO CONTROLS
// ─────────────────────────────────────────────
function toggleVideo(btn) {
  const wrap = btn.closest(".video-player-wrap");
  const video = wrap.querySelector("video");
  if (video.paused) {
    video.play();
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  } else {
    video.pause();
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
  }
  video.ontimeupdate = () => {
    const pct = (video.currentTime / video.duration) * 100 || 0;
    wrap.querySelector(".video-progress-fill").style.width = pct + "%";
    const m = Math.floor(video.currentTime / 60), s = Math.floor(video.currentTime % 60);
    wrap.querySelector(".video-time-display").textContent = `${m}:${String(s).padStart(2,"0")}`;
  };
}

function seekVideo(el) {
  const wrap = el.closest(".video-player-wrap");
  const video = wrap.querySelector("video");
  const rect = el.getBoundingClientRect();
  const pct = (event.clientX - rect.left) / rect.width;
  video.currentTime = pct * video.duration;
}

function toggleMute(btn) {
  const video = btn.closest(".video-player-wrap").querySelector("video");
  video.muted = !video.muted;
}

function toggleAudio(btn) {
  const wrap = btn.closest(".audio-player");
  const audio = wrap.querySelector("audio");
  if (audio.paused) {
    audio.play();
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
    audio.ontimeupdate = () => {
      const pct = (audio.currentTime / audio.duration) * 100 || 0;
      wrap.querySelector(".audio-progress-fill").style.width = pct + "%";
      const fmt = t => `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,"0")}`;
      wrap.querySelector(".audio-current").textContent = fmt(audio.currentTime);
      wrap.querySelector(".audio-duration").textContent = fmt(audio.duration || 0);
    };
  } else {
    audio.pause();
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`;
  }
}

function seekAudio(el) {
  const wrap = el.closest(".audio-player");
  const audio = wrap.querySelector("audio");
  const rect = el.getBoundingClientRect();
  audio.currentTime = ((event.clientX - rect.left) / rect.width) * audio.duration;
}

// ─────────────────────────────────────────────
//  DEEP LINKS (URL routing)
// ─────────────────────────────────────────────
function handleDeepLink() {
  const path = window.location.pathname;
  const match = path.match(/\/u\/(.+)/);
  if (match) {
    const uid = match[1];
    onAuthStateChanged(auth, user => {
      if (user) { setTimeout(() => viewProfile(uid), 1000); }
    });
  }
  const postMatch = path.match(/\/post\/(.+)/);
  if (postMatch) {
    const postId = postMatch[1];
    onAuthStateChanged(auth, user => {
      if (user) { setTimeout(() => openPost(postId), 1000); }
    });
  }
}

// ─────────────────────────────────────────────
//  PWA SERVICE WORKER
// ─────────────────────────────────────────────
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

// ─────────────────────────────────────────────
//  EXPOSE GLOBALS
// ─────────────────────────────────────────────
Object.assign(window, {
  navigateTo, pinPress, doLogin, doGoogleLogin, doForgotPassword, doLogout,
  showLoginForm, showRegisterForm, showForgotForm, nextRegStep,
  openPostCompose, closePostCompose, submitPost, handleMediaAttach,
  openPost, closePostDetail, submitComment,
  toggleLike, toggleBookmark, repostPost, deletePost, copyPostLink, sharePost, reportPost,
  toggleFollow, viewProfile, openEditProfile, closeEditProfile, saveProfile, copyProfileLink,
  switchProfileTab, openDmWith,
  openCodeCompose, closeCodeCompose, submitCodePost, toggleLikeCode,
  openNotifications,
  adminToggleBan, adminTogglePro, adminSetRole, adminSetVerify, adminBanUser,
  openSettings, closeSettings,
  openPricing, closePricing, openPayPal,
  toggleVideo, seekVideo, toggleMute, toggleAudio, seekAudio,
  downloadPdf, togglePostMenu, togglePrivacy, toggleAutoAccept, changePinFlow,
  loadFeed, loadExplore, searchUsers
});

// ── Init ──
handleDeepLink();
updateNotifBadge();

// ═══════════════════════════════════════════
//  PATCHES — Google Complete + Session + Nav
// ═══════════════════════════════════════════

// ── Override doGoogleLogin to check for incomplete profile ──
window.doGoogleLogin = async function() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    const snap = await getDoc(doc(db, "users", user.uid));

    if (!snap.exists()) {
      // New Google user — show complete profile modal
      window._gcFinalizeCallback = async (gcData) => {
        const ADMIN_EMAILS_LOCAL = ["khwailedapp@gmail.com", "khaledahmedelbrbary80@gmail.com"];
        const isAdmin = ADMIN_EMAILS_LOCAL.includes(user.email);
        const isDevEmail = user.email === "khaledahmedelbrbary80@gmail.com";

        // Check username unique
        const usnap = await getDocs(query(collection(db, "users"), where("username", "==", gcData.username)));
        if (!usnap.empty) {
          showToast("اسم المستخدم مستخدم بالفعل، جرب آخر", "error");
          document.getElementById('gc-step-1').style.display = 'block';
          ['gc-step-2','gc-step-3'].forEach(id => document.getElementById(id).style.display = 'none');
          document.getElementById('gc-step-label').textContent = 'البيانات الشخصية';
          return;
        }

        const age = Math.floor((Date.now() - new Date(gcData.dob)) / (365.25 * 24 * 3600 * 1000));
        const userData = {
          uid: user.uid,
          fullName: user.displayName || gcData.username,
          username: gcData.username,
          email: user.email,
          dob: gcData.dob,
          age,
          nationality: gcData.nationality,
          countryCode: gcData.countryCode,
          phone: gcData.phone,
          photoURL: user.photoURL || DEFAULT_AVATAR,
          bio: "",
          links: [],
          role: isAdmin ? "admin" : "user",
          isPro: isAdmin,
          isPlus: false,
          proExpiresAt: null,
          verificationType: isDevEmail ? "dev" : (isAdmin ? "app" : null),
          verifyNote: isDevEmail ? "مبرمج التطبيق" : (isAdmin ? "حساب التطبيق" : null),
          banned: false,
          isPrivate: false,
          followAutoAccept: true,
          followers: [], following: [], followRequests: [],
          postsCount: 0,
          profileLink: generateUniqueLink(user.uid),
          createdAt: serverTimestamp(),
          lastSeen: serverTimestamp(),
          pinHash: gcData.pin,
          notifCount: 0
        };
        await setDoc(doc(db, "users", user.uid), userData);
        localStorage.setItem("userPin", gcData.pin);
        await sendWelcomeNotification(user.uid, userData.fullName, user.email);
        currentUser = user;
        currentUserData = userData;

        // Persist session
        persistSession(user.uid);
        document.getElementById('google-complete-modal').style.display = 'none';
        showApp();
      };
      showGoogleComplete(user.uid, user.displayName, user.email, user.photoURL);
    }
    // onAuthStateChanged handles existing users
  } catch (e) {
    showToast("فشل تسجيل الدخول بجوجل: " + (e.message || ""), "error");
  }
};

// ── Session persistence ──
function persistSession(uid) {
  const consent = localStorage.getItem('cookieConsent');
  if (consent === 'all' || consent === 'minimal') {
    localStorage.setItem('lastUid', uid);
    localStorage.setItem('sessionTime', Date.now().toString());
  }
}

// Update onAuthStateChanged to call persistSession
const _origOnAuth = onAuthStateChanged;
// Persist on every auth change
onAuthStateChanged(auth, async user => {
  if (user) {
    persistSession(user.uid);
    // Update lastSeen
    try {
      await updateDoc(doc(db, "users", user.uid), { lastSeen: serverTimestamp() });
    } catch {}
  }
});

// ── Override navigateTo to push history ──
const _origNavigate = window.navigateTo;
window.navigateTo = function(page, pushState = true) {
  _origNavigate(page);
  if (pushState) {
    window._navStack = window._navStack || [];
    window._navStack.push(page);
    try { history.pushState({ page }, '', '#' + page); } catch {}
  }
};

// ── Override showApp to init nav stack ──
const _origShowApp = showApp;
// init nav on load
window.addEventListener('load', () => {
  window._navStack = ['home'];
  history.replaceState({ page: 'home' }, '', '#home');
});

