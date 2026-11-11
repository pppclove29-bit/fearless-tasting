// 캡션 + 폰 목업 HTML 생성 → render.mjs 로 1080x1920 PNG
import { writeFileSync } from 'node:fs';
const shots = [
  ['01-list', '우리끼리 보는', '맛집 리스트', '친구·연인·팀과 함께 쌓는 비공개 맛집 기록장'],
  ['03-reviews', '광고 없는', '진짜 평가', '같은 식당, 멤버별 솔직한 별점과 한 줄'],
  ['07-add', '별점만 눌러도', '기록 끝', '나머지는 원할 때만 채우면 돼요'],
  ['06-recommend', '오늘 뭐 먹지?', '버튼 한 번', '우리 방 기록으로 골라주는 추천', -421],
  ['04-poll', '회식 장소는', '투표로 정해요', '링크만 보내면 가입 없이 바로 투표', -421],
  ['08-invite', 'QR 한 번이면', '친구 초대 끝', '카카오톡 링크로도 바로 초대'],
  ['05-stats', '우리 방 취향이', '데이터로 쌓여요', '멤버별 성향과 방문 패턴까지 한눈에'],
  ['02-detail', '멤버 평균으로 보는', '진짜 맛집 점수', '맛·가성비·서비스·청결 세부 평점'],
];
const css = `
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1920px;overflow:hidden;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
 background:radial-gradient(900px 700px at 50% 30%, rgba(255,196,0,.20), transparent 70%), #0f1012;color:#fff;position:relative}
.cap{position:absolute;top:150px;left:0;right:0;text-align:center}
.l1{font-size:84px;font-weight:800;letter-spacing:-2px;line-height:1.15;color:#fff}
.l2{font-size:96px;font-weight:800;letter-spacing:-2.5px;line-height:1.15;color:#FFD43B}
.sub{margin-top:34px;font-size:40px;font-weight:500;color:#b8b9bd;letter-spacing:-.5px}
.phone{position:absolute;left:50%;top:640px;transform:translateX(-50%);width:820px;height:1500px;border-radius:96px;
 background:#1d1e21;padding:22px;box-shadow:0 0 0 3px #2c2d31, 0 40px 120px rgba(0,0,0,.6)}
.screen{width:100%;height:100%;border-radius:76px;overflow:hidden;background:#111}
.screen img{width:100%;display:block}
.notch{position:absolute;top:44px;left:50%;transform:translateX(-50%);width:150px;height:40px;border-radius:20px;background:#000;z-index:2}`;
for (const [i, [img, a, b, sub, shift = 0]] of shots.entries()) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>
<div class="cap"><div class="l1">${a}</div><div class="l2">${b}</div><div class="sub">${sub}</div></div>
<div class="phone"><div class="screen"><img src="raw/${img}.png" style="transform:translateY(${shift}px)"></div></div></body></html>`;
  writeFileSync(`shot-${i + 1}.html`, html);
}
// 피처 그래픽 1024x500
writeFileSync('feature.html', `<!doctype html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{width:1024px;height:500px;overflow:hidden;font-family:'Apple SD Gothic Neo','Noto Sans KR',sans-serif;color:#fff;position:relative;
 background:radial-gradient(520px 420px at 78% 50%, rgba(255,196,0,.22), transparent 70%), #0f1012}
.txt{position:absolute;left:64px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;width:470px}
.brand{display:flex;align-items:center;gap:16px;font-size:30px;font-weight:700;color:#d8d9dc;letter-spacing:-.5px}
.brand img{width:64px;height:64px;border-radius:16px}
h1{margin-top:26px;font-size:58px;font-weight:800;letter-spacing:-1.5px;line-height:1.18}
h1 em{font-style:normal;color:#FFD43B}
p{margin-top:18px;font-size:23px;color:#b8b9bd;letter-spacing:-.3px}
.ph{position:absolute;width:250px;height:540px;border-radius:36px;background:#1d1e21;padding:9px;box-shadow:0 0 0 2px #2c2d31,0 24px 60px rgba(0,0,0,.6)}
.ph div{width:100%;height:100%;border-radius:28px;overflow:hidden}.ph img{width:100%;display:block}
.p1{left:560px;top:60px;transform:rotate(-6deg)}.p2{left:760px;top:24px;transform:rotate(5deg)}
</style></head><body>
<div class="txt"><div class="brand"><img src="icon-512.png">무모한 시식가</div>
<h1>우리끼리 보는<br><em>맛집 리스트</em></h1><p>친구·연인·팀과 함께 쓰는 비공개 맛집 기록장</p></div>
<div class="ph p1"><div><img src="raw/03-reviews.png"></div></div>
<div class="ph p2"><div><img src="raw/01-list.png"></div></div>
</body></html>`);
console.log('ok');
