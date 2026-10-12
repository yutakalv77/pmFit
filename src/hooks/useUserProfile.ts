'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { db, getOrCreateUserProfile, updateUserProfile, UserProfile } from '@/db/db';
import { useState, useEffect } from 'react';

export function useUserProfile() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // 初期データが存在しなければ作成
    getOrCreateUserProfile().catch((err) => {
      console.error('Failed to initialize user profile:', err);
    });
  }, []);

  const profile = useLiveQuery(
    async () => {
      if (!isClient) return null;
      return await db.userProfiles.toCollection().first();
    },
    [isClient],
    null
  );

  return {
    profile: profile ?? {
      weight: 65,
      height: 170,
      dailyCalorieTarget: 500,
      updatedAt: new Date().toISOString(),
    },
    isLoading: isClient && profile === null,
    updateProfile: updateUserProfile,
  };
}
