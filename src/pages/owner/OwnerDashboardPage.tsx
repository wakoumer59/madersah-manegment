import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/common/Card';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { StatCard } from '@/components/common/StatCard';
import { listInstitutionRequests, listInstitutions } from '@/services/institutionService';
import { formatDisplayDate, todayIso } from '@/utils/dates';
import type { InstitutionRequest } from '@/types';

/** Platform owner dashboard â€” real counts, no faked numbers. */
export default function OwnerDashboardPage() {
  const [pending, setPending] = useState<InstitutionRequest[]>([]);
  const [totalInstitutions, setTotalInstitutions] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pendingRequests, firstPage] = await Promise.all([
        listInstitutionRequests('pending'),
        listInstitutions(null, 500),
      ]);
      setPending(pendingRequests);
      setTotalInstitutions(firstPage.items.length);
    } catch {
      // Counts stay null; cards show skeletons â€” never fake numbers.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell variant="owner">
      <h1 className="mb-1 text-xl font-semibold text-slate-900">Platform Overview</h1>
      <p className="mb-4 text-sm text-slate-500">{formatDisplayDate(todayIso())}</p>

      <div className="grid grid-cols-2 gap-3 sm:max-w-lg">
        <StatCard label="Pending requests" value={loading ? null : pending.length} />
        <StatCard label="Institutions" value={loading ? null : (totalInstitutions ?? 0)} />
      </div>

      <Card className="mt-6" title="Awaiting review">
        {loading ? (
          <LoadingSpinner />
        ) : pending.length === 0 ? (
          <p className="text-sm text-slate-500">
            No pending registration requests.{' '}
            <Link to="/owner/institutions" className="font-medium text-orange-700 underline">
              View institutions
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-slate-100">
            {pending.slice(0, 3).map((request) => (
              <li key={request.id} className="py-2 text-sm">
                <span className="font-medium text-slate-900">{request.institutionName}</span>
                <span className="text-slate-500"> â€” {request.requesterName}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Link
            to="/owner/requests"
            className="text-sm font-medium text-orange-700 hover:underline"
          >
            Review all requests â†’
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}

