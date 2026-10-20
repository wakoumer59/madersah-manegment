import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { signUp } from '@/services/authService';
import { strings } from '@/strings';
import { mapAuthError } from '@/utils/errors';
import {
  hasFieldErrors,
  validateSignupForm,
  type FieldErrors,
  type SignupFormValues,
} from '@/utils/validation';

const EMPTY: SignupFormValues = { displayName: '', email: '', password: '', confirmPassword: '' };

export default function SignupPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<SignupFormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<SignupFormValues>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const update = (key: keyof SignupFormValues) => (event: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: event.target.value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const errors = validateSignupForm(values);
    setFieldErrors(errors);
    if (hasFieldErrors(errors)) return;
    setSubmitting(true);
    try {
      await signUp(values.email, values.password, values.displayName);
      // Account is created with role 'pending'. The pending screen explains
      // the next step (institution registration â€” Phase 2).
      navigate('/', { replace: true });
    } catch (error) {
      setFormError(mapAuthError(error));
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={strings.auth.createAccount}
      subtitle="Create your account to register a madrasah or activate an invitation."
      footer={
        <>
          <span>{strings.auth.haveAccount} </span>
          <Link to="/login" className="font-medium text-orange-700 hover:underline">
            {strings.auth.signIn}
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
          label={strings.auth.displayName}
          autoComplete="name"
          required
          value={values.displayName}
          error={fieldErrors.displayName}
          onChange={update('displayName')}
        />
        <FormInput
          label={strings.auth.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          value={values.email}
          error={fieldErrors.email}
          onChange={update('email')}
        />
        <FormInput
          label={strings.auth.password}
          type="password"
          autoComplete="new-password"
          required
          hint="At least 8 characters."
          value={values.password}
          error={fieldErrors.password}
          onChange={update('password')}
        />
        <FormInput
          label={strings.auth.confirmPassword}
          type="password"
          autoComplete="new-password"
          required
          value={values.confirmPassword}
          error={fieldErrors.confirmPassword}
          onChange={update('confirmPassword')}
        />
        <Button type="submit" loading={submitting} className="w-full">
          {submitting ? strings.auth.creatingAccount : strings.auth.createAccount}
        </Button>
      </form>
    </AuthLayout>
  );
}
