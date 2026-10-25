// Иконки приложения: голова маскота «Чжу» (из src/js/04-game.js) в белом круге на оранжевом фоне НА ВЕСЬ КВАДРАТ —
// без прозрачных краёв (иначе лаунчер Android подкладывает белое). maskable — маскот в безопасной зоне (62%).
//   NODE_PATH=$(npm root -g) node tools/make_icons.cjs
// Нужен Playwright с Chromium (в облачной песочнице: /opt/pw-browsers/chromium-1194/chrome-linux/chrome).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'src/js/04-game.js'), 'utf8');
const mascot = new Function(src.slice(src.indexOf('const MC='), src.indexOf('function mascotRow(')) + '; return mascot;')();
const head = mascot('happy', 140, { head: 1 }).replace(/width="\d+" height="\d+"/, 'width="100%" height="100%"');
function page(px, scale) {
  return `<html><body style="margin:0"><div style="width:${px}px;height:${px}px;position:relative;overflow:hidden;
  background:radial-gradient(110% 90% at 50% 25%,#ffb020 0%,#ff9600 58%,#ee8200 100%)">
  <div style="position:absolute;left:50%;top:52%;width:${px * scale}px;height:${px * scale}px;transform:translate(-50%,-50%);border-radius:50%;background:#fff;box-shadow:0 ${px * 0.028}px 0 rgba(150,62,0,.30)"></div>
  <div style="position:absolute;left:50%;top:53.5%;width:${px * scale * 0.8}px;height:${px * scale * 0.8 * 76 / 104}px;transform:translate(-50%,-50%)">${head}</div>
  </div></body></html>`;
}
(async () => {
  const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const b = await chromium.launch(fs.existsSync(exe) ? { executablePath: exe } : {});
  const jobs = [['icon-512.png', 512, 0.74], ['icon-192.png', 192, 0.74], ['icon-180.png', 180, 0.74], ['icon-32.png', 32, 0.86],
    ['icon-maskable.png', 512, 0.62], ['icon-maskable-192.png', 192, 0.62]];
  for (const [f, px, sc] of jobs) {
    const p = await b.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
    await p.setContent(page(px, sc)); await p.waitForTimeout(100);
    await p.screenshot({ path: path.join(ROOT, f), clip: { x: 0, y: 0, width: px, height: px } }); await p.close();
    console.log(f);
  }
  await b.close();
})();
