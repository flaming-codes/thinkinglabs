import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = "/Users/tom/Github/thinkinglabs/public/screenshots";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

// Wide (desktop): 1280x720 — standard PWA wide size
const desktop = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  deviceScaleFactor: 1,
});
const dPage = await desktop.newPage();
await dPage.goto("https://thinkinglabs.run/", { waitUntil: "networkidle" });
await dPage.waitForTimeout(800);
await dPage.screenshot({ path: `${OUT}/desktop-home.png`, fullPage: false });
await desktop.close();

// Narrow (mobile): 540x720 — standard PWA narrow size (portrait, fits Chrome's install UI)
const mobile = await browser.newContext({
  viewport: { width: 540, height: 720 },
  deviceScaleFactor: 1,
});
const mPage = await mobile.newPage();
await mPage.goto("https://thinkinglabs.run/", { waitUntil: "networkidle" });
await mPage.waitForTimeout(800);
await mPage.screenshot({ path: `${OUT}/mobile-home.png`, fullPage: false });
await mobile.close();

await browser.close();
console.log("done");
