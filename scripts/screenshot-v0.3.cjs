// scripts/screenshot-v0.3.cjs — v0.3 截图
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const PAGES = [
  { name: "01-home-v0.3", url: "http://localhost:3002/" },
  { name: "02-profile-v0.3", url: "http://localhost:3002/profile" },
  { name: "03-achievements", url: "http://localhost:3002/achievements" },
  { name: "04-age-converter", url: "http://localhost:3002/age-converter" },
  { name: "05-courses", url: "http://localhost:3002/courses" },
  { name: "06-course-detail", url: "http://localhost:3002/courses/c1" },
  { name: "07-tasks", url: "http://localhost:3002/tasks" },
  { name: "08-pet-talk", url: "http://localhost:3002/pet-talk" },
  { name: "09-report", url: "http://localhost:3002/report" },
];

const OUT_DIR = path.join(__dirname, "..", "artifacts", "verification", "v0.3", "screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  for (const p of PAGES) {
    const file = path.join(OUT_DIR, `${p.name}.png`);
    try {
      await page.goto(p.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`OK ${p.name}  ${(fs.statSync(file).size/1024).toFixed(1)}KB`);
    } catch (e) {
      console.log(`FAIL ${p.name}  ${e.message}`);
    }
  }
  await browser.close();
})();
