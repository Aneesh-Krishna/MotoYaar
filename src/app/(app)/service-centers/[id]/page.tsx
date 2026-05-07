import { getSession } from "@/lib/session";
import { serviceCenterService } from "@/services/serviceCenterService";
import { notFound, redirect } from "next/navigation";
import { NotFoundError } from "@/lib/errors";
import { format, parseISO } from "date-fns";
import { Star, MapPin } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          className={s <= Math.round(rating) ? "fill-orange-400 text-orange-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

export default async function ServiceCenterPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;

  let serviceCenter;
  let reviews;
  try {
    [serviceCenter, reviews] = await Promise.all([
      serviceCenterService.getById(id),
      serviceCenterService.getReviews(id),
    ]);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{serviceCenter.name}</h1>
        <div className="flex items-center gap-1.5 mt-1 text-gray-500">
          <MapPin size={14} />
          <span className="text-sm">
            {serviceCenter.city}
            {serviceCenter.pincode ? ` — ${serviceCenter.pincode}` : ""}
          </span>
        </div>
      </div>

      {/* Rating summary */}
      <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-4">
        <div className="text-center">
          <p className="text-3xl font-bold text-orange-500">
            {serviceCenter.avgRating != null ? serviceCenter.avgRating.toFixed(1) : "—"}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">avg rating</p>
        </div>
        <div>
          {serviceCenter.avgRating != null && (
            <StarRating rating={serviceCenter.avgRating} size={18} />
          )}
          <p className="text-sm text-gray-500 mt-1">
            {serviceCenter.reviewCount} {serviceCenter.reviewCount === 1 ? "review" : "reviews"}
          </p>
        </div>
      </div>

      {/* Reviews */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No reviews yet. Be the first!</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <StarRating rating={review.rating} size={14} />
                  <span className="text-xs text-gray-400">
                    {format(parseISO(review.createdAt), "d MMM yyyy")}
                  </span>
                </div>
                {review.reviewText && (
                  <p className="text-sm text-gray-700 mt-1.5">{review.reviewText}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
