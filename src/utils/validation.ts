import { UserProfile } from '@/db/db';

export interface ValidationResult {
  isValid: boolean;
  errors: Partial<Record<keyof UserProfile, string>>;
}

export const VALIDATION_LIMITS = {
  WEIGHT: { MIN: 30, MAX: 250 },
  HEIGHT: { MIN: 100, MAX: 250 },
  DAILY_CALORIE_TARGET: { MIN: 50, MAX: 10000 },
} as const;

/**
 * 数値または文字列を安全に数値化します。
 * Infinity, -Infinity, NaN, オーバーフロー値は即座に NaN として処理します。
 */
function parseNumberSafely(val: unknown): number {
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : NaN;
  }
  if (typeof val === 'string' && val.trim() !== '') {
    const parsed = Number(val);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

/**
 * ユーザープロファイルの厳密な入力バリデーション（境界値 & オーバーフロー防止機能付き）
 */
export function validateUserProfile(profile: Partial<Record<keyof UserProfile, any>>): ValidationResult {
  const errors: Partial<Record<keyof UserProfile, string>> = {};

  if (profile.weight !== undefined) {
    const weightNum = parseNumberSafely(profile.weight);
    if (
      isNaN(weightNum) ||
      weightNum < VALIDATION_LIMITS.WEIGHT.MIN ||
      weightNum > VALIDATION_LIMITS.WEIGHT.MAX
    ) {
      errors.weight = `体重は ${VALIDATION_LIMITS.WEIGHT.MIN} kg から ${VALIDATION_LIMITS.WEIGHT.MAX} kg の範囲で入力してください。`;
    }
  }

  if (profile.height !== undefined) {
    const heightNum = parseNumberSafely(profile.height);
    if (
      isNaN(heightNum) ||
      heightNum < VALIDATION_LIMITS.HEIGHT.MIN ||
      heightNum > VALIDATION_LIMITS.HEIGHT.MAX
    ) {
      errors.height = `身長は ${VALIDATION_LIMITS.HEIGHT.MIN} cm から ${VALIDATION_LIMITS.HEIGHT.MAX} cm の範囲で入力してください。`;
    }
  }

  if (profile.dailyCalorieTarget !== undefined) {
    const targetNum = parseNumberSafely(profile.dailyCalorieTarget);
    if (
      isNaN(targetNum) ||
      targetNum < VALIDATION_LIMITS.DAILY_CALORIE_TARGET.MIN ||
      targetNum > VALIDATION_LIMITS.DAILY_CALORIE_TARGET.MAX
    ) {
      errors.dailyCalorieTarget = `目標カロリーは ${VALIDATION_LIMITS.DAILY_CALORIE_TARGET.MIN} kcal から ${VALIDATION_LIMITS.DAILY_CALORIE_TARGET.MAX} kcal の範囲で入力してください。`;
    }
  }

  // ocrAutoStartMode バリデーション
  if (
    profile.ocrAutoStartMode !== undefined &&
    ![1, 2, 3].includes(profile.ocrAutoStartMode as number)
  ) {
    errors.ocrAutoStartMode = '解析タイミングモードは 1, 2, 3 のいずれかを選択してください。';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
