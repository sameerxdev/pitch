import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerGround } from "@/hooks/useOwner";
import { GroundSlotManager } from "@/components/slot/GroundSlotManager";

export default function OwnerGroundSlotsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: ground } = useOwnerGround(id ?? "");

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: "#F3F5F2" }}>
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
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontWeight: "800", color: "#0D1F15", fontSize: 17 }}>
            Manage Slots
          </Text>
          {ground && (
            <Text style={{ color: "#5A7264", fontSize: 12 }} numberOfLines={1}>
              {ground.name}
            </Text>
          )}
        </View>
      </View>
      {id ? (
        <GroundSlotManager groundId={id} role="owner" />
      ) : (
        <View style={{ padding: 24 }}>
          <Text style={{ color: "#5A7264" }}>Ground not found.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
