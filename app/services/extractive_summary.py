import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass


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
_WORD = re.compile(r"\w+", re.UNICODE)
_LAST_WORD = re.compile(r"(\w+)$", re.UNICODE)

_BULLETS = "•·▪◦‣"
_QUOTES = "\"'“‘"
_TERMINAL = re.compile(r'[.!?…:]["\'”’)\]]*$')
_SENTENCE_END = re.compile(r'[.!?…]["\'”’)\]]*$')

_REFERENCES = re.compile(
    r"^\s*(references|bibliography|tài liệu tham khảo|"
    r"danh mục tài liệu tham khảo)\s*$",
    re.IGNORECASE | re.MULTILINE
)

_CAPTION = re.compile(
    r"^(table|figure|fig\.|bảng|hình)\s*\d+",
    re.IGNORECASE
)

_NOISE = ("http", "www.")

_NUMBER = re.compile(r"\d+(?:[.,]\d+)?\s*%?")

_CUE = re.compile(
    r"kết luận|tóm lại|nhìn chung|quan trọng|chủ yếu|chính là|đáng chú ý|"
    r"cần lưu ý|cam kết|thống nhất|quyết định|đề xuất|cho biết|nhận định|"
    r"nếu .{0,100}(?:thì|sẽ)|"
    r"in conclusion|in summary|overall|important|significant|notably|"
    r"we propose|we show|results show|achieves|outperforms|recommend|"
    r"decided|agreed|\bif\b .{0,100}\b(?:then|will|would)\b|main\b|key\b",
    re.IGNORECASE
)

_EDGE_PUNCT = "\"'“”‘’()[],.;:!?"

_MIN_CHARS = 20
_MIN_TOKENS = 5
_MAX_CHARS = 500
_MIN_ALPHA_RATIO = 0.6

_TARGET_COVERAGE = 0.68
_MAX_RATIO = 0.40
_MIN_SENTENCES = 3

_DAMPING = 0.85
_PAGERANK_ITERATIONS = 40

_MMR_LAMBDA = 0.75
_REDUNDANT_THRESHOLD = 0.88

_W_RELEVANCE = 0.40
_W_NOVELTY = 0.30
_W_INFO = 0.25
_POSITION_BONUS = 0.05
_SEGMENT_BONUS = 0.10
_DEPENDENT_PENALTY = 0.85

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
    info: float
    pagerank: float = 0.0


def split_sentences(text: str) -> list[str]:
    spans = []
    start = 0

    for m in _BOUNDARY.finditer(text):
        if m.group("nl"):
            chunk = text[start:m.start("nl")].rstrip()

            line_end = text.find("\n", m.end("nl"))
            next_line = text[
                m.end("nl"):
                line_end if line_end != -1 else len(text)
            ].strip()

            if (
                len(m.group("nl")) == 1
                and len(chunk) >= 40
                and not _TERMINAL.search(chunk)
                and next_line
                and next_line[0] not in _BULLETS
                and (
                    len(next_line) >= 40
                    or _TERMINAL.search(next_line)
                )
            ):
                continue

            spans.append((start, m.start("nl")))
            start = m.end("nl")
            continue

        punct_start = m.start("p")
        punct_end = m.end("p")

        if m.end() >= len(text):
            continue

        if "\n" in m.group("ws"):
            spans.append((start, punct_end))
            start = m.end()
            continue

        nxt = text[m.end()]

        if not (
            nxt.isdigit()
            or nxt in _QUOTES
            or nxt in "(["
            or (nxt.isalpha() and not nxt.islower())
        ):
            continue

        prev = _LAST_WORD.search(
            text[max(start, punct_start - 12):punct_start]
        )

        if prev and text[punct_start] == ".":
            word = prev.group(1)

            if word.lower() in _ABBREVIATIONS or len(word) == 1:
                continue

            if (
                word.isdigit()
                and len(word) <= 2
                and text[start:punct_start].strip() == word
            ):
                continue

        spans.append((start, punct_end))
        start = m.end()

    spans.append((start, len(text)))

    cleaned = (
        text[a:b].strip().lstrip(_BULLETS).strip()
        for a, b in spans
    )

    return [s for s in cleaned if s]


def _tokens(sentence: str) -> list[str]:
    sentence = unicodedata.normalize("NFC", sentence).lower()
    return _WORD.findall(sentence)


def _content_tokens(tokens: list[str]) -> Counter:
    return Counter(
        t for t in tokens
        if (
            t not in _STOPWORDS
            and (len(t) > 1 or t.isdigit())
        )
    )


def _alpha_ratio(sentence: str) -> float:
    visible = [c for c in sentence if not c.isspace()]

    if not visible:
        return 0.0

    return sum(c.isalpha() for c in visible) / len(visible)


def _is_valid(sentence: str, tokens: list[str]) -> bool:
    if not sentence:
        return False

    body = sentence.lstrip(_QUOTES)

    if not body:
        return False

    lowered = sentence.lower()

    return (
        not body[0].islower()
        and bool(_SENTENCE_END.search(sentence))
        and sentence.count("(") == sentence.count(")")
        and sentence.count("[") == sentence.count("]")
        and not _CAPTION.match(sentence)
        and not any(n in lowered for n in _NOISE)
        and _MIN_CHARS <= len(sentence) <= _MAX_CHARS
        and len(tokens) >= _MIN_TOKENS
        and _alpha_ratio(sentence) >= _MIN_ALPHA_RATIO
    )


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
    lowered = sentence.lower().strip()

    return any(
        lowered.startswith(opener)
        for opener in _DEPENDENT_OPENERS
    )


def _cosine(a: dict, b: dict) -> float:
    if not a or not b:
        return 0.0

    if len(a) > len(b):
        a, b = b, a

    dot = sum(
        value * b.get(word, 0.0)
        for word, value in a.items()
    )

    if dot <= 0:
        return 0.0

    norm_a = math.sqrt(sum(v * v for v in a.values()))
    norm_b = math.sqrt(sum(v * v for v in b.values()))

    if not norm_a or not norm_b:
        return 0.0

    return dot / (norm_a * norm_b)


def _build_tfidf(candidates):
    document_frequency = Counter()

    for c in candidates:
        document_frequency.update(c.tokens.keys())

    n = len(candidates)
    vectors = []

    for c in candidates:
        vector = {}

        for word, count in c.tokens.items():
            idf = math.log(
                (1 + n) / (1 + document_frequency[word])
            ) + 1.0

            vector[word] = (1 + math.log(count)) * idf

        norm = math.sqrt(
            sum(value * value for value in vector.values())
        )

        if norm:
            vector = {
                word: value / norm
                for word, value in vector.items()
            }

        vectors.append(vector)

    return vectors


def _textrank(vectors):
    n = len(vectors)

    if n == 0:
        return []

    if n == 1:
        return [1.0]

    graph = [[] for _ in range(n)]
    totals = [0.0] * n

    for i in range(n):
        for j in range(i + 1, n):
            similarity = _cosine(vectors[i], vectors[j])

            if similarity > 0:
                graph[i].append((j, similarity))
                graph[j].append((i, similarity))
                totals[i] += similarity
                totals[j] += similarity

    scores = [1.0 / n] * n

    for _ in range(_PAGERANK_ITERATIONS):
        updated = [(1 - _DAMPING) / n] * n

        for i in range(n):
            if totals[i] == 0:
                share = _DAMPING * scores[i] / n

                for j in range(n):
                    updated[j] += share
            else:
                for j, weight in graph[i]:
                    updated[j] += (
                        _DAMPING
                        * scores[i]
                        * weight
                        / totals[i]
                    )

        scores = updated

    maximum = max(scores)

    if maximum:
        scores = [s / maximum for s in scores]

    return scores


def _novelty(candidate, covered, idf):
    total = sum(
        count * idf.get(word, 1.0)
        for word, count in candidate.tokens.items()
    )

    if not total:
        return 0.0

    new = sum(
        count * idf.get(word, 1.0)
        for word, count in candidate.tokens.items()
        if word not in covered
    )

    return new / total


def extractive_summarize(
    segments: list[tuple[str, str]],
    target_coverage: float = _TARGET_COVERAGE,
    max_ratio: float = _MAX_RATIO,
    min_sentences: int = _MIN_SENTENCES,
) -> list[ExtractedSentence]:

    candidates = []

    for seg_index, (segment_id, text) in enumerate(segments):
        ref = _REFERENCES.search(text)

        if ref:
            text = text[:ref.start()]

        for sent_index, sentence in enumerate(split_sentences(text)):
            tokens = _tokens(sentence)

            if not _is_valid(sentence, tokens):
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
                    info=_informativeness(sentence),
                )
            )

        if ref:
            break

    if not candidates:
        return []

    vectors = _build_tfidf(candidates)
    ranks = _textrank(vectors)

    for candidate, rank in zip(candidates, ranks):
        candidate.pagerank = rank

    document_frequency = Counter()

    for candidate in candidates:
        document_frequency.update(candidate.tokens.keys())

    n = len(candidates)

    idf = {
        word: math.log((1 + n) / (1 + count)) + 1.0
        for word, count in document_frequency.items()
    }

    total_weight = sum(
        count * idf[word]
        for word, count in document_frequency.items()
    )

    max_sentences = max(
        min_sentences,
        math.ceil(max_ratio * n)
    )

    covered = set()
    covered_weight = 0.0
    chosen = []
    remaining = list(range(n))
    max_sim = [0.0] * n
    chosen_segments = set()

    def score(index):
        candidate = candidates[index]

        novelty = _novelty(candidate, covered, idf)

        position_bonus = (
            _POSITION_BONUS if candidate.sent_index == 0 else 0.0
        )

        segment_bonus = (
            _SEGMENT_BONUS
            if candidate.seg_index not in chosen_segments
            else 0.0
        )

        relevance_score = (
            _W_RELEVANCE * candidate.pagerank
            + _W_NOVELTY * novelty
            + _W_INFO * candidate.info
            + position_bonus
        )

        if _dependent_opener(candidate.text):
            relevance_score *= _DEPENDENT_PENALTY

        return (
            _MMR_LAMBDA * relevance_score
            - (1 - _MMR_LAMBDA) * max_sim[index]
            + segment_bonus
        )

    while remaining and len(chosen) < max_sentences:
        current_coverage = (
            covered_weight / total_weight if total_weight else 1.0
        )

        if (
            len(chosen) >= min_sentences
            and current_coverage >= target_coverage
        ):
            break

        best_index = max(remaining, key=score)
        remaining.remove(best_index)

        if max_sim[best_index] >= _REDUNDANT_THRESHOLD:
            continue

        chosen.append(best_index)
        chosen_segments.add(candidates[best_index].seg_index)

        for word in candidates[best_index].tokens:
            if word not in covered:
                covered.add(word)
                covered_weight += document_frequency[word] * idf[word]

        for i in remaining:
            similarity = _cosine(vectors[i], vectors[best_index])

            if similarity > max_sim[i]:
                max_sim[i] = similarity

    chosen.sort(
        key=lambda i: (
            candidates[i].seg_index,
            candidates[i].sent_index
        )
    )

    return [
        ExtractedSentence(
            candidates[i].segment_id,
            candidates[i].text
        )
        for i in chosen
    ]