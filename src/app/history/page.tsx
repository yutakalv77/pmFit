'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, PlayRecord } from '@/db/db';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePendingRecords } from '@/hooks/usePendingRecords';
import {
  History as HistoryIcon,
  Search,
  Trash2,
  Camera,
  ChevronLeft,
  Sparkles,
  Flame,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

export default function HistoryPage() {
  const { profile } = useUserProfile();
  const { processPendingRecord, deletePendingRecord } = usePendingRecords();
  const [isClient, setIsClient] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 全履歴のライブクエリ
  const records = useLiveQuery(
    async () => {
      if (!isClient) return [];
      return await db.playRecords.orderBy('playedAt').reverse().toArray();
    },
    [isClient],
    []
  );

  // 検索キーワードフィルタリング
  const filteredRecords = (records ?? []).filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      r.songName.toLowerCase().includes(q) ||
      r.clearRank.toLowerCase().includes(q) ||
      String(r.level).includes(q)
    );
  });

  // 個別削除ハンドラー
  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (confirm('このプレイ記録を完全に削除しますか？')) {
      await db.playRecords.delete(id);
    }
  };

  // 全履歴一括削除ハンドラー
  const handleClearAllHistory = async () => {
    if (confirm('すべてのプレイ履歴を削除しますか？この操作は取り消せません。')) {
      await db.playRecords.clear();
    }
  };

  // 単体未解析アイテムの個別AI解析
  const handleSinglePendingAnalyze = async (record: PlayRecord) => {
    if (!profile?.geminiApiKey) {
      alert('未解析データをAI解析するには、設定画面で Gemini API Key を登録してください。');
      return;
    }
    if (!record.id) return;

    setProcessingId(record.id);
    try {
      await processPendingRecord(record, profile.geminiApiKey, profile.weight || 65);
    } catch (err: any) {
      alert(`AI解析エラー: ${err.message || '解析に失敗しました。'}`);
    } finally {
      setProcessingId(null);
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-sm text-pink-400 font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 animate-spin" /> プレイ履歴を読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-pink-400 font-semibold mb-2 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> ダッシュボードに戻る
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text-pop flex items-center gap-3">
            <HistoryIcon className="w-8 h-8 text-pink-500" />
            全プレイ履歴 & データ管理
          </h1>
        </div>

        {records && records.length > 0 && (
          <button
            onClick={handleClearAllHistory}
            className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> 履歴を一括削除
          </button>
        )}
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="楽曲名・難易度 (例: 48)・ランク (例: S) で検索..."
          className="w-full pl-12 pr-4 py-3 rounded-2xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 text-sm"
        />
      </div>

      {/* History Items List */}
      {filteredRecords.length > 0 ? (
        <div className="space-y-3">
          {filteredRecords.map((rec) => {
            const dateObj = new Date(rec.playedAt);
            const dateStr = `${dateObj.getFullYear()}/${dateObj.getMonth() + 1}/${dateObj.getDate()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
            const isPending = rec.status === 'pending';
            const isAnalyzingThis = processingId === rec.id;

            return (
              <div
                key={rec.id}
                className={`glass-card rounded-2xl p-4 border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isPending
                    ? 'border-yellow-500/40 bg-yellow-500/5'
                    : 'border-white/10 hover:border-pink-500/40'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                  {rec.imageThumbnail ? (
                    <img
                      src={rec.imageThumbnail}
                      alt="Thumbnail"
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center font-extrabold text-base flex-shrink-0">
                      Lv{rec.level}
                    </div>
                  )}

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-white truncate">
                        {rec.songName || '未解析プレイ記録'}
                      </span>
                      {isPending ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3 animate-pulse" /> 未解析下書き
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold">
                          Lv {rec.level}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>クリアランク: <strong className="text-white">{rec.clearRank}</strong></span>
                      <span>COOL: {rec.cool}</span>
                      <span>GREAT: {rec.great}</span>
                      <span>GOOD: {rec.good}</span>
                      <span>BAD: {rec.bad}</span>
                      <span>総ノーツ: {rec.totalNotes}</span>
                    </div>

                    <div className="text-[11px] text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Played at {dateStr}
                    </div>
                  </div>
                </div>

                {/* Right Side Stats & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/10">
                  {/* 未解析アイテムの場合は個別AI解析ボタンを表示 */}
                  {isPending && (
                    <button
                      onClick={() => handleSinglePendingAnalyze(rec)}
                      disabled={isAnalyzingThis}
                      className="px-3.5 py-2 rounded-xl gradient-btn-primary text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                    >
                      {isAnalyzingThis ? (
                        <Sparkles className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                      )}
                      {isAnalyzingThis ? 'AI解析中...' : '個別にAI解析'}
                    </button>
                  )}

                  <div className="text-right">
                    <div className="text-lg font-extrabold text-pink-400">
                      {rec.calories} <span className="text-xs font-normal">kcal</span>
                    </div>
                    <div className="text-[10px] text-gray-400">METs: {rec.mets} (×{rec.accuracyFactor})</div>
                  </div>

                  <button
                    onClick={() => handleDelete(rec.id)}
                    className="p-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="削除"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-white/5 text-gray-400 flex items-center justify-center mx-auto">
            <HistoryIcon className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">該当するプレイ履歴が見つかりませんでした</h3>
            <p className="text-xs text-gray-400 mt-1">検索条件を変更するか、新しいリザルト画像を保存してください。</p>
          </div>
        </div>
      )}
    </div>
  );
}
