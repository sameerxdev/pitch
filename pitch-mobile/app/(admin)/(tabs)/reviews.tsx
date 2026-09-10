import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useAdminReviews, useModerateReview } from "@/hooks/useAdmin";
import { getApiErrorMessage } from "@/api/client";
import { Badge } from "@/components/ui/Badge";
import { ReviewCard } from "@/components/ground/ReviewCard";
import type { AdminReview } from "@/api/types";

type Filter = { key: string; label: string; visible?: boolean };

const FILTERS: Filter[] = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible", visible: true },
  { key: "hidden", label: "Hidden", visible: false },
];

export default function AdminReviewsScreen() {
  const [filter, setFilter] = useState<Filter>(FILTERS[0]);

  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useAdminReviews({ visible: filter.visible });

  const moderateMutation = useModerateReview();
  const reviews = data?.pages.flatMap((p) => p.items) ?? [];

  function handleToggleVisibility(review: AdminReview) {
    const hiding = review.is_visible;
    Alert.alert(
      hiding ? "Hide review?" : "Restore review?",
      hiding
        ? "It stops showing on the ground page and no longer counts toward the rating."
        : "It becomes public again and counts toward the ground's rating.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: hiding ? "Hide" : "Restore",
          style: hiding ? "destructive" : "default",
          onPress: async () => {
            try {
              await moderateMutation.mutateAsync({
                reviewId: review.id,
                isVisible: !hiding,
              });
            } catch (err) {
              Alert.alert("Error", getApiErrorMessage(err));
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#0D1F15" }}>
          Moderation
        </Text>
        <Text style={{ color: "#5A7264", fontSize: 13, marginTop: 4 }}>
          Hidden reviews are excluded from ground ratings.
        </Text>
      </View>

      <View style={{ flexGrow: 0, marginTop: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, paddingBottom: 8 }}
        >
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f)}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 6,
                borderRadius: 20,
                backgroundColor: filter.key === f.key ? "#1A5C38" : "#FFFFFF",
                borderWidth: 1.5,
                borderColor: filter.key === f.key ? "#1A5C38" : "#E2EAE5",
              }}
            >
              <Text
                style={{
                  color: filter.key === f.key ? "#FFFFFF" : "#5A7264",
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color="#1A5C38" />
        </View>
      ) : isError ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <Text style={{ color: "#E34C3C", textAlign: "center" }}>
            {getApiErrorMessage(error)}
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: "#1A5C38", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={reviews}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 20 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />
          }
          renderItem={({ item }) => (
            <View style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                  gap: 8,
                }}
              >
                <Text
                  style={{ color: "#0D1F15", fontWeight: "700", fontSize: 13, flex: 1 }}
                  numberOfLines={1}
                >
                  {item.ground_name || "Unknown ground"}
                </Text>
                {!item.is_visible && <Badge label="Hidden" variant="red" />}
              </View>

              <ReviewCard review={item} />

              <TouchableOpacity
                disabled={moderateMutation.isPending}
                onPress={() => handleToggleVisibility(item)}
                style={{
                  alignSelf: "flex-end",
                  marginTop: 8,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  backgroundColor: item.is_visible ? "#FDECEA" : "#E8F3EE",
                }}
              >
                <Text
                  style={{
                    color: item.is_visible ? "#E34C3C" : "#1A5C38",
                    fontWeight: "700",
                    fontSize: 13,
                  }}
                >
                  {item.is_visible ? "Hide review" : "Restore review"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <Text style={{ fontSize: 36 }}>⭐</Text>
              <Text style={{ color: "#5A7264", textAlign: "center", marginTop: 12 }}>
                {filter.key === "hidden"
                  ? "No reviews have been hidden."
                  : "No reviews yet."}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
