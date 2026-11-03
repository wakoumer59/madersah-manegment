import { describe, expect, it, vi } from 'vitest';

describe('translate', () => {
  it.each([
    ['am', "Fill in your Firebase project's public web-app config values", 'የFirebase ፕሮጀክትዎን ይፋዊ የድር መተግበሪያ ቅንብር እሴቶች ያስገቡ', undefined],
    ['am', 'The full page is being built and tested phase by phase.\n The navigation is already in place so you can review the layout.', 'ሙሉ ገጹ በየዙሩ እየተገነባና እየተፈተነ ነው። አቀማመጡን ለመመልከት አሰሳው ተዘጋጅቷል።', undefined],
    ['am', 'Remove “{name}”? This cannot be undone.', '“Student”ን ያስወግዱ? ይህን መመለስ አይቻልም።', { name: 'Student' }],
    ['am', 'Present today', 'ዛሬ የተገኙ', undefined],
    ['am', 'Email is required.', 'ኢሜይል ማስገባት ያስፈልጋል።', undefined],
    ['am', 'Delete “{name}”? This cannot be undone.', '“Test”ን ይሰርዙ? ይህን መመለስ አይቻልም።', { name: 'Test' }],
    ['om', 'Select a class', 'Kutaa barnootaa filadhu', undefined],
    ['om', 'Remove “{name}”? This cannot be undone.', '“Barataa” haquu? Kun deebisanii hin jijjiiramu.', { name: 'Barataa' }],
    ['om', 'Present today', 'Har’a argaman', undefined],
    ['om', 'Option A is required.', 'Filannoon A barbaachisaadha.', undefined],
    ['om', 'Remove this question? This cannot be undone.', 'Gaaffii kana haquu? Kun deebisanii hin jijjiiramu.', undefined],
    ['en', 'Not in the dictionary', 'Not in the dictionary', undefined],
  ] as const)('translates %s text and normalizes key formatting', async (language, text, expected, values) => {
    vi.resetModules();
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { localStorage: { getItem: () => language } },
    });

    try {
      const { translate } = await import('@/i18n');
      expect(translate(text, values)).toBe(expected);
    } finally {
      if (previousWindow) {
        Object.defineProperty(globalThis, 'window', previousWindow);
      } else {
        Reflect.deleteProperty(globalThis, 'window');
      }
      vi.resetModules();
    }
  });
});
