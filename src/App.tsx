import { BrowserRouter } from 'react-router-dom';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LanguageBoundary, LanguageProvider } from '@/i18n';
import { AppRoutes } from '@/routes';

export default function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <BrowserRouter>
          <ToastProvider>
            <AuthProvider>
              <LanguageBoundary>
                <AppRoutes />
              </LanguageBoundary>
            </AuthProvider>
          </ToastProvider>
        </BrowserRouter>
      </LanguageProvider>
    </ErrorBoundary>
  );
}
