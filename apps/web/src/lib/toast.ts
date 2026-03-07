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
