import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true, args: ['--no-sandbox']});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

async function captureModal(menuLabel, titleNeedle) {
  await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(1200);
  await page.click('button[aria-label="Tools"]');
  await page.waitForSelector('[role="menu"]', { timeout: 5000 });
  await page.click(`[role="menuitem"]:has-text("${menuLabel}")`);
  await page.waitForTimeout(800);
  return await page.evaluate((needle) => {
    function findTextRoot(needle) {
      const all = [...document.querySelectorAll('h1,h2,h3,h4,div,span')];
      const hit = all.find(el => el.textContent.includes(needle) && el.children.length < 4);
      if (!hit) return null;
      let root = hit;
      while (root.parentElement) {
        root = root.parentElement;
        const cs = getComputedStyle(root);
        if (cs.position === 'fixed' && parseInt(cs.zIndex) >= 30) break;
      }
      return root;
    }
    const root = findTextRoot(needle);
    if (!root) return null;
    // Find the deepest inner panel with non-transparent background
    const candidates = [...root.querySelectorAll('div')].filter(d => {
      if (d.offsetParent === null) return false;
      const cs = getComputedStyle(d);
      return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && d.getBoundingClientRect().width > 250;
    });
    const panel = candidates.find(d => /rounded/.test(d.className)) || candidates[0];
    if (!panel) return null;
    const cs = getComputedStyle(panel);
    return {
      visible: panel.offsetParent !== null,
      panelBg: cs.backgroundColor,
      panelBorder: cs.borderColor + ' (' + cs.borderWidth + ')',
      panelClass: panel.className.slice(0, 140),
      titleFound: (panel.querySelector('h1,h2,h3')?.textContent || '').trim().slice(0, 60),
    };
  }, titleNeedle);
}

const r = {};
r.workplaceTips = await captureModal('Khmer Workplace Tips', 'Khmer Workplace Tips');
r.interviewPrep = await captureModal('Interview Prep', 'Interview Prep');

await browser.close();
for (const [k, v] of Object.entries(r)) console.log(k + ': ' + JSON.stringify(v, null, 2));
