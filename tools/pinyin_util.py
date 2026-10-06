"""Пиньинь: разбиение слитной записи на слоги по таблице слогов курса (src/data/syllables.json)."""
import json, re, unicodedata
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data"
SYL = set(json.loads((DATA / "syllables.json").read_text(encoding="utf-8")))
# в таблице курса нет слогов-междометий; добавляем только реально встречающиеся
SYL |= {"m", "n", "ng", "hm", "yo", "lo", "ei", "o"}
TM = dict(zip("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹ", "aaaaeeeeiiiioooouuuuvvvvnnn"))
LETTERS = "a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ"

def toneless(s):
    s = unicodedata.normalize("NFC", s.lower())
    return "".join(TM.get(ch, ch) for ch in s).replace("ü", "v")

def han(s):
    return [c for c in s if "一" <= c <= "鿿"]

def split_token(tok, n=None, er=False):
    """Все разбиения токена на допустимые слоги (эрхуа: слог + r). n — нужное число слогов."""
    t = toneless(tok)
    out = []
    def rec(i, acc):
        if n is not None and len(acc) > n:
            return
        if i == len(t):
            out.append(acc[:]); return
        for L in range(min(6, len(t) - i), 0, -1):
            piece = t[i:i + L]
            ok = piece in SYL or (er and piece.endswith("r") and len(piece) > 1 and piece[:-1] in SYL and piece != "er")
            if ok:
                acc.append((i, i + L)); rec(i + L, acc); acc.pop()
    rec(0, [])
    return [[tok[a:b] for a, b in seg] for seg in out]

def syllables(p, s):
    """Слоги слова по одному на иероглиф (эрхуа — к предыдущему). None, если не удаётся."""
    toks = [x for x in re.split(r"[\s'’\-]+", p.strip().replace("u:", "ü")) if x]
    toks = [re.sub("[^" + LETTERS + "]", "", x) for x in toks]
    toks = [x for x in toks if x]
    hz = han(s)
    n_er = sum(1 for i, c in enumerate(hz) if c == "儿" and i > 0)
    targets = {len(hz), len(hz) - n_er}
    # перебор: каждому токену — своё разбиение, суммарно нужное число слогов
    def rec(i, acc):
        if i == len(toks):
            return acc if len(acc) in targets else None
        for seg in split_token(toks[i], er=n_er > 0):
            r = rec(i + 1, acc + seg)
            if r:
                return r
        return None
    res = rec(0, [])
    return res
