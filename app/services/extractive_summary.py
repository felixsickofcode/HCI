import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass

_STOPWORDS = frozenset(
    """và của là có trong cho được các những một này đó để với khi từ không cũng như
    nhưng vì nên thì mà ở đã sẽ rất nhiều tại về theo bị do hay hoặc còn vậy thế đến ra
    vào lên đang bởi nếu thì sau trước cùng mỗi mọi hơn lại đều chỉ vẫn đây kia ấy
    tuy tuy_nhiên the a an of to in and is are for on with that this it as by""".split()
)

_ABBREVIATIONS = frozenset(
    "ts pgs gs ths ks bs tp tx mr mrs ms dr prof st vs tr ng tt al fig eq etc cf".split()
)

_BOUNDARY = re.compile(r"(?P<p>[.!?…]+[\"'”’)\]]*)(?P<ws>\s+)|(?P<nl>\n+)")
_WORD = re.compile(r"\w+", re.UNICODE)
_LAST_WORD = re.compile(r"(\w+)$", re.UNICODE)

_BULLETS = "•·▪◦‣"
_TERMINAL = re.compile(r"[.!?…:][\"'”’)\]]*$")
_SENTENCE_END = re.compile(r"[.!?…][\"'”’)\]]*$")
_REFERENCES = re.compile(
    r"^\s*(references|bibliography|tài liệu tham khảo|danh mục tài liệu tham khảo)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
_CAPTION = re.compile(r"^(table|figure|fig\.|bảng|hình)\s*\d+", re.IGNORECASE)
_NOISE = ("arxiv", "doi.org", "http")
_HEADING_MAX_CHARS = 40
_BLOCK_CHARS = 1500

_MIN_CHARS = 20
_MIN_TOKENS = 5
_MAX_CHARS = 500
_MIN_ALPHA_RATIO = 0.6 
_REDUNDANT_JACCARD = 0.5
_REDUNDANT_OVERLAP = 0.6
_OVERLAP_MIN_TOKENS = 4
_TARGET_COVERAGE = 0.6
_MIN_GAIN_RATIO = 0.25


@dataclass(frozen=True)
class ExtractedSentence:
    segment_id: str
    text: str


@dataclass
class _Candidate:
    seg_index: int
    sent_index: int
    segment_id: str
    text: str
    tokens: set[str]
    block: int = 0
    score: float = 0.0


def split_sentences(text: str) -> list[str]:
    spans: list[tuple[int, int]] = []
    start = 0
    for m in _BOUNDARY.finditer(text):
        if m.group("nl"):
            chunk = text[start:m.start("nl")].rstrip()
            line_end = text.find("\n", m.end("nl"))
            next_line = text[m.end("nl"):line_end if line_end != -1 else len(text)].strip()
            if (
                len(chunk) >= _HEADING_MAX_CHARS
                and not _TERMINAL.search(chunk)
                and next_line
                and next_line[0] not in _BULLETS
                and (len(next_line) >= _HEADING_MAX_CHARS or _TERMINAL.search(next_line))
            ):
                continue
            spans.append((start, m.start("nl")))
            start = m.end("nl")
            continue
        punct_start, punct_end = m.start("p"), m.end("p")
        if m.end() >= len(text):
            continue 
        if "\n" in m.group("ws"):
            spans.append((start, punct_end))
            start = m.end()
            continue
        nxt = text[m.end()]
        if not (nxt.isupper() or nxt.isdigit() or nxt in "\"'“‘(["):
            continue
        prev = _LAST_WORD.search(text[max(start, punct_start - 12):punct_start])
        if prev and text[punct_start] == ".":
            word = prev.group(1)
            if word.lower() in _ABBREVIATIONS or len(word) == 1:
                continue
            if word.isdigit() and len(word) <= 2:  
                continue
        spans.append((start, punct_end))
        start = m.end()
    spans.append((start, len(text)))
    cleaned = (text[a:b].strip().lstrip(_BULLETS).strip() for a, b in spans)
    return [c for c in cleaned if c]


def _tokens(sentence: str) -> list[str]:
    return _WORD.findall(unicodedata.normalize("NFC", sentence).lower())


def _content_tokens(tokens: list[str]) -> set[str]:
    return {t for t in tokens if t not in _STOPWORDS and not t.isdigit() and len(t) > 1}


def _alpha_ratio(sentence: str) -> float:
    visible = [c for c in sentence if not c.isspace()]
    if not visible:
        return 0.0
    return sum(c.isalpha() for c in visible) / len(visible)


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _overlap(a: set[str], b: set[str]) -> float:
    if min(len(a), len(b)) < _OVERLAP_MIN_TOKENS:
        return 0.0
    return len(a & b) / min(len(a), len(b))


def _is_valid(sentence: str, tokens: list[str]) -> bool:
    first = sentence[0]
    starts_ok = first.isupper() or (
        first in "\"'“‘" and len(sentence) > 1 and sentence[1].isupper()
    )
    lowered = sentence.lower()
    return (
        starts_ok
        and bool(_SENTENCE_END.search(sentence))
        and sentence.count("(") == sentence.count(")")
        and sentence.count("[") == sentence.count("]")
        and not _CAPTION.match(sentence)
        and not any(n in lowered for n in _NOISE)
        and _MIN_CHARS <= len(sentence) <= _MAX_CHARS
        and len(tokens) >= _MIN_TOKENS
        and _alpha_ratio(sentence) >= _MIN_ALPHA_RATIO
    )


def extractive_summarize(segments: list[tuple[str, str]]) -> list[ExtractedSentence]:
    candidates: list[_Candidate] = []
    freq: Counter[str] = Counter()
    block = 0
    for seg_index, (segment_id, text) in enumerate(segments):
        ref = _REFERENCES.search(text)
        if ref:
            text = text[:ref.start()]
        block_chars = 0
        for sent_index, sentence in enumerate(split_sentences(text)):
            if block_chars >= _BLOCK_CHARS:
                block += 1
                block_chars = 0
            block_chars += len(sentence)
            tokens = _tokens(sentence)
            if not _is_valid(sentence, tokens):
                continue
            content = _content_tokens(tokens)
            if not content:
                continue
            freq.update(content)
            candidate = _Candidate(seg_index, sent_index, segment_id, sentence, content, block)
            multiplier = 1.0
            if sent_index == 0:
                multiplier *= 1.2
            if seg_index == 0:
                multiplier *= 1.1
            if len(content) < 8:
                multiplier *= 0.7
            elif len(content) > 40:
                multiplier *= 0.8
            candidate.score = multiplier
            candidates.append(candidate)
        block += 1
        if ref:
            break
    if not candidates:
        return []

    total = sum(freq.values())
    covered: set[str] = set()
    chosen: list[_Candidate] = []

    def value(c: _Candidate) -> float:
        gain = sum(freq[t] for t in c.tokens - covered)
        return gain / (len(c.tokens) ** 0.6) * c.score

    def redundant(c: _Candidate) -> bool:
        return any(
            _jaccard(c.tokens, o.tokens) > _REDUNDANT_JACCARD
            or _overlap(c.tokens, o.tokens) > _REDUNDANT_OVERLAP
            for o in chosen
        )

    def take(c: _Candidate) -> None:
        chosen.append(c)
        covered.update(c.tokens)

    def coverage() -> float:
        return sum(freq[t] for t in covered) / total

    best_first = max(value(c) for c in candidates)

    for block_id in sorted({c.block for c in candidates}):
        pool = [c for c in candidates if c.block == block_id and not redundant(c)]
        if pool:
            take(max(pool, key=value))

    taken = {id(c) for c in chosen}
    remaining = [c for c in candidates if id(c) not in taken]
    while remaining and coverage() < _TARGET_COVERAGE:
        remaining = [c for c in remaining if not redundant(c)]
        if not remaining:
            break
        best = max(remaining, key=value)
        if value(best) < best_first * _MIN_GAIN_RATIO:
            break
        take(best)
        remaining.remove(best)

    chosen.sort(key=lambda c: (c.seg_index, c.sent_index))
    return [ExtractedSentence(c.segment_id, c.text) for c in chosen]