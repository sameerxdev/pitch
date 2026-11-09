import React from "react";
import { StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Icon } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { Text } from "@/components/ui/Typography";
import { colors, fonts } from "@/constants/colors";
import { formatPKR } from "@/utils/format";
import type { Ground } from "@/api/types";

interface GroundCardProps {
  ground: Ground;
}

export function GroundCard({ ground }: GroundCardProps) {
  const router = useRouter();
  const floodlit = ground.facilities?.some((f) => f.toLowerCase() === "floodlights");

  return (
    <PressableScale
      onPress={() => router.push(`/(player)/ground/${ground.id}` as never)}
      accessibilityRole="button"
      accessibilityLabel={`View ${ground.name}`}
      style={styles.card}
    >
      {ground.photos.length > 0 ? (
        <Image
          source={{ uri: ground.photos[0] }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
          <Icon name="cricket" size={56} color={colors.brandBorder} />
        </View>
      )}
      <LinearGradient
        colors={["rgba(6,20,13,0.15)", "rgba(6,20,13,0.1)", "rgba(6,20,13,0.94)"]}
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.topRow}>
        <View style={styles.pill}>
          <Icon name="star" size={12} color={colors.amber} />
          <Text style={styles.pillText}>{ground.avg_rating.toFixed(1)}</Text>
          <Text style={styles.pillMuted}>({ground.review_count})</Text>
        </View>
        {floodlit ? (
          <View style={styles.pill}>
            <Icon name="floodlight" size={13} color={colors.accent} />
            <Text style={styles.pillText}>Floodlit</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.bottomRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {ground.name}
          </Text>
          <Text style={styles.area} numberOfLines={1}>
            <Icon name="location" size={12} /> {ground.area}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.price}>{formatPKR(ground.hourly_rate_day)}</Text>
          <Text style={styles.perHour}>per hour</Text>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 216,
    marginBottom: 16,
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between",
  },
  placeholder: {
    backgroundColor: colors.hero,
    alignItems: "center",
    justifyContent: "center",
  },
  topRow: { flexDirection: "row", gap: 8, padding: 12 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(6,20,13,0.78)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontSize: 12, fontWeight: "700" },
  pillMuted: { fontSize: 11, color: colors.textSecondary },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  name: { fontSize: 19, fontWeight: "800" },
  area: { fontSize: 13, color: colors.textSecondary, marginTop: 3 },
  price: { fontFamily: fonts.display, fontSize: 25, color: colors.accent },
  perHour: { fontSize: 11, color: colors.textSecondary, marginTop: -2 },
});
