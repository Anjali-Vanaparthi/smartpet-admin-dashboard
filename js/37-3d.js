/* ===== 3D  ·  rotating collar, floating background scene =====
   Collar3D.mountAll(root)  turns every [data-collar] element into a real CSS-3D collar.
     data-n="56"      number of slats around the ring (default 48)
     data-size="sm|lg" size preset (default medium)
     data-plane="dog"  puts the dog illustration inside the ring
     data-still        collar does not spin; the smart module stays at the front
   Scene.init()       adds the floating spheres and rings behind the app. */
const Collar3D = (() => {
  const PAW = `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="6" cy="10" rx="2.1" ry="2.8"/><ellipse cx="10.4" cy="5.6" rx="2.1" ry="2.8"/><ellipse cx="15.6" cy="5.6" rx="2.1" ry="2.8"/><ellipse cx="19.4" cy="10" rx="2.1" ry="2.8"/><path d="M12.5 11c-3.2 0-6 3.4-6 6.1 0 2 1.7 2.9 3.4 2.6 1.1-.2 1.7-.5 2.6-.5s1.5.3 2.6.5c1.7.3 3.4-.6 3.4-2.6 0-2.7-2.8-6.1-6-6.1z"/></svg>`;

  /** Original cartoon dog bust. viewBox is centred on the neck (y = 152) so the collar ring fits it exactly:
      neck spans x 72 to 148, so ring radius = 40 units. */
  const DOG = `<svg viewBox="0 27 220 250" aria-hidden="true">
    <path d="M72 116V176C44 186 20 208 16 280H204C200 208 176 186 148 176V116Z" fill="#f0a257"/>
    <path d="M90 176C96 202 101 238 99 280H121C119 238 124 202 130 176C120 183 100 183 90 176Z" fill="#fff4e4"/>
    <path d="M72 128h76v34H72z" fill="#d98a3f" opacity=".5"/>
    <path d="M54 56C26 54 18 104 32 134c8 14 26 8 28-8 4-22 4-52-6-70z" fill="#c26a2a"/>
    <path d="M166 56c28-2 36 48 22 78-8 14-26 8-28-8-4-22-4-52 6-70z" fill="#c26a2a"/>
    <ellipse cx="110" cy="84" rx="58" ry="52" fill="#f8c98f"/>
    <path d="M110 34c-13 0-22 13-22 31 0 13 7 20 22 20s22-7 22-20c0-18-9-31-22-31z" fill="#fff4e4"/>
    <ellipse cx="110" cy="109" rx="33" ry="25" fill="#fff4e4"/>
    <path d="M97 93c0-7 6-11 13-11s13 4 13 11c0 7-6 11-13 11s-13-4-13-11z" fill="#2a2150"/>
    <ellipse cx="104" cy="89" rx="4" ry="2.4" fill="#fff" opacity=".7"/>
    <path d="M110 104v7M110 111c-5 6-13 6-17 2M110 111c5 6 13 6 17 2" fill="none" stroke="#2a2150" stroke-width="3" stroke-linecap="round"/>
    <path d="M104 116c0 9 3 15 6 15s6-6 6-15z" fill="#ff7a8a"/>
    <ellipse cx="82" cy="76" rx="9" ry="11" fill="#2a2150"/><ellipse cx="138" cy="76" rx="9" ry="11" fill="#2a2150"/>
    <circle cx="85" cy="72" r="3.6" fill="#fff"/><circle cx="141" cy="72" r="3.6" fill="#fff"/>
    <ellipse cx="66" cy="100" rx="8" ry="5" fill="#ff9a8a" opacity=".5"/><ellipse cx="154" cy="100" rx="8" ry="5" fill="#ff9a8a" opacity=".5"/>
    <path d="M70 55c10-8 22-10 32-8M150 55c-10-8-22-10-32-8" fill="none" stroke="#c26a2a" stroke-width="5" stroke-linecap="round"/>
  </svg>`;

  /** The smart module clipped to the front of the collar: status LEDs, antenna and a live heartbeat trace. */
  const MODULE = `<span class="c3d-mod"><i class="led"></i><i class="led g"></i><svg viewBox="0 0 48 20" aria-hidden="true"><path d="M1 11h11l3-8 5 15 4-10 3 3h20"/></svg></span>`;

  /** Product photo of the smart collar (transparent PNG from img/smart-collar.png, embedded by build.py). */
  const COLLAR_IMG = "/*@img:smart-collar.png*/";

  function build(el) {
    if (el.dataset.built) return;
    el.dataset.built = "1";
    if (el.dataset.classic == null) {
      // default: show the real collar photo; add data-classic to get the old CSS-3D ring instead
      el.classList.add("c3dp");
      if (el.dataset.size) el.classList.add(el.dataset.size);
      el.innerHTML = `<img class="c3dp-img" src="${COLLAR_IMG}" alt="Smart collar" draggable="false">`;
      return;
    }
    const n = +el.dataset.n || 48,
      size = el.dataset.size || "";
    el.classList.add("c3d");
    if (size) el.classList.add(size);
    if (el.dataset.still != null) el.classList.add("still"); // collar stays put (e.g. worn by the dog)
    el.style.setProperty("--n", n);
    let parts = "";
    for (let i = 0; i < n; i++) parts += `<i class="c3d-seg" style="--i:${i}"></i>`;
    parts += `<i class="c3d-part" style="--i:0">${MODULE}</i>`;
    parts += `<i class="c3d-part" style="--i:${n / 2}"><span class="c3d-buckle"></span></i>`;
    const plane = el.dataset.plane === "dog" ? `<div class="c3d-plane">${DOG}</div>` : "";
    el.innerHTML = `<div class="c3d-spin">${plane}<div class="c3d-ring">${parts}</div></div>`;
  }

  const mountAll = (root = document) => root.querySelectorAll("[data-collar]").forEach(build);
  return { mountAll, build, PAW };
})();

const Scene = (() => {
  /** Floating spheres and rings that drift with the pointer; sits behind everything. */
  function init() {
    const el = document.createElement("div");
    el.id = "scene";
    el.setAttribute("aria-hidden", "true");
    const items = [
      ["sp", "5%", "72%", "120px", "#5aa2ff", 30, 13],
      ["sp", "92%", "82%", "86px", "#ff9a52", 46, 10],
      ["rg", "72%", "76%", "190px", "#5aa2ff", 22, 16],
      ["sp", "46%", "92%", "64px", "#2dd4bf", 56, 9],
      ["rg", "24%", "84%", "130px", "#ff9a52", 38, 14],
      ["sp", "98%", "34%", "48px", "#a78bfa", 64, 8],
    ];
    el.innerHTML = items
      .map(([k, x, y, s, c, d, t]) => `<i class="${k}" style="--x:${x};--y:${y};--s:${s};--c:${c};--d:${d};--bt:${t}s"></i>`)
      .join("");
    document.body.prepend(el);
  }
  return { init };
})();
