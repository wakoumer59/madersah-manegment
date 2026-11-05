import { useCallback, useEffect, useState } from 'react';
import { MessageSquareText } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { translate } from '@/i18n';
import { listBoardPosts } from '@/services/boardService';
import type { BoardPost } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { errorMessage } from '@/utils/errors';

function BoardPostMedia({ post }: { post: BoardPost }) {
  if (!post.mediaUrl) return null;
  if (post.mediaType === 'image') {
    return (
      <img
        src={post.mediaUrl}
        alt={post.title}
        loading="lazy"
        className="max-h-[32rem] w-full bg-slate-50 object-contain"
      />
    );
  }
  return (
    <video
      src={post.mediaUrl}
      controls
      playsInline
      preload="metadata"
      controlsList="nodownload"
      className="max-h-[32rem] w-full bg-black"
    >
      {translate('Your browser cannot play this video.')}
    </video>
  );
}

export default function StudentBoardPage() {
  const { userRecord } = useAuth();
  const institutionId = userRecord?.institutionId ?? '';
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!institutionId) {
      setError(translate('Your institution could not be determined.'));
      setLoading(false);
      return;
    }
    setError(null);
    try {
      setPosts(await listBoardPosts(institutionId));
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell variant="student">
      <header className="mx-auto mb-5 max-w-3xl">
        <h1 className="text-2xl font-bold text-slate-900">{translate('Student Board')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {translate('Updates and messages from your school.')}
        </p>
      </header>

      {error && (
        <div role="alert" className="mx-auto mb-4 max-w-3xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline">
            {translate('Retry')}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : posts.length ? (
        <main className="mx-auto max-w-3xl space-y-4">
          {posts.map((post) => (
            <article
              key={post.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="p-4 sm:p-5">
                <h2 className="break-words text-lg font-semibold leading-snug text-slate-900">
                  {post.title}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {post.authorName} · {new Date(post.createdAt).toLocaleString()}
                </p>
                {post.body && (
                  <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">
                    {post.body}
                  </p>
                )}
              </div>
              <BoardPostMedia post={post} />
            </article>
          ))}
        </main>
      ) : (
        <div className="mx-auto max-w-3xl">
          <EmptyState
            icon={<MessageSquareText className="h-10 w-10" />}
            title={translate('Nothing on the board yet')}
            description={translate('School announcements and shared posts will appear here.')}
          />
        </div>
      )}
    </AppShell>
  );
}
