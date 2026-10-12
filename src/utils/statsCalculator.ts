import { PlayRecord } from '@/db/db';
import { convertCaloriesToFoods } from '@/data/foodMaster';

export interface DailyCalorieSummary {
  dateStr: string; // "YYYY-MM-DD"
  displayDate: string; // "8/13"
  totalCalories: number;
  playCount: number;
  targetCalorie: number;
  isGoalAchieved: boolean;
}

export interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  progressPercent: number;
}

export interface DashboardStats {
  todayCalories: number;
  todayPlayCount: number;
  todayGoalAchieved: boolean;
  todayGoalPercent: number;
  totalCaloriesAllTime: number;
  totalPlayCountAllTime: number;
  totalRamenCount: number;
  weeklySummaries: DailyCalorieSummary[];
  badges: BadgeItem[];
}

/**
 * "YYYY-MM-DD" フォーマットの日付文字列取得ヘルパー
 */
export function formatDateKey(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * 過去7日間の日付キー配列を取得
 */
export function getPast7DaysKeys(currentDate = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - i);
    keys.push(formatDateKey(d));
  }
  return keys;
}

/**
 * プレイ履歴一覧と目標カロリーからダッシュボード統計データを計算
 */
export function calculateDashboardStats(
  records: PlayRecord[] = [],
  dailyTargetCalorie = 500,
  currentDate = new Date()
): DashboardStats {
  const safeRecords = Array.isArray(records) ? records : [];
  const cleanTarget = Math.max(50, Math.min(10000, Number(dailyTargetCalorie) || 500));
  const todayKey = formatDateKey(currentDate);
  const past7Keys = getPast7DaysKeys(currentDate);

  let todayCalories = 0;
  let todayPlayCount = 0;
  let totalCaloriesAllTime = 0;

  const dailyMap: Record<string, { calories: number; count: number }> = {};

  for (const r of safeRecords) {
    if (!r || r.status === 'pending') continue; // 未解析下書きは集計除外

    const cal = Number.isFinite(r.calories) && r.calories > 0 ? r.calories : 0;
    totalCaloriesAllTime += cal;

    const recordDate = r.playedAt ? new Date(r.playedAt) : new Date();
    const dateKey = formatDateKey(recordDate);

    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { calories: 0, count: 0 };
    }
    dailyMap[dateKey].calories += cal;
    dailyMap[dateKey].count += 1;

    if (dateKey === todayKey) {
      todayCalories += cal;
      todayPlayCount += 1;
    }
  }

  todayCalories = Number(todayCalories.toFixed(1));
  totalCaloriesAllTime = Number(totalCaloriesAllTime.toFixed(1));

  const todayGoalPercent = Math.min(100, Math.round((todayCalories / cleanTarget) * 100));
  const todayGoalAchieved = todayCalories >= cleanTarget;

  // 過去7日間のトレンド集計
  const weeklySummaries: DailyCalorieSummary[] = past7Keys.map((key) => {
    const entry = dailyMap[key] || { calories: 0, count: 0 };
    const cals = Number(entry.calories.toFixed(1));
    const [_, m, d] = key.split('-');
    return {
      dateStr: key,
      displayDate: `${parseInt(m, 10)}/${parseInt(d, 10)}`,
      totalCalories: cals,
      playCount: entry.count,
      targetCalorie: cleanTarget,
      isGoalAchieved: cals >= cleanTarget,
    };
  });

  // ラーメン杯数換算 (500kcal = 1杯)
  const totalRamenCount = Number((totalCaloriesAllTime / 500).toFixed(1));

  // バッジ判定計算
  const badges = calculateBadges(safeRecords, totalCaloriesAllTime, totalRamenCount, todayPlayCount);

  return {
    todayCalories,
    todayPlayCount,
    todayGoalAchieved,
    todayGoalPercent,
    totalCaloriesAllTime,
    totalPlayCountAllTime: safeRecords.filter((r) => r && r.status !== 'pending').length,
    totalRamenCount,
    weeklySummaries,
    badges,
  };
}

/**
 * 累計データに応じた達成バッジの算出
 */
export function calculateBadges(
  records: PlayRecord[],
  totalCalories: number,
  totalRamen: number,
  todayPlayCount: number
): BadgeItem[] {
  const safeRecords = Array.isArray(records) ? records : [];
  const completedRecords = safeRecords.filter((r) => r && r.status !== 'pending');
  const maxLevelPlayed = completedRecords.reduce((max, r) => Math.max(max, r.level || 0), 0);

  return [
    {
      id: 'first_play',
      title: 'ポップンフィットデビュー',
      description: '初めてのリザルト画面を保存した',
      icon: '🎮',
      isUnlocked: completedRecords.length >= 1,
      progressPercent: Math.min(100, (completedRecords.length / 1) * 100),
    },
    {
      id: 'calorie_1000',
      title: 'カロリーファイター',
      description: '累計 1,000 kcal の消費を達成した',
      icon: '🔥',
      isUnlocked: totalCalories >= 1000,
      progressPercent: Math.min(100, Math.round((totalCalories / 1000) * 100)),
    },
    {
      id: 'ramen_5',
      title: 'ラーメンマスター',
      description: '累計 5 杯分のカロリーを消費した',
      icon: '🍜',
      isUnlocked: totalRamen >= 5,
      progressPercent: Math.min(100, Math.round((totalRamen / 5) * 100)),
    },
    {
      id: 'high_level',
      title: '高難易度チャレンジャー',
      description: 'Lv 45 以上の高難易度譜面をクリア保存した',
      icon: '⚡',
      isUnlocked: maxLevelPlayed >= 45,
      progressPercent: maxLevelPlayed >= 45 ? 100 : Math.round((maxLevelPlayed / 45) * 100),
    },
    {
      id: 'marathon',
      title: '音ゲーマーソン',
      description: '1日に 5 曲以上プレイ保存した',
      icon: '🏃',
      isUnlocked: todayPlayCount >= 5,
      progressPercent: Math.min(100, Math.round((todayPlayCount / 5) * 100)),
    },
  ];
}
