import { expect, test, type Page } from '@playwright/test';

const text = [
  '# Một buổi sáng',
  'Mỗi sáng, em mở cửa sổ để nhìn ra vườn. '.repeat(7),
  '- Một dòng trong danh sách.',
  '> Mỗi người có một nhịp đọc riêng.',
  'Đây là dòng cuối.',
].join('\n\n');

// Use the text fragments in the browser, independently of the ruler's line index.
async function windowLines(page: Page) {
  return page.locator('[data-reading-ruler]').evaluate(band => {
    const window = band.getBoundingClientRect();
    const positions: number[] = [];
    for (const token of document.querySelectorAll('[data-token-start]')) {
      for (const rect of token.getClientRects()) {
        const center = rect.top + rect.height / 2;
        if (!positions.some(y => Math.abs(y - center) < 1)) positions.push(center);
      }
    }
    return {
      top: window.top,
      rows: positions.map((y, i) => y > window.top && y < window.bottom ? i : -1).filter(i => i >= 0),
      total: positions.length,
    };
  });
}

for (const width of [1366, 390]) {
  test(`fixed ruler advances one rendered line at a time (${width}px)`, async ({ page, context }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Văn bản cần đọc' }).fill(text);
    await page.getByRole('button', { name: /Đọc ngay/ }).click();
    await page.getByRole('button', { name: 'Cài đặt hiển thị', exact: true }).click();
    await page.getByRole('button', { name: /Hỗ trợ đọc/ }).click();
    const toggle = page.getByRole('switch', { name: 'Thước đọc cố định' });
    await toggle.click();
    await expect.poll(async () => (await windowLines(page)).rows).toEqual([0]);
    for (const count of [2, 3]) {
      await page.getByRole('button', { name: count + ' dòng', exact: true }).click();
      await expect.poll(async () => (await windowLines(page)).rows).toEqual(count === 2 ? [0, 1] : [0, 1, 2]);
    }
    if (width === 390) await page.getByRole('button', { name: 'Đóng cài đặt', exact: true }).click();
    const next = page.getByRole('button', { name: '↓ Dòng sau' });
    const prev = page.getByRole('button', { name: '↑ Dòng trước' });
    const first = await windowLines(page);
    await expect(prev).toBeDisabled();
    await next.click();
    await expect.poll(() => windowLines(page)).toEqual({ ...first, rows: [1, 2, 3] });
    const column = await page.locator('[data-segment-id]').first().boundingBox();
    const x = column!.x + 20;
    await page.mouse.move(x, first.top + 10);
    expect(await windowLines(page)).toEqual({ ...first, rows: [1, 2, 3] });
    if (width === 390) {
      const touch = await context.newCDPSession(page);
      const touchAt = (y: number) => [{ x, y }];
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: touchAt(first.top + 100) });
      for (const offset of [80, 50, 25]) {
        await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: touchAt(first.top + offset) });
      }
      await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await touch.detach();
    } else {
      await page.mouse.wheel(0, 120);
    }
    await expect.poll(async () => (await windowLines(page)).rows).toEqual([2, 3, 4]);
    await prev.click();
    await page.keyboard.press('ArrowDown');
    await expect.poll(() => windowLines(page)).toEqual({ ...first, rows: [2, 3, 4] });
    await page.keyboard.press('ArrowUp');
    await expect.poll(async () => (await windowLines(page)).rows).toEqual([1, 2, 3]);
    for (let row = 2; row <= first.total - 3; row++) {
      await next.click();
      expect(await windowLines(page)).toEqual({ ...first, rows: [row, row + 1, row + 2] });
    }
    await expect(next).toBeDisabled();
    await prev.click();
    await expect(next).toBeEnabled();
  });
}

test('preserves the current word after reflow and leaves word selection usable', async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('display-settings', JSON.stringify({ focus: { enabled: true, followPointer: true } }));
  });
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Văn bản cần đọc' }).fill(text);
  await page.getByRole('button', { name: /Đọc ngay/ }).click();
  await expect.poll(async () => (await windowLines(page)).rows).toEqual([0]);
  await page.getByRole('button', { name: 'Cài đặt hiển thị', exact: true }).click();
  const next = page.getByRole('button', { name: '↓ Dòng sau' });
  await next.click();
  await next.click();
  const anchoredWord = await page.locator('[data-reading-ruler]').evaluate(band => {
    const window = band.getBoundingClientRect();
    const token = [...document.querySelectorAll<HTMLElement>('[data-token-start]')].find(item => {
      const rect = item.getBoundingClientRect();
      return rect.top + rect.height / 2 > window.top && rect.top + rect.height / 2 < window.bottom;
    })!;
    return { segment: token.closest<HTMLElement>('[data-segment-id]')!.dataset.segmentId, start: token.dataset.tokenStart };
  });
  const word = page.locator(`[data-segment-id="${anchoredWord.segment}"] [data-token-start="${anchoredWord.start}"]`);
  await page.getByRole('complementary', { name: 'Cài đặt hiển thị' }).getByRole('button', { name: 'Tăng cỡ chữ' }).click();
  await page.setViewportSize({ width: 1170, height: 800 });
  await expect.poll(() => word.evaluate(token => {
    const band = document.querySelector('[data-reading-ruler]')!.getBoundingClientRect();
    const { top, height } = token.getBoundingClientRect();
    return top + height / 2 > band.top && top + height / 2 < band.bottom;
  })).toBe(true);
  await word.click();
  await expect(page.getByRole('dialog', { name: /Giải nghĩa/ })).toBeVisible();
  const before = await windowLines(page);
  await page.keyboard.press('ArrowDown');
  expect(await windowLines(page)).toEqual(before);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: /Hỗ trợ đọc/ }).click();
  await page.getByRole('switch', { name: 'Thước đọc cố định' }).click();
  await expect(page.locator('[data-reading-ruler]')).toHaveCount(0);
});
