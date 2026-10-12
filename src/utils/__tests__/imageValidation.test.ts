import { describe, it, expect } from 'vitest';
import { validateImageFile, validateImageDimensions } from '../imageValidation';

describe('imageValidation Comprehensive BVA & Type Safety Test Suite', () => {
  describe('validateImageFile MIME & Size BVA', () => {
    it('accepts valid MIME types (image/jpeg, image/png, image/webp, image/gif)', () => {
      const types = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      for (const type of types) {
        const file = new File(['dummy_content'], 'test.png', { type });
        expect(validateImageFile(file).isValid).toBe(true);
      }
    });

    it('rejects unsupported MIME types (image/svg+xml, image/bmp, text/plain, application/pdf)', () => {
      const invalidTypes = ['image/svg+xml', 'image/bmp', 'text/plain', 'application/pdf'];
      for (const type of invalidTypes) {
        const file = new File(['dummy_content'], 'test.txt', { type });
        expect(validateImageFile(file).isValid).toBe(false);
      }
    });

    it('tests 15MB file size BVA (15MB On-point vs 15MB + 1 byte Off-point)', () => {
      const maxBytes = 15 * 1024 * 1024;
      const dummyContentOnPoint = new Uint8Array(maxBytes);
      const fileOnPoint = new File([dummyContentOnPoint], 'valid.png', { type: 'image/png' });
      expect(validateImageFile(fileOnPoint).isValid).toBe(true);

      const dummyContentOffPoint = new Uint8Array(maxBytes + 1);
      const fileOffPoint = new File([dummyContentOffPoint], 'invalid.png', { type: 'image/png' });
      expect(validateImageFile(fileOffPoint).isValid).toBe(false);
      expect(validateImageFile(fileOffPoint).error).toContain('15');
    });

    it('rejects null, undefined, or empty objects cleanly without crashing', () => {
      expect(validateImageFile(null as any).isValid).toBe(false);
      expect(validateImageFile(undefined as any).isValid).toBe(false);
    });
  });

  describe('validateImageDimensions Resolution BVA', () => {
    it('tests minimum resolution BVA (100x100 On-point vs 99x99 Off-point)', () => {
      expect(validateImageDimensions(100, 100).isValid).toBe(true);
      expect(validateImageDimensions(99, 100).isValid).toBe(false);
      expect(validateImageDimensions(100, 99).isValid).toBe(false);
    });

    it('tests maximum resolution BVA (8000x8000 On-point vs 8001x8001 Off-point)', () => {
      expect(validateImageDimensions(8000, 8000).isValid).toBe(true);
      expect(validateImageDimensions(8001, 8000).isValid).toBe(false);
      expect(validateImageDimensions(8000, 8001).isValid).toBe(false);
    });

    it('rejects NaN, negative, 0, or non-finite dimensions safely', () => {
      expect(validateImageDimensions(NaN, 1000).isValid).toBe(false);
      expect(validateImageDimensions(1000, -50).isValid).toBe(false);
      expect(validateImageDimensions(0, 0).isValid).toBe(false);
      expect(validateImageDimensions(Infinity, 1000).isValid).toBe(false);
    });
  });
});
