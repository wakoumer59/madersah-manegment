import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ImagePlus, MessageSquareText, Plus, Trash2, Video } from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Modal } from '@/components/common/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { translate } from '@/i18n';
import {
  createBoardPost,
  deleteBoardPost,
  listBoardPosts,
  validateBoardMedia,
  validateBoardText,
  validateShortVideo,
} from '@/services/boardService';
import type { BoardPost } from '@/types';
import { errorMessage } from '@/utils/errors';

const EMPTY_FORM = { title: '', body: '' };

function MediaPreview({ post }: { post: BoardPost }) {
  if (!post.mediaUrl) return null;
  if (post.mediaType === 'image') {
    return (
      <img
        src={post.mediaUrl}
        alt={post.title}
        loading="lazy"
        className="max-h-[28rem] w-full bg-slate-50 object-contain"
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
      className="max-h-[28rem] w-full bg-black"
    >
      {translate('Your browser cannot play this video.')}
    </video>
  );
}

export default function BoardPage() {
  const { userRecord } = useAuth();
  const toast = useToast();
  const institutionId = userRecord?.institutionId ?? '';
  const mediaInput = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [media, setMedia] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!institutionId) {
      setPosts([]);
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

  const handleMediaChange = async (file?: File) => {
    setFormError(null);
    setMedia(null);
    if (!file) return;
    const mediaError = validateBoardMedia(file);
    if (mediaError) {
      setFormError(mediaError);
      if (mediaInput.current) mediaInput.current.value = '';
      return;
    }
    const videoError = await validateShortVideo(file);
    if (videoError) {
      setFormError(videoError);
      if (mediaInput.current) mediaInput.current.value = '';
      return;
    }
    setMedia(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateBoardText(form.title, form.body, !!media);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    if (!userRecord) {
      setFormError(translate('Your account could not be identified.'));
      return;
    }

    setSaving(true);
    setFormError(null);
    setUploadProgress(media ? 0 : null);
    try {
      await createBoardPost({
        institutionId,
        authorUid: userRecord.uid,
        authorName: userRecord.displayName,
        title: form.title,
        body: form.body,
        media,
        onProgress: setUploadProgress,
      });
      setForm(EMPTY_FORM);
      setMedia(null);
      if (mediaInput.current) mediaInput.current.value = '';
      setOpenForm(false);
      await load();
      toast.success(translate('Board post published.'));
    } catch (submitError) {
      setFormError(errorMessage(submitError));
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleDelete = async (post: BoardPost) => {
    if (!window.confirm(translate('Delete this board post? This cannot be undone.'))) return;
    setError(null);
    try {
      await deleteBoardPost(institutionId, post);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      toast.success(translate('Board post deleted.'));
    } catch (deleteError) {
      setError(errorMessage(deleteError));
    }
  };

  return (
    <AppShell variant="admin">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{translate('Student Board')}</h1>
          <p className="text-sm text-slate-500">
            {translate('Share announcements, images, and short videos with your students.')}
          </p>
        </div>
        <Button onClick={() => setOpenForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          {translate('Write a post')}
        </Button>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}{' '}
          <button type="button" onClick={() => void load()} className="font-medium underline">
            {translate('Retry')}
          </button>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : posts.length ? (
        <div className="mx-auto max-w-3xl space-y-4">
          {posts.map((post) => (
            <article key={post.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-semibold text-slate-900">{post.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {post.authorName} · {new Date(post.createdAt).toLocaleString()}
                  </p>
                </div>
                {post.authorUid === userRecord?.uid && (
                  <button
                    type="button"
                    onClick={() => void handleDelete(post)}
                    aria-label={translate('Delete post')}
                    className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words px-4 pb-4 text-sm leading-6 text-slate-700 sm:px-5">
                {post.body}
              </p>
              <MediaPreview post={post} />
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<MessageSquareText className="h-10 w-10" />}
          title={translate('No board posts yet')}
          description={translate('Publish a message, image, or short video for students to read here.')}
          action={
            <Button variant="secondary" onClick={() => setOpenForm(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {translate('Write a post')}
            </Button>
          }
        />
      )}

      <Modal
        open={openForm}
        title={translate('Write a post')}
        onClose={() => setOpenForm(false)}
        busy={saving}
      >
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {formError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {translate(formError)}
            </div>
          )}
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {translate('Post title')}
            <input
              required
              maxLength={120}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-normal text-slate-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-slate-700">
            {translate('Message')}
            <textarea
              required={!media}
              rows={5}
              maxLength={5000}
              value={form.body}
              onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
              placeholder={translate('Write your announcement or message…')}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-base font-normal text-slate-900 placeholder:text-slate-400 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
            />
            <span className="text-right text-xs font-normal text-slate-500">
              {form.body.length}/5000
            </span>
          </label>
          <div>
            <input
              ref={mediaInput}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
              className="sr-only"
              aria-label={translate('Attach an image or short video')}
              onChange={(event) => void handleMediaChange(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => mediaInput.current?.click()}
            >
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              <Video className="h-4 w-4" aria-hidden="true" />
              {translate('Attach image or video')}
            </Button>
            <p className="mt-1 text-xs text-slate-500">
              {translate('Images up to 10 MB. MP4 or WebM videos up to 25 MB and 90 seconds.')}
            </p>
          </div>
          {media && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
              <span className="truncate">{media.name}</span>
              <button
                type="button"
                onClick={() => {
                  setMedia(null);
                  if (mediaInput.current) mediaInput.current.value = '';
                }}
                className="shrink-0 font-medium text-red-600"
              >
                {translate('Remove')}
              </button>
            </div>
          )}
          {uploadProgress !== null && (
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-600">
                <span>{translate('Uploading media…')}</span>
                <span>{uploadProgress}%</span>
              </div>
              <progress
                value={uploadProgress}
                max={100}
                className="h-2 w-full accent-orange-600"
                aria-label={translate('Media upload progress')}
              />
            </div>
          )}
          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              {translate('Publish post')}
            </Button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
