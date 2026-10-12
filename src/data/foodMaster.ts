export interface FoodItem {
  id: string;
  name: string;
  calories: number; // kcal
  unit: string;     // 杯, 個, 本, つ, etc.
  icon: string;     // emoji or icon name
  description: string;
}

export const FOOD_MASTER: FoodItem[] = [
  {
    id: 'ramen',
    name: '醤油ラーメン',
    calories: 500,
    unit: '杯',
    icon: '🍜',
    description: 'ガッツリ運動した後の至福の一杯'
  },
  {
    id: 'onigiri',
    name: 'おにぎり',
    calories: 170,
    unit: '個',
    icon: '🍙',
    description: '手軽に補給できる定番エナジー'
  },
  {
    id: 'tirol',
    name: 'チロルチョコ',
    calories: 30,
    unit: '個',
    icon: '🍫',
    description: 'ちょっとした甘みと打鍵のエネルギー'
  },
  {
    id: 'beer',
    name: '生ビール (中ジョッキ)',
    calories: 140,
    unit: '杯',
    icon: '🍺',
    description: 'クリア後の美味しい一杯'
  },
  {
    id: 'pancake',
    name: 'パンケーキ',
    calories: 350,
    unit: '皿',
    icon: '🥞',
    description: 'ふわふわのデザート'
  },
  {
    id: 'fries',
    name: 'フライドポテト',
    calories: 450,
    unit: 'パック',
    icon: '🍟',
    description: 'ついつい手が伸びる塩分＆油分'
  },
  {
    id: 'tapioca',
    name: 'タピオカミルクティー',
    calories: 320,
    unit: '杯',
    icon: '🧋',
    description: 'ご褒美モチモチドリンク'
  },
  {
    id: 'energy_drink',
    name: 'エナジードリンク',
    calories: 110,
    unit: '缶',
    icon: '⚡',
    description: '集中力アップの相棒'
  }
];

export interface FoodConversionResult {
  food: FoodItem;
  count: number; // 換算数 (小数点第1位まで)
}

/**
 * 消費カロリーを各食べ物に換算した結果のリストを返します
 */
export function convertCaloriesToFoods(calories: number): FoodConversionResult[] {
  const cleanCalories = Number.isFinite(calories) && calories > 0 ? calories : 0;

  return FOOD_MASTER.map((food) => {
    const rawCount = cleanCalories / food.calories;
    const roundedCount = Number(rawCount.toFixed(1));
    return {
      food,
      count: roundedCount,
    };
  });
}
