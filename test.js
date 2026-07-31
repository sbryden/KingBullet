const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  console.log('Clicking START button...');
  await page.click('#start-btn');
  
  // Wait a bit for any errors
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
