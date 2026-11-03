import { translate  } from '@/i18n';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2, User } from 'lucide-react';
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
import { deleteStudent, listStudentsPaged, updateStudent } from '@/services/studentService';
import { createManagedAccount } from '@/services/adminAccountService';
import { listClassesPaged } from '@/services/classService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty, isValidEmail, isValidPassword } from '@/utils/validation';
import type { Student } from '@/types';

interface StudentForm {
  displayName: string; email: string; temporaryPassword: string; classId: string; admissionNo: string;
}

export default function StudentsPage() {
  const { authUser, userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const canManageStudents = userRecord?.role === 'institutionAdmin';
  const [items, setItems] = useState<Student[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [openForm, setOpenForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [openDelete, setOpenDelete] = useState<Student | null>(null);
  const [form, setForm] = useState<StudentForm>({
    displayName: '', email: '', temporaryPassword: '', classId: '', admissionNo: '',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof StudentForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const openAddForm = () => {
    setEditingStudent(null);
    setForm({ displayName: '', email: '', temporaryPassword: '', classId: '', admissionNo: '' });
    setFieldErrors({});
    setActionError(null);
    setOpenForm(true);
  };

  const openEditForm = (student: Student) => {
    setEditingStudent(student);
    setForm({
      displayName: student.displayName,
      email: student.email,
      temporaryPassword: '',
      classId: student.classId,
      admissionNo: student.admissionNo,
    });
    setFieldErrors({});
    setActionError(null);
    setOpenForm(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof StudentForm, string>> = {};
    if (!isNonEmpty(form.displayName)) errors.displayName = 'Name is required.';
    if (!editingStudent) {
      if (!isNonEmpty(form.email)) errors.email = 'Email is required.';
      else if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address.';
      if (!isValidPassword(form.temporaryPassword)) errors.temporaryPassword = 'Use at least 8 characters.';
    }
    if (!isNonEmpty(form.classId)) errors.classId = 'Class is required.';
    if (!isNonEmpty(form.admissionNo)) errors.admissionNo = 'Admission number is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord || !authUser) return;
    setSubmitting(true);
    setActionError(null);
    try {
      if (editingStudent) {
        await updateStudent({
          institutionId,
          student: editingStudent,
          displayName: form.displayName,
          classId: form.classId,
          admissionNo: form.admissionNo,
        });
        toast.success(translate("Student updated."));
      } else {
        await createManagedAccount({
          idToken: await authUser.getIdToken(),
          role: 'student',
          displayName: form.displayName,
          email: form.email,
          temporaryPassword: form.temporaryPassword,
          classId: form.classId,
          admissionNo: form.admissionNo,
        });
        toast.success(translate("Student account created. Share the temporary password securely."));
      }
      setOpenForm(false);
      setForm({ displayName: '', email: '', temporaryPassword: '', classId: '', admissionNo: '' });
      await load();
    } catch (err) {
      const message = errorMessage(err);
      setActionError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!openDelete) return;
    setDeleting(openDelete);
    setActionError(null);
    try {
      if (!authUser) throw new Error('Sign in again before deleting this account.');
      await deleteStudent(openDelete.uid, await authUser.getIdToken());
      setOpenDelete(null);
      toast.success(translate("Student removed."));
      await load();
    } catch (err) {
      const message = errorMessage(err);
      setActionError(message);
      toast.error(message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translate("Students")}</h1>
          <p className="text-sm text-slate-500">{translate("Manage student enrollment and status.")}</p>
        </div>
        {canManageStudents && (
          <Button onClick={openAddForm}><Plus className="h-4 w-4" /> {' '}{translate("Add student")}</Button>
        )}
      </div>

      {actionError && !openForm && !openDelete && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {loading ? (
        <LoadingSpinner fullPage />
      ) : error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}<button type="button" onClick={() => void load()} className="font-medium underline">{translate("Retry")}</button>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <EmptyState
          icon={<User className="h-10 w-10" />}
          title={translate("No students yet")}
          description={translate("Add your first student to begin tracking attendance and results.")}
        />
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <DataTable<Student>
            columns={[
              { key: 'displayName', label: translate("Name") },
              { key: 'email', label: translate("Email") },
              { key: 'classId', label: translate("Class") },
              { key: 'admissionNo', label: translate("Admission No.") },
              { key: 'status', label: translate("Status"), render: (s) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                  {translate(s.status)}
                </span>
              )},
            ]}
            items={items}
            renderActions={canManageStudents ? (student) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`Edit ${student.displayName}`}
                  onClick={() => openEditForm(student)}
                  className="rounded p-1 text-orange-600 hover:bg-orange-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${student.displayName}`}
                  onClick={() => { setActionError(null); setOpenDelete(student); }}
                  className="rounded p-1 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : undefined}
          />
          <Pagination page={1} hasMore={hasMore} onNext={() => setCursor((c) => c ?? '')} onPrev={() => setCursor(null)} />
        </>
      )}

      <Modal
        open={openForm}
        title={editingStudent ? translate('Edit student') : translate('Add student')}
        onClose={() => setOpenForm(false)}
        busy={submitting}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {!editingStudent && (
            <p className="text-sm text-slate-600">
              {translate("Set a temporary password and share it securely with the student. They must change it when they first sign in.")}{' '}</p>
          )}
          {actionError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>}
          <FormInput label={translate("Full name")} required value={form.displayName} error={fieldErrors.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          {!editingStudent && (
            <>
              <FormInput label={translate("Email address")} type="email" required value={form.email} error={fieldErrors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FormInput
                label={translate("Temporary password")}
                type="password"
                autoComplete="new-password"
                hint={translate("At least 8 characters. The student will have to replace it at first sign-in.")}
                required
                value={form.temporaryPassword}
                error={fieldErrors.temporaryPassword}
                onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
              />
            </>
          )}
          <Select label={translate("Class")} required value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
            <option value="">{translate("Select a class")}</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <FormInput label={translate("Admission number")} required value={form.admissionNo} error={fieldErrors.admissionNo} onChange={(e) => setForm({ ...form, admissionNo: e.target.value })} />
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={submitting}>{translate("Cancel")}</Button>
            <Button type="submit" loading={submitting}>{editingStudent ? translate('Save changes') : translate('Add student')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={openDelete !== null}
        title={translate("Delete student")}
        message={openDelete ? translate('Remove “{name}”? This cannot be undone.', { name: openDelete.displayName }) : ''}
        confirmLabel={translate("Delete")}
        danger
        busy={deleting === openDelete}
        onConfirm={() => { void handleDelete(); }}
        onCancel={() => setOpenDelete(null)}
      />
    </AppShell>
  );
}
