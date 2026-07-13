import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useManagerStore } from "@/stores/managerStore";
import { useManagerBookingDetail } from "@/hooks/useManagerBookings";
import { getApiErrorMessage } from "@/api/client";
import { useCompleteBooking } from "@/hooks/useManagerMutations";
import { formatPKR } from "@/utils/format";
import type { CompletionPaymentMethod } from "@/api/types";

export default function BookingCompletionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { activeGround } = useManagerStore();
  const groundId = activeGround?.id ?? "";

  const { data: booking, isLoading, isFetched } = useManagerBookingDetail(
    groundId,
    id ?? "",
  );
  const completeMutation = useCompleteBooking(groundId);

  const [paymentMethod, setPaymentMethod] =
    useState<CompletionPaymentMethod | null>(null);
  const [amountReceived, setAmountReceived] = useState("");
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!booking || amountReceived) return;
    const remainder = booking.total_price - booking.advance_amount;
    setAmountReceived(String(remainder));
  }, [booking?.id, booking?.total_price, booking?.advance_amount]);

  async function handleComplete() {
    if (!paymentMethod) {
      setError("Please select a payment method.");
      return;
    }
    const amount = parseFloat(amountReceived);
    if (isNaN(amount) || amount < 0) {
      setError("Please enter a valid amount (0 or more).");
      return;
    }
    if (!id) return;

    setError(null);
    try {
      await completeMutation.mutateAsync({
        bookingId: id,
        payload: {
          payment_method: paymentMethod,
          amount_received: amount,
        },
      });
      Alert.alert(
        "Booking completed!",
        "The booking has been marked as completed.",
      );
      router.back();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

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
        <Text style={{ color: "#5A7264" }}>Booking not found.</Text>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return null;
  }

  const expectedRemainder = booking.total_price - booking.advance_amount;

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
          Complete Booking
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {/* Read-only summary */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}
          >
            Payment Summary
          </Text>
          <ReadOnlyRow
            label="Advance collected"
            value={formatPKR(booking.advance_amount)}
          />
          <ReadOnlyRow
            label="Total slot price"
            value={formatPKR(booking.total_price)}
          />
          <View
            style={{ height: 1, backgroundColor: "#E2EAE5", marginVertical: 8 }}
          />
          <ReadOnlyRow
            label="Expected remainder"
            value={formatPKR(expectedRemainder)}
            highlight
          />
        </View>

        {/* Payment method */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 12 }}
          >
            Payment Method Received
          </Text>
          {(["cash", "bank_transfer"] as CompletionPaymentMethod[]).map(
            (method) => (
              <TouchableOpacity
                key={method}
                onPress={() => setPaymentMethod(method)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: paymentMethod === method ? "#1A5C38" : "#E2EAE5",
                  backgroundColor:
                    paymentMethod === method ? "#E8F3EE" : "#FFFFFF",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontSize: 20, marginRight: 12 }}>
                  {method === "cash" ? "💵" : "🏦"}
                </Text>
                <Text style={{ fontWeight: "600", color: "#0D1F15", flex: 1 }}>
                  {method === "cash" ? "Cash" : "Bank Transfer"}
                </Text>
                {paymentMethod === method && (
                  <Text style={{ color: "#1A5C38", fontWeight: "700" }}>✓</Text>
                )}
              </TouchableOpacity>
            ),
          )}
        </View>

        {/* Actual amount */}
        <View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 20,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 4 }}
          >
            Amount Actually Received
          </Text>
          <Text style={{ color: "#5A7264", fontSize: 12, marginBottom: 12 }}>
            Enter the actual amount received. This may differ from the expected
            remainder.
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: "#E2EAE5",
              borderRadius: 12,
              paddingHorizontal: 16,
              backgroundColor: "#F3F5F2",
            }}
          >
            <Text
              style={{ color: "#5A7264", fontWeight: "600", marginRight: 8 }}
            >
              PKR
            </Text>
            <TextInput
              value={amountReceived}
              onChangeText={setAmountReceived}
              placeholder={String(expectedRemainder)}
              placeholderTextColor="#A0B4A8"
              keyboardType="decimal-pad"
              accessibilityLabel="Amount received input"
              style={{
                flex: 1,
                paddingVertical: 14,
                fontSize: 18,
                fontWeight: "700",
                color: "#0D1F15",
              }}
            />
          </View>
        </View>

        {error && (
          <Text style={{ color: "#E34C3C", fontSize: 13, marginBottom: 12 }}>
            {error}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleComplete}
          disabled={completeMutation.isPending}
          style={{
            backgroundColor: "#1A5C38",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: completeMutation.isPending ? 0.6 : 1,
          }}
        >
          {completeMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Complete Booking ✓
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ReadOnlyRow({
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
