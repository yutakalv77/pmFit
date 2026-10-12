'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, PlayRecord } from '@/db/db';
import { useUserProfile } from '@/hooks/useUserProfile';
import { calculateDashboardStats } from '@/utils/statsCalculator';
import { convertCaloriesToFoods } from '@/data/foodMaster';
import {
  Flame,
  Camera,
  Trophy,
  TrendingUp,
  Calendar,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Award,
  Zap,
  Utensils,
  Plus,
} from 'lucide-react';

export default function DashboardPage() {
  const { profile } = useUserProfile();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // プレイ履歴のリアクティブクエリ
  const records = useLiveQuery(
    async () => {
      if (!isClient) return [];
      return await db.playRecords.orderBy('playedAt').reverse().toArray();
    },
    [isClient],
    []
  );

  const dailyTarget = profile?.dailyCalorieTarget ?? 500;
  const stats = calculateDashboardStats(records ?? [], dailyTarget);
  const foodConversions = convertCaloriesToFoods(stats.todayCalories);

  // レコード削除ハンドラー
  const handleDeleteRecord = async (id?: number) => {
    if (!id) return;
    if (confirm('このプレイ記録を削除しますか？')) {
      await db.playRecords.delete(id);
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-sm text-pink-400 font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 animate-spin" /> ダッシュボードをロード中...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
      {/* Top Banner & Quick OCR Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-semibold border border-pink-500/30 mb-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            ポップンミュージック カロリーダッシュボード
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text-pop">
            今日のフィットネス状況
          </h1>
        </div>

        <Link
          href="/ocr"
          className="px-5 py-3 rounded-2xl gradient-btn-primary text-white font-bold text-sm flex items-center gap-2.5 shadow-lg shadow-pink-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Camera className="w-4 h-4 text-yellow-300" />
          リザルト画面を撮影・解析
        </Link>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Today's Goal Ring & Food Equivalents (5 Cols) */}
        <div className="md:col-span-5 space-y-6">
          {/* Today's Calorie Progress Ring Card */}
          <div className="glass-card rounded-2xl p-6 border border-pink-500/30 gradient-bg-accent relative overflow-hidden space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 animate-pulse" /> 本日の目標達成度
              </span>
              <span className="text-xs text-gray-400 font-semibold">
                目標: <strong className="text-white">{dailyTarget} kcal</strong>
              </span>
            </div>

            {/* Circular Progress Gauge */}
            <div className="flex flex-col items-center justify-center relative py-2">
              <div className="relative w-44 h-44 flex items-center justify-center">
                {/* SVG Progress Circle */}
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-black/40"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-pink-500 transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (251.2 * stats.todayGoalPercent) / 100}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-white tracking-tight">
                    {stats.todayCalories}
                  </span>
                  <span className="text-xs font-bold text-pink-400">/ {dailyTarget} kcal</span>
                  <span className="text-[11px] text-yellow-400 font-extrabold mt-1">
                    {stats.todayGoalPercent}% 達成
                  </span>
                </div>
              </div>

              {stats.todayGoalAchieved && (
                <div className="mt-3 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 animate-bounce">
                  <CheckCircle2 className="w-4 h-4" /> 本日の目標カロリー達成！
                </div>
              )}
            </div>

            {/* Food Conversions Grid */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>本日の食べ物換算</span>
                <span className="text-[10px] text-gray-400">運動で相殺したカロリー</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {foodConversions.slice(0, 4).map(({ food, count }) => (
                  <div key={food.id} className="p-2.5 rounded-xl bg-black/40 text-center">
                    <div className="text-xl mb-0.5">{food.icon}</div>
                    <div className="text-[11px] text-gray-400 truncate">{food.name}</div>
                    <div className="text-sm font-extrabold text-yellow-400">
                      {count} <span className="text-[10px] text-gray-400">{food.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Summary Numbers */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-xl p-4 border border-white/10 text-center">
              <div className="text-xs text-gray-400 font-semibold mb-1">累計消費カロリー</div>
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {stats.totalCaloriesAllTime} <span className="text-xs text-pink-400">kcal</span>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4 border border-white/10 text-center">
              <div className="text-xs text-gray-400 font-semibold mb-1">ラーメン換算</div>
              <div className="text-2xl font-extrabold text-yellow-400 tracking-tight">
                {stats.totalRamenCount} <span className="text-xs text-gray-300">杯分</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 7-Day Weekly Trend Chart & Badges (7 Cols) */}
        <div className="md:col-span-7 space-y-6">
          {/* 7-Day Weekly Trend Chart Card */}
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                過去7日間のカロリートレンド
              </h2>
              <span className="text-xs text-gray-400">目標: {dailyTarget} kcal</span>
            </div>

            {/* Bar Chart Visual */}
            <div className="h-44 pt-6 pb-2 flex items-end justify-between gap-2 border-b border-white/10 relative">
              {/* Target Line */}
              <div className="absolute inset-x-0 top-12 border-b border-dashed border-pink-500/40 z-0 flex items-center justify-end">
                <span className="text-[10px] text-pink-400 bg-black/60 px-1.5 rounded -mt-4">
                  目標線
                </span>
              </div>

              {stats.weeklySummaries.map((day) => {
                const maxVal = Math.max(dailyTarget * 1.2, 600);
                const heightPercent = Math.min(100, Math.round((day.totalCalories / maxVal) * 100));

                return (
                  <div key={day.dateStr} className="flex-1 flex flex-col items-center gap-2 z-10 group">
                    <div className="text-[10px] font-bold text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">
                      {day.totalCalories}
                    </div>
                    <div className="w-full max-w-[28px] bg-black/40 h-28 rounded-t-lg relative flex items-end overflow-hidden">
                      <div
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          day.isGoalAchieved
                            ? 'bg-gradient-to-t from-pink-500 to-yellow-400'
                            : 'bg-gradient-to-t from-cyan-600 to-cyan-400'
                        }`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-semibold text-gray-400">{day.displayDate}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievement Badges Card */}
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" />
                獲得実績バッジ
              </h2>
              <span className="text-xs text-gray-400">
                {stats.badges.filter((b) => b.isUnlocked).length} / {stats.badges.length} 解放
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stats.badges.map((badge) => (
                <div
                  key={badge.id}
                  className={`p-3 rounded-xl border flex items-start gap-3 transition-all ${
                    badge.isUnlocked
                      ? 'bg-gradient-to-r from-yellow-500/10 to-pink-500/10 border-yellow-500/40 text-white'
                      : 'bg-black/30 border-white/5 opacity-50'
                  }`}
                >
                  <div className="text-2xl p-2 rounded-xl bg-black/40 flex-shrink-0">{badge.icon}</div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-xs font-bold truncate flex items-center gap-1">
                      {badge.title}
                      {badge.isUnlocked && <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400 inline" />}
                    </div>
                    <div className="text-[10px] text-gray-400 leading-tight">{badge.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Play Records History List Section */}
      <div className="glass-card rounded-2xl p-6 space-y-4 border border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-pink-500" />
            最近のプレイ記録
          </h2>
          <Link href="/history" className="text-xs text-pink-400 hover:text-pink-300 font-semibold flex items-center gap-1">
            全履歴を見る <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {records && records.length > 0 ? (
          <div className="space-y-3">
            {records.slice(0, 5).map((rec) => {
              const dateObj = new Date(rec.playedAt);
              const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
              const isPending = rec.status === 'pending';

              return (
                <div
                  key={rec.id}
                  className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {rec.imageThumbnail ? (
                      <img
                        src={rec.imageThumbnail}
                        alt="Thumbnail"
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-extrabold text-sm flex-shrink-0">
                        Lv{rec.level}
                      </div>
                    )}

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white truncate">
                          {rec.songName || '未解析プレイ記録'}
                        </span>
                        {isPending ? (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-[10px] font-bold">
                            未解析下書き
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-bold">
                            Lv {rec.level}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>ランク: <strong className="text-white">{rec.clearRank}</strong></span>
                        <span>COOL: {rec.cool} / GREAT: {rec.great}</span>
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-base font-extrabold text-pink-400">
                        {rec.calories} <span className="text-xs font-normal">kcal</span>
                      </div>
                      <div className="text-[10px] text-gray-400">METs: {rec.mets}</div>
                    </div>

                    <button
                      onClick={() => handleDeleteRecord(rec.id)}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="この記録を削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <div className="w-12 h-12 rounded-full bg-white/5 text-gray-400 flex items-center justify-center mx-auto">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-400">プレイ記録がまだありません。</p>
            <Link
              href="/ocr"
              className="inline-flex items-center gap-2 text-xs font-bold text-pink-400 hover:underline"
            >
              <Plus className="w-4 h-4" /> 最初のリザルト画面を撮影する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
