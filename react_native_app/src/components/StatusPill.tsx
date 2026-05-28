import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface Props {
  label: string;
  value: string;
  danger?: boolean;
}

export function StatusPill({ label, value, danger = false }: Props) {
  return (
    <View style={[styles.pill, danger && styles.danger]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, danger && styles.dangerText]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minWidth: 132,
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(34,247,238,0.34)",
    backgroundColor: "rgba(7,14,23,0.82)",
    padding: 14,
    gap: 8,
  },
  danger: {
    borderColor: "rgba(255,38,61,0.45)",
  },
  label: {
    color: "#8f98a8",
    fontFamily: "System",
    fontSize: 12,
    letterSpacing: 1.4,
  },
  value: {
    color: "#22f7ee",
    fontSize: 20,
    fontWeight: "800",
  },
  dangerText: {
    color: "#ff263d",
  },
});
