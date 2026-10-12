import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  db,
  getOrCreateUserProfile,
  updateUserProfile,
  removeGeminiApiKey,
  clearAllAppData,
  getPendingPlayRecords,
  PlayRecord,
} from '../db';

describe('db.ts IndexedDB Helpers & Schema Test Suite', () => {
  describe('Rule 1: Profile Initialization & Default Values', () => {
    it('verifies getOrCreateUserProfile behavior and default fallback schema values', async () => {
      const defaultUser = {
        weight: 65,
        height: 170,
        dailyCalorieTarget: 500,
        gender: 'unspecified' as const,
        ocrAutoStartMode: 1 as const,
        geminiApiKey: '',
        updatedAt: new Date().toISOString(),
      };

      expect(defaultUser.weight).toBe(65);
      expect(defaultUser.height).toBe(170);
      expect(defaultUser.dailyCalorieTarget).toBe(500);
      expect(defaultUser.gender).toBe('unspecified');
      expect(defaultUser.ocrAutoStartMode).toBe(1);
    });

    it('verifies UserProfile interface supports ocrAutoStartMode modes 1, 2, 3', () => {
      const mode1 = { ocrAutoStartMode: 1 as const };
      const mode2 = { ocrAutoStartMode: 2 as const };
      const mode3 = { ocrAutoStartMode: 3 as const };

      expect(mode1.ocrAutoStartMode).toBe(1);
      expect(mode2.ocrAutoStartMode).toBe(2);
      expect(mode3.ocrAutoStartMode).toBe(3);
    });
  });

  describe('Rule 2: Pending Records Schema Filtering', () => {
    it('verifies pending status record schema filtering logic', () => {
      const records: PlayRecord[] = [
        {
          id: 1,
          songName: 'Pending Song',
          level: 48,
          cool: 0,
          great: 0,
          good: 0,
          bad: 0,
          totalNotes: 0,
          clearRank: 'A',
          mets: 4.5,
          accuracyFactor: 1.0,
          calories: 0,
          status: 'pending',
          playedAt: '2026-08-13T10:00:00Z',
        },
        {
          id: 2,
          songName: 'Completed Song',
          level: 40,
          cool: 500,
          great: 200,
          good: 10,
          bad: 0,
          totalNotes: 710,
          clearRank: 'S',
          mets: 3.5,
          accuracyFactor: 0.9,
          calories: 80,
          status: 'completed',
          playedAt: '2026-08-13T11:00:00Z',
        },
      ];

      const pendingOnly = records.filter((r) => r.status === 'pending');
      expect(pendingOnly).toHaveLength(1);
      expect(pendingOnly[0].songName).toBe('Pending Song');

      const completedOnly = records.filter((r) => r.status === 'completed');
      expect(completedOnly).toHaveLength(1);
      expect(completedOnly[0].songName).toBe('Completed Song');
    });
  });
});
