import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const rootDir = "/Users/saxon/Documents/GitHub/H";
const publicBrandDir = path.join(rootDir, "halo-forge", "public", "brand");

// Read fonts to base64
const geistWoff2 = fs.readFileSync(
  path.join(rootDir, "halo-forge/node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2")
).toString("base64");

const geistMonoWoff2 = fs.readFileSync(
  path.join(rootDir, "halo-forge/node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2")
).toString("base64");

const fontStyles = `
  @font-face {
    font-family: 'Geist';
    font-style: normal;
    font-display: swap;
    font-weight: 100 900;
    src: url('data:font/woff2;base64,${geistWoff2}') format('woff2');
  }
  @font-face {
    font-family: 'Geist Mono';
    font-style: normal;
    font-display: swap;
    font-weight: 100 900;
    src: url('data:font/woff2;base64,${geistMonoWoff2}') format('woff2');
  }
`;

const commonDefs = `
  <defs>
    <style>
      ${fontStyles}
      .font-sans { font-family: 'Geist', -apple-system, sans-serif; }
      .font-mono { font-family: 'Geist Mono', monospace; }
    </style>
    <radialGradient id="softCenterGlow" cx="50%" cy="50%" r="55%">
      <stop offset="0%" stop-color="#141310" stop-opacity="1" />
      <stop offset="70%" stop-color="#090909" stop-opacity="1" />
    </radialGradient>
    <linearGradient id="markTop" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f5f3eb" />
    </linearGradient>
    <linearGradient id="markLeft" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f5f3eb" />
      <stop offset="100%" stop-color="#e8e4d8" />
    </linearGradient>
    <linearGradient id="markRight" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ded9cb" />
      <stop offset="100%" stop-color="#cfc9ba" />
    </linearGradient>
  </defs>
`;

// ===============================================================
// PRIMARY BANNER: Pure Wordmark Lockup (Ultra-Simplistic)
// ===============================================================
function bannerWordmarkOnly() {
  const startX = 575; // Centers ~350px unit at x=750

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 500" width="1500" height="500">
  ${commonDefs}
  <rect width="1500" height="500" fill="#090909" />
  <rect width="1500" height="500" fill="url(#softCenterGlow)" />

  <!-- Exactly centered vertically and horizontally -->
  <g transform="translate(${startX}, 225)">
    <!-- ForgeMark (height 54px) -->
    <g transform="scale(0.96)">
      <path d="M32 4 56 18 44 25 32 18 20 25 8 18 32 4Z" fill="url(#markTop)" />
      <path d="M56 21v25L34 59V45l10-6V28l12-7Z" fill="url(#markRight)" />
      <path d="m8 21 12 7v11l10 6v14L8 46V21Z" fill="url(#markLeft)" />
    </g>

    <!-- haloforge -->
    <text x="68" y="44" class="font-sans" font-size="56" letter-spacing="-0.04em">
      <tspan font-weight="650" fill="#f5f3eb">halo</tspan><tspan font-weight="400" fill="#f5f3eb">forge</tspan>
    </text>

    <!-- LAB badge -->
    <g transform="translate(328, 20)">
      <rect width="44" height="24" rx="3" fill="#1b1915" stroke="#4e4738" stroke-width="1" />
      <text x="22" y="16.5" class="font-sans" font-size="11" font-weight="650" fill="#c8b990" text-anchor="middle" letter-spacing="0.08em">LAB</text>
    </g>
  </g>
</svg>`;
}

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function renderSvg(svgContent, outPath, width, height) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;background:#000;overflow:hidden;}svg{display:block;width:100vw;height:100vh;}</style></head><body>${svgContent}</body></html>`;
  const tmpPath = `/tmp/render-${Date.now()}-${Math.random().toString(36).slice(2)}.html`;
  fs.writeFileSync(tmpPath, html);
  execSync(`"${chromePath}" --headless=new --screenshot="${outPath}" --window-size=${width},${height} "file://${tmpPath}"`);
  fs.unlinkSync(tmpPath);
}

// Overwrite twitter-banner with ultra-simple wordmark banner
const svg = bannerWordmarkOnly();
fs.writeFileSync(path.join(publicBrandDir, "twitter-banner.svg"), svg);
renderSvg(svg, path.join(publicBrandDir, "twitter-banner.png"), 1500, 500);
renderSvg(svg, path.join(publicBrandDir, "twitter-banner-2x.png"), 3000, 1000);
console.log("twitter-banner.png set to ultra-simple wordmark!");

// Update profile mockup
const profileMockupHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  ${fontStyles}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #000000;
    color: #e7e9ea;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    display: flex;
    justify-content: center;
  }
  .container {
    width: 1000px;
    background: #000000;
    border-left: 1px solid #2f3336;
    border-right: 1px solid #2f3336;
    min-height: 100vh;
  }
  .banner-wrap {
    width: 100%;
    height: 333px;
    position: relative;
    background: #090909;
  }
  .banner-wrap img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .profile-section {
    padding: 0 24px 24px;
    position: relative;
  }
  .avatar-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-top: -68px;
    margin-bottom: 16px;
  }
  .avatar {
    width: 136px;
    height: 136px;
    border-radius: 50%;
    border: 4px solid #000000;
    background: #090909;
    overflow: hidden;
  }
  .avatar img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .follow-btn {
    background: #eff3f4;
    color: #0f1419;
    font-weight: 700;
    font-size: 15px;
    padding: 8px 18px;
    border-radius: 9999px;
    border: none;
    cursor: pointer;
  }
  .name-row {
    margin-bottom: 12px;
  }
  .name {
    font-size: 20px;
    font-weight: 800;
    color: #e7e9ea;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .handle {
    font-size: 15px;
    color: #71767b;
    margin-top: 2px;
  }
  .bio {
    font-size: 15px;
    line-height: 1.45;
    color: #e7e9ea;
    margin-bottom: 14px;
    max-width: 600px;
  }
  .meta {
    display: flex;
    gap: 18px;
    font-size: 14px;
    color: #71767b;
    margin-bottom: 14px;
  }
  .meta span { display: flex; align-items: center; gap: 4px; }
  .stats {
    display: flex;
    gap: 20px;
    font-size: 14px;
    color: #71767b;
  }
  .stats b { color: #e7e9ea; }
  .tabs {
    display: flex;
    border-bottom: 1px solid #2f3336;
    margin-top: 16px;
  }
  .tab {
    flex: 1;
    text-align: center;
    padding: 14px 0;
    font-size: 15px;
    font-weight: 700;
    color: #71767b;
  }
  .tab.active {
    color: #e7e9ea;
    border-bottom: 4px solid #c2a66b;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="banner-wrap">
      <img src="file://${path.join(publicBrandDir, "twitter-banner.png")}" />
    </div>
    <div class="profile-section">
      <div class="avatar-row">
        <div class="avatar">
          <img src="file://${path.join(publicBrandDir, "twitter-avatar.png")}" />
        </div>
        <button class="follow-btn">Follow</button>
      </div>
      <div class="name-row">
        <div class="name">
          Halo Forge <span style="font-size:11px; padding:2px 6px; border-radius:4px; background:#1b1915; border:1px solid #4e4738; color:#c8b990; font-family:'Geist Mono',monospace;">LAB</span>
        </div>
        <div class="handle">@HaloForgeLab</div>
      </div>
      <div class="bio">
        A cryptography research-agent workspace for the proposed ZEC-paired token launchpad on Solana. Evidence before rewards. Measured. Reviewed. Reproducible.
      </div>
      <div class="meta">
        <span>🔗 <span style="color:#d7c7a5;">halozec.tech</span></span>
        <span>📍 Solana / Zcash</span>
        <span>📅 Joined October 2026</span>
      </div>
      <div class="stats">
        <span><b>142</b> Following</span>
        <span><b>1,840</b> Followers</span>
      </div>
      <div class="tabs">
        <div class="tab active">Posts</div>
        <div class="tab">Research</div>
        <div class="tab">Highlights</div>
        <div class="tab">Media</div>
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync("/tmp/profile-mockup.html", profileMockupHtml);
execSync(`"${chromePath}" --headless=new --screenshot="${path.join(publicBrandDir, "twitter-profile-mockup.png")}" --window-size=1080,720 "file:///tmp/profile-mockup.html"`);
console.log("twitter-profile-mockup.png updated!");

// Update index.html
const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Halo Forge · Twitter / X Brand Kit</title>
<style>
  ${fontStyles}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    background: #090909;
    color: #f5f3eb;
    font-family: 'Geist', -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .shell {
    max-width: 1200px;
    margin: 0 auto;
    padding: 48px 24px 96px;
  }
  header {
    border-bottom: 1px solid #22211d;
    padding-bottom: 24px;
    margin-bottom: 48px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .brand-tag {
    font-family: 'Geist Mono', monospace;
    font-size: 11px;
    color: #c2a66b;
    letter-spacing: 0.12em;
    margin-bottom: 8px;
  }
  h1 {
    font-size: 34px;
    font-weight: 650;
    margin: 0 0 6px;
    letter-spacing: -0.03em;
  }
  .subtitle {
    color: #a9a69e;
    font-size: 15px;
    margin: 0;
  }
  .back-link {
    font-family: 'Geist Mono', monospace;
    font-size: 12px;
    color: #c8b990;
    text-decoration: none;
    border: 1px solid #33312b;
    padding: 8px 14px;
    border-radius: 4px;
    transition: all 0.15s;
  }
  .back-link:hover {
    background: #141310;
    border-color: #c2a66b;
  }
  .section {
    margin-bottom: 64px;
  }
  .section-title {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.02em;
    margin: 0 0 8px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .section-title span.dim {
    font-family: 'Geist Mono', monospace;
    font-size: 12px;
    color: #625d52;
    font-weight: 400;
  }
  .section-desc {
    color: #a9a69e;
    font-size: 14px;
    margin: 0 0 20px;
  }
  .card {
    background: #111111;
    border: 1px solid #2c2b27;
    border-radius: 6px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .preview-wrap {
    background: #050505;
    border: 1px solid #1f1e1a;
    border-radius: 4px;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
  }
  .preview-wrap img {
    max-width: 100%;
    height: auto;
    display: block;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }
  .avatar-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 24px;
    margin-top: 20px;
  }
  .avatar-card {
    background: #0d0d0c;
    border: 1px solid #22211d;
    border-radius: 6px;
    padding: 24px;
    text-align: center;
  }
  .avatar-preview-circle {
    width: 160px;
    height: 160px;
    border-radius: 50%;
    border: 2px solid #33312b;
    margin: 0 auto 16px;
    overflow: hidden;
    background: #090909;
  }
  .avatar-preview-square {
    width: 160px;
    height: 160px;
    border-radius: 6px;
    border: 1px solid #33312b;
    margin: 0 auto 16px;
    overflow: hidden;
    background: #090909;
  }
  .avatar-card img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .card-name {
    font-weight: 600;
    font-size: 15px;
    margin-bottom: 4px;
  }
  .card-meta {
    font-family: 'Geist Mono', monospace;
    font-size: 11px;
    color: #625d52;
    margin-bottom: 16px;
  }
  .btn-group {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .btn {
    font-family: 'Geist Mono', monospace;
    font-size: 11px;
    padding: 6px 12px;
    border-radius: 3px;
    text-decoration: none;
    border: 1px solid #33312b;
    color: #eee9dd;
    background: #181714;
    transition: all 0.15s;
  }
  .btn:hover {
    background: #242320;
    border-color: #c2a66b;
    color: #ffd775;
  }
  .btn-primary {
    background: #f5f3ed;
    color: #12100a;
    border-color: #f5f3ed;
    font-weight: 600;
  }
  .btn-primary:hover {
    background: #ffffff;
    color: #000000;
  }
  .variants-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 20px;
  }
  @media (max-width: 800px) {
    .variants-row { grid-template-columns: 1fr; }
  }
</style>
</head>
<body>
  <div class="shell">
    <header>
      <div>
        <div class="brand-tag">● HALO FORGE LAB // BRAND SYSTEM</div>
        <h1>Twitter / X Brand Assets</h1>
        <p class="subtitle">Ultra-simplistic profile picture (avatar) and header banner matching the Halo Forge dark aesthetic.</p>
      </div>
      <div>
        <a class="back-link" href="/">← Return to Forge App</a>
      </div>
    </header>

    <!-- SECTION 1: LIVE TWITTER PROFILE MOCKUP -->
    <div class="section">
      <h2 class="section-title">Live Profile Mockup <span class="dim">In-situ preview</span></h2>
      <p class="section-desc">Shows how the ultra-simplistic banner and circular avatar look together on a Twitter / X profile page.</p>
      <div class="card">
        <div class="preview-wrap">
          <img src="twitter-profile-mockup.png" alt="Twitter Profile Mockup" />
        </div>
      </div>
    </div>

    <!-- SECTION 2: SIMPLISTIC BANNER (PRIMARY) -->
    <div class="section">
      <h2 class="section-title">Official Twitter Header Banner <span class="dim">Ultra-Simplistic · 1500 × 500 px (3:1)</span></h2>
      <p class="section-desc">Pure restraint. Just the iconic brand lockup centered in deep obsidian space with a soft ambient glow. Zero extra text, zero telemetry, zero borders.</p>
      <div class="card">
        <div class="preview-wrap">
          <img src="twitter-banner.png" alt="Twitter Header Banner" />
        </div>
        <div style="margin-top:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
          <div>
            <div style="font-weight:600; font-size:15px;">Ultra-Simplistic Wordmark Banner (Primary)</div>
            <div style="font-family:'Geist Mono',monospace; font-size:12px; color:#a9a69e;">Standard: 1500×500 px · Retina: 3000×1000 px · Scalable Vector: SVG</div>
          </div>
          <div class="btn-group">
            <a class="btn btn-primary" href="twitter-banner.png" download>Download PNG (1500×500)</a>
            <a class="btn" href="twitter-banner-2x.png" download>Retina 2x PNG (3000×1000)</a>
            <a class="btn" href="twitter-banner.svg" download>Vector SVG</a>
          </div>
        </div>
      </div>

      <!-- ALTERNATIVE ULTRA-SIMPLE BANNER STYLES -->
      <div class="variants-row">
        <!-- Variant A: Mark Only (No text at all) -->
        <div class="card" style="margin-bottom:0;">
          <div style="font-weight:600; font-size:14px; margin-bottom:4px;">Monolith Mark Only (Zero Words)</div>
          <div style="font-family:'Geist Mono',monospace; font-size:11px; color:#625d52; margin-bottom:12px;">Only the monumental ForgeMark anvil glyph centered in deep space.</div>
          <div class="preview-wrap" style="padding:10px;">
            <img src="twitter-banner-mark-only.png" alt="Mark Only Banner" />
          </div>
          <div class="btn-group" style="margin-top:14px;">
            <a class="btn" href="twitter-banner-mark-only.png" download>Download PNG</a>
            <a class="btn" href="twitter-banner-mark-only.svg" download>SVG</a>
          </div>
        </div>

        <!-- Variant B: Wordmark + Single Line -->
        <div class="card" style="margin-bottom:0;">
          <div style="font-weight:600; font-size:14px; margin-bottom:4px;">Wordmark + Single Descriptor Line</div>
          <div style="font-family:'Geist Mono',monospace; font-size:11px; color:#625d52; margin-bottom:12px;">Brand lockup + "Cryptography research-agent workspace".</div>
          <div class="preview-wrap" style="padding:10px;">
            <img src="twitter-banner-minimal-descriptor.png" alt="Minimal Descriptor Banner" />
          </div>
          <div class="btn-group" style="margin-top:14px;">
            <a class="btn" href="twitter-banner-minimal-descriptor.png" download>Download PNG</a>
            <a class="btn" href="twitter-banner-minimal-descriptor.svg" download>SVG</a>
          </div>
        </div>
      </div>
    </div>

    <!-- SECTION 3: TWITTER AVATAR / LOGO -->
    <div class="section">
      <h2 class="section-title">Twitter Profile Picture / Avatar <span class="dim">800 × 800 px (1:1)</span></h2>
      <p class="section-desc">Designed for Twitter's circular crop with 40% breathing margin. Remains crisp and legible at both 800px profile views and 36px timeline/feed icon sizes.</p>
      <div class="avatar-grid">
        <!-- Variant 1: Faceted -->
        <div class="avatar-card">
          <div class="avatar-preview-circle">
            <img src="twitter-avatar.png" alt="Faceted Avatar" />
          </div>
          <div class="card-name">Faceted ForgeMark (Recommended)</div>
          <div class="card-meta">Subtle 3D titanium lighting on facets</div>
          <div class="btn-group">
            <a class="btn btn-primary" href="twitter-avatar.png" download>PNG (800×800)</a>
            <a class="btn" href="twitter-avatar-2x.png" download>2x PNG</a>
            <a class="btn" href="twitter-avatar.svg" download>SVG</a>
          </div>
        </div>

        <!-- Variant 2: Flat Canonical -->
        <div class="avatar-card">
          <div class="avatar-preview-circle">
            <img src="twitter-avatar-flat.png" alt="Flat Avatar" />
          </div>
          <div class="card-name">Flat Canonical ForgeMark</div>
          <div class="card-meta">Pure solid #f5f3eb matching navbar</div>
          <div class="btn-group">
            <a class="btn" href="twitter-avatar-flat.png" download>PNG (800×800)</a>
            <a class="btn" href="twitter-avatar-flat-2x.png" download>2x PNG</a>
            <a class="btn" href="twitter-avatar-flat.svg" download>SVG</a>
          </div>
        </div>

        <!-- Variant 3: Square Master -->
        <div class="avatar-card">
          <div class="avatar-preview-square">
            <img src="twitter-avatar.png" alt="Square Master" />
          </div>
          <div class="card-name">Square Master Icon</div>
          <div class="card-meta">Full 800×800 square with tick marks</div>
          <div class="btn-group">
            <a class="btn" href="twitter-avatar-preview.png" target="_blank">View Sizes Preview</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

fs.writeFileSync(path.join(publicBrandDir, "index.html"), indexHtml);
console.log("Brand index.html updated successfully!");
