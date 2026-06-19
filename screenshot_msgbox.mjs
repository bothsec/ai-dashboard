import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
const page = await browser.newPage({ viewport:{width:1280, height:800} });
await page.goto('http://localhost:8080/', {waitUntil:'load', timeout:20000});
await page.waitForTimeout(2000);
await page.screenshot({path:'/tmp/msgbox_full.png', fullPage:false});
// Also try to type something and see what the active state looks like
const input = page.locator('textarea, input[type="text"], [role="textbox"]').first();
await input.click();
await input.type('hello');
await page.waitForTimeout(500);
await page.screenshot({path:'/tmp/msgbox_active.png', fullPage:false});
// Check send button state now
const sendBtn = page.locator('button[aria-label="Send message"]');
const sendClass = await sendBtn.getAttribute('class');
const sendBg = await sendBtn.evaluate(el => getComputedStyle(el).backgroundColor);
console.log('Send btn class:', sendClass);
console.log('Send btn bg:', sendBg);
// Check the input row (container of input + buttons)
const inputEl = page.locator('textarea, input[type="text"], [role="textbox"]').first();
const inputBg = await inputEl.evaluate(el => getComputedStyle(el).backgroundColor);
const inputColor = await inputEl.evaluate(el => getComputedStyle(el).color);
console.log('Input bg:', inputBg);
console.log('Input text color:', inputColor);
console.log('Input class:', await inputEl.getAttribute('class'));
await browser.close();