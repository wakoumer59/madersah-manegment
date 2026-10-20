import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { mapAuthError } from '@/utils/errors';
import { isNonEmpty, isValidEmail } from '@/utils/validation';
import { redeemCodeAndActivate } from '@/services/userService';

interface FormValues {
  email: string;
  activationCode: string;
}

const EMPTY: FormValues = { email: '', activationCode: '' };

export default function ActivatePage() {
  const { authUser, userRecord } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof FormValues) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormValues, string>> = {};
    if (!isNonEmpty(values.email)) errors.email = 'Email is required.';
    else if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.';
    if (!isNonEmpty(values.activationCode)) errors.activationCode = 'Activation code is required.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;
    if (!authUser) {
      setFormError('You must be signed in to activate your account.');
      return;
    }
    setSubmitting(true);
    try {
      // The user has already signed up (role='pending'). Redeem the activation
      // code to activate the account with its real role/institution/class.
      const role = await redeemCodeAndActivate(authUser.uid, values.email, values.activationCode);
      toast.success(`Account activated (${role}).`);
      await navigate(homePathForRole(role), { replace: true });
    } catch (error) {
      setFormError(mapAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Activate your account"
      subtitle="Enter your activation code to complete sign-up."
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </div>
        )}
        {userRecord?.role === 'pending' ? (
          <p className="text-sm text-slate-600">
            Your account is pending activation. Enter the invitation code you received from your madrasah administrator.
          </p>
        ) : null}
        <FormInput label="Email address" type="email" inputMode="email" autoComplete="email" required value={values.email} error={fieldErrors.email} onChange={update('email')} />
        <FormInput label="Activation code" required value={values.activationCode} error={fieldErrors.activationCode} onChange={update('activationCode')} />
        <Button type="submit" loading={submitting} className="w-full">{submitting ? 'Activating…' : 'Activate account'}</Button>
        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm font-medium text-orange-700 hover:underline">Already have an account? Sign in</Link>
        </div>
      </form>
    </AuthLayout>
  );
}

function homePathForRole(role: string | null): string {
  switch (role) {
    case 'platformOwner': return '/owner';
    case 'institutionAdmin':
    case 'teacher': return '/admin';
    case 'student': return '/student';
    case 'pending': return '/pending';
    default: return '/login';
  }
}
