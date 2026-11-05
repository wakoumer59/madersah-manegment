import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BookOpen, Plus, Trash2 } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { translate } from '@/i18n';
import {
  createQaidaLesson,
  deleteQaidaLesson,
  listQaidaLessons,
  validateQaidaLesson,
} from '@/services/qaidaService';
import type { QaidaLesson } from '@/types';
import { errorMessage } from '@/utils/errors';

export default function QaidaLessonsPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const [lessons, setLessons] = useState<QaidaLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');

  const load = useCallback(async () => {
    if (!institutionId) {
      setError(translate('Your institution could not be determined.'));
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setLessons(await listQaidaLessons(institutionId));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateQaidaLesson(title, text);
    if (validationError) {
      setError(translate(validationError));
      return;
    }
    if (!userRecord) {
      setError(translate('Your account could not be identified.'));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createQaidaLesson({
        institutionId,
        order: Math.max(0, ...lessons.map((lesson) => lesson.order)) + 1,
        title,
        text,
        createdBy: userRecord.uid,
      });
      setTitle('');
      setText('');
      await load();
      toast.success(translate('Lesson added.'));
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (lesson: QaidaLesson) => {
    if (!window.confirm(translate('Delete this lesson? This cannot be undone.'))) return;
    setError(null);
    try {
      await deleteQaidaLesson(institutionId, lesson.id);
      setLessons((current) => current.filter((item) => item.id !== lesson.id));
      toast.success(translate('Lesson deleted.'));
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    }
  };

  return (
    <AppShell variant="admin">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{translate('Qaida Nuraniya')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {translate('Add lesson text that students can read and hear in their browser.')}
        </p>
        <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {translate('This section does not include a preloaded Qaida book or recorded recitation. Add only lesson content you have permission to share; read-aloud uses your device voice.')}
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline">
            {translate('Retry')}
          </button>
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <Plus className="h-5 w-5" aria-hidden="true" />
          {translate('Add a lesson')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            {translate('Lesson title')}
            <input
              required
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            {translate('Arabic lesson text')}
            <textarea
              required
              dir="rtl"
              rows={5}
              maxLength={20_000}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={translate('Enter lesson text you are authorized to share.')}
              className="mt-1 min-h-36 w-full rounded-lg border border-slate-300 px-3 py-3 text-xl leading-10 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
            <span className="mt-1 block text-right text-xs font-normal text-slate-500">
              {text.length}/20,000
            </span>
          </label>
          <Button type="submit" loading={saving} className="w-full sm:w-auto">
            {translate('Add lesson')}
          </Button>
        </form>
      </section>

      {loading ? (
        <LoadingSpinner />
      ) : lessons.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {translate('Lessons')} ({lessons.length})
          </h2>
          {lessons.map((lesson) => (
            <article
              key={lesson.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="min-w-0 text-base font-semibold text-slate-900">
                  {lesson.order}. {lesson.title}
                </h3>
                <button
                  type="button"
                  aria-label={translate('Delete lesson')}
                  onClick={() => void handleDelete(lesson)}
                  className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p dir="rtl" className="mt-3 whitespace-pre-wrap break-words text-right text-xl leading-10 text-slate-800">
                {lesson.text}
              </p>
            </article>
          ))}
        </section>
      ) : (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title={translate('No lessons added yet')}
          description={translate('Add authorized lesson text for students to read and practice.')}
        />
      )}
    </AppShell>
  );
}
