/**
 * 코치마크 튜토리얼 — 특정 엘리먼트를 스포트라이트로 강조하고 툴팁 표시.
 * - 튜토리얼 진행 상태는 서버(UserTutorialProgress)에 저장
 * - 같은 키는 완료 후 다시 뜨지 않음
 */
import { fetchCompletedTutorials, completeTutorial } from './api';

export interface CoachStep {
  /** 강조할 엘리먼트의 CSS selector */
  target: string;
  /** 설명 제목 */
  title: string;
  /** 설명 본문 */
  description: string;
  /** 툴팁 위치 (기본: auto) */
  placement?: 'top' | 'bottom' | 'auto';
}

const OVERLAY_ID = 'coach-overlay';

let completedCache: Set<string> | null = null;

/** 완료 목록 캐시 로드 (세션 내 1회) */
async function loadCompleted(): Promise<Set<string>> {
  if (completedCache) return completedCache;
  const list = await fetchCompletedTutorials();
  completedCache = new Set(list);
  return completedCache;
}

/**
 * 튜토리얼 실행 (이미 완료된 경우 스킵).
 * 모든 스텝이 끝나거나 스킵하면 서버에 완료 기록.
 */
export async function runTutorial(key: string, steps: CoachStep[]): Promise<void> {
  if (document.getElementById(OVERLAY_ID)) return; // 이미 실행 중
  const completed = await loadCompleted();
  if (completed.has(key)) return;

  // 첫 스텝 타겟이 나타날 때까지 잠시 대기 (View Transitions 대응)
  const firstTarget = await waitForElement(steps[0]?.target);
  if (!firstTarget) return;

  let currentIndex = 0;
  const overlay = createOverlay();
  document.body.appendChild(overlay);

  function cleanup() {
    overlay.remove();
    window.removeEventListener('resize', reposition);
    window.removeEventListener('scroll', reposition, true);
  }

  function reposition() {
    render();
  }

  async function render() {
    const step = steps[currentIndex];
    if (!step) { await finish('completed'); return; }
    const target = document.querySelector<HTMLElement>(step.target);
    if (!target) { await finish('skipped'); return; }

    const rect = target.getBoundingClientRect();
    const spotlight = overlay.querySelector<HTMLElement>('.coach-spotlight')!;
    const tooltip = overlay.querySelector<HTMLElement>('.coach-tooltip')!;
    const titleEl = overlay.querySelector<HTMLElement>('.coach-title')!;
    const descEl = overlay.querySelector<HTMLElement>('.coach-desc')!;
    const dotsEl = overlay.querySelector<HTMLElement>('.coach-dots')!;
    const nextBtn = overlay.querySelector<HTMLButtonElement>('.coach-next')!;
    const skipBtn = overlay.querySelector<HTMLButtonElement>('.coach-skip')!;

    const pad = 8;
    spotlight.style.top = `${rect.top - pad}px`;
    spotlight.style.left = `${rect.left - pad}px`;
    spotlight.style.width = `${rect.width + pad * 2}px`;
    spotlight.style.height = `${rect.height + pad * 2}px`;

    titleEl.textContent = step.title;
    descEl.textContent = step.description;
    dotsEl.innerHTML = steps
      .map((_, i) => `<span class="coach-dot${i === currentIndex ? ' active' : ''}"></span>`)
      .join('');
    nextBtn.textContent = currentIndex === steps.length - 1 ? '완료' : '다음';

    // 툴팁 위치 — 타겟 아래 우선, 공간 부족하면 위로
    tooltip.style.visibility = 'hidden';
    tooltip.style.display = 'block';
    const tRect = tooltip.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const placeBelow = step.placement === 'bottom'
      || (step.placement !== 'top' && rect.bottom + tRect.height + 16 < vh);

    const top = placeBelow ? rect.bottom + 12 : rect.top - tRect.height - 12;
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - tRect.width / 2),
      vw - tRect.width - 12,
    );
    tooltip.style.top = `${Math.max(12, top)}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.visibility = 'visible';

    // 핸들러 재설정 (replaceWith로 기존 리스너 제거)
    const newNext = nextBtn.cloneNode(true) as HTMLButtonElement;
    nextBtn.replaceWith(newNext);
    newNext.addEventListener('click', async () => {
      if (currentIndex < steps.length - 1) {
        currentIndex++;
        render();
      } else {
        await finish('completed');
      }
    });

    const newSkip = skipBtn.cloneNode(true) as HTMLButtonElement;
    skipBtn.replaceWith(newSkip);
    newSkip.addEventListener('click', async () => {
      await finish('skipped');
    });
  }

  async function finish(_reason: 'completed' | 'skipped') {
    cleanup();
    completedCache?.add(key);
    await completeTutorial(key);
  }

  window.addEventListener('resize', reposition);
  window.addEventListener('scroll', reposition, true);
  render();
}

function createOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.innerHTML = `
    <div class="coach-backdrop"></div>
    <div class="coach-spotlight"></div>
    <div class="coach-tooltip">
      <div class="coach-title"></div>
      <div class="coach-desc"></div>
      <div class="coach-dots"></div>
      <div class="coach-actions">
        <button type="button" class="coach-skip">건너뛰기</button>
        <button type="button" class="coach-next">다음</button>
      </div>
    </div>
  `;

  // 스타일 주입 (1회)
  if (!document.getElementById('coach-style')) {
    const style = document.createElement('style');
    style.id = 'coach-style';
    style.textContent = COACH_STYLE;
    document.head.appendChild(style);
  }

  return overlay;
}

async function waitForElement(selector: string, timeoutMs = 3000): Promise<HTMLElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector<HTMLElement>(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

const COACH_STYLE = `
#coach-overlay {
  position: fixed;
  inset: 0;
  z-index: 10003;
  pointer-events: none;
}
#coach-overlay .coach-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  pointer-events: auto;
}
#coach-overlay .coach-spotlight {
  position: absolute;
  background: transparent;
  border-radius: 12px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
  border: 2px solid #fff;
  pointer-events: none;
  transition: all 0.2s ease-out;
  animation: coach-pulse 1.6s ease-in-out infinite;
}
@keyframes coach-pulse {
  0%, 100% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 0 0 rgba(255, 255, 255, 0.4); }
  50% { box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 0 10px rgba(255, 255, 255, 0); }
}
#coach-overlay .coach-tooltip {
  position: absolute;
  background: #fff;
  color: #111;
  border-radius: 14px;
  padding: 1rem 1.1rem 0.9rem;
  max-width: min(320px, calc(100vw - 24px));
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
  pointer-events: auto;
  font-family: inherit;
  display: none;
}
#coach-overlay .coach-title {
  font-size: 0.98rem;
  font-weight: 800;
  margin-bottom: 0.35rem;
  word-break: keep-all;
}
#coach-overlay .coach-desc {
  font-size: 0.82rem;
  color: #555;
  line-height: 1.55;
  word-break: keep-all;
  margin-bottom: 0.75rem;
}
#coach-overlay .coach-dots {
  display: flex;
  justify-content: center;
  gap: 0.3rem;
  margin-bottom: 0.75rem;
}
#coach-overlay .coach-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #d4d4d8;
  transition: all 0.2s;
}
#coach-overlay .coach-dot.active {
  background: #111;
  width: 18px;
  border-radius: 3px;
}
#coach-overlay .coach-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
#coach-overlay .coach-skip {
  background: none;
  border: none;
  color: #999;
  font-size: 0.78rem;
  cursor: pointer;
  font-family: inherit;
  padding: 0.4rem 0.5rem;
}
#coach-overlay .coach-skip:hover { color: #555; }
#coach-overlay .coach-next {
  background: #111;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
}
#coach-overlay .coach-next:hover { opacity: 0.85; }
`;
