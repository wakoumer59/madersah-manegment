import { describe, expect, it } from 'vitest';
import {
  groupAyahsByMushafPage,
  parseAyahs,
  parseMushafAyahs,
  parseReciters,
  parseSurahs,
  removeOpeningBasmalah,
} from '@/services/quranService';

describe('Quran service response parsing', () => {
  it('removes a duplicated opening basmalah when it is also rendered separately', () => {
    const ayahs = [
      {
        numberInSurah: 1,
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ الم',
        audio: '',
        mushafPage: 1,
      },
      {
        numberInSurah: 2,
        text: 'ذَٰلِكَ الْكِتَابُ',
        audio: '',
        mushafPage: 1,
      },
    ];

    expect(removeOpeningBasmalah(ayahs, 2)).toEqual([
      { ...ayahs[0], text: 'الم' },
      ayahs[1],
    ]);
  });

  it('preserves Al-Fatiha and leaves surah 9 unchanged', () => {
    const ayahs = [{
      numberInSurah: 1,
      text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      audio: '',
      mushafPage: 1,
    }];

    expect(removeOpeningBasmalah(ayahs, 1)).toBe(ayahs);
    expect(removeOpeningBasmalah(ayahs, 9)).toBe(ayahs);
  });

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
      mushafPage: null,
    }]);
  });

  it('uses Quran Foundation Uthmani text and Madinah Mushaf page numbers', () => {
    const audioAyahs = [
      {
        numberInSurah: 1,
        text: 'fallback text',
        audio: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
        mushafPage: null,
      },
      {
        numberInSurah: 2,
        text: 'fallback text',
        audio: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/2.mp3',
        mushafPage: null,
      },
    ];
    expect(parseMushafAyahs({
      verses: [
        { verse_key: '1:1', verse_number: 1, text_uthmani: 'بِسْمِ اللَّهِ', page_number: 1 },
        { verse_key: '1:2', verse_number: 2, text_uthmani: 'الْحَمْدُ لِلَّهِ', page_number: 2 },
      ],
    }, audioAyahs, 1)).toEqual([
      { ...audioAyahs[0], text: 'بِسْمِ اللَّهِ', mushafPage: 1 },
      { ...audioAyahs[1], text: 'الْحَمْدُ لِلَّهِ', mushafPage: 2 },
    ]);
  });

  it('rejects Quran Foundation verses for the wrong surah or invalid page', () => {
    const audioAyahs = [{
      numberInSurah: 1,
      text: 'fallback text',
      audio: 'https://cdn.islamic.network/quran/audio/128/ar.alafasy/1.mp3',
      mushafPage: null,
    }];
    expect(() => parseMushafAyahs({
      verses: [{ verse_key: '2:1', verse_number: 1, text_uthmani: 'الفاتحة', page_number: 1 }],
    }, audioAyahs, 1)).toThrow('The Madinah Mushaf service returned invalid surah content.');
    expect(() => parseMushafAyahs({
      verses: [{ verse_key: '1:1', verse_number: 1, text_uthmani: 'الفاتحة', page_number: 605 }],
    }, audioAyahs, 1)).toThrow('The Madinah Mushaf service returned invalid surah content.');
  });

  it('groups Quran verses into Madinah Mushaf pages', () => {
    const pages = groupAyahsByMushafPage([
      { numberInSurah: 1, text: 'one', audio: '', mushafPage: 1 },
      { numberInSurah: 2, text: 'two', audio: '', mushafPage: 1 },
      { numberInSurah: 3, text: 'three', audio: '', mushafPage: 2 },
    ]);
    expect(pages.map((page) => ({
      pageNumber: page.pageNumber,
      startIndex: page.startIndex,
      ayahCount: page.ayahs.length,
    }))).toEqual([
      { pageNumber: 1, startIndex: 0, ayahCount: 2 },
      { pageNumber: 2, startIndex: 2, ayahCount: 1 },
    ]);
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
