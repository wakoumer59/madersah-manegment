const API_BASE_URL = 'https://api.alquran.cloud/v1';
const AUDIO_HOST = 'cdn.islamic.network';

export interface QuranSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: 'Meccan' | 'Medinan';
}

export interface QuranReciter {
  identifier: string;
  name: string;
  englishName: string;
}

export interface QuranAyah {
  numberInSurah: number;
  text: string;
  audio: string;
  mushafPage: number | null;
}

export interface QuranSurahContent {
  ayahs: QuranAyah[];
  textSource: 'quran-foundation' | 'alquran-cloud';
}

export interface QuranMushafPage {
  pageNumber: number | null;
  startIndex: number;
  ayahs: QuranAyah[];
}

interface ArabicAudioEdition extends Record<string, unknown> {
  identifier: string;
  language: 'ar';
  format: 'audio';
  type: 'versebyverse';
  name: string;
  englishName: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getApiData(payload: unknown): unknown {
  if (!isRecord(payload) || payload.code !== 200 || !('data' in payload)) {
    throw new Error('Could not load Quran data right now. Check your connection and retry.');
  }
  return payload.data;
}

export function parseSurahs(payload: unknown): QuranSurah[] {
  const data = getApiData(payload);
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('The Quran service returned an invalid surah list.');
  }
  return data.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.number !== 'number' ||
      item.number !== index + 1 ||
      typeof item.name !== 'string' ||
      typeof item.englishName !== 'string' ||
      typeof item.englishNameTranslation !== 'string' ||
      typeof item.numberOfAyahs !== 'number' ||
      (item.revelationType !== 'Meccan' && item.revelationType !== 'Medinan')
    ) {
      throw new Error('The Quran service returned an invalid surah list.');
    }
    return {
      number: item.number,
      name: item.name,
      englishName: item.englishName,
      englishNameTranslation: item.englishNameTranslation,
      numberOfAyahs: item.numberOfAyahs,
      revelationType: item.revelationType,
    };
  });
}

export function parseReciters(payload: unknown): QuranReciter[] {
  const data = getApiData(payload);
  if (!Array.isArray(data)) {
    throw new Error('The Quran service returned an invalid reciter list.');
  }
  const reciters = data
    .filter(
      (item): item is ArabicAudioEdition =>
        isRecord(item) &&
        item.language === 'ar' &&
        item.format === 'audio' &&
        item.type === 'versebyverse' &&
        typeof item.identifier === 'string' &&
        typeof item.name === 'string' &&
        typeof item.englishName === 'string',
    )
    .map((item) => ({
      identifier: item.identifier,
      name: item.name,
      englishName: item.englishName,
    }))
    .filter(
      (reciter, index, reciters) =>
        reciters.findIndex((candidate) => candidate.identifier === reciter.identifier) === index,
    );
  if (reciters.length === 0) {
    throw new Error('The Quran service returned no Arabic reciters.');
  }
  return reciters;
}

function isTrustedAudioUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === AUDIO_HOST &&
      /^\/quran\/audio\/\d+\/ar\.[a-z0-9-]+\/\d+\.mp3$/i.test(url.pathname)
    );
  } catch {
    return false;
  }
}

export function parseAyahs(payload: unknown): QuranAyah[] {
  const data = getApiData(payload);
  if (!isRecord(data) || !Array.isArray(data.ayahs)) {
    throw new Error('The Quran service returned invalid surah content.');
  }
  return data.ayahs.map((item, index) => {
    if (
      !isRecord(item) ||
      typeof item.numberInSurah !== 'number' ||
      item.numberInSurah !== index + 1 ||
      typeof item.text !== 'string' ||
      !item.text.trim() ||
      !isTrustedAudioUrl(item.audio)
    ) {
      throw new Error('The Quran service returned invalid surah content.');
    }
    return {
      numberInSurah: item.numberInSurah,
      text: item.text,
      audio: item.audio,
      mushafPage: null,
    };
  });
}

export function parseMushafAyahs(
  payload: unknown,
  audioAyahs: QuranAyah[],
  surahNumber: number,
): QuranAyah[] {
  if (!isRecord(payload) || !Array.isArray(payload.verses)) {
    throw new Error('The Madinah Mushaf service returned invalid surah content.');
  }
  if (payload.verses.length !== audioAyahs.length) {
    throw new Error('The Quran text and audio services returned different ayah counts.');
  }
  return payload.verses.map((item, index) => {
    const expected = audioAyahs[index];
    if (
      !isRecord(item) ||
      typeof item.verse_number !== 'number' ||
      item.verse_number !== index + 1 ||
      item.verse_key !== `${surahNumber}:${index + 1}` ||
      typeof item.text_uthmani !== 'string' ||
      !item.text_uthmani.trim() ||
      typeof item.page_number !== 'number' ||
      !Number.isInteger(item.page_number) ||
      item.page_number < 1 ||
      item.page_number > 604
    ) {
      throw new Error('The Madinah Mushaf service returned invalid surah content.');
    }
    return {
      ...expected,
      text: item.text_uthmani,
      mushafPage: item.page_number,
    };
  });
}

export function groupAyahsByMushafPage(ayahs: QuranAyah[]): QuranMushafPage[] {
  const pages: QuranMushafPage[] = [];
  ayahs.forEach((ayah, index) => {
    const currentPage = pages[pages.length - 1];
    if (currentPage?.pageNumber === ayah.mushafPage) {
      currentPage.ayahs.push(ayah);
      return;
    }
    pages.push({
      pageNumber: ayah.mushafPage,
      startIndex: index,
      ayahs: [ayah],
    });
  });
  return pages;
}

async function fetchPayload(url: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Could not load Quran data right now. Check your connection and retry.');
  }
  if (!response.ok) {
    throw new Error('Could not load Quran data right now. Check your connection and retry.');
  }
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error('The Quran service returned an invalid response.');
  }
}

export async function listQuranSurahs(signal?: AbortSignal): Promise<QuranSurah[]> {
  return parseSurahs(await fetchPayload(`${API_BASE_URL}/surah`, signal));
}

export async function listQuranReciters(signal?: AbortSignal): Promise<QuranReciter[]> {
  return parseReciters(
    await fetchPayload(`${API_BASE_URL}/edition/format/audio?language=ar&type=versebyverse`, signal),
  );
}

export async function getQuranSurah(
  surahNumber: number,
  reciterId: string,
  signal?: AbortSignal,
): Promise<QuranSurahContent> {
  if (!Number.isInteger(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    throw new Error('Choose a valid surah.');
  }
  if (!/^[a-z]{2}\.[a-z0-9-]+$/i.test(reciterId)) {
    throw new Error('Choose a valid reciter.');
  }
  const audioAyahs = parseAyahs(await fetchPayload(
    `${API_BASE_URL}/surah/${surahNumber}/${encodeURIComponent(reciterId)}`,
    signal,
  ));
  let mushafResponse: Response;
  try {
    mushafResponse = await fetch(`/api/quran/verses/by_chapter/${surahNumber}`, { signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Could not load Madinah Mushaf text. Check your connection and retry.');
  }

  if (mushafResponse.status === 503) {
    return {
      ayahs: audioAyahs,
      textSource: 'alquran-cloud',
    };
  }
  if (!mushafResponse.ok) {
    throw new Error('Could not load Madinah Mushaf text. Check your connection and retry.');
  }
  let mushafPayload: unknown;
  try {
    mushafPayload = await mushafResponse.json() as unknown;
  } catch {
    throw new Error('The Madinah Mushaf service returned an invalid response.');
  }
  return {
    ayahs: parseMushafAyahs(mushafPayload, audioAyahs, surahNumber),
    textSource: 'quran-foundation',
  };
}
