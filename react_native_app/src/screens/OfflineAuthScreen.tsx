import React, { useMemo, useRef, useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Camera, useCameraDevice, useCameraPermission } from "react-native-vision-camera";
import type { Camera as CameraRef } from "react-native-vision-camera";
import { StatusPill } from "../components/StatusPill";
import { OfflineFaceEngine } from "../services/offlineFaceEngine";
import { SyncService } from "../services/syncService";
import type { OfflineAuthResult } from "../types/auth";

const fakeFrame = () => new Uint8Array(Array.from({ length: 4096 }, (_, index) => (index * 17) % 255));

export function OfflineAuthScreen() {
  const { width } = useWindowDimensions();
  const camera = useRef<CameraRef>(null);
  const device = useCameraDevice("front");
  const permission = useCameraPermission();
  const engine = useMemo(() => new OfflineFaceEngine(), []);
  const sync = useMemo(() => new SyncService(), []);
  const [entityId, setEntityId] = useState("NHAI-EMP-011");
  const [name, setName] = useState("OPEN AI");
  const [challenge, setChallenge] = useState(engine.getChallengeLabel());
  const [status, setStatus] = useState("OFFLINE READY");
  const [result, setResult] = useState<OfflineAuthResult | null>(null);
  const compact = width < 720;

  const requestCamera = async () => {
    const granted = await permission.requestPermission();
    setStatus(granted ? "CAMERA ENABLED" : "CAMERA PERMISSION DENIED");
  };

  const enroll = async () => {
    const record = await engine.enroll(entityId, name, fakeFrame());
    setStatus(`SAVED ${record.userId} · QUALITY ${Math.round(record.quality * 100)}%`);
  };

  const verify = async () => {
    const next = engine.getChallengeLabel();
    setChallenge(next);
    const decision = await engine.verify(fakeFrame(), {
      eyeAspectDrop: next.includes("Blink") ? 0.24 : 0.04,
      mouthAspectGain: next.includes("Smile") ? 0.18 : 0.03,
      yawDegrees: next.includes("left") ? -14 : next.includes("right") ? 14 : 0,
      passiveSpoofScore: 0.86,
    });
    setResult(decision);
    setStatus(`${decision.decision.toUpperCase()} · ${Math.round(decision.confidence * 100)}% · ${decision.latencyMs}ms`);
  };

  const syncAndPurge = async () => {
    const syncStatus = await sync.syncWhenOnline();
    setStatus(`SYNC: ${syncStatus.toUpperCase()}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.shell}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>NHAI SECURITY</Text>
            <Text style={styles.subtitle}>OFFLINE BIO-TERMINAL · REACT NATIVE</Text>
          </View>
          <Text style={styles.offline}>OFFLINE MODE ●</Text>
        </View>

        <View style={[styles.metrics, compact && styles.stack]}>
          <StatusPill label="MODEL BUDGET" value="~7 MB / 20 MB" />
          <StatusPill label="TARGET LATENCY" value="< 1s" />
          <StatusPill label="MIN DEVICE" value="3GB RAM" />
          <StatusPill label="SYNC QUEUE" value="LOCAL" danger />
        </View>

        <View style={[styles.content, compact && styles.stack]}>
          <View style={styles.cameraPanel}>
            {device && permission.hasPermission ? (
              <Camera ref={camera} style={styles.camera} device={device} isActive photo />
            ) : (
              <View style={styles.cameraFallback}>
                <Text style={styles.cameraText}>CAMERA OFF</Text>
                <Pressable style={styles.button} onPress={requestCamera}>
                  <Text style={styles.buttonText}>ENABLE CAMERA</Text>
                </Pressable>
              </View>
            )}
            <View style={styles.overlay}>
              <Text style={styles.live}>● LIVE</Text>
              <Text style={styles.live}>BLAZEFACE</Text>
            </View>
          </View>

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>IDENTITY + LIVENESS</Text>
            <TextInput value={entityId} onChangeText={setEntityId} style={styles.input} placeholder="Entity ID" placeholderTextColor="#667" />
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Full name" placeholderTextColor="#667" />
            <Text style={styles.challenge}>CHALLENGE: {challenge.toUpperCase()}</Text>
            <Pressable style={styles.primary} onPress={enroll}><Text style={styles.primaryText}>ENROLL OFFLINE</Text></Pressable>
            <Pressable style={styles.primary} onPress={verify}><Text style={styles.primaryText}>VERIFY FACE</Text></Pressable>
            <Pressable style={styles.button} onPress={syncAndPurge}><Text style={styles.buttonText}>SYNC + PURGE WHEN ONLINE</Text></Pressable>
            <Text style={styles.status}>{status}</Text>
            {result ? <Text style={styles.reason}>{result.reasons.join(", ")}</Text> : null}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#050910" },
  shell: { flex: 1, padding: 18, gap: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  brand: { color: "#22f7ee", fontSize: 24, fontWeight: "900", letterSpacing: 3 },
  subtitle: { color: "#87909f", marginTop: 6, letterSpacing: 1.2 },
  offline: { color: "#ff263d", fontSize: 16, fontWeight: "900", letterSpacing: 2 },
  metrics: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  content: { flex: 1, flexDirection: "row", gap: 18 },
  stack: { flexDirection: "column" },
  cameraPanel: { flex: 1.2, minHeight: 360, borderWidth: 1, borderColor: "rgba(34,247,238,0.26)", backgroundColor: "#13232a" },
  camera: { flex: 1 },
  cameraFallback: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  cameraText: { color: "#6e7685", fontSize: 28, fontWeight: "800", letterSpacing: 5 },
  overlay: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", gap: 8 },
  live: { color: "#22f7ee", borderWidth: 1, borderColor: "rgba(34,247,238,0.45)", padding: 8, backgroundColor: "rgba(5,9,15,0.78)" },
  panel: { flex: 0.8, minWidth: 290, borderWidth: 1, borderColor: "rgba(34,247,238,0.22)", padding: 18, gap: 12, backgroundColor: "rgba(10,18,29,0.88)" },
  panelTitle: { color: "#22f7ee", fontSize: 18, fontWeight: "900", letterSpacing: 2 },
  input: { color: "#f5f8fb", borderWidth: 1, borderColor: "rgba(95,154,173,0.32)", padding: 12, fontSize: 16 },
  challenge: { color: "#76ff8d", fontWeight: "800", marginVertical: 4 },
  primary: { backgroundColor: "#22f7ee", padding: 14, alignItems: "center" },
  primaryText: { color: "#041015", fontWeight: "900", letterSpacing: 2 },
  button: { borderWidth: 1, borderColor: "rgba(34,247,238,0.6)", padding: 12, alignItems: "center" },
  buttonText: { color: "#22f7ee", fontWeight: "900", letterSpacing: 1.2 },
  status: { color: "#f5f8fb", marginTop: 8 },
  reason: { color: "#9aa3b2" },
});
