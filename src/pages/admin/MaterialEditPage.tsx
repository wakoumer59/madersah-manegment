import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { FileDropzone } from '@/components/common/FileDropzone';
import { FormInput } from '@/components/common/FormInput';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { Select } from '@/components/common/Select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getMaterial, replaceMaterial } from '@/services/materialService';
import { listClassesPaged } from '@/services/classService';
import { listSubjectsPaged } from '@/services/subjectService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import type { Material } from '@/types';

type MaterialForm = {
  title: string;
  description: string;
  classId: string;
  subjectId: string;
  visibility: 'class' | 'institution';
};

export default function AdminMaterialEditPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { materialId } = useParams<{ materialId: string }>();
  const institutionId = userRecord?.institutionId ?? '';
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<MaterialForm>({
    title: '',
    description: '',
    classId: '',
    subjectId: '',
    visibility: 'institution',
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof MaterialForm, string>>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [classOptions, setClassOptions] = useState<{ id: string; name: string }[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    if (!materialId || !institutionId) return;
    setLoading(true);
    setError(null);
    try {
      const [m, classPage, subjectPage] = await Promise.all([
        getMaterial(institutionId, materialId),
        listClassesPaged(institutionId),
        listSubjectsPaged(institutionId),
      ]);
      setMaterial(m);
      if (m) {
        setForm({
          title: m.title,
          description: m.description,
          classId: m.classId ?? '',
          subjectId: m.subjectId ?? '',
          visibility: m.visibility,
        });
      }
      setClassOptions(classPage.items.map((c) => ({ id: c.id, name: c.name })));
      setSubjectOptions(subjectPage.items.map((s) => ({ id: s.id, name: s.name })));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [materialId, institutionId]);
  useEffect(() => {
    void load();
  }, [load]);

  const handleFiles = (newFiles: File[]) => {
    setFiles(newFiles);
  };

  const handleSubmit = async () => {
    const errors: Partial<Record<keyof MaterialForm, string>> = {};
    if (!isNonEmpty(form.title)) errors.title = 'Title is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !userRecord || !files.length) return;

    setReplacing(true);
    try {
      for (const file of files) {
        await replaceMaterial(institutionId, materialId!, file, userRecord.uid);
      }
      setOpenForm(false);
      setFiles([]);
      toast.success('Material replaced.');
      void load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setReplacing(false);
    }
  };
  if (loading) return <LoadingSpinner fullPage />;
  if (error || !material) {
    return (
      <AppShell variant="admin">
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error || 'Material not found'}
          <button type="button" onClick={() => navigate(-1)} className="font-medium underline ml-2">
            Back
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{material.title}</h1>
          <p className="text-sm text-slate-500">Replace or update this material.</p>
        </div>
        <Button variant="secondary" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="h-8 w-8 text-slate-500" />
          <div>
            <p className="text-sm font-medium text-slate-900">{material.fileName}</p>
            <p className="text-xs text-slate-500">
              {material.contentType} • {(material.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>

        <Button onClick={() => setOpenForm(true)}>
          <FileText className="h-4 w-4 mr-2" />
          Replace file
        </Button>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Visibility</p>
            <p className={`text-sm font-medium ${material.visibility === 'class' ? 'text-amber-700' : 'text-indigo-700'}`}>
              {material.visibility}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Uploaded by</p>
            <p className="text-sm font-medium text-slate-900">{material.uploadedBy}</p>
          </div>
        </div>
      </div>

      <Modal open={openForm} title="Replace material file" onClose={() => setOpenForm(false)} busy={replacing}>
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} noValidate className="flex flex-col gap-4">
          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <FormInput label="Title" required value={form.title} error={fieldErrors.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <FormInput label="Description" value={form.description} error={fieldErrors.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select label="Class (optional)" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
            <option value="">All classes</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Select label="Subject (optional)" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
            <option value="">All subjects</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          <Select label="Visibility" required value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as 'class' | 'institution' })}>
            <option value="institution">Institution-wide</option>
            <option value="class">Specific class</option>
          </Select>
          <FileDropzone onFiles={handleFiles} disabled={replacing} />
          {files.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-500 mb-2">Selected files:</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {files.map((f) => (
                  <li key={f.name}>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setOpenForm(false)} disabled={replacing}>
              Cancel
            </Button>
            <Button type="submit" loading={replacing} disabled={replacing || !files.length}>
              Replace
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}