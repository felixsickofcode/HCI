import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
  test(`reader asks guests to sign in before saving an explained phrase (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Văn bản cần đọc' }).fill('🌱 Em học sinh học. Sinh học thật thú vị.');
    await page.getByRole('button', { name: /Đọc ngay/ }).click();
    await expect(page).toHaveURL(/\/reading$/);
    await page.locator('[data-block-type="paragraph"]').filter({ hasText: 'Sinh học thật thú vị.' }).evaluate(paragraph => {
      const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
      let position = 0, node: Node | null;
      const range = document.createRange();
      while ((node = walker.nextNode())) {
        const length = node.textContent!.length;
        if (position <= 10 && position + length > 10) range.setStart(node, 10 - position);
        if (position < 18 && position + length >= 18) { range.setEnd(node, 18 - position); break; }
        position += length;
      }
      const selection = window.getSelection()!;
      selection.removeAllRanges(); selection.addRange(range);
      paragraph.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    });
    await expect(page.getByRole('dialog', { name: 'Giải nghĩa sinh học' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Đăng nhập để tiếp tục' })).toHaveAttribute('href', '/login');
    await expect(page.getByText('Chọn từ hoặc cụm từ trong bài để lưu.')).toHaveCount(0);
  });
}
