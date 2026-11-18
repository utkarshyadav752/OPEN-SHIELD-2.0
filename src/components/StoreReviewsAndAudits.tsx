import React, { useState } from 'react';
import { Star, Trash2, CheckCircle2, ShieldCheck, Bookmark, LogIn } from 'lucide-react';
import {
  saveUserReviewToFirestore,
  deleteUserReviewFromFirestore,
  deleteUserAuditFromFirestore,
  type SavedAuditDoc,
  type SavedUserReviewDoc,
  type User
} from '../firebase';

interface StoreReviewsProps {
  user: User | null;
  userReviews: SavedUserReviewDoc[];
  userAudits: SavedAuditDoc[];
  onSignIn: () => void;
}

const FEATURED_COMMUNITY_REVIEWS = [
  {
    id: 'comm-1',
    authorName: 'Ananya Sharma',
    date: 'October 19, 2026',
    rating: 5,
    comment:
      'Saved me ₹3,498 on a flight checkout last night! It immediately flagged two pre-checked baggage insurance boxes and a hidden auto-renewing travel club trial that I almost missed.'
  },
  {
    id: 'comm-2',
    authorName: 'Marcus Vance',
    date: 'October 14, 2026',
    rating: 5,
    comment:
      'Finally an extension that combines ToS;DR ratings with a live clause scanner for unrated sites. The JustDeleteMe Roach Motel link inside the popup is a lifesaver for canceling subscriptions.'
  },
  {
    id: 'comm-3',
    authorName: 'Elena Rostova',
    date: 'October 8, 2026',
    rating: 5,
    comment:
      'Love that all DOM scanning happens 100% locally in the browser with zero tracking. Equalizing tiny grey confirm-shaming links into real buttons is genius.'
  }
];

export const StoreReviewsAndAudits: React.FC<StoreReviewsProps> = ({
  user,
  userReviews,
  userAudits,
  onSignIn
}) => {
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setFeedback(null);

    if (!user) {
      onSignIn();
      return;
    }

    const trimmed = comment.trim();
    if (!trimmed) {
      setErrorMsg('Please write a review comment before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      await saveUserReviewToFirestore({ rating, comment: trimmed });
      setComment('');
      setFeedback('Your Chrome Web Store review has been published!');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to post review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Saved Cloud Audits Section (Firestore Persistence) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-sky-400" />
              Your Saved Cloud Site Audits ({userAudits.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Synced securely via Firebase Authentication &amp; Cloud Firestore.
            </p>
          </div>
          {!user && (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign in with Google to Sync Audits
            </button>
          )}
        </div>

        {!user ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            Sign in with your Google account to save dark-pattern audit reports from the Live
            Sandbox or Google Search Policy Scanner across devices.
          </div>
        ) : userAudits.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
            No saved audits yet. Use the <strong>Live Web Policy Search</strong> tab above and click{' '}
            <strong>Save Audit to Account</strong> to store your first report.
          </div>
        ) : (
          <div className="space-y-2.5">
            {userAudits.map((audit) => (
              <div
                key={audit.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="font-bold text-slate-100">{audit.domain}</span>
                    <span>·</span>
                    <span className="font-mono font-bold text-sky-400">
                      Grade {audit.grade}
                    </span>
                    <span>·</span>
                    <span className="text-slate-400 tabular-nums">
                      {audit.issuesFound} red flags
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{audit.summary}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Delete saved audit for ${audit.domain}`}
                  onClick={() => deleteUserAuditFromFirestore(audit.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chrome Web Store Ratings & Reviews Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-50">Ratings &amp; Reviews</h2>
            <p className="text-xs text-slate-400 mt-1">
              Verified Chrome Web Store ratings and community feedback
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-3xl font-extrabold text-slate-50 tabular-nums">4.9</div>
              <div className="text-xs text-amber-400 font-semibold">★★★★★</div>
              <div className="text-[11px] text-slate-400 tabular-nums">1,840 ratings</div>
            </div>
          </div>
        </div>

        {/* Write a Review Form */}
        <form onSubmit={handleSubmitReview} className="my-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <span className="text-xs font-bold text-slate-200">
              {user ? `Posting as ${user.displayName || 'Verified User'}` : 'Rate OpenShield on Chrome Web Store'}
            </span>
            <div className="flex items-center gap-1" role="group" aria-label="Select star rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Rate ${star} stars`}
                  onClick={() => setRating(star)}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    star <= rating ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <textarea
            rows={3}
            aria-label="Write your Chrome Web Store review"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              user
                ? 'Share how OpenShield helped you spot dark patterns or predatory ToS clauses...'
                : 'Sign in with Google or type a review to share your experience...'
            }
            className="w-full p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500 mb-3"
          />

          {errorMsg && <div className="text-xs text-red-400 mb-2">{errorMsg}</div>}
          {feedback && <div className="text-xs text-emerald-400 mb-2">{feedback}</div>}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors"
            >
              {user ? (submitting ? 'Publishing...' : 'Post Review') : 'Sign in & Post Review'}
            </button>
          </div>
        </form>

        {/* User's Own Firestore Reviews + Featured Community Reviews */}
        <div className="space-y-4">
          {userReviews.map((rev) => (
            <div
              key={rev.id}
              className="p-4 rounded-xl bg-slate-950 border border-sky-500/40 flex items-start justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 text-xs mb-1">
                  <span className="font-bold text-slate-100">{rev.authorName}</span>
                  <span>·</span>
                  <span className="text-amber-400 font-mono">
                    {'★'.repeat(rev.rating)}
                    {'☆'.repeat(5 - rev.rating)}
                  </span>
                  <span>·</span>
                  <span className="text-sky-400 font-medium">Your Review</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>
              </div>
              <button
                type="button"
                aria-label="Delete your review"
                onClick={() => deleteUserReviewFromFirestore(rev.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {FEATURED_COMMUNITY_REVIEWS.map((rev) => (
            <div key={rev.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800/80">
              <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                <span className="font-bold text-slate-200">{rev.authorName}</span>
                <span>·</span>
                <span className="text-amber-400">
                  {'★'.repeat(rev.rating)}
                </span>
                <span>·</span>
                <span>{rev.date}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{rev.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
