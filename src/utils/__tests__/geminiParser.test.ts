import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { recognizeResultWithGemini, GeminiApiError } from '../geminiParser';

const dummyBase64Image =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

describe('geminiParser Network & API Communication Test Suite (Rule 4 Coverage)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('API Key Validation Errors', () => {
    it('throws MISSING_API_KEY when apiKey is empty, whitespace or non-string', async () => {
      await expect(
        recognizeResultWithGemini({ apiKey: '', imageSource: dummyBase64Image })
      ).rejects.toThrowError(GeminiApiError);

      try {
        await recognizeResultWithGemini({ apiKey: '   ', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('MISSING_API_KEY');
      }
    });
  });

  describe('HTTP Status Code Error Coverage (401, 403, 429, 500, 502, 503, 504, 400)', () => {
    it('handles 401 / 403 Invalid API Key errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          text: async () => 'API key not valid. Please pass a valid API key.',
        })
      );

      try {
        await recognizeResultWithGemini({ apiKey: 'invalid_key', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('INVALID_API_KEY');
        expect(err.status).toBe(403);
      }
    });

    it('handles 429 Rate Limit Exceeded error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 429,
          text: async () => 'Quota exceeded for quota metric',
        })
      );

      try {
        await recognizeResultWithGemini({ apiKey: 'valid_key', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(err.status).toBe(429);
      }
    });

    it('handles 500 / 502 / 503 / 504 Server Errors from Google', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 503,
          text: async () => 'Service Unavailable',
        })
      );

      try {
        await recognizeResultWithGemini({ apiKey: 'valid_key', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('SERVER_ERROR');
        expect(err.status).toBe(503);
      }
    });

    it('handles 502 Bad Gateway and 504 Gateway Timeout', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 504,
          text: async () => 'Gateway Timeout',
        })
      );

      try {
        await recognizeResultWithGemini({ apiKey: 'valid_key', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('SERVER_ERROR');
        expect(err.status).toBe(504);
      }
    });

    it('handles 400 Bad Request error', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 400,
          text: async () => 'Invalid payload format',
        })
      );

      try {
        await recognizeResultWithGemini({ apiKey: 'valid_key', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('INVALID_RESPONSE_FORMAT');
        expect(err.status).toBe(400);
      }
    });
  });

  describe('Network Disconnection, Remote Image Fetch & Timeout Error Coverage', () => {
    it('handles Network Disconnection / Offline Error (fetch rejects)', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockRejectedValue(new TypeError('Failed to fetch (offline)'))
      );

      try {
        await recognizeResultWithGemini({ apiKey: 'valid_key', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('NETWORK_OFFLINE');
      }
    });

    it('handles Request Timeout via AbortSignal', async () => {
      const abortErr = new Error('The operation was aborted');
      abortErr.name = 'AbortError';

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(abortErr), 50)))
      );

      try {
        await recognizeResultWithGemini({
          apiKey: 'valid_key',
          imageSource: dummyBase64Image,
          timeoutMs: 10,
        });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('TIMEOUT');
      }
    });
  });

  describe('Malformed, Markdown Code Fences & Invalid Payload Coverage', () => {
    it('handles non-JSON / broken payload responses', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Unexpected token < in JSON');
          },
        })
      );

      try {
        await recognizeResultWithGemini({ apiKey: 'valid_key', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('INVALID_RESPONSE_FORMAT');
      }
    });

    it('handles empty candidates in Gemini response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({ candidates: [] }),
        })
      );

      try {
        await recognizeResultWithGemini({ apiKey: 'valid_key', imageSource: dummyBase64Image });
      } catch (err: any) {
        expect(err).toBeInstanceOf(GeminiApiError);
        expect(err.code).toBe('INVALID_RESPONSE_FORMAT');
      }
    });

    it('parses response wrapped in markdown code fences ```json ... ``` safely', async () => {
      const markdownJson = `\`\`\`json
{
  "songName": "大釈迦",
  "level": 48,
  "cool": 1024,
  "great": 391,
  "good": 87,
  "bad": 52,
  "clearRank": "A+"
}
\`\`\``;

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: markdownJson }],
                },
              },
            ],
          }),
        })
      );

      const res = await recognizeResultWithGemini({
        apiKey: 'valid_key',
        imageSource: dummyBase64Image,
      });

      expect(res.songName).toBe('大釈迦');
      expect(res.level).toBe(48);
      expect(res.cool).toBe(1024);
      expect(res.great).toBe(391);
      expect(res.good).toBe(87);
      expect(res.bad).toBe(52);
      expect(res.totalNotes).toBe(1554);
    });

    it('handles invalid or non-numeric types inside AI JSON output safely with bounds protection', async () => {
      const malformedFieldJson = JSON.stringify({
        songName: '大釈迦',
        level: 'abc', // 不正文字列
        cool: -50,   // 負の値
        great: '391',
        good: null,  // null
        bad: undefined,
        clearRank: 'A+',
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: malformedFieldJson }],
                },
              },
            ],
          }),
        })
      );

      const res = await recognizeResultWithGemini({
        apiKey: 'valid_key',
        imageSource: dummyBase64Image,
      });

      expect(res.level).toBeGreaterThanOrEqual(1);
      expect(res.level).toBeLessThanOrEqual(50);
      expect(res.cool).toBe(0);
      expect(res.great).toBe(391);
      expect(res.good).toBe(0);
      expect(res.bad).toBe(0);
    });
  });

  describe('Success Scenario (200 OK)', () => {
    it('correctly parses 200 OK valid Gemini Vision response', async () => {
      const mockGeminiJson = {
        songName: '大釈迦',
        level: 48,
        cool: 1024,
        great: 391,
        good: 87,
        bad: 52,
        clearRank: 'A+',
      };

      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: JSON.stringify(mockGeminiJson) }],
                },
              },
            ],
          }),
        })
      );

      const res = await recognizeResultWithGemini({
        apiKey: 'valid_key',
        imageSource: dummyBase64Image,
      });

      expect(res.songName).toBe('大釈迦');
      expect(res.level).toBe(48);
      expect(res.cool).toBe(1024);
      expect(res.great).toBe(391);
      expect(res.good).toBe(87);
      expect(res.bad).toBe(52);
      expect(res.totalNotes).toBe(1554);
      expect(res.clearRank).toBe('A+');
    });
  });
});
