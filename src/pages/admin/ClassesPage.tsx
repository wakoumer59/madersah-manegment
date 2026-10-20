import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, School } from 'lucide-react';
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
import { createClass, deleteClass, listClassesPaged } from '@/services/classService';
import { listTeachersPaged } from '@/services/teacherService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import type { SchoolClass } from '@/types';

interface ClassForm {
  name: string; academicYear: string; teacherUid: string;
}

export default function ClassesPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const [items, setItems] = useState<SchoolClass[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<{ uid: string; displayName: string }[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState<SchoolClass | null>(null);
  const [form, setForm] = useState<ClassForm>({ name: '', academicYear: '', teacherUid: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ClassForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<SchoolClass | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [classPage, teacherPage] = await Promise.all([
        listClassesPaged(institutionId, cursor),
        listTeachersPaged(institutionId),
      ]);
      setItems(classPage.items);
      setCursor(classPage.nextCursor);
      setHasMore(!!classPage.nextCursor);
      setTeachers(teacherPage.items.map((t) => ({ uid: t.uid, displayName: t.displayName })));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [cursor, institutionId]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof ClassForm, string>> = {};
    if (!isNonEmpty(form.name)) errors.name = 'Class name is required.';
    if (!isNonEmpty(form.academicYear)) errors.academicYear = 'Academic year is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord) return;
    setSubmitting(true);
    try {
      await createClass({
        institutionId, name: form.name, academicYear: form.academicYear,
        teacherUid: form.teacherUid || null,
      });
      toast.success('Class created.');
      setOpenForm(false);
      setForm({ name: '', academicYear: '', teacherUid: '' });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (cls: SchoolClass) => {
    setDeleting(cls);
    await deleteClass(institutionId, cls.id);
    setDeleting(null);
    setOpenDelete(null);
    toast.success('Class removed.');
    await load();
  };

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Classes</h1>
          <p className="text-sm text-slate-500">Manage classes and academic years.</p>
        </div>
        <Button onClick={() => setOpenForm(true)}><Plus className="h-4 w-4" /> Add class</Button>
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
          icon={<School className="h-10 w-10" />}
          title="No classes yet"
          description="Add your first class to begin enrolling students."
          action={<Button>Add class</Button>}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <DataTable<SchoolClass>
            columns={[
              { key: 'name', label: 'Class Name' },
              { key: 'academicYear', label: 'Academic Year' },
              { key: 'teacherUid', label: 'Teacher', render: (c) => teachers.find((t) => t.uid === c.teacherUid)?.displayName || '—' },
              { key: 'studentCount', label: 'Students', render: (c) => String(c.studentCount) },
            ]}
            items={items}
          />
          <Pagination page={1} hasMore={hasMore} onNext={() => setCursor((c) => c ?? '')} onPrev={() => setCursor(null)} />
        </>
      )}

      <Modal open={openForm} title="Add class" onClose={() => setOpenForm(false)} busy={submitting}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormInput label="Class name (e.g. Grade 7A)" required value={form.name} error={fieldErrors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FormInput label="Academic year (e.g. 2026/2027)" required value={form.academicYear} error={fieldErrors.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} />
          <Select label="Class teacher (optional)" value={form.teacherUid} onChange={(e) => setForm({ ...form, teacherUid: e.target.value })}>
            <option value="">None assigned</option>
            {teachers.map((t) => <option key={t.uid} value={t.uid}>{t.displayName}</option>)}
          </Select>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={submitting}>Cancel</Button>
            <Button type="submit" loading={submitting}>Add class</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={openDelete !== null}
        title="Delete class"
        message={openDelete ? `Remove “${openDelete.name}”? Students in this class will lose their class assignment.` : ''}
        confirmLabel="Delete"
        danger
        busy={deleting === openDelete}
        onConfirm={() => { if (openDelete) handleDelete(openDelete); }}
        onCancel={() => setOpenDelete(null)}
      />
    </AppShell>
  );
}
