import { useEffect, useRef, useState } from "react";
import { CornerDownLeft, MessageSquareText, ShieldCheck, Star } from "lucide-react";
import { useLocation } from "react-router-dom";
import { apiGet, apiPost } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export interface Review {
  id: number;
  apartment_id: string;
  renter_id: string;
  owner_id: string;
  parent_id: number | null;
  rating: number | null;
  comment: string;
  report_count: number;
  created_at: string;
  author_name: string;
  author_photo?: string | null;
  is_owner_reply: boolean;
}

interface ReviewNode extends Review {
  replies: ReviewNode[];
}

export interface ReviewStats {
  avg_rating: number;
  total_reviews: number;
}

interface ReviewSectionProps {
  apartmentId: string;
  ownerId: string;
}

const StarDisplay = ({ rating }: { rating: number }) => {
  return (
    <div className="flex gap-1 text-yellow-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={16}
          className={index < rating ? "fill-current" : "text-gray-300"}
        />
      ))}
    </div>
  );
};

function buildReviewTree(reviews: Review[]): ReviewNode[] {
  const nodes = new Map<number, ReviewNode>();
  const roots: ReviewNode[] = [];

  reviews.forEach((review) => {
    nodes.set(review.id, { ...review, replies: [] });
  });

  nodes.forEach((node) => {
    if (node.parent_id && nodes.has(node.parent_id)) {
      nodes.get(node.parent_id)?.replies.push(node);
      return;
    }

    roots.push(node);
  });

  roots.sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

  nodes.forEach((node) => {
    node.replies.sort(
      (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
    );
  });

  return roots;
}

function formatReviewDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("ar-DZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ReviewSection = ({ apartmentId, ownerId }: ReviewSectionProps) => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const sectionRef = useRef<HTMLDivElement | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ avg_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [replyTargetId, setReplyTargetId] = useState<number | null>(null);
  const [replyComment, setReplyComment] = useState("");
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [highlightedReviewId, setHighlightedReviewId] = useState<number | null>(null);
  const [highlightSection, setHighlightSection] = useState(false);

  const isOwner = currentUser?.uid === ownerId;
  const canWriteReview = Boolean(currentUser) && !isOwner;
  const reviewThreads = buildReviewTree(reviews);

  const loadReviews = async () => {
    if (!apartmentId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiGet<{ reviews: Review[]; stats: ReviewStats }>(
        `/reviews/${encodeURIComponent(apartmentId)}`
      );

      setReviews(response.reviews || []);
      setStats(response.stats || { avg_rating: 0, total_reviews: 0 });
    } catch (loadError) {
      console.error("Failed to load reviews:", loadError);
      setError("تعذر تحميل المراجعات حالياً.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, [apartmentId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const targetReviewId = Number(params.get("review"));
    const hasReviewTarget = Number.isInteger(targetReviewId) && targetReviewId > 0;
    const shouldFocusSection = hasReviewTarget || location.hash === "#reviews";

    if (!shouldFocusSection) {
      return;
    }

    setHighlightSection(true);

    if (hasReviewTarget) {
      setHighlightedReviewId(targetReviewId);
    }

    requestAnimationFrame(() => {
      const targetElement = hasReviewTarget
        ? document.getElementById(`review-${targetReviewId}`)
        : sectionRef.current;

      targetElement?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    const timeout = window.setTimeout(() => {
      setHighlightSection(false);
      setHighlightedReviewId(null);
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [location.hash, location.search, reviews.length]);

  const submitReview = async () => {
    if (!currentUser) {
      setError("يجب تسجيل الدخول لإضافة تقييم.");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("اختر تقييماً بين 1 و5 نجوم.");
      return;
    }

    if (comment.trim().length < 10) {
      setError("التعليق يجب أن يحتوي على 10 أحرف على الأقل.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiPost("/reviews", {
        apartment_id: apartmentId,
        rating,
        comment: comment.trim(),
      });

      setSuccess("تم إضافة تقييمك بنجاح.");
      setComment("");
      setRating(5);
      await loadReviews();
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (submitError: unknown) {
      console.error("Failed to submit review:", submitError);
      const apiError = submitError as { message?: string };
      setError(apiError.message || "فشل في إرسال التقييم.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async () => {
    if (!replyTargetId) {
      return;
    }

    if (replyComment.trim().length < 3) {
      setError("الرد يجب أن يحتوي على 3 أحرف على الأقل.");
      return;
    }

    setReplySubmitting(true);
    setError(null);

    try {
      await apiPost(`/reviews/${replyTargetId}/reply`, {
        comment: replyComment.trim(),
      });

      setSuccess("تم إرسال رد المالك بنجاح.");
      setReplyComment("");
      setReplyTargetId(null);
      await loadReviews();
      window.setTimeout(() => setSuccess(null), 3000);
    } catch (submitError: unknown) {
      console.error("Failed to submit reply:", submitError);
      const apiError = submitError as { message?: string };
      setError(apiError.message || "فشل في إرسال الرد.");
    } finally {
      setReplySubmitting(false);
    }
  };

  const renderReviewNode = (review: ReviewNode, depth = 0) => {
    const isHighlighted = highlightedReviewId === review.id;
    const canReplyToThisReview = isOwner && depth === 0 && review.replies.length === 0;

    return (
      <div key={review.id} className={cn("space-y-3", depth > 0 && "mr-4 pr-4 border-r border-primary/15")}>
        <Card
          id={`review-${review.id}`}
          className={cn(
            "border transition-all duration-300",
            review.is_owner_reply && "bg-muted/40",
            isHighlighted && "border-primary bg-primary/5 shadow-lg"
          )}
        >
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold">{review.author_name}</span>
                  {review.is_owner_reply ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      رد المالك
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground">{formatReviewDate(review.created_at)}</div>
              </div>

              {review.rating ? <StarDisplay rating={review.rating} /> : null}
            </div>

            <p className="text-sm leading-7 text-foreground/90">{review.comment}</p>

            {canReplyToThisReview ? (
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setReplyTargetId(review.id);
                    setReplyComment("");
                    setError(null);
                  }}
                >
                  <CornerDownLeft className="h-4 w-4" />
                  رد
                </Button>
              </div>
            ) : null}

            {replyTargetId === review.id ? (
              <div className="space-y-3 rounded-2xl border bg-background/80 p-4">
                <Textarea
                  value={replyComment}
                  onChange={(event) => setReplyComment(event.target.value)}
                  placeholder="اكتب ردك على هذه المراجعة"
                  rows={4}
                />
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setReplyTargetId(null);
                      setReplyComment("");
                    }}
                  >
                    إلغاء
                  </Button>
                  <Button onClick={submitReply} disabled={replySubmitting}>
                    {replySubmitting ? "جارٍ الإرسال..." : "إرسال الرد"}
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {review.replies.length > 0 ? (
          <div className="space-y-3">
            {review.replies.map((reply) => renderReviewNode(reply, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div id="reviews" ref={sectionRef}>
      <Card className={cn("mt-8 transition-all duration-300", highlightSection && "ring-2 ring-primary/20")}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            التقييمات والمراجعات
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            متوسط التقييم: {stats.avg_rating.toFixed(1)} ({stats.total_reviews} مراجعة)
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          {canWriteReview ? (
            <div className="space-y-3 rounded-2xl border bg-muted/30 p-5">
              <h3 className="text-lg font-semibold">اكتب تقييمك</h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    className={cn(
                      "text-2xl transition-transform hover:scale-110",
                      value <= rating ? "text-yellow-400" : "text-gray-300"
                    )}
                  >
                    ★
                  </button>
                ))}
              </div>
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="شارك تجربتك مع هذه الشقة"
                rows={4}
              />
              <Button onClick={submitReview} disabled={submitting}>
                {submitting ? "جارٍ الإرسال..." : "إرسال التقييم"}
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {isOwner
                ? "بصفتك مالك الشقة يمكنك الرد على المراجعات فقط."
                : "سجل الدخول للمشاركة بتقييمك."}
            </div>
          )}

          <div className="space-y-4">
            {loading ? (
              <div className="py-6 text-center">جارٍ تحميل التقييمات...</div>
            ) : reviewThreads.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">لا توجد تقييمات بعد.</div>
            ) : (
              reviewThreads.map((review) => renderReviewNode(review))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReviewSection;
