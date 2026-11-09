import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useAssignManager,
  useGroundManagers,
  useOwnerGround,
  useRemoveManager,
  useUpdateGround,
} from "@/hooks/useOwner";
import { getApiErrorMessage } from "@/api/client";
import { maskPhone } from "@/utils/format";
import { toE164Pk } from "@/utils/validators";
import type { ManagerAssignment } from "@/api/types";
import { GroundStatusBadge } from "@/components/ui/Badge";
import { Text, TextInput } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function EditGroundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const groundId = id ?? "";

  const { data: ground, isLoading } = useOwnerGround(groundId);
  const { data: managers } = useGroundManagers(groundId);
  const updateGroundMutation = useUpdateGround(groundId);
  const assignManagerMutation = useAssignManager(groundId);
  const removeManagerMutation = useRemoveManager(groundId);

  const [dayRate, setDayRate] = useState("");
  const [nightRate, setNightRate] = useState("");
  const [advancePercent, setAdvancePercent] = useState(30);
  const [managerPhone, setManagerPhone] = useState("");

  const saving = updateGroundMutation.isPending;
  const assigningManager = assignManagerMutation.isPending;
  // The API returns removed assignments too, so they stay auditable server-side.
  const activeManagers = (managers ?? []).filter((m) => m.is_active);
  const canToggleActive =
    ground?.status === "active" || ground?.status === "inactive";

  useEffect(() => {
    if (!ground) return;
    setDayRate(String(ground.hourly_rate_day));
    setNightRate(String(ground.hourly_rate_night));
    setAdvancePercent(ground.advance_percent);
  }, [ground?.id, ground?.hourly_rate_day, ground?.hourly_rate_night, ground?.advance_percent]);

  async function handleSave() {
    if (!groundId) return;
    const day = Number(dayRate);
    const night = Number(nightRate);
    if (!Number.isFinite(day) || day < 100 || !Number.isFinite(night) || night < 100) {
      Alert.alert("Invalid rates", "Day and night rates must be at least PKR 100.");
      return;
    }
    try {
      await updateGroundMutation.mutateAsync({
        hourly_rate_day: day,
        hourly_rate_night: night,
        advance_percent: advancePercent,
      });
      Alert.alert("Saved!", "Ground details have been updated.");
      router.back();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }

  async function handleAssignManager() {
    const phone = toE164Pk(managerPhone);
    if (!phone) {
      Alert.alert("Invalid number", "Enter a 10-digit mobile number, e.g. 3001234567.");
      return;
    }
    try {
      await assignManagerMutation.mutateAsync({ phone });
      setManagerPhone("");
      Alert.alert(
        "Manager assigned",
        "They can manage bookings for this ground once they sign in with this number.",
      );
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }

  function handleRemoveManager(assignment: ManagerAssignment) {
    const label = assignment.manager_name ?? maskPhone(assignment.manager_phone);
    Alert.alert("Remove manager", `Remove ${label} from this ground?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            // Invites that haven't been claimed yet have no user id — the
            // assignment's own id is the only handle we have.
            await removeManagerMutation.mutateAsync(
              assignment.manager_id ?? assignment.id,
            );
          } catch (err) {
            Alert.alert("Error", getApiErrorMessage(err));
          }
        },
      },
    ]);
  }

  async function handleToggleActive() {
    if (!ground) return;
    if (ground.status === "pending_verification") {
      Alert.alert(
        "Awaiting verification",
        "This ground is still being reviewed by the PITCH team. You can activate it once it's approved.",
      );
      return;
    }
    if (ground.status === "suspended") {
      Alert.alert(
        "Ground suspended",
        "This ground was suspended by an administrator. Contact support to restore it.",
      );
      return;
    }
    const newActive = ground.status !== "active";
    Alert.alert(
      newActive ? "Activate ground?" : "Deactivate ground?",
      newActive
        ? "Players will be able to book this ground."
        : "No new bookings will be accepted. Existing bookings remain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateGroundMutation.mutateAsync({ is_active: newActive });
            } catch (err) {
              Alert.alert("Error", getApiErrorMessage(err));
            }
          },
        },
      ],
    );
  }

  if (isLoading || !ground) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 16 }}><Icon name="back" size={20} /></Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontWeight: "800", color: colors.text, fontSize: 17 }}>
          Edit Ground
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: 4 }}>{ground.name}</Text>
        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>{ground.area}, {ground.city}</Text>
        <View style={{ marginBottom: 20 }}>
          <GroundStatusBadge status={ground.status} />
          {ground.status === "pending_verification" && (
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, lineHeight: 17 }}>
              The PITCH team is reviewing this ground. It becomes bookable once approved.
            </Text>
          )}
          {ground.status === "suspended" && (
            <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6, lineHeight: 17 }}>
              Suspended by an administrator. Contact support to restore it.
            </Text>
          )}
        </View>

        {/* Rates */}
        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontWeight: "700", color: colors.text, marginBottom: 16 }}>Rates</Text>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 6 }}>Day Rate (PKR/hr)</Text>
            <TextInput
              value={dayRate}
              onChangeText={setDayRate}
              keyboardType="numeric"
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.text, backgroundColor: colors.bg }}
            />
          </View>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 6 }}>Night Rate (PKR/hr)</Text>
            <TextInput
              value={nightRate}
              onChangeText={setNightRate}
              keyboardType="numeric"
              style={{ borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: colors.text, backgroundColor: colors.bg }}
            />
          </View>
          <View>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginBottom: 8 }}>Advance: {advancePercent}%</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[10, 20, 30, 40, 50].map((p) => (
                <TouchableOpacity key={p} onPress={() => setAdvancePercent(p)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: advancePercent === p ? colors.primary : colors.surfaceRaised, alignItems: "center" }}>
                  <Text style={{ color: advancePercent === p ? colors.white : colors.textSecondary, fontWeight: "700", fontSize: 12 }}>{p}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontWeight: "700", color: colors.text, marginBottom: 8 }}>
            Managers
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
            Assign a manager by mobile number. They run check-ins and daily operations
            for this ground in the manager app.
          </Text>

          {activeManagers.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: 13, marginBottom: 12 }}>
              No managers assigned yet.
            </Text>
          ) : (
            activeManagers.map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: colors.text }}>
                    {m.manager_name ?? "Invite sent"}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    {maskPhone(m.manager_phone)}
                    {m.is_pending_signup ? " · awaiting first sign-in" : ""}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveManager(m)}
                  style={{
                    backgroundColor: colors.dangerSoft,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: colors.danger, fontWeight: "600", fontSize: 12 }}>
                    Remove
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              borderWidth: 1.5,
              borderColor: colors.border,
              borderRadius: 12,
              paddingHorizontal: 12,
              marginTop: 12,
              backgroundColor: colors.bg,
            }}
          >
            <Text style={{ color: colors.textSecondary, marginRight: 8, fontWeight: "600" }}>
              +92
            </Text>
            <TextInput
              value={managerPhone}
              onChangeText={setManagerPhone}
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
          <TouchableOpacity
            onPress={handleAssignManager}
            disabled={assigningManager || !managerPhone.trim()}
            style={{
              backgroundColor: colors.accent,
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 12,
              opacity: !managerPhone.trim() ? 0.5 : 1,
            }}
          >
            {assigningManager ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={{ color: colors.onAccent, fontWeight: "700" }}>Assign manager</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle active — only meaningful once the ground is out of review. */}
        <TouchableOpacity
          onPress={handleToggleActive}
          disabled={canToggleActive && updateGroundMutation.isPending}
          style={{
            backgroundColor: ground.status === "active" ? colors.dangerSoft : colors.brandSoft,
            borderRadius: 14,
            paddingVertical: 14,
            alignItems: "center",
            marginBottom: 24,
            opacity: canToggleActive ? 1 : 0.5,
          }}
        >
          <Text style={{ color: ground.status === "active" ? colors.danger : colors.brand, fontWeight: "700" }}>
            {ground.status === "active" ? "Deactivate Ground" : "Activate Ground"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

        <View style={{ padding: 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{ backgroundColor: colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: "center", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={{ color: colors.onAccent, fontWeight: "800", fontSize: 16 }}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
