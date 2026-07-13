import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ReviewCard } from "@/components/ground/ReviewCard";
import { FacilityChips } from "@/components/ground/FacilityChips";
import { RatingDisplay } from "@/components/ui/StarRating";
import { useGround } from "@/hooks/useGrounds";
import { getApiErrorMessage } from "@/api/client";
import { formatPKR } from "@/utils/format";

export default function GroundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: ground, isLoading, isError, error, refetch } = useGround(id ?? "");

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#F3F5F2",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#1A5C38" />
      </SafeAreaView>
    );
  }

  if (isError || !ground) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#F3F5F2",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: "#E34C3C", textAlign: "center" }}>
          {isError ? getApiErrorMessage(error) : "Ground not found."}
        </Text>
        <TouchableOpacity
          onPress={() => (isError ? refetch() : router.back())}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: "#1A5C38", fontWeight: "700" }}>
            {isError ? "Try again" : "Go back"}
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const reviews = ground.latest_reviews ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={{ position: "relative" }}>
          {ground.photos.length > 0 ? (
            <Image
              source={{ uri: ground.photos[0] }}
              style={{ width: "100%", height: 240 }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: "100%",
                height: 240,
                backgroundColor: "#1A5C38",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 60 }}>🏏</Text>
            </View>
          )}
          <SafeAreaView
            style={{ position: "absolute", top: 0, left: 0, right: 0 }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                margin: 16,
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: "rgba(0,0,0,0.4)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 18 }}>←</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: "#0D1F15" }}>
            {ground.name}
          </Text>
          <Text style={{ color: "#5A7264", fontSize: 14, marginTop: 4 }}>
            📍 {ground.area}, {ground.city}
          </Text>

          <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
            <StatTile
              label="Rating"
              value={
                <RatingDisplay
                  value={ground.avg_rating}
                  count={ground.review_count}
                />
              }
            />
            <StatTile
              label="Day rate"
              value={
                <Text
                  style={{ color: "#1A5C38", fontWeight: "700", fontSize: 14 }}
                >
                  {formatPKR(ground.hourly_rate_day)}/hr
                </Text>
              }
            />
            <StatTile
              label="Night rate"
              value={
                <Text
                  style={{ color: "#0D1F15", fontWeight: "700", fontSize: 14 }}
                >
                  {formatPKR(ground.hourly_rate_night)}/hr
                </Text>
              }
            />
          </View>

          <View
            style={{
              backgroundColor: "#E8F3EE",
              borderRadius: 12,
              padding: 12,
              marginTop: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Text>💳</Text>
            <Text style={{ color: "#1A5C38", fontWeight: "600", fontSize: 13 }}>
              {ground.advance_percent}% advance required to confirm booking
            </Text>
          </View>

          {ground.facilities?.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text
                style={{
                  fontWeight: "700",
                  color: "#0D1F15",
                  marginBottom: 10,
                }}
              >
                Facilities
              </Text>
              <FacilityChips facilities={ground.facilities} />
            </View>
          )}

          <View style={{ marginTop: 24 }}>
            <Text
              style={{
                fontWeight: "700",
                color: "#0D1F15",
                fontSize: 16,
                marginBottom: 12,
              }}
            >
              Reviews ({ground.review_count})
            </Text>
            {reviews.length > 0 ? (
              reviews.map((r) => <ReviewCard key={r.id} review={r} />)
            ) : (
              <Text style={{ color: "#5A7264", fontSize: 14 }}>
                No reviews yet.
              </Text>
            )}
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E2EAE5",
        }}
      >
        <TouchableOpacity
          onPress={() => router.push(`/(player)/ground/${id}/slots` as never)}
          accessibilityRole="button"
          accessibilityLabel="Book this ground"
          style={{
            backgroundColor: "#1A5C38",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
            Book this ground →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StatTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <Text style={{ color: "#5A7264", fontSize: 11, marginBottom: 4 }}>
        {label}
      </Text>
      {value}
    </View>
  );
}
