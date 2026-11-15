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
    "ts pgs gs ths ks bs tp tx mr mrs ms dr prof st vs tr ng tt".split()
)

_BOUNDARY = re.compile(r"(?P<p>[.!?…]+[\"'”’)\]]*)(?P<ws>\s+)|(?P<nl>\n+)")
_WORD = re.compile(r"\w+", re.UNICODE)
_LAST_WORD = re.compile(r"(\w+)$", re.UNICODE)

_BULLETS = "•·▪◦‣"

_MIN_CHARS = 20
_MIN_TOKENS = 5
_MAX_CHARS = 500
_MIN_ALPHA_RATIO = 0.6 
_REDUNDANT_JACCARD = 0.5
_REDUNDANT_OVERLAP = 0.6
_OVERLAP_MIN_TOKENS = 4
_MIN_SCORE_RATIO = 0.35 


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
    score: float = 0.0


def split_sentences(text: str) -> list[str]:
    spans: list[tuple[int, int]] = []
    start = 0
    for m in _BOUNDARY.finditer(text):
        if m.group("nl"):
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


def extractive_summarize(segments: list[tuple[str, str]]) -> list[ExtractedSentence]:
    candidates: list[_Candidate] = []
    freq: Counter[str] = Counter()
    for seg_index, (segment_id, text) in enumerate(segments):
        for sent_index, sentence in enumerate(split_sentences(text)):
            tokens = _tokens(sentence)
            if (
                sentence.endswith(":")
                or len(sentence) < _MIN_CHARS
                or len(sentence) > _MAX_CHARS
                or len(tokens) < _MIN_TOKENS
                or _alpha_ratio(sentence) < _MIN_ALPHA_RATIO
            ):
                continue
            content = _content_tokens(tokens)
            if not content:
                continue
            freq.update(content)
            candidates.append(
                _Candidate(seg_index, sent_index, segment_id, sentence, content)
            )
    if not candidates:
        return []

    for c in candidates:
        raw = sum(freq[t] for t in c.tokens) / (len(c.tokens) ** 0.6)
        if c.sent_index == 0:
            raw *= 1.2 
        if c.seg_index == 0:
            raw *= 1.1
        n = len(c.tokens)
        if n < 8:
            raw *= 0.7
        elif n > 40:
            raw *= 0.8
        c.score = raw

    ranked = sorted(candidates, key=lambda c: c.score, reverse=True)
    floor = ranked[0].score * _MIN_SCORE_RATIO
    chosen: list[_Candidate] = []
    used_segments: set[int] = set()

    def redundant(c: _Candidate) -> bool:
        return any(
            _jaccard(c.tokens, o.tokens) > _REDUNDANT_JACCARD
            or _overlap(c.tokens, o.tokens) > _REDUNDANT_OVERLAP
            for o in chosen
        )

    for c in ranked:
        if c.seg_index in used_segments or redundant(c):
            continue
        chosen.append(c)
        used_segments.add(c.seg_index)
    for c in ranked:
        if c in chosen or c.score < floor or redundant(c):
            continue
        chosen.append(c)

    chosen.sort(key=lambda c: (c.seg_index, c.sent_index))
    return [ExtractedSentence(c.segment_id, c.text) for c in chosen]