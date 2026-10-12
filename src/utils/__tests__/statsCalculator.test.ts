import { describe, it, expect } from 'vitest';
import {
  calculateDashboardStats,
  formatDateKey,
  getPast7DaysKeys,
  calculateBadges,
} from '../statsCalculator';
import { PlayRecord } from '@/db/db';

describe('statsCalculator Comprehensive Test Suite (Rule 1, 2, 3, 4)', () => {
  const fixedDate = new Date('2026-08-13T12:00:00Z');

  describe('formatDateKey & getPast7DaysKeys Helpers', () => {
    it('formats date to YYYY-MM-DD correctly', () => {
      expect(formatDateKey(new Date('2026-08-13T12:00:00Z'))).toBe('2026-08-13');
      expect(formatDateKey(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01-01');
    });

    it('handles leap year date formatting (2024-02-29)', () => {
      expect(formatDateKey(new Date('2024-02-29T12:00:00Z'))).toBe('2024-02-29');
    });

    it('returns array of 7 consecutive past date keys', () => {
      const keys = getPast7DaysKeys(fixedDate);
      expect(keys).toHaveLength(7);
      expect(keys[6]).toBe('2026-08-13');
      expect(keys[0]).toBe('2026-08-07');
    });
  });

  describe('Rule 1: Invalid & Malformed Inputs Handling', () => {
    it('handles empty, null, or undefined records cleanly without crashing', () => {
      const statsNull = calculateDashboardStats(null as any, 500, fixedDate);
      expect(statsNull.todayCalories).toBe(0);
      expect(statsNull.totalCaloriesAllTime).toBe(0);
      expect(statsNull.weeklySummaries).toHaveLength(7);

      const statsUndefined = calculateDashboardStats(undefined as any, undefined as any, fixedDate);
      expect(statsUndefined.todayCalories).toBe(0);
    });

    it('filters out pending status records from active statistics', () => {
      const records: PlayRecord[] = [
        {
          id: 1,
          songName: '大釈迦',
          level: 48,
          cool: 1000,
          great: 300,
          good: 50,
          bad: 10,
          totalNotes: 1360,
          clearRank: 'A+',
          mets: 4.5,
          accuracyFactor: 0.95,
          calories: 120,
          status: 'pending',
          playedAt: '2026-08-13T10:00:00Z',
        },
        {
          id: 2,
          songName: 'ニワトリ',
          level: 40,
          cool: 800,
          great: 200,
          good: 30,
          bad: 5,
          totalNotes: 1035,
          clearRank: 'S',
          mets: 3.5,
          accuracyFactor: 0.9,
          calories: 80,
          status: 'completed',
          playedAt: '2026-08-13T11:00:00Z',
        },
      ];

      const stats = calculateDashboardStats(records, 500, fixedDate);
      expect(stats.todayCalories).toBe(80);
      expect(stats.totalPlayCountAllTime).toBe(1);
    });

    it('handles NaN or extreme invalid dailyTargetCalorie safely', () => {
      const statsNaN = calculateDashboardStats([], NaN as any, fixedDate);
      expect(statsNaN.todayGoalPercent).toBe(0);

      const statsNegative = calculateDashboardStats([], -500 as any, fixedDate);
      expect(statsNegative.todayGoalPercent).toBe(0);
    });
  });

  describe('Rule 2: Individual Badge Unlock Threshold Tests', () => {
    const baseRecord: PlayRecord = {
      songName: 'Base Song',
      level: 40,
      cool: 500,
      great: 100,
      good: 10,
      bad: 0,
      totalNotes: 610,
      clearRank: 'S',
      mets: 3.5,
      accuracyFactor: 0.9,
      calories: 50,
      status: 'completed',
      playedAt: '2026-08-13T10:00:00Z',
    };

    it('unlocks first_play badge on 1 completed record', () => {
      const badges = calculateBadges([baseRecord], 50, 0.1, 1);
      const b = badges.find((item) => item.id === 'first_play');
      expect(b?.isUnlocked).toBe(true);
    });

    it('locks calorie_1000 badge under 1000 kcal Off-point', () => {
      const badges = calculateBadges([baseRecord], 999.9, 2.0, 1);
      const b = badges.find((item) => item.id === 'calorie_1000');
      expect(b?.isUnlocked).toBe(false);
    });

    it('unlocks calorie_1000 badge at 1000 kcal On-point', () => {
      const badges = calculateBadges([baseRecord], 1000.0, 2.0, 1);
      const b = badges.find((item) => item.id === 'calorie_1000');
      expect(b?.isUnlocked).toBe(true);
    });

    it('locks ramen_5 badge under 5.0 ramen count Off-point', () => {
      const badges = calculateBadges([baseRecord], 2400, 4.8, 1);
      const b = badges.find((item) => item.id === 'ramen_5');
      expect(b?.isUnlocked).toBe(false);
    });

    it('unlocks ramen_5 badge at 5.0 ramen count On-point', () => {
      const badges = calculateBadges([baseRecord], 2500, 5.0, 1);
      const b = badges.find((item) => item.id === 'ramen_5');
      expect(b?.isUnlocked).toBe(true);
    });

    it('locks high_level badge for Lv 44 Off-point', () => {
      const recLv44 = { ...baseRecord, level: 44 };
      const badges = calculateBadges([recLv44], 50, 0.1, 1);
      const b = badges.find((item) => item.id === 'high_level');
      expect(b?.isUnlocked).toBe(false);
    });

    it('unlocks high_level badge for Lv 45 On-point', () => {
      const recLv45 = { ...baseRecord, level: 45 };
      const badges = calculateBadges([recLv45], 50, 0.1, 1);
      const b = badges.find((item) => item.id === 'high_level');
      expect(b?.isUnlocked).toBe(true);
    });

    it('locks marathon badge under 5 plays/day Off-point', () => {
      const badges = calculateBadges([baseRecord], 50, 0.1, 4);
      const b = badges.find((item) => item.id === 'marathon');
      expect(b?.isUnlocked).toBe(false);
    });

    it('unlocks marathon badge at 5 plays/day On-point', () => {
      const badges = calculateBadges([baseRecord], 50, 0.1, 5);
      const b = badges.find((item) => item.id === 'marathon');
      expect(b?.isUnlocked).toBe(true);
    });
  });

  describe('Rule 3: Extreme & Overflow Testing', () => {
    it('handles extreme calorie numbers gracefully with Number.isFinite check', () => {
      const recordsExtreme: PlayRecord[] = [
        {
          songName: 'Extreme Song',
          level: 50,
          cool: 1000,
          great: 0,
          good: 0,
          bad: 0,
          totalNotes: 1000,
          clearRank: 'S+',
          mets: 4.5,
          accuracyFactor: 0.9,
          calories: Number.MAX_SAFE_INTEGER,
          status: 'completed',
          playedAt: '2026-08-13T10:00:00Z',
        },
      ];

      const stats = calculateDashboardStats(recordsExtreme, 500, fixedDate);
      expect(Number.isFinite(stats.todayCalories)).toBe(true);
      expect(stats.todayCalories).toBeGreaterThan(0);
    });
  });
});
