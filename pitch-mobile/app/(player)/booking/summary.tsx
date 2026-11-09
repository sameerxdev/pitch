import React, { useState } from "react";
import { View, TouchableOpacity, Modal, ScrollView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { HoldTimer } from "@/components/booking/HoldTimer";
import { PriceBreakdown } from "@/components/booking/PriceBreakdown";
import { formatDate, formatSlotRange, formatPKR } from "@/utils/format";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function BookingSummaryScreen() {
  const params = useLocalSearchParams<{
    bookingId: string;
    advanceAmount: string;
    totalPrice: string;
    holdExpiresAt: string;
    groundId: string;
    slotDate: string;
    startHour: string;
    endHour: string;
    groundName?: string;
    groundArea?: string;
    advancePercent?: string;
  }>();
  const router = useRouter();
  const [expired, setExpired] = useState(false);

  const advanceAmount = parseFloat(params.advanceAmount ?? "0");
  const totalPrice = parseFloat(params.totalPrice ?? "0");
  const startHour = parseInt(params.startHour ?? "0", 10);
  const endHour = parseInt(params.endHour ?? "0", 10);
  const advancePercent = parseInt(params.advancePercent ?? "30", 10);

  function handleExpired() {
    setExpired(true);
  }

  function handleExpiredConfirm() {
    setExpired(false);
    goBackToSlots();
  }

  function goBackToSlots() {
    const gid = params.groundId;
    if (gid) {
      router.replace(`/(player)/ground/${gid}/slots` as never);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: colors.bg }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity
            onPress={goBackToSlots}
            style={{ marginRight: 12 }}
          >
            <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 16 }}>
              <Icon name="back" size={20} />
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
            Booking Summary
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
      >
          {/* Hold timer */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 24,
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16 }}>
              Slot held for
            </Text>
            {params.holdExpiresAt ? (
              <HoldTimer
                expiresAt={params.holdExpiresAt}
                onExpired={handleExpired}
              />
            ) : null}
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 12 }}>
              Complete payment before the timer runs out
            </Text>
          </View>

          {/* Booking details */}
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontWeight: "700",
                color: colors.text,
                fontSize: 15,
                marginBottom: 12,
              }}
            >
              Booking Details
            </Text>
            <Row label="Date" value={formatDate(params.slotDate ?? "")} />
            <Row label="Time" value={formatSlotRange(startHour, endHour)} />
            <Row label="Duration" value="2 hours" />
          </View>

          <PriceBreakdown
            totalPrice={totalPrice}
            advanceAmount={advanceAmount}
            advancePercent={advancePercent}
          />
      </ScrollView>

      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: `/(player)/booking/${params.bookingId}/pay`,
              params,
            } as never)
          }
          style={{
            backgroundColor: colors.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.onAccent, fontWeight: "800", fontSize: 16 }}>
            Pay {formatPKR(advanceAmount)} advance <Icon name="forward" size={15} />
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hold expired modal */}
      <Modal visible={expired} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 20,
              padding: 28,
              width: "100%",
            }}
          >
            <Text style={{ fontSize: 22 }}>⏰</Text>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "800",
                color: colors.text,
                marginTop: 12,
              }}
            >
              Hold expired
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8, marginBottom: 20 }}>
              Your slot hold has expired. Please go back and reselect a slot.
            </Text>
            <TouchableOpacity
              onPress={handleExpiredConfirm}
              style={{
                backgroundColor: colors.accent,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.onAccent, fontWeight: "700" }}>
                Go back to slots
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: "600", fontSize: 14 }}>
        {value}
      </Text>
    </View>
  );
}
