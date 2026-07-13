import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { QRDisplay } from "@/components/booking/QRDisplay";
import { useResolvedBooking } from "@/hooks/useBookings";
import { formatDate, formatSlotRange, formatPKR } from "@/utils/format";

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
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.sequence([
        Animated.delay(100),
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(200),
        Animated.spring(scale, {
          toValue: 1,
          damping: 12,
          useNativeDriver: true,
        } as never),
      ]),
    ]).start();
  }, [scale, opacity]);

  const checkStyle = { transform: [{ scale }], opacity };

  function handleViewQR() {
    router.push(`/(player)/booking/${id}/qr` as never);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <ScrollView contentContainerStyle={{ padding: 24, alignItems: "center" }}>
        {/* Success animation */}
        <Animated.View
          style={[
            checkStyle,
            {
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#1A5C38",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 24,
              marginBottom: 16,
            },
          ]}
        >
          <Text style={{ color: "#FFFFFF", fontSize: 40 }}>✓</Text>
        </Animated.View>

        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: "#0D1F15",
            textAlign: "center",
          }}
        >
          Booking Confirmed!
        </Text>
        <Text
          style={{
            color: "#1A5C38",
            fontWeight: "700",
            fontSize: 15,
            marginTop: 8,
          }}
        >
          #{bookingRef}
        </Text>

        {/* Details card */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            width: "100%",
            marginTop: 24,
          }}
        >
          {isLoading && !groundName ? (
            <ActivityIndicator color="#1A5C38" style={{ paddingVertical: 24 }} />
          ) : (
            <>
              <Row label="Ground" value={groundName} />
              <Row label="Location" value={groundArea} />
              <Row label="Date" value={formatDate(slotDate)} />
              <Row label="Time" value={formatSlotRange(startHour, endHour)} />
              <View
                style={{
                  height: 1,
                  backgroundColor: "#E2EAE5",
                  marginVertical: 12,
                }}
              />
              <Row label="Advance paid" value={formatPKR(advanceAmount)} />
              <Row label="Pay at ground" value={formatPKR(remainder)} highlight />
            </>
          )}
        </View>

        {/* QR Code */}
        {qrToken ? (
          <View style={{ marginTop: 24, width: "100%" }}>
            <Text
              style={{
                fontWeight: "700",
                color: "#0D1F15",
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              Show this QR at the gate
            </Text>
            <View style={{ alignItems: "center" }}>
              <QRDisplay value={qrToken} size={180} />
            </View>
          </View>
        ) : null}

        {/* Actions */}
        <View style={{ width: "100%", gap: 12, marginTop: 28 }}>
          {qrToken ? (
            <TouchableOpacity
              onPress={handleViewQR}
              style={{
                backgroundColor: "#1A5C38",
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
                View QR at gate
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() => router.replace("/(player)/bookings" as never)}
            style={{
              backgroundColor: "#E8F3EE",
              borderRadius: 14,
              paddingVertical: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 15 }}>
              View all bookings
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/(player)" as never)}
            style={{ paddingVertical: 12, alignItems: "center" }}
          >
            <Text style={{ color: "#5A7264", fontWeight: "600" }}>
              Back to home
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <Text style={{ color: "#5A7264", fontSize: 14 }}>{label}</Text>
      <Text
        style={{
          color: highlight ? "#1A5C38" : "#0D1F15",
          fontWeight: "600",
          fontSize: 14,
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
