// scripts/screenshot.cjs — 截取 v0.1 所有关键页面
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const PAGES = [
  { name: "01-home", url: "http://localhost:3000/" },
  { name: "02-qa", url: "http://localhost:3000/qa" },
  { name: "03-medicine", url: "http://localhost:3000/medicine" },
  { name: "04-membership", url: "http://localhost:3000/membership" },
  { name: "05-updates", url: "http://localhost:3000/updates" },
  { name: "06-profile", url: "http://localhost:3000/profile" },
  { name: "07-admin", url: "http://localhost:3000/admin" },
  { name: "08-pets", url: "http://localhost:3000/pets" },
  { name: "09-pet-detail", url: "http://localhost:3000/pets/pet_demo_1" },
  { name: "10-pet-new", url: "http://localhost:3000/pets/new" },
];

const OUT_DIR = path.join(__dirname, "artifacts", "verification", "v0.1", "screenshots");
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
      console.log(`✓ ${p.name}  ${(sz/1024).toFixed(1)}KB`);
    } catch (e) {
      console.log(`✗ ${p.name}  ${e.message}`);
    }
  }
  await browser.close();
  console.log(`\nScreenshots saved to: ${OUT_DIR}`);
})();
