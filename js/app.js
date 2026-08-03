/**
 * Daftar titik pandang (scene).
 * Untuk menambah titik baru nanti: tambahkan objek baru di array ini,
 * lalu tambahkan panorama JPG-nya di folder assets/.
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
 *
 * Contoh kalau nanti nambah scene2:
 *   scene1: hotspots: [{ pitch: -5, yaw: 120, target: "scene2", text: "Ruang Tunggu" }]
 *   scene2: hotspots: [{ pitch: -5, yaw: 300, target: "scene1", text: "Ruang Konsultasi" }]
 */
const scenes = [
  {
    id: "scene1",
    title: "Ruang Konsultasi",
    panorama: "assets/panorama1.jpg",
    dot: { x: 33.7, y: 77.0 },
    yawOffset: 0,
    hotspots: [
      { pitch: -20, yaw: 340, target: "scene2", text: "Ruang Periksa" },
    ],
  },
  {
    id: "scene2",
    title: "Ruang Periksa",
    panorama: "assets/panorama2.jpg",
    dot: { x: 75.2, y: 38.3 },
    yawOffset: 0,
    hotspots: [
      { pitch: -20, yaw: 20, target: "scene1", text: "Ruang Konsultasi" },
    ],
  },
];

let currentSceneId = scenes[0].id;

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
  if (scene) sceneTitleEl.textContent = scene.title;
  document.querySelectorAll(".viewpoint-dot").forEach((dot) => {
    dot.classList.toggle("active", dot.dataset.scene === id);
  });
}

/* ---------- Floorplan viewpoint dots ---------- */

const floorplanWrap = document.getElementById("floorplan-wrap");

scenes.forEach((scene) => {
  const dot = document.createElement("button");
  dot.className = "viewpoint-dot";
  dot.dataset.scene = scene.id;
  dot.style.left = scene.dot.x + "%";
  dot.style.top = scene.dot.y + "%";
  dot.setAttribute("aria-label", "Lihat dari: " + scene.title);
  dot.addEventListener("click", () => {
    if (scene.id === currentSceneId) return;
    viewer.loadScene(scene.id);
  });
  floorplanWrap.appendChild(dot);
});

viewer.on("scenechange", (id) => {
  setActiveScene(id);
});

setActiveScene(currentSceneId);

/* ---------- Compass (mirrors current view direction) ---------- */

const compassFov = document.getElementById("compass-fov");
let rafId = null;

function updateCompass() {
  const yaw = viewer.getYaw();
  compassFov.style.transform = `rotate(${yaw}deg)`;
  rafId = requestAnimationFrame(updateCompass);
}
updateCompass();

/* ---------- Fullscreen control ---------- */

const fullscreenBtn = document.getElementById("fullscreen-btn");
fullscreenBtn.addEventListener("click", () => {
  viewer.toggleFullscreen();
});
