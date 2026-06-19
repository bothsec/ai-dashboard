import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
const page = await browser.newPage({ viewport:{width:1280, height:800} });
await page.goto('http://localhost:8080/', {waitUntil:'load', timeout:20000});
await page.waitForTimeout(2000);

// Find the chat input area
const inputBox = await page.$('textarea, input[type="text"], [role="textbox"]');
const all = await page.evaluate(() => {
  const input = document.querySelector('textarea, input[type="text"], [role="textbox"]');
  if (!input) return 'no input found';
  const cs = getComputedStyle(input);
  const rect = input.getBoundingClientRect();
  // Get all siblings/parent layout
  const parent = input.parentElement;
  const parentCS = parent ? getComputedStyle(parent) : null;
  const grandparent = parent ? parent.parentElement : null;
  const gpCS = grandparent ? getComputedStyle(grandparent) : null;
  // Get all children of the chat container (the input row)
  const row = parent;
  const rowItems = row ? [...row.querySelectorAll('*')].map(el => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 5 || r.height < 5) return null;
    return { tag: el.tagName, cls: el.className.slice(0,60), rect: `${r.width}x${r.height} at ${r.left},${r.top}`, visible: el.offsetParent !== null, bg: s.backgroundColor, color: s.color };
  }).filter(Boolean) : [];
  return {
    inputClass: input.className.slice(0,80),
    inputRect: `${rect.width}x${rect.height} at ${rect.left},${rect.top}`,
    inputBg: cs.backgroundColor,
    inputBorder: cs.border,
    inputColor: cs.color,
    inputPadding: cs.padding,
    inputFontSize: cs.fontSize,
    rowBg: parentCS?.backgroundColor,
    rowPadding: parentCS?.padding,
    rowItems: rowItems,
  };
});
console.log(JSON.stringify(all, null, 2));
await browser.close();