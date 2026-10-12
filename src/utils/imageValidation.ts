export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export const IMAGE_LIMITS = {
  MAX_FILE_SIZE_BYTES: 15 * 1024 * 1024, // 15 MB
  MIN_WIDTH_PX: 100,
  MAX_WIDTH_PX: 8000,
  MIN_HEIGHT_PX: 100,
  MAX_HEIGHT_PX: 8000,
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
} as const;

/**
 * ファイルの形式およびサイズ制限の事前チェック
 */
export function validateImageFile(file: unknown): ImageValidationResult {
  if (!file || !(file instanceof File)) {
    return { isValid: false, error: '有効な画像ファイルが選択されていません。' };
  }

  // 1. ファイルサイズチェック
  if (!Number.isFinite(file.size) || file.size <= 0) {
    return { isValid: false, error: '空のファイルまたは無効なファイルサイズです。' };
  }

  if (file.size > IMAGE_LIMITS.MAX_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `ファイルサイズが大きすぎます (${sizeMb} MB)。15 MB 以下の画像を選択してください。`,
    };
  }

  // 2. MIMEタイプチェック
  const mimeType = (file.type || '').toLowerCase();
  const isAllowedMime = IMAGE_LIMITS.ALLOWED_MIME_TYPES.some((allowed) => allowed === mimeType);
  if (!isAllowedMime) {
    return {
      isValid: false,
      error: `非対応のファイル形式です (${mimeType || '未知'})。JPEG, PNG, WebP 形式の画像を選択してください。`,
    };
  }

  return { isValid: true };
}

/**
 * 画像解像度 (幅・高さ) の境界値および解像度チェック
 */
export function validateImageDimensions(width: unknown, height: unknown): ImageValidationResult {
  const w = typeof width === 'number' ? width : Number(width);
  const h = typeof height === 'number' ? height : Number(height);

  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    return { isValid: false, error: '画像の縦横サイズを取得できませんでした。' };
  }

  // 最小サイズチェック
  if (w < IMAGE_LIMITS.MIN_WIDTH_PX || h < IMAGE_LIMITS.MIN_HEIGHT_PX) {
    return {
      isValid: false,
      error: `画像の解像度が低すぎます (${w}x${h} px)。100x100 px 以上のリザルト画像を選択してください。`,
    };
  }

  // 最大サイズチェック
  if (w > IMAGE_LIMITS.MAX_WIDTH_PX || h > IMAGE_LIMITS.MAX_HEIGHT_PX) {
    return {
      isValid: false,
      error: `画像の解像度が高すぎます (${w}x${h} px)。8000x8000 px 以下の画像を選択してください。`,
    };
  }

  return { isValid: true };
}
