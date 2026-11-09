import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useManagerStore } from "@/stores/managerStore";
import { useManagerReviews } from "@/hooks/useManagerBookings";
import { useReplyToReview } from "@/hooks/useManagerMutations";
import { getApiErrorMessage } from "@/api/client";
import { ReviewCard } from "@/components/ground/ReviewCard";
import type { Review } from "@/api/types";
import { Text, TextInput } from "@/components/ui/Typography";
import { Icon, IconBadge } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function ManagerReviewsScreen() {
  const { activeGround } = useManagerStore();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const groundId = activeGround?.id ?? "";
  const { data, isLoading, isError, fetchNextPage, hasNextPage, refetch } =
    useManagerReviews(groundId);
  const replyMutation = useReplyToReview(groundId);

  const reviews = data?.pages.flatMap((p) => p.items) ?? [];

  if (!activeGround) {
    return null;
  }

  async function handleReplySubmit(reviewId: string) {
    if (!replyText.trim()) return;
    try {
      await replyMutation.mutateAsync({
        reviewId,
        replyText: replyText.trim(),
      });
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      Alert.alert("Could not post reply", getApiErrorMessage(err));
    }
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
          Reviews
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
          {activeGround.name}
        </Text>
      </View>

      {isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : isError ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <Text style={{ color: colors.danger }}>Could not load reviews.</Text>
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
          renderItem={({ item }: { item: Review }) => (
            <View style={{ marginBottom: 16 }}>
              <ReviewCard review={item} />
              {/* Reply section */}
              {!item.manager_reply && replyingTo !== item.id && (
                <TouchableOpacity
                  onPress={() => {
                    setReplyingTo(item.id);
                    setReplyText("");
                  }}
                  style={{
                    alignSelf: "flex-end",
                    marginTop: -8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                  }}
                >
                  <Text
                    style={{
                      color: colors.brand,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    Reply <Icon name="reply" size={13} />
                  </Text>
                </TouchableOpacity>
              )}
              {replyingTo === item.id && (
                <View
                  style={{
                    backgroundColor: colors.brandSoft,
                    borderRadius: 12,
                    padding: 12,
                    marginTop: 4,
                  }}
                >
                  <TextInput
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Write a public reply..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={3}
                    autoFocus
                    style={{ color: colors.text, fontSize: 14, minHeight: 60 }}
                  />
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "flex-end",
                      gap: 8,
                      marginTop: 8,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() => {
                        setReplyingTo(null);
                        setReplyText("");
                      }}
                    >
                      <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleReplySubmit(item.id)}
                      disabled={replyMutation.isPending || !replyText.trim()}
                    >
                      {replyMutation.isPending ? (
                        <ActivityIndicator size="small" color={colors.brand} />
                      ) : (
                        <Text style={{ color: colors.brand, fontWeight: "700" }}>
                          Post Reply
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <IconBadge name="star" size={32} />
              <Text
                style={{ color: colors.textSecondary, textAlign: "center", marginTop: 12 }}
              >
                No reviews yet for this ground.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
