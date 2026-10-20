import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useToast } from '@/contexts/ToastContext';
import { listInstitutions, setInstitutionStatus } from '@/services/institutionService';
import { errorMessage } from '@/utils/errors';
import type { Institution } from '@/types';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-red-50 text-red-700 border-red-200',
};

export default function InstitutionsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Institution[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<Institution | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await listInstitutions();
      setItems(page.items);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const page = await listInstitutions(cursor);
      setItems((current) => [...current, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggle = async () => {
    if (!toggling) return;
    setBusy(true);
    const next = toggling.status === 'active' ? 'suspended' : 'active';
    try {
      await setInstitutionStatus(toggling.id, next);
      toast.success(
        next === 'suspended'
          ? `“${toggling.name}” suspended — its staff can no longer write data.`
          : `“${toggling.name}” reactivated.`,
      );
      setToggling(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell variant="owner">
      <h1 className="text-xl font-semibold text-slate-900">Institutions</h1>
      <p className="mb-4 text-sm text-slate-500">
        All approved madrasahs on the platform.
      </p>

      {loading && <LoadingSpinner fullPage />}
      {!loading && error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline">
            Retry
          </button>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <EmptyState
          title="No institutions yet"
          description="Approved registration requests will show up here."
        />
      )}

      <div className="flex flex-col gap-3">
        {items.map((institution) => (
          <Card key={institution.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{institution.name}</p>
                <p className="text-sm text-slate-600">{institution.contactEmail}</p>
                <p className="text-sm text-slate-500">{institution.address}</p>
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[institution.status] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
              >
                {institution.status}
              </span>
            </div>
            <div className="mt-3">
              <Button
                variant={institution.status === 'active' ? 'danger' : 'secondary'}
                onClick={() => setToggling(institution)}
              >
                {institution.status === 'active' ? 'Suspend' : 'Reactivate'}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {cursor && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={() => void loadMore()} loading={loadingMore}>
            Load more
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={toggling !== null}
        title={toggling?.status === 'active' ? 'Suspend institution' : 'Reactivate institution'}
        message={
          toggling?.status === 'active'
            ? `Suspend “${toggling.name}”? Its staff will no longer be able to write attendance, tests, or materials until it is reactivated.`
            : `Reactivate “${toggling?.name}”? Its staff regains write access.`
        }
        confirmLabel={toggling?.status === 'active' ? 'Suspend' : 'Reactivate'}
        danger={toggling?.status === 'active'}
        busy={busy}
        onConfirm={handleToggle}
        onCancel={() => setToggling(null)}
      />
    </AppShell>
  );
}
