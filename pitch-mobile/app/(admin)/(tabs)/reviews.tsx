import React, { useState } from "react";
import {
  View,
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
import { Text } from "@/components/ui/Typography";
import { IconBadge } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

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
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
          Moderation
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
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
                backgroundColor: filter.key === f.key ? colors.primary : colors.surface,
                borderWidth: 1.5,
                borderColor: filter.key === f.key ? colors.brand : colors.border,
              }}
            >
              <Text
                style={{
                  color: filter.key === f.key ? colors.white : colors.textSecondary,
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
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <Text style={{ color: colors.danger, textAlign: "center" }}>
            {getApiErrorMessage(error)}
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.brand, fontWeight: "700" }}>Retry</Text>
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
            <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
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
                  style={{ color: colors.text, fontWeight: "700", fontSize: 13, flex: 1 }}
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
                  backgroundColor: item.is_visible ? colors.dangerSoft : colors.brandSoft,
                }}
              >
                <Text
                  style={{
                    color: item.is_visible ? colors.danger : colors.brand,
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
              <IconBadge name="star" size={32} />
              <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 12 }}>
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
