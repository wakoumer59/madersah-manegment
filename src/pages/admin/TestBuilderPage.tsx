import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ClipboardList, Plus } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { FormInput } from '@/components/common/FormInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createQuestion, deleteTest, getTest, getTestQuestions, updateTest } from '@/services/testService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import type { Question, AnswerChoice, QuestionType } from '@/types';

type QuestionForm = {
  type: QuestionType; text: string; optionA: string; optionB: string;
  optionC: string; optionD: string; correct: AnswerChoice;
};

export default function TestBuilderPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const { testId } = useParams<{ testId: string }>();
  const institutionId = userRecord?.institutionId ?? '';
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<(Question & { correct: AnswerChoice })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<QuestionForm>({
    type: 'mcq', text: '', optionA: '', optionB: '', optionC: '', optionD: '', correct: 'A',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof QuestionForm, string>>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!testId || !institutionId) return;
    setLoading(true);
    setError(null);
    try {
      const [t, qs] = await Promise.all([getTest(institutionId, testId), getTestQuestions(institutionId, testId)]);
      setTest(t);
      setQuestions(qs);
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [testId, institutionId]);
  useEffect(() => { void load(); }, [load]);

  const handlePublish = async () => {
    if (!test) return;
    setSaving(true);
    try {
      await updateTest({ institutionId, testId: test.id, patch: { status: 'published' } });
      setTest({ ...test, status: 'published' });
      toast.success('Test published.');
    } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
  };
  const handleClose = async () => {
    if (!test) return;
    setSaving(true);
    try {
      await updateTest({ institutionId, testId: test.id, patch: { status: 'closed' } });
      setTest({ ...test, status: 'closed' });
      toast.success('Test closed.');
    } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!test || !window.confirm(`Delete “${test.title}”? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await deleteTest(institutionId, test.id);
      toast.success('Test deleted.');
    } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
  };

  const handleQuestionSubmit = async () => {
    const errors: Partial<Record<keyof QuestionForm, string>> = {};
    if (!isNonEmpty(form.text)) errors.text = 'Question text is required.';
    if (!isNonEmpty(form.optionA)) errors.optionA = 'Option A is required.';
    if (!isNonEmpty(form.optionB)) errors.optionB = 'Option B is required.';
    const options: Record<string, string> = { A: form.optionA, B: form.optionB };
    if (form.type === 'mcq') {
      if (!isNonEmpty(form.optionC)) errors.optionC = 'Option C is required.';
      if (!isNonEmpty(form.optionD)) errors.optionD = 'Option D is required.';
      options.C = form.optionC;
      options.D = form.optionD;
    } else {
      options.A = 'True';
      options.B = 'False';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord) return;
    try {
      await createQuestion({
        institutionId, testId: testId!,
        type: form.type, text: form.text, options, correct: form.correct,
      });
      setOpenForm(false);
      setForm({ type: 'mcq', text: '', optionA: '', optionB: '', optionC: '', optionD: '', correct: 'A' });
      setFieldErrors({});
      void load();
      toast.success('Question added.');
    } catch (err) { setError(errorMessage(err)); }
  };
  if (loading) return <LoadingSpinner fullPage />;
  if (error || !test) {
    return (
      <AppShell variant="admin">
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || 'Test not found'} <button type="button" onClick={() => void load()} className="font-medium underline ml-2">Retry</button>
        </div>
      </AppShell>
    );
  }

  const questionCount = questions.length;
  const isPublished = test.status === 'published';

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{test.title}</h1>
          <p className="text-sm text-slate-500">{test.description}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setOpenForm(true)} disabled={isPublished || saving}><Plus className="h-4 w-4" /> Add question</Button>
          <Button variant={isPublished ? 'danger' : 'primary'} onClick={isPublished ? handleClose : handlePublish} loading={saving} disabled={saving}>
            {isPublished ? 'Close test' : 'Publish test'}
          </Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>Delete test</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase">Questions</div>
          <div className="text-2xl font-bold text-slate-900">{questionCount}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase">Status</div>
          <div className={`text-lg font-semibold ${isPublished ? 'text-emerald-700' : 'text-slate-700'}`}>{test.status}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase">Class</div>
          <div className="text-lg font-bold text-slate-900">{test.classId}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs font-semibold text-slate-400 uppercase">Max score</div>
          <div className="text-lg font-bold text-slate-900">{test.maxScore}</div>
        </div>
      </div>

      {questionCount === 0 && (
        <EmptyState icon={<ClipboardList className="h-10 w-10" />} title="No questions yet" description="Add questions to build your test." action={<Button onClick={() => setOpenForm(true)}>Add question</Button>} />
      )}

      {questionCount > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left border-b border-slate-100">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">#</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Question</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400 text-center">Correct</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {questions.map((q, index) => (
                <tr key={q.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    <span className={`px-2 py-0.5 rounded text-xs ${q.type === 'mcq' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{q.type.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{q.text}</td>
                  <td className="px-4 py-3 text-sm text-center font-medium">{q.correct === 'A' ? 'A' : q.correct === 'B' ? 'B' : q.correct === 'C' ? 'C' : 'D'}</td>
                  <td className="px-4 py-3 text-sm">
                    <Button variant="danger" onClick={() => {}}>Remove</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Modal open={openForm} title="Add question" onClose={() => setOpenForm(false)} busy={saving}>
        <form onSubmit={(e) => { e.preventDefault(); handleQuestionSubmit(); }} noValidate className="flex flex-col gap-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <Select label="Question type" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}>
            <option value="mcq">Multiple Choice (A–D)</option>
            <option value="truefalse">True / False</option>
          </Select>
          <FormInput label="Question text" required value={form.text} error={fieldErrors.text} onChange={(e) => setForm({ ...form, text: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Option A" required value={form.optionA} error={fieldErrors.optionA} onChange={(e) => setForm({ ...form, optionA: e.target.value })} />
            <FormInput label="Option B" required value={form.optionB} error={fieldErrors.optionB} onChange={(e) => setForm({ ...form, optionB: e.target.value })} />
          </div>
          {form.type === 'mcq' && (
            <div className="grid grid-cols-2 gap-4">
              <FormInput label="Option C" required value={form.optionC} error={fieldErrors.optionC} onChange={(e) => setForm({ ...form, optionC: e.target.value })} />
              <FormInput label="Option D" required value={form.optionD} error={fieldErrors.optionD} onChange={(e) => setForm({ ...form, optionD: e.target.value })} />
            </div>
          )}
          <label className="mb-1 block text-sm font-medium text-slate-700">Correct answer</label>
          <select value={form.correct} onChange={(e) => setForm({ ...form, correct: e.target.value as AnswerChoice })} className={INPUT_CLASSES}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
            <option value="D">D</option>
          </select>
          {fieldErrors.correct && <p role="alert" className="mt-1 text-sm text-red-600">{fieldErrors.correct}</p>}
          <div className="mt-4 flex justify-end">
            <Button type="submit" loading={saving}>Add question</Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}

const INPUT_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 ' +
  'focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30';