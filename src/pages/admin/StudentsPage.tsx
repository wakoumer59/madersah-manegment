import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, User } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { FormInput } from '@/components/common/FormInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { Pagination } from '@/components/common/Pagination';
import { Select } from '@/components/common/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createStudent, deleteStudent, listStudentsPaged } from '@/services/studentService';
import { listClassesPaged } from '@/services/classService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import type { Student } from '@/types';

interface StudentForm {
  displayName: string; email: string; classId: string; admissionNo: string;
}

export default function StudentsPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const [items, setItems] = useState<Student[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>({ displayName: '', email: '', classId: '', admissionNo: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof StudentForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Student | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listStudentsPaged(institutionId, cursor);
      setItems(page.items);
      setCursor(page.nextCursor);
      setHasMore(!!page.nextCursor);
      const classPage = await listClassesPaged(institutionId);
      setClasses(classPage.items.map((c) => ({ id: c.id, name: c.name })));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [cursor, institutionId]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof StudentForm, string>> = {};
    if (!isNonEmpty(form.displayName)) errors.displayName = 'Name is required.';
    if (!isNonEmpty(form.email)) errors.email = 'Email is required.';
    if (!isNonEmpty(form.classId)) errors.classId = 'Class is required.';
    if (!isNonEmpty(form.admissionNo)) errors.admissionNo = 'Admission number is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord) return;
    setSubmitting(true);
    try {
      await createStudent({
        institutionId,
        uid: form.email.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        displayName: form.displayName, email: form.email,
        classId: form.classId, admissionNo: form.admissionNo,
      });
      toast.success('Student created.');
      setOpenForm(false);
      setForm({ displayName: '', email: '', classId: '', admissionNo: '' });
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
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-sm text-slate-500">Manage student enrollment and status.</p>
        </div>
        <Button onClick={() => setOpenForm(true)}><Plus className="h-4 w-4" /> Add student</Button>
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
          icon={<User className="h-10 w-10" />}
          title="No students yet"
          description="Add your first student to begin tracking attendance and results."
          action={<Button>Add student</Button>}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <DataTable<Student>
            columns={[
              { key: 'displayName', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'classId', label: 'Class' },
              { key: 'admissionNo', label: 'Admission No.' },
              { key: 'status', label: 'Status', render: (s) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                  {s.status}
                </span>
              )},
            ]}
            items={items}
          />
          <Pagination page={1} hasMore={hasMore} onNext={() => setCursor((c) => c ?? '')} onPrev={() => setCursor(null)} />
        </>
      )}

      <Modal open={openForm} title="Add student" onClose={() => setOpenForm(false)} busy={submitting}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormInput label="Full name" required value={form.displayName} error={fieldErrors.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <FormInput label="Email address" type="email" required value={form.email} error={fieldErrors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Select label="Class" required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
            <option value="">Select a class</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <FormInput label="Admission number" required value={form.admissionNo} error={fieldErrors.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} />
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting}>Add student</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={openDelete !== null}
        title="Delete student"
        message={openDelete ? `Remove “${openDelete.displayName}”? This cannot be undone.` : ''}
        confirmLabel="Delete"
        danger
        busy={deleting === openDelete}
        onConfirm={async () => {
          if (!openDelete) return;
          setDeleting(openDelete);
          await deleteStudent(institutionId, openDelete.uid);
          setDeleting(null);
          setOpenDelete(null);
          toast.success('Student removed.');
          await load();
        }}
        onCancel={() => setOpenDelete(null)}
      />
    </AppShell>
  );
}
