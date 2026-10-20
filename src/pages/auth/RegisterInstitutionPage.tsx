import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { FormInput } from '@/components/common/FormInput';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  getMyInstitutionRequest,
  submitInstitutionRequest,
} from '@/services/institutionService';
import { errorMessage } from '@/utils/errors';
import { isNonEmpty } from '@/utils/validation';
import type { InstitutionRequest } from '@/types';

interface FormState {
  institutionName: string;
  contactEmail: string;
  phone: string;
  address: string;
}

const EMPTY: FormState = { institutionName: '', contactEmail: '', phone: '', address: '' };

export default function RegisterInstitutionPage() {
  const { authUser, userRecord, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [request, setRequest] = useState<InstitutionRequest | null>(null);
  const [values, setValues] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadRequest = useCallback(async () => {
    if (!authUser) return;
    try {
      const existing = await getMyInstitutionRequest(authUser.uid);
      setRequest(existing);
      if (existing) {
        setValues({
          institutionName: existing.institutionName,
          contactEmail: existing.contactEmail,
          phone: existing.phone,
          address: existing.address,
        });
      } else {
        setValues((v) => ({ ...v, contactEmail: authUser.email ?? '' }));
      }
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    void loadRequest();
  }, [loadRequest]);

  const canEdit = !request || request.status === 'rejected';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!isNonEmpty(values.institutionName)) nextErrors.institutionName = 'Name is required.';
    if (!isNonEmpty(values.contactEmail)) nextErrors.contactEmail = 'Email is required.';
    if (!isNonEmpty(values.phone)) nextErrors.phone = 'Phone number is required.';
    if (!isNonEmpty(values.address)) nextErrors.address = 'Address is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !authUser || !userRecord) return;
    setSubmitting(true);
    try {
      await submitInstitutionRequest(values, {
        uid: authUser.uid,
        displayName: userRecord.displayName,
      });
      toast.success('Registration request submitted. The platform owner will review it.');
      await loadRequest();
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Register your madrasah</h1>
            <p className="text-sm text-slate-500">
              Submit your institution for review by the platform owner.
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
          >
            Sign out
          </Button>
        </div>

        {request && request.status === 'pending' && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <p className="text-sm font-medium text-amber-900">
              Your request is awaiting review by the platform owner.
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Submitted for â€œ{request.institutionName}â€. You will get access automatically once
              it is approved.
            </p>
          </Card>
        )}
        {request && request.status === 'rejected' && (
          <Card className="mb-4 border-red-200 bg-red-50">
            <p className="text-sm font-medium text-red-900">Your previous request was rejected.</p>
            {request.reviewNote && (
              <p className="mt-1 text-sm text-red-800">Reason: {request.reviewNote}</p>
            )}
            <p className="mt-1 text-sm text-red-800">
              Fix the information below and submit again.
            </p>
          </Card>
        )}

        <Card>
          {loading ? (
            <p className="text-sm text-slate-500">Loadingâ€¦</p>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              {formError && (
                <div
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {formError}
                </div>
              )}
              <FormInput
                label="Madrasah name"
                required
                disabled={!canEdit}
                value={values.institutionName}
                error={errors.institutionName}
                onChange={(e) => setValues((v) => ({ ...v, institutionName: e.target.value }))}
              />
              <FormInput
                label="Contact email"
                type="email"
                inputMode="email"
                required
                disabled={!canEdit}
                value={values.contactEmail}
                error={errors.contactEmail}
                onChange={(e) => setValues((v) => ({ ...v, contactEmail: e.target.value }))}
              />
              <FormInput
                label="Phone number"
                type="tel"
                inputMode="tel"
                required
                disabled={!canEdit}
                value={values.phone}
                error={errors.phone}
                onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))}
              />
              <FormInput
                label="Address"
                required
                disabled={!canEdit}
                value={values.address}
                error={errors.address}
                onChange={(e) => setValues((v) => ({ ...v, address: e.target.value }))}
              />
              {canEdit && (
                <Button type="submit" loading={submitting} className="w-full">
                  {request?.status === 'rejected' ? 'Re-submit request' : 'Submit request'}
                </Button>
              )}
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

