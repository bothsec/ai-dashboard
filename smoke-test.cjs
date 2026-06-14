const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
  const title = await page.title();
  const hasContent = (await page.locator('body').innerText()).length > 0;
  await browser.close();
  console.log('Title:', title);
  console.log('Has content:', hasContent);
  console.log('Console errors:', errors.length === 0 ? 'none' : errors.join(' | '));
  console.log('STATUS:', errors.length === 0 ? 'PASS' : 'FAIL');
})();