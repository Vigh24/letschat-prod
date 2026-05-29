import { useState, useEffect } from 'react';
import { Star, MessageSquare, CheckCircle, RefreshCw, Send } from 'lucide-react';

export function CsatFormView({ convId, sig }: { convId: string, sig: string }) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [ticketId, setTicketId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [invalidSig, setInvalidSig] = useState<boolean>(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    if (savedTheme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  }, []);

  useEffect(() => {
    // Validate request and fetch conversation info (ticket ID)
    const fetchTicketInfo = async () => {
      if (!sig) {
        setInvalidSig(true);
        setLoading(false);
        return;
      }
      try {
        // Retrieve ticket details and verify hash signature indirectly
        import('../lib/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
          if (isSupabaseConfigured) {
            const { data } = await supabase
              .from('conversations')
              .select('ticket_id')
              .eq('id', convId)
              .maybeSingle();
            
            if (data?.ticket_id) {
              setTicketId(data.ticket_id);
            } else {
              setInvalidSig(true);
            }
          }
          setLoading(false);
        });
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchTicketInfo();
  }, [convId, sig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a rating from 1 to 5 stars');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/api/conversations/${convId}/csat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: rating, feedback, sig })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center theme-bg-primary theme-text-main">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 text-emerald-400 animate-spin" />
          <p className="text-sm font-semibold tracking-wide theme-text-muted">Loading feedback form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center theme-bg-primary p-4 theme-text-main selection:bg-emerald-500 selection:text-slate-950 relative overflow-hidden">
      {/* Subtle ambient light effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/[0.02] to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.03)_0%,transparent_60%)] pointer-events-none" />
      
      <div className="w-full max-w-md rounded-3xl border theme-border theme-bg-secondary/80 backdrop-blur-xl p-8 shadow-xl relative overflow-hidden transition-all duration-300">
        
        {/* Subtle top light effect */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        
        {invalidSig ? (
          <div className="text-center py-8 space-y-5 animate-scale-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 text-red-400">
              <Star className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight theme-text-main">Invalid CSAT Link</h2>
              <p className="text-xs theme-text-muted leading-relaxed">
                This rating link is invalid, expired, or tampered with. Please rate using the buttons directly inside the WhatsApp app.
              </p>
            </div>
          </div>
        ) : submitted ? (
          <div className="text-center py-8 space-y-5 animate-scale-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight theme-text-main">Thank You!</h2>
              <p className="text-sm theme-text-secondary leading-relaxed">
                Your feedback has been submitted successfully. We appreciate you taking the time to help us improve our service.
              </p>
            </div>
            {ticketId && (
              <p className="text-[10px] font-mono theme-text-muted uppercase tracking-widest pt-4">
                Ticket: {ticketId}
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2 text-center">
              <span className="inline-block rounded-full bg-emerald-500/10 px-3 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider border border-emerald-500/15">
                Support Feedback
              </span>
              <h2 className="text-xl font-bold tracking-tight theme-text-main">How did we do?</h2>
              <p className="text-xs theme-text-secondary leading-relaxed">
                Please rate your conversation experience with our support team.
              </p>
            </div>

            {/* Rating Stars Row */}
            <div className="space-y-2">
              <label className="block text-center text-[10px] font-bold theme-text-muted uppercase tracking-wider">
                Your Rating
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isActive = starValue <= (hoverRating || rating);
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-lg hover:theme-bg-hover transition-all transform hover:scale-110 active:scale-95 duration-100 cursor-pointer"
                    >
                      <Star
                        className={`h-9 w-9 transition-colors ${
                          isActive
                            ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]'
                            : 'theme-text-muted-darker dark:text-zinc-600'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="h-4 text-center">
                <span className="text-[10px] font-semibold theme-text-secondary uppercase tracking-wide">
                  {rating === 1 && 'Poor 😞'}
                  {rating === 2 && 'Fair 😐'}
                  {rating === 3 && 'Good 🙂'}
                  {rating === 4 && 'Very Good 😃'}
                  {rating === 5 && 'Excellent! 🤩'}
                </span>
              </div>
            </div>

            {/* Additional Comments Textarea */}
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-[10px] font-bold theme-text-muted uppercase tracking-wider">
                <MessageSquare className="h-3.5 w-3.5" />
                Additional Comments (Optional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={4}
                placeholder="What did we do well? How can we make your experience even better next time?"
                className="input-field resize-none min-h-[100px] p-4 text-sm"
              />
            </div>

            {error && (
              <p className="text-center text-xs font-semibold text-red-400 bg-red-500/5 border border-red-500/10 p-2.5 rounded-xl">
                {error}
              </p>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="btn-primary w-full py-3.5 text-sm cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit Feedback
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
