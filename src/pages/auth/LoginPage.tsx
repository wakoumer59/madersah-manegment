import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { signIn } from '@/services/authService';
import { strings } from '@/strings';
import { mapAuthError } from '@/utils/errors';
import {
  hasFieldErrors,
  validateLoginForm,
  type FieldErrors,
  type LoginFormValues,
} from '@/utils/validation';

export default function LoginPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<LoginFormValues>({ email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<LoginFormValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const errors = validateLoginForm(values);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;
    setSubmitting(true);
    try {
      await signIn(values.email, values.password);
      // Redirect to '/', which sends the user to their role's home page once
      // the user record has loaded.
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(mapAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={strings.auth.signIn}
      footer={
        <>
          <span>{strings.auth.noAccount} </span>
          <Link to="/signup" className="font-medium text-orange-700 hover:underline">
            {strings.auth.createAccount}
          </Link>
        </>
      }
    >
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
          label={strings.auth.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={values.email}
          error={fieldErrors.email}
          onChange={(event) => setValues((v) => ({ ...v, email: event.target.value }))}
        />
        <FormInput
          label={strings.auth.password}
          type="password"
          autoComplete="current-password"
          required
          value={values.password}
          error={fieldErrors.password}
          onChange={(event) => setValues((v) => ({ ...v, password: event.target.value }))}
        />
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-orange-700 hover:underline"
          >
            {strings.auth.forgotPassword}
          </Link>
        </div>
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? strings.auth.signingIn : strings.auth.signIn}
        </Button>
      </form>
    </AuthLayout>
  );
}
