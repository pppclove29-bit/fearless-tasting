// usage: node capture.mjs <name> <url> [setupJs] [waitMs]
// headless Chrome(9555)에 붙어 390x844 @3x 로 PNG 캡처
import { writeFileSync, readFileSync } from 'node:fs';
const [name, url, setup = '', waitMs = '3500'] = process.argv.slice(2);
const dir = new URL('.', import.meta.url).pathname;
const token = readFileSync(dir + 'token.txt', 'utf8').trim();
const tgt = await (await fetch('http://127.0.0.1:9555/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
await send('Page.navigate', { url: 'http://localhost:4321/about' });
await sleep(1500);
await send('Runtime.evaluate', { expression: `localStorage.setItem('access_token', ${JSON.stringify(token)}); localStorage.setItem('refresh_token','x'); localStorage.setItem('onboarding_completed','1'); localStorage.setItem('pwa_banner_dismissed', String(Date.now())); 1` });
await send('Page.navigate', { url });
await sleep(Number(waitMs));
const clean = `document.documentElement.classList.add('native-app'); document.querySelector('astro-dev-toolbar')?.remove(); document.getElementById('pwa-banner')?.remove(); 1`;
await send('Runtime.evaluate', { expression: clean });
if (setup) { const r = await send('Runtime.evaluate', { expression: `(async()=>{${setup}})()`, awaitPromise: true }); if (r.result?.exceptionDetails) console.error('setup error', JSON.stringify(r.result.exceptionDetails).slice(0, 300)); await sleep(1500); }
await send('Runtime.evaluate', { expression: clean });
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(`${dir}raw/${name}.png`, Buffer.from(shot.result.data, 'base64'));
await send('Page.close').catch(() => {});
ws.close();
console.log('saved', name);
process.exit(0);
