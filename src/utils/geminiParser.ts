import { OcrResultData } from './ocrParser';

export interface GeminiParseOptions {
  apiKey: string;
  imageSource: File | Blob | string;
  timeoutMs?: number; // 省略時は15秒
}

export type GeminiErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'NETWORK_OFFLINE'
  | 'TIMEOUT'
  | 'SERVER_ERROR'
  | 'INVALID_RESPONSE_FORMAT'
  | 'UNKNOWN_ERROR';

export class GeminiApiError extends Error {
  code: GeminiErrorCode;
  status?: number;

  constructor(message: string, code: GeminiErrorCode, status?: number) {
    super(message);
    this.name = 'GeminiApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * 画像を Base64 文字列に変換するヘルパー
 */
async function imageToBase64(source: File | Blob | string): Promise<{ base64Data: string; mimeType: string }> {
  if (typeof source === 'string' && source.startsWith('data:')) {
    const matches = source.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      return { mimeType: matches[1], base64Data: matches[2] };
    }
  }

  let blob: Blob;
  if (typeof source === 'string') {
    const res = await fetch(source);
    blob = await res.blob();
  } else {
    blob = source;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const matches = dataUrl.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        resolve({ mimeType: matches[1], base64Data: matches[2] });
      } else {
        reject(new GeminiApiError('画像データのBase64変換に失敗しました。', 'INVALID_RESPONSE_FORMAT'));
      }
    };
    reader.onerror = () => reject(new GeminiApiError('画像ファイルの読み込みエラーです。', 'INVALID_RESPONSE_FORMAT'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Gemini Vision API (gemini-2.0-flash) を呼び出し、エラーハンドリングとタイムアウト処理を手厚く実行
 */
export async function recognizeResultWithGemini(options: GeminiParseOptions): Promise<OcrResultData> {
  const { apiKey, imageSource, timeoutMs = 15000 } = options;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
    throw new GeminiApiError('Gemini API Key が設定されていません。設定画面で登録してください。', 'MISSING_API_KEY');
  }

  const cleanKey = apiKey.trim();
  const { base64Data, mimeType } = await imageToBase64(imageSource);

  const promptText = `
あなたは音ゲー「ポップンミュージック (Pop'n Music)」のリザルト画面解析のスペシャリストです。
添付されたリザルト画像から、以下の項目を正確に読み取り、指定された純粋なJSON形式のみで回答してください。余計な解説文やマークダウン枠は不要です。

【抽出項目】
1. songName: 楽曲名 (例: "大釈迦")
2. level: 譜面レベル (1〜50の数値)
3. cool: COOLの回数 (数値)
4. great: GREATの回数 (数値)
5. good: GOODの回数 (数値)
6. bad: BADの回数 (数値)
7. clearRank: クリアランク ("S+", "S", "A+", "A", "B", "C", "FAILED" のいずれか)

【出力JSONフォーマット】
{
  "songName": "大釈迦",
  "level": 48,
  "cool": 1024,
  "great": 391,
  "good": 87,
  "bad": 52,
  "clearRank": "A+"
}
`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(cleanKey)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: 'application/json',
          temperature: 0.1,
        },
      }),
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new GeminiApiError(`Gemini API への通信がタイムアウトしました (${timeoutMs / 1000}秒)。`, 'TIMEOUT');
    }
    throw new GeminiApiError(
      'ネットワーク接続エラーが発生しました。インターネット接続を確認してください。',
      'NETWORK_OFFLINE'
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const status = response.status;
    let errBody = '';
    try {
      errBody = await response.text();
    } catch {
      errBody = '';
    }

    if (status === 400) {
      throw new GeminiApiError(`Gemini API リクエスト形式エラー (400): ${errBody}`, 'INVALID_RESPONSE_FORMAT', status);
    }
    if (status === 401 || status === 403) {
      throw new GeminiApiError(
        `API Key が無効、または権限がありません (${status})。正しい Gemini API Key を再登録してください。`,
        'INVALID_API_KEY',
        status
      );
    }
    if (status === 429) {
      throw new GeminiApiError(
        'Gemini API の利用制限 (Rate Limit: 429) に達しました。しばらく時間をおいて再試行してください。',
        'RATE_LIMIT_EXCEEDED',
        status
      );
    }
    if (status >= 500) {
      throw new GeminiApiError(
        `Gemini サーバーエラー (${status}) が発生しました。Google AI サービスの復旧をお待ちください。`,
        'SERVER_ERROR',
        status
      );
    }
    throw new GeminiApiError(`Gemini API 通信エラー (Status: ${status})`, 'UNKNOWN_ERROR', status);
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    throw new GeminiApiError('Gemini API レスポンスのJSONパースに失敗しました。', 'INVALID_RESPONSE_FORMAT');
  }

  const rawContent = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!rawContent) {
    throw new GeminiApiError('Gemini API から有効な解析テキストが返却されませんでした。', 'INVALID_RESPONSE_FORMAT');
  }

  try {
    // マークダウンコードブロック枠や制御文字の安全クレンジング
    const cleanJsonText = rawContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const jsonParsed = JSON.parse(cleanJsonText);

    const cool = Math.max(0, parseInt(jsonParsed.cool, 10) || 0);
    const great = Math.max(0, parseInt(jsonParsed.great, 10) || 0);
    const good = Math.max(0, parseInt(jsonParsed.good, 10) || 0);
    const bad = Math.max(0, parseInt(jsonParsed.bad, 10) || 0);
    const level = Math.min(50, Math.max(1, parseInt(jsonParsed.level, 10) || 35));

    return {
      songName: jsonParsed.songName || 'ポップンミュージック曲',
      level,
      cool,
      great,
      good,
      bad,
      totalNotes: cool + great + good + bad,
      clearRank: jsonParsed.clearRank || 'A',
      rawText: `[Gemini Vision AI 解析成功]\n${JSON.stringify(jsonParsed, null, 2)}`,
    };
  } catch (parseErr) {
    throw new GeminiApiError(`Gemini 応答結果の構造パースに失敗しました: ${rawContent}`, 'INVALID_RESPONSE_FORMAT');
  }
}
