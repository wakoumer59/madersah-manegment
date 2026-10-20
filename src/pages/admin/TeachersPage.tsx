import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, UserRound } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { FormInput } from '@/components/common/FormInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createTeacher, deleteTeacher, listTeachersPaged } from '@/services/teacherService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import type { Teacher } from '@/types';

interface TeacherForm {
  displayName: string; email: string;
}

export default function TeachersPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const [items, setItems] = useState<Teacher[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>({ displayName: '', email: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TeacherForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Teacher | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listTeachersPaged(institutionId, cursor);
      setItems(page.items);
      setCursor(page.nextCursor);
      setHasMore(!!page.nextCursor);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [cursor, institutionId]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof TeacherForm, string>> = {};
    if (!isNonEmpty(form.displayName)) errors.displayName = 'Name is required.';
    if (!isNonEmpty(form.email)) errors.email = 'Email is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord) return;
    setSubmitting(true);
    try {
      await createTeacher({
        institutionId,
        uid: form.email.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        displayName: form.displayName, email: form.email,
      });
      toast.success('Teacher created.');
      setOpenForm(false);
      setForm({ displayName: '', email: '' });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Teachers</h1>
          <p className="text-sm text-slate-500">Manage teaching staff and their status.</p>
        </div>
        <Button onClick={() => setOpenForm(true)}><Plus className="h-4 w-4" /> Add teacher</Button>
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}<button type="button" onClick={() => void load()} className="font-medium underline">Retry</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<UserRound className="h-10 w-10" />}
          title="No teachers yet"
          description="Add your first teacher to assign classes and subjects."
          action={<Button>Add teacher</Button>}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <DataTable<Teacher>
            columns={[
              { key: 'displayName', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'status', label: 'Status', render: (t) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                  {t.status}
                </span>
              )},
            ]}
            items={items}
          />
          <Pagination page={1} hasMore={hasMore} onNext={() => setCursor((c) => c ?? '')} onPrev={() => setCursor(null)} />
        </>
      )}

      <Modal open={openForm} title="Add teacher" onClose={() => setOpenForm(false)} busy={submitting}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormInput label="Full name" required value={form.displayName} error={fieldErrors.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <FormInput label="Email address" type="email" required value={form.email} error={fieldErrors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting}>Add teacher</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={openDelete !== null}
        title="Delete teacher"
        message={openDelete ? `Remove “${openDelete.displayName}”? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        busy={deleting === openDelete}
        onConfirm={async () => {
          if (!openDelete) return;
          setDeleting(openDelete);
          await deleteTeacher(institutionId, openDelete.uid);
          setDeleting(null);
          setOpenDelete(null);
          toast.success('Teacher removed.');
          await load();
        }}
        onCancel={() => setOpenDelete(null)}
      />
    </AppShell>
  );
}
