/**
 * ポップンミュージック判定＆レベルによる消費カロリー計算ユーティリティ (性別・年齢補正付き)
 */

export interface CalorieInput {
  level: number;       // 1 - 50
  clearRank: string;   // 'S+' | 'S' | 'A+' | 'A' | 'B' | 'C' | 'FAILED'
  weightKg: number;    // 体重(kg)
  gender?: 'male' | 'female' | 'other' | 'unspecified'; // フラットな性別選択肢
  birthYearMonth?: string; // "YYYY-MM"
  songDurationSec?: number; // 省略時はデフォルト125秒
}

export interface CalorieResult {
  mets: number;
  accuracyFactor: number;
  genderFactor: number;
  ageFactor: number;
  age: number | null;
  calories: number; // kcal
}

/**
 * "YYYY-MM" から満年齢を計算する純粋関数
 */
export function calculateAgeFromBirth(birthYearMonth?: string, currentDate = new Date()): number | null {
  if (!birthYearMonth || typeof birthYearMonth !== 'string') return null;

  const match = birthYearMonth.trim().match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;

  const birthYear = parseInt(match[1], 10);
  const birthMonth = parseInt(match[2], 10);

  if (!Number.isFinite(birthYear) || !Number.isFinite(birthMonth)) return null;
  if (birthYear < 1900 || birthYear > currentDate.getFullYear()) return null;
  if (birthMonth < 1 || birthMonth > 12) return null;

  let age = currentDate.getFullYear() - birthYear;
  const currentMonth = currentDate.getMonth() + 1;

  if (currentMonth < birthMonth) {
    age--;
  }

  return Math.max(0, age);
}

/**
 * レベルに応じた基本運動強度 (METs)
 */
export function calculateMets(level: number): number {
  if (level >= 48) return 4.5;
  if (level >= 44) return 4.0;
  if (level >= 30) return 3.5;
  return 3.0;
}

/**
 * クリアランクに応じた精度補正（省エネ補正）
 */
export function calculateAccuracyFactor(clearRank: string): number {
  const rank = (clearRank || '').toUpperCase().trim();
  if (rank === 'S+' || rank === 'S') return 0.90;
  if (rank === 'A+' || rank === 'A') return 0.95;
  if (rank === 'B' || rank === 'C') return 1.00;
  return 1.05;
}

/**
 * フラットな性別指標に応じた生理学的補正係数
 */
export function calculateGenderFactor(gender?: 'male' | 'female' | 'other' | 'unspecified'): number {
  if (gender === 'male') return 1.00;
  if (gender === 'female') return 0.92;
  return 0.96; // 'other' または 'unspecified'
}

/**
 * 年齢に応じた代謝減衰補正係数
 */
export function calculateAgeFactor(age: number | null): number {
  if (age === null || !Number.isFinite(age)) return 1.00;
  if (age < 18) return 1.02;
  if (age >= 18 && age < 30) return 1.00;
  if (age >= 30 && age < 40) return 0.97;
  if (age >= 40 && age < 50) return 0.94;
  if (age >= 50 && age < 60) return 0.91;
  return 0.87; // 60歳以上
}

/**
 * 消費カロリー (kcal) 計算
 */
export function calculateCalories(input: CalorieInput): CalorieResult {
  const mets = calculateMets(input.level);
  const accuracyFactor = calculateAccuracyFactor(input.clearRank);
  const genderFactor = calculateGenderFactor(input.gender);
  const age = calculateAgeFromBirth(input.birthYearMonth);
  const ageFactor = calculateAgeFactor(age);
  const durationSec = input.songDurationSec ?? 125;

  const rawCalories =
    mets * input.weightKg * (durationSec / 3600) * 1.05 * accuracyFactor * genderFactor * ageFactor;
  const calories = Number(rawCalories.toFixed(1));

  return {
    mets,
    accuracyFactor,
    genderFactor,
    ageFactor,
    age,
    calories,
  };
}
