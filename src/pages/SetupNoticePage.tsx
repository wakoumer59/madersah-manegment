import { LanguageSelector, translate } from '@/i18n';
import { Button } from '@/components/common/Button';
import { strings } from '@/strings';

/**
 * Full-page setup instructions shown when Firebase environment variables are
 * missing or the account record cannot be loaded. Never a blank screen.
 */
export function SetupNoticePage({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
        <div className="mb-3 flex justify-end"><LanguageSelector /></div>
        <h1 className="text-lg font-semibold text-slate-900">{translate(title)}</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{translate(message)}</p>
        <ol className="mt-4 list-inside list-decimal space-y-1 text-sm text-slate-600">
          <li>
            {translate("Copy")}{' '}<code className="rounded bg-slate-100 px-1">{translate(".env.example")}</code> {' '}{translate("to")}{' '}
            <code className="rounded bg-slate-100 px-1">{translate(".env")}</code>
          </li>
          <li>{translate("Fill in your Firebase project's public web-app config values")}</li>
          <li>{translate("Restart the dev server")}</li>
        </ol>
        <div className="mt-5">
          <Button onClick={() => window.location.reload()}>{strings.common.reload}</Button>
        </div>
      </div>
    </div>
  );
}
