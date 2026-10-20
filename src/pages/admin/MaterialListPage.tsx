import { useCallback, useEffect, useState } from 'react';
import { Plus, FileText } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { FileDropzone } from '@/components/common/FileDropzone';
import { FormInput } from '@/components/common/FormInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { createMaterial, deleteMaterial, listMaterialsPaged } from '@/services/materialService';
import { listClassesPaged } from '@/services/classService';
import { listSubjectsPaged } from '@/services/subjectService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import type { Material } from '@/types';

type MaterialForm = {
  title: string; description: string; classId: string; subjectId: string;
  visibility: 'class' | 'institution';
};

export default function AdminMaterialListPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const [materials, setMaterials] = useState<Material[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState<Material | null>(null);
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState<MaterialForm>({
    title: '', description: '', classId: '', subjectId: '', visibility: 'institution',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MaterialForm, string>>>({});
  const [files, setFiles] = useState<File[]>([]);
  const load = useCallback(async () => {
    setError(null);
    try {
      const [materialPage, classPage, subjectPage] = await Promise.all([
        listMaterialsPaged(institutionId, cursor),
        listClassesPaged(institutionId),
        listSubjectsPaged(institutionId),
      ]);
      setMaterials(materialPage.items);
      setCursor(materialPage.nextCursor);
      setHasMore(!!materialPage.nextCursor);
      setClassOptions(classPage.items.map((c) => ({ id: c.id, name: c.name })));
      setSubjectOptions(subjectPage.items.map((s) => ({ id: s.id, name: s.name })));
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [cursor, institutionId]);
  useEffect(() => { void load(); }, [load]);

  const handleFiles = (newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleSubmit = async () => {
    const errors: Partial<Record<keyof MaterialForm, string>> = {};
    if (!isNonEmpty(form.title)) errors.title = 'Title is required.';
    if (!files.length) errors.title = 'Please select a file to upload.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord) return;

    setUploading(true);
    try {
      for (const file of files) {
        await createMaterial({
          institutionId, title: form.title, description: form.description,
          classId: form.classId || null, subjectId: form.subjectId || null,
          visibility: form.visibility, file, uploadedBy: userRecord.uid,
        });
      }
      setOpenForm(false);
      setFiles([]);
      setForm({ title: '', description: '', classId: '', subjectId: '', visibility: 'institution' });
      setFieldErrors({});
      toast.success(`Material${files.length > 1 ? 's' : ''} uploaded.`);
      void load();
    } catch (err) { setError(errorMessage(err)); } finally { setUploading(false); }
  };

  const handleDelete = async (material: Material) => {
    setDeleting(material);
    try {
      await deleteMaterial(institutionId, material.id);
      setOpenDelete(null);
      toast.success('Material deleted.');
      void load();
    } catch (err) { setError(errorMessage(err)); } finally { setDeleting(null); }
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

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Learning Materials</h1>
          <p className="text-sm text-slate-500">Upload and manage class materials and resources.</p>
        </div>
        <Button onClick={() => setOpenForm(true)}><Plus className="h-4 w-4" /> Upload material</Button>
      </div>

      {!loading && !error && materials.length === 0 && (
        <EmptyState icon={<FileText className="h-10 w-10" />} title="No materials yet" description="Upload your first learning material." action={<Button onClick={() => setOpenForm(true)}>Upload material</Button>} />
      )}

      {!loading && !error && materials.length > 0 && (
        <div className="space-y-4">
          <DataTable<Material>
            columns={[
              { key: 'title', label: 'Title' },
              { key: 'fileName', label: 'File', render: (m) => m.fileName },
              { key: 'contentType', label: 'Type', render: (m) => m.contentType.split('/').pop()?.toUpperCase() || '' },
              { key: 'size', label: 'Size', render: (m) => `${(m.size / 1024 / 1024).toFixed(2)} MB` },
              { key: 'visibility', label: 'Visibility', render: (m) => <span className={`px-2 py-1 rounded text-xs font-medium ${m.visibility === 'class' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{m.visibility}</span> },
              {
                key: 'actions', label: '',
                render: (m) => (
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={() => setOpenDelete(m)}>Delete</Button>
                  </div>
                ),
              },
            ]}
            items={materials}
          />
          {hasMore && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => setCursor((c) => c ?? '')} className="w-full sm:w-auto">Load more</Button>
            </div>
          )}
        </div>
      )}

      <Modal open={openForm} title="Upload material" onClose={() => setOpenForm(false)} busy={uploading}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} noValidate className="flex flex-col gap-4">
          {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <FormInput label="Title" required value={form.title} error={fieldErrors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <FormInput label="Description" value={form.description} error={fieldErrors.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Class (optional)" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
            <option value="">All classes</option>
            {classOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select label="Subject (optional)" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
            <option value="">All subjects</option>
            {subjectOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
          <Select label="Visibility" required value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as 'class' | 'institution' })}>
            <option value="institution">Institution-wide</option>
            <option value="class">Specific class</option>
          </Select>
          <FileDropzone onFiles={handleFiles} disabled={uploading} />
          {files.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">Selected files:</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {files.map((f) => <li key={f.name}>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</li>)}
              </ul>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={uploading}>Cancel</Button>
            <Button type="submit" loading={uploading} disabled={uploading || !files.length}>Upload</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={openDelete !== null}
        title="Delete material"
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