// scripts/screenshot-v0.2.cjs — v0.2 截图
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const PAGES = [
  { name: "01-home-v0.2", url: "http://localhost:3001/" },
  { name: "02-profile-v0.2", url: "http://localhost:3001/profile" },
  { name: "03-reminders", url: "http://localhost:3001/reminders" },
  { name: "04-reminder-new", url: "http://localhost:3001/reminders/new" },
  { name: "05-reminder-detail", url: "http://localhost:3001/reminders/rem_1" },
  { name: "06-checkin-home", url: "http://localhost:3001/checkin" },
  { name: "07-checkin-health", url: "http://localhost:3001/checkin/health" },
  { name: "08-checkin-walk", url: "http://localhost:3001/checkin/walk" },
  { name: "09-checkin-history", url: "http://localhost:3001/checkin/history" },
  { name: "10-pet-detail-v0.2", url: "http://localhost:3001/pets/pet_demo_1" },
  { name: "11-pet-weight", url: "http://localhost:3001/pets/pet_demo_1/weight" },
  { name: "12-pet-share", url: "http://localhost:3001/pets/pet_demo_1/share" },
  { name: "13-places-list", url: "http://localhost:3001/places" },
  { name: "14-place-detail", url: "http://localhost:3001/places/p1" },
  { name: "15-food-list", url: "http://localhost:3001/food" },
  { name: "16-food-detail", url: "http://localhost:3001/food/f1" },
];

const OUT_DIR = path.join(__dirname, "..", "artifacts", "verification", "v0.2", "screenshots");
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });
  const page = await context.newPage();
  for (const p of PAGES) {
    const file = path.join(OUT_DIR, `${p.name}.png`);
    try {
      await page.goto(p.url, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForTimeout(800);
      await page.screenshot({ path: file, fullPage: true });
      const sz = fs.statSync(file).size;
      console.log(`OK ${p.name}  ${(sz/1024).toFixed(1)}KB`);
    } catch (e) {
      console.log(`FAIL ${p.name}  ${e.message}`);
    }
  }
  await browser.close();
  console.log(`\nDone: ${OUT_DIR}`);
})();
