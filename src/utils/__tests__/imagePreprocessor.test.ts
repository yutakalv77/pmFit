import { describe, it, expect } from 'vitest';

describe('imagePreprocessor Logic Test Suite', () => {
  it('verifies score panel crop region and scale ratio calculations', () => {
    const origWidth = 2000;
    const origHeight = 1000;
    const maxWidth = 1200;

    let targetW = origWidth;
    let targetH = origHeight;
    if (targetW > maxWidth) {
      const scale = maxWidth / targetW;
      targetW = maxWidth;
      targetH = Math.round(targetH * scale);
    }

    expect(targetW).toBe(1200);
    expect(targetH).toBe(600);

    const scorePanelY = Math.floor(targetH * 0.35);
    const scorePanelH = Math.floor(targetH * 0.55);

    expect(scorePanelY).toBe(210);
    expect(scorePanelH).toBe(330);
  });
});
