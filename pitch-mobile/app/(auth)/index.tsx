import React, { useState, useRef } from "react";
import {
  View,
  type TextInputInstance,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { requestOtp } from "@/api/auth";
import { getApiErrorMessage } from "@/api/client";
import { isValidPakistanPhone, formatPhoneE164 } from "@/utils/validators";
import { Text, TextInput } from "@/components/ui/Typography";
import { Icon, IconBadge } from "@/components/ui/Icon";
import { LinearGradient } from "expo-linear-gradient";
import { colors, fonts } from "@/constants/colors";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInputInstance>(null);

  async function handleSendOtp() {
    const cleaned = phone.replace(/\s/g, "");
    if (!isValidPakistanPhone(cleaned)) {
      setError("Enter a valid 10-digit number (e.g. 3001234567)");
      return;
    }
    const e164 = formatPhoneE164(cleaned);
    setError(null);
    setSending(true);
    try {
      await requestOtp({ phone: e164 });
      router.push({
        pathname: "/(auth)/otp",
        params: { phone: e164 },
      });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <LinearGradient colors={[colors.primary, colors.hero, colors.bg]} locations={[0, 0.45, 0.8]} style={{ flex: 1 }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Hero */}
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                paddingTop: 60,
                paddingBottom: 32,
              }}
            >
              <IconBadge name="cricket" size={40} color={colors.accent} background={colors.accentSoft} />
              <Text
                style={{
                  color: colors.white,
                  fontFamily: fonts.display,
                  fontSize: 68,
                  letterSpacing: 6,
                  marginTop: 12,
                }}
              >
                PITCH
              </Text>
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 16,
                  marginTop: 8,
                }}
              >
                Book your cricket ground
              </Text>
            </View>

            {/* Card */}
            <View
              style={{
                backgroundColor: colors.surface,
                borderTopLeftRadius: 28,
                borderTopRightRadius: 28,
                padding: 28,
                paddingBottom: Math.max(insets.bottom + 12, 36),
              }}
            >
              <Text
                style={{
                  fontSize: 22,
                  fontWeight: "800",
                  color: colors.text,
                  marginBottom: 6,
                }}
              >
                Let's get started
              </Text>
              <Text
                style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 24 }}
              >
                Enter your mobile number to continue
              </Text>

              {/* Phone input */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  borderWidth: 1.5,
                  borderColor: error ? colors.danger : colors.border,
                  borderRadius: 14,
                  backgroundColor: colors.bg,
                  paddingHorizontal: 16,
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    paddingRight: 8,
                    borderRightWidth: 1,
                    borderRightColor: colors.border,
                    paddingVertical: 14,
                  }}
                >
                  <Text
                    style={{
                      color: colors.text,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    +92
                  </Text>
                </View>
                <TextInput
                  ref={inputRef}
                  value={phone}
                  onChangeText={(t) => {
                    setPhone(t);
                    setError(null);
                  }}
                  placeholder="3001234567"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="phone-pad"
                  maxLength={10}
                  returnKeyType="go"
                  onSubmitEditing={handleSendOtp}
                  accessibilityLabel="Phone number input"
                  style={{
                    flex: 1,
                    paddingLeft: 12,
                    fontSize: 16,
                    color: colors.text,
                    paddingVertical: 14,
                  }}
                />
              </View>

              {error ? (
                <Text
                  style={{ color: colors.danger, fontSize: 12, marginBottom: 12 }}
                >
                  {error}
                </Text>
              ) : null}

              <TouchableOpacity
                onPress={handleSendOtp}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel="Send OTP"
                style={{
                  backgroundColor: colors.accent,
                  borderRadius: 14,
                  paddingVertical: 16,
                  alignItems: "center",
                  marginTop: 8,
                  opacity: sending ? 0.6 : 1,
                }}
              >
                {sending ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text
                    style={{ color: colors.onAccent, fontWeight: "800", fontSize: 16 }}
                  >
                    Send OTP <Icon name="forward" size={15} />
                  </Text>
                )}
              </TouchableOpacity>

              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: 11,
                  textAlign: "center",
                  marginTop: 20,
                  lineHeight: 16,
                }}
              >
                By continuing, you agree to our{" "}
                <Text style={{ color: colors.brand, fontWeight: "600" }}>
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text style={{ color: colors.brand, fontWeight: "600" }}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
