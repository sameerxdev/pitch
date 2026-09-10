import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerAnalytics } from "@/hooks/useOwner";
import { getApiErrorMessage } from "@/api/client";
import { MetricCard } from "@/components/owner/MetricCard";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { formatPKR } from "@/utils/format";

type Period = "today" | "week" | "month";

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export default function OwnerAnalyticsScreen() {
  const [period, setPeriod] = useState<Period>("today");
  const { data, isLoading, isError, error, isFetching, refetch } =
    useOwnerAnalytics(period);

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#F3F5F2" }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />
        }
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: "#0D1F15",
            marginBottom: 16,
          }}
        >
          Analytics
        </Text>

        <View
          style={{
            flexDirection: "row",
            backgroundColor: "#E2EAE5",
            borderRadius: 12,
            padding: 3,
            marginBottom: 20,
          }}
        >
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              onPress={() => setPeriod(p.key)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: period === p.key ? "#FFFFFF" : "transparent",
              }}
            >
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 13,
                  color: period === p.key ? "#0D1F15" : "#5A7264",
                }}
              >
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isLoading ? (
          <View style={{ paddingVertical: 48, alignItems: "center" }}>
            <ActivityIndicator size="large" color="#1A5C38" />
          </View>
        ) : isError ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Text style={{ color: "#E34C3C", textAlign: "center" }}>
              {getApiErrorMessage(error)}
            </Text>
            <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
              <Text style={{ color: "#1A5C38", fontWeight: "700" }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : data ? (
          <>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              <MetricCard
                label="Bookings"
                value={String(data.period.bookings_count)}
                trendPercent={data.period.bookings_trend_percent}
              />
              <MetricCard
                label="Est. revenue"
                value={formatPKR(data.period.estimated_revenue)}
                trendPercent={data.period.estimated_revenue_trend_percent}
              />
              <MetricCard
                label="Collected"
                value={formatPKR(data.period.collected_revenue)}
                trendPercent={data.period.collected_revenue_trend_percent}
              />
            </View>

            {data.per_ground.length > 0 && (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 20,
                  overflow: "hidden",
                }}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: "#0D1F15",
                    marginBottom: 12,
                  }}
                >
                  By ground
                </Text>
                {data.per_ground.map((g) => (
                  <View
                    key={g.ground_id}
                    style={{
                      marginBottom: 12,
                      paddingBottom: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: "#F3F5F2",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        color: "#0D1F15",
                        marginBottom: 4,
                      }}
                      numberOfLines={2}
                    >
                      {g.ground_name}
                    </Text>
                    <Text style={{ color: "#5A7264", fontSize: 13 }}>
                      {g.metrics.bookings_count} bookings ·{" "}
                      {formatPKR(g.metrics.collected_revenue)} collected
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {data.daily_volume.length > 0 && (
              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 20,
                  padding: 16,
                  overflow: "hidden",
                }}
              >
                <RevenueChart data={data.daily_volume} />
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
