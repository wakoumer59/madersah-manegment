import { describe, expect, it } from 'vitest';
import { parseAyahs, parseReciters, parseSurahs } from '@/services/quranService';

describe('Quran service response parsing', () => {
  it('parses the surah catalog', () => {
    expect(
      parseSurahs({
        code: 200,
        data: [{
          number: 1,
          name: 'الفاتحة',
          englishName: 'Al-Faatiha',
          englishNameTranslation: 'The Opening',
          numberOfAyahs: 7,
          revelationType: 'Meccan',
        }],
      }),
    ).toEqual([{
      number: 1,
      name: 'الفاتحة',
      englishName: 'Al-Faatiha',
      englishNameTranslation: 'The Opening',
      numberOfAyahs: 7,
      revelationType: 'Meccan',
    }]);
  });

  it('offers only unique Arabic verse-by-verse audio editions', () => {
    const validEdition = {
      identifier: 'ar.alafasy',
      language: 'ar',
      format: 'audio',
      type: 'versebyverse',
      name: 'العفاسي',
      englishName: 'Alafasy',
    };
    expect(
      parseReciters({
        code: 200,
        data: [
          validEdition,
          validEdition,
          { ...validEdition, identifier: 'en.transliteration', language: 'en' },
          { ...validEdition, identifier: 'ar.full', type: 'surah' },
        ],
      }),
    ).toEqual([{
      identifier: 'ar.alafasy',
      name: 'العفاسي',
      englishName: 'Alafasy',
    }]);
  });

  it('parses Arabic ayahs with trusted streamed audio URLs', () => {
    expect(
      parseAyahs({
        code: 200,
        data: {
          ayahs: [{
            numberInSurah: 1,
            text: 'بِسْمِ اللَّهِ',
            audio: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
          }],
        },
      }),
    ).toEqual([{
      numberInSurah: 1,
      text: 'بِسْمِ اللَّهِ',
      audio: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
    }]);
  });

  it('rejects malformed or unexpected audio URLs', () => {
    expect(() => parseAyahs({
      code: 200,
      data: {
        ayahs: [{
          numberInSurah: 1,
          text: 'بِسْمِ اللَّهِ',
          audio: 'https://attacker.example/audio.mp3',
        }],
      },
    })).toThrow('The Quran service returned invalid surah content.');
  });

  it('rejects malformed catalog responses', () => {
    expect(() => parseSurahs({ code: 500, data: [] })).toThrow(
      'Could not load Quran data right now. Check your connection and retry.',
    );
    expect(() => parseReciters({ code: 200, data: [] })).toThrow(
      'The Quran service returned no Arabic reciters.',
    );
  });
});
