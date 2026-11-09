import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { GroundCard } from "@/components/ground/GroundCard";
import { Icon, IconBadge, type IconName } from "@/components/ui/Icon";
import { GroundCardSkeleton } from "@/components/ui/Skeleton";
import { Text, TextInput } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";
import { useGrounds } from "@/hooks/useGrounds";
import { useAuthStore } from "@/stores/authStore";
import { getFirstName } from "@/utils/format";
import { hapticTap } from "@/utils/haptics";
import type { Ground } from "@/api/types";

const FILTERS: Array<{
  key: string;
  label: string;
  icon?: IconName;
  match: (g: Ground) => boolean;
}> = [
  { key: "all", label: "All", match: () => true },
  {
    key: "floodlit",
    label: "Floodlit",
    icon: "floodlight",
    match: (g) => !!g.facilities?.some((f) => f.toLowerCase() === "floodlights"),
  },
  { key: "top", label: "Top rated", icon: "star", match: (g) => g.avg_rating >= 4 },
  {
    key: "budget",
    label: "Under PKR 3,000",
    icon: "cash",
    match: (g) => g.hourly_rate_day < 3000,
  },
];

export default function BrowseScreen() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");
  const [filterKey, setFilterKey] = useState("all");

  const { data, isLoading } = useGrounds({
    search: search.trim() || undefined,
    city: user?.city ?? undefined,
  });

  const grounds = useMemo(() => {
    const all = data?.pages.flatMap((page) => page.items) ?? [];
    const filter = FILTERS.find((f) => f.key === filterKey) ?? FILTERS[0]!;
    return all.filter(filter.match);
  }, [data, filterKey]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.hero, colors.bg]}>
        <SafeAreaView edges={["top"]} style={styles.header}>
          <View style={styles.greetingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>Good day,</Text>
              <Text style={styles.name} numberOfLines={1}>
                {getFirstName(user?.full_name ?? null)}
              </Text>
            </View>
            {user?.city ? (
              <View style={styles.cityPill}>
                <Icon name="location" size={13} color={colors.accent} />
                <Text style={styles.cityText}>{user.city}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.searchBar}>
            <Icon name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search grounds or areas"
              returnKeyType="search"
              style={styles.searchInput}
            />
            {search ? (
              <TouchableOpacity
                onPress={() => setSearch("")}
                accessibilityLabel="Clear search"
              >
                <Icon name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {FILTERS.map((f) => {
            const active = f.key === filterKey;
            const tint = active ? colors.onAccent : colors.textSecondary;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => {
                  hapticTap();
                  setFilterKey(f.key);
                }}
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                {f.icon ? <Icon name={f.icon} size={14} color={tint} /> : null}
                <Text style={[styles.chipText, { color: tint }]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ paddingHorizontal: 20 }}>
          {isLoading ? (
            <>
              <GroundCardSkeleton />
              <GroundCardSkeleton />
            </>
          ) : grounds.length === 0 ? (
            <View style={styles.empty}>
              <IconBadge name="stadium" size={32} />
              <Text style={styles.emptyTitle}>No grounds found</Text>
              <Text style={styles.emptyText}>
                Try a different search or filter.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                {grounds.length} {grounds.length === 1 ? "ground" : "grounds"}
                {user?.city ? ` in ${user.city}` : ""}
              </Text>
              {grounds.map((ground) => (
                <GroundCard key={ground.id} ground={ground} />
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  greetingRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  greeting: { fontSize: 13, color: colors.textSecondary },
  name: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  cityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  cityText: { fontSize: 13, fontWeight: "700", color: colors.accentLight },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginTop: 16,
  },
  searchInput: { flex: 1, paddingVertical: 13, fontSize: 15 },
  filters: { gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 13, fontWeight: "700" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: 12,
  },
  empty: { alignItems: "center", paddingTop: 48 },
  emptyTitle: { fontSize: 17, fontWeight: "800", marginTop: 16 },
  emptyText: { fontSize: 14, color: colors.textSecondary, marginTop: 4 },
});
