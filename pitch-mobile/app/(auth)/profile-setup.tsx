import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { updateMe } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { getApiErrorMessage } from "@/api/client";
import { PAKISTAN_CITIES } from "@/constants/routes";
import { Text, TextInput } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function ProfileSetupScreen() {
  const { updateUser } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; city?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const errs: typeof errors = {};
    if (fullName.trim().length < 2)
      errs.name = "Name must be at least 2 characters";
    if (!city) errs.city = "Please select your city";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const updated = await updateMe({ full_name: fullName.trim(), city });
      updateUser(updated);
      // root layout will redirect based on role
    } catch (err) {
      setErrors({ name: getApiErrorMessage(err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: colors.text,
            marginBottom: 8,
          }}
        >
          Complete your profile
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 36 }}>
          Just a couple of details to get you started.
        </Text>

        {/* Full Name */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: "600",
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            Full Name *
          </Text>
          <TextInput
            value={fullName}
            onChangeText={(t) => {
              setFullName(t);
              setErrors((e) => ({ ...e, name: undefined }));
            }}
            placeholder="e.g. Ahmed Raza"
            placeholderTextColor={colors.textMuted}
            returnKeyType="next"
            accessibilityLabel="Full name input"
            style={{
              borderWidth: 1.5,
              borderColor: errors.name ? colors.danger : colors.border,
              borderRadius: 12,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: colors.text,
            }}
          />
          {errors.name ? (
            <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
              {errors.name}
            </Text>
          ) : null}
        </View>

        {/* City */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              color: colors.text,
              fontWeight: "600",
              fontSize: 14,
              marginBottom: 6,
            }}
          >
            City *
          </Text>
          <TouchableOpacity
            onPress={() => setShowCityPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Select city"
            style={{
              borderWidth: 1.5,
              borderColor: errors.city ? colors.danger : colors.border,
              borderRadius: 12,
              backgroundColor: colors.surface,
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 16, color: city ? colors.text : colors.textMuted }}>
              {city || "Select your city"}
            </Text>
            <Text style={{ color: colors.textSecondary }}>▼</Text>
          </TouchableOpacity>
          {errors.city ? (
            <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4 }}>
              {errors.city}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: colors.accent,
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={{ color: colors.onAccent, fontWeight: "800", fontSize: 16 }}>
              Let's go! <Icon name="forward" size={15} />
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* City Picker Modal */}
      <Modal visible={showCityPicker} animationType="slide" transparent>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "70%",
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: colors.text }}
              >
                Select City
              </Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <Text style={{ color: colors.textSecondary, fontSize: 16 }}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={PAKISTAN_CITIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setCity(item);
                    setShowCityPicker(false);
                    setErrors((e) => ({ ...e, city: undefined }));
                  }}
                  style={{
                    paddingHorizontal: 20,
                    paddingVertical: 16,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                    backgroundColor: city === item ? colors.brandSoft : colors.surface,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: colors.text,
                      fontWeight: city === item ? "700" : "400",
                    }}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
