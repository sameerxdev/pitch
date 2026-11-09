import React from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePlatformAnalytics } from "@/hooks/useAdmin";
import { getApiErrorMessage } from "@/api/client";
import { StatTile } from "@/components/admin/StatTile";
import { PeriodFilter, periodLabel, useAnalyticsFilter } from "@/components/analytics/PeriodFilter";
import { RevenueChart } from "@/components/owner/RevenueChart";
import { formatPKR } from "@/utils/format";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

const STATUS_LABELS: Record<string, string> = {
  on_hold: "On hold",
  confirmed: "Confirmed",
  arrived: "Arrived",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

export default function AdminOverviewScreen() {
  const router = useRouter();
  const { period, setPeriod, anchor, setAnchor, anchorKey } = useAnalyticsFilter("week");
  const { data, isLoading, isError, error, isFetching, refetch } =
    usePlatformAnalytics(period, anchorKey);

  const statuses = Object.entries(data?.booking_status_breakdown ?? {});

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={() => void refetch()} />
        }
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
          Platform
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 16 }}>
          PITCH administration
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
            {/* Verification queue — the admin's main call to action. */}
            {data.totals.grounds_pending > 0 && (
              <TouchableOpacity
                onPress={() => router.push("/(admin)/(tabs)/grounds" as never)}
                style={{
                  backgroundColor: colors.amberSoft,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.amberBorder,
                }}
              >
                <Text style={{ fontWeight: "800", color: colors.amberLight }}>
                  {data.totals.grounds_pending} ground
                  {data.totals.grounds_pending === 1 ? "" : "s"} awaiting verification
                </Text>
                <Text style={{ color: colors.amberLight, fontSize: 12, marginTop: 4 }}>
                  Tap to review the queue <Icon name="forward" size={15} />
                </Text>
              </TouchableOpacity>
            )}

            <Text style={sectionTitle}>{periodLabel(period, anchor)}</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              <StatTile label="Bookings" value={data.period_metrics.bookings} />
              <StatTile
                label="Gross value"
                value={formatPKR(data.period_metrics.gross_value)}
              />
              <StatTile
                label="Collected"
                value={formatPKR(data.period_metrics.collected)}
              />
            </View>

            <Text style={sectionTitle}>Grounds</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              <StatTile label="Active" value={data.totals.grounds_active} />
              <StatTile
                label="Pending"
                value={data.totals.grounds_pending}
                accent={data.totals.grounds_pending > 0 ? "amber" : "default"}
              />
              <StatTile
                label="Suspended"
                value={data.totals.grounds_suspended}
                accent={data.totals.grounds_suspended > 0 ? "red" : "default"}
              />
            </View>

            <Text style={sectionTitle}>People</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              <StatTile label="Players" value={data.totals.players} />
              <StatTile label="Managers" value={data.totals.managers} />
              <StatTile label="Owners" value={data.totals.owners} />
            </View>

            <Text style={sectionTitle}>Content</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 20 }}>
              <StatTile label="Bookings all-time" value={data.totals.bookings_total} />
              <StatTile label="Reviews" value={data.totals.reviews_total} />
              <StatTile
                label="Hidden reviews"
                value={data.totals.reviews_hidden}
                accent={data.totals.reviews_hidden > 0 ? "amber" : "default"}
              />
            </View>

            {statuses.length > 0 && (
              <View style={card}>
                <Text style={cardTitle}>Booking outcomes</Text>
                {statuses.map(([status, count]) => (
                  <View key={status} style={row}>
                    <Text style={{ color: colors.text, fontSize: 14 }}>
                      {STATUS_LABELS[status] ?? status}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>{count}</Text>
                  </View>
                ))}
              </View>
            )}

            {data.top_grounds.length > 0 && (
              <View style={card}>
                <Text style={cardTitle}>Busiest grounds</Text>
                {data.top_grounds.map((g) => (
                  <View key={g.ground_id} style={row}>
                    <Text
                      style={{ color: colors.text, fontSize: 14, flex: 1, marginRight: 12 }}
                      numberOfLines={1}
                    >
                      {g.ground_name || "Unnamed ground"}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {g.bookings} · {formatPKR(g.revenue)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {period !== "day" && data.daily_volume.length > 0 && (
              <View style={{ ...card, overflow: "hidden" }}>
                <RevenueChart data={data.daily_volume} />
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const sectionTitle = {
  fontWeight: "700" as const,
  color: colors.text,
  fontSize: 14,
  marginBottom: 8,
};
const card = {
  backgroundColor: colors.surface,
  borderRadius: 20,
  padding: 16,
  marginBottom: 16,
};
const cardTitle = {
  fontWeight: "700" as const,
  color: colors.text,
  marginBottom: 12,
};
const row = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderTopColor: colors.border,
};
