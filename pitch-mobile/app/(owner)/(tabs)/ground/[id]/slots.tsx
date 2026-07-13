import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { getOwnerGrounds } from "@/data/ownerDemo";
import { useOwnerDemoStore } from "@/stores/ownerDemoStore";
import { GroundSlotManager } from "@/components/slot/GroundSlotManager";

export default function OwnerGroundSlotsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const demoVersion = useOwnerDemoStore((s) => s.demoVersion);

  const { data: grounds } = useQuery({
    queryKey: ["owner-grounds", demoVersion],
    queryFn: getOwnerGrounds,
  });
  const ground = grounds?.find((g) => g.id === id);

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
        <GroundSlotManager groundId={id} />
      ) : (
        <View style={{ padding: 24 }}>
          <Text style={{ color: "#5A7264" }}>Ground not found.</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
