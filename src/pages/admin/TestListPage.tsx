import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, Clock } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { FormInput } from '@/components/common/FormInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createTest, deleteTest, listTestsPaged, updateTest } from '@/services/testService';
import { listClassesPaged } from '@/services/classService';
import { listSubjectsPaged } from '@/services/subjectService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import { todayIso } from '@/utils/dates';
import type { Test } from '@/types';

type TestForm = {
  title: string; description: string; classId: string; subjectId: string;
  startDate: string; startTime: string; endDate: string; endTime: string;
  durationMin: string; maxScore: string;
};

export default function TestListPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const [tests, setTests] = useState<Test[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<{ id: string; name: string; classId: string }[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState<Test | null>(null);
  const [form, setForm] = useState<TestForm>({
    title: '', description: '', classId: '', subjectId: '',
    startDate: todayIso(), startTime: '09:00', endDate: todayIso(), endTime: '11:00',
    durationMin: '60', maxScore: '100',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TestForm, string>>>({});
  const [deleting, setDeleting] = useState<Test | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [testPage, classPage, subjectPage] = await Promise.all([
        listTestsPaged(institutionId, cursor),
        listClassesPaged(institutionId),
        listSubjectsPaged(institutionId),
      ]);
      setTests(testPage.items);
      setCursor(testPage.nextCursor);
      setHasMore(!!testPage.nextCursor);
      setClassOptions(classPage.items.map((c) => ({ id: c.id, name: c.name })));
      setSubjectOptions(subjectPage.items.map((s) => ({ id: s.id, name: s.name, classId: s.classId })));
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [cursor, institutionId]);
  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof TestForm, string>> = {};
    if (!isNonEmpty(form.title)) errors.title = 'Title is required.';
    if (!isNonEmpty(form.classId)) errors.classId = 'Class is required.';
    const start = new Date(`${form.startDate}T${form.startTime}`).getTime();
    const end = new Date(`${form.endDate}T${form.endTime}`).getTime();
    if (isNaN(start) || isNaN(end)) errors.startDate = 'Invalid start date/time.';
    else if (end <= start) errors.endTime = 'End must be after start.';
    const duration = Number(form.durationMin);
    if (!duration || duration < 1) errors.durationMin = 'Duration must be at least 1 minute.';
    const maxScore = Number(form.maxScore);
    if (!maxScore || maxScore < 1) errors.maxScore = 'Max score must be at least 1.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord) return;
    try {
      await createTest({
        institutionId, title: form.title, description: form.description, classId: form.classId,
        subjectId: form.subjectId || null, startTime: start, endTime: end,
        durationMin: duration, maxScore, createdBy: userRecord.uid,
      });
      setOpenForm(false);
      setForm({ title: '', description: '', classId: '', subjectId: '',
        startDate: todayIso(), startTime: '09:00', endDate: todayIso(), endTime: '11:00',
        durationMin: '60', maxScore: '100' });
      setFieldErrors({});
      toast.success('Test created.');
    } catch (err) { setError(errorMessage(err)); }
  };
  const handleDelete = async (test: Test) => {
    setDeleting(test);
    try {
      await deleteTest(institutionId, test.id);
      setOpenDelete(null);
      toast.success('Test deleted.');
    } catch (err) { setError(errorMessage(err)); } finally { setDeleting(null); }
  };

  const handlePublish = async (test: Test, status: 'published' | 'closed') => {
    try {
      await updateTest({ institutionId, testId: test.id, patch: { status } });
      toast.success(`Test ${status}.`);
    } catch (err) { setError(errorMessage(err)); }
  };
  if (loading) return <LoadingSpinner fullPage />;
  if (error) {
    return (
      <AppShell variant="admin">
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error} <button type="button" onClick={() => void load()} className="font-medium underline ml-2">Retry</button>
        </div>
      </AppShell>
    );
  }

  const testCount = tests.length;

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Online Tests</h1>
          <p className="text-sm text-slate-500">Create and manage tests for your students.</p>
        </div>
        <Button onClick={() => setOpenForm(true)}><Plus className="h-4 w-4" /> Add test</Button>
      </div>

      {!loading && !error && testCount === 0 && (
        <EmptyState icon={<Clock className="h-10 w-10" />} title="No tests yet" description="Create your first test to assess your students." action={<Button>Add test</Button>} />
      )}

      {!loading && !error && testCount > 0 && (
        <>
          <DataTable<Test>
            columns={[
              { key: 'title', label: 'Test Title' },
              { key: 'classId', label: 'Class', render: (t) => classOptions.find((c) => c.id === t.classId)?.name || '—' },
              { key: 'subjectId', label: 'Subject', render: (t) => subjectOptions.find((s) => s.id === t.subjectId)?.name || '—' },
              {
                key: 'status', label: 'Status',
                render: (t) => <span className={`px-2 py-1 rounded text-xs font-medium ${t.status === 'published' ? 'bg-emerald-100 text-emerald-700' : t.status === 'closed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{t.status}</span>,
              },
              {
                key: 'actions', label: '',
                render: (t) => (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => handlePublish(t, t.status === 'published' ? 'closed' : 'published')}>
                      {t.status === 'published' ? 'Close' : 'Publish'}
                    </Button>
                    <Button variant="danger" onClick={() => setOpenDelete(t)}>Delete</Button>
                  </div>
                ),
              },
            ]}
            items={tests}
          />
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={() => setCursor((c) => c ?? '')} className="w-full sm:w-auto">Load more</Button>
            </div>
          )}
        </>
      )}
      <Modal open={openForm} title="Create test" onClose={() => setOpenForm(false)} busy={deleting !== null}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormInput label="Title" required value={form.title} error={fieldErrors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <FormInput label="Description" value={form.description} error={fieldErrors.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Class" required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
            <option value="">Select a class</option>
            {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Subject (optional)" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
            <option value="">None</option>
            {subjectOptions.filter((s) => !form.classId || s.classId === form.classId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Starts at</label>
              <input type="datetime-local" value={`${form.startDate}T${form.startTime}`} onChange={(e) => { const [d, t] = e.target.value.split('T'); setForm({ ...form, startDate: d, startTime: t }); }} className={INPUT_CLASSES} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Ends at</label>
              <input type="datetime-local" value={`${form.endDate}T${form.endTime}`} onChange={(e) => { const [d, t] = e.target.value.split('T'); setForm({ ...form, endDate: d, endTime: t }); }} className={INPUT_CLASSES} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Duration (min)</label>
              <input type="number" min="1" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} className={INPUT_CLASSES} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-700">Max score</label>
              <input type="number" min="1" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} className={INPUT_CLASSES} />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={deleting !== null}>Cancel</Button>
            <Button type="submit" loading={deleting !== null}>Create test</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={openDelete !== null}
        title="Delete test"
        message={openDelete ? `Remove “${openDelete.title}”? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        busy={deleting === openDelete}
        onConfirm={() => { if (openDelete) handleDelete(openDelete); }}
        onCancel={() => setOpenDelete(null)}
      />
    </AppShell>
  );
}

const INPUT_CLASSES =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 ' +
  'focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30';