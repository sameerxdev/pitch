import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 16 }}>
            ←
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "800",
            color: "#0D1F15",
          }}
        >
          Write a Review
        </Text>
        <TouchableOpacity
          onPress={() => router.replace("/(player)/bookings" as never)}
        >
          <Text style={{ color: "#5A7264", fontSize: 13 }}>Later</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Overall rating */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Text
            style={{
              fontWeight: "700",
              color: "#0D1F15",
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
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 16 }}
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
              <Text style={{ color: "#5A7264", fontSize: 14 }}>{r.label}</Text>
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
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}
          >
            Your Review
          </Text>
          <TextInput
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="What was your experience like? (optional)"
            placeholderTextColor="#A0B4A8"
            multiline
            numberOfLines={5}
            maxLength={1000}
            textAlignVertical="top"
            accessibilityLabel="Review text"
            style={{
              borderWidth: 1.5,
              borderColor: "#E2EAE5",
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: "#0D1F15",
              minHeight: 100,
            }}
          />
          <Text
            style={{
              color: "#A0B4A8",
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
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            marginBottom: 24,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}
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
                    backgroundColor: "#E34C3C",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
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
                  borderColor: "#C5DFD1",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#1A5C38", fontSize: 28 }}>+</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {error ? (
          <Text style={{ color: "#E34C3C", fontSize: 13, marginBottom: 12 }}>
            {error}
          </Text>
        ) : null}

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: "#1A5C38",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Submit Review
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
