import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useAuth } from '@/contexts/AuthContext';
import { strings } from '@/strings';

/** Shown to freshly signed-up users whose role is still 'pending'. */
export default function PendingAccountPage() {
  const { authUser, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <Card title="Your account is pending" className="max-w-md">
        <p className="text-sm text-slate-600">
          Your account has been created{authUser?.email ? ` for ${authUser.email}` : ''} and is
          waiting for the next step:
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>
            <Link to="/register-institution" className="font-medium text-orange-700 underline">
              Register your madrasah
            </Link>{' '}
            â€” the platform owner reviews and approves it, or
          </li>
          <li>Activate an invitation code from your madrasah administrator (coming in a later phase).</li>
        </ul>
        <div className="mt-5 flex gap-3">
          <Link to="/register-institution">
            <Button>Register madrasah</Button>
          </Link>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
              navigate('/login');
            }}
          >
            {strings.auth.signOut}
          </Button>
        </div>
      </Card>
    </div>
  );
}
