import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true, args: ['--no-sandbox']});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('pageerror', e => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:8080/', { waitUntil: 'load', timeout: 20000 });
await page.waitForTimeout(1500);
const toolsBtn = await page.$('button[aria-label="Tools"]');
console.log('tools button found:', !!toolsBtn, 'visible:', toolsBtn ? await toolsBtn.isVisible() : false);
if (toolsBtn) {
  await toolsBtn.click();
  await page.waitForSelector('[role="menu"]', { timeout: 3000 });
  await page.click('[role="menuitem"]:has-text("Interview Prep")');
  await page.waitForTimeout(800);
  const data = await page.evaluate(() => {
    const all = [...document.querySelectorAll('div.fixed.inset-0.z-50')];
    const last = all.find(d => d.offsetParent !== null);
    if (!last) return null;
    const panel = last.querySelector('div.relative, div[class*="rounded-2xl"]');
    if (!panel) return null;
    const cs = getComputedStyle(panel);
    const body = last;
    return {
      panelBg: cs.backgroundColor, panelBorder: cs.borderColor,
      panelClass: panel.className.slice(0,100),
      panelInnerHTML: panel.outerHTML.slice(0,300),
      titleColor: getComputedStyle(panel.querySelector('h2')).color,
      titleText: panel.querySelector('h2')?.textContent,
      khBtnBg: (() => {
        const btn = [...panel.querySelectorAll('button')].find(b => b.textContent.trim() === 'KH' || b.textContent.trim() === 'EN');
        return btn ? getComputedStyle(btn).backgroundColor : null;
      })(),
      closeXBtnColor: (() => {
        const btn = panel.querySelector('button[aria-label="Close"]');
        return btn ? getComputedStyle(btn).color : null;
      })(),
    };
  });
  console.log(JSON.stringify(data, null, 2));
}
await browser.close();
