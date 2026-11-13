import { expect, test } from '@playwright/test';

for (const viewport of [{ width: 1366, height: 900 }, { width: 390, height: 844 }]) {
  test(`guest saves, filters, reloads and deletes a selected phrase (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.getByRole('textbox', { name: 'Văn bản cần đọc' }).fill('🌱 Em học sinh học. Sinh học thật thú vị.');
    await page.getByRole('button', { name: 'Đọc ngay', exact: true }).click();
    await expect(page).toHaveURL(/\/reading$/);
    await page.locator('[data-segment-id="paragraph-0"]').evaluate(paragraph => {
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
    });
    await page.getByRole('button', { name: 'Lưu từ đã chọn', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('sinh học');
    await page.getByRole('textbox', { name: 'Nghĩa / ghi chú' }).fill('Môn học về sự sống');
    await page.getByRole('button', { name: 'Lưu vào thư viện', exact: true }).click();
    await page.getByRole('link', { name: 'Xem thư viện', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'sinh học', exact: true })).toBeVisible();
    await expect(page.getByText('Môn học về sự sống')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'sinh học', exact: true })).toBeVisible();
    await page.getByRole('searchbox').fill('không có');
    await expect(page.getByText('Chưa tìm thấy từ phù hợp')).toBeVisible();
    await page.getByRole('button', { name: 'Bỏ bộ lọc' }).click();
    await page.getByRole('button', { name: 'Xóa từ sinh học' }).click();
    await page.getByRole('button', { name: 'Giữ lại' }).click();
    await expect(page.getByRole('heading', { name: 'sinh học', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Xóa toàn bộ thư viện', exact: true }).click();
    await page.getByRole('button', { name: 'Xác nhận xóa', exact: true }).click();
    await expect(page.getByText('Bắt đầu từ một từ bạn muốn nhớ')).toBeVisible();
  });
}
