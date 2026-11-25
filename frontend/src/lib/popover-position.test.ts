import { expect, it } from 'vitest';
import { isAnchorVisible, placePopover, popoverWidth } from './popover-position';

const viewport = { width: 1024, height: 800 };

it('keeps the popover beside the word and clamps it inside the viewport', () => {
  const middle = placePopover({ left: 500, top: 300, bottom: 320, width: 60 }, viewport);
  expect(middle.placement).toBe('below');
  expect(middle.top).toBe(330);
  expect(middle.left).toBeGreaterThanOrEqual(12);
  expect(middle.left + middle.width).toBeLessThanOrEqual(viewport.width - 12);

  const edge = placePopover({ left: 1000, top: 300, bottom: 320, width: 20 }, viewport);
  expect(edge.left + edge.width).toBe(viewport.width - 12);
  expect(edge.caretLeft).toBeLessThanOrEqual(edge.width - 22);
});

it('flips above the word when there is not enough room below', () => {
  const nearBottom = placePopover({ left: 200, top: 740, bottom: 770, width: 40 }, viewport);
  expect(nearBottom.placement).toBe('above');
  expect(nearBottom.top).toBe(730);
  expect(nearBottom.maxHeight).toBeGreaterThan(0);
});

it('never exceeds the viewport width on a narrow window', () => {
  expect(popoverWidth({ width: 360, height: 700 })).toBe(336);
  expect(popoverWidth({ width: 280, height: 700 })).toBe(256);
});

it('treats a word scrolled out of the window as not visible', () => {
  expect(isAnchorVisible({ left: 10, top: 100, bottom: 120 }, viewport)).toBe(true);
  expect(isAnchorVisible({ left: 10, top: -80, bottom: -60 }, viewport)).toBe(false);
  expect(isAnchorVisible({ left: 10, top: 796, bottom: 820 }, viewport)).toBe(false);
});
