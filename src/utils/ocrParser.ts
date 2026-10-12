export interface OcrResultData {
  songName: string;
  level: number;
  cool: number;
  great: number;
  good: number;
  bad: number;
  totalNotes: number;
  clearRank: string;
  rawText?: string;
}

/**
 * テキストから数字・曲名・レベル・判定数を安全抽出する純粋パーサー
 */
export function parseOcrText(rawText: string): OcrResultData {
  const text = rawText || '';
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

  // 1. 曲名候補の推定
  let songName = '';
  for (const line of lines) {
    if (
      !line.includes('COOL') &&
      !line.includes('GREAT') &&
      !line.includes('GOOD') &&
      !line.includes('BAD') &&
      !line.includes('STAGE') &&
      !line.includes('TRACK') &&
      !line.includes('LEVEL') &&
      !line.includes('EX') &&
      !line.includes('HYPER') &&
      !line.includes('NORMAL') &&
      !/^\d+$/.test(line) &&
      line.length >= 2
    ) {
      songName = line.replace(/[\\|/`~!@#$%^&*()_+={}[\];:'",.<>?]/g, '').trim();
      if (songName.length > 0) break;
    }
  }

  // 2. 譜面レベル抽出
  let level = 40;
  const levelMatch = text.match(/(?:EX|HYPER|NORMAL|EASY|LEVEL|LV|L)\s*[:.]?\s*(-?\d{1,3})/i);
  if (levelMatch) {
    const parsedLv = parseInt(levelMatch[1], 10);
    if (!isNaN(parsedLv) && parsedLv >= 1 && parsedLv <= 50) {
      level = parsedLv;
    }
  }

  // 3. 判定数抽出
  const parseCount = (label: string): number => {
    const regex = new RegExp(`${label}\\s*[:.]?\\s*(-?\\d+)`, 'i');
    const match = text.match(regex);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return Math.min(3500, parsed);
      }
      return 0;
    }
    return 0;
  };

  const cool = parseCount('COOL');
  const great = parseCount('GREAT');
  const good = parseCount('GOOD');
  const bad = parseCount('BAD');

  const totalNotes = cool + great + good + bad;

  // 4. クリアランク推測
  let clearRank = 'A';
  if (text.includes('PERFECT') || (bad === 0 && cool > 0 && totalNotes > 0 && great === 0 && good === 0)) {
    clearRank = 'S+';
  } else if (text.includes('FULL COMBO') || (bad === 0 && totalNotes > 0)) {
    clearRank = 'S';
  } else if (totalNotes > 0) {
    const accuracyRatio = (cool + great * 0.7) / totalNotes;
    if (accuracyRatio >= 0.90) clearRank = 'A+';
    else if (accuracyRatio >= 0.80) clearRank = 'A';
    else if (accuracyRatio >= 0.70) clearRank = 'B';
    else if (accuracyRatio >= 0.60) clearRank = 'C';
    else clearRank = 'FAILED';
  }

  return {
    songName: songName || '',
    level: Math.min(50, Math.max(1, level)),
    cool: Math.max(0, cool),
    great: Math.max(0, great),
    good: Math.max(0, good),
    bad: Math.max(0, bad),
    totalNotes: Math.max(0, totalNotes),
    clearRank,
    rawText,
  };
}
