import { translate  } from '@/i18n';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Plus, BookOpen, Trash2 } from 'lucide-react';
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
import { createSubject, deleteSubject, listSubjectsPaged } from '@/services/subjectService';
import { listClassesPaged } from '@/services/classService';
import { listTeachersPaged } from '@/services/teacherService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import type { Subject } from '@/types';

interface SubjectForm {
  name: string; classId: string; teacherUid: string;
}

export default function SubjectsPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const canManageSubjects = userRecord?.role === 'institutionAdmin';
  const [items, setItems] = useState<Subject[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);
  const [teacherOptions, setTeacherOptions] = useState<{ uid: string; displayName: string }[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectForm>({ name: '', classId: '', teacherUid: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof SubjectForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Subject | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [subjectPage, classPage, teacherPage] = await Promise.all([
        listSubjectsPaged(institutionId, cursor),
        listClassesPaged(institutionId),
        listTeachersPaged(institutionId),
      ]);
      setItems(subjectPage.items);
      setCursor(subjectPage.nextCursor);
      setHasMore(!!subjectPage.nextCursor);
      setClassOptions(classPage.items.map((c) => ({ id: c.id, name: c.name })));
      setTeacherOptions(teacherPage.items.map((t) => ({ uid: t.uid, displayName: t.displayName })));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [cursor, institutionId]);

  useEffect(() => { void load(); }, [load]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof SubjectForm, string>> = {};
    if (!isNonEmpty(form.name)) errors.name = 'Subject name is required.';
    if (!isNonEmpty(form.classId)) errors.classId = 'Class is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord) return;
    setSubmitting(true);
    try {
      await createSubject({
        institutionId, name: form.name, classId: form.classId, teacherUid: form.teacherUid || null,
      });
      toast.success(translate("Subject created."));
      setOpenForm(false);
      setForm({ name: '', classId: '', teacherUid: '' });
      await load();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
      setFieldErrors({});
    }
  };

  const handleDelete = async (sub: Subject) => {
    setDeleting(sub);
    try {
      await deleteSubject(institutionId, sub.id);
      setOpenDelete(null);
      toast.success(translate("Subject removed."));
      await load();
    } catch (err) {
      const message = errorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translate("Subjects")}</h1>
          <p className="text-sm text-slate-500">{translate("Manage subjects and their class assignments.")}</p>
        </div>
        {canManageSubjects && (
          <Button onClick={() => setOpenForm(true)}><Plus className="h-4 w-4" /> {' '}{translate("Add subject")}</Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner fullPage />
      ) : error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}<button type="button" onClick={() => void load()} className="font-medium underline">{translate("Retry")}</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<BookOpen className="h-10 w-10" />}
          title={translate("No subjects yet")}
          description={translate("Add your first subject to assign to a class and teacher.")}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <DataTable<Subject>
            columns={[
              { key: 'name', label: translate("Subject Name") },
              { key: 'classId', label: translate("Class"), render: (s) => classOptions.find((c) => c.id === s.classId)?.name || '—' },
              { key: 'teacherUid', label: translate("Teacher"), render: (s) => teacherOptions.find((t) => t.uid === s.teacherUid)?.displayName || '—' },
            ]}
            items={items}
            renderActions={canManageSubjects ? (subject) => (
              <button
                type="button"
                aria-label={`Delete ${subject.name}`}
                onClick={() => setOpenDelete(subject)}
                className="rounded p-1 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : undefined}
          />
          <Pagination page={1} hasMore={hasMore} onNext={() => setCursor((c) => c ?? '')} onPrev={() => setCursor(null)} />
        </>
      )}

      <Modal open={openForm} title={translate("Add subject")} onClose={() => setOpenForm(false)} busy={submitting}>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormInput label={translate("Subject name")} required value={form.name} error={fieldErrors.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label={translate("Class")} required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
            <option value="">{translate("Select a class")}</option>
            {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label={translate("Subject teacher (optional)")} value={form.teacherUid} onChange={(e) => setForm({ ...form, teacherUid: e.target.value })}>
            <option value="">{translate("None assigned")}</option>
            {teacherOptions.map((t) => <option key={t.uid} value={t.uid}>{t.displayName}</option>)}
          </Select>
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={submitting}>{translate("Cancel")}</Button>
            <Button type="submit" loading={submitting}>{translate("Add subject")}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={openDelete !== null}
        title={translate("Delete subject")}
        message={openDelete ? `Remove “${openDelete.name}”? This cannot be undone.` : ''}
        confirmLabel={translate("Delete")}
        danger
        busy={deleting === openDelete}
        onConfirm={() => { if (openDelete) handleDelete(openDelete); }}
        onCancel={() => setOpenDelete(null)}
      />
    </AppShell>
  );
}
