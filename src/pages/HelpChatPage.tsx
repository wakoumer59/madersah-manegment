import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Bot, CircleHelp, MessageSquareText, Send, UserRound } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/contexts/AuthContext';
import { translate } from '@/i18n';
import { askSystemHelp } from '@/services/helpChatService';
import type { HelpChatMessage } from '../../server/helpChat';

export default function HelpChatPage() {
  const { authUser, userRecord } = useAuth();
  const [messages, setMessages] = useState<HelpChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);
  const role = userRecord?.role;
  const variant = role === 'platformOwner' ? 'owner' : role === 'student' ? 'student' : 'admin';
  const canSend = Boolean(draft.trim()) && !sending;

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages, sending]);

  const sendMessage = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const question = draft.trim();
    if (!question || sending || !authUser) return;

    const updatedMessages = [...messages, { role: 'user' as const, content: question }];
    const contextMessages = updatedMessages.slice(-7);
    setMessages(updatedMessages);
    setDraft('');
    setSending(true);
    setError(null);
    try {
      const answer = await askSystemHelp(await authUser.getIdToken(), contextMessages);
      setMessages((current) => [...current, { role: 'assistant', content: answer }]);
    } catch (sendError) {
      setMessages((current) => current.slice(0, -1));
      setDraft((currentDraft) => currentDraft || question);
      setError(sendError instanceof Error ? sendError.message : translate('System Help could not answer right now. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <AppShell variant={variant}>
      <div className="mx-auto flex min-h-[calc(100dvh-12rem)] max-w-3xl flex-col">
        <header className="mb-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <CircleHelp className="h-6 w-6 text-indigo-600" aria-hidden="true" />
            {translate('System Help')}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {translate('Guidance for using the tools and features available in your account.')}
          </p>
        </header>

        <section
          ref={conversationRef}
          aria-label={translate('Chat conversation')}
          aria-live="polite"
          className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
        >
          {messages.length === 0 ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-4 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
                <MessageSquareText className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                {translate('Start a conversation')}
              </h2>
              <p className="mt-1 max-w-md text-sm text-slate-600">
                {translate('Send a message to get guidance on using the platform.')}
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <article
                key={`${index}-${message.role}`}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    message.role === 'user'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                  aria-hidden="true"
                >
                  {message.role === 'user'
                    ? <UserRound className="h-4 w-4" />
                    : <Bot className="h-4 w-4" />}
                </span>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {message.content}
                </p>
              </article>
            ))
          )}
          {sending && (
            <p role="status" className="text-sm text-slate-500">
              {translate('System Help is thinking…')}
            </p>
          )}
        </section>

        {error && (
          <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {translate(error)}
          </div>
        )}

        <form onSubmit={(event) => void sendMessage(event)} className="mt-3 flex items-end gap-2">
          <label className="sr-only" htmlFor="system-help-message">
            {translate('Your message')}
          </label>
          <textarea
            id="system-help-message"
            rows={2}
            maxLength={1500}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder={translate('Type your question…')}
            className="min-h-12 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
          <Button
            type="submit"
            disabled={!canSend}
            aria-label={translate('Send message')}
            className="!min-h-12 !px-3"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">{translate('Send')}</span>
          </Button>
        </form>

        <p className="mt-2 text-center text-xs text-slate-500">
          {translate('Your messages are sent to the configured AI provider. The assistant does not access school records. Do not enter passwords or private student information.')}
        </p>
      </div>
    </AppShell>
  );
}
