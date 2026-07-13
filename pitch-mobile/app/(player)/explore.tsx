import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  ScrollView,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import MapView, { Marker, Region } from "react-native-maps";
import { useRouter } from "expo-router";
import { useGrounds } from "@/hooks/useGrounds";
import { formatPKR } from "@/utils/format";
import type { Ground } from "@/api/types";

const { height: SCREEN_H } = Dimensions.get("window");
const HANDLE_HEIGHT = 26;
const HALF_HEIGHT = Math.round(SCREEN_H / 2);
const COLLAPSED_Y = HALF_HEIGHT - HANDLE_HEIGHT;
const EXPANDED_Y = 0;

const LAHORE: Region = {
  latitude: 31.4697,
  longitude: 74.2728,
  latitudeDelta: 0.28,
  longitudeDelta: 0.28,
};

/** Zoom when focusing a ground — wider = more zoomed out. */
const FOCUS_LAT_DELTA = 0.14;
const FOCUS_LNG_DELTA = 0.14;
const MAP_ANIMATION_MS = 750;

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const mapRef = useRef<MapView | null>(null);
  const hasFittedMap = useRef(false);

  const { data } = useGrounds();
  const grounds = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const translateY = useRef(new Animated.Value(COLLAPSED_Y)).current;
  const lastY = useRef(COLLAPSED_Y);

  useEffect(() => {
    if (grounds.length === 0 || hasFittedMap.current) return;
    hasFittedMap.current = true;
    mapRef.current?.fitToCoordinates(
      grounds.map((g) => ({
        latitude: g.latitude,
        longitude: g.longitude,
      })),
      {
        edgePadding: {
          top: 120,
          right: 48,
          bottom: HALF_HEIGHT + insets.bottom + 48,
          left: 48,
        },
        animated: true,
      },
    );
  }, [grounds, insets.bottom]);

  function snapSheet(targetY: number) {
    lastY.current = targetY;
    setIsExpanded(targetY === EXPANDED_Y);
    Animated.spring(translateY, {
      toValue: targetY,
      useNativeDriver: true,
      tension: 70,
      friction: 12,
    }).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 4,
      onPanResponderMove: (_, gs) => {
        const clamped = Math.max(
          EXPANDED_Y,
          Math.min(COLLAPSED_Y, lastY.current + gs.dy),
        );
        translateY.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        const newY = lastY.current + gs.dy;
        snapSheet(newY < COLLAPSED_Y / 2 ? EXPANDED_Y : COLLAPSED_Y);
      },
    }),
  ).current;

  function centerMapOnGround(ground: Ground) {
    // Drawer covers bottom HALF_HEIGHT + insets; shift camera center south so the
    // coordinate (pin tip) lands near the vertical middle of the visible map band.
    const sheetH = HALF_HEIGHT + insets.bottom;
    const latOffset = (sheetH / (1.2 * SCREEN_H)) * FOCUS_LAT_DELTA;
    requestAnimationFrame(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: ground.latitude - latOffset,
          longitude: ground.longitude,
          latitudeDelta: FOCUS_LAT_DELTA,
          longitudeDelta: FOCUS_LNG_DELTA,
        },
        MAP_ANIMATION_MS,
      );
    });
  }

  function expandTo(ground: Ground) {
    setSelectedId(ground.id);
    snapSheet(EXPANDED_Y);
    centerMapOnGround(ground);
    const idx = grounds.findIndex((g) => g.id === ground.id);
    if (idx >= 0) {
      setTimeout(
        () => scrollRef.current?.scrollTo({ y: idx * 104, animated: true }),
        350,
      );
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        initialRegion={LAHORE}
        showsUserLocation
        showsMyLocationButton
      >
        {grounds.map((ground) => (
          <Marker
            key={ground.id}
            coordinate={{
              latitude: ground.latitude,
              longitude: ground.longitude,
            }}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => expandTo(ground)}
          >
            <View style={styles.pinWrap}>
              <View
                style={[
                  styles.pin,
                  selectedId === ground.id && styles.pinActive,
                ]}
              >
                <Text
                  style={[
                    styles.pinName,
                    selectedId === ground.id && styles.pinNameActive,
                  ]}
                  numberOfLines={1}
                >
                  {ground.name}
                </Text>
                <Text
                  style={[
                    styles.pinPrice,
                    selectedId === ground.id && styles.pinPriceActive,
                  ]}
                >
                  {formatPKR(ground.hourly_rate_day)}/hr
                </Text>
              </View>
              {/* Arrow pointer pointing to exact coordinates */}
              <View
                style={[
                  styles.pinArrow,
                  selectedId === ground.id && styles.pinArrowActive,
                ]}
              />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* ── Header overlay ── */}
      <SafeAreaView
        edges={["top"]}
        pointerEvents="box-none"
        style={styles.headerOverlay}
      >
        <View style={styles.headerCard}>
          <Text style={styles.headerTitle}>Explore Grounds</Text>
          <Text style={styles.headerSub}>
            {grounds.length} grounds nearby
          </Text>
        </View>
      </SafeAreaView>

      {/* ── Draggable bottom sheet ── */}
      <Animated.View
        style={[
          styles.sheet,
          { height: HALF_HEIGHT + insets.bottom, transform: [{ translateY }] },
        ]}
      >
        {/* Drag handle area */}
        <View {...panResponder.panHandlers} style={styles.handleArea}>
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>
            {selectedId
              ? grounds.find((g) => g.id === selectedId)?.name
              : `${grounds.length} Grounds nearby`}
          </Text>
          <Text style={styles.sheetHint}>
            {isExpanded ? "↓ drag to close" : "↑ drag up to see list"}
          </Text>
        </View>

        {/* Ground list */}
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        >
          {grounds.map((ground) => (
            <TouchableOpacity
              key={ground.id}
              onPress={() => expandTo(ground)}
              activeOpacity={0.85}
              style={[styles.row, selectedId === ground.id && styles.rowActive]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {ground.name}
                </Text>
                <Text style={styles.rowArea}>
                  📍 {ground.area}, {ground.city}
                </Text>
                <Text style={styles.rowRating}>
                  ⭐ {ground.avg_rating.toFixed(1)} · {ground.review_count}{" "}
                  reviews
                </Text>
              </View>
              <View
                style={{
                  alignItems: "flex-end",
                  justifyContent: "space-between",
                }}
              >
                <Text style={styles.rowPrice}>
                  {formatPKR(ground.hourly_rate_day)}/hr
                </Text>
                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() =>
                    router.push(`/(player)/ground/${ground.id}` as never)
                  }
                >
                  <Text style={styles.viewBtnText}>View →</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Pin ──
  pinWrap: { alignItems: "center" },
  pin: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#1A5C38",
    maxWidth: 160,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  pinActive: { backgroundColor: "#1A5C38", borderColor: "#1A5C38" },
  pinName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D1F15",
    marginBottom: 1,
  },
  pinNameActive: { color: "#FFFFFF" },
  pinPrice: { fontSize: 10, fontWeight: "600", color: "#1A5C38" },
  pinPriceActive: { color: "#A8D5B5" },
  // Triangle arrow pointing down to exact coordinate
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#1A5C38",
  },
  pinArrowActive: { borderTopColor: "#1A5C38" },

  // ── Header ──
  headerOverlay: { position: "absolute", top: 0, left: 0, right: 0 },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#0D1F15" },
  headerSub: { fontSize: 12, color: "#5A7264", marginTop: 2 },

  // ── Sheet ──
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  handleArea: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F4F2",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D0DDD7",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 15, fontWeight: "800", color: "#0D1F15" },
  sheetHint: { fontSize: 11, color: "#A0B4A8", marginTop: 2 },

  // ── Ground row ──
  row: {
    flexDirection: "row",
    backgroundColor: "#F9FBF9",
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: "#E8F0EB",
  },
  rowActive: { borderColor: "#1A5C38", backgroundColor: "#F0FAF4" },
  rowName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0D1F15",
    marginBottom: 3,
  },
  rowArea: { fontSize: 12, color: "#5A7264", marginBottom: 2 },
  rowRating: { fontSize: 11, color: "#A0B4A8" },
  rowPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A5C38",
    marginBottom: 6,
  },
  viewBtn: {
    backgroundColor: "#1A5C38",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  viewBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
});
