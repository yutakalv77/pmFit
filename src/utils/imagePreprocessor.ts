import { validateImageFile, validateImageDimensions } from './imageValidation';

/**
 * ポップンミュージックのリザルト画面前処理モジュール
 * 画像の検証・リサイズ・高コントラスト階調化処理を実施します
 */

export async function processResultImage(imageSource: File | Blob | string): Promise<{
  fullTextUrl: string;
  processedPanelUrl: string;
}> {
  // 1. File オブジェクトの場合の事前バリデーション
  if (imageSource instanceof File) {
    const fileVal = validateImageFile(imageSource);
    if (!fileVal.isValid) {
      throw new Error(fileVal.error || '無効な画像ファイルです。');
    }
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // 2. 画像の縦横サイズ（解像度）バリデーション
      const dimVal = validateImageDimensions(img.width, img.height);
      if (!dimVal.isValid) {
        return reject(new Error(dimVal.error || '無効な画像サイズです。'));
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas コンテキストが利用できません。'));
      }

      const width = img.width;
      const height = img.height;

      // 解像度最適化リサイズ (最大1200px)
      const maxDim = 1200;
      let scale = 1;
      if (width > maxDim || height > maxDim) {
        scale = maxDim / Math.max(width, height);
      }

      const targetW = Math.floor(width * scale);
      const targetH = Math.floor(height * scale);

      canvas.width = targetW;
      canvas.height = targetH;

      ctx.drawImage(img, 0, 0, targetW, targetH);
      const fullUrl = canvas.toDataURL('image/png');

      // リザルト文字二値化
      const imageData = ctx.getImageData(0, 0, targetW, targetH);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;

        const isBlueBg = b > r + 10 && b > g - 20;

        if (isBlueBg) {
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
        } else {
          const val = gray < 180 ? 0 : 255;
          data[i] = val;
          data[i + 1] = val;
          data[i + 2] = val;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const processedUrl = canvas.toDataURL('image/png');

      resolve({
        fullTextUrl: fullUrl,
        processedPanelUrl: processedUrl,
      });
    };

    img.onerror = () => reject(new Error('画像の読み込みに失敗しました。壊れた画像ファイルの可能性があります。'));

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}
