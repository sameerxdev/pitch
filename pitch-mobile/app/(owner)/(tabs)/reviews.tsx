import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import {
  useOwnerGrounds,
  useOwnerReviews,
  useReplyToOwnerReview,
} from "@/hooks/useOwner";
import { getApiErrorMessage } from "@/api/client";
import { ReviewCard } from "@/components/ground/ReviewCard";
import type { Review } from "@/api/types";

export default function OwnerReviewsScreen() {
  const { data: grounds } = useOwnerGrounds();
  const [selectedGroundId, setSelectedGroundId] = useState<string | null>(null);

  const groundId = selectedGroundId ?? grounds?.[0]?.id ?? "";

  useEffect(() => {
    if (grounds?.length && !selectedGroundId) {
      setSelectedGroundId(grounds[0].id);
    }
  }, [grounds, selectedGroundId]);

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, refetch } =
    useOwnerReviews(groundId);
  const replyMutation = useReplyToOwnerReview(groundId);
  const submitting = replyMutation.isPending;

  const reviews = data?.pages.flatMap((p) => p.items) ?? [];

  async function handleReplySubmit(reviewId: string) {
    const text = replyText.trim();
    if (!text) return;
    try {
      await replyMutation.mutateAsync({ reviewId, replyText: text });
      setReplyingTo(null);
      setReplyText("");
    } catch (err) {
      Alert.alert("Could not post reply", getApiErrorMessage(err));
    }
  }

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#F3F5F2" }}
    >
      <View
        style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 }}
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#0D1F15" }}>
          Reviews
        </Text>
      </View>

      {grounds && grounds.length > 0 && (
        <View style={{ flexGrow: 0, marginBottom: 4 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              gap: 8,
              paddingBottom: 8,
              alignItems: "center",
            }}
          >
            {grounds.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setSelectedGroundId(g.id)}
                style={{
                  flexShrink: 0,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: groundId === g.id ? "#1A5C38" : "#FFFFFF",
                  borderWidth: 1.5,
                  borderColor: groundId === g.id ? "#1A5C38" : "#E2EAE5",
                }}
              >
                <Text
                  style={{
                    color: groundId === g.id ? "#FFFFFF" : "#5A7264",
                    fontWeight: "600",
                    fontSize: 12,
                  }}
                >
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {!groundId ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#1A5C38" />
        </View>
      ) : isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color="#1A5C38" />
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
          <Text style={{ color: "#E34C3C", textAlign: "center" }}>
            {getApiErrorMessage(error)}
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: "#1A5C38", fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          style={{ flex: 1 }}
          data={reviews}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 20 }}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          renderItem={({ item }: { item: Review }) => (
            <View style={{ marginBottom: 16 }}>
              <ReviewCard review={item} />
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
                      color: "#1A5C38",
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    Reply ↩
                  </Text>
                </TouchableOpacity>
              )}
              {replyingTo === item.id && (
                <View
                  style={{
                    backgroundColor: "#E8F3EE",
                    borderRadius: 12,
                    padding: 12,
                    marginTop: 4,
                  }}
                >
                  <TextInput
                    value={replyText}
                    onChangeText={setReplyText}
                    placeholder="Write a public reply..."
                    placeholderTextColor="#A0B4A8"
                    multiline
                    numberOfLines={3}
                    autoFocus
                    style={{ color: "#0D1F15", fontSize: 14, minHeight: 60 }}
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
                      <Text style={{ color: "#5A7264", fontWeight: "600" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleReplySubmit(item.id)}
                      disabled={submitting || !replyText.trim()}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#1A5C38" />
                      ) : (
                        <Text style={{ color: "#1A5C38", fontWeight: "700" }}>
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
              <Text style={{ fontSize: 36 }}>⭐</Text>
              <Text
                style={{ color: "#5A7264", textAlign: "center", marginTop: 12 }}
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
