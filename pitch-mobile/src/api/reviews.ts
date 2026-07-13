import { apiClient } from "./client";
import type {
  Review,
  SubmitReviewRequest,
  ReplyToReviewRequest,
} from "./types";

export async function submitReview(
  payload: SubmitReviewRequest,
): Promise<Review> {
  // Backend's POST /reviews handler is multipart-only (uses Form(...)). Reuse
  // the multipart helper with no photos so the no-photo path also works.
  return submitReviewWithPhotos(payload, []);
}

export async function submitReviewWithPhotos(
  payload: SubmitReviewRequest,
  photoUris: string[],
): Promise<Review> {
  const formData = new FormData();
  formData.append("booking_id", payload.booking_id);
  formData.append("overall_rating", String(payload.overall_rating));

  if (payload.rating_pitch)
    formData.append("rating_pitch", String(payload.rating_pitch));
  if (payload.rating_cleanliness)
    formData.append("rating_cleanliness", String(payload.rating_cleanliness));
  if (payload.rating_value)
    formData.append("rating_value", String(payload.rating_value));
  if (payload.rating_manager)
    formData.append("rating_manager", String(payload.rating_manager));
  if (payload.review_text) formData.append("review_text", payload.review_text);

  photoUris.forEach((uri, idx) => {
    const filename = uri.split("/").pop() ?? `photo_${idx}.jpg`;
    const ext = filename.split(".").pop() ?? "jpg";
    formData.append("photos", {
      uri,
      name: filename,
      type: `image/${ext}`,
    } as unknown as Blob);
  });

  const { data } = await apiClient.post<{ data: Review }>(
    "/reviews",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return data.data;
}

export async function replyToReview(
  reviewId: string,
  payload: ReplyToReviewRequest,
): Promise<Review> {
  const { data } = await apiClient.post<{ data: Review }>(
    `/reviews/${reviewId}/reply`,
    payload,
  );
  return data.data;
}
