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
  const bg = type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#333';
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

/** confirm() 대체 모달 — Promise<boolean> 반환 */
export function showConfirm(message: string, confirmText = '확인', cancelText = '취소'): Promise<boolean> {
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
    confirmBtn.style.cssText =
      'padding:0.55rem 1.1rem;background:#111;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:inherit;';

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
    confirmBtn.focus();
  });
}

/** confirm() 대체 — 위험한 작업용 (빨간 버튼) */
export function showDangerConfirm(message: string, confirmText = '삭제'): Promise<boolean> {
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
    cancelBtn.textContent = '취소';
    cancelBtn.style.cssText =
      'padding:0.55rem 1.1rem;background:#fff;color:#555;border:1px solid #d0d0d0;border-radius:8px;font-size:0.85rem;font-weight:500;cursor:pointer;font-family:inherit;';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = confirmText;
    confirmBtn.style.cssText =
      'padding:0.55rem 1.1rem;background:#dc2626;color:#fff;border:none;border-radius:8px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:inherit;';

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
    cancelBtn.focus();
  });
}
