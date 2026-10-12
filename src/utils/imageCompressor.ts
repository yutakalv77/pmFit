/**
 * ゲーセン地下など通信が悪い環境向けのスマホ画像超軽量化モジュール
 * スマホで撮影した大容量画像 (4K/10MB等) を 1000px 以内・約200KB に瞬間圧縮し、パケット通信量を90%以上削減します。
 */

export interface CompressionResult {
  compressedDataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  originalSizeBytes: number;
  compressedSizeBytes: number;
}

export async function compressImageForMobile(
  imageSource: File | Blob | string,
  maxDimension = 1000,
  quality = 0.75
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    let originalSize = 0;
    if (imageSource instanceof File || imageSource instanceof Blob) {
      originalSize = imageSource.size;
    }

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas コンテキストが取得できませんでした。'));
      }

      let width = img.width;
      let height = img.height;

      // リサイズ計算
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // 高品質リサイズ描画
      ctx.drawImage(img, 0, 0, width, height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('画像の圧縮 Blob 変換に失敗しました。'));
          }
          resolve({
            compressedDataUrl,
            blob,
            width,
            height,
            originalSizeBytes: originalSize || blob.size,
            compressedSizeBytes: blob.size,
          });
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('画像の読み込みに失敗しました。'));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}
