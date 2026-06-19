import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function openModal(label) {
  await page.goto('http://localhost:8080/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('button[aria-label="Tools"]', { timeout: 10000 });
  await page.click('button[aria-label="Tools"]');
  await page.waitForSelector('[role="menu"]', { timeout: 3000 });
  await page.click(`[role="menuitem"]:has-text("${label}")`);
  await page.waitForTimeout(500);
  return await page.evaluate(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) return null;
    const panel = dialog.querySelector('div.relative');
    if (!panel) return null;
    const cs = getComputedStyle(panel);
    const samples = [];
    for (const el of panel.querySelectorAll('h1,h2,h3,button,div')) {
      if (samples.length >= 6) break;
      const s = getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const txt = el.textContent.trim().slice(0,28);
      if (!txt) continue;
      samples.push({ tag: el.tagName, text: txt, color: s.color, bg: s.backgroundColor, fontSize: s.fontSize, fontWeight: s.fontWeight });
    }
    return { panelBg: cs.backgroundColor, panelBorder: cs.borderColor, samples };
  });
}

const tp = await openModal('Khmer Workplace Tips');
console.log('WORKPLACE TIPS:', JSON.stringify(tp, null, 2));
const iv = await openModal('Interview Prep');
console.log('INTERVIEW PREP:', JSON.stringify(iv, null, 2));
await browser.close();
