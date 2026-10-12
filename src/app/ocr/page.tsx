'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserProfile } from '@/hooks/useUserProfile';
import { usePendingRecords } from '@/hooks/usePendingRecords';
import { parseOcrText, OcrResultData } from '@/utils/ocrParser';
import { recognizeResultWithGemini } from '@/utils/geminiParser';
import { processResultImage } from '@/utils/imagePreprocessor';
import { validateImageFile } from '@/utils/imageValidation';
import { compressImageForMobile } from '@/utils/imageCompressor';
import { calculateCalories } from '@/utils/calorieCalculator';
import { convertCaloriesToFoods } from '@/data/foodMaster';
import { db } from '@/db/db';
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Flame,
  Utensils,
  Save,
  FileImage,
  Sparkles,
  Key,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  WifiOff,
  Zap,
  Clock,
  Trash2,
  HelpCircle,
  Play,
} from 'lucide-react';

export default function OcrPage() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const { pendingRecords, pendingCount, processPendingRecord, deletePendingRecord } = usePendingRecords();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [pendingFileOrUrl, setPendingFileOrUrl] = useState<File | string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // 一括解析の確認ダイアログステート
  const [showBatchConfirmModal, setShowBatchConfirmModal] = useState(false);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchSuccessNotice, setBatchSuccessNotice] = useState(false);

  // モード2用の単体確認ダイアログステート
  const [showSingleConfirmModal, setShowSingleConfirmModal] = useState(false);

  const [imageError, setImageError] = useState<string | null>(null);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // 解析結果ステート
  const [result, setResult] = useState<OcrResultData>({
    songName: '',
    level: 40,
    cool: 0,
    great: 0,
    good: 0,
    bad: 0,
    totalNotes: 0,
    clearRank: 'A',
    rawText: '',
  });

  const hasApiKey = Boolean(profile?.geminiApiKey && profile.geminiApiKey.trim().length > 0);
  const autoStartMode = profile?.ocrAutoStartMode ?? 1; // 1: 即時自動, 2: ダイアログ確認, 3: なし

  // 解析処理の実行本体
  const executeAnalysis = async (fileOrUrl: File | string) => {
    setAnalyzing(true);
    setProgressPercent(10);
    setSavedSuccess(false);

    try {
      // 1. スマホ超軽量圧縮
      setProgressStatus('スマホ通信用に軽量圧縮中...');
      const compressed = await compressImageForMobile(fileOrUrl, 1000, 0.75);
      setImagePreview(compressed.compressedDataUrl);

      const origKb = (compressed.originalSizeBytes / 1024).toFixed(0);
      const compKb = (compressed.compressedSizeBytes / 1024).toFixed(0);
      if (compressed.originalSizeBytes > 0) {
        setCompressionInfo(`画像軽量化: ${origKb}KB → ${compKb}KB (微弱電波モード最適化済)`);
      }

      // 2. 解析処理
      const processed = await processResultImage(compressed.compressedDataUrl);

      if (hasApiKey) {
        setProgressStatus('Gemini Vision AI で高精度自動解析中...');
        setProgressPercent(50);

        try {
          const geminiResult = await recognizeResultWithGemini({
            apiKey: profile!.geminiApiKey!,
            imageSource: processed.fullTextUrl,
            timeoutMs: 10000,
          });
          setProgressPercent(100);
          setResult(geminiResult);
        } catch (geminiErr: any) {
          console.warn('Gemini API 失敗。通信環境の確認が必要です:', geminiErr);
          setFallbackNotice(
            `⚠️ 通信状態がオフラインまたはエラーのためAI解析ができませんでした。そのまま「このプレイ記録を保存する」を押して下書き保存し、電波の良い場所で一括解析してください。`
          );
        }
      } else {
        setFallbackNotice('Gemini API Key が未設定です。画像をそのまま下書き保存するか、手動で数値を入力してください。');
      }
    } catch (err: any) {
      console.error('Image process failed:', err);
      setImageError(err.message || '画像の読み込み処理中にエラーが発生しました。');
    } finally {
      setAnalyzing(false);
      setShowSingleConfirmModal(false);
    }
  };

  // アップロード・ドロップ受け取り
  const handleImageProcess = async (fileOrUrl: File | string) => {
    setImageError(null);
    setFallbackNotice(null);
    setCompressionInfo(null);

    if (fileOrUrl instanceof File) {
      const fileVal = validateImageFile(fileOrUrl);
      if (!fileVal.isValid) {
        setImageError(fileVal.error || '画像ファイルが無効です。');
        return;
      }
    }

    setPendingFileOrUrl(fileOrUrl);

    // プレビューの作成
    if (typeof fileOrUrl === 'string') {
      setImagePreview(fileOrUrl);
    } else {
      setImagePreview(URL.createObjectURL(fileOrUrl));
    }

    // モード別の判定分岐
    if (autoStartMode === 1) {
      await executeAnalysis(fileOrUrl);
    } else if (autoStartMode === 2) {
      setShowSingleConfirmModal(true);
    } else {
      setCompressionInfo('画像のアップロードが完了しました。手動で解析を開始してください。');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageProcess(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageProcess(e.dataTransfer.files[0]);
    }
  };

  const adjustValue = (field: 'cool' | 'great' | 'good' | 'bad' | 'level', delta: number) => {
    setResult((prev) => {
      let current = Number(prev[field]) || 0;
      let nextVal = Math.max(0, current + delta);
      if (field === 'level') {
        nextVal = Math.min(50, Math.max(1, nextVal));
      } else {
        nextVal = Math.min(3500, nextVal);
      }
      const updated = { ...prev, [field]: nextVal };
      const c = Number(updated.cool) || 0;
      const g = Number(updated.great) || 0;
      const gd = Number(updated.good) || 0;
      const b = Number(updated.bad) || 0;
      updated.totalNotes = c + g + gd + b;
      return updated;
    });
    setSavedSuccess(false);
  };

  const handleResultChange = (field: keyof OcrResultData, value: any) => {
    setResult((prev) => {
      const next = { ...prev, [field]: value };
      if (['cool', 'great', 'good', 'bad'].includes(field)) {
        const c = Number(next.cool) || 0;
        const g = Number(next.great) || 0;
        const gd = Number(next.good) || 0;
        const b = Number(next.bad) || 0;
        next.totalNotes = c + g + gd + b;
      }
      return next;
    });
    setSavedSuccess(false);
  };

  // カロリー動的試算
  const weightKg = profile?.weight ?? 65;
  const calorieCalc = calculateCalories({
    level: result.level,
    clearRank: result.clearRank,
    weightKg,
    gender: profile?.gender,
    birthYearMonth: profile?.birthYearMonth,
  });

  const foodConversions = convertCaloriesToFoods(calorieCalc.calories);

  // 一括解析確認モーダルオープン
  const handleOpenBatchConfirm = () => {
    if (!hasApiKey) {
      alert('未解析の記録を一括解析するには、設定画面で Gemini API Key を登録してください。');
      return;
    }
    setShowBatchConfirmModal(true);
  };

  // 一括解析の実行
  const handleExecuteBatchProcess = async () => {
    setShowBatchConfirmModal(false);
    setBatchAnalyzing(true);

    try {
      for (const rec of pendingRecords) {
        try {
          await processPendingRecord(rec, profile!.geminiApiKey!, weightKg);
        } catch (itemErr) {
          console.error(`Failed to process pending record #${rec.id}:`, itemErr);
        }
      }
      setBatchSuccessNotice(true);
      setTimeout(() => setBatchSuccessNotice(false), 3500);
    } finally {
      setBatchAnalyzing(false);
    }
  };

  // 通常保存 (解析完了か未解析 pending かを判定して保存)
  const handleSavePlayRecord = async () => {
    try {
      const isPending = !result.songName || result.songName.trim() === '';
      await db.playRecords.add({
        songName: result.songName || '未解析プレイ記録',
        level: result.level,
        cool: result.cool,
        great: result.great,
        good: result.good,
        bad: result.bad,
        totalNotes: result.totalNotes,
        clearRank: result.clearRank,
        mets: calorieCalc.mets,
        accuracyFactor: calorieCalc.accuracyFactor,
        calories: calorieCalc.calories,
        imageThumbnail: imagePreview ?? undefined,
        status: isPending ? 'pending' : 'completed',
        playedAt: new Date().toISOString(),
      });
      setSavedSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 1500);
    } catch (err) {
      console.error('Failed to save play record:', err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20 px-1 sm:px-0 relative">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-400 text-xs font-semibold border border-pink-500/30 mb-2">
          <Zap className="w-3.5 h-3.5 text-yellow-400" />
          {hasApiKey ? 'Gemini AI ＆ 地下ゲーセン後で解析対応モード' : '完全オフライン PWA モード'}
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight gradient-text-pop flex items-center gap-3">
          <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-pink-500" />
          リザルト画面AI解析 & カロリー試算
        </h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">
          写真撮影で解析。設定に応じたタイミング（即時 / 確認ダイアログ / 手動）で解析を開始できます。
        </p>
      </div>

      {/* 未解析キュー案内バナー */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-2xl glass-card border border-yellow-500/40 bg-yellow-500/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                未解析の写真が <strong className="text-yellow-400 text-base">{pendingCount}</strong> 件保留されています
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                電波が良い場所で「AI一括解析」を押すと、確認ダイアログのうえまとめてAI解読できます。
              </p>
            </div>
          </div>

          <button
            onClick={handleOpenBatchConfirm}
            disabled={batchAnalyzing}
            className="px-4 py-2.5 rounded-xl gradient-btn-primary text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap shadow-lg shadow-pink-500/20"
          >
            {batchAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 text-yellow-300" />
            )}
            未解析の{pendingCount}件をAI一括解析
          </button>
        </div>
      )}

      {/* 一括解析の確認ダイアログモーダル */}
      {showBatchConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel rounded-2xl max-w-md w-full p-6 space-y-5 border border-pink-500/40 shadow-2xl">
            <div className="flex items-center gap-3 text-yellow-400">
              <HelpCircle className="w-7 h-7 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">未解析データの一括AI解析</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              保留中の写真 <strong className="text-yellow-400">{pendingCount} 件</strong> を Gemini Vision AI
              でまとめて100%全自動解析しますか？
            </p>

            <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs text-gray-400">
              <div>• 対象件数: <strong className="text-white">{pendingCount} 件</strong></div>
              <div>• 使用モデル: <strong className="text-cyan-400">Gemini 2.0 Flash</strong></div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowBatchConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleExecuteBatchProcess}
                className="px-5 py-2.5 rounded-xl gradient-btn-primary text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                OK (一括解析を開始)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* モード2用の単体アップロード確認ダイアログモーダル */}
      {showSingleConfirmModal && pendingFileOrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel rounded-2xl max-w-md w-full p-6 space-y-5 border border-pink-500/40 shadow-2xl">
            <div className="flex items-center gap-3 text-pink-400">
              <HelpCircle className="w-7 h-7 flex-shrink-0" />
              <h3 className="text-lg font-bold text-white">画像解析の開始確認</h3>
            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              画像のアップロードが完了しました。この画像を AI 解析しますか？
            </p>

            {imagePreview && (
              <div className="w-full h-40 rounded-xl overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Target image preview" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSingleConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={() => executeAnalysis(pendingFileOrUrl)}
                className="px-5 py-2.5 rounded-xl gradient-btn-primary text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-4 h-4 text-yellow-300" />
                OK (解析を開始する)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {batchSuccessNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>未解析データの Gemini AI 一括解析および保存が完了しました！</span>
        </div>
      )}

      {compressionInfo && (
        <div className="p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
          <Zap className="w-4 h-4 flex-shrink-0 text-cyan-400" />
          <span>{compressionInfo}</span>
        </div>
      )}

      {fallbackNotice && (
        <div className="p-3 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-xs flex items-center gap-2">
          <WifiOff className="w-4 h-4 flex-shrink-0 text-yellow-400" />
          <span>{fallbackNotice}</span>
        </div>
      )}

      {imageError && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{imageError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Dropzone */}
        <div className="lg:col-span-5 space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-card rounded-2xl p-6 text-center cursor-pointer transition-all border-2 border-dashed flex flex-col items-center justify-center min-h-[240px] sm:min-h-[280px] relative overflow-hidden ${
              isDragOver
                ? 'border-pink-500 bg-pink-500/10 scale-[1.02]'
                : 'border-white/20 hover:border-pink-500/50 hover:bg-white/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />

            {imagePreview ? (
              <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden group">
                <img src={imagePreview} alt="Result preview" className="w-full h-full object-cover rounded-xl" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-2">
                  <Upload className="w-4 h-4" /> 写真を撮る / 再選択
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-pink-500/20 text-pink-400 flex items-center justify-center mx-auto">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">カメラで撮影 / 写真を選択</p>
                  <p className="text-xs text-gray-400 mt-1">タップしてカメラ起動またはドロップ</p>
                </div>
              </div>
            )}
          </div>

          {/* モード3用、または手動開始用ボタン */}
          {pendingFileOrUrl && !analyzing && (
            <button
              onClick={() => executeAnalysis(pendingFileOrUrl)}
              className="w-full py-3 px-4 rounded-xl gradient-btn-primary text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Play className="w-4 h-4 text-yellow-300" />
              この画像のAI解析を手動で開始する
            </button>
          )}

          {/* Progress bar */}
          {analyzing && (
            <div className="glass-card rounded-xl p-4 space-y-2 border border-pink-500/30 animate-pulse">
              <div className="flex justify-between text-xs font-semibold text-gray-300">
                <span className="flex items-center gap-1.5 text-pink-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  {progressStatus}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-cyan-400 transition-all duration-200"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Form & Primary Save Action */}
        <div className="lg:col-span-7 space-y-6">
          {/* Dynamic Calorie Result Card */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 border border-pink-500/30 gradient-bg-accent space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 animate-pulse" /> 算出消費カロリー
              </span>
              <span className="text-xs text-gray-400">
                設定体重: <strong className="text-white">{weightKg} kg</strong> (METs: {calorieCalc.mets})
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                {calorieCalc.calories}
              </span>
              <span className="text-lg font-bold text-pink-400">kcal</span>
              <span className="ml-auto text-xs px-2.5 py-1 rounded-full bg-white/10 text-gray-300 font-semibold">
                精度補正: ×{calorieCalc.accuracyFactor}
              </span>
            </div>

            {/* Food Conversion Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10">
              {foodConversions.slice(0, 4).map(({ food, count }) => (
                <div key={food.id} className="p-2 rounded-xl bg-black/30 text-center">
                  <div className="text-lg mb-0.5">{food.icon}</div>
                  <div className="text-[10px] text-gray-400 truncate">{food.name}</div>
                  <div className="text-xs font-extrabold text-yellow-400">
                    {count} <span className="text-[9px] text-gray-400">{food.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="glass-card rounded-2xl p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base sm:text-lg font-bold text-white">確認・手動微調整</h2>
              <span className="text-xs text-gray-400">※ボタンタップで即調整</span>
            </div>

            <div className="space-y-4">
              {/* 曲名 */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">楽曲名</label>
                <input
                  type="text"
                  value={result.songName}
                  onChange={(e) => handleResultChange('songName', e.target.value)}
                  placeholder="例: 大釈迦"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* レベル (1 - 50) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-300">譜面レベル (Lv 1 - 50)</label>
                  <span className="text-xs font-extrabold text-pink-400">Lv {result.level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustValue('level', -1)}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-all cursor-pointer"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={result.level}
                    onChange={(e) => handleResultChange('level', Math.min(50, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-semibold text-center focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => adjustValue('level', 1)}
                    className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center transition-all cursor-pointer"
                  >
                    +1
                  </button>
                </div>
              </div>

              {/* クリアランク */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-300">クリアランク</label>
                <select
                  value={result.clearRank}
                  onChange={(e) => handleResultChange('clearRank', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-semibold focus:outline-none"
                >
                  <option value="S+">S+ (PERFECT)</option>
                  <option value="S">S (FULL COMBO)</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              {/* COOL数 */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-pink-400">COOL 数</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustValue('cool', -10)}
                      className="px-2 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-bold"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustValue('cool', 10)}
                      className="px-2 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-bold"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustValue('cool', 100)}
                      className="px-2 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 text-[10px] font-bold"
                    >
                      +100
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={result.cool}
                  onChange={(e) => handleResultChange('cool', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-pink-500"
                />
              </div>

              {/* GREAT数 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-yellow-400">GREAT 数</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustValue('great', -10)}
                      className="px-2 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-[10px] font-bold"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustValue('great', 10)}
                      className="px-2 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-[10px] font-bold"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustValue('great', 100)}
                      className="px-2 py-1 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-[10px] font-bold"
                    >
                      +100
                    </button>
                  </div>
                </div>
                <input
                  type="number"
                  min="0"
                  max="3500"
                  value={result.great}
                  onChange={(e) => handleResultChange('great', Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-yellow-500"
                />
              </div>

              {/* GOOD / BAD */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-cyan-400">GOOD 数</label>
                  <input
                    type="number"
                    min="0"
                    max="3500"
                    value={result.good}
                    onChange={(e) => handleResultChange('good', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-400">BAD 数</label>
                  <input
                    type="number"
                    min="0"
                    max="3500"
                    value={result.bad}
                    onChange={(e) => handleResultChange('bad', Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="p-3 rounded-xl bg-white/5 flex items-center justify-between text-xs text-gray-300">
              <span>算定総ノーツ: <strong className="text-white font-bold">{result.totalNotes}</strong> ノーツ</span>
              <span>判定クリア: <strong className="text-pink-400 font-extrabold">{result.clearRank}</strong></span>
            </div>

            {/* Save Action */}
            {savedSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>プレイデータがIndexedDBに保存されました！ダッシュボードへ移動中...</span>
              </div>
            )}

            <button
              onClick={handleSavePlayRecord}
              className="w-full py-3.5 px-6 rounded-xl gradient-btn-primary text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              <Save className="w-4.5 h-4.5" />
              このプレイ記録を保存する
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
