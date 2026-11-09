import React from "react";
import { View, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOwnerGround } from "@/hooks/useOwner";
import { GroundSlotManager } from "@/components/slot/GroundSlotManager";
import { Text } from "@/components/ui/Typography";
import { Icon } from "@/components/ui/Icon";
import { colors } from "@/constants/colors";

export default function OwnerGroundSlotsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: ground } = useOwnerGround(id ?? "");

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingVertical: 16,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: colors.brand, fontWeight: "700", fontSize: 16 }}>
            <Icon name="back" size={20} />
          </Text>
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={{ fontWeight: "800", color: colors.text, fontSize: 17 }}>
            Manage Slots
          </Text>
          {ground && (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
              {ground.name}
            </Text>
          )}
        </View>
      </View>
      {id ? (
        <GroundSlotManager groundId={id} role="owner" />
      ) : (
        <View style={{ padding: 24 }}>
          <Text style={{ color: colors.textSecondary }}>Ground not found.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
