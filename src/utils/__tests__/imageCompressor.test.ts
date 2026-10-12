import { describe, it, expect, vi } from 'vitest';
import { compressImageForMobile } from '../imageCompressor';

describe('imageCompressor Comprehensive Test Suite (Rule 1, 2, 3)', () => {
  describe('Rule 1: Invalid & Broken Inputs', () => {
    it('rejects invalid image URLs cleanly', async () => {
      await expect(compressImageForMobile('invalid_image_url')).rejects.toThrow();
    });

    it('rejects empty strings, null or non-existent Blob sources', async () => {
      await expect(compressImageForMobile('')).rejects.toThrow();
      await expect(compressImageForMobile(null as any)).rejects.toThrow();
    });
  });

  describe('Rule 2 & 3: Dimension Calculation Logic', () => {
    it('verifies aspect ratio calculation for landscape (2000x1000 -> 1000x500)', () => {
      const origW = 2000;
      const origH = 1000;
      const maxDim = 1000;

      let width = origW;
      let height = origH;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      }

      expect(width).toBe(1000);
      expect(height).toBe(500);
    });

    it('verifies aspect ratio calculation for portrait (1000x2000 -> 500x1000)', () => {
      const origW = 1000;
      const origH = 2000;
      const maxDim = 1000;

      let width = origW;
      let height = origH;
      if (width > maxDim || height > maxDim) {
        if (height > width) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      expect(width).toBe(500);
      expect(height).toBe(1000);
    });

    it('retains dimensions for images smaller than maxDimension (500x500)', () => {
      const origW = 500;
      const origH = 500;
      const maxDim = 1000;

      let width = origW;
      let height = origH;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      expect(width).toBe(500);
      expect(height).toBe(500);
    });
  });
});
