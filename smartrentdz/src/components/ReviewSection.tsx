import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface Review {
  id: number;
  apartment_id: string;
  renter_id: string;
  owner_id: string;
  rating: number;
  comment: string;
  report_count: number;
  created_at: string;
  renter_name: string;
  photo_url?: string | null;
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
  const stars = 5;
  return (
    <div className="flex gap-1 text-yellow-500">
      {Array.from({ length: stars }).map((_, idx) => (
        <Star
          key={idx}
          size={16}
          className={idx < rating ? 'fill-current' : 'text-gray-300'}
        />
      ))}
    </div>
  );
};

const ReviewSection = ({ apartmentId, ownerId }: ReviewSectionProps) => {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ avg_rating: 0, total_reviews: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOwner = currentUser?.uid === ownerId;
  const canWriteReview = !!currentUser && !isOwner;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const baseId = apartmentId || '';
        const response = await apiGet<{ reviews: Review[]; stats: ReviewStats }>(`/reviews/${encodeURIComponent(baseId)}`);
        setReviews(response.reviews || []);
        setStats(response.stats || { avg_rating: 0, total_reviews: 0 });
      } catch (err) {
        console.error('Failed to load reviews:', err);
        setError('Failed to load reviews');
      } finally {
        setLoading(false);
      }
    };

    if (apartmentId) load();
  }, [apartmentId]);

  const submitReview = async () => {
    if (!currentUser) {
      setError('يجب تسجيل الدخول للتعليق');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('اختر تقييم بين 1 و 5 نجوم');
      return;
    }
    if (comment.trim().length < 10) {
      setError('التعليق يجب أن يحتوي على 10 أحرف على الأقل');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await apiPost('/reviews', {
        apartment_id: apartmentId,
        rating,
        comment: comment.trim(),
      });
      setSuccess('تم إضافة تقييمك بنجاح');
      setComment('');
      setRating(5);

      const response = await apiGet<{ reviews: Review[]; stats: ReviewStats }>(`/reviews/${encodeURIComponent(apartmentId)}`);
      setReviews(response.reviews || []);
      setStats(response.stats || { avg_rating: 0, total_reviews: 0 });
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      console.error('Failed to submit review:', err);
      type ApiError = { response?: { data?: { error?: string } } };
      const apiError = err as ApiError;
      const message = apiError.response?.data?.error || 'فشل في إرسال التقييم';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>التقييمات والمراجعات</CardTitle>
        <div className="text-sm text-muted-foreground">
          متوسط التقييم: {stats.avg_rating.toFixed(1)} ({stats.total_reviews} مراجعة)
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {canWriteReview ? (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">اكتب تقييمك</h3>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className={`text-2xl ${value <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="شارك تجربتك" rows={4}
            />
            <Button onClick={submitReview} disabled={submitting}>
              {submitting ? 'جاري الإرسال...' : 'إرسال التقييم'}
            </Button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            {isOwner
              ? 'لا يمكنك تقييم الشقة الخاصة بك.'
              : 'سجل الدخول للمشاركة بتقييم.'}
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="py-6 text-center">جارٍ تحميل التقييمات...</div>
          ) : reviews.length === 0 ? (
            <div className="py-6 text-center text-gray-500">لا توجد تقييمات بعد.</div>
          ) : (
            reviews.map((review) => (
              <Card key={review.id} className="border">
                <CardContent>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-bold">{review.renter_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={16}
                          className={i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReviewSection;
