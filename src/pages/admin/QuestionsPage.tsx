import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ClipboardList, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { FormInput } from '@/components/common/FormInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { translate } from '@/i18n';
import {
  createChoiceQuestion,
  deleteChoiceQuestion,
  listChoiceQuestions,
  type ChoiceQuestion,
} from '@/services/questionService';
import type { AnswerChoice } from '@/types';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';

type QuestionForm = {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: AnswerChoice;
};

const EMPTY_FORM: QuestionForm = {
  text: '',
  optionA: '',
  optionB: '',
  optionC: '',
  optionD: '',
  correct: 'A',
};

const CHOICES: AnswerChoice[] = ['A', 'B', 'C', 'D'];

export default function QuestionsPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const [questions, setQuestions] = useState<ChoiceQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<QuestionForm>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof QuestionForm, string>>>({});

  const load = useCallback(async () => {
    if (!institutionId) {
      setQuestions([]);
      setError(translate('Your institution could not be determined.'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setQuestions(await listChoiceQuestions(institutionId));
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
    const errors: Partial<Record<keyof QuestionForm, string>> = {};
    if (!isNonEmpty(form.text)) errors.text = 'Question text is required.';
    for (const choice of CHOICES) {
      const field = `option${choice}` as const;
      if (!isNonEmpty(form[field])) errors[field] = `Option ${choice} is required.`;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length || !userRecord) return;

    setSaving(true);
    setError(null);
    try {
      await createChoiceQuestion({
        institutionId,
        createdBy: userRecord.uid,
        text: form.text,
        options: {
          A: form.optionA,
          B: form.optionB,
          C: form.optionC,
          D: form.optionD,
        },
        correct: form.correct,
      });
      setOpenForm(false);
      setForm(EMPTY_FORM);
      setFieldErrors({});
      await load();
      toast.success(translate('Question created.'));
    } catch (saveError) {
      setError(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (question: ChoiceQuestion) => {
    if (!window.confirm(translate('Remove this question? This cannot be undone.'))) return;
    setSaving(true);
    setError(null);
    try {
      await deleteChoiceQuestion(institutionId, question.id);
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      toast.success(translate('Question removed.'));
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translate('Online Questions')}</h1>
          <p className="text-sm text-slate-500">
            {translate('Create and manage multiple-choice questions.')}
          </p>
        </div>
        <Button onClick={() => setOpenForm(true)}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          {translate('Add question')}
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline">
            {translate('Retry')}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : questions.length ? (
        <DataTable<ChoiceQuestion>
          columns={[
            { key: 'text', label: translate('Question') },
            {
              key: 'options',
              label: translate('Choices'),
              render: (question) => (
                <ul className="space-y-1">
                  {CHOICES.map((choice) => (
                    <li key={choice}>
                      <span className="font-medium">{choice}.</span> {question.options[choice]}
                    </li>
                  ))}
                </ul>
              ),
            },
            {
              key: 'correct',
              label: translate('Correct answer'),
              render: (question) => (
                <span className="font-semibold">{question.correct}</span>
              ),
            },
          ]}
          items={questions}
          renderActions={(question) => (
            <Button
              variant="danger"
              onClick={() => void handleDelete(question)}
              disabled={saving}
            >
              {translate('Remove')}
            </Button>
          )}
        />
      ) : (
        <EmptyState
          icon={<ClipboardList className="h-10 w-10" />}
          title={translate('No online questions yet')}
          description={translate('Create your first multiple-choice question.')}
        />
      )}

      <Modal
        open={openForm}
        title={translate('Add question')}
        onClose={() => setOpenForm(false)}
        busy={saving}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <FormInput
            label={translate('Question text')}
            required
            value={form.text}
            error={fieldErrors.text}
            onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {CHOICES.map((choice) => {
              const field = `option${choice}` as const;
              return (
                <FormInput
                  key={choice}
                  label={translate(`Option ${choice}`)}
                  required
                  value={form[field]}
                  error={fieldErrors[field]}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                />
              );
            })}
          </div>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {translate('Correct answer')}
            <select
              required
              value={form.correct}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  correct: event.target.value as AnswerChoice,
                }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            >
              {CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {translate(choice)}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 flex justify-end">
            <Button type="submit" loading={saving}>
              {translate('Add question')}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
