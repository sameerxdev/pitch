import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GroundCard } from "@/components/ground/GroundCard";
import { useAuthStore } from "@/stores/authStore";
import { useGrounds } from "@/hooks/useGrounds";
import { getFirstName } from "@/utils/format";

export default function BrowseScreen() {
  const user = useAuthStore((s) => s.user);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGrounds({
    search: search.trim() || undefined,
  });

  const grounds = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const filtered = grounds.filter(
    (g) =>
      !search ||
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.area.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ flex: 1, backgroundColor: "#F3F5F2" }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 }}>
        <Text style={{ color: "#5A7264", fontSize: 13 }}>Good day,</Text>
        <Text style={{ color: "#0D1F15", fontSize: 22, fontWeight: "800" }}>
          {getFirstName(user?.full_name ?? null)} 👋
        </Text>

        {/* Search bar */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "#FFFFFF",
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: "#E2EAE5",
            paddingHorizontal: 12,
            marginTop: 16,
          }}
        >
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search grounds, areas..."
            placeholderTextColor="#A0B4A8"
            returnKeyType="search"
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 15,
              color: "#0D1F15",
            }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={{ color: "#A0B4A8", fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Ground list */}
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        {isLoading && filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 48 }}>
            <ActivityIndicator size="large" color="#1A5C38" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 48 }}>
            <Text style={{ fontSize: 36 }}>🏟️</Text>
            <Text
              style={{
                color: "#5A7264",
                textAlign: "center",
                marginTop: 12,
                fontSize: 14,
              }}
            >
              No grounds found.{"\n"}Try adjusting your filters.
            </Text>
          </View>
        ) : (
          filtered.map((ground) => (
            <GroundCard key={ground.id} ground={ground} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
