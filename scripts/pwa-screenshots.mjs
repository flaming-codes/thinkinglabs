import { chromium } from "@playwright/test";
import { existsSync, createReadStream, statSync, mkdirSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const OUT = path.join(repoRoot, "public/screenshots");
const distDir = path.join(repoRoot, "dist");

mkdirSync(OUT, { recursive: true });

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json",
};

async function getTargetServer() {
  const customUrl = process.env.SCREENSHOT_URL;
  if (customUrl) {
    return { url: customUrl, close: () => {} };
  }

  if (process.argv.includes("--remote")) {
    return { url: "https://thinkinglabs.run/", close: () => {} };
  }

  if (!existsSync(path.join(distDir, "index.html"))) {
    console.error("Error: dist/index.html not found. Run 'pnpm build' first.");
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    let reqPath = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    if (reqPath.endsWith("/")) reqPath += "index.html";
    let filePath = path.join(distDir, reqPath);
    if (existsSync(filePath) && statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!existsSync(filePath)) {
      filePath = path.join(distDir, "404.html");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => server.close(),
  };
}

const target = await getTargetServer();
console.log(`Capturing PWA screenshots from: ${target.url}`);

const browser = await chromium.launch();

try {
  //! Wide (desktop): 1280x720 — standard PWA wide size
  const desktop = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const dPage = await desktop.newPage();
  await dPage.goto(target.url, { waitUntil: "networkidle" });
  await dPage.evaluate(() => document.fonts.ready);
  await dPage.waitForTimeout(600);
  const desktopPng = await dPage.screenshot({ fullPage: false });
  const desktopWebpPath = path.join(OUT, "desktop-home.webp");
  const dInfo = await sharp(desktopPng).webp({ quality: 90, effort: 6 }).toFile(desktopWebpPath);
  console.log(
    `Saved desktop screenshot: ${desktopWebpPath} (${dInfo.width}x${dInfo.height}, ${dInfo.size} bytes)`,
  );
  await desktop.close();

  //! Narrow (mobile): 540x720 — standard PWA narrow size (portrait, fits Chrome install UI)
  const mobile = await browser.newContext({
    viewport: { width: 540, height: 720 },
    deviceScaleFactor: 1,
  });
  const mPage = await mobile.newPage();
  await mPage.goto(target.url, { waitUntil: "networkidle" });
  await mPage.evaluate(() => document.fonts.ready);
  await mPage.waitForTimeout(600);
  const mobilePng = await mPage.screenshot({ fullPage: false });
  const mobileWebpPath = path.join(OUT, "mobile-home.webp");
  const mInfo = await sharp(mobilePng).webp({ quality: 90, effort: 6 }).toFile(mobileWebpPath);
  console.log(
    `Saved mobile screenshot: ${mobileWebpPath} (${mInfo.width}x${mInfo.height}, ${mInfo.size} bytes)`,
  );
  await mobile.close();
} finally {
  await browser.close();
  target.close();
}

console.log("PWA screenshots successfully recreated.");
