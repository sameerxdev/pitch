import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  type ImageSourcePropType,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { initiatePayment } from "@/api/payments";
import { getApiErrorMessage } from "@/api/client";
import { formatPKR } from "@/utils/format";
import { pollPaymentUntilSettled } from "@/utils/pollPayment";
import type { PaymentMethod } from "@/api/types";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

const jazzcashLogo = require("@/assets/payment/jazzcash.png");
const easypaisaLogo = require("@/assets/payment/easypaisa.png");

const PAYMENT_OPTIONS: Array<{
  method: PaymentMethod;
  label: string;
  logo: ImageSourcePropType;
}> = [
  { method: "jazzcash", label: "JazzCash", logo: jazzcashLogo },
  { method: "easypaisa", label: "Easypaisa", logo: easypaisaLogo },
];

export default function PayAdvanceScreen() {
  const params = useLocalSearchParams<{
    id: string;
    advanceAmount: string;
    totalPrice: string;
    slotDate: string;
    startHour: string;
    endHour: string;
    holdExpiresAt?: string;
    groundId?: string;
    groundName?: string;
    groundArea?: string;
    advancePercent?: string;
  }>();
  const { id } = params;
  const router = useRouter();

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const advanceAmount = parseFloat(params.advanceAmount ?? "0");

  function goBackToSummary() {
    if (!id) return;
    router.replace({
      pathname: "/(player)/booking/summary",
      params: {
        bookingId: id,
        advanceAmount: params.advanceAmount ?? "",
        totalPrice: params.totalPrice ?? "",
        holdExpiresAt: params.holdExpiresAt ?? "",
        groundId: params.groundId ?? "",
        slotDate: params.slotDate ?? "",
        startHour: params.startHour ?? "",
        endHour: params.endHour ?? "",
        groundName: params.groundName ?? "",
        groundArea: params.groundArea ?? "",
        advancePercent: params.advancePercent ?? "30",
      },
    } as never);
  }

  async function handlePay() {
    if (!selectedMethod || !id) return;
    setLoading(true);
    setError(null);
    try {
      const initiated = await initiatePayment({
        booking_id: id,
        method: selectedMethod,
      });

      if (initiated.payment_url) {
        const canOpen = await Linking.canOpenURL(initiated.payment_url);
        if (canOpen) await Linking.openURL(initiated.payment_url);
      }

      const payment = await pollPaymentUntilSettled(initiated.payment_id);
      if (payment.status !== "completed") {
        setError("Payment was not completed. Please try again.");
        return;
      }

      router.replace(`/(player)/booking/${id}/confirmed` as never);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
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
            onPress={goBackToSummary}
            style={{ marginRight: 12 }}
          >
            <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 16 }}>
              <Icon name="back" size={20} />
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>
            Pay Advance
          </Text>
        </View>
      </SafeAreaView>

      <View style={{ padding: 20, flex: 1 }}>
        {/* Amount card */}
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: 20,
            padding: 28,
            alignItems: "center",
            marginBottom: 24,
          }}
        >
          <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 14 }}>
            Amount due now
          </Text>
          <Text
            style={{
              color: colors.white,
              fontSize: 42,
              fontWeight: "900",
              marginTop: 8,
            }}
          >
            {formatPKR(advanceAmount)}
          </Text>
        </View>

        {/* Payment methods */}
        <Text
          style={{
            fontWeight: "700",
            color: colors.text,
            fontSize: 15,
            marginBottom: 12,
          }}
        >
          Select payment method
        </Text>
        {PAYMENT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.method}
            onPress={() => setSelectedMethod(opt.method)}
            accessibilityRole="radio"
            accessibilityLabel={opt.label}
            accessibilityState={{ checked: selectedMethod === opt.method }}
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 12,
              borderWidth: 2,
              borderColor:
                selectedMethod === opt.method ? colors.brand : colors.border,
            }}
          >
            <Image
              source={opt.logo}
              resizeMode="contain"
              style={{
                width: 52,
                height: 40,
                marginRight: 14,
              }}
              accessibilityIgnoresInvertColors
            />
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                color: colors.text,
                flex: 1,
              }}
            >
              {opt.label}
            </Text>
            {selectedMethod === opt.method && (
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: colors.white, fontSize: 14, fontWeight: "700" }}
                >
                  <Icon name="check" size={15} />
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 13, marginBottom: 12 }}>
            {error}
          </Text>
        ) : null}

        {/* Security banner */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          <Text style={{ fontSize: 16 }}><Icon name="lock" size={15} /></Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11.5 }}>
            Payments are processed securely. We never store your card details.
          </Text>
        </View>
      </View>

      <View
        style={{
          padding: 16,
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        <TouchableOpacity
          onPress={handlePay}
          disabled={!selectedMethod || loading}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: !selectedMethod || loading ? 0.5 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={{ color: colors.onAccent, fontWeight: "800", fontSize: 16 }}>
              {selectedMethod
                ? `Pay via ${selectedMethod === "jazzcash" ? "JazzCash" : "Easypaisa"}`
                : "Select a payment method"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
