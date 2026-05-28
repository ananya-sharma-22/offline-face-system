import AsyncStorage from "@react-native-async-storage/async-storage";
import type { FaceEmbeddingRecord, OfflineAuthResult, SyncEnvelope } from "../types/auth";

const USER_KEY = "nhai.offline.users.v1";
const AUDIT_KEY = "nhai.offline.audit.v1";

export class LocalStore {
  async getUsers(): Promise<FaceEmbeddingRecord[]> {
    return this.readJson<FaceEmbeddingRecord[]>(USER_KEY, []);
  }

  async upsertUser(record: FaceEmbeddingRecord): Promise<void> {
    const users = await this.getUsers();
    const index = users.findIndex((user) => user.userId === record.userId);
    if (index >= 0) users[index] = record;
    else users.unshift(record);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(users));
  }

  async appendAudit(result: OfflineAuthResult): Promise<void> {
    const logs = await this.readJson<OfflineAuthResult[]>(AUDIT_KEY, []);
    logs.unshift(result);
    await AsyncStorage.setItem(AUDIT_KEY, JSON.stringify(logs.slice(0, 500)));
  }

  async buildSyncEnvelope(terminalId: string): Promise<SyncEnvelope> {
    return {
      terminalId,
      generatedAt: new Date().toISOString(),
      enrollments: (await this.getUsers()).filter((user) => !user.synced),
      auditLogs: await this.readJson<OfflineAuthResult[]>(AUDIT_KEY, []),
    };
  }

  async markSyncedAndPurge(): Promise<void> {
    const users = await this.getUsers();
    const retained = users.map((user) => ({ ...user, synced: true }));
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(retained));
    await AsyncStorage.removeItem(AUDIT_KEY);
  }

  private async readJson<T>(key: string, fallback: T): Promise<T> {
    const value = await AsyncStorage.getItem(key);
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
}
