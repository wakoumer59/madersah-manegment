import { translate  } from '@/i18n';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  approveInstitutionRequest,
  listInstitutionRequests,
  rejectInstitutionRequest,
} from '@/services/institutionService';
import { errorMessage } from '@/utils/errors';
import type { InstitutionRequest } from '@/types';

export default function InstitutionRequestsPage() {
  const { authUser } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<InstitutionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<InstitutionRequest | null>(null);
  const [rejecting, setRejecting] = useState<InstitutionRequest | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRequests(await listInstitutionRequests('pending'));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async () => {
    if (!approving || !authUser) return;
    setBusy(true);
    try {
      await approveInstitutionRequest(approving, authUser.uid);
      toast.success(translate('“{name}” approved — requester is now an administrator.', { name: approving.institutionName }));
      setApproving(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!rejecting || !authUser) return;
    setBusy(true);
    try {
      await rejectInstitutionRequest(rejecting, authUser.uid, rejectNote);
      toast.success(translate('Request from “{name}” rejected.', { name: rejecting.institutionName }));
      setRejecting(null);
      setRejectNote('');
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell variant="owner">
      <h1 className="text-xl font-semibold text-slate-900">{translate("Institution Requests")}</h1>
      <p className="mb-4 text-sm text-slate-500">
        {translate("Approving creates the institution and promotes the requester to its administrator — in one atomic step.")}{' '}</p>

      {loading && <LoadingSpinner fullPage />}
      {!loading && error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline">
            {translate("Retry")}{' '}</button>
        </div>
      )}
      {!loading && !error && requests.length === 0 && (
        <EmptyState
          title={translate("No pending requests")}
          description={translate("New madrasah registration requests will appear here for review.")}
        />
      )}

      <div className="flex flex-col gap-3">
        {requests.map((request) => (
          <Card key={request.id}>
            <div className="flex flex-col gap-1">
              <p className="font-semibold text-slate-900">{request.institutionName}</p>
              <p className="text-sm text-slate-600">
                {translate("Requested by")}{' '}{request.requesterName || '—'} ({request.contactEmail})
              </p>
              <p className="text-sm text-slate-600">{translate("Phone:")}{' '}{request.phone}</p>
              <p className="text-sm text-slate-600">{translate("Address:")}{' '}{request.address}</p>
            </div>
            <div className="mt-4 flex gap-3">
              <Button onClick={() => setApproving(request)}>{translate("Approve")}</Button>
              <Button variant="danger" onClick={() => setRejecting(request)}>
                {translate("Reject")}{' '}</Button>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={approving !== null}
        title={translate("Approve institution")}
        message={
          approving
            ? `Approve “${approving.institutionName}”? ${approving.requesterName} will become its administrator and gain full access to that institution's data only.`
            : ''
        }
        confirmLabel={translate("Approve")}
        busy={busy}
        onConfirm={handleApprove}
        onCancel={() => setApproving(null)}
      />

      <Modal
        open={rejecting !== null}
        title={translate("Reject request")}
        onClose={() => setRejecting(null)}
        busy={busy}
      >
        <p className="text-sm text-slate-600">
          {translate("Tell the requester what to fix. They can correct the information and re-submit.")}{' '}</p>
        <textarea
          value={rejectNote}
          onChange={(event) => setRejectNote(event.target.value)}
          rows={3}
          placeholder={translate("e.g. The contact email could not be verified.")}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setRejecting(null)} disabled={busy}>
            {translate("Cancel")}{' '}</Button>
          <Button variant="danger" onClick={handleReject} loading={busy}>
            {translate("Reject request")}{' '}</Button>
        </div>
      </Modal>
    </AppShell>
  );
}
