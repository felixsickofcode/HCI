"""Bounded, serialized access to PDFium (including handle cleanup)."""

from contextlib import closing, contextmanager
from math import ceil, isfinite, sqrt
from threading import RLock

import pypdfium2

# PDFium is not thread-safe, even across separate documents. All runtime users
# must share this lock and close native handles before releasing it.
_PDFIUM_LOCK = RLock()


@contextmanager
def open_pdf(data: bytes):
    with _PDFIUM_LOCK, closing(pypdfium2.PdfDocument(data)) as document:
        yield document


def render_page(page, *, scale: float, max_pixels: int, crop=(0, 0, 0, 0)):
    """Return an owned PIL image; no PDFium bitmap survives this function."""
    with _PDFIUM_LOCK:
        width, height = page.get_size()
        width -= crop[0] + crop[2]
        height -= crop[1] + crop[3]
        if max_pixels < 1 or not all(isfinite(value) and value > 0 for value in (width, height, scale)):
            raise ValueError("Invalid PDF render dimensions")
        # Leave room for integer rounding in PdfPage.render().
        scale = min(scale, sqrt(max_pixels / ((width + 1) * (height + 1))))
        while ceil(width * scale) * ceil(height * scale) > max_pixels:
            scale *= 0.99
        with closing(page.render(scale=scale, crop=crop)) as bitmap:
            image = bitmap.to_pil()
            try:
                return image.copy()
            finally:
                image.close()
