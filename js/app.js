/**
 * ================== LANTAI (FLOORS) ==================
 * Setiap lantai punya gambar denah sendiri.
 * Saat ini floorplan-2.jpg dan floorplan-3.jpg masih SALINAN dari
 * floorplan.jpg (lantai 1) — tinggal ganti file-nya nanti (nama file
 * tetap sama) begitu denah asli lantai 2 & 3 sudah jadi, tidak perlu
 * ubah kode apa pun.
 */
const floors = [
  { id: 1, label: "1F", name: "1階", image: "assets/floorplan.jpg" },
  { id: 2, label: "2F", name: "2階", image: "assets/floorplan-2.jpg" },
  { id: 3, label: "3F", name: "3階", image: "assets/floorplan-3.jpg" },
];

/**
 * ================== TITIK PANDANG (SCENES) ==================
 * Untuk menambah titik baru nanti: tambahkan objek baru di array ini,
 * lalu tambahkan panorama JPG-nya di folder assets/.
 *
 * floors: di lantai mana saja titik ini muncul pada denah mini.
 *         Sekarang baru ada 2 panorama, jadi keduanya ditandai
 *         floors: [1, 2, 3] supaya tetap muncul di ketiga tab denah.
 *         Begitu ada panorama baru khusus lantai 2 atau 3, buat scene
 *         baru dan set floors: [2] (atau [3]) saja.
 *
 * dot: posisi penanda pada gambar denah, dalam PERSEN (%) dari kiri (x) dan atas (y).
 * yawOffset: opsional, menyesuaikan arah hadap awal (derajat) agar cocok dengan orientasi denah.
 *
 * hotspots: (opsional) panah navigasi yang MENEMPEL DI DALAM gambar 360 itu sendiri,
 * ikut berputar saat pandangan digeser — beda dari titik di denah yang diam di pojok layar.
 * Setiap hotspot berisi:
 *   pitch  -> sudut atas/bawah (derajat, 0 = sejajar mata, negatif = agak ke bawah lantai)
 *   yaw    -> sudut kiri/kanan (derajat, 0-360, arah mana panah ditempatkan)
 *   target -> id scene tujuan saat panah diklik
 *   text   -> label singkat yang muncul (mis. "Ruang Tunggu")
 *
 * Cara cari pitch/yaw yang pas: buka panorama di halaman, arahkan pandangan
 * ke lokasi yang mau dikasih panah (misal ke arah pintu ruangan berikutnya),
 * lalu ketik  viewer.getPitch()  dan  viewer.getYaw()  di console browser (F12)
 * buat lihat angkanya, lalu isi ke sini.
 */
const scenes = [
  {
    id: "scene1",
    title: "診察室",
    panorama: "assets/panorama1.jpg",
    floors: [1, 2, 3],
    dot: { x: 33.7, y: 77.0 },
    yawOffset: 0,
    hotspots: [
      { pitch: -22, yaw: 354, target: "scene2", text: "患者室" },
    ],
  },
  {
    id: "scene2",
    title: "患者室",
    panorama: "assets/panorama2.jpg",
    floors: [1, 2, 3],
    dot: { x: 75.2, y: 38.3 },
    yawOffset: 0,
    hotspots: [
      { pitch: -20, yaw: 21, target: "scene1", text: "診察室" },
    ],
  },
];

let currentSceneId = scenes[0].id;
let activeFloor = floors[0].id;

const viewer = pannellum.viewer("panorama", {
  default: {
    firstScene: scenes[0].id,
    sceneFadeDuration: 600,
    autoLoad: true,
    showControls: false,
    compass: false,
    hfov: 100,
  },
  scenes: Object.fromEntries(
    scenes.map((s) => [
      s.id,
      {
        type: "equirectangular",
        panorama: s.panorama,
        autoLoad: true,
        yaw: s.yawOffset || 0,
        hotSpots: (s.hotspots || []).map((h) => ({
          pitch: h.pitch,
          yaw: h.yaw,
          type: "scene",
          sceneId: h.target,
          cssClass: "nav-hotspot",
          createTooltipFunc: createSceneHotspot,
          createTooltipArgs: h.text,
        })),
      },
    ])
  ),
});

/**
 * Tampilan custom untuk panah navigasi di dalam panorama
 * (menggantikan ikon bawaan Pannellum, disamakan dengan tema halaman).
 */
function createSceneHotspot(hotSpotDiv, text) {
  hotSpotDiv.classList.add("nav-hotspot-inner");
  hotSpotDiv.innerHTML = `
    <span class="nav-hotspot-ring"></span>
    <svg class="nav-hotspot-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 19V5M5 12l7-7 7 7"/>
    </svg>
    <span class="nav-hotspot-label">${text}</span>
  `;
}

/* ---------- Loading screen ---------- */

const loadingScreen = document.getElementById("loading-screen");
viewer.on("load", () => {
  loadingScreen.classList.add("hidden");
});

/* ---------- Scene title ---------- */

const sceneTitleEl = document.getElementById("scene-title");
function setActiveScene(id) {
  currentSceneId = id;
  const scene = scenes.find((s) => s.id === id);
  if (scene) {
    sceneTitleEl.textContent = scene.title;
    // Kalau scene ini tidak tersedia di tab lantai yang sedang aktif,
    // ikut pindah ke lantai pertama tempat scene ini terdaftar.
    if (!scene.floors.includes(activeFloor)) {
      setActiveFloor(scene.floors[0]);
    }
  }
  document.querySelectorAll(".viewpoint-dot").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.scene === id);
  });
}

/* ---------- Floor tabs + floorplan viewpoint dots ---------- */

const floorTabsWrap = document.getElementById("floor-tabs");
const floorplanImg = document.getElementById("floorplan-img");
const floorplanCanvas = document.getElementById("floorplan-canvas");

floors.forEach((floor) => {
  const tab = document.createElement("button");
  tab.type = "button";
  tab.className = "floor-tab";
  tab.dataset.floor = String(floor.id);
  tab.textContent = floor.label;
  tab.setAttribute("role", "tab");
  tab.addEventListener("click", () => setActiveFloor(floor.id));
  floorTabsWrap.appendChild(tab);
});

function renderFloorDots() {
  floorplanCanvas.querySelectorAll(".viewpoint-dot").forEach((d) => d.remove());
  scenes
    .filter((s) => s.floors.includes(activeFloor))
    .forEach((scene) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "viewpoint-dot";
      dot.dataset.scene = scene.id;
      dot.style.left = scene.dot.x + "%";
      dot.style.top = scene.dot.y + "%";
      dot.setAttribute("aria-label", "この地点から見る: " + scene.title);
      dot.addEventListener("click", () => {
        if (scene.id === currentSceneId) return;
        viewer.loadScene(scene.id);
      });
      floorplanCanvas.appendChild(dot);
    });
  document.querySelectorAll(".viewpoint-dot").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.scene === currentSceneId);
  });
}

function setActiveFloor(floorId) {
  activeFloor = floorId;
  const floor = floors.find((f) => f.id === floorId);
  if (floor) {
    floorplanImg.src = floor.image;
    floorplanImg.alt = floor.name + "の平面図と視点";
  }
  document.querySelectorAll(".floor-tab").forEach((tab) => {
    const isActive = Number(tab.dataset.floor) === floorId;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  resetZoom();
  renderFloorDots();
}

viewer.on("scenechange", (id) => {
  setActiveScene(id);
});

setActiveFloor(activeFloor);
setActiveScene(currentSceneId);

/* ---------- Hide / show floorplan panel ---------- */

const floorplanPanel = document.getElementById("floorplan-panel");
const floorplanHideBtn = document.getElementById("floorplan-hide-btn");
const floorplanShowBtn = document.getElementById("floorplan-show-btn");

floorplanHideBtn.addEventListener("click", () => {
  floorplanPanel.classList.add("hidden");
  floorplanShowBtn.classList.add("visible");
});
floorplanShowBtn.addEventListener("click", () => {
  floorplanPanel.classList.remove("hidden");
  floorplanShowBtn.classList.remove("visible");
});

/* ---------- Floorplan zoom & pan ---------- */

const floorplanViewport = document.getElementById("floorplan-viewport");
const zoomInBtn = document.getElementById("zoom-in-btn");
const zoomOutBtn = document.getElementById("zoom-out-btn");
const zoomResetBtn = document.getElementById("zoom-reset-btn");

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.5;
let zoomLevel = 1;
let panX = 0;
let panY = 0;

function applyTransform() {
  floorplanCanvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
}

function clampPan() {
  const rect = floorplanViewport.getBoundingClientRect();
  const maxX = (rect.width * (zoomLevel - 1)) / 2;
  const maxY = (rect.height * (zoomLevel - 1)) / 2;
  panX = Math.min(maxX, Math.max(-maxX, panX));
  panY = Math.min(maxY, Math.max(-maxY, panY));
}

function updateZoomUI() {
  zoomOutBtn.disabled = zoomLevel <= ZOOM_MIN;
  zoomInBtn.disabled = zoomLevel >= ZOOM_MAX;
  zoomResetBtn.textContent = zoomLevel.toFixed(1).replace(".0", "") + "×";
  floorplanViewport.classList.toggle("zoomed", zoomLevel > 1);
}

function setZoom(next) {
  zoomLevel = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)) * 100) / 100;
  clampPan();
  applyTransform();
  updateZoomUI();
}

function resetZoom() {
  zoomLevel = 1;
  panX = 0;
  panY = 0;
  floorplanCanvas.classList.add("smooth");
  applyTransform();
  updateZoomUI();
  window.setTimeout(() => floorplanCanvas.classList.remove("smooth"), 220);
}

zoomInBtn.addEventListener("click", () => setZoom(zoomLevel + ZOOM_STEP));
zoomOutBtn.addEventListener("click", () => setZoom(zoomLevel - ZOOM_STEP));
zoomResetBtn.addEventListener("click", resetZoom);

let dragging = false;
let dragStartX = 0;
let dragStartY = 0;
let panStartX = 0;
let panStartY = 0;

floorplanViewport.addEventListener("pointerdown", (e) => {
  if (zoomLevel <= 1) return;
  if (e.target.closest(".viewpoint-dot")) return; // biarkan titik tetap bisa diklik normal
  dragging = true;
  floorplanCanvas.classList.remove("smooth");
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  panStartX = panX;
  panStartY = panY;
  floorplanViewport.setPointerCapture(e.pointerId);
});
floorplanViewport.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  panX = panStartX + (e.clientX - dragStartX);
  panY = panStartY + (e.clientY - dragStartY);
  clampPan();
  applyTransform();
});
["pointerup", "pointercancel", "pointerleave"].forEach((evt) => {
  floorplanViewport.addEventListener(evt, () => {
    dragging = false;
  });
});

// Scroll wheel untuk zoom (desktop)
floorplanViewport.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    setZoom(zoomLevel + (e.deltaY < 0 ? 0.25 : -0.25));
  },
  { passive: false }
);

updateZoomUI();

/* ---------- Fullscreen control ---------- */

const fullscreenBtn = document.getElementById("fullscreen-btn");

const supportsFullscreen =
  document.documentElement.requestFullscreen ||
  document.documentElement.webkitRequestFullscreen;

if (!supportsFullscreen) {
  // iPhone (iOS Safari & semua browser di iOS) belum mendukung Fullscreen API
  // untuk elemen selain <video>, jadi tombolnya disembunyikan saja.
  fullscreenBtn.style.display = "none";
} else {
  fullscreenBtn.addEventListener("click", () => {
    viewer.toggleFullscreen();
  });
}
