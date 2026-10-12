'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, PlayRecord } from '@/db/db';
import { useState, useEffect } from 'react';
import { recognizeResultWithGemini } from '@/utils/geminiParser';
import { calculateCalories } from '@/utils/calorieCalculator';

export function usePendingRecords() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 未解析 (pending) レコードのリアクティブクエリ
  const pendingRecords = useLiveQuery(
    async () => {
      if (!isClient) return [];
      return await db.playRecords
        .filter((r) => r.status === 'pending')
        .toArray();
    },
    [isClient],
    []
  );

  /**
   * 未解析の記録1件を Gemini Vision AI で解析し、completed に更新する
   */
  const processPendingRecord = async (record: PlayRecord, apiKey: string, weightKg: number) => {
    if (!record.id || !record.imageThumbnail) return;

    const parsed = await recognizeResultWithGemini({
      apiKey,
      imageSource: record.imageThumbnail,
    });

    const calorieCalc = calculateCalories({
      level: parsed.level,
      clearRank: parsed.clearRank,
      weightKg,
    });

    await db.playRecords.update(record.id, {
      songName: parsed.songName,
      level: parsed.level,
      cool: parsed.cool,
      great: parsed.great,
      good: parsed.good,
      bad: parsed.bad,
      totalNotes: parsed.totalNotes,
      clearRank: parsed.clearRank,
      mets: calorieCalc.mets,
      accuracyFactor: calorieCalc.accuracyFactor,
      calories: calorieCalc.calories,
      status: 'completed',
    });
  };

  /**
   * 未解析のプレイ記録を削除
   */
  const deletePendingRecord = async (id: number) => {
    await db.playRecords.delete(id);
  };

  return {
    pendingRecords: pendingRecords ?? [],
    pendingCount: (pendingRecords ?? []).length,
    processPendingRecord,
    deletePendingRecord,
    isLoading: isClient && pendingRecords === undefined,
  };
}
