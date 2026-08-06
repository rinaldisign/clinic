/**
 * ================== FITUR KOMENTAR ==================
 * Menggunakan Firebase Firestore supaya komentar tersimpan permanen
 * dan terlihat oleh SEMUA pengunjung (bukan cuma di satu browser).
 *
 * File ini bergantung pada variabel global dari js/app.js yang harus
 * sudah dimuat lebih dulu: viewer, scenes, currentSceneId.
 */

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const commentsRef = db.collection("comments");

let allComments = [];
let editingId = null;
let pendingComment = null; // data komentar yang menunggu diklik posisinya di panorama
let placementMode = false;

/* ---------- DOM refs ---------- */

const commentPanel = document.getElementById("comment-panel");
const commentHideBtn = document.getElementById("comment-hide-btn");
const commentShowBtn = document.getElementById("comment-show-btn");
const commentFab = document.getElementById("comment-fab");
const commentList = document.getElementById("comment-list");
const commentEmpty = document.getElementById("comment-empty");

const commentForm = document.getElementById("comment-form");
const commentFormTitle = document.getElementById("comment-form-title");
const commentNameInput = document.getElementById("comment-name");
const commentTypeSelect = document.getElementById("comment-type");
const commentContentInput = document.getElementById("comment-content");
const commentPinToggle = document.getElementById("comment-pin-toggle");
const commentCancelBtn = document.getElementById("comment-cancel-btn");

const placementBanner = document.getElementById("placement-banner");
const placementCancelBtn = document.getElementById("placement-cancel-btn");

const commentModal = document.getElementById("comment-modal");
const commentModalBody = document.getElementById("comment-modal-body");
const commentModalClose = document.getElementById("comment-modal-close");

const panoramaEl = document.getElementById("panorama");

/* ---------- Hide / show panel ---------- */

commentHideBtn.addEventListener("click", () => {
  commentPanel.classList.add("hidden");
  commentShowBtn.classList.add("visible");
});
commentShowBtn.addEventListener("click", () => {
  commentPanel.classList.remove("hidden");
  commentShowBtn.classList.remove("visible");
});

// Di layar sangat sempit, panel denah (kanan) dan panel komentar (kiri)
// bisa bertumpuk kalau dua-duanya terbuka bersamaan. Supaya rapi,
// panel komentar mulai tersembunyi di layar sempit — tetap bisa
// dibuka kapan saja lewat tombol komentar di pojok kiri bawah.
if (window.matchMedia("(max-width: 380px)").matches) {
  commentPanel.classList.add("hidden");
  commentShowBtn.classList.add("visible");
}

/* ---------- Placeholder teks sesuai tipe konten ---------- */

const typePlaceholders = {
  text: "コメントを入力…",
  link: "https://example.com/…",
  video: "動画のURL（YouTube・Vimeo・mp4など）…",
  image: "画像のURL（https://…）…",
};
function updateContentPlaceholder() {
  commentContentInput.placeholder = typePlaceholders[commentTypeSelect.value] || "";
}
commentTypeSelect.addEventListener("change", updateContentPlaceholder);
updateContentPlaceholder();

/* ---------- Buka / tutup form ---------- */

commentFab.addEventListener("click", () => openForm());
commentCancelBtn.addEventListener("click", () => closeForm());

function openForm(comment) {
  editingId = comment ? comment.id : null;
  commentFormTitle.textContent = comment ? "コメントを編集" : "新しいコメント";
  commentNameInput.value = comment ? comment.author || "" : localStorage.getItem("commenterName") || "";
  commentTypeSelect.value = comment ? comment.type : "text";
  commentContentInput.value = comment ? comment.content : "";
  commentPinToggle.checked = comment ? Boolean(comment.sceneId) : false;
  updateContentPlaceholder();
  commentForm.classList.add("open");
  commentPanel.scrollTo({ top: commentPanel.scrollHeight, behavior: "smooth" });
}

function closeForm() {
  commentForm.classList.remove("open");
  commentForm.reset();
  editingId = null;
  updateContentPlaceholder();
}

/* ---------- Kirim form ---------- */

commentForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const author = commentNameInput.value.trim();
  const type = commentTypeSelect.value;
  const content = commentContentInput.value.trim();
  if (!content) return;

  localStorage.setItem("commenterName", author);

  const data = { author: author || "匿名", type, content };

  if (commentPinToggle.checked) {
    pendingComment = data;
    closeForm();
    enterPlacementMode();
  } else {
    saveComment({ ...data, sceneId: null, pitch: null, yaw: null });
    closeForm();
  }
});

function saveComment(data) {
  if (editingId) {
    const id = editingId;
    editingId = null;
    commentsRef.doc(id).update({
      ...data,
      editedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } else {
    commentsRef.add({
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  }
}

/* ---------- Mode penempatan pin di panorama ---------- */

function enterPlacementMode() {
  placementMode = true;
  placementBanner.classList.add("visible");
  panoramaEl.classList.add("placement-cursor");
}
function exitPlacementMode() {
  placementMode = false;
  pendingComment = null;
  editingId = null;
  placementBanner.classList.remove("visible");
  panoramaEl.classList.remove("placement-cursor");
}
placementCancelBtn.addEventListener("click", exitPlacementMode);

let pointerDownX = 0;
let pointerDownY = 0;
panoramaEl.addEventListener("pointerdown", (e) => {
  pointerDownX = e.clientX;
  pointerDownY = e.clientY;
});
panoramaEl.addEventListener("pointerup", (e) => {
  if (!placementMode || !pendingComment) return;
  // Kalau pointer bergeser cukup jauh, anggap itu gestur "lihat sekeliling", bukan klik menempatkan pin.
  const moved = Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY);
  if (moved > 8) return;

  const coords = viewer.mouseEventToCoords(e);
  if (!coords) return;
  const [pitch, yaw] = coords;

  saveComment({ ...pendingComment, sceneId: currentSceneId, pitch, yaw });
  exitPlacementMode();
});

/* ---------- Realtime listener ---------- */

commentsRef.orderBy("createdAt", "desc").onSnapshot(
  (snapshot) => {
    allComments = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderCommentList();
    syncCommentHotspots();
  },
  (err) => {
    console.error("Firestore error:", err);
    commentEmpty.textContent = "コメントを読み込めませんでした。Firebase の設定を確認してください。";
    commentEmpty.classList.add("visible");
  }
);

/* ---------- Render daftar komentar ---------- */

function formatTime(ts) {
  if (!ts || !ts.toDate) return "…";
  const d = ts.toDate();
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" }) +
    " " + d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str == null ? "" : str);
  return div.innerHTML;
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function renderPreview(c) {
  if (c.type === "text") return escapeHtml(truncate(c.content, 110));
  if (c.type === "link") return "🔗 " + escapeHtml(truncate(c.content, 70));
  if (c.type === "video") return "🎬 動画";
  if (c.type === "image") return "🖼️ 画像";
  return "";
}

function renderCommentList() {
  commentList.innerHTML = "";
  commentEmpty.classList.toggle("visible", allComments.length === 0);

  allComments.forEach((c) => {
    const scene = c.sceneId ? scenes.find((s) => s.id === c.sceneId) : null;

    const item = document.createElement("div");
    item.className = "comment-item";
    item.innerHTML = `
      <div class="comment-item-head">
        <span class="comment-author">${escapeHtml(c.author || "匿名")}</span>
        <span class="comment-time">${formatTime(c.createdAt)}</span>
      </div>
      <p class="comment-body">${renderPreview(c)}</p>
      ${scene ? `<span class="comment-pin-tag">📍 ${escapeHtml(scene.title)}</span>` : ""}
      <div class="comment-actions">
        <button type="button" class="comment-action-btn" data-action="edit">編集</button>
        <button type="button" class="comment-action-btn danger" data-action="delete">削除</button>
      </div>
    `;
    item.querySelector('[data-action="edit"]').addEventListener("click", (ev) => {
      ev.stopPropagation();
      openForm(c);
    });
    item.querySelector('[data-action="delete"]').addEventListener("click", (ev) => {
      ev.stopPropagation();
      if (window.confirm("このコメントを削除しますか？")) {
        commentsRef.doc(c.id).delete();
      }
    });
    item.addEventListener("click", () => openCommentModal(c));
    commentList.appendChild(item);
  });
}

/* ---------- Modal isi komentar ---------- */

function escapeAttr(str) {
  return String(str).replace(/"/g, "&quot;");
}

function embedVideo(url) {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (yt) {
    return `<div class="modal-video-wrap"><iframe src="https://www.youtube.com/embed/${yt[1]}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  if (vimeo) {
    return `<div class="modal-video-wrap"><iframe src="https://player.vimeo.com/video/${vimeo[1]}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  return `<video class="modal-video" src="${escapeAttr(url)}" controls playsinline></video>`;
}

function openCommentModal(c) {
  const scene = c.sceneId ? scenes.find((s) => s.id === c.sceneId) : null;
  let body = `
    <div class="modal-meta">
      <span class="comment-author">${escapeHtml(c.author || "匿名")}</span>
      <span class="comment-time">${formatTime(c.createdAt)}</span>
    </div>
    ${scene ? `<span class="comment-pin-tag">📍 ${escapeHtml(scene.title)}</span>` : ""}
  `;
  if (c.type === "text") {
    body += `<p class="modal-text">${escapeHtml(c.content)}</p>`;
  } else if (c.type === "link") {
    body += `<a class="modal-link" href="${escapeAttr(c.content)}" target="_blank" rel="noopener noreferrer">${escapeHtml(c.content)} ↗</a>`;
  } else if (c.type === "video") {
    body += embedVideo(c.content);
  } else if (c.type === "image") {
    body += `<img class="modal-image" src="${escapeAttr(c.content)}" alt="コメント画像" />`;
  }
  body += `
    <div class="modal-actions">
      <button type="button" class="comment-action-btn" id="modal-edit-btn">編集</button>
      <button type="button" class="comment-action-btn danger" id="modal-delete-btn">削除</button>
    </div>
  `;
  commentModalBody.innerHTML = body;
  commentModalBody.querySelector("#modal-edit-btn").addEventListener("click", () => {
    commentModal.classList.remove("visible");
    if (c.sceneId && c.sceneId !== currentSceneId) viewer.loadScene(c.sceneId);
    openForm(c);
  });
  commentModalBody.querySelector("#modal-delete-btn").addEventListener("click", () => {
    if (window.confirm("このコメントを削除しますか？")) {
      commentsRef.doc(c.id).delete();
      commentModal.classList.remove("visible");
    }
  });
  commentModal.classList.add("visible");
}

commentModalClose.addEventListener("click", () => commentModal.classList.remove("visible"));
commentModal.addEventListener("click", (e) => {
  if (e.target === commentModal) commentModal.classList.remove("visible");
});

/* ---------- Hotspot ikon komentar di dalam panorama ---------- */

let activeHotspotIds = [];

function createCommentHotspotEl(div) {
  div.classList.add("comment-hotspot-inner");
  div.innerHTML = `
    <span class="comment-hotspot-ring"></span>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  `;
}

function syncCommentHotspots() {
  activeHotspotIds.forEach((id) => {
    try {
      viewer.removeHotSpot(id, currentSceneId);
    } catch (err) {
      /* scene belum siap, aman diabaikan */
    }
  });
  activeHotspotIds = [];

  allComments
    .filter((c) => c.sceneId === currentSceneId && typeof c.pitch === "number" && typeof c.yaw === "number")
    .forEach((c) => {
      const id = "comment-" + c.id;
      try {
        viewer.addHotSpot(
          {
            id,
            pitch: c.pitch,
            yaw: c.yaw,
            type: "info",
            cssClass: "comment-hotspot",
            createTooltipFunc: createCommentHotspotEl,
            clickHandlerFunc: () => openCommentModal(c),
          },
          currentSceneId
        );
        activeHotspotIds.push(id);
      } catch (err) {
        /* scene belum siap, aman diabaikan */
      }
    });
}

viewer.on("scenechange", () => {
  // beri sedikit waktu supaya scene baru selesai terdaftar sebelum menambah hotspot
  window.setTimeout(syncCommentHotspots, 50);
});
