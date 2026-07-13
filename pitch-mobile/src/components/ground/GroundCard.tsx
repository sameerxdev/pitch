import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { useRouter } from "expo-router";
import { RatingDisplay } from "@/components/ui/StarRating";
import { formatPKR } from "@/utils/format";
import type { Ground } from "@/api/types";

interface GroundCardProps {
  ground: Ground;
}


export function GroundCard({ ground }: GroundCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      className="bg-white rounded-2xl mb-3 overflow-hidden shadow-sm"
      onPress={() => router.push(`/(player)/ground/${ground.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`View ${ground.name}`}
    >
      {ground.photos.length > 0 ? (
        <Image
          source={{ uri: ground.photos[0] }}
          className="w-full h-36"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-36 bg-green items-center justify-center">
          <Text className="text-4xl">🏏</Text>
        </View>
      )}

      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-pitch-text font-bold text-base" numberOfLines={1}>
              {ground.name}
            </Text>
            <Text className="text-pitch-secondary text-sm mt-0.5">
              {ground.area}, {ground.city}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-3">
          <RatingDisplay value={ground.avg_rating} count={ground.review_count} />
          <View className="items-end">
            <Text className="text-pitch-secondary text-xs">Day rate</Text>
            <Text className="text-green font-bold text-sm">
              {formatPKR(ground.hourly_rate_day)}/hr
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
