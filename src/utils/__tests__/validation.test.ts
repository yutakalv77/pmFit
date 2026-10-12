import { describe, it, expect } from 'vitest';
import { validateUserProfile } from '../validation';

describe('validation.ts Exhaustive BVA Test Suite (Rule 1, 2, 3)', () => {
  describe('Weight BVA (30.0kg - 250.0kg)', () => {
    it('accepts weight 30.0kg On-point lower bound', () => {
      expect(validateUserProfile({ weight: 30.0 }).isValid).toBe(true);
    });

    it('rejects weight 29.99kg Off-point lower bound', () => {
      expect(validateUserProfile({ weight: 29.99 }).isValid).toBe(false);
    });

    it('accepts weight 250.0kg On-point upper bound', () => {
      expect(validateUserProfile({ weight: 250.0 }).isValid).toBe(true);
    });

    it('rejects weight 250.01kg Off-point upper bound', () => {
      expect(validateUserProfile({ weight: 250.01 }).isValid).toBe(false);
    });
  });

  describe('Height BVA (100.0cm - 250.0cm)', () => {
    it('accepts height 100.0cm On-point lower bound', () => {
      expect(validateUserProfile({ height: 100.0 }).isValid).toBe(true);
    });

    it('rejects height 99.99cm Off-point lower bound', () => {
      expect(validateUserProfile({ height: 99.99 }).isValid).toBe(false);
    });

    it('accepts height 250.0cm On-point upper bound', () => {
      expect(validateUserProfile({ height: 250.0 }).isValid).toBe(true);
    });

    it('rejects height 250.01cm Off-point upper bound', () => {
      expect(validateUserProfile({ height: 250.01 }).isValid).toBe(false);
    });
  });

  describe('Daily Calorie Target BVA (50kcal - 10000kcal)', () => {
    it('accepts target 50kcal On-point lower bound', () => {
      expect(validateUserProfile({ dailyCalorieTarget: 50 }).isValid).toBe(true);
    });

    it('rejects target 49.99kcal Off-point lower bound', () => {
      expect(validateUserProfile({ dailyCalorieTarget: 49.99 }).isValid).toBe(false);
    });

    it('accepts target 10000kcal On-point upper bound', () => {
      expect(validateUserProfile({ dailyCalorieTarget: 10000 }).isValid).toBe(true);
    });

    it('rejects target 10000.01kcal Off-point upper bound', () => {
      expect(validateUserProfile({ dailyCalorieTarget: 10000.01 }).isValid).toBe(false);
    });
  });

  describe('OCR Auto-Start Mode BVA (Modes 1, 2, 3)', () => {
    it('accepts mode 1 (Immediate Auto)', () => {
      expect(validateUserProfile({ ocrAutoStartMode: 1 }).isValid).toBe(true);
    });

    it('accepts mode 2 (Confirm Modal)', () => {
      expect(validateUserProfile({ ocrAutoStartMode: 2 }).isValid).toBe(true);
    });

    it('accepts mode 3 (Manual Only)', () => {
      expect(validateUserProfile({ ocrAutoStartMode: 3 }).isValid).toBe(true);
    });

    it('rejects mode 0 Off-point', () => {
      expect(validateUserProfile({ ocrAutoStartMode: 0 as any }).isValid).toBe(false);
    });

    it('rejects mode 4 Off-point', () => {
      expect(validateUserProfile({ ocrAutoStartMode: 4 as any }).isValid).toBe(false);
    });

    it('rejects mode -1 Off-point', () => {
      expect(validateUserProfile({ ocrAutoStartMode: -1 as any }).isValid).toBe(false);
    });
  });

  describe('Malformed & Invalid Inputs (Rule 1 & 3)', () => {
    it('rejects NaN weight', () => {
      expect(validateUserProfile({ weight: NaN }).isValid).toBe(false);
    });

    it('rejects Infinity weight', () => {
      expect(validateUserProfile({ weight: Infinity }).isValid).toBe(false);
    });

    it('rejects -Infinity height', () => {
      expect(validateUserProfile({ height: -Infinity }).isValid).toBe(false);
    });

    it('rejects Number.MAX_SAFE_INTEGER target', () => {
      expect(validateUserProfile({ dailyCalorieTarget: Number.MAX_SAFE_INTEGER }).isValid).toBe(false);
    });

    it('rejects string "abc" weight', () => {
      expect(validateUserProfile({ weight: 'abc' as any }).isValid).toBe(false);
    });
  });
});
