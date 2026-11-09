import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useManagerStore } from "@/stores/managerStore";
import { GroundSlotManager } from "@/components/slot/GroundSlotManager";
import { Text } from "@/components/ui/Typography";
import { colors } from "@/constants/colors";

export default function ManagerSlotsScreen() {
  const activeGround = useManagerStore((s) => s.activeGround);

  if (!activeGround) return null;

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: colors.text }}>
          Manage Slots
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
          {activeGround.name}
        </Text>
      </View>
      <GroundSlotManager groundId={activeGround.id} />
    </SafeAreaView>
  );
}
