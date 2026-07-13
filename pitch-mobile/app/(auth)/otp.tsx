import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { requestOtp, verifyOtp } from "@/api/auth";
import { getApiErrorMessage } from "@/api/client";
import { useAuthStore } from "@/stores/authStore";
import { Config } from "@/constants/config";

const NUM_DIGITS = 6;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const { login } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(Array(NUM_DIGITS).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState<number>(
    Config.OTP_RESEND_COOLDOWN_SECONDS,
  );

  const inputRefs = useRef<Array<TextInput | null>>(
    Array(NUM_DIGITS).fill(null),
  );
  const shake = useRef(new Animated.Value(0)).current;
  const shakeStyle = { transform: [{ translateX: shake }] };

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const t = setInterval(() => setResendSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendSeconds]);

  function shakeInputs() {
    Animated.sequence([
      Animated.timing(shake, {
        toValue: 8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: -8,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shake, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function handleDigitChange(index: number, value: string) {
    if (verifying) return;
    const char = value.slice(-1);
    if (!/^\d?$/.test(char)) return;

    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setError(null);

    if (char && index < NUM_DIGITS - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (next.every((d) => d !== "") && char) {
      void handleVerify(next.join(""));
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(code?: string) {
    const otp = code ?? digits.join("");
    if (otp.length < NUM_DIGITS) {
      setError("Enter the full 6-digit code");
      return;
    }
    if (!phone) {
      setError("Phone number missing. Go back and enter your number again.");
      return;
    }
    if (verifying) return;

    setVerifying(true);
    setError(null);
    try {
      const result = await verifyOtp({ phone, otp });
      await login(result.user, result.access_token, result.refresh_token);
      // Root AuthGate redirects by user.role (player / manager / ground_owner / admin)
    } catch (err) {
      setError(getApiErrorMessage(err));
      shakeInputs();
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resendSeconds > 0 || verifying || resending || !phone) return;
    setResending(true);
    setError(null);
    try {
      await requestOtp({ phone });
      setResendSeconds(Config.OTP_RESEND_COOLDOWN_SECONDS);
      setDigits(Array(NUM_DIGITS).fill(""));
      inputRefs.current[0]?.focus();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            onPress={() => router.back()}
            disabled={verifying}
            style={{ marginBottom: 24 }}
          >
            <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 16 }}>
              ← Back
            </Text>
          </TouchableOpacity>

          <Text
            style={{
              fontSize: 26,
              fontWeight: "800",
              color: "#0D1F15",
              marginBottom: 8,
            }}
          >
            Verify your number
          </Text>
          <Text style={{ color: "#5A7264", fontSize: 14, marginBottom: 24 }}>
            We sent a 6-digit code to{" "}
            <Text style={{ fontWeight: "700", color: "#0D1F15" }}>{phone}</Text>
          </Text>

          <Animated.View
            style={[
              {
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 16,
              },
              shakeStyle,
            ]}
          >
            {digits.map((digit, i) => (
              <TextInput
                key={i}
                ref={(r) => {
                  inputRefs.current[i] = r;
                }}
                value={digit}
                onChangeText={(v) => handleDigitChange(i, v)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(i, nativeEvent.key)
                }
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                editable={!verifying}
                accessibilityLabel={`Digit ${i + 1}`}
                style={{
                  width: 48,
                  height: 56,
                  borderWidth: 2,
                  borderColor: error
                    ? "#E34C3C"
                    : digit
                      ? "#1A5C38"
                      : "#E2EAE5",
                  borderRadius: 12,
                  backgroundColor: "#FFFFFF",
                  textAlign: "center",
                  fontSize: 22,
                  fontWeight: "700",
                  color: "#0D1F15",
                }}
              />
            ))}
          </Animated.View>

          {error ? (
            <Text style={{ color: "#E34C3C", fontSize: 13, marginBottom: 12 }}>
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            onPress={() => handleVerify()}
            disabled={digits.some((d) => !d) || verifying}
            style={{
              backgroundColor: "#1A5C38",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              opacity: digits.some((d) => !d) || verifying ? 0.5 : 1,
            }}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                Verify & Continue
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resendSeconds > 0 || verifying}
            style={{ marginTop: 20, alignItems: "center" }}
          >
            <Text
              style={{
                color: resendSeconds > 0 ? "#A0B4A8" : "#1A5C38",
                fontSize: 14,
                fontWeight: "600",
              }}
            >
              {resendSeconds > 0
                ? `Resend code in ${resendSeconds}s`
                : "Resend code"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
