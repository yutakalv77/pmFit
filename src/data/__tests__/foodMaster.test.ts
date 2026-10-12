import { describe, it, expect } from 'vitest';
import { FOOD_MASTER, convertCaloriesToFoods } from '../foodMaster';

describe('foodMaster Comprehensive Test Suite (Rule 1, 2, 3)', () => {
  describe('FOOD_MASTER Data Integrity', () => {
    it('contains valid non-empty food items with positive calorie values', () => {
      expect(FOOD_MASTER.length).toBeGreaterThan(0);
      for (const item of FOOD_MASTER) {
        expect(item.id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(item.calories).toBeGreaterThan(0);
        expect(item.unit).toBeTruthy();
        expect(item.icon).toBeTruthy();
      }
    });

    it('retrieves ramen and onigiri foods correctly', () => {
      const ramen = FOOD_MASTER.find((f) => f.id === 'ramen');
      expect(ramen).toBeDefined();
      expect(ramen?.name).toBe('醤油ラーメン');
      expect(ramen?.calories).toBe(500);
    });
  });

  describe('convertCaloriesToFoods (Rule 1: Invalid & Type Checks)', () => {
    it('returns zero count for zero, negative, NaN, or non-numeric calorie inputs', () => {
      const resZero = convertCaloriesToFoods(0);
      expect(resZero.every((item) => item.count === 0)).toBe(true);

      const resNegative = convertCaloriesToFoods(-500);
      expect(resNegative.every((item) => item.count === 0)).toBe(true);

      const resNaN = convertCaloriesToFoods(NaN);
      expect(resNaN.every((item) => item.count === 0)).toBe(true);

      const resNull = convertCaloriesToFoods(null as any);
      expect(resNull.every((item) => item.count === 0)).toBe(true);
    });
  });

  describe('convertCaloriesToFoods (Rule 2: BVA & Precision Conversion)', () => {
    it('calculates exact food counts for 500 kcal (1.0 Ramen, ~2.9 Onigiri)', () => {
      const res = convertCaloriesToFoods(500);
      const ramen = res.find((r) => r.food.id === 'ramen');
      const onigiri = res.find((r) => r.food.id === 'onigiri');

      expect(ramen?.count).toBe(1.0);
      expect(onigiri?.count).toBe(2.9); // 500 / 170 = 2.941 -> 2.9
    });

    it('calculates small calorie values (170 kcal = 1.0 Onigiri)', () => {
      const res = convertCaloriesToFoods(170);
      const onigiri = res.find((r) => r.food.id === 'onigiri');
      expect(onigiri?.count).toBe(1.0);
    });
  });

  describe('convertCaloriesToFoods (Rule 3: Extreme & Overflow)', () => {
    it('handles extreme calorie values (e.g. Number.MAX_SAFE_INTEGER, 1e20) safely without throwing', () => {
      const resExtreme = convertCaloriesToFoods(Number.MAX_SAFE_INTEGER);
      expect(resExtreme.every((item) => Number.isFinite(item.count))).toBe(true);

      const resOverflow = convertCaloriesToFoods(1e20);
      expect(resOverflow.every((item) => Number.isFinite(item.count))).toBe(true);
    });
  });
});
