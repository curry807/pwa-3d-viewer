
// Service Worker登録と更新通知
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('service-worker.js');
      console.log('SW registered:', reg);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const msg = document.getElementById('update-msg');
            const btn = document.getElementById('reload-btn');
            if (msg && btn) {
              msg.textContent = '新しいバージョンがあります。更新して再読み込みできます。';
              msg.classList.remove('hide');
              btn.classList.remove('hide');
              btn.onclick = async () => {
                if (reg.waiting) {
                  const channel = new MessageChannel();
                  reg.waiting.postMessage({ type: 'SKIP_WAITING' }, [channel.port2]);
                }
                window.location.reload();
              };
            }
          }
        });
      });
    } catch (err) {
      console.error('SW registration failed:', err);
    }
  });
}

// iOS/iPad向け案内（インストールバナーがないため）
(function () {
  const ua = window.navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if (isIOS && !isStandalone) {
    const tip = document.createElement('div');
    tip.style.position = 'fixed';
    tip.style.bottom = '16px';
    tip.style.left = '16px';
    tip.style.right = '16px';
    tip.style.background = '#fff0f7';
    tip.style.border = '1px solid #ffc1db';
    tip.style.borderRadius = '10px';
    tip.style.padding = '12px';
    tip.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)';
    tip.style.zIndex = '9999';
    tip.innerHTML = 'ホーム画面に追加するには、Safariの共有メニュー <span style="font-size:1.2em">↑</span> から <strong>「ホーム画面に追加」</strong> を選択してください。';
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 12000);
  }
})();
