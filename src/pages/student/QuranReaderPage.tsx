import { useCallback, useEffect, useRef, useState } from 'react';
import { BookText, ChevronLeft, ChevronRight, LoaderCircle, Pause, Play, RotateCcw } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Select } from '@/components/common/Select';
import { translate } from '@/i18n';
import {
  groupAyahsByMushafPage,
  getQuranSurah,
  listQuranReciters,
  listQuranSurahs,
  type QuranAyah,
  type QuranReciter,
  type QuranSurah,
} from '@/services/quranService';
import { errorMessage } from '@/utils/errors';

export default function QuranReaderPage() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoplayNextRef = useRef(false);
  const ayahRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [reciters, setReciters] = useState<QuranReciter[]>([]);
  const [selectedSurah, setSelectedSurah] = useState('');
  const [selectedReciter, setSelectedReciter] = useState('');
  const [ayahs, setAyahs] = useState<QuranAyah[]>([]);
  const [textSource, setTextSource] = useState<'quran-foundation' | 'alquran-cloud' | null>(null);
  const [selectedAyahIndex, setSelectedAyahIndex] = useState(0);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async (signal: AbortSignal) => {
    setLoadingCatalog(true);
    setError(null);
    try {
      const [surahList, reciterList] = await Promise.all([
        listQuranSurahs(signal),
        listQuranReciters(signal),
      ]);
      if (signal.aborted) return;
      setSurahs(surahList);
      setReciters(reciterList);
      setSelectedSurah(String(surahList[0].number));
      const preferred = reciterList.find((item) => item.identifier === 'ar.alafasy');
      setSelectedReciter(preferred?.identifier ?? reciterList[0].identifier);
    } catch (loadError) {
      if (!signal.aborted) setError(errorMessage(loadError));
    } finally {
      if (!signal.aborted) setLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadCatalog(controller.signal);
    return () => controller.abort();
  }, [catalogAttempt, loadCatalog]);

  const loadSurah = useCallback(async (surah: string, reciter: string, signal: AbortSignal) => {
    if (!surah || !reciter) return;
    setLoadingSurah(true);
    setAyahs([]);
    setTextSource(null);
    setSelectedAyahIndex(0);
    setAudioError(false);
    setIsPlaying(false);
    setError(null);
    try {
      const verses = await getQuranSurah(Number(surah), reciter, signal);
      if (!signal.aborted) {
        setAyahs(verses.ayahs);
        setTextSource(verses.textSource);
      }
    } catch (loadError) {
      if (!signal.aborted) setError(errorMessage(loadError));
    } finally {
      if (!signal.aborted) setLoadingSurah(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedSurah || !selectedReciter) return;
    const controller = new AbortController();
    void loadSurah(selectedSurah, selectedReciter, controller.signal);
    return () => controller.abort();
  }, [selectedSurah, selectedReciter, loadSurah]);

  useEffect(() => {
    if (!autoplayNextRef.current) return;
    autoplayNextRef.current = false;
    void audioRef.current?.play().catch(() => {
      setError(translate('Tap play to continue listening.'));
    });
  }, [selectedAyahIndex]);

  useEffect(() => {
    if (selectedAyahIndex === 0) return;
    ayahRefs.current[selectedAyahIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [selectedAyahIndex]);

  const surah = surahs.find((item) => String(item.number) === selectedSurah);
  const reciter = reciters.find((item) => item.identifier === selectedReciter);
  const selectedAyah = ayahs[selectedAyahIndex];
  const mushafPages = groupAyahsByMushafPage(ayahs);

  const handleEnded = () => {
    if (selectedAyahIndex >= ayahs.length - 1) {
      setIsPlaying(false);
      return;
    }
    autoplayNextRef.current = true;
    setSelectedAyahIndex((current) => current + 1);
  };

  const selectAyah = (index: number) => {
    autoplayNextRef.current = false;
    setAudioError(false);
    setIsPlaying(false);
    setSelectedAyahIndex(index);
  };

  const playPause = async () => {
    const audio = audioRef.current;
    if (!audio || !selectedAyah) return;
    if (audio.paused) {
      try {
        await audio.play();
        setError(null);
      } catch {
        setError(translate('Audio could not be played. Try again.'));
      }
    } else {
      audio.pause();
    }
  };

  const playSurah = async () => {
    autoplayNextRef.current = true;
    setAudioError(false);
    setError(null);
    if (selectedAyahIndex !== 0) {
      setSelectedAyahIndex(0);
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    try {
      await audio.play();
    } catch {
      autoplayNextRef.current = false;
      setError(translate('Audio could not be played. Try again.'));
    }
  };

  const replayAyah = () => {
    const audio = audioRef.current;
    if (!audio || !selectedAyah) return;
    audio.currentTime = 0;
    void audio.play().catch(() => setError(translate('Audio could not be played. Try again.')));
  };

  return (
    <AppShell variant="student">
      <header className="mx-auto mb-5 max-w-4xl">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
          <BookText className="h-6 w-6 text-emerald-700" aria-hidden="true" />
          {translate('Quran & Reciters')}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {translate('Read the Quran and listen to reciters verse by verse.')}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          {textSource === 'alquran-cloud'
            ? translate('Quran text and streamed audio are provided by AlQuran Cloud. Audio streams online and is not downloaded.')
            : translate('Madinah Mushaf text and page divisions are provided by Quran Foundation. Recitation audio streams from AlQuran Cloud.')}
          {' '}
          <a
            href="https://api-docs.quran.foundation/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-700 underline"
          >
            {translate('Source')}
          </a>
        </p>
        {textSource === 'alquran-cloud' && (
          <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
            {translate('Madinah Mushaf pages are not connected yet. Showing the available Quran text until Quran Foundation credentials are configured.')}
          </p>
        )}
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
          {translate('The amber highlight marks the active ayah. This reciter audio does not provide word or letter timing.')}
        </p>
      </header>

      {error && (
        <div role="alert" className="mx-auto mb-4 max-w-4xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => {
              if (selectedSurah && selectedReciter) {
                const controller = new AbortController();
                void loadSurah(selectedSurah, selectedReciter, controller.signal);
              } else {
                setCatalogAttempt((current) => current + 1);
              }
            }}
            className="ml-2 font-medium underline"
          >
            {translate('Retry')}
          </button>
        </div>
      )}

      {loadingCatalog ? (
        <LoadingSpinner />
      ) : (
        <main className="mx-auto max-w-4xl">
          <section className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2">
            <Select
              label={translate('Surah')}
              value={selectedSurah}
              onChange={(event) => {
                autoplayNextRef.current = false;
                setSelectedSurah(event.target.value);
              }}
            >
              {surahs.map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number}. {item.englishName} — {item.name}
                </option>
              ))}
            </Select>
            <Select
              label={translate('Reciter')}
              value={selectedReciter}
              onChange={(event) => {
                autoplayNextRef.current = false;
                setSelectedReciter(event.target.value);
              }}
            >
              {reciters.map((item) => (
                <option key={item.identifier} value={item.identifier}>
                  {item.englishName} — {item.name}
                </option>
              ))}
            </Select>
          </section>

          <section className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-center">
            <h2 className="text-xl font-bold text-emerald-950">
              {surah?.name ?? ''}
            </h2>
            <p className="mt-1 text-sm text-emerald-900">
              {surah?.englishName} · {surah?.englishNameTranslation} ·{' '}
              {surah?.numberOfAyahs} {translate('Ayahs')}
            </p>
            {reciter && (
              <p className="mt-1 text-xs text-emerald-800">
                {translate('Recited by')} {reciter.englishName}
              </p>
            )}
            <Button
              className="mt-3"
              onClick={() => void playSurah()}
              disabled={loadingSurah || ayahs.length === 0}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {translate('Play surah from beginning')}
            </Button>
          </section>

          {loadingSurah ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" aria-hidden="true" />
              {translate('Loading surah…')}
            </div>
          ) : (
            <section aria-label={translate('Madinah Mushaf pages')} className="mx-auto max-w-3xl space-y-5 pb-28">
              {mushafPages.map((page, pageIndex) => (
                <article
                  key={`${page.pageNumber ?? selectedSurah}-${page.startIndex}`}
                  aria-label={page.pageNumber
                    ? translate('Mushaf page {number}', { number: page.pageNumber })
                    : translate('Mushaf page')}
                  lang="ar"
                  dir="rtl"
                  translate="no"
                  className="rounded-[1.75rem] border-[5px] border-double border-amber-300 bg-[#fffdf5] px-4 py-6 shadow-[0_12px_36px_rgba(120,83,31,0.12)] sm:min-h-[65vh] sm:px-9 sm:py-8"
                >
                  <div className="mb-6 flex items-center justify-center gap-3 text-amber-800" aria-hidden="true">
                    <span className="h-px flex-1 bg-amber-300" />
                    <span className="text-sm">۞</span>
                    <span className="h-px flex-1 bg-amber-300" />
                  </div>
                  {pageIndex === 0 && (
                    <>
                      <h3 className="text-center text-xl font-semibold text-emerald-950 sm:text-2xl">
                        {surah?.name}
                      </h3>
                      {surah && surah.number !== 1 && surah.number !== 9 && (
                        <p
                          className="my-7 text-center text-3xl leading-relaxed text-slate-900 sm:text-4xl"
                          style={{ fontFamily: '"Noto Naskh Arabic", "Amiri", serif' }}
                        >
                          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                        </p>
                      )}
                    </>
                  )}
                  <div
                    className="text-center text-[2rem] leading-[2.35] text-slate-900 sm:text-[2.5rem] sm:leading-[2.4]"
                    style={{ fontFamily: '"Noto Naskh Arabic", "Amiri", serif' }}
                  >
                    {page.ayahs.map((ayah, pageAyahIndex) => {
                      const index = page.startIndex + pageAyahIndex;
                      return (
                        <button
                          type="button"
                          key={`${selectedSurah}-${ayah.numberInSurah}`}
                          ref={(element) => {
                            ayahRefs.current[index] = element;
                          }}
                          aria-label={translate('Ayah {number}', { number: ayah.numberInSurah })}
                          aria-current={index === selectedAyahIndex ? 'true' : undefined}
                          onClick={() => selectAyah(index)}
                          className={`mx-0.5 inline rounded-lg px-1 align-baseline transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600 ${
                            index === selectedAyahIndex && isPlaying
                              ? 'bg-amber-200 text-amber-950 shadow-sm ring-1 ring-amber-400'
                              : index === selectedAyahIndex
                                ? 'bg-emerald-100 text-emerald-950'
                                : 'hover:bg-amber-50'
                          }`}
                        >
                          {ayah.text}
                          <span
                            aria-hidden="true"
                            className={`mx-1 inline-flex h-7 min-w-7 items-center justify-center rounded-full border align-middle font-sans text-xs leading-none ${
                              index === selectedAyahIndex && isPlaying
                                ? 'border-amber-500 bg-amber-50 text-amber-900'
                                : 'border-amber-300 bg-white text-amber-800'
                            }`}
                          >
                            {ayah.numberInSurah.toLocaleString('ar')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-6 flex items-center justify-center gap-3 text-amber-800" aria-hidden="true">
                    <span className="h-px flex-1 bg-amber-300" />
                    <span className="text-sm">۞</span>
                    <span className="h-px flex-1 bg-amber-300" />
                  </div>
                  <footer className="mt-4 text-center">
                    <span className="inline-flex rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900">
                      {page.pageNumber
                        ? translate('Mushaf page {number}', { number: page.pageNumber })
                        : translate('Surah text')}
                    </span>
                  </footer>
                </article>
              ))}
              {!loadingSurah && !ayahs.length && !error && (
                <p className="py-8 text-center text-sm text-slate-500">
                  {translate('No ayahs are available for this selection.')}
                </p>
              )}
            </section>
          )}

          {selectedAyah && !loadingSurah && (
            <section className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-40 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:bottom-4 sm:left-1/2 sm:right-auto sm:w-[min(42rem,calc(100%-2rem))] sm:-translate-x-1/2 sm:rounded-2xl sm:border sm:p-4">
              <div
                role="group"
                aria-label={translate('Audio controls')}
                className="mx-auto flex max-w-4xl items-center gap-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {surah?.englishName} · {translate('Ayah')} {selectedAyah.numberInSurah}
                  </p>
                  <p className="truncate text-xs text-slate-500">{reciter?.englishName}</p>
                </div>
                <Button
                  variant="secondary"
                  aria-label={translate('Previous ayah')}
                  title={translate('Previous ayah')}
                  disabled={selectedAyahIndex === 0}
                  onClick={() => selectAyah(Math.max(0, selectedAyahIndex - 1))}
                  className="!h-11 !min-h-11 !w-11 !shrink-0 !px-0 sm:!w-auto sm:!px-4"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  onClick={() => void playPause()}
                  aria-label={translate(isPlaying ? 'Pause recitation' : 'Play recitation')}
                  title={translate(isPlaying ? 'Pause recitation' : 'Play recitation')}
                  className="!h-11 !min-h-11 !w-11 !shrink-0 !px-0 sm:!w-auto sm:!px-4"
                >
                  {isPlaying
                    ? <Pause className="h-4 w-4" aria-hidden="true" />
                    : <Play className="h-4 w-4" aria-hidden="true" />}
                  <span className="hidden sm:inline">{translate(isPlaying ? 'Pause' : 'Play')}</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={replayAyah}
                  aria-label={translate('Replay ayah')}
                  title={translate('Replay ayah')}
                  className="!h-11 !min-h-11 !w-11 !shrink-0 !px-0 sm:!w-auto sm:!px-4"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="secondary"
                  aria-label={translate('Next ayah')}
                  title={translate('Next ayah')}
                  disabled={selectedAyahIndex >= ayahs.length - 1}
                  onClick={() => selectAyah(Math.min(ayahs.length - 1, selectedAyahIndex + 1))}
                  className="!h-11 !min-h-11 !w-11 !shrink-0 !px-0 sm:!w-auto sm:!px-4"
                >
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
              <audio
                ref={audioRef}
                key={selectedAyah.audio}
                src={selectedAyah.audio}
                preload="none"
                onEnded={handleEnded}
                onError={() => setAudioError(true)}
                onPlay={() => {
                  setAudioError(false);
                  setIsPlaying(true);
                }}
                onPause={() => setIsPlaying(false)}
                className="mx-auto mt-2 h-10 w-full max-w-4xl"
                aria-label={translate('Audio recitation')}
              />
              {audioError && (
                <p role="alert" className="mt-1 text-center text-xs text-red-700">
                  {translate('Audio could not be loaded. Check your connection or choose another reciter.')}
                </p>
              )}
            </section>
          )}
        </main>
      )}
    </AppShell>
  );
}
