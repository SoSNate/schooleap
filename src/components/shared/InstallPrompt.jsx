/**
 * InstallPrompt — PWA "הוסף לדף הבית" component
 *
 * Exposes:
 *  - default export  <InstallPrompt />  — renders the modal overlay
 *  - captureInstallEvent()              — call once on app boot to trap
 *                                         the browser's beforeinstallprompt
 *  - canInstallNatively()               — true when a deferred prompt exists
 *  - triggerNativeInstall()             — programmatically shows browser prompt
 */

import { useState, useEffect } from 'react';

// ─── Module-level singleton — survives component re-mounts ────────────────────
let _deferredPrompt = null;
let _listeners      = new Set();

function notifyListeners() {
  _listeners.forEach((fn) => fn(_deferredPrompt));
}

export function captureInstallEvent() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    notifyListeners();
  });
  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    notifyListeners();
  });
}

export function canInstallNatively() {
  return !!_deferredPrompt;
}

export async function triggerNativeInstall() {
  if (!_deferredPrompt) return false;
  _deferredPrompt.prompt();
  const { outcome } = await _deferredPrompt.userChoice;
  _deferredPrompt = null;
  notifyListeners();
  return outcome === 'accepted';
}

// ─── iOS detection ────────────────────────────────────────────────────────────
function isIOS() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
function isInStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

const SHOWN_KEY = 'pwa_install_shown';

// ─── Component ────────────────────────────────────────────────────────────────
export default function InstallPrompt({ onClose, forceShow = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(_deferredPrompt);
  const [installing, setInstalling]         = useState(false);
  const [done, setDone]                     = useState(false);

  // Subscribe to singleton updates
  useEffect(() => {
    const update = (p) => setDeferredPrompt(p);
    _listeners.add(update);
    return () => _listeners.delete(update);
  }, []);

  // Mark as shown
  useEffect(() => {
    if (!forceShow) {
      try { localStorage.setItem(SHOWN_KEY, '1'); } catch {}
    }
  }, [forceShow]);

  const iosMode  = isIOS() && !isInStandaloneMode();
  const showable = iosMode || !!deferredPrompt;

  if (!showable && !forceShow) {
    // Nothing to show (already installed or unsupported)
    onClose?.();
    return null;
  }

  const handleInstall = async () => {
    if (iosMode) return; // iOS: user must do it manually
    setInstalling(true);
    const accepted = await triggerNativeInstall();
    setInstalling(false);
    if (accepted) { setDone(true); setTimeout(onClose, 1500); }
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: 'linear-gradient(160deg,#1e1b4b 0%,#0f172a 100%)', border: '1px solid rgba(99,102,241,.35)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <span className="text-3xl">📲</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="px-5 pb-6 space-y-4">
          <div>
            <h3 className="text-xl font-black text-white">הוסיפ/י לדף הבית 🚀</h3>
            <p className="text-sm text-slate-400 mt-1">
              {iosMode
                ? 'גישה מהירה ישירות ממסך הבית — בלי לפתוח דפדפן'
                : 'התקיני את חשבונאוטיקה כאפליקציה — פשוט ומהיר'}
            </p>
          </div>

          {/* Android / Chrome — native prompt */}
          {!iosMode && (
            done ? (
              <div className="text-center py-4 text-2xl">✅ הותקן בהצלחה!</div>
            ) : (
              <button
                onClick={handleInstall}
                disabled={installing}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-black py-3.5 rounded-2xl transition-all active:scale-95 text-base"
              >
                {installing ? 'רגע...' : '📲 הוסף לדף הבית'}
              </button>
            )
          )}

          {/* iOS Safari — manual instructions */}
          {iosMode && (
            <div className="bg-white/5 rounded-2xl p-4 space-y-3 text-sm text-slate-300">
              <p className="font-bold text-white">שלבים פשוטים ב-Safari:</p>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">1️⃣</span>
                <span>לחצ/י על כפתור השיתוף <strong className="text-white">⬆</strong> בסרגל התחתון</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">2️⃣</span>
                <span>גלול/י למטה ובחר/י <strong className="text-white">«הוסף למסך הבית»</strong></span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">3️⃣</span>
                <span>לחצ/י <strong className="text-white">הוסף</strong> — וזהו! 🎉</span>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition-colors"
          >
            אולי מאוחר יותר
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Utility: should we auto-show the prompt? ─────────────────────────────────
export function shouldAutoShowInstallPrompt() {
  if (isInStandaloneMode()) return false; // already installed
  try { if (localStorage.getItem(SHOWN_KEY)) return false; } catch {}
  return true;
}
