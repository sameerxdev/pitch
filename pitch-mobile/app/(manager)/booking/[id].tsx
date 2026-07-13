import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useManagerStore } from "@/stores/managerStore";
import { useManagerBookingDetail } from "@/hooks/useManagerBookings";
import { BookingStatusBadge } from "@/components/ui/Badge";
import {
  formatDate,
  formatSlotRange,
  formatPKR,
} from "@/utils/format";
import { getApiErrorMessage } from "@/api/client";
import { useArriveBooking } from "@/hooks/useManagerMutations";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeGround } = useManagerStore();
  const [manualArrivalOpen, setManualArrivalOpen] = useState(false);
  const groundId = activeGround?.id ?? "";
  const { data: booking, isLoading, isFetched, refetch } =
    useManagerBookingDetail(groundId, id ?? "");
  const arriveMutation = useArriveBooking(groundId);

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#F3F5F2",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color="#1A5C38" />
      </SafeAreaView>
    );
  }

  if (isFetched && !booking) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F2", padding: 24 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 16 }}>
            ←
          </Text>
        </TouchableOpacity>
        <Text style={{ color: "#5A7264", marginTop: 24 }}>
          Booking not found for this ground.
        </Text>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return null;
  }

  const canComplete = booking.status === "arrived";
  const canCheckIn =
    booking.status === "confirmed" || booking.status === "on_hold";
  const bookingRef = booking.id.slice(0, 8).toUpperCase();

  async function handleConfirmManualArrival() {
    if (!booking) return;
    try {
      await arriveMutation.mutateAsync({
        bookingId: booking.id,
        payload: { method: "manual" },
      });
      await refetch();
      setManualArrivalOpen(false);
      Alert.alert(
        "Arrival confirmed",
        "The player has been marked as arrived.",
      );
    } catch (err) {
      Alert.alert("Could not confirm", getApiErrorMessage(err));
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 16 }}>
            ←
          </Text>
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 18,
            fontWeight: "800",
            color: "#0D1F15",
          }}
        >
          Booking Detail
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 20,
          }}
        >
          <Text style={{ color: "#5A7264", fontWeight: "600" }}>
            #{bookingRef}
          </Text>
          <BookingStatusBadge status={booking.status} />
        </View>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}
          >
            Booking Info
          </Text>
          <Row label="Date" value={formatDate(booking.slot_date)} />
          <Row
            label="Time"
            value={formatSlotRange(booking.start_hour, booking.end_hour)}
          />
          <Row
            label="Player"
            value={booking.player_name?.trim() || "—"}
          />
          <Row
            label="Contact"
            value={booking.player_phone?.trim() || "—"}
          />
        </View>

        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}
          >
            Payment
          </Text>
          <Row label="Total price" value={formatPKR(booking.total_price)} />
          <Row label="Advance paid" value={formatPKR(booking.advance_amount)} />
          <Row
            label="Remainder"
            value={formatPKR(booking.total_price - booking.advance_amount)}
          />
          {booking.remainder_collected > 0 && (
            <Row
              label="Collected"
              value={formatPKR(booking.remainder_collected)}
              highlight
            />
          )}
        </View>

        {canCheckIn && (
          <View style={{ gap: 12, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={() => router.push("/(manager)/scan" as never)}
              style={{
                backgroundColor: "#E8F3EE",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#1A5C38", fontWeight: "700" }}>
                📷 Scan QR code
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setManualArrivalOpen(true)}
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: "center",
                borderWidth: 1.5,
                borderColor: "#1A5C38",
              }}
            >
              <Text style={{ color: "#1A5C38", fontWeight: "700" }}>
                Manual confirmation
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {canComplete && (
          <TouchableOpacity
            onPress={() =>
              router.push(`/(manager)/booking/${id}/complete` as never)
            }
            style={{
              backgroundColor: "#1A5C38",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Complete Booking →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={manualArrivalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setManualArrivalOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
            }}
          >
            <Text
              style={{
                fontWeight: "800",
                fontSize: 18,
                color: "#0D1F15",
                marginBottom: 8,
              }}
            >
              Confirm arrival
            </Text>
            <Text style={{ color: "#5A7264", fontSize: 14, marginBottom: 16 }}>
              Check the details below, then confirm the player is at the ground.
            </Text>
            <View
              style={{
                backgroundColor: "#F3F5F2",
                borderRadius: 14,
                padding: 16,
                marginBottom: 20,
              }}
            >
              <DetailLine label="Date" value={formatDate(booking.slot_date)} />
              <DetailLine
                label="Time"
                value={formatSlotRange(
                  booking.start_hour,
                  booking.end_hour,
                )}
              />
              <DetailLine
                label="Player"
                value={booking.player_name?.trim() || "—"}
              />
              <DetailLine
                label="Contact"
                value={booking.player_phone?.trim() || "—"}
              />
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <TouchableOpacity
                onPress={() => setManualArrivalOpen(false)}
                disabled={arriveMutation.isPending}
                style={{
                  flex: 1,
                  borderWidth: 1.5,
                  borderColor: "#E2EAE5",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#5A7264", fontWeight: "700" }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmManualArrival}
                disabled={arriveMutation.isPending}
                style={{
                  flex: 1,
                  backgroundColor: "#1A5C38",
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  opacity: arriveMutation.isPending ? 0.7 : 1,
                }}
              >
                {arriveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                    Confirm arrival
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={{ color: "#5A7264", fontSize: 12, marginBottom: 2 }}>
        {label}
      </Text>
      <Text style={{ color: "#0D1F15", fontSize: 15, fontWeight: "600" }}>
        {value}
      </Text>
    </View>
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
        }}
      >
        {value}
      </Text>
    </View>
  );
}
