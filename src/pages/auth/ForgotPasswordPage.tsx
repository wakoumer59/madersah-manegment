import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { sendPasswordReset } from '@/services/authService';
import { useToast } from '@/contexts/ToastContext';
import { strings } from '@/strings';
import { mapAuthError } from '@/utils/errors';
import { isNonEmpty, isValidEmail } from '@/utils/validation';

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!isNonEmpty(email) || !isValidEmail(email)) {
      setFieldError('Enter a valid email address.');
      return;
    }
    setFieldError(undefined);
    setSubmitting(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
      toast.success(strings.auth.resetEmailSent);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={strings.auth.resetPassword}
      subtitle="Enter your account email and we will send you a reset link."
      footer={
        <Link to="/login" className="font-medium text-orange-700 hover:underline">
          â† Back to {strings.auth.signIn.toLowerCase()}
        </Link>
      }
    >
      {sent ? (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800"
        >
          {strings.auth.resetEmailSent}
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          <FormInput
            label={strings.auth.email}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            error={fieldError}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Button type="submit" loading={submitting} className="w-full">
            {strings.auth.resetPassword}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
