// usage: node render.mjs <htmlFile> <out.png> <width> <height> [dpr]
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const [file, out, w, h, dpr = '1'] = process.argv.slice(2);
const tgt = await (await fetch('http://127.0.0.1:9555/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: +dpr, mobile: false });
await send('Page.navigate', { url: 'file://' + resolve(file) });
await new Promise(r => setTimeout(r, 2500));
await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(()=>1)', awaitPromise: true });
const shot = await send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
await send('Page.close').catch(() => {}); ws.close(); console.log('saved', out); process.exit(0);
