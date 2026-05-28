import NetInfo from "@react-native-community/netinfo";
import { LocalStore } from "./localStore";

export class SyncService {
  constructor(
    private readonly store = new LocalStore(),
    private readonly endpoint = "https://aws.example.com/datalake/offline-face/sync",
    private readonly terminalId = "NHAI-OP-004",
  ) {}

  async syncWhenOnline(authToken?: string): Promise<"offline" | "synced" | "empty" | "failed"> {
    const network = await NetInfo.fetch();
    if (!network.isConnected) return "offline";

    const envelope = await this.store.buildSyncEnvelope(this.terminalId);
    if (!envelope.enrollments.length && !envelope.auditLogs.length) return "empty";

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(envelope),
      });
      if (!response.ok) return "failed";
      await this.store.markSyncedAndPurge();
      return "synced";
    } catch {
      return "failed";
    }
  }
}
