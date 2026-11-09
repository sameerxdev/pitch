import React, { useCallback, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { useCreateGround } from "@/hooks/useOwner";
// The new ground's id only exists after creation, so the optional manager
// invite calls the API directly rather than through a ground-bound hook.
import { assignManager } from "@/api/owner";
import { getApiErrorMessage } from "@/api/client";
import { toE164Pk } from "@/utils/validators";
import { PAKISTAN_CITIES } from "@/constants/routes";
import { Config } from "@/constants/config";
import { GROUND_FACILITIES, isKnownFacilityLabel } from "@/constants/facilities";
import { GroundLocationPicker } from "@/components/owner/GroundLocationPicker";
import type { MapCoordinate } from "@/constants/cityCoordinates";
import { Text, TextInput } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

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
  const createGroundMutation = useCreateGround();

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
    // The address field is optional in the form but required by the API, so
    // fall back to the area/city the owner already gave us.
    const resolvedAddress = address.trim() || `${area.trim()}, ${city}`;
    const invitePhone = managerPhone.trim() ? toE164Pk(managerPhone) : null;
    if (managerPhone.trim() && !invitePhone) {
      Alert.alert(
        "Invalid manager number",
        "Enter a 10-digit mobile number, e.g. 3001234567 — or leave it blank.",
      );
      return;
    }

    setSubmitting(true);
    try {
      const ground = await createGroundMutation.mutateAsync({
        payload: {
          name: name.trim(),
          city,
          area: area.trim(),
          address: resolvedAddress,
          latitude: location.latitude,
          longitude: location.longitude,
          hourly_rate_day: Number(dayRate),
          hourly_rate_night: Number(nightRate),
          advance_percent: advancePercent,
          facilities: facilities.filter(isKnownFacilityLabel),
        },
        photoUris: photos,
      });

      // A failed invite must not read as a failed ground creation.
      let inviteWarning = "";
      if (invitePhone) {
        try {
          await assignManager(ground.id, { phone: invitePhone });
        } catch (err) {
          inviteWarning = `\n\nThe ground was created, but the manager invite failed: ${getApiErrorMessage(err)}`;
        }
      }

      resetForm();
      Alert.alert(
        "Ground submitted!",
        "Your ground is pending verification by the PITCH team. You'll be notified once it's approved." +
          inviteWarning,
        [
          {
            text: "OK",
            onPress: () => router.replace("/(owner)/(tabs)/grounds" as never),
          },
        ],
      );
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
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
            <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 16 }}>
              <Icon name="back" size={20} />
            </Text>
          </TouchableOpacity>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontWeight: "800",
              color: colors.text,
              fontSize: 17,
            }}
          >
            Add Ground
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 13 }}>{step}/5</Text>
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
                  backgroundColor: idx + 1 <= step ? colors.primary : colors.surfaceRaised,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: idx + 1 <= step ? colors.white : colors.textMuted,
                    fontWeight: "700",
                    fontSize: 11,
                  }}
                >
                  {idx + 1}
                </Text>
              </View>
              <Text
                style={{
                  color: idx + 1 === step ? colors.brand : colors.textMuted,
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
                  placeholderTextColor={colors.textMuted}
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
                        borderColor: city === c ? colors.brand : colors.border,
                        backgroundColor: city === c ? colors.brandSoft : colors.surface,
                      }}
                    >
                      <Text
                        style={{
                          color: city === c ? colors.brand : colors.textSecondary,
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
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle(!!errors.area)}
                />
              </FormField>

              <FormField label="Full Address">
                <TextInput
                  value={address}
                  onChangeText={(v) => patch({ address: v })}
                  placeholder="Street address"
                  placeholderTextColor={colors.textMuted}
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
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle(!!errors.dayRate)}
                />
              </FormField>
              <FormField label="Night Rate (PKR/hr) *" error={errors.nightRate}>
                <TextInput
                  value={nightRate}
                  onChangeText={(v) => patch({ nightRate: v })}
                  placeholder="e.g. 3000"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textMuted}
                  style={inputStyle(!!errors.nightRate)}
                />
              </FormField>
              <View>
                <Text style={labelStyle}>
                  Advance Percentage: {advancePercent}%
                </Text>
                <Text
                  style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}
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
                          advancePercent === p ? colors.primary : colors.surface,
                        borderWidth: 1.5,
                        borderColor:
                          advancePercent === p ? colors.brand : colors.border,
                      }}
                    >
                      <Text
                        style={{
                          color: advancePercent === p ? colors.white : colors.textSecondary,
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
                        ? colors.brand
                        : colors.border,
                      backgroundColor: facilities.includes(label)
                        ? colors.brandSoft
                        : colors.surface,
                    }}
                  >
                    <Icon name={icon} size={16} color={colors.brand} />
                    <Text
                      style={{
                        color: facilities.includes(label)
                          ? colors.brand
                          : colors.textSecondary,
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
                  style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 16 }}
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
                          backgroundColor: colors.dangerFill,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text style={{ color: colors.white, fontSize: 12 }}><Icon name="close" size={15} /></Text>
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
                        borderColor: colors.brandBorder,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: colors.brand, fontSize: 28 }}>+</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View
                style={{
                  backgroundColor: colors.surface,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <Text style={labelStyle}>Assign manager (optional)</Text>
                <Text
                  style={{
                    color: colors.textSecondary,
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
                    borderColor: colors.border,
                    borderRadius: 12,
                    paddingHorizontal: 12,
                    backgroundColor: colors.bg,
                  }}
                >
                  <Text
                    style={{ color: colors.textSecondary, marginRight: 8, fontWeight: "600" }}
                  >
                    +92
                  </Text>
                  <TextInput
                    value={managerPhone}
                    onChangeText={(v) => patch({ managerPhone: v })}
                    placeholder="3001234567"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      fontSize: 16,
                      color: colors.text,
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
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <TouchableOpacity
            onPress={step < 5 ? handleNext : handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={{ color: colors.onAccent, fontWeight: "800", fontSize: 16 }}>
                {step < 5 ? "Next" : "Submit for Review"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const labelStyle = {
  color: colors.text,
  fontWeight: "600" as const,
  fontSize: 14,
  marginBottom: 8,
};
const errorStyle = { color: colors.danger, fontSize: 12, marginTop: 4 };
const inputStyle = (hasError: boolean) => ({
  borderWidth: 1.5,
  borderColor: hasError ? colors.danger : colors.border,
  borderRadius: 12,
  backgroundColor: colors.surface,
  paddingHorizontal: 16,
  paddingVertical: 14,
  fontSize: 16,
  color: colors.text,
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
