import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true, args: ['--no-sandbox']});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 20000 });
await page.waitForTimeout(1200);
await page.click('button[aria-label="Tools"]');
await page.waitForSelector('[role="menu"]');
await page.click('[role="menuitem"]:has-text("Interview Prep")');
await page.waitForTimeout(800);
const data = await page.evaluate(() => {
  // Find Interview Prep modal: scroll body for h2 with that text
  const h2s = [...document.querySelectorAll('h2')];
  const t = h2s.find(h => h.textContent.includes('Interview Prep'));
  if (!t) return 'no h2';
  // Walk up to the modal root
  let modalRoot = t;
  while (modalRoot.parentElement) {
    modalRoot = modalRoot.parentElement;
    const cs = getComputedStyle(modalRoot);
    if (cs.position === 'fixed' && parseInt(cs.zIndex) >= 30) break;
  }
  if (!modalRoot) return 'no fixed root';
  const rootCs = getComputedStyle(modalRoot);
  // Find inner panel containing bg
  const candidates = [...modalRoot.querySelectorAll('div')].filter(d => {
    const s = getComputedStyle(d);
    return s.backgroundColor !== 'rgba(0, 0, 0, 0)' && d.offsetWidth > 300;
  });
  const panel = candidates[candidates.length - 1] || modalRoot;
  const panelCs = getComputedStyle(panel);
  return JSON.stringify({
    modalClass: modalRoot.className.slice(0, 80),
    modalBg: rootCs.backgroundColor,
    panelClass: panel.className.slice(0,120),
    panelBg: panelCs.backgroundColor,
    panelBorder: panelCs.borderColor,
    titleColor: getComputedStyle(t).color,
    khBtnColor: (() => {
      const btn = [...modalRoot.querySelectorAll('button')].find(b => b.textContent.trim() === 'KH' || b.textContent.trim() === 'EN');
      return btn ? { bg: getComputedStyle(btn).backgroundColor, color: getComputedStyle(btn).color } : null;
    })(),
    closeColor: (() => {
      const btn = modalRoot.querySelector('button[aria-label="Close"]');
      return btn ? getComputedStyle(btn).color : null;
    })(),
  }, null, 2);
});
console.log(data);
await browser.close();
