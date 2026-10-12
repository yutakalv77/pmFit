'use client';

import React, { useEffect, useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { validateUserProfile } from '@/utils/validation';
import { removeGeminiApiKey, clearAllAppData, UserProfile } from '@/db/db';
import { calculateAgeFromBirth, calculateGenderFactor, calculateAgeFactor } from '@/utils/calorieCalculator';
import {
  Save,
  User,
  Scale,
  Ruler,
  Target,
  CheckCircle2,
  Info,
  RefreshCw,
  AlertTriangle,
  Key,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Users,
  Check,
  XCircle,
  Sparkles,
} from 'lucide-react';

export default function SettingsPage() {
  const { profile: storedProfile, isLoading, updateProfile } = useUserProfile();
  const [formData, setFormData] = useState<UserProfile>({
    weight: 65,
    height: 170,
    dailyCalorieTarget: 500,
    gender: 'unspecified',
    birthYearMonth: '',
    geminiApiKey: '',
    updatedAt: new Date().toISOString(),
  });

  // モダン誕生年月トグル（有効 / 未指定）
  const [enableBirthDate, setEnableBirthDate] = useState<boolean>(false);
  const [birthYear, setBirthYear] = useState<string>('');
  const [birthMonth, setBirthMonth] = useState<string>('');

  const [errors, setErrors] = useState<Partial<Record<keyof UserProfile, string>>>({});
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showKeyDeletedNotice, setShowKeyDeletedNotice] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  useEffect(() => {
    if (storedProfile) {
      setFormData(storedProfile);
      if (storedProfile.birthYearMonth && storedProfile.birthYearMonth.trim() !== '') {
        setEnableBirthDate(true);
        const parts = storedProfile.birthYearMonth.split('-');
        if (parts.length === 2) {
          setBirthYear(parts[0]);
          setBirthMonth(parts[1]);
        }
      } else {
        setEnableBirthDate(false);
        setBirthYear('');
        setBirthMonth('');
      }
    }
  }, [storedProfile]);

  // トグル切り替え（未指定 / 設定する）
  const handleToggleBirthDate = (enabled: boolean) => {
    setEnableBirthDate(enabled);
    if (!enabled) {
      setBirthYear('');
      setBirthMonth('');
      setFormData((prev) => ({ ...prev, birthYearMonth: '' }));
    } else {
      // デフォルト値 (1995年1月)
      const defaultY = birthYear || '1995';
      const defaultM = birthMonth || '01';
      setBirthYear(defaultY);
      setBirthMonth(defaultM);
      setFormData((prev) => ({ ...prev, birthYearMonth: `${defaultY}-${defaultM}` }));
    }
    setSavedSuccess(false);
  };

  // 誕生年・月の変更イベント
  const handleYearMonthChange = (newYear: string, newMonth: string) => {
    setBirthYear(newYear);
    setBirthMonth(newMonth);

    if (newYear && newMonth) {
      const formatted = `${newYear}-${newMonth.padStart(2, '0')}`;
      setFormData((prev) => ({ ...prev, birthYearMonth: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, birthYearMonth: '' }));
    }
    setSavedSuccess(false);
  };

  const handleChange = (field: keyof UserProfile, rawValue: any) => {
    if (field === 'geminiApiKey' || field === 'gender' || field === 'birthYearMonth') {
      setFormData((prev) => ({ ...prev, [field]: rawValue }));
    } else {
      const numVal = parseFloat(rawValue);
      setFormData((prev) => ({
        ...prev,
        [field]: isNaN(numVal) ? '' : numVal,
      }));
    }
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setSavedSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateUserProfile(formData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        weight: Number(formData.weight),
        height: Number(formData.height),
        dailyCalorieTarget: Number(formData.dailyCalorieTarget),
        gender: formData.gender || 'unspecified',
        birthYearMonth: enableBirthDate ? (formData.birthYearMonth || '') : '',
        geminiApiKey: (formData.geminiApiKey || '').trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to save user profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveApiKey = async () => {
    try {
      await removeGeminiApiKey();
      setFormData((prev) => ({ ...prev, geminiApiKey: '' }));
      setShowKeyDeletedNotice(true);
      setTimeout(() => setShowKeyDeletedNotice(false), 3500);
    } catch (err) {
      console.error('Failed to remove API key:', err);
    }
  };

  const handleClearAllData = async () => {
    try {
      await clearAllAppData();
      setFormData({
        weight: 65,
        height: 170,
        dailyCalorieTarget: 500,
        gender: 'unspecified',
        birthYearMonth: '',
        geminiApiKey: '',
        updatedAt: new Date().toISOString(),
      });
      setEnableBirthDate(false);
      setBirthYear('');
      setBirthMonth('');
      setShowResetConfirm(false);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3500);
    } catch (err) {
      console.error('Failed to clear app data:', err);
    }
  };

  const currentAge = enableBirthDate ? calculateAgeFromBirth(formData.birthYearMonth) : null;
  const genderFactor = calculateGenderFactor(formData.gender);
  const ageFactor = calculateAgeFactor(currentAge);

  const targetRamen = ((formData.dailyCalorieTarget || 0) / 500).toFixed(1);
  const targetOnigiri = ((formData.dailyCalorieTarget || 0) / 170).toFixed(1);

  // 年選択肢リスト (1930年〜2026年)
  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYearNum - 1930 + 1 }, (_, i) => currentYearNum - i);
  const monthOptions = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
          <p className="text-sm text-gray-400">設定データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16">
      {/* Header Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight gradient-text-pop flex items-center gap-3">
          <User className="w-8 h-8 text-pink-500" />
          ユーザー基本設定 & 高精度代謝設定
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          より精度の高い消費カロリー計算のために、体重・性別・誕生年月などを設定してください。
        </p>
      </div>

      {/* Main Settings Card */}
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8 space-y-8">
        {savedSuccess && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>設定が正常に保存されました！</span>
          </div>
        )}

        {showKeyDeletedNotice && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>登録済みの Gemini API Key を削除し、未設定状態に戻しました。</span>
          </div>
        )}

        {resetSuccess && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span>全データ（履歴・プロファイル・API Key）の初期化が完了しました。</span>
          </div>
        )}

        {/* Section 1: Gemini AI Integration */}
        <div className="space-y-4 border-b border-white/10 pb-6">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              Gemini Vision AI API Key (高精度リザルト100%解析用)
            </label>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold underline"
            >
              無料APIキーを発行 (Google AI Studio) <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="space-y-2">
            <div className="relative">
              <input
                type="password"
                value={formData.geminiApiKey || ''}
                onChange={(e) => handleChange('geminiApiKey', e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono text-sm"
                placeholder="AIzaSy..."
              />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Google AI Studioで無料発行したAPIキーを登録すると、Gemini 2.0 Flash による超高精度の全自動解析が有効化されます。
            </p>
          </div>

          {formData.geminiApiKey && (
            <div className="pt-1 flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="text-xs text-gray-300">
                <span className="font-semibold text-red-400">登録済み API Key:</span>{' '}
                <span className="font-mono text-gray-400">
                  {formData.geminiApiKey.slice(0, 6)}...{formData.geminiApiKey.slice(-4)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveApiKey}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> API Key を削除・破棄
              </button>
            </div>
          )}
        </div>

        {/* Section 2: User Profile Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 体重入力 */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Scale className="w-4 h-4 text-pink-400" />
              体重 (kg) <span className="text-xs text-pink-500">*必須</span>
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="30"
                max="250"
                value={formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-xl bg-black/40 border text-white placeholder-gray-500 focus:outline-none transition-all font-semibold ${
                  errors.weight ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-pink-500'
                }`}
                placeholder="65.0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                kg
              </span>
            </div>
            {errors.weight && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errors.weight}
              </p>
            )}
          </div>

          {/* 身長入力 */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-cyan-400" />
              身長 (cm)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="100"
                max="250"
                value={formData.height}
                onChange={(e) => handleChange('height', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-black/40 border text-white placeholder-gray-500 focus:outline-none transition-all font-semibold ${
                  errors.height ? 'border-red-500/80 focus:border-red-500' : 'border-white/10 focus:border-cyan-500'
                }`}
                placeholder="170.0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                cm
              </span>
            </div>
            {errors.height && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errors.height}
              </p>
            )}
          </div>

          {/* 性別設定 (フラットな中立ラベル) */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              性別 (任意)
            </label>
            <select
              value={formData.gender || 'unspecified'}
              onChange={(e) => handleChange('gender', e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white font-semibold focus:outline-none focus:border-purple-500 text-sm"
            >
              <option value="unspecified">未指定</option>
              <option value="male">男性</option>
              <option value="female">女性</option>
              <option value="other">その他・回答しない</option>
            </select>
            <p className="text-xs text-gray-500">個人の生理学的指標および基礎代謝率の算定に使用されます。</p>
          </div>

          {/* 【モダンUI設計】誕生年月 モダンセグメントトグル ＆ 条件付きアコーディオンピッカー */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                誕生年月 (任意)
              </label>

              {/* モダンセグメントトグル */}
              <div className="p-1 rounded-xl bg-black/50 border border-white/10 flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleBirthDate(false)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    !enableBirthDate
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  未指定
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleBirthDate(true)}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                    enableBirthDate
                      ? 'bg-yellow-500 text-black shadow-md font-bold'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  設定する
                </button>
              </div>
            </div>

            {/* 有効時のみスムーズ表示されるピッカー */}
            {enableBirthDate ? (
              <div className="space-y-2 animate-fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={birthYear}
                    onChange={(e) => handleYearMonthChange(e.target.value, birthMonth)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-yellow-500/40 text-white font-semibold focus:outline-none focus:border-yellow-400 text-sm"
                  >
                    <option value="">年を選択</option>
                    {yearOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}年
                      </option>
                    ))}
                  </select>

                  <select
                    value={birthMonth}
                    onChange={(e) => handleYearMonthChange(birthYear, e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-yellow-500/40 text-white font-semibold focus:outline-none focus:border-yellow-400 text-sm"
                  >
                    <option value="">月を選択</option>
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {parseInt(m, 10)}月
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between text-xs text-gray-200">
                  <span>算出満年齢: <strong className="text-white">{currentAge !== null ? `${currentAge} 歳` : '未選択'}</strong></span>
                  <span>年齢補正: <strong className="text-yellow-400 font-mono">×{ageFactor}</strong></span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between text-xs text-gray-400">
                <span>誕生年月: <strong className="text-gray-300">未指定</strong></span>
                <span>年齢補正: <strong className="text-gray-300 font-mono">なし (×1.00)</strong></span>
              </div>
            )}
          </div>

          {/* 解析タイミングの設定 */}
          <div className="space-y-3 md:col-span-2 border-t border-white/10 pt-6">
            <label className="block text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400" />
              画像解析タイミングの設定
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-3 cursor-pointer transition-all ${
                  (formData.ocrAutoStartMode ?? 1) === 1
                    ? 'bg-pink-500/15 border-pink-500/50 text-white shadow-sm'
                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="ocrAutoStartMode"
                  value={1}
                  checked={(formData.ocrAutoStartMode ?? 1) === 1}
                  onChange={() => handleChange('ocrAutoStartMode', 1)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-white mb-0.5">1. 即時自動解析 (デフォルト)</div>
                  <div className="text-[11px] text-gray-400">画像アップロード完了直後に速攻で自動解析を開始します。</div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-3 cursor-pointer transition-all ${
                  formData.ocrAutoStartMode === 2
                    ? 'bg-yellow-500/15 border-yellow-500/50 text-white shadow-sm'
                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="ocrAutoStartMode"
                  value={2}
                  checked={formData.ocrAutoStartMode === 2}
                  onChange={() => handleChange('ocrAutoStartMode', 2)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-white mb-0.5">2. 確認ダイアログ表示</div>
                  <div className="text-[11px] text-gray-400">アップロード後に確認ダイアログを表示し許可したら解析を開始します。</div>
                </div>
              </label>

              <label
                className={`p-3.5 rounded-xl border text-xs font-semibold flex items-start gap-3 cursor-pointer transition-all ${
                  formData.ocrAutoStartMode === 3
                    ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-sm'
                    : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="ocrAutoStartMode"
                  value={3}
                  checked={formData.ocrAutoStartMode === 3}
                  onChange={() => handleChange('ocrAutoStartMode', 3)}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-white mb-0.5">3. 自動解析を行わない</div>
                  <div className="text-[11px] text-gray-400">アップロード完了しても自動解析を行わず手動で開始します。</div>
                </div>
              </label>
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="block text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Target className="w-4 h-4 text-yellow-400" />
              1日の目標消費カロリー (kcal)
            </label>
            <div className="relative">
              <input
                type="number"
                step="50"
                min="50"
                max="10000"
                value={formData.dailyCalorieTarget}
                onChange={(e) => handleChange('dailyCalorieTarget', e.target.value)}
                className={`w-full px-4 py-3 rounded-xl bg-black/40 border text-white placeholder-gray-500 focus:outline-none transition-all font-semibold ${
                  errors.dailyCalorieTarget
                    ? 'border-red-500/80 focus:border-red-500'
                    : 'border-white/10 focus:border-yellow-500'
                }`}
                placeholder="500"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">
                kcal
              </span>
            </div>

            {errors.dailyCalorieTarget ? (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {errors.dailyCalorieTarget}
              </p>
            ) : (
              <div className="mt-3 p-4 rounded-xl bg-white/5 border border-white/5 flex flex-wrap items-center gap-4 text-xs text-gray-300">
                <span className="font-semibold text-yellow-400">目標の目安:</span>
                <span className="flex items-center gap-1">🍜 醤油ラーメン 約 <strong className="text-white">{targetRamen}</strong> 杯分</span>
                <span className="text-gray-600">|</span>
                <span className="flex items-center gap-1">🍙 おにぎり 約 <strong className="text-white">{targetOnigiri}</strong> 個分</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl gradient-btn-primary text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            設定を保存する
          </button>
        </div>
      </form>

      {/* Reset Section */}
      <div className="glass-card rounded-2xl p-6 space-y-4 border border-red-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert className="w-5 h-5" />
            <h2 className="text-lg font-bold text-white">アプリデータの管理・一括初期化</h2>
          </div>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed">
          すべてのデータ（保存されたプレイ履歴、API Key、性別・体重等の設定）を一括で初期化できます。
        </p>

        {!showResetConfirm ? (
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> すべてのデータを初期化・消去する
          </button>
        ) : (
          <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/40 space-y-3">
            <p className="text-xs font-bold text-red-300">
              ⚠️ 本当にすべてのプレイ履歴・API Key・設定データを消去しますか？この操作は取り消せません。
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClearAllData}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                完全に消去する
              </button>
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-semibold transition-all cursor-pointer"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
