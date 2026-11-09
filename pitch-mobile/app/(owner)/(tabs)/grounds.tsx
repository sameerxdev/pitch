import React from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FlashList } from "@shopify/flash-list";
import { useOwnerGrounds } from "@/hooks/useOwner";
import { getApiErrorMessage } from "@/api/client";
import { GroundStatusBadge } from "@/components/ui/Badge";
import { Text } from "@/components/ui/Typography";
import { IconBadge } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function OwnerGroundsScreen() {
  const router = useRouter();
  const {
    data: grounds,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useOwnerGrounds();

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 8,
        }}
      >
        <Text
          style={{ flex: 1, fontSize: 24, fontWeight: "800", color: colors.text }}
        >
          My Grounds
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(owner)/(tabs)/ground/new" as never)}
          style={{
            backgroundColor: colors.primary,
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 8,
          }}
        >
          <Text style={{ color: colors.white, fontWeight: "700" }}>+ Add</Text>
        </TouchableOpacity>
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
          <Text style={{ color: colors.danger, textAlign: "center" }}>
            {getApiErrorMessage(error)}
          </Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
            <Text style={{ color: colors.brand, fontWeight: "700" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          data={grounds ?? []}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
          }
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontWeight: "700",
                      color: colors.text,
                      fontSize: 16,
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}
                  >
                    {item.area}, {item.city}
                  </Text>
                </View>
                <GroundStatusBadge status={item.status} />
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 12 }}>
                Day: PKR {item.hourly_rate_day}/hr · Night: PKR{" "}
                {item.hourly_rate_night}/hr
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 16,
                  marginTop: 10,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    router.push(
                      `/(owner)/(tabs)/ground/${item.id}/slots` as never,
                    )
                  }
                >
                  <Text
                    style={{
                      color: colors.brand,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    Slots ›
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/(owner)/(tabs)/ground/${item.id}/edit` as never)
                  }
                >
                  <Text
                    style={{
                      color: colors.brand,
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    Edit ›
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 48 }}>
              <IconBadge name="stadium" size={32} />
              <Text
                style={{ color: colors.textSecondary, textAlign: "center", marginTop: 12 }}
              >
                No grounds yet.{"\n"}Tap '+ Add' to create your first ground.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
