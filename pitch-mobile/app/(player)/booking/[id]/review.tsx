import React, { useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { StarRating } from "@/components/ui/StarRating";
import { submitReview, submitReviewWithPhotos } from "@/api/reviews";
import { getApiErrorMessage } from "@/api/client";
import { Config } from "@/constants/config";
import { useQueryClient } from "@tanstack/react-query";
import { Text, TextInput } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

const SUB_RATINGS = [
  { key: "rating_pitch" as const, label: "Pitch quality" },
  { key: "rating_cleanliness" as const, label: "Cleanliness" },
  { key: "rating_value" as const, label: "Value for money" },
  { key: "rating_manager" as const, label: "Ground manager" },
];

export default function WriteReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [overallRating, setOverallRating] = useState(0);
  const [subRatings, setSubRatings] = useState<Record<string, number>>({});
  const [reviewText, setReviewText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickPhoto() {
    if (photos.length >= Config.MAX_REVIEW_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function handleSubmit() {
    if (overallRating === 0) {
      setError("Please rate your overall experience (1–5 stars)");
      return;
    }
    if (!id) return;
    setError(null);
    setLoading(true);
    try {
      const payload = {
        booking_id: id,
        overall_rating: overallRating,
        rating_pitch: subRatings.rating_pitch,
        rating_cleanliness: subRatings.rating_cleanliness,
        rating_value: subRatings.rating_value,
        rating_manager: subRatings.rating_manager,
        review_text: reviewText.trim() || undefined,
      };
      if (photos.length > 0) {
        await submitReviewWithPhotos(payload, photos);
      } else {
        await submitReview(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      Alert.alert("Review submitted!", "Thank you for your feedback.");
      router.replace("/(player)/bookings" as never);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 16 }}>
            <Icon name="back" size={20} />
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "800",
            color: colors.text,
          }}
        >
          Write a Review
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(player)/bookings" as never)}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Later</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Overall rating */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              color: colors.text,
              fontSize: 16,
              marginBottom: 16,
            }}
          >
            Overall Experience
          </Text>
          <StarRating
            value={overallRating}
            onChange={setOverallRating}
            size="lg"
          />
        </View>

        {/* Sub ratings */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: colors.text, marginBottom: 16 }}
          >
            Detailed Ratings
          </Text>
          {SUB_RATINGS.map((r) => (
            <View
              key={r.key}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{r.label}</Text>
              <StarRating
                value={subRatings[r.key] ?? 0}
                onChange={(v) =>
                  setSubRatings((prev) => ({ ...prev, [r.key]: v }))
                }
                size="sm"
              />
            </View>
          ))}
        </View>

        {/* Review text */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: colors.text, marginBottom: 12 }}
          >
            Your Review
          </Text>
          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="What was your experience like? (optional)"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            maxLength={1000}
            textAlignVertical="top"
            accessibilityLabel="Review text"
            style={{
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: colors.text,
              minHeight: 100,
            }}
          />
          <Text
            style={{
              color: colors.textMuted,
              fontSize: 11,
              textAlign: "right",
              marginTop: 4,
            }}
          >
            {reviewText.length}/1000
          </Text>
        </View>

        {/* Photo upload */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: colors.text, marginBottom: 12 }}
          >
            Photos ({photos.length}/{Config.MAX_REVIEW_PHOTOS})
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {photos.map((uri, idx) => (
              <View key={idx} style={{ position: "relative" }}>
                <Image
                  source={{ uri }}
                  style={{ width: 80, height: 80, borderRadius: 10 }}
                />
                <TouchableOpacity
                  onPress={() =>
                    setPhotos((prev) => prev.filter((_, i) => i !== idx))
                  }
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: colors.dangerFill,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: 12 }}><Icon name="close" size={15} /></Text>
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < Config.MAX_REVIEW_PHOTOS && (
              <TouchableOpacity
                onPress={handlePickPhoto}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderStyle: "dashed",
                  borderColor: colors.brandBorder,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: colors.brand, fontSize: 28 }}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={{ color: colors.onAccent, fontWeight: "800", fontSize: 16 }}>
              Submit Review
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
