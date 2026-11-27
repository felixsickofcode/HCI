import { expect, test } from '@playwright/test';

test('sidebar, keyboard settings and current word on a 1024px laptop', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto('/');
  const passage = Array.from({ length: 32 }, (_, i) => `Đoạn ${i + 1}. ${'Buổi sáng em đọc sách ở nhà. '.repeat(5)}`).join('\n\n');
  await page.getByRole('textbox', { name: 'Văn bản cần đọc' }).fill(passage);
  await page.getByRole('button', { name: /Đọc ngay/ }).click();

  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(nav.getByRole('link')).toHaveCount(3);
  await expect(nav.getByRole('link', { name: 'Đọc tài liệu' })).toHaveAttribute('aria-current', 'page');
  const open = page.getByRole('button', { name: 'Cài đặt hiển thị', exact: true });
  const panel = page.getByRole('complementary', { name: 'Cài đặt hiển thị' });
  const main = page.getByRole('main', { name: 'Nội dung tài liệu' });
  await expect(open).toHaveAttribute('aria-expanded', 'false');

  // Remember a real word halfway through a long document. Its visual offset
  // must survive changes to column width and font size with the ruler off.
  const word = main.locator('[data-segment-id]').nth(14).locator('[data-token-start]').nth(6);
  await word.evaluate(el => el.scrollIntoView({ block: 'center' }));
  await word.focus();
  const top = await word.evaluate(el => el.getBoundingClientRect().top);
  await open.focus();
  await page.keyboard.press('Enter');
  await expect(panel.getByRole('button', { name: 'Đóng cài đặt' })).toBeFocused();
  await expect.poll(() => nav.evaluate(el => el.clientWidth)).toBeLessThan(80);
  await expect.poll(() => main.locator('.reading-body').first().evaluate(el => el.clientWidth)).toBeGreaterThan(400);
  const size = panel.getByRole('slider', { name: 'Cỡ chữ' });
  await size.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(size).toHaveAttribute('aria-valuetext', '22 pixel');
  await expect.poll(() => word.evaluate((el, y) => Math.abs(el.getBoundingClientRect().top - y), top)).toBeLessThan(3);

  await panel.getByRole('button', { name: 'Đặt lại mặc định' }).focus();
  await page.keyboard.press('Tab');
  await expect(main).toBeFocused();
  await expect(panel).toBeVisible();
  await word.click();
  await expect(page.getByRole('dialog', { name: /Giải nghĩa/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(word).toBeFocused();
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await expect(panel).toHaveCount(0);
  await expect.poll(() => word.evaluate((el, y) => Math.abs(el.getBoundingClientRect().top - y), top)).toBeLessThan(3);

  await nav.getByRole('link', { name: 'Thư viện từ khó' }).press('Enter');
  await expect(page).toHaveURL(/\/vocabulary$/);
  await expect(page.getByRole('heading', { name: 'Thư viện từ khó' })).toBeVisible();
  await page.getByRole('link', { name: 'Tiếp tục đọc' }).click();
  await expect(page).toHaveURL(/\/reading$/);
  await expect(main.locator('[data-segment-id]').first()).toContainText('Đoạn 1.');
  await nav.getByRole('link', { name: 'Trang chủ' }).click();
  await expect(page.getByRole('textbox', { name: 'Văn bản cần đọc' })).toBeVisible();
});

for (const source of ['image', 'pdf'] as const) {
  test(`original and reading views remain available for ${source}`, async ({ page }) => {
    const line = 'Một đoạn văn từ tài liệu.';
    await page.route('**/documents/extract-text', route => route.fulfill({
      json: { text: line, source, pageCount: 1, charCount: line.length, ocrUsed: false },
    }));
    await page.goto('/');
    const name = source === 'image' ? 'tai-lieu.png' : 'tai-lieu.pdf';
    await page.locator('input[type=file]').setInputFiles({
      name,
      mimeType: source === 'image' ? 'image/png' : 'application/pdf',
      buffer: source === 'image'
        ? Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXxkAAAAASUVORK5CYII=', 'base64')
        : Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF'),
    });
    const modes = page.getByRole('group', { name: 'Chế độ xem tài liệu' });
    await modes.getByRole('button', { name: 'Bản gốc' }).click();
    if (source === 'image') await expect(page.getByRole('img', { name: 'Bản gốc của ' + name })).toBeVisible();
    else await expect(page.getByTitle('Bản gốc PDF: ' + name)).toBeVisible();
    await modes.getByRole('button', { name: 'Trang đọc' }).click();
    await expect(page.locator('[data-segment-id]').first()).toContainText(line);
    await modes.getByRole('button', { name: 'Bản gốc' }).click();
    await expect(page.getByRole('link', { name: 'Mở bản gốc ở tab mới' })).toBeVisible();
  });
}
