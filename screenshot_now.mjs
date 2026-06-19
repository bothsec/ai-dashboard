import { chromium } from 'playwright';
const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
const page = await browser.newPage({ viewport:{width:375, height:812} }); // iPhone size
await page.goto('http://localhost:8080/', {waitUntil:'load', timeout:20000});
await page.waitForTimeout(2000);
await page.screenshot({path:'/tmp/msgbox_mobile.png', fullPage:false});
// Also desktop
await page.setViewportSize({width:1280, height:800});
await page.waitForTimeout(300);
await page.screenshot({path:'/tmp/msgbox_desktop.png', fullPage:false});
console.log('done');
await browser.close();