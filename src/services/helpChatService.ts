import type { HelpChatMessage } from '../../server/helpChat';

export async function askSystemHelp(
  idToken: string,
  messages: HelpChatMessage[],
): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/help-chat', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });
  } catch {
    throw new Error('System Help could not connect. Check your internet connection and retry.');
  }

  let result: { answer?: unknown; error?: unknown };
  try {
    result = await response.json() as { answer?: unknown; error?: unknown };
  } catch {
    throw new Error('System Help returned an invalid response. Please try again.');
  }

  if (!response.ok) {
    throw new Error(
      typeof result.error === 'string'
        ? result.error
        : 'System Help could not answer right now. Please try again.',
    );
  }
  if (typeof result.answer !== 'string' || !result.answer.trim()) {
    throw new Error('System Help returned an invalid response. Please try again.');
  }
  return result.answer;
}
