import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { createGroundWithPhotos } from "@/data/ownerDemo";
import { PAKISTAN_CITIES } from "@/constants/routes";
import { Config } from "@/constants/config";
import { GROUND_FACILITIES, isKnownFacilityLabel } from "@/constants/facilities";
import { GroundLocationPicker } from "@/components/owner/GroundLocationPicker";
import type { MapCoordinate } from "@/constants/cityCoordinates";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS = ["Info", "Location", "Rates", "Facilities", "Finish"];

const INITIAL_FORM = {
  step: 1 as Step,
  name: "",
  city: "",
  area: "",
  address: "",
  location: null as MapCoordinate | null,
  dayRate: "",
  nightRate: "",
  advancePercent: 30,
  facilities: [] as string[],
  photos: [] as string[],
  managerPhone: "",
  errors: {} as Record<string, string>,
};

export default function CreateGroundScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  const {
    step,
    name,
    city,
    area,
    address,
    location,
    dayRate,
    nightRate,
    advancePercent,
    facilities,
    photos,
    managerPhone,
    errors,
  } = form;

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setSubmitting(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        resetForm();
      };
    }, [resetForm]),
  );

  function patch(partial: Partial<typeof INITIAL_FORM>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function validateStep(): boolean {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (name.trim().length < 3)
        errs.name = "Name must be at least 3 characters";
      if (!city) errs.city = "Select a city";
      if (!area.trim()) errs.area = "Area is required";
    } else if (step === 2) {
      if (!location) errs.location = "Tap the map to set your ground location";
    } else if (step === 3) {
      if (!dayRate || isNaN(Number(dayRate)) || Number(dayRate) < 100)
        errs.dayRate = "Day rate must be at least PKR 100";
      if (!nightRate || isNaN(Number(nightRate)) || Number(nightRate) < 100)
        errs.nightRate = "Night rate must be at least PKR 100";
    }
    patch({ errors: errs });
    return Object.keys(errs).length === 0;
  }

  function handleNext() {
    if (!validateStep()) return;
    patch({ step: (step < 5 ? step + 1 : step) as Step, errors: {} });
  }

  function handleBack() {
    if (step === 1) {
      router.back();
    } else {
      patch({ step: (step - 1) as Step, errors: {} });
    }
  }

  function toggleFacility(f: string) {
    patch({
      facilities: facilities.includes(f)
        ? facilities.filter((x) => x !== f)
        : [...facilities, f],
    });
  }

  async function handlePickPhoto() {
    if (photos.length >= Config.MAX_GROUND_PHOTOS) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [16, 9],
    });
    if (!result.canceled && result.assets[0]) {
      patch({ photos: [...photos, result.assets[0].uri] });
    }
  }

  async function handleSubmit() {
    if (!location) {
      patch({ errors: { location: "Set location on step 2" }, step: 2 });
      return;
    }
    setSubmitting(true);
    try {
      await createGroundWithPhotos(
        {
          name: name.trim(),
          city,
          area: area.trim(),
          address: address.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
          hourly_rate_day: Number(dayRate),
          hourly_rate_night: Number(nightRate),
          advance_percent: advancePercent,
          facilities: facilities.filter(isKnownFacilityLabel),
        },
        photos,
        managerPhone.trim() || undefined,
      );
      queryClient.invalidateQueries({ queryKey: ["owner-grounds"] });
      resetForm();
      Alert.alert(
        "Ground submitted!",
        "Your ground is pending verification by the PITCH team. You'll be notified once it's approved.",
        [
          {
            text: "OK",
            onPress: () =>
              router.replace("/(owner)/(tabs)/grounds" as never),
          },
        ],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err instanceof Error ? err.message : "Could not save ground.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <View style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity onPress={handleBack}>
            <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 16 }}>
              ←
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontWeight: "800",
              color: "#0D1F15",
              fontSize: 17,
            }}
          >
            Add Ground
          </Text>
          <Text style={{ color: "#A0B4A8", fontSize: 13 }}>{step}/5</Text>
        </View>

        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 12,
            marginBottom: 16,
          }}
        >
          {STEP_LABELS.map((label, idx) => (
            <View key={idx} style={{ flex: 1, alignItems: "center" }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  backgroundColor: idx + 1 <= step ? "#1A5C38" : "#E2EAE5",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: idx + 1 <= step ? "#fff" : "#A0B4A8",
                    fontWeight: "700",
                    fontSize: 11,
                  }}
                >
                  {idx + 1}
                </Text>
              </View>
              <Text
                style={{
                  color: idx + 1 === step ? "#1A5C38" : "#A0B4A8",
                  fontSize: 9,
                  marginTop: 4,
                  textAlign: "center",
                }}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 16 }}
        >
          {step === 1 && (
            <View style={{ gap: 16 }}>
              <FormField label="Ground Name *" error={errors.name}>
                <TextInput
                  value={name}
                  onChangeText={(v) => patch({ name: v })}
                  placeholder="e.g. Star Cricket Ground"
                  placeholderTextColor="#A0B4A8"
                  style={inputStyle(!!errors.name)}
                />
              </FormField>

              <FormField label="City *" error={errors.city}>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {PAKISTAN_CITIES.slice(0, 10).map((c) => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => patch({ city: c, location: null })}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 20,
                        borderWidth: 1.5,
                        borderColor: city === c ? "#1A5C38" : "#E2EAE5",
                        backgroundColor: city === c ? "#E8F3EE" : "#FFFFFF",
                      }}
                    >
                      <Text
                        style={{
                          color: city === c ? "#1A5C38" : "#5A7264",
                          fontWeight: "600",
                          fontSize: 12,
                        }}
                      >
                        {c}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </FormField>

              <FormField label="Area / Neighbourhood *" error={errors.area}>
                <TextInput
                  value={area}
                  onChangeText={(v) => patch({ area: v })}
                  placeholder="e.g. DHA Phase 5"
                  placeholderTextColor="#A0B4A8"
                  style={inputStyle(!!errors.area)}
                />
              </FormField>

              <FormField label="Full Address">
                <TextInput
                  value={address}
                  onChangeText={(v) => patch({ address: v })}
                  placeholder="Street address"
                  placeholderTextColor="#A0B4A8"
                  multiline
                  style={[inputStyle(false), { minHeight: 70 }]}
                />
              </FormField>
            </View>
          )}

          {step === 2 && (
            <View>
              <Text style={labelStyle}>Ground location *</Text>
              <GroundLocationPicker
                city={city}
                value={location}
                onChange={(coord) => patch({ location: coord })}
              />
              {errors.location ? (
                <Text style={errorStyle}>{errors.location}</Text>
              ) : null}
            </View>
          )}

          {step === 3 && (
            <View style={{ gap: 16 }}>
              <FormField label="Day Rate (PKR/hr) *" error={errors.dayRate}>
                <TextInput
                  value={dayRate}
                  onChangeText={(v) => patch({ dayRate: v })}
                  placeholder="e.g. 2000"
                  keyboardType="numeric"
                  placeholderTextColor="#A0B4A8"
                  style={inputStyle(!!errors.dayRate)}
                />
              </FormField>
              <FormField label="Night Rate (PKR/hr) *" error={errors.nightRate}>
                <TextInput
                  value={nightRate}
                  onChangeText={(v) => patch({ nightRate: v })}
                  placeholder="e.g. 3000"
                  keyboardType="numeric"
                  placeholderTextColor="#A0B4A8"
                  style={inputStyle(!!errors.nightRate)}
                />
              </FormField>
              <View>
                <Text style={labelStyle}>
                  Advance Percentage: {advancePercent}%
                </Text>
                <Text
                  style={{ color: "#5A7264", fontSize: 12, marginBottom: 12 }}
                >
                  Players must pay this % upfront to confirm booking (10–50%).
                </Text>
                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  {[10, 20, 30, 40, 50].map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => patch({ advancePercent: p })}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor:
                          advancePercent === p ? "#1A5C38" : "#FFFFFF",
                        borderWidth: 1.5,
                        borderColor:
                          advancePercent === p ? "#1A5C38" : "#E2EAE5",
                      }}
                    >
                      <Text
                        style={{
                          color: advancePercent === p ? "#FFFFFF" : "#5A7264",
                          fontWeight: "700",
                        }}
                      >
                        {p}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {step === 4 && (
            <View>
              <Text style={labelStyle}>Facilities (optional)</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                {GROUND_FACILITIES.map(({ label, icon }) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => toggleFacility(label)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      borderWidth: 1.5,
                      borderColor: facilities.includes(label)
                        ? "#1A5C38"
                        : "#E2EAE5",
                      backgroundColor: facilities.includes(label)
                        ? "#E8F3EE"
                        : "#FFFFFF",
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{icon}</Text>
                    <Text
                      style={{
                        color: facilities.includes(label)
                          ? "#1A5C38"
                          : "#5A7264",
                        fontWeight: "600",
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {step === 5 && (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={labelStyle}>
                  Ground Photos ({photos.length}/{Config.MAX_GROUND_PHOTOS})
                </Text>
                <Text
                  style={{ color: "#5A7264", fontSize: 12, marginBottom: 16 }}
                >
                  Add up to 8 photos of your ground.
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
                  {photos.map((uri, idx) => (
                    <View key={idx} style={{ position: "relative" }}>
                      <Image
                        source={{ uri }}
                        style={{ width: 100, height: 75, borderRadius: 10 }}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          patch({
                            photos: photos.filter((_, i) => i !== idx),
                          })
                        }
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 22,
                          height: 22,
                          borderRadius: 11,
                          backgroundColor: "#E34C3C",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: "#fff", fontSize: 12 }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                  {photos.length < Config.MAX_GROUND_PHOTOS && (
                    <TouchableOpacity
                      onPress={handlePickPhoto}
                      style={{
                        width: 100,
                        height: 75,
                        borderRadius: 10,
                        borderWidth: 2,
                        borderStyle: "dashed",
                        borderColor: "#C5DFD1",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#1A5C38", fontSize: 28 }}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <Text style={labelStyle}>Assign manager (optional)</Text>
                <Text
                  style={{
                    color: "#5A7264",
                    fontSize: 12,
                    marginBottom: 12,
                    lineHeight: 18,
                  }}
                >
                  They can manage bookings and check-ins for this ground in the
                  manager app.
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1.5,
                    borderColor: "#E2EAE5",
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: "#F3F5F2",
                  }}
                >
                  <Text
                    style={{ color: "#5A7264", marginRight: 8, fontWeight: "600" }}
                  >
                    +92
                  </Text>
                  <TextInput
                    value={managerPhone}
                    onChangeText={(v) => patch({ managerPhone: v })}
                    placeholder="3001234567"
                    placeholderTextColor="#A0B4A8"
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: "#0D1F15",
                    }}
                  />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={{
            padding: 16,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: "#E2EAE5",
          }}
        >
          <TouchableOpacity
            onPress={step < 5 ? handleNext : handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: "#1A5C38",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>
                {step < 5 ? "Next →" : "Submit for Review ✓"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const labelStyle = {
  color: "#0D1F15",
  fontWeight: "600" as const,
  fontSize: 14,
  marginBottom: 8,
};
const errorStyle = { color: "#E34C3C", fontSize: 12, marginTop: 4 };
const inputStyle = (hasError: boolean) => ({
  borderWidth: 1.5,
  borderColor: hasError ? "#E34C3C" : "#E2EAE5",
  borderRadius: 12,
  backgroundColor: "#FFFFFF",
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: "#0D1F15" as const,
});

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text style={labelStyle}>{label}</Text>
      {children}
      {error ? <Text style={errorStyle}>{error}</Text> : null}
    </View>
  );
}
