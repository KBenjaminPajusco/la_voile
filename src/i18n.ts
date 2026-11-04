// Language: English or French, fixed for the page's lifetime. Chosen once at load (saved choice,
// else the browser's language); switching saves the choice and reloads, so every string -
// including module-level content evaluated at import - comes out in the right language.
// Node (tests, scripts) has no localStorage/navigator: English.
export type Lang = 'en' | 'fr';

const KEY = 'trimmaster.lang';

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'fr' || saved === 'en') return saved;
    if (typeof navigator !== 'undefined' && /^fr\b/i.test(navigator.language || '')) return 'fr';
  } catch {
    /* no storage: default */
  }
  return 'en';
}

export const LANG: Lang = detect();

/** pick the string for the current language: L('Start', 'Démarrer') */
export function L(en: string, fr: string): string {
  return LANG === 'fr' ? fr : en;
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
  if (typeof location !== 'undefined') location.reload();
}
