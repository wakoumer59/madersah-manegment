import { translate  } from '@/i18n';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
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
import { deleteTeacher, listTeachersPaged, updateTeacher } from '@/services/teacherService';
import { createManagedAccount } from '@/services/adminAccountService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty, isValidEmail, isValidPassword } from '@/utils/validation';
import type { Teacher } from '@/types';

interface TeacherForm {
  displayName: string; email: string; temporaryPassword: string;
}

export default function TeachersPage() {
  const { authUser, userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const canManageTeachers = userRecord?.role === 'institutionAdmin';
  const [items, setItems] = useState<Teacher[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState<Teacher | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [form, setForm] = useState<TeacherForm>({ displayName: '', email: '', temporaryPassword: '' });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof TeacherForm, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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

  const openAddForm = () => {
    setEditingTeacher(null);
    setForm({ displayName: '', email: '', temporaryPassword: '' });
    setFieldErrors({});
    setActionError(null);
    setOpenForm(true);
  };

  const openEditForm = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setForm({ displayName: teacher.displayName, email: teacher.email, temporaryPassword: '' });
    setFieldErrors({});
    setActionError(null);
    setOpenForm(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: Partial<Record<keyof TeacherForm, string>> = {};
    if (!isNonEmpty(form.displayName)) errors.displayName = 'Name is required.';
    if (!editingTeacher) {
      if (!isNonEmpty(form.email)) errors.email = 'Email is required.';
      else if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address.';
      if (!isValidPassword(form.temporaryPassword)) errors.temporaryPassword = 'Use at least 8 characters.';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord || !authUser) return;
    setSubmitting(true);
    setActionError(null);
    try {
      if (editingTeacher) {
        await updateTeacher(institutionId, editingTeacher, form.displayName);
        toast.success(translate("Teacher updated."));
      } else {
        await createManagedAccount({
          idToken: await authUser.getIdToken(),
          role: 'teacher',
          displayName: form.displayName,
          email: form.email,
          temporaryPassword: form.temporaryPassword,
        });
        toast.success(translate("Teacher account created. Share the temporary password securely."));
      }
      setOpenForm(false);
      setForm({ displayName: '', email: '', temporaryPassword: '' });
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
      await deleteTeacher(openDelete.uid, await authUser.getIdToken());
      setOpenDelete(null);
      toast.success(translate("Teacher removed."));
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
          <h1 className="text-2xl font-bold text-slate-900">{translate("Teachers")}</h1>
          <p className="text-sm text-slate-500">{translate("Manage teaching staff and their status.")}</p>
        </div>
        {canManageTeachers && (
          <Button onClick={openAddForm}><Plus className="h-4 w-4" /> {' '}{translate("Add teacher")}</Button>
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
          icon={<UserRound className="h-10 w-10" />}
          title={translate("No teachers yet")}
          description={translate("Add your first teacher to assign classes and subjects.")}
        />
      )}

      {actionError && !openForm && !openDelete && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <DataTable<Teacher>
            columns={[
              { key: 'displayName', label: translate("Name") },
              { key: 'email', label: translate("Email") },
              { key: 'status', label: translate("Status"), render: (t) => (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-600'}`}>
                  {translate(t.status)}
                </span>
              )},
            ]}
            items={items}
            renderActions={canManageTeachers ? (teacher) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`Edit ${teacher.displayName}`}
                  onClick={() => openEditForm(teacher)}
                  className="rounded p-1 text-orange-600 hover:bg-orange-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${teacher.displayName}`}
                  onClick={() => { setActionError(null); setOpenDelete(teacher); }}
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
        title={editingTeacher ? translate('Edit teacher') : translate('Add teacher')}
        onClose={() => setOpenForm(false)}
        busy={submitting}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {!editingTeacher && (
            <p className="text-sm text-slate-600">
              {translate("Set a temporary password and share it securely with the teacher. They must change it when they first sign in.")}{' '}</p>
          )}
          {actionError && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div>}
          <FormInput label={translate("Full name")} required value={form.displayName} error={fieldErrors.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          {!editingTeacher && (
            <>
              <FormInput label={translate("Email address")} type="email" required value={form.email} error={fieldErrors.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <FormInput
                label={translate("Temporary password")}
                type="password"
                autoComplete="new-password"
                hint={translate("At least 8 characters. The teacher will have to replace it at first sign-in.")}
                required
                value={form.temporaryPassword}
                error={fieldErrors.temporaryPassword}
                onChange={(e) => setForm({ ...form, temporaryPassword: e.target.value })}
              />
            </>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={submitting}>{translate("Cancel")}</Button>
            <Button type="submit" loading={submitting}>{editingTeacher ? translate('Save changes') : translate('Add teacher')}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={openDelete !== null}
        title={translate("Delete teacher")}
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
