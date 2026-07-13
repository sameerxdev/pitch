import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import * as Brightness from "expo-brightness";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { QRDisplay } from "@/components/booking/QRDisplay";
import { useResolvedBooking } from "@/hooks/useBookings";
import { formatDate, formatSlotRange, formatPKR } from "@/utils/format";

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
      <View
        style={{
          flex: 1,
          backgroundColor: "#1A5C38",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (!qrToken) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#F3F5F2",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text style={{ color: "#E34C3C", textAlign: "center" }}>
          Could not load QR code.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginTop: 16 }}
        >
          <Text style={{ color: "#1A5C38", fontWeight: "700" }}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#1A5C38" }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Text
              style={{
                color: "rgba(255,255,255,0.8)",
                fontWeight: "700",
                fontSize: 16,
              }}
            >
              ← Back
            </Text>
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 16 }}>
              Show at Gate
            </Text>
          </View>
        </View>

        {/* QR Code */}
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 24,
              padding: 24,
              alignItems: "center",
              width: "100%",
            }}
          >
            <QRDisplay value={qrToken} size={210} />

            <Text
              style={{
                color: "#5A7264",
                fontWeight: "600",
                fontSize: 13,
                marginTop: 16,
              }}
            >
              Booking Reference
            </Text>
            <Text
              style={{
                color: "#0D1F15",
                fontWeight: "800",
                fontSize: 20,
                letterSpacing: 2,
                marginTop: 4,
              }}
            >
              #{bookingRef}
            </Text>

            <View
              style={{
                width: "100%",
                height: 1,
                backgroundColor: "#E2EAE5",
                marginVertical: 16,
              }}
            />

            <View style={{ width: "100%", gap: 8 }}>
              <InfoRow
                label="Ground"
                value={`${groundName}, ${groundArea}`}
              />
              <InfoRow label="Date" value={formatDate(slotDate)} />
              <InfoRow
                label="Time"
                value={formatSlotRange(startHour, endHour)}
              />
            </View>

            <View
              style={{
                backgroundColor: "#FEF3DC",
                borderRadius: 12,
                padding: 12,
                marginTop: 16,
                width: "100%",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 20, marginRight: 10 }}>💵</Text>
              <View>
                <Text
                  style={{ color: "#9B6008", fontWeight: "600", fontSize: 12 }}
                >
                  Pay at ground
                </Text>
                <Text
                  style={{ color: "#9B6008", fontWeight: "800", fontSize: 16 }}
                >
                  {formatPKR(remainder)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingBottom: 20, paddingHorizontal: 24 }}>
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              textAlign: "center",
              fontSize: 12,
            }}
          >
            This QR code works offline. Show to the ground manager on arrival.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: "#5A7264", fontSize: 13 }}>{label}</Text>
      <Text
        style={{
          color: "#0D1F15",
          fontWeight: "600",
          fontSize: 13,
          flexShrink: 1,
          textAlign: "right",
          marginLeft: 16,
        }}
      >
        {value}
      </Text>
    </View>
  );
}
