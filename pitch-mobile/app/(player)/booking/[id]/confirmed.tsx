import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MatchTicket } from "@/components/booking/MatchTicket";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Typography";
import { colors, fonts } from "@/constants/colors";
import { useResolvedBooking } from "@/hooks/useBookings";
import { formatDate, formatSlotRange, formatPKR } from "@/utils/format";
import { hapticSuccess } from "@/utils/haptics";

export default function BookingConfirmedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const params = useLocalSearchParams<{
    groundName?: string;
    groundArea?: string;
    slotDate?: string;
    startHour?: string;
    endHour?: string;
    totalPrice?: string;
    advanceAmount?: string;
    qrToken?: string;
    remainder?: string;
  }>();
  const router = useRouter();

  const {
    booking,
    isLoading,
    groundName,
    groundArea,
    slotDate,
    startHour,
    endHour,
    advanceAmount,
    remainder,
    qrToken,
    bookingRef,
  } = useResolvedBooking(id, params);

  const scale = useRef(new Animated.Value(0)).current;

  // This screen also opens from the bookings list for past and cancelled games.
  const status = booking?.status;
  const isLive = !status || status === "confirmed" || status === "arrived";

  useEffect(() => {
    if (status === "confirmed") hapticSuccess();
  }, [status]);

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      delay: 150,
      damping: 11,
      useNativeDriver: true,
    }).start();
  }, [scale]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View
          style={[
            styles.check,
            !isLive && styles.checkMuted,
            { transform: [{ scale }], opacity: scale },
          ]}
        >
          <Icon
            name={isLive ? "check" : "ticket"}
            size={isLive ? 38 : 30}
            color={isLive ? colors.onAccent : colors.textSecondary}
          />
        </Animated.View>
        <Text style={styles.title}>
          {isLive ? "You're on the pitch!" : "Booking details"}
        </Text>
        <Text style={styles.subtitle}>
          {isLive
            ? "Booking confirmed. Show this pass at the gate."
            : "This booking is no longer active."}
        </Text>

        <View style={{ width: "100%", marginTop: 24 }}>
          {isLoading && !groundName ? (
            <ActivityIndicator color={colors.accent} style={{ paddingVertical: 48 }} />
          ) : (
            <MatchTicket
              groundName={groundName}
              groundArea={groundArea}
              date={formatDate(slotDate)}
              time={formatSlotRange(startHour, endHour)}
              bookingRef={bookingRef}
              qrToken={isLive ? qrToken : null}
              payAtGround={isLive ? formatPKR(remainder) : undefined}
            />
          )}
        </View>

        <View style={styles.paidRow}>
          <Text style={styles.paidLabel}>Advance paid</Text>
          <Text style={styles.paidValue}>{formatPKR(advanceAmount)}</Text>
        </View>

        <View style={{ width: "100%", gap: 12, marginTop: 20 }}>
          {qrToken && isLive ? (
            <TouchableOpacity
              onPress={() => router.push(`/(player)/booking/${id}/qr` as never)}
              style={styles.primary}
            >
              <Icon name="qr" size={18} color={colors.onAccent} />
              <Text style={styles.primaryText}>Open full-screen pass</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => router.replace("/(player)/bookings" as never)}
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>View all bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(player)" as never)}
            style={{ paddingVertical: 10, alignItems: "center" }}
          >
            <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>
              Back to home
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, alignItems: "center" },
  check: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 14,
  },
  checkMuted: { backgroundColor: colors.surfaceRaised },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.5, textAlign: "center" },
  subtitle: { fontSize: 14, color: colors.textSecondary, marginTop: 5, textAlign: "center" },
  paidRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 14,
  },
  paidLabel: { fontSize: 14, color: colors.textSecondary },
  paidValue: { fontFamily: fonts.display, fontSize: 22, color: colors.brand },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 16,
    paddingVertical: 15,
  },
  primaryText: { fontSize: 15, fontWeight: "800", color: colors.onAccent },
  secondary: {
    backgroundColor: colors.brandSoft,
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  secondaryText: { fontSize: 15, fontWeight: "700", color: colors.brand },
});
