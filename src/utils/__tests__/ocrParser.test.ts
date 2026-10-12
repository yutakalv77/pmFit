import { describe, it, expect } from 'vitest';
import { parseOcrText } from '../ocrParser';

describe('ocrParser Pure Parser Test Suite', () => {
  describe('Rule 1: Negative Values Error Protection', () => {
    it('rejects negative level and safely falls back to minimum bound (Lv 1)', () => {
      const res = parseOcrText('大釈迦 EX -48\nCOOL 500');
      expect(res.level).toBeGreaterThanOrEqual(1);
      expect(res.level).toBeLessThanOrEqual(50);
    });

    it('rejects negative COOL count and resets it to 0', () => {
      const res = parseOcrText('大釈迦 EX 48\nCOOL -1024\nGREAT 300\nGOOD 50\nBAD 10');
      expect(res.cool).toBe(0);
      expect(res.great).toBe(300);
      expect(res.totalNotes).toBe(360);
    });

    it('rejects negative GREAT count and resets it to 0', () => {
      const res = parseOcrText('大釈迦 EX 48\nCOOL 1000\nGREAT -391\nGOOD 50\nBAD 10');
      expect(res.great).toBe(0);
      expect(res.cool).toBe(1000);
      expect(res.totalNotes).toBe(1060);
    });

    it('rejects negative GOOD count and resets it to 0', () => {
      const res = parseOcrText('大釈迦 EX 48\nCOOL 1000\nGREAT 300\nGOOD -87\nBAD 10');
      expect(res.good).toBe(0);
      expect(res.totalNotes).toBe(1310);
    });

    it('rejects negative BAD count and resets it to 0', () => {
      const res = parseOcrText('大釈迦 EX 48\nCOOL 1000\nGREAT 300\nGOOD 50\nBAD -52');
      expect(res.bad).toBe(0);
      expect(res.totalNotes).toBe(1350);
    });
  });

  describe('Rule 2: Boundary & Extreme Values Testing', () => {
    it('clips excessively large note counts (e.g. 99999) to safe maximum bound (3500)', () => {
      const res = parseOcrText('EX 48\nCOOL 99999');
      expect(res.cool).toBeLessThanOrEqual(3500);
    });

    it('handles Level upper and lower boundaries (Lv 1 - 50)', () => {
      const resLow = parseOcrText('EX 0\nCOOL 100');
      expect(resLow.level).toBeGreaterThanOrEqual(1);

      const resHigh = parseOcrText('EX 99\nCOOL 100');
      expect(resHigh.level).toBeLessThanOrEqual(50);
    });
  });

  describe('Rule 3: Malformed & Invalid Input Handling', () => {
    it('handles empty, null or undefined text cleanly without throwing errors', () => {
      expect(() => parseOcrText('')).not.toThrow();
      expect(() => parseOcrText(null as any)).not.toThrow();
      expect(() => parseOcrText(undefined as any)).not.toThrow();

      const emptyRes = parseOcrText('');
      expect(emptyRes.cool).toBe(0);
      expect(emptyRes.great).toBe(0);
      expect(emptyRes.good).toBe(0);
      expect(emptyRes.bad).toBe(0);
    });

    it('parses valid result text (大釈迦 EX 48) correctly', () => {
      const sampleText = `
        大釈迦
        EX 48
        COOL 1024
        GREAT 391
        GOOD 87
        BAD 52
        STAGE CLEAR
      `;
      const res = parseOcrText(sampleText);
      expect(res.songName).toBe('大釈迦');
      expect(res.level).toBe(48);
      expect(res.cool).toBe(1024);
      expect(res.great).toBe(391);
      expect(res.good).toBe(87);
      expect(res.bad).toBe(52);
      expect(res.totalNotes).toBe(1554);
    });
  });
});
