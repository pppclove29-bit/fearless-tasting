let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (container) return container;
  container = document.createElement('div');
  container.id = 'toast-container';
  container.style.cssText =
    'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%);z-index:9999;display:flex;flex-direction:column;align-items:center;gap:0.5rem;pointer-events:none;';
  document.body.appendChild(container);
  return container;
}

export function showToast(
  message: string,
  type: 'error' | 'success' | 'info' = 'error',
  duration = 4000,
) {
  const el = document.createElement('div');
  const bg = type === 'error' ? '#dc2626' : type === 'success' ? '#333' : '#333';
  el.style.cssText = `
    background:${bg};color:#fff;padding:0.7rem 1.25rem;border-radius:8px;
    font-size:0.875rem;font-family:inherit;box-shadow:0 4px 12px rgba(0,0,0,0.15);
    pointer-events:auto;opacity:0;transform:translateY(10px);
    transition:opacity 0.25s,transform 0.25s;max-width:min(90vw,400px);text-align:center;
  `;
  el.textContent = message;
  getContainer().appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.addEventListener('transitionend', () => el.remove(), { once: true });
  }, duration);
}

interface ConfirmOptions {
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

/** confirm() 대체 모달 — Promise<boolean> 반환 */
function showConfirmModal(options: ConfirmOptions): Promise<boolean> {
  const { message, confirmText = '확인', cancelText = '취소', danger = false } = options;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';

    const modal = document.createElement('div');
    modal.style.cssText =
      'background:#fff;border-radius:12px;padding:1.5rem;max-width:360px;width:100%;box-shadow:0 8px 24px rgba(0,0,0,0.15);font-family:inherit;';

    const msg = document.createElement('p');
    msg.style.cssText = 'font-size:0.9rem;color:#333;line-height:1.6;margin:0 0 1.25rem;word-break:keep-all;';
    msg.textContent = message;

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:0.5rem;justify-content:flex-end;';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = cancelText;
    cancelBtn.style.cssText =
      'padding:0.55rem 1.1rem;background:#fff;color:#555;border:1px solid #d0d0d0;border-radius:8px;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit;';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    const btnBg = danger ? '#dc2626' : '#111';
    confirmBtn.style.cssText =
      `padding:0.55rem 1.1rem;background:${btnBg};color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:inherit;`;

    function close(result: boolean) {
      overlay.style.opacity = '0';
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      resolve(result);
    }

    cancelBtn.addEventListener('click', () => close(false));
    confirmBtn.addEventListener('click', () => close(true));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

    btnRow.append(cancelBtn, confirmBtn);
    modal.append(msg, btnRow);
    overlay.appendChild(modal);
    overlay.style.cssText += 'opacity:0;transition:opacity 0.15s;';
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    (danger ? cancelBtn : confirmBtn).focus();
  });
}

/** 일반 확인 모달 */
export function showConfirm(message: string, confirmText = '확인', cancelText = '취소'): Promise<boolean> {
  return showConfirmModal({ message, confirmText, cancelText });
}

/** 위험 작업용 확인 모달 (빨간 버튼) */
export function showDangerConfirm(message: string, confirmText = '삭제'): Promise<boolean> {
  return showConfirmModal({ message, confirmText, danger: true });
}

/** 플랫폼 감지 */
function detectPlatform(): 'android-chrome' | 'android-pwa' | 'ios' | 'desktop' {
  const ua = navigator.userAgent;
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return isStandalone ? 'android-pwa' : 'android-chrome';
  return 'desktop';
}

interface PermissionExplainerOptions {
  title: string;
  description: string;
  icon?: string;
  allowText?: string;
  cancelText?: string;
}

/** 권한 요청 전 설명 모달 */
export function showPermissionExplainer(options: PermissionExplainerOptions): Promise<boolean> {
  const { title, description, icon = '🔔', allowText = '허용하기', cancelText = '나중에' } = options;
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText =
      'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;transition:opacity 0.15s;';

    const modal = document.createElement('div');
    modal.style.cssText =
      'background:#fff;border-radius:16px;padding:1.75rem 1.5rem;max-width:360px;width:100%;box-shadow:0 12px 32px rgba(0,0,0,0.2);font-family:inherit;text-align:center;';

    modal.innerHTML = `
      <div style="font-size:3rem;margin-bottom:0.75rem;line-height:1;">${icon}</div>
      <h3 style="font-size:1.05rem;font-weight:700;color:#111;margin:0 0 0.5rem;">${title}</h3>
      <p style="font-size:0.85rem;color:#555;line-height:1.6;margin:0 0 1.5rem;word-break:keep-all;">${description}</p>
      <div style="display:flex;flex-direction:column;gap:0.5rem;">
        <button class="perm-allow" style="padding:0.7rem 1.1rem;background:#111;color:#fff;border:none;border-radius:10px;font-size:0.9rem;font-weight:600;cursor:pointer;font-family:inherit;">${allowText}</button>
        <button class="perm-cancel" style="padding:0.7rem 1.1rem;background:#fff;color:#888;border:none;border-radius:10px;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit;">${cancelText}</button>
      </div>
    `;

    function close(result: boolean) {
      overlay.style.opacity = '0';
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      resolve(result);
    }

    modal.querySelector('.perm-allow')?.addEventListener('click', () => close(true));
    modal.querySelector('.perm-cancel')?.addEventListener('click', () => close(false));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  });
}

/** 권한 차단된 경우 플랫폼별 복구 가이드 모달 */
export function showPermissionDeniedGuide(type: 'notification' | 'location'): void {
  const platform = detectPlatform();
  const typeLabel = type === 'notification' ? '알림' : '위치';

  const steps: Record<string, string[]> = {
    'android-pwa': [
      '홈 화면에서 앱 아이콘을 길게 눌러 주세요',
      '"앱 정보" 또는 ⓘ 아이콘 탭',
      '"권한" 메뉴 진입',
      `"${typeLabel}" 항목을 "허용"으로 변경`,
      '앱으로 돌아와 다시 시도',
    ],
    'android-chrome': [
      '주소창 왼쪽 🔒(자물쇠) 아이콘 탭',
      '"권한" 또는 "사이트 설정" 선택',
      `"${typeLabel}" 항목을 "허용"으로 변경`,
      '페이지를 새로고침한 뒤 다시 시도',
    ],
    'ios': [
      type === 'notification'
        ? '설정 앱 → 알림 → "무모한 시식가" 찾기 → 알림 허용'
        : '설정 앱 → Safari → 위치 → "허용"',
      '앱으로 돌아와 다시 시도',
    ],
    'desktop': [
      '주소창 왼쪽 🔒(자물쇠) 아이콘 클릭',
      '"사이트 설정" 또는 "권한" 선택',
      `"${typeLabel}" 항목을 "허용"으로 변경`,
      '페이지를 새로고침한 뒤 다시 시도',
    ],
  };

  const platformLabels: Record<string, string> = {
    'android-pwa': '📱 Android (설치된 앱)',
    'android-chrome': '📱 Android (브라우저)',
    'ios': '📱 iPhone/iPad',
    'desktop': '🖥 데스크톱',
  };

  const stepHtml = steps[platform].map((s, i) =>
    `<li style="display:flex;gap:0.5rem;font-size:0.85rem;color:#333;line-height:1.55;margin-bottom:0.4rem;">
      <span style="flex-shrink:0;width:20px;height:20px;background:#111;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;">${i + 1}</span>
      <span style="flex:1;word-break:keep-all;">${s}</span>
    </li>`
  ).join('');

  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10001;display:flex;align-items:center;justify-content:center;padding:1rem;opacity:0;transition:opacity 0.15s;';

  const modal = document.createElement('div');
  modal.style.cssText =
    'background:#fff;border-radius:16px;padding:1.5rem;max-width:380px;width:100%;box-shadow:0 12px 32px rgba(0,0,0,0.2);font-family:inherit;max-height:85vh;overflow-y:auto;';

  modal.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
      <h3 style="font-size:1rem;font-weight:700;color:#111;margin:0;">${typeLabel} 권한이 차단되어 있어요</h3>
      <button class="perm-close" style="background:none;border:none;font-size:1.4rem;color:#888;cursor:pointer;line-height:1;padding:0 0.25rem;">&times;</button>
    </div>
    <p style="font-size:0.82rem;color:#666;line-height:1.6;margin:0 0 1rem;word-break:keep-all;">
      브라우저 보안 정책상 앱이 직접 권한을 다시 요청할 수 없어요.<br/>아래 방법으로 직접 허용해 주세요.
    </p>
    <div style="background:#f5f5f5;border-radius:10px;padding:0.75rem 0.9rem;margin-bottom:1rem;font-size:0.75rem;color:#666;font-weight:600;">
      ${platformLabels[platform]}
    </div>
    <ol style="list-style:none;padding:0;margin:0 0 1.25rem;">${stepHtml}</ol>
    <button class="perm-ok" style="width:100%;padding:0.7rem;background:#111;color:#fff;border:none;border-radius:10px;font-size:0.9rem;font-weight:600;cursor:pointer;font-family:inherit;">확인</button>
  `;

  function close() {
    overlay.style.opacity = '0';
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
  }

  modal.querySelector('.perm-close')?.addEventListener('click', close);
  modal.querySelector('.perm-ok')?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.opacity = '1'; });
}
