import React, { useState } from "react";
import {
  View,
  Text,
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
import { RevenueChart } from "@/components/owner/RevenueChart";
import { formatPKR } from "@/utils/format";

type Period = "today" | "week" | "month";

const PERIODS: Array<{ key: Period; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

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
  const [period, setPeriod] = useState<Period>("week");
  const { data, isLoading, isError, error, isFetching, refetch } =
    usePlatformAnalytics(period);

  const statuses = Object.entries(data?.booking_status_breakdown ?? {});

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={() => refetch()} />
        }
      >
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#0D1F15" }}>
          Platform
        </Text>
        <Text style={{ color: "#5A7264", fontSize: 13, marginTop: 4, marginBottom: 16 }}>
          PITCH administration
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
            {/* Verification queue — the admin's main call to action. */}
            {data.totals.grounds_pending > 0 && (
              <TouchableOpacity
                onPress={() => router.push("/(admin)/(tabs)/grounds" as never)}
                style={{
                  backgroundColor: "#FFF6E5",
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: "#F0D9A8",
                }}
              >
                <Text style={{ fontWeight: "800", color: "#8A6510" }}>
                  {data.totals.grounds_pending} ground
                  {data.totals.grounds_pending === 1 ? "" : "s"} awaiting verification
                </Text>
                <Text style={{ color: "#A08040", fontSize: 12, marginTop: 4 }}>
                  Tap to review the queue →
                </Text>
              </TouchableOpacity>
            )}

            <Text style={sectionTitle}>This {period === "today" ? "day" : period}</Text>
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
                    <Text style={{ color: "#0D1F15", fontSize: 14 }}>
                      {STATUS_LABELS[status] ?? status}
                    </Text>
                    <Text style={{ color: "#5A7264", fontWeight: "700" }}>{count}</Text>
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
                      style={{ color: "#0D1F15", fontSize: 14, flex: 1, marginRight: 12 }}
                      numberOfLines={1}
                    >
                      {g.ground_name || "Unnamed ground"}
                    </Text>
                    <Text style={{ color: "#5A7264", fontSize: 13 }}>
                      {g.bookings} · {formatPKR(g.revenue)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {data.daily_volume.length > 0 && (
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
  color: "#0D1F15",
  fontSize: 14,
  marginBottom: 8,
};
const card = {
  backgroundColor: "#FFFFFF",
  borderRadius: 20,
  padding: 16,
  marginBottom: 16,
};
const cardTitle = {
  fontWeight: "700" as const,
  color: "#0D1F15",
  marginBottom: 12,
};
const row = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  paddingVertical: 8,
  borderTopWidth: 1,
  borderTopColor: "#F3F5F2",
};
