import math
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from typing import Optional


_STOPWORDS = frozenset(
    """và của là có trong cho được các những một này đó để với khi từ không cũng như
    nhưng vì nên thì mà ở đã sẽ rất nhiều tại về theo bị do hay hoặc còn vậy thế đến ra
    vào lên đang bởi nếu sau trước cùng mỗi mọi hơn lại đều chỉ vẫn đây kia ấy
    the a an of to in and is are was were be been for on with that this it as by at
    or from but not they their its which who will can has have had""".split()
)

_ABBREVIATIONS = frozenset(
    "ts pgs gs ths ks bs tp tx mr mrs ms dr prof st vs tr ng tt al fig eq etc cf".split()
)

_BOUNDARY = re.compile(
    r'(?P<p>[.!?…]+["\'”’)\]]*)(?P<ws>\s+)|(?P<nl>\n+)'
)
_WORD = re.compile(r"\d+(?:[.,]\d+)+|\w+", re.UNICODE)
_LAST_WORD = re.compile(r"(\w+)$", re.UNICODE)
_SPACES = re.compile(r"\s+")
_INVISIBLE = re.compile("[\u200b\u2060\ufeff\u00ad]")
_HYPHEN_BREAK = re.compile(r"(\w)-\n([^\W\d_])")

_BULLETS = "•·▪◦‣"
_QUOTES = "\"'“‘"
_STARTERS = _QUOTES + "([" + _BULLETS + "-–—"
_TERMINAL = re.compile(r'[.!?…:]["\'”’)\]]*$')
_SENTENCE_END = re.compile(r'[.!?…]["\'”’)\]]*$')

_REFERENCES = re.compile(
    r"^[ \t]*(?:\d+[.)]?[ \t]+)?"
    r"(?:references|bibliography|tài liệu tham khảo|danh mục tài liệu tham khảo)"
    r"[ \t]*:?[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)

_CAPTION = re.compile(
    r"^(table|figure|fig\.|bảng|hình)\s*\d+",
    re.IGNORECASE,
)

_NOISE = ("http", "www.")

_NUMBER = re.compile(r"\d+(?:[.,]\d+)?\s*%?")

_CUE = re.compile(
    r"\b(?:kết luận|tóm lại|nhìn chung|quan trọng|chủ yếu|chính là|đáng chú ý|"
    r"cần lưu ý|cam kết|thống nhất|quyết định|đề xuất|cho biết|nhận định|"
    r"nếu .{0,100}(?:thì|sẽ)|"
    r"in conclusion|in summary|overall|important(?:ly)?|significant(?:ly)?|notabl[ey]|"
    r"we propose|we show|results show|achieves|outperforms|recommend(?:s|ed)?|"
    r"decided|agreed|if .{0,100}\b(?:then|will|would)|"
    r"(?:main|key) (?:point|finding|result)s?)\b",
    re.IGNORECASE,
)

_EDGE_PUNCT = "\"'“”‘’()[],.;:!?"

_MIN_CHARS = 20
_MIN_TOKENS = 5
_MAX_CHARS = 500
_RELAXED_LENGTH_FACTOR = 3
_MIN_ALPHA_RATIO = 0.5

_TARGET_COVERAGE = 0.68
_MAX_RATIO = 0.40
_MIN_SENTENCES = 3

_DAMPING = 0.85
_PAGERANK_ITERATIONS = 40
_TOLERANCE = 1e-6
_MIN_EDGE = 0.05

_MMR_LAMBDA = 0.75
_REDUNDANT_THRESHOLD = 0.88

_W_RELEVANCE = 0.40
_W_NOVELTY = 0.30
_W_INFO = 0.25
_POSITION_BONUS = 0.05
_SEGMENT_BONUS = 0.10
_DEPENDENT_PENALTY = 0.85

_REPEAT_LIMIT = 3
_REFERENCES_MIN_POSITION = 0.5

_DEPENDENT_OPENERS = (
    "trong đó",
    "trong số đó",
    "ngoài ra",
    "bên cạnh đó",
    "theo đó",
    "cụ thể",
    "đồng thời",
    "tuy nhiên",
    "mặc dù",
    "do đó",
    "vì vậy",
    "kết quả là",
    "nhờ đó",
    "từ đó",
    "đặc biệt là",
    "nói cách khác",
    "moreover",
    "however",
    "therefore",
    "in addition",
    "as a result",
    "furthermore",
    "additionally",
)

_DEPENDENT = re.compile(
    r"^\W*(?:" + "|".join(re.escape(o) for o in _DEPENDENT_OPENERS) + r")\b",
    re.IGNORECASE,
)


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
    tokens: Counter
    terms: Counter
    info: float
    pagerank: float = 0.0


def _join_hyphen(match):
    if match.group(2).islower():
        return match.group(1) + match.group(2)
    return match.group(0)


def _normalize(text: str) -> str:
    text = unicodedata.normalize("NFC", text)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = _INVISIBLE.sub("", text)
    return _HYPHEN_BREAK.sub(_join_hyphen, text)


def _is_soft_wrap(text, start, match):
    if len(match.group("nl")) != 1:
        return False

    chunk = text[start:match.start("nl")].rstrip()

    if len(chunk) < 40 or _TERMINAL.search(chunk):
        return False

    line_end = text.find("\n", match.end("nl"))
    next_line = text[
        match.end("nl"):
        line_end if line_end != -1 else len(text)
    ].strip()

    if not next_line or next_line[0] in _BULLETS:
        return False

    return len(next_line) >= 40 or bool(_TERMINAL.search(next_line))


def _is_abbreviation(text, start, punct_start):
    if text[punct_start] != ".":
        return False

    window = text[max(start, punct_start - 30):punct_start]
    prev = _LAST_WORD.search(window)

    if not prev:
        return False

    word = prev.group(1)

    if word.lower() in _ABBREVIATIONS or len(word) == 1:
        return True

    return (
        word.isdigit()
        and len(word) <= 2
        and text[start:punct_start].strip() == word
    )


def split_sentences(text: str) -> list[str]:
    spans = []
    start = 0

    for m in _BOUNDARY.finditer(text):
        if m.group("nl"):
            if _is_soft_wrap(text, start, m):
                continue

            spans.append((start, m.start("nl")))
            start = m.end("nl")
            continue

        if m.end() >= len(text):
            continue

        punct_start = m.start("p")
        punct_end = m.end("p")

        if "\n" in m.group("ws"):
            spans.append((start, punct_end))
            start = m.end()
            continue

        nxt = text[m.end()]

        if not (
            nxt.isdigit()
            or nxt in _STARTERS
            or (nxt.isalpha() and not nxt.islower())
        ):
            continue

        if _is_abbreviation(text, start, punct_start):
            continue

        spans.append((start, punct_end))
        start = m.end()

    spans.append((start, len(text)))

    cleaned = (
        _SPACES.sub(" ", text[a:b]).strip().lstrip(_BULLETS).strip()
        for a, b in spans
    )

    return [s for s in cleaned if s]


def _tokens(sentence: str) -> list[str]:
    sentence = unicodedata.normalize("NFC", sentence).lower()
    return _WORD.findall(sentence)


def _keep(token: str) -> bool:
    return token not in _STOPWORDS and (len(token) > 1 or token.isdigit())


def _content_tokens(tokens: list[str]) -> Counter:
    return Counter(t for t in tokens if _keep(t))


def _bigrams(tokens: list[str]) -> Counter:
    return Counter(
        f"{a} {b}"
        for a, b in zip(tokens, tokens[1:])
        if _keep(a) and _keep(b)
    )


def _alpha_ratio(sentence: str) -> float:
    visible = [c for c in sentence if not c.isspace()]

    if not visible:
        return 0.0

    return sum(c.isalpha() for c in visible) / len(visible)


def _is_valid(sentence: str, tokens: list[str], strict: bool) -> bool:
    if not sentence:
        return False

    body = sentence.lstrip(_QUOTES)

    if not body:
        return False

    lowered = sentence.lower()
    max_chars = _MAX_CHARS if strict else _MAX_CHARS * _RELAXED_LENGTH_FACTOR

    structural = (
        sentence.count("(") == sentence.count(")")
        and sentence.count("[") == sentence.count("]")
        and not _CAPTION.match(sentence)
        and not any(n in lowered for n in _NOISE)
        and _MIN_CHARS <= len(sentence) <= max_chars
        and len(tokens) >= _MIN_TOKENS
        and _alpha_ratio(sentence) >= _MIN_ALPHA_RATIO
    )

    if not structural:
        return False

    if strict:
        return not body[0].islower() and bool(_SENTENCE_END.search(sentence))

    return True


def _informativeness(sentence: str) -> float:
    numbers = len(_NUMBER.findall(sentence))

    words = [w.strip(_EDGE_PUNCT) for w in sentence.split()]
    entities = sum(
        1 for w in words[1:]
        if w and w[0].isalpha() and w[0].isupper()
    )

    cue = 1 if _CUE.search(sentence) else 0

    value = (
        0.15 * min(numbers, 2)
        + 0.15 * min(entities, 3)
        + 0.40 * cue
    )

    return min(1.0, value)


def _dependent_opener(sentence: str) -> bool:
    return bool(_DEPENDENT.match(sentence))


def _build_tfidf(candidates):
    document_frequency = Counter()

    for c in candidates:
        document_frequency.update(c.terms.keys())

    n = len(candidates)
    vectors = []

    for c in candidates:
        vector = {}

        for word, count in c.terms.items():
            idf = math.log((1 + n) / (1 + document_frequency[word])) + 1.0
            vector[word] = (1 + math.log(count)) * idf

        norm = math.sqrt(sum(v * v for v in vector.values()))

        if norm:
            vector = {word: v / norm for word, v in vector.items()}

        vectors.append(vector)

    return vectors


def _similarities(vectors):
    postings = defaultdict(list)

    for i, vector in enumerate(vectors):
        for term, weight in vector.items():
            postings[term].append((i, weight))

    sims = []

    for i, vector in enumerate(vectors):
        accumulated = defaultdict(float)

        for term, weight in vector.items():
            for j, other in postings[term]:
                if j != i:
                    accumulated[j] += weight * other

        sims.append(
            {j: s for j, s in accumulated.items() if s >= _MIN_EDGE}
        )

    return sims


def _textrank(sims):
    n = len(sims)

    if n == 0:
        return []

    if n == 1:
        return [1.0]

    totals = [sum(s.values()) for s in sims]
    scores = [1.0 / n] * n

    for _ in range(_PAGERANK_ITERATIONS):
        dangling = sum(scores[i] for i in range(n) if totals[i] == 0)
        base = (1 - _DAMPING) / n + _DAMPING * dangling / n
        updated = [base] * n

        for i in range(n):
            if totals[i]:
                share = _DAMPING * scores[i] / totals[i]

                for j, weight in sims[i].items():
                    updated[j] += share * weight

        delta = sum(abs(a - b) for a, b in zip(scores, updated))
        scores = updated

        if delta < _TOLERANCE:
            break

    maximum = max(scores)

    if maximum:
        scores = [s / maximum for s in scores]

    return scores


def _novelty(candidate, total, covered, idf):
    if not total:
        return 0.0

    new = sum(
        count * idf[word]
        for word, count in candidate.tokens.items()
        if word not in covered
    )

    return new / total


def _prepare(segments):
    normalized = [(sid, _normalize(text)) for sid, text in segments]
    total = sum(len(text) for _, text in normalized)
    prepared = []
    offset = 0

    for segment_id, text in normalized:
        matches = list(_REFERENCES.finditer(text))

        if (
            matches
            and offset + matches[-1].start() >= _REFERENCES_MIN_POSITION * total
        ):
            prepared.append((segment_id, text[:matches[-1].start()]))
            break

        prepared.append((segment_id, text))
        offset += len(text)

    return prepared


def _collect(prepared, strict):
    candidates = []

    for seg_index, (segment_id, text) in enumerate(prepared):
        for sent_index, sentence in enumerate(split_sentences(text)):
            tokens = _tokens(sentence)

            if not _is_valid(sentence, tokens, strict):
                continue

            content = _content_tokens(tokens)

            if not content:
                continue

            candidates.append(
                _Candidate(
                    seg_index=seg_index,
                    sent_index=sent_index,
                    segment_id=segment_id,
                    text=sentence,
                    tokens=content,
                    terms=content + _bigrams(tokens),
                    info=_informativeness(sentence),
                )
            )

    return candidates


def _drop_repeats(candidates):
    counts = Counter(c.text.lower() for c in candidates)
    seen = set()
    kept = []

    for c in candidates:
        key = c.text.lower()

        if counts[key] >= _REPEAT_LIMIT or key in seen:
            continue

        seen.add(key)
        kept.append(c)

    return kept


def extractive_summarize(
    segments: list[tuple[str, str]],
    target_coverage: float = _TARGET_COVERAGE,
    max_ratio: float = _MAX_RATIO,
    min_sentences: int = _MIN_SENTENCES,
    max_sentences: Optional[int] = None,
) -> list[ExtractedSentence]:

    prepared = _prepare(segments)

    candidates = _drop_repeats(_collect(prepared, strict=True))

    if len(candidates) < min_sentences:
        candidates = _drop_repeats(_collect(prepared, strict=False))

    if not candidates:
        return []

    sims = _similarities(_build_tfidf(candidates))

    for candidate, rank in zip(candidates, _textrank(sims)):
        candidate.pagerank = rank

    n = len(candidates)

    document_frequency = Counter()

    for candidate in candidates:
        document_frequency.update(candidate.tokens.keys())

    idf = {
        word: math.log((1 + n) / (1 + count)) + 1.0
        for word, count in document_frequency.items()
    }

    word_weight = {
        word: document_frequency[word] * idf[word]
        for word in document_frequency
    }

    total_weight = sum(word_weight.values())

    candidate_weight = [
        sum(count * idf[word] for word, count in c.tokens.items())
        for c in candidates
    ]

    limit = max(min_sentences, math.ceil(max_ratio * n))

    if max_sentences is not None:
        limit = min(limit, max(1, max_sentences))

    covered = set()
    covered_weight = 0.0
    chosen = []
    chosen_segments = set()
    remaining = list(range(n))
    max_sim = [0.0] * n

    def score(index):
        candidate = candidates[index]

        novelty = _novelty(
            candidate, candidate_weight[index], covered, idf
        )

        relevance = (
            _W_RELEVANCE * candidate.pagerank
            + _W_NOVELTY * novelty
            + _W_INFO * candidate.info
        )

        if candidate.sent_index == 0:
            relevance += _POSITION_BONUS

        if _dependent_opener(candidate.text):
            relevance *= _DEPENDENT_PENALTY

        value = (
            _MMR_LAMBDA * relevance
            - (1 - _MMR_LAMBDA) * max_sim[index]
        )

        if candidate.seg_index not in chosen_segments:
            value += _SEGMENT_BONUS

        return value

    while remaining and len(chosen) < limit:
        coverage = (
            covered_weight / total_weight if total_weight else 1.0
        )

        if len(chosen) >= min_sentences and coverage >= target_coverage:
            break

        best = max(remaining, key=score)

        chosen.append(best)
        chosen_segments.add(candidates[best].seg_index)

        for word in candidates[best].tokens:
            if word not in covered:
                covered.add(word)
                covered_weight += word_weight[word]

        for j, similarity in sims[best].items():
            if similarity > max_sim[j]:
                max_sim[j] = similarity

        remaining = [
            i for i in remaining
            if i != best and max_sim[i] < _REDUNDANT_THRESHOLD
        ]

    chosen.sort(
        key=lambda i: (
            candidates[i].seg_index,
            candidates[i].sent_index,
        )
    )

    return [
        ExtractedSentence(candidates[i].segment_id, candidates[i].text)
        for i in chosen
    ]