import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getApiErrorMessage } from "@/api/client";
import { bookingIdFromQrToken } from "@/utils/bookingQr";
import { ScannerOverlay } from "@/components/manager/ScannerOverlay";
import { useManagerStore } from "@/stores/managerStore";
import { formatSlotRange } from "@/utils/format";
import { useArriveBooking } from "@/hooks/useManagerMutations";

type ScanState = "idle" | "loading" | "success" | "error";

interface ScanResult {
  playerName?: string;
  slotTime?: string;
  errorMessage?: string;
}

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const { activeGround } = useManagerStore();
  const groundId = activeGround?.id ?? "";
  const arriveMutation = useArriveBooking(groundId);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const scannedRef = useRef(false);

  if (!permission?.granted) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <Text
          style={{ color: "#FFFFFF", textAlign: "center", marginBottom: 20 }}
        >
          Camera permission is required to scan QR codes.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: "#1A5C38",
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
            Grant Permission
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (scannedRef.current || scanState !== "idle") return;
    scannedRef.current = true;
    setScanState("loading");

    if (!groundId) {
      setScanState("error");
      setResult({ errorMessage: "Select a ground before scanning." });
      return;
    }

    const bookingId = bookingIdFromQrToken(data);
    if (!bookingId) {
      setScanState("error");
      setResult({ errorMessage: "Invalid QR code." });
      return;
    }

    try {
      const updated = await arriveMutation.mutateAsync({
        bookingId,
        payload: { method: "qr", qr_token: data },
      });

      setScanState("success");
      setResult({
        playerName:
          updated.player_name?.trim() || updated.player_phone || "Player",
        slotTime: formatSlotRange(updated.start_hour, updated.end_hour),
      });
    } catch (err) {
      setScanState("error");
      setResult({ errorMessage: getApiErrorMessage(err) });
    }
  }

  function handleReset() {
    scannedRef.current = false;
    setScanState("idle");
    setResult(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {scanState === "idle" || scanState === "loading" ? (
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={
            scanState === "idle" ? handleBarcodeScanned : undefined
          }
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        >
          <ScannerOverlay />

          {scanState === "loading" && (
            <View
              style={{
                position: "absolute",
                inset: 0,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}

          <SafeAreaView
            style={{ position: "absolute", top: 0, left: 0, right: 0 }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                padding: 20,
              }}
            >
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  backgroundColor: "rgba(0,0,0,0.4)",
                  borderRadius: 20,
                  width: 40,
                  height: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ color: "#fff" }}>✕</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      ) : (
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: scanState === "success" ? "#1A5C38" : "#E34C3C",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <Text style={{ fontSize: 60 }}>
            {scanState === "success" ? "✅" : "❌"}
          </Text>
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 22,
              fontWeight: "800",
              marginTop: 20,
              textAlign: "center",
            }}
          >
            {scanState === "success" ? "Arrival Confirmed!" : "Scan Failed"}
          </Text>
          {result?.playerName ? (
            <Text
              style={{
                color: "rgba(255,255,255,0.8)",
                marginTop: 8,
                fontSize: 16,
              }}
            >
              {result.playerName} · {result.slotTime}
            </Text>
          ) : null}
          {result?.errorMessage ? (
            <Text
              style={{
                color: "rgba(255,255,255,0.8)",
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {result.errorMessage}
            </Text>
          ) : null}
          <TouchableOpacity
            onPress={handleReset}
            style={{
              marginTop: 32,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 12,
              paddingHorizontal: 32,
              paddingVertical: 14,
            }}
          >
            <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
              {scanState === "success" ? "Scan Another" : "Try Again"}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      )}
    </View>
  );
}
