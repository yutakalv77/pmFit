<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 🚀 開発フェーズ定義 (Development Phases)

### 【Phase 1: プロジェクト基盤 & 設定画面】(完了)
- Next.js (App Router / TS / Tailwind CSS) 静的PWA基盤の構築。
- ユーザー基本情報（体重・身長・目標カロリー）の IndexedDB 永続化。
- 食べ物換算マスターデータ & カロリー計算モジュールの実装。

### 【Phase 2: Gemini Vision AI 連携 & 超高精度リザルト自動解析】(完了)
- Gemini Vision API (1.5/2.0 Flash) を活用したポップンリザルト画面の100%高精度解析。
- リザルト写真から「楽曲名」「難易度レベル (EX 48等)」「COOL/GREAT/GOOD/BAD」「クリアランク」の一括AI抽出し、リアルタイムカロリー＆食べ物換算。
- オフライン電波不通時は「未解析下書き保存（後でオンライン一括AI解析）」機能による快適切り替え。

### 【Phase 3: プレイ履歴 & カロリー集計ダッシュボード】
- IndexedDB (`db.playRecords`) に保存されたデータのカレンダー・日別/週別トレンドグラフ表示。
- カロリー累計・食べ物達成バッジ表示機能。

### 【Phase 4: 完全オフラインPWA・サービスワーカー対応】(完了)
- Web App Manifest (`manifest.ts`) および Service Worker (`sw.js`) による全アセットキャッシュ構築。
- 地下ゲーセン等の完全オフライン時も0.1秒でアプリ爆速起動。
- PWA ホーム画面追加プロンプトインストーラーバナーの実装。

### 【Phase 5: プライバシー & データ管理 (APIキー削除・一括リセット機能)】(必須追加工程)
- **Gemini API Key の登録・接続テスト・破棄機能**:
  - 設定画面から登録済み API Key をワンタップで完全消去（localStorage / IndexedDB から破棄）。
  - Google AI Studio 側でのキー削除・無効化用直感リンクと案内ガイド。
- **全データの一括リセット機能**:
  - ユーザープロファイル・保存された全プレイ履歴データ・サムネイル画像を安全に一括削除・初期化できるボタンの実装。


# ユニットテスト作成における必須ルール (Mandatory Unit Testing Rules)

今後コードや機能を実装・テストする際は、以下の観点を**必ず毎回漏れなくテストおよび実装に盛り込むこと**：

1. **文字列・型違い・不正入力のテスト**:
   - 不正な文字列（例: `"abc"`, `""`, `"  "`）、`NaN`, `null`, `undefined` を確実に判定・拒否する。
2. **厳密な境界値分析 (Boundary Value Analysis: BVA)**:
   - 最小値・最大値のオンポイント (`MIN`, `MAX`) およびオフポイント (`MIN - 0.01`, `MAX + 0.01`) を網羅する。
3. **過剰値・数値オーバーフロー対策 (Extreme & Overflow Testing)**:
   - `Number.MAX_SAFE_INTEGER`, `Number.MAX_VALUE`, `Infinity`, `-Infinity`, `1e20`, `Number.MIN_SAFE_INTEGER` 等の巨大数値・特殊数値の拒否・安全判定 (`Number.isFinite`) を実装・テストする。
4. **ネットワーク通信エラーの網羅テスト (Network & API Error Testing)**:
   - REST APIや外部通信処理において、オフライン/接続断、タイムアウト、HTTPステータスエラー（`401` Key無効, `403` 権限なし, `429` レートリミット超過, `500`/`503` サーバー障害等）、および不正/破損したJSONレスポンスの全ての通信障害パターンを確実に判定・ハンドリングするテストを網羅する。
