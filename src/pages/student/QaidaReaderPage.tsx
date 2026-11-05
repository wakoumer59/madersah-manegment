import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Pause, Play, Square } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { translate } from '@/i18n';
import {
  getQaidaWordIndexAtCharacter,
  getQaidaWordRanges,
  listQaidaLessons,
} from '@/services/qaidaService';
import type { QaidaLesson } from '@/types';
import { errorMessage } from '@/utils/errors';

export default function QaidaReaderPage() {
  const { userRecord } = useAuth();
  const institutionId = userRecord?.institutionId ?? '';
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [lessons, setLessons] = useState<QaidaLesson[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!institutionId) {
      setError(translate('Your institution could not be determined.'));
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const items = await listQaidaLessons(institutionId);
      setLessons(items);
      setSelectedId((current) =>
        current && items.some((lesson) => lesson.id === current)
          ? current
          : items[0]?.id ?? null,
      );
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const updateVoices = () => setVoices(window.speechSynthesis.getVoices());
    updateVoices();
    window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
    };
  }, []);

  useEffect(() => () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const selectedIndex = lessons.findIndex((lesson) => lesson.id === selectedId);
  const selectedLesson = lessons[selectedIndex] ?? null;
  const arabicVoice = voices.find((voice) => voice.lang.toLowerCase().startsWith('ar'));
  const wordRanges = getQaidaWordRanges(selectedLesson?.text ?? '');

  const stopReading = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setSpeaking(false);
    setPaused(false);
    setActiveWordIndex(null);
  };

  const startReading = () => {
    if (!selectedLesson) return;
    if (!('speechSynthesis' in window)) {
      setError(translate('Text-to-speech is not supported on this device.'));
      return;
    }
    if (!arabicVoice) {
      setError(translate('No Arabic voice is available on this device.'));
      return;
    }
    window.speechSynthesis.cancel();
    setError(null);
    const utterance = new SpeechSynthesisUtterance(selectedLesson.text);
    utterance.lang = arabicVoice.lang;
    utterance.voice = arabicVoice;
    utterance.rate = 0.8;
    utterance.onboundary = (event) => {
      const wordIndex = getQaidaWordIndexAtCharacter(wordRanges, event.charIndex);
      if (wordIndex !== null) setActiveWordIndex(wordIndex);
    };
    utterance.onend = () => {
      utteranceRef.current = null;
      setSpeaking(false);
      setPaused(false);
      setActiveWordIndex(null);
    };
    utterance.onerror = (event) => {
      utteranceRef.current = null;
      setSpeaking(false);
      setPaused(false);
      setActiveWordIndex(null);
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        setError(translate('Voice reading could not start. Try again.'));
      }
    };
    utteranceRef.current = utterance;
    setSpeaking(true);
    setPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const changeLesson = (lessonId: string) => {
    stopReading();
    setError(null);
    setSelectedId(lessonId);
  };

  return (
    <AppShell variant="student">
      <header className="mx-auto mb-5 max-w-4xl">
        <h1 className="text-2xl font-bold text-slate-900">{translate('Qaida Nuraniya')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {translate('Your school’s Qaida lessons will appear here after a teacher adds them.')}
        </p>
        {lessons.length > 0 && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            {translate('Read-aloud uses your device voice for practice; it is not a recorded or verified recitation. Follow your teacher for correct pronunciation.')}
          </p>
        )}
      </header>

      {error && (
        <div role="alert" className="mx-auto mb-4 max-w-4xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline">
            {translate('Retry')}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : lessons.length === 0 ? (
        <div className="mx-auto max-w-4xl">
          <EmptyState
            icon={<BookOpen className="h-10 w-10" />}
            title={translate('No lessons are available yet')}
            description={translate('Your school has not added Qaida lesson content yet. Ask your teacher to add lessons you are allowed to use.')}
          />
        </div>
      ) : (
        <div className="mx-auto grid max-w-4xl gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <section className="order-2 min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:order-2">
            {selectedLesson ? (
              <>
                <div className="mb-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                    {translate('Lesson')} {selectedLesson.order}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{selectedLesson.title}</h2>
                </div>
                <div className="relative overflow-hidden rounded-[1.75rem] border-4 border-double border-amber-300 bg-[#fffdf5] p-5 shadow-[0_12px_36px_rgba(120,83,31,0.12)] sm:p-8">
                  <span className="absolute left-2 top-1 text-xl text-emerald-700" aria-hidden="true">❧</span>
                  <span className="absolute right-2 top-1 text-xl text-emerald-700" aria-hidden="true">❧</span>
                  <span className="absolute bottom-1 left-2 rotate-180 text-xl text-emerald-700" aria-hidden="true">❧</span>
                  <span className="absolute bottom-1 right-2 rotate-180 text-xl text-emerald-700" aria-hidden="true">❧</span>
                  <div className="mb-5 flex items-center justify-center gap-3 text-amber-800" aria-hidden="true">
                    <span className="h-px flex-1 bg-amber-300" />
                    <span>۞</span>
                    <span className="h-px flex-1 bg-amber-300" />
                  </div>
                  <div
                    lang="ar"
                    dir="rtl"
                    className="min-h-48 whitespace-pre-wrap break-words py-2 text-center text-3xl leading-[2.5] text-slate-900 sm:text-4xl"
                    style={{ fontFamily: '"Noto Naskh Arabic", "Amiri", serif' }}
                  >
                    {wordRanges.map((word, index) => (
                      <Fragment key={`${word.start}-${word.end}`}>
                        {selectedLesson.text.slice(
                          index === 0 ? 0 : wordRanges[index - 1].end,
                          word.start,
                        )}
                        <span
                          className={`rounded-md px-1 transition-colors ${
                            speaking && activeWordIndex === index
                              ? 'bg-amber-200 text-amber-950 ring-1 ring-amber-400'
                              : ''
                          }`}
                        >
                          {word.text}
                        </span>
                      </Fragment>
                    ))}
                    {wordRanges.length > 0 &&
                      selectedLesson.text.slice(wordRanges[wordRanges.length - 1].end)}
                  </div>
                  <div className="mt-5 flex items-center justify-center gap-3 text-amber-800" aria-hidden="true">
                    <span className="h-px flex-1 bg-amber-300" />
                    <span>۞</span>
                    <span className="h-px flex-1 bg-amber-300" />
                  </div>
                </div>
                <p className="mt-2 text-center text-xs text-slate-500">
                  {translate('Amber marks the word currently spoken when your device provides word timing.')}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button
                    variant="secondary"
                    onClick={() => selectedIndex > 0 && changeLesson(lessons[selectedIndex - 1].id)}
                    disabled={selectedIndex <= 0}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    {translate('Previous')}
                  </Button>
                  {speaking && !paused ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        window.speechSynthesis.pause();
                        setPaused(true);
                      }}
                    >
                      <Pause className="h-4 w-4" aria-hidden="true" />
                      {translate('Pause')}
                    </Button>
                  ) : speaking && paused ? (
                    <Button
                      onClick={() => {
                        window.speechSynthesis.resume();
                        setPaused(false);
                      }}
                    >
                      <Play className="h-4 w-4" aria-hidden="true" />
                      {translate('Resume')}
                    </Button>
                  ) : (
                    <Button onClick={startReading}>
                      <Play className="h-4 w-4" aria-hidden="true" />
                      {translate('Read aloud')}
                    </Button>
                  )}
                  {speaking && (
                    <Button variant="secondary" onClick={stopReading}>
                      <Square className="h-4 w-4" aria-hidden="true" />
                      {translate('Stop')}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => selectedIndex < lessons.length - 1 && changeLesson(lessons[selectedIndex + 1].id)}
                    disabled={selectedIndex >= lessons.length - 1}
                    className="sm:ml-auto"
                  >
                    {translate('Next')}
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
                {!arabicVoice && (
                  <p className="mt-3 text-xs text-slate-500">
                    {translate('No Arabic voice is available on this device.')}
                  </p>
                )}
              </>
            ) : null}
          </section>

          <nav aria-label={translate('Lessons')} className="order-1 min-w-0 lg:order-1">
            <h2 className="mb-2 text-sm font-semibold text-slate-700">
              {translate('Lessons')} ({lessons.length})
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-2 lg:max-h-[65vh] lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pb-0">
              {lessons.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  aria-current={lesson.id === selectedId ? 'page' : undefined}
                  onClick={() => changeLesson(lesson.id)}
                  className={`min-h-12 min-w-40 rounded-xl border px-3 py-2 text-left text-sm transition-colors lg:min-w-0 ${
                    lesson.id === selectedId
                      ? 'border-indigo-300 bg-indigo-50 font-semibold text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="mr-2 text-xs text-slate-500">{lesson.order}.</span>
                  {lesson.title}
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </AppShell>
  );
}
