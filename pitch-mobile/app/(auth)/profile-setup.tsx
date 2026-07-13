import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <ScrollView contentContainerStyle={{ padding: 24, flexGrow: 1 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: "#0D1F15",
            marginBottom: 8,
          }}
        >
          Complete your profile
        </Text>
        <Text style={{ color: "#5A7264", fontSize: 14, marginBottom: 36 }}>
          Just a couple of details to get you started.
        </Text>

        {/* Full Name */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              color: "#0D1F15",
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
            placeholderTextColor="#A0B4A8"
            returnKeyType="next"
            accessibilityLabel="Full name input"
            style={{
              borderWidth: 1.5,
              borderColor: errors.name ? "#E34C3C" : "#E2EAE5",
              borderRadius: 12,
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 16,
              paddingVertical: 14,
              fontSize: 16,
              color: "#0D1F15",
            }}
          />
          {errors.name ? (
            <Text style={{ color: "#E34C3C", fontSize: 12, marginTop: 4 }}>
              {errors.name}
            </Text>
          ) : null}
        </View>

        {/* City */}
        <View style={{ marginBottom: 32 }}>
          <Text
            style={{
              color: "#0D1F15",
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
              borderColor: errors.city ? "#E34C3C" : "#E2EAE5",
              borderRadius: 12,
              backgroundColor: "#FFFFFF",
              paddingHorizontal: 16,
              paddingVertical: 14,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 16, color: city ? "#0D1F15" : "#A0B4A8" }}>
              {city || "Select your city"}
            </Text>
            <Text style={{ color: "#5A7264" }}>▼</Text>
          </TouchableOpacity>
          {errors.city ? (
            <Text style={{ color: "#E34C3C", fontSize: 12, marginTop: 4 }}>
              {errors.city}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: "#1A5C38",
            borderRadius: 14,
            paddingVertical: 16,
            alignItems: "center",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
              Let's go! →
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
              backgroundColor: "#FFFFFF",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "70%",
            }}
          >
            <View
              style={{
                padding: 20,
                borderBottomWidth: 1,
                borderBottomColor: "#E2EAE5",
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: "#0D1F15" }}
              >
                Select City
              </Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <Text style={{ color: "#5A7264", fontSize: 16 }}>Done</Text>
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
                    borderBottomColor: "#F3F5F2",
                    backgroundColor: city === item ? "#E8F3EE" : "#FFFFFF",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      color: "#0D1F15",
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
