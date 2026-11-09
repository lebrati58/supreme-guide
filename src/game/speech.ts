import { intlLocale, locale } from '../i18n';

/**
 * Read-aloud for the guide mode with the device's own voices (Web Speech API). Most phones ship
 * offline voices, so narration also works in airplane mode. Silently unavailable otherwise.
 */
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

function voiceFor(lang: string): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split('-')[0];
  return voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase())
    ?? voices.find((v) => v.lang.toLowerCase().startsWith(base) && v.localService)
    ?? voices.find((v) => v.lang.toLowerCase().startsWith(base));
}

export function speak(text: string, onEnd?: () => void, langOverride?: string) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\p{Extended_Pictographic}/gu, ''));
  const lang = langOverride ?? (locale() === 'zh' ? 'zh-CN' : intlLocale());
  u.lang = lang;
  const v = voiceFor(lang);
  if (v) u.voice = v;
  u.rate = 1;
  if (onEnd) u.onend = onEnd;
  synth.speak(u);
}

export function stopSpeaking() { if (canSpeak()) window.speechSynthesis.cancel(); }
