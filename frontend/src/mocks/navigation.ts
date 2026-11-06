export interface NavLinkItem {
  label: string;
  path: string;
  isActive?: boolean;
}

export const mockHeaderNavLinks: NavLinkItem[] = [
  { label: 'Trang chủ', path: '/', isActive: true },
  { label: 'Thư viện', path: '#thu-vien' },
  { label: 'Khám phá', path: '#kham-pha' },
];

export const mockFooterNavLinks: NavLinkItem[] = [
  { label: 'Nguyên lý đọc', path: '#nguyen-ly-thiet-ke' },
  { label: 'Hỗ trợ', path: '#tro-giup-va-ho-tro' },
  { label: 'Quyền riêng tư', path: '#chinh-sach-rieng-tu' },
];
