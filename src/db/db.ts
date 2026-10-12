import Dexie, { Table } from 'dexie';

export interface UserProfile {
  id?: number;
  weight: number; // kg
  height: number; // cm
  dailyCalorieTarget: number; // kcal
  gender?: 'male' | 'female' | 'other' | 'unspecified';
  birthYearMonth?: string;
  ocrAutoStartMode?: 1 | 2 | 3; // 1: 即時自動解析(デフォルト), 2: 確認ダイアログ表示, 3: 自動解析なし
  geminiApiKey?: string;
  updatedAt: string;
}

export interface PlayRecord {
  id?: number;
  songName: string;
  level: number;
  cool: number;
  great: number;
  good: number;
  bad: number;
  totalNotes: number;
  clearRank: string;
  mets: number;
  accuracyFactor: number;
  calories: number;
  imageThumbnail?: string;
  status?: 'completed' | 'pending';
  playedAt: string;
}

export class PmFitDatabase extends Dexie {
  userProfiles!: Table<UserProfile>;
  playRecords!: Table<PlayRecord>;

  constructor() {
    super('PmFitDatabase');
    this.version(5).stores({
      userProfiles: '++id',
      playRecords: '++id, level, clearRank, playedAt, status',
    });
  }
}

export const db = new PmFitDatabase();

export async function getOrCreateUserProfile(): Promise<UserProfile> {
  const existing = await db.userProfiles.toCollection().first();
  if (existing) {
    return {
      ocrAutoStartMode: 1,
      ...existing,
    };
  }
  const defaultProfile: UserProfile = {
    weight: 65,
    height: 170,
    dailyCalorieTarget: 500,
    gender: 'unspecified',
    birthYearMonth: '',
    ocrAutoStartMode: 1,
    geminiApiKey: '',
    updatedAt: new Date().toISOString(),
  };
  const id = await db.userProfiles.add(defaultProfile);
  return { ...defaultProfile, id };
}

export async function updateUserProfile(profile: Partial<UserProfile>): Promise<void> {
  const existing = await db.userProfiles.toCollection().first();
  if (existing && existing.id) {
    await db.userProfiles.update(existing.id, {
      ...profile,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await db.userProfiles.add({
      weight: profile.weight ?? 65,
      height: profile.height ?? 170,
      dailyCalorieTarget: profile.dailyCalorieTarget ?? 500,
      gender: profile.gender ?? 'unspecified',
      birthYearMonth: profile.birthYearMonth ?? '',
      ocrAutoStartMode: profile.ocrAutoStartMode ?? 1,
      geminiApiKey: profile.geminiApiKey ?? '',
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function removeGeminiApiKey(): Promise<void> {
  const existing = await db.userProfiles.toCollection().first();
  if (existing && existing.id) {
    await db.userProfiles.update(existing.id, {
      geminiApiKey: '',
      updatedAt: new Date().toISOString(),
    });
  }
}

export async function clearAllAppData(): Promise<void> {
  await db.playRecords.clear();
  await db.userProfiles.clear();
  await getOrCreateUserProfile();
}

export async function getPendingPlayRecords(): Promise<PlayRecord[]> {
  return await db.playRecords.filter((r) => r.status === 'pending').toArray();
}
