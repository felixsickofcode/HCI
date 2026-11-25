export interface AnchorRect {
  left: number;
  top: number;
  bottom: number;
  width?: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export const POPOVER_WIDTH = 344;
export const POPOVER_GAP = 10;
const VIEWPORT_MARGIN = 12;
const MIN_VISIBLE_SIDE = 180;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export const popoverWidth = (viewport: ViewportSize) =>
  Math.min(POPOVER_WIDTH, viewport.width - VIEWPORT_MARGIN * 2);

/** Đặt popover cạnh vùng chọn: ưu tiên dưới, lật lên trên khi thiếu chỗ, luôn nằm trong biên. */
export function placePopover(anchor: AnchorRect, viewport: ViewportSize) {
  const width = popoverWidth(viewport);
  const centerX = anchor.left + (anchor.width ?? 0) / 2;
  const left = clamp(centerX - width / 2, VIEWPORT_MARGIN, viewport.width - width - VIEWPORT_MARGIN);
  const spaceBelow = viewport.height - anchor.bottom - POPOVER_GAP - VIEWPORT_MARGIN;
  const spaceAbove = anchor.top - POPOVER_GAP - VIEWPORT_MARGIN;
  const placement: 'below' | 'above' =
    spaceBelow >= MIN_VISIBLE_SIDE || spaceBelow >= spaceAbove ? 'below' : 'above';
  const available = placement === 'below' ? spaceBelow : spaceAbove;
  return {
    left,
    width,
    placement,
    // Bên dưới tính từ đáy vùng chọn; bên trên dùng translateY(-100%) nên không cần đo chiều cao.
    top: placement === 'below' ? anchor.bottom + POPOVER_GAP : anchor.top - POPOVER_GAP,
    maxHeight: clamp(available, 160, 460),
    caretLeft: clamp(centerX - left, 22, width - 22),
  };
}

/** Popover chỉ đóng khi vùng chọn đã cuộn ra khỏi khung nhìn, không đóng khi vừa cuộn nhẹ. */
export const isAnchorVisible = (anchor: AnchorRect, viewport: ViewportSize, margin = 8) =>
  anchor.bottom > margin && anchor.top < viewport.height - margin;
