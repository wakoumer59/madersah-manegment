import { translate  } from '@/i18n';
import { useState, type FormEvent } from 'react';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/common/Button';
import { FormInput } from '@/components/common/FormInput';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { setNewPassword as setAccountPassword } from '@/services/adminAccountService';
import { homePathForRole } from '@/routes/guards';
import { errorMessage, mapAuthError } from '@/utils/errors';
import { isValidPassword } from '@/utils/validation';

export default function ChangePasswordPage() {
  const { authUser, userRecord, refreshUserRecord } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!authUser?.email) {
      setError(translate("Sign in again before changing your password."));
      return;
    }
    if (!isValidPassword(newPassword)) {
      setError(translate("Your new password must be at least 8 characters."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(translate("The new passwords do not match."));
      return;
    }
    if (newPassword === currentPassword) {
      setError(translate("Choose a new password different from your temporary password."));
      return;
    }

    setSubmitting(true);
    try {
      await reauthenticateWithCredential(
        authUser,
        EmailAuthProvider.credential(authUser.email, currentPassword),
      );
      await setAccountPassword({
        idToken: await authUser.getIdToken(true),
        newPassword,
      });
      await refreshUserRecord();
      toast.success(translate("Your password has been changed."));
      await navigate(homePathForRole(userRecord?.role ?? null), { replace: true });
    } catch (requestError) {
      const code = typeof requestError === 'object' && requestError !== null && 'code' in requestError;
      setError(code ? mapAuthError(requestError) : errorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title={translate("Change your temporary password")}
      subtitle={translate("Set a new password before continuing to your account.")}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <FormInput
          label={translate("Temporary password")}
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
        <FormInput
          label={translate("New password")}
          type="password"
          autoComplete="new-password"
          hint={translate("At least 8 characters.")}
          required
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
        <FormInput
          label={translate("Confirm new password")}
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
        <Button type="submit" loading={submitting} className="w-full">
          {translate("Change password")}{' '}</Button>
      </form>
    </AuthLayout>
  );
}
