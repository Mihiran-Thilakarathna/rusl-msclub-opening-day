/* MS Club Opening Day 2026 — photo booth */

// Frame palette — taken from the MS Club logo colours. Change here only.
const FRAME = {
  colors: ["#F25022", "#7FBA00", "#00A4EF", "#FFB900"],
  bg: "#0c111d",
  bg2: "#141b2d",
  text: "#ffffff",
  muted: "rgba(255,255,255,0.62)",
  width: 1080,
  height: 1350,
};

const SHARE_TEXT =
  "Frame Your Vibe. Share Your Pride. Win a Surprise. 📸\n" +
  "At MS Club Opening Day 2026 — Rajarata University of Sri Lanka!\n" +
  "#MSClubOpeningDay2026 #MSClub #RajarataUniversity";
const FILE_NAME = "MSClub-OpeningDay-2026.jpg";

const frameLogo = new Image();
frameLogo.src = "assets/logo.png";

const $ = (s) => document.querySelector(s);
const screens = {
  home: $("#screen-home"),
  camera: $("#screen-camera"),
  result: $("#screen-result"),
};
const video = $("#video");
const canvas = $("#canvas");
const resultImg = $("#result-img");
const rendering = $("#rendering");
const shutter = $("#btn-shutter");

let stream = null;
let facing = "user";
let resultBlob = null;
let resultUrl = null;

function show(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle("active", k === name));
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (name !== "camera") stopCamera();
}

/* ---------- Camera ---------- */
async function startCamera() {
  stopCamera();
  $("#cam-error").hidden = true;
  if (!navigator.mediaDevices?.getUserMedia) return camError();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1920 } },
      audio: false,
    });
    video.srcObject = stream;
    video.classList.toggle("mirror", facing === "user");
    await video.play().catch(() => {});
    shutter.disabled = false;
  } catch (e) {
    console.warn(e);
    camError();
  }
}
function camError() {
  $("#cam-error").hidden = false;
  shutter.disabled = true;
}
function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture() {
  if (!stream || !video.videoWidth) return;
  shutter.disabled = true;
  if ($("#timer").checked) {
    const cd = $("#countdown");
    for (let n = 3; n > 0; n--) {
      cd.textContent = n;
      cd.classList.remove("tick");
      void cd.offsetWidth;
      cd.classList.add("tick");
      await wait(900);
    }
    cd.textContent = "";
  }
  const flash = $("#flash");
  flash.classList.remove("on");
  void flash.offsetWidth;
  flash.classList.add("on");

  // Centre square crop of the live frame, mirrored for selfies (matches preview)
  const vw = video.videoWidth, vh = video.videoHeight;
  const s = Math.min(vw, vh);
  const snap = document.createElement("canvas");
  snap.width = snap.height = s;
  const c = snap.getContext("2d");
  if (facing === "user") { c.translate(s, 0); c.scale(-1, 1); }
  c.drawImage(video, (vw - s) / 2, (vh - s) / 2, s, s, 0, 0, s, s);

  shutter.disabled = false;
  await renderResult(snap);
}

/* ---------- Upload fallback ---------- */
function loadFile(file) {
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => { renderResult(img).finally(() => URL.revokeObjectURL(url)); };
  img.onerror = () => alert("Sorry, that image couldn't be opened.");
  img.src = url;
}

/* ---------- Frame rendering ---------- */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Text with letter spacing (works on browsers without ctx.letterSpacing)
function spacedWidth(ctx, text, spacing) {
  return [...text].reduce((w, ch) => w + ctx.measureText(ch).width + spacing, -spacing);
}
function drawSpaced(ctx, text, x, y, spacing, align = "left") {
  const w = spacedWidth(ctx, text, spacing);
  let cx = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prev;
  return w;
}

function colorBar(ctx, x, y, w, h, gap = 0) {
  const seg = (w - gap * (FRAME.colors.length - 1)) / FRAME.colors.length;
  FRAME.colors.forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.fillRect(x + i * (seg + gap), y, seg, h);
  });
}

function multiGradient(ctx, x0, y0, x1, y1) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  FRAME.colors.forEach((c, i) => g.addColorStop(i / (FRAME.colors.length - 1), c));
  return g;
}

async function drawFrame(source) {
  await Promise.all([
    document.fonts.load('800 96px "Outfit"'),
    document.fonts.load('600 40px "Outfit"'),
    document.fonts.load('600 24px "Inter"'),
  ]).catch(() => {});

  const W = FRAME.width, H = FRAME.height;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, FRAME.bg2);
  bg.addColorStop(1, FRAME.bg);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft colour glows from the palette
  const glows = [[0, 0], [W, 0], [0, H], [W, H]];
  glows.forEach(([gx, gy], i) => {
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 520);
    g.addColorStop(0, FRAME.colors[i] + "40");
    g.addColorStop(1, FRAME.colors[i] + "00");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  });

  // Subtle dot grid texture
  ctx.fillStyle = "rgba(255,255,255,0.045)";
  for (let y = 24; y < H; y += 36) for (let x = 24; x < W; x += 36) ctx.fillRect(x, y, 2, 2);

  // Top & bottom colour strips
  colorBar(ctx, 0, 0, W, 10);
  colorBar(ctx, 0, H - 10, W, 10);

  // Header
  ctx.textBaseline = "alphabetic";
  ctx.font = '600 23px "Inter", sans-serif';
  ctx.fillStyle = FRAME.muted;
  drawSpaced(ctx, "RAJARATA UNIVERSITY OF SRI LANKA", 60, 74, 3.5);
  ctx.fillStyle = FRAME.text;
  ctx.font = '600 23px "Inter", sans-serif';
  drawSpaced(ctx, "#MSClub", W - 60, 74, 0.5, "right");

  // Photo with gradient ring
  const px = 60, py = 110, ps = 960, pr = 44, ring = 7;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  roundRect(ctx, px - ring, py - ring, ps + ring * 2, ps + ring * 2, pr + ring);
  ctx.fillStyle = multiGradient(ctx, px, py, px + ps, py + ps);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, px, py, ps, ps, pr);
  ctx.clip();
  const sw = source.naturalWidth || source.width;
  const sh = source.naturalHeight || source.height;
  const scale = Math.max(ps / sw, ps / sh);
  const dw = sw * scale, dh = sh * scale;
  ctx.drawImage(source, px + (ps - dw) / 2, py + (ps - dh) / 2, dw, dh);
  // Gentle bottom fade inside photo for depth
  const fade = ctx.createLinearGradient(0, py + ps - 220, 0, py + ps);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = fade;
  ctx.fillRect(px, py + ps - 220, ps, 220);
  ctx.restore();

  // "2026" badge on the photo
  ctx.save();
  const bw = 150, bh = 56, bx = px + ps - bw - 28, by = py + 28;
  roundRect(ctx, bx, by, bw, bh, 28);
  ctx.fillStyle = "rgba(12,17,29,0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  FRAME.colors.forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(bx + 26 + (i % 2) * 12, by + 22 + Math.floor(i / 2) * 12, 4.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = FRAME.text;
  ctx.font = '700 28px "Outfit", sans-serif';
  ctx.textBaseline = "middle";
  ctx.fillText("2026", bx + 58, by + bh / 2 + 1);
  ctx.restore();

  // Bottom panel, centred: logo, event title, then RUSL 2026
  const cx = W / 2;
  const top = py + ps + ring;
  const logoReady = await frameLogo.decode().then(() => true, () => false);
  if (logoReady) {
    const logoW = 290;
    const logoH = logoW * (frameLogo.naturalHeight / frameLogo.naturalWidth);
    ctx.drawImage(frameLogo, cx - logoW / 2, top + 22, logoW, logoH);
  }

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = FRAME.text;
  ctx.font = '800 58px "Outfit", sans-serif';
  drawSpaced(ctx, "CLUB OPENING DAY", cx, top + 160, 3, "center");

  ctx.font = '600 30px "Outfit", sans-serif';
  const sub = "RUSL 2026";
  const subW = spacedWidth(ctx, sub, 12);
  ctx.fillStyle = multiGradient(ctx, cx - subW / 2, 0, cx + subW / 2, 0);
  drawSpaced(ctx, sub, cx, top + 206, 12, "center");

  // Thin rules either side of RUSL 2026
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.fillRect(cx - subW / 2 - 96, top + 195, 70, 2);
  ctx.fillRect(cx + subW / 2 + 26, top + 195, 70, 2);
}

async function renderResult(source) {
  show("result");
  rendering.hidden = false;
  resultImg.removeAttribute("src");
  await drawFrame(source);
  resultBlob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.93));
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  resultUrl = URL.createObjectURL(resultBlob);
  resultImg.src = resultUrl;
  resultImg.onload = () => { rendering.hidden = true; confetti(); };
}

/* ---------- Confetti ---------- */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
function confetti() {
  if (reduceMotion) return;
  const cv = $("#confetti");
  const cx = cv.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = innerWidth * dpr;
  cv.height = innerHeight * dpr;
  cx.scale(dpr, dpr);
  const palette = ["#b8ff2e", "#e9ffc2", "#ffffff", ...FRAME.colors];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 16,
    vy: -Math.random() * 15 - 5,
    s: Math.random() * 7 + 4,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    c: palette[(Math.random() * palette.length) | 0],
  }));
  let frame = 0;
  (function tick() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach((p) => {
      p.vy += 0.38;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.r += p.vr;
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.r);
      cx.fillStyle = p.c;
      cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      cx.restore();
    });
    if (++frame < 160) requestAnimationFrame(tick);
    else cx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

/* ---------- Download & share ---------- */
function download() {
  if (!resultUrl) return;
  const a = document.createElement("a");
  a.href = resultUrl;
  a.download = FILE_NAME;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function share() {
  if (!resultBlob) return;
  const file = new File([resultBlob], FILE_NAME, { type: "image/jpeg" });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "MS Club Opening Day 2026", text: SHARE_TEXT });
    } catch (e) {
      if (e.name !== "AbortError") console.warn(e);
    }
    return;
  }
  // Desktop / unsupported: save the image, then the user can post it
  download();
  $("#share-hint").innerHTML =
    "Downloaded! Post it on <b>LinkedIn</b> or <b>Facebook</b> and tag <b>MS Club</b>.";
}

/* ---------- Events ---------- */
$("#btn-start").addEventListener("click", () => { show("camera"); startCamera(); });
$("#btn-back").addEventListener("click", () => show("home"));
$("#btn-flip").addEventListener("click", () => {
  facing = facing === "user" ? "environment" : "user";
  startCamera();
});
shutter.addEventListener("click", capture);
$("#btn-retake").addEventListener("click", () => { show("camera"); startCamera(); });
$("#btn-download").addEventListener("click", download);
$("#btn-share").addEventListener("click", share);
document.querySelectorAll(".file-input").forEach((inp) =>
  inp.addEventListener("change", (e) => { loadFile(e.target.files[0]); e.target.value = ""; })
);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
  else if (screens.camera.classList.contains("active")) startCamera();
});
