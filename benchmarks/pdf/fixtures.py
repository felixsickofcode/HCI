"""Create a small, distributable PDF for harness smoke tests.

The built-in PDF font is ASCII-only. This fixture does not measure Vietnamese
text quality; a reviewed, distributable Vietnamese corpus is still needed.
"""

from pathlib import Path

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject


def build_simple_pdf(path: Path) -> None:
    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)
    font = DictionaryObject(
        {
            NameObject("/Type"): NameObject("/Font"),
            NameObject("/Subtype"): NameObject("/Type1"),
            NameObject("/BaseFont"): NameObject("/Helvetica"),
        }
    )
    page[NameObject("/Resources")] = DictionaryObject(
        {NameObject("/Font"): DictionaryObject({NameObject("/F1"): writer._add_object(font)})}
    )
    commands = [
        "BT /F1 18 Tf 50 740 Td (Simple document) Tj ET",
        "BT /F1 12 Tf 50 700 Td (First paragraph for parser smoke testing.) Tj ET",
        "BT /F1 12 Tf 50 665 Td (Second paragraph stays separate.) Tj ET",
    ]
    content = DecodedStreamObject()
    content.set_data("\n".join(commands).encode("ascii"))
    page[NameObject("/Contents")] = writer._add_object(content)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("wb") as stream:
        writer.write(stream)


if __name__ == "__main__":
    build_simple_pdf(Path(__file__).parent / "fixtures" / "simple.pdf")
