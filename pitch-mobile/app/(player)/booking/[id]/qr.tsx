import React, { useEffect } from "react";
import { View, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import * as Brightness from "expo-brightness";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MatchTicket } from "@/components/booking/MatchTicket";
import { useResolvedBooking } from "@/hooks/useBookings";
import { formatDate, formatSlotRange, formatPKR } from "@/utils/format";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function QRAtGateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const params = useLocalSearchParams<{
    groundName?: string;
    groundArea?: string;
    slotDate?: string;
    startHour?: string;
    endHour?: string;
    advanceAmount?: string;
    remainder?: string;
    qrToken?: string;
  }>();
  const router = useRouter();

  const {
    isLoading,
    groundName,
    groundArea,
    slotDate,
    startHour,
    endHour,
    remainder,
    qrToken,
    bookingRef,
  } = useResolvedBooking(id, params);

  useEffect(() => {
    let previousBrightness = 0.5;

    async function setBrightness() {
      const { status } = await Brightness.requestPermissionsAsync();
      if (status === "granted") {
        previousBrightness = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1);
      }
    }

    setBrightness();

    return () => {
      Brightness.setBrightnessAsync(previousBrightness).catch(() => null);
    };
  }, []);

  if (isLoading && !qrToken) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.hero, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!qrToken) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <Text style={{ color: colors.danger, textAlign: "center" }}>
          Could not load QR code.
        </Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: colors.brand, fontWeight: "700" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.hero }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} accessibilityLabel="Go back" style={{ width: 40 }}>
            <Icon name="back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: "center", fontWeight: "800", fontSize: 16 }}>
            Show at gate
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, paddingBottom: 16 }}>
          <MatchTicket
            groundName={groundName}
            groundArea={groundArea}
            date={formatDate(slotDate)}
            time={formatSlotRange(startHour, endHour)}
            bookingRef={bookingRef}
            qrToken={qrToken}
            qrSize={200}
            payAtGround={formatPKR(remainder)}
            backdrop={colors.hero}
          />
          <Text style={{ color: colors.textSecondary, textAlign: "center", fontSize: 12, marginTop: 14 }}>
            This QR code works offline. Show it to the ground manager on arrival.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
