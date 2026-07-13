import React from "react";
import { View, Text, Image } from "react-native";
import { StarRating } from "@/components/ui/StarRating";
import { formatDate, anonymizeName } from "@/utils/format";
import type { Review } from "@/api/types";

interface ReviewCardProps {
  review: Review;
  showReplyButton?: boolean;
  onReply?: () => void;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const subRatings = [
    { label: "Pitch Quality", value: review.rating_pitch },
    { label: "Cleanliness", value: review.rating_cleanliness },
    { label: "Value", value: review.rating_value },
    { label: "Manager", value: review.rating_manager },
  ].filter((r) => r.value != null);

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
      <View className="flex-row items-start justify-between mb-2">
        <View>
          <Text className="text-pitch-text font-bold text-sm">
            {anonymizeName(review.player_name)}
          </Text>
          <Text className="text-pitch-secondary text-xs">{formatDate(review.created_at)}</Text>
        </View>
        <StarRating value={review.overall_rating} size="sm" readonly />
      </View>

      {review.review_text ? (
        <Text className="text-pitch-text text-sm leading-5 mb-2">{review.review_text}</Text>
      ) : null}

      {subRatings.length > 0 && (
        <View className="flex-row flex-wrap gap-2 mb-2">
          {subRatings.map(({ label, value }) => (
            <View key={label} className="bg-pitch-bg rounded-lg px-2 py-1">
              <Text className="text-pitch-secondary text-xs">
                {label}: <Text className="font-bold text-pitch-text">{value}/5</Text>
              </Text>
            </View>
          ))}
        </View>
      )}

      {review.photos.length > 0 && (
        <View className="flex-row gap-2 mb-2">
          {review.photos.map((uri, idx) => (
            <Image
              key={idx}
              source={{ uri }}
              className="w-20 h-20 rounded-lg"
              resizeMode="cover"
            />
          ))}
        </View>
      )}

      {review.manager_reply ? (
        <View className="bg-green-pale border-l-4 border-green rounded-r-lg p-3 mt-2">
          <Text className="text-green text-xs font-bold mb-1">Ground's reply</Text>
          <Text className="text-pitch-text text-sm">{review.manager_reply}</Text>
        </View>
      ) : null}
    </View>
  );
}
