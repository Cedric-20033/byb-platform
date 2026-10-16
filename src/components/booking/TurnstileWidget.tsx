// src/components/booking/TurnstileWidget.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale } from 'next-intl';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const SCRIPT_ID = 'cf-turnstile-script';

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string;
      language: string;
      theme: 'auto';
      callback: (token: string) => void;
      'expired-callback': () => void;
      'error-callback': () => void;
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/** Charge le script Cloudflare une seule fois pour toute la page, même si plusieurs widgets s'y succèdent. */
function loadTurnstile(): Promise<TurnstileApi> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve(window.turnstile);

    const onLoad = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile indisponible')));
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', onLoad, { once: true });
      existing.addEventListener('error', () => reject(new Error('Turnstile indisponible')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = SCRIPT_URL;
    script.async = true;
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('Turnstile indisponible')), { once: true });
    document.head.appendChild(script);
  });
}

type TurnstileWidgetProps = {
  siteKey: string;
  /** Reçoit le jeton à usage unique, ou `null` quand il expire ou que la vérification échoue. */
  onToken: (token: string | null) => void;
  /** Message affiché si le script Cloudflare ne se charge pas (bloqueur de pub, réseau) : texte du formulaire hôte. */
  loadErrorMessage: string;
};

/**
 * Widget anti-robot Cloudflare Turnstile. Un jeton ne sert qu'une fois : après un envoi refusé,
 * le parent remonte ce composant (changement de `key`) pour obtenir un jeton neuf.
 */
export function TurnstileWidget({ siteKey, onToken, loadErrorMessage }: TurnstileWidgetProps) {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // `onToken` change à chaque rendu du parent : on le lit via une ref pour ne pas recréer le widget.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !containerRef.current) return;
        widgetId = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          language: locale,
          theme: 'auto',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [siteKey, locale]);

  if (loadFailed) {
    return <p role="alert" className="text-sm text-[var(--color-secondary)]">{loadErrorMessage}</p>;
  }
  return <div ref={containerRef} />;
}
