import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useManagerStore } from "@/stores/managerStore";
import { GroundSlotManager } from "@/components/slot/GroundSlotManager";

export default function ManagerSlotsScreen() {
  const activeGround = useManagerStore((s) => s.activeGround);

  if (!activeGround) return null;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#F3F5F2" }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#0D1F15" }}>
          Manage Slots
        </Text>
        <Text style={{ color: "#5A7264", fontSize: 13, marginTop: 4 }}>
          {activeGround.name}
        </Text>
      </View>
      <GroundSlotManager groundId={activeGround.id} />
    </SafeAreaView>
  );
}
