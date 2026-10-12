import { describe, it, expect } from 'vitest';
import {
  calculateCalories,
  calculateAgeFromBirth,
  calculateGenderFactor,
  calculateAgeFactor,
} from '../calorieCalculator';

describe('calorieCalculator Granular BVA Test Suite (Rule 1, 2, 3)', () => {
  const fixedCurrentDate = new Date('2026-08-13T12:00:00Z');

  describe('calculateAgeFromBirth Granular Tests', () => {
    it('calculates age 30 for 1996-08', () => {
      expect(calculateAgeFromBirth('1996-08', fixedCurrentDate)).toBe(30);
    });

    it('calculates age 26 for 2000-01', () => {
      expect(calculateAgeFromBirth('2000-01', fixedCurrentDate)).toBe(26);
    });

    it('calculates age 15 for 2010-12', () => {
      expect(calculateAgeFromBirth('2010-12', fixedCurrentDate)).toBe(15);
    });

    it('handles leap year 1996-02', () => {
      expect(calculateAgeFromBirth('1996-02', fixedCurrentDate)).toBe(30);
    });

    it('returns null for empty string', () => {
      expect(calculateAgeFromBirth('', fixedCurrentDate)).toBeNull();
    });

    it('returns null for malformed string', () => {
      expect(calculateAgeFromBirth('abc', fixedCurrentDate)).toBeNull();
    });

    it('returns null for future birth date', () => {
      expect(calculateAgeFromBirth('2030-01', fixedCurrentDate)).toBeNull();
    });
  });

  describe('calculateGenderFactor Granular Tests', () => {
    it('returns 1.00 for male', () => {
      expect(calculateGenderFactor('male')).toBe(1.00);
    });

    it('returns 0.92 for female', () => {
      expect(calculateGenderFactor('female')).toBe(0.92);
    });

    it('returns 0.96 for other', () => {
      expect(calculateGenderFactor('other')).toBe(0.96);
    });

    it('returns 0.96 for unspecified', () => {
      expect(calculateGenderFactor('unspecified')).toBe(0.96);
    });

    it('returns 0.96 for undefined', () => {
      expect(calculateGenderFactor(undefined)).toBe(0.96);
    });
  });

  describe('calculateAgeFactor Granular BVA Tests', () => {
    it('returns 1.02 for age 17 (<18 On-point)', () => {
      expect(calculateAgeFactor(17)).toBe(1.02);
    });

    it('returns 1.00 for age 18 (18-29 On-point lower)', () => {
      expect(calculateAgeFactor(18)).toBe(1.00);
    });

    it('returns 1.00 for age 29 (18-29 On-point upper)', () => {
      expect(calculateAgeFactor(29)).toBe(1.00);
    });

    it('returns 0.97 for age 30 (30s On-point lower)', () => {
      expect(calculateAgeFactor(30)).toBe(0.97);
    });

    it('returns 0.97 for age 39 (30s On-point upper)', () => {
      expect(calculateAgeFactor(39)).toBe(0.97);
    });

    it('returns 0.94 for age 40 (40s On-point lower)', () => {
      expect(calculateAgeFactor(40)).toBe(0.94);
    });

    it('returns 0.91 for age 50 (50s On-point lower)', () => {
      expect(calculateAgeFactor(50)).toBe(0.91);
    });

    it('returns 0.87 for age 60 (60+ On-point lower)', () => {
      expect(calculateAgeFactor(60)).toBe(0.87);
    });

    it('returns 1.00 for null age', () => {
      expect(calculateAgeFactor(null)).toBe(1.00);
    });

    it('returns 1.00 for NaN age', () => {
      expect(calculateAgeFactor(NaN)).toBe(1.00);
    });
  });

  describe('calculateCalories Ranks & METs Granular Tests', () => {
    const base = { level: 48, weightKg: 65, durationSec: 125 };

    it('calculates S+ rank accuracy factor 0.90', () => {
      expect(calculateCalories({ ...base, clearRank: 'S+' }).accuracyFactor).toBe(0.90);
    });

    it('calculates S rank accuracy factor 0.90', () => {
      expect(calculateCalories({ ...base, clearRank: 'S' }).accuracyFactor).toBe(0.90);
    });

    it('calculates A+ rank accuracy factor 0.95', () => {
      expect(calculateCalories({ ...base, clearRank: 'A+' }).accuracyFactor).toBe(0.95);
    });

    it('calculates A rank accuracy factor 0.95', () => {
      expect(calculateCalories({ ...base, clearRank: 'A' }).accuracyFactor).toBe(0.95);
    });

    it('calculates B rank accuracy factor 1.00', () => {
      expect(calculateCalories({ ...base, clearRank: 'B' }).accuracyFactor).toBe(1.00);
    });

    it('calculates C rank accuracy factor 1.00', () => {
      expect(calculateCalories({ ...base, clearRank: 'C' }).accuracyFactor).toBe(1.00);
    });

    it('calculates FAILED rank accuracy factor 1.05', () => {
      expect(calculateCalories({ ...base, clearRank: 'FAILED' }).accuracyFactor).toBe(1.05);
    });

    it('calculates METs 3.0 for Lv 29', () => {
      expect(calculateCalories({ level: 29, clearRank: 'A', weightKg: 65 }).mets).toBe(3.0);
    });

    it('calculates METs 3.5 for Lv 30', () => {
      expect(calculateCalories({ level: 30, clearRank: 'A', weightKg: 65 }).mets).toBe(3.5);
    });

    it('calculates METs 4.0 for Lv 44', () => {
      expect(calculateCalories({ level: 44, clearRank: 'A', weightKg: 65 }).mets).toBe(4.0);
    });

    it('calculates METs 4.5 for Lv 48', () => {
      expect(calculateCalories({ level: 48, clearRank: 'A', weightKg: 65 }).mets).toBe(4.5);
    });

    it('handles extreme overflow values (e.g. weightKg 1e20, level 9999) safely', () => {
      const res = calculateCalories({ level: 9999, weightKg: 1e20, clearRank: 'S+' });
      expect(Number.isFinite(res.calories)).toBe(true);
      expect(res.mets).toBe(4.5);
    });
  });
});
