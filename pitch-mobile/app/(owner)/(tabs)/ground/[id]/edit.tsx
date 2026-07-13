import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getOwnerGrounds,
  updateGround,
  getGroundManagers,
  assignManager,
  removeManager,
} from "@/data/ownerDemo";
import { useOwnerDemoStore } from "@/stores/ownerDemoStore";
import { maskPhone } from "@/utils/format";

export default function EditGroundScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const demoVersion = useOwnerDemoStore((s) => s.demoVersion);

  const { data: grounds, isLoading } = useQuery({
    queryKey: ["owner-grounds", demoVersion],
    queryFn: getOwnerGrounds,
  });
  const ground = grounds?.find((g) => g.id === id);

  const [dayRate, setDayRate] = useState("");
  const [nightRate, setNightRate] = useState("");
  const [advancePercent, setAdvancePercent] = useState(30);
  const [saving, setSaving] = useState(false);
  const [managerPhone, setManagerPhone] = useState("");
  const [assigningManager, setAssigningManager] = useState(false);

  const groundId = id ?? "";
  const { data: managers, refetch: refetchManagers } = useQuery({
    queryKey: ["ground-managers", groundId, demoVersion],
    queryFn: () => getGroundManagers(groundId),
    enabled: !!groundId,
  });

  useEffect(() => {
    if (!ground) return;
    setDayRate(String(ground.hourly_rate_day));
    setNightRate(String(ground.hourly_rate_night));
    setAdvancePercent(ground.advance_percent);
  }, [ground?.id, ground?.hourly_rate_day, ground?.hourly_rate_night, ground?.advance_percent]);

  async function handleSave() {
    if (!id) return;
    setSaving(true);
    try {
      await updateGround(id, {
        hourly_rate_day: Number(dayRate),
        hourly_rate_night: Number(nightRate),
        advance_percent: advancePercent,
      });
      queryClient.invalidateQueries({ queryKey: ["owner-grounds"] });
      Alert.alert("Saved!", "Ground details have been updated.");
      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignManager() {
    if (!groundId || !managerPhone.trim()) return;
    setAssigningManager(true);
    try {
      const phone = managerPhone.replace(/\s/g, "");
      await assignManager(groundId, {
        phone: phone.startsWith("+92") ? phone : `+92${phone}`,
      });
      setManagerPhone("");
      await refetchManagers();
      queryClient.invalidateQueries({ queryKey: ["owner-grounds"] });
      Alert.alert("Manager assigned", "They can manage bookings for this ground.");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not assign.");
    } finally {
      setAssigningManager(false);
    }
  }

  function handleRemoveManager(managerId: string, name: string) {
    Alert.alert("Remove manager", `Remove ${name} from this ground?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          await removeManager(groundId, managerId);
          await refetchManagers();
        },
      },
    ]);
  }

  async function handleToggleActive() {
    if (!ground) return;
    const newActive = ground.status !== "active";
    Alert.alert(
      newActive ? "Activate ground?" : "Deactivate ground?",
      newActive ? "Players will be able to book this ground." : "No new bookings will be accepted. Existing bookings remain.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await updateGround(id!, { is_active: newActive });
              queryClient.invalidateQueries({ queryKey: ["owner-grounds"] });
            } catch (err) {
              Alert.alert(
                "Error",
                err instanceof Error ? err.message : "Could not update.",
              );
            }
          },
        },
      ]
    );
  }

  if (isLoading || !ground) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#F3F5F2", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#1A5C38" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
      <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: "#1A5C38", fontWeight: "700", fontSize: 16 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, textAlign: "center", fontWeight: "800", color: "#0D1F15", fontSize: 17 }}>
          Edit Ground
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0D1F15", marginBottom: 4 }}>{ground.name}</Text>
        <Text style={{ color: "#5A7264", marginBottom: 24 }}>{ground.area}, {ground.city}</Text>

        {/* Rates */}
        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 16 }}>Rates</Text>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: "#5A7264", fontSize: 14, marginBottom: 6 }}>Day Rate (PKR/hr)</Text>
            <TextInput
              value={dayRate}
              onChangeText={setDayRate}
              keyboardType="numeric"
              style={{ borderWidth: 1.5, borderColor: "#E2EAE5", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: "#0D1F15", backgroundColor: "#F3F5F2" }}
            />
          </View>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ color: "#5A7264", fontSize: 14, marginBottom: 6 }}>Night Rate (PKR/hr)</Text>
            <TextInput
              value={nightRate}
              onChangeText={setNightRate}
              keyboardType="numeric"
              style={{ borderWidth: 1.5, borderColor: "#E2EAE5", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, color: "#0D1F15", backgroundColor: "#F3F5F2" }}
            />
          </View>
          <View>
            <Text style={{ color: "#5A7264", fontSize: 14, marginBottom: 8 }}>Advance: {advancePercent}%</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[10, 20, 30, 40, 50].map((p) => (
                <TouchableOpacity key={p} onPress={() => setAdvancePercent(p)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 20, backgroundColor: advancePercent === p ? "#1A5C38" : "#E2EAE5", alignItems: "center" }}>
                  <Text style={{ color: advancePercent === p ? "#FFFFFF" : "#5A7264", fontWeight: "700", fontSize: 12 }}>{p}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={{ backgroundColor: "#FFFFFF", borderRadius: 20, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontWeight: "700", color: "#0D1F15", marginBottom: 8 }}>
            Managers
          </Text>
          <Text style={{ color: "#5A7264", fontSize: 13, marginBottom: 16, lineHeight: 18 }}>
            Assign a manager by mobile number. They run check-ins and daily operations
            for this ground in the manager app.
          </Text>

          {managers?.length === 0 ? (
            <Text style={{ color: "#A0B4A8", fontSize: 13, marginBottom: 12 }}>
              No managers assigned yet.
            </Text>
          ) : (
            managers?.map((m) => (
              <View
                key={m.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 10,
                  borderTopWidth: 1,
                  borderTopColor: "#F3F5F2",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "600", color: "#0D1F15" }}>
                    {m.manager_name}
                  </Text>
                  <Text style={{ color: "#5A7264", fontSize: 12 }}>
                    {maskPhone(m.manager_phone)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveManager(m.manager_id, m.manager_name)}
                  style={{
                    backgroundColor: "#FDECEA",
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text style={{ color: "#E34C3C", fontWeight: "600", fontSize: 12 }}>
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
              borderColor: "#E2EAE5",
              borderRadius: 12,
              paddingHorizontal: 12,
              marginTop: 12,
              backgroundColor: "#F3F5F2",
            }}
          >
            <Text style={{ color: "#5A7264", marginRight: 8, fontWeight: "600" }}>
              +92
            </Text>
            <TextInput
              value={managerPhone}
              onChangeText={setManagerPhone}
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
          <TouchableOpacity
            onPress={handleAssignManager}
            disabled={assigningManager || !managerPhone.trim()}
            style={{
              backgroundColor: "#1A5C38",
              borderRadius: 12,
              paddingVertical: 14,
              alignItems: "center",
              marginTop: 12,
              opacity: !managerPhone.trim() ? 0.5 : 1,
            }}
          >
            {assigningManager ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Assign manager</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle active */}
        <TouchableOpacity
          onPress={handleToggleActive}
          style={{ backgroundColor: ground.status === "active" ? "#FDECEA" : "#E8F3EE", borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 24 }}
        >
          <Text style={{ color: ground.status === "active" ? "#E34C3C" : "#1A5C38", fontWeight: "700" }}>
            {ground.status === "active" ? "Deactivate Ground" : "Activate Ground"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

        <View style={{ padding: 16, backgroundColor: "#FFFFFF", borderTopWidth: 1, borderTopColor: "#E2EAE5" }}>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={{ backgroundColor: "#1A5C38", borderRadius: 14, paddingVertical: 16, alignItems: "center", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
