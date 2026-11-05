import type { IncomingMessage, ServerResponse } from 'node:http';
import { fetchQuranContent } from '../server/quranFoundation.js';

function respond(
  res: ServerResponse,
  status: number,
  body: Record<string, unknown>,
  cacheControl = 'no-store',
) {
  res.writeHead(status, {
    'Cache-Control': cacheControl,
    'Content-Type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(body));
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return respond(res, 405, { error: 'Method not allowed.' });
  }

  const requestUrl = new URL(req.url ?? '/', 'http://localhost');
  const chapterNumber = Number(requestUrl.searchParams.get('chapter'));
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1 || chapterNumber > 114) {
    return respond(res, 400, { error: 'Choose a valid surah.' });
  }

  try {
    const response = await fetchQuranContent(
      `/verses/by_chapter/${chapterNumber}?fields=text_uthmani%2Cpage_number&per_page=300`,
    );
    if (!response.ok) {
      console.error(`Quran Foundation content request failed with status ${response.status}.`);
      return respond(res, 502, { error: 'Quran content is temporarily unavailable.' });
    }

    res.writeHead(200, {
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      'Content-Type': 'application/json; charset=utf-8',
    });
    return res.end(await response.text());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown server error.';
    const missingConfiguration = message.includes('credentials are not configured');
    if (!missingConfiguration) console.error('Quran Foundation request failed:', message);
    return respond(
      res,
      missingConfiguration ? 503 : 502,
      {
        error: missingConfiguration
          ? 'Quran Foundation API credentials are not configured.'
          : 'Quran content is temporarily unavailable.',
      },
    );
  }
}
