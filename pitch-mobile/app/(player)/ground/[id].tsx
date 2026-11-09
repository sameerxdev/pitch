import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { FacilityChips } from "@/components/ground/FacilityChips";
import { ReviewCard } from "@/components/ground/ReviewCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PressableScale } from "@/components/ui/PressableScale";
import { RatingDisplay } from "@/components/ui/StarRating";
import { Text } from "@/components/ui/Typography";
import { getApiErrorMessage } from "@/api/client";
import { colors, fonts } from "@/constants/colors";
import { useGround } from "@/hooks/useGrounds";
import { formatPKR } from "@/utils/format";

const { width: SCREEN_W } = Dimensions.get("window");
const GALLERY_H = 300;

export default function GroundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: ground, isLoading, isError, error, refetch } = useGround(id ?? "");
  const [photoIndex, setPhotoIndex] = useState(0);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (isError || !ground) {
    return (
      <View style={[styles.centered, { padding: 24 }]}>
        <Text style={{ color: colors.danger, textAlign: "center" }}>
          {isError ? getApiErrorMessage(error) : "Ground not found."}
        </Text>
        <TouchableOpacity
          onPress={() => (isError ? refetch() : router.back())}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: colors.brand, fontWeight: "700" }}>
            {isError ? "Try again" : "Go back"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const reviews = ground.latest_reviews ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <View style={{ height: GALLERY_H }}>
          {ground.photos.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) =>
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
              }
            >
              {ground.photos.map((uri) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  style={{ width: SCREEN_W, height: GALLERY_H }}
                  contentFit="cover"
                  transition={200}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
              <Icon name="cricket" size={72} color={colors.brandBorder} />
            </View>
          )}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(6,20,13,0.45)", "transparent", colors.bg]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={["top"]} style={styles.backWrap} pointerEvents="box-none">
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backButton}
            >
              <Icon name="back" size={21} color={colors.white} />
            </TouchableOpacity>
          </SafeAreaView>
          {ground.photos.length > 1 ? (
            <View style={styles.dots} pointerEvents="none">
              {ground.photos.map((uri, i) => (
                <View
                  key={uri}
                  style={[styles.dot, i === photoIndex && styles.dotActive]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Text style={styles.title}>{ground.name}</Text>
          <Text style={styles.location}>
            <Icon name="location" size={13} /> {ground.area}, {ground.city}
          </Text>

          <View style={styles.stats}>
            <StatTile icon="star" label="Rating">
              <RatingDisplay value={ground.avg_rating} count={ground.review_count} />
            </StatTile>
            <StatTile icon="sun" label="Day rate">
              <Text style={styles.rate}>{formatPKR(ground.hourly_rate_day)}</Text>
            </StatTile>
            <StatTile icon="moon" label="Night rate">
              <Text style={styles.rate}>{formatPKR(ground.hourly_rate_night)}</Text>
            </StatTile>
          </View>

          <View style={styles.advance}>
            <Icon name="card" size={18} color={colors.brand} />
            <Text style={styles.advanceText}>
              {ground.advance_percent}% advance confirms your booking
            </Text>
          </View>

          {ground.facilities?.length > 0 && (
            <View style={{ marginTop: 26 }}>
              <Text style={styles.sectionTitle}>Facilities</Text>
              <FacilityChips facilities={ground.facilities} />
            </View>
          )}

          <View style={{ marginTop: 26 }}>
            <Text style={styles.sectionTitle}>Reviews ({ground.review_count})</Text>
            {reviews.length > 0 ? (
              reviews.map((r) => <ReviewCard key={r.id} review={r} />)
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                No reviews yet.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <View style={styles.bookBar}>
        <View>
          <Text style={styles.fromLabel}>From</Text>
          <Text style={styles.fromPrice}>
            {formatPKR(ground.hourly_rate_day)}
            <Text style={styles.perHour}> /hr</Text>
          </Text>
        </View>
        <PressableScale
          onPress={() => router.push(`/(player)/ground/${id}/slots` as never)}
          accessibilityRole="button"
          accessibilityLabel="Book this ground"
          style={styles.bookButton}
        >
          <Text style={styles.bookText}>Book now</Text>
          <Icon name="forward" size={18} color={colors.onAccent} />
        </PressableScale>
      </View>
    </View>
  );
}

function StatTile({
  icon,
  label,
  children,
}: {
  icon: IconName;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileLabelRow}>
        <Icon name={icon} size={12} color={colors.textMuted} />
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    backgroundColor: colors.hero,
    alignItems: "center",
    justifyContent: "center",
  },
  backWrap: { position: "absolute", top: 0, left: 0, right: 0 },
  backButton: {
    margin: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(6,20,13,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  dots: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: { width: 20, backgroundColor: colors.accent },
  title: { fontSize: 27, fontWeight: "800", letterSpacing: -0.5 },
  location: { fontSize: 14, color: colors.textSecondary, marginTop: 5 },
  stats: { flexDirection: "row", gap: 10, marginTop: 20 },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
  },
  tileLabelRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  tileLabel: { fontSize: 11, color: colors.textSecondary },
  rate: { fontFamily: fonts.display, fontSize: 20, color: colors.accent },
  advance: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.brandSoft,
    borderRadius: 14,
    padding: 13,
    marginTop: 12,
  },
  advanceText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.brand },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 12 },
  bookBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  fromLabel: { fontSize: 11, color: colors.textSecondary },
  fromPrice: { fontFamily: fonts.display, fontSize: 26, color: colors.accent },
  perHour: { fontSize: 13, color: colors.textSecondary },
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingHorizontal: 26,
    paddingVertical: 15,
  },
  bookText: { fontSize: 16, fontWeight: "800", color: colors.onAccent },
});
