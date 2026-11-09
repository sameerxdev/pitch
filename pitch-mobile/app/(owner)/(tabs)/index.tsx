import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerAnalytics } from "@/hooks/useOwner";
import { getApiErrorMessage } from "@/api/client";
import { MetricCard } from "@/components/owner/MetricCard";
import { PeriodFilter, useAnalyticsFilter } from "@/components/analytics/PeriodFilter";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { formatPKR } from "@/utils/format";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

export default function OwnerAnalyticsScreen() {
  const { period, setPeriod, anchor, setAnchor, anchorKey } = useAnalyticsFilter("day");
  const { data, isLoading, isError, error, isFetching, refetch } =
    useOwnerAnalytics(period, anchorKey);

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
        }
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "800",
            color: colors.text,
            marginBottom: 16,
          }}
        >
          Analytics
        </Text>

        <PeriodFilter
          period={period}
          anchor={anchor}
          onPeriodChange={setPeriod}
          onAnchorChange={setAnchor}
        />

        {isLoading ? (
          <View style={{ paddingVertical: 48, alignItems: "center" }}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : isError ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <Text style={{ color: colors.danger, textAlign: "center" }}>
              {getApiErrorMessage(error)}
            </Text>
            <TouchableOpacity onPress={() => refetch()} style={{ marginTop: 12 }}>
              <Text style={{ color: colors.brand, fontWeight: "700" }}>Retry</Text>
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
                  backgroundColor: colors.surface,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 20,
                  overflow: "hidden",
                }}
              >
                <Text
                  style={{
                    fontWeight: "700",
                    color: colors.text,
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
                      borderBottomColor: colors.border,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        color: colors.text,
                        marginBottom: 4,
                      }}
                      numberOfLines={2}
                    >
                      {g.ground_name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {g.metrics.bookings_count} bookings ·{" "}
                      {formatPKR(g.metrics.collected_revenue)} collected
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {period !== "day" && data.daily_volume.length > 0 && (
              <View
                style={{
                  backgroundColor: colors.surface,
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
