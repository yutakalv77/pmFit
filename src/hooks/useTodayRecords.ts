'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, PlayRecord } from '@/db/db';
import { useState, useEffect } from 'react';

export function useTodayRecords() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const records = useLiveQuery(
    async () => {
      if (!isClient) return [];
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      return await db.playRecords
        .filter((r) => new Date(r.playedAt) >= startOfDay)
        .toArray();
    },
    [isClient],
    []
  );

  const totalCalories = (records ?? []).reduce((sum, r) => sum + r.calories, 0);
  const totalNotes = (records ?? []).reduce((sum, r) => sum + r.totalNotes, 0);

  return {
    records: records ?? [],
    totalCalories,
    totalNotes,
    playCount: (records ?? []).length,
    isLoading: isClient && records === undefined,
  };
}
