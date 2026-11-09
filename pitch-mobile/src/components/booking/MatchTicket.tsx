import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { QRDisplay } from "@/components/booking/QRDisplay";
import { Icon } from "@/components/ui/Icon";
import { Text } from "@/components/ui/Typography";
import { colors, fonts } from "@/constants/colors";

interface MatchTicketProps {
  groundName: string;
  groundArea: string;
  date: string;
  time: string;
  bookingRef: string;
  qrToken?: string | null;
  qrSize?: number;
  payAtGround?: string;
  /** Color behind the ticket, used to cut the perforation notches. */
  backdrop?: string;
}

/** The booking shown as a printed match pass. */
export function MatchTicket({
  groundName,
  groundArea,
  date,
  time,
  bookingRef,
  qrToken,
  qrSize = 180,
  payAtGround,
  backdrop = colors.bg,
}: MatchTicketProps) {
  return (
    <View style={styles.ticket}>
      <LinearGradient
        colors={[colors.primary, colors.hero]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.band}
      >
        <View style={styles.brandRow}>
          <Icon name="cricket" size={20} color={colors.accent} />
          <Text style={styles.brand}>PITCH</Text>
        </View>
        <Text style={styles.pass}>MATCH PASS</Text>
      </LinearGradient>

      <View style={styles.body}>
        <Text style={styles.ground} numberOfLines={2}>
          {groundName}
        </Text>
        <Text style={styles.area} numberOfLines={1}>
          {groundArea}
        </Text>
        <View style={styles.facts}>
          <Fact label="DATE" value={date} />
          <Fact label="TIME" value={time} />
        </View>
      </View>

      <View style={styles.perforation}>
        <View style={[styles.notch, styles.notchLeft, { backgroundColor: backdrop }]} />
        <View style={styles.dashes} />
        <View style={[styles.notch, styles.notchRight, { backgroundColor: backdrop }]} />
      </View>

      <View style={styles.stub}>
        {qrToken ? <QRDisplay value={qrToken} size={qrSize} /> : null}
        <Text style={styles.refLabel}>BOOKING REF</Text>
        <Text style={styles.ref}>#{bookingRef}</Text>
        {payAtGround ? (
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Pay at ground</Text>
            <Text style={styles.payValue}>{payAtGround}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.factLabel}>{label}</Text>
      <Text style={styles.factValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ticket: {
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.paper,
  },
  band: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  brand: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 2, color: colors.white },
  pass: { fontSize: 11, fontWeight: "800", letterSpacing: 2, color: colors.accent },
  body: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 8 },
  ground: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, color: colors.ink },
  area: { fontSize: 14, color: colors.inkSecondary, marginTop: 3 },
  facts: { flexDirection: "row", gap: 16, marginTop: 16 },
  factLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1.5, color: colors.inkSecondary },
  factValue: { fontFamily: fonts.display, fontSize: 25, color: colors.ink, marginTop: 1 },
  perforation: { height: 32, justifyContent: "center" },
  dashes: {
    marginHorizontal: 22,
    borderTopWidth: 2,
    borderStyle: "dashed",
    borderColor: "#CFC8B4",
  },
  notch: { position: "absolute", width: 28, height: 28, borderRadius: 14, top: 2 },
  notchLeft: { left: -14 },
  notchRight: { right: -14 },
  stub: { alignItems: "center", paddingHorizontal: 20, paddingBottom: 20 },
  refLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: colors.inkSecondary,
    marginTop: 8,
  },
  ref: { fontFamily: fonts.display, fontSize: 26, letterSpacing: 3, color: colors.ink },
  payRow: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E6F5A5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
  },
  payLabel: { fontSize: 13, fontWeight: "600", color: "#3F4D10" },
  payValue: { fontFamily: fonts.display, fontSize: 21, color: "#3F4D10" },
});
