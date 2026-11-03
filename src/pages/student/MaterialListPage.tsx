import { translate  } from '@/i18n';
import { useCallback, useEffect, useState } from 'react';
import { FileText, Download } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { getMaterial, incrementDownloadCount, listMaterialsPaged } from '@/services/materialService';
import { errorMessage } from '@/utils/errors';
import type { Material } from '@/types';

export default function StudentMaterialListPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const classId = userRecord?.classId ?? '';
  const [materials, setMaterials] = useState<Material[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const materialPage = await listMaterialsPaged(institutionId, cursor);
      // Filter: institution-wide OR (class-specific AND matches student's class)
      const visible = materialPage.items.filter((m) =>
        m.visibility === 'institution' ||
        (m.visibility === 'class' && m.classId === classId),
      );
      setMaterials(visible);
      setCursor(materialPage.nextCursor);
      setHasMore(!!materialPage.nextCursor);
    } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); }
  }, [cursor, institutionId, classId]);
  useEffect(() => { void load(); }, [load]);

  const handleDownload = async (material: Material) => {
    setDownloading(material.id);
    try {
      await incrementDownloadCount(institutionId, material.id);
      const full = await getMaterial(institutionId, material.id);
      if (full?.downloadUrl) {
        window.open(full.downloadUrl, '_blank');
      }
      toast.success(translate('Downloading {fileName}…', { fileName: material.fileName }));
    } catch (err) { setError(errorMessage(err)); } finally { setDownloading(null); }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (error) {
    return (
      <AppShell variant="student">
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error} <button type="button" onClick={() => void load()} className="font-medium underline ml-2">{translate("Retry")}</button>
        </div>
      </AppShell>
    );
  }

  if (materials.length === 0) {
    return (
      <AppShell variant="student">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-slate-900">{translate("Learning Materials")}</h1>
          <p className="text-sm text-slate-500">{translate("Class materials shared by your teachers.")}</p>
        </div>
        <EmptyState icon={<FileText className="h-10 w-10" />} title={translate("No materials available")} description={translate("Your teachers haven't shared any materials yet.")} />
      </AppShell>
    );
  }

  return (
    <AppShell variant="student">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-slate-900">{translate("Learning Materials")}</h1>
        <p className="text-sm text-slate-500">{translate("Class materials shared by your teachers.")}</p>
      </div>

      <DataTable<Material>
        columns={[
          { key: 'title', label: translate("Title") },
          { key: 'fileName', label: translate("File"), render: (m) => m.fileName },
          { key: 'contentType', label: translate("Type"), render: (m) => m.contentType.split('/').pop()?.toUpperCase() || '' },
          { key: 'size', label: translate("Size"), render: (m) => `${(m.size / 1024 / 1024).toFixed(2)} MB` },
          {
            key: 'actions', label: '',
            render: (m) => (
              <Button
                variant="secondary"
                onClick={() => handleDownload(m)}
                disabled={downloading === m.id}
                loading={downloading === m.id}
              >
                <Download className="h-3 w-3 mr-1" /> {' '}{translate("Download")}{' '}</Button>
            ),
          },
        ]}
        items={materials}
      />
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => setCursor((c) => c ?? '')} className="w-full sm:w-auto">{translate("Load more")}</Button>
        </div>
      )}
    </AppShell>
  );
}