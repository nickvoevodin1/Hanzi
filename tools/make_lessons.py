#!/usr/bin/env python3
"""Собрать src/data/lessons.json — данные по урокам Кондрашевского для приложения.

Для каждого урока 1–30:
  t   — название, sub — заголовок текста урока
  o   — слова в порядке учебника (ключ карточки: s, у омографов — key «还:hái»)
  x   — дополнительные наборы после урока (src/data/group.json): список группы, презентации
  b   — блоки тренировки «к проверочной» из примеров предложений урока:
        u  — предложения {zh, py, ru, sy}; sy — слоги по одному на каждый иероглиф (для упражнения на тоны)
        w  — слова блока (ключи s)
        tl — фразы для сборки из плиток {ru, seg}
Вход: kondrashevsky_data.py (порядок слов), lesson_titles.json, app_data.json (примеры ex).
"""
import json, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
FIX = {"没(有)": "没有", "打(电话)": "打电话", "开(车)": "开车"}
PYCH = "a-zA-Zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüńňǹ"
TONED = set("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹ")
BLOCK = 4
# время можно ставить и до, и после подлежащего: 上午我有课 = 我上午有课
TIME = set("今天 明天 昨天 后天 今年 明年 去年 上午 下午 中午 晚上 早上 现在 有时候 春天 夏天 秋天 冬天 明早".split())
PRON = set("我 你 他 她 您 我们 你们 他们 她们 咱们".split())

def alts(seg):
    t = lambda x: x in TIME or x.startswith("星期")
    if len(seg) >= 3 and t(seg[0]) and seg[1] in PRON:
        return ["".join([seg[1], seg[0]] + seg[2:])]
    if len(seg) >= 3 and seg[0] in PRON and t(seg[1]):
        return ["".join([seg[1], seg[0]] + seg[2:])]
    return []

def is_han(c):
    return "一" <= c <= "鿿"

def han(s):
    return [c for c in s if is_han(c)]

def align(zh, py):
    """Слоги пиньиня -> по одному на иероглиф. Эрхуа (nǎr) делим: nǎ + r для 儿."""
    toks = re.findall("[" + PYCH + "]+", py)
    out, ti = [], 0
    hz = han(zh)
    for i, c in enumerate(hz):
        if c == "儿" and out and out[-1].endswith("r") and out[-1].lower() not in ("er", "ér", "ěr", "èr") \
                and len(toks) - ti < len(hz) - i:
            out[-1] = out[-1][:-1]
            out.append("r")
            continue
        if ti >= len(toks):
            return None
        out.append(toks[ti]); ti += 1
    return out if ti == len(toks) and len(out) == len(hz) else None

def segment(zh, vocab, maxlen):
    """Сегментация по словарю: прямое и обратное наибольшее совпадение, берём лучшее
    (меньше слов, затем меньше одиночных знаков, при равенстве — обратное)."""
    s = "".join(han(zh))
    fw, i = [], 0
    while i < len(s):
        for L in range(min(maxlen, len(s) - i), 0, -1):
            if L == 1 or s[i:i + L] in vocab:
                fw.append(s[i:i + L]); i += L; break
    bw, j = [], len(s)
    while j > 0:
        for L in range(min(maxlen, j), 0, -1):
            if L == 1 or s[j - L:j] in vocab:
                bw.insert(0, s[j - L:j]); j -= L; break
    score = lambda x: (len(x), sum(1 for t in x if len(t) == 1))
    return fw if score(fw) < score(bw) else bw

def main():
    ns = {}
    exec((DATA / "kondrashevsky_data.py").read_text(encoding="utf-8"), ns)
    LESSONS = ns["LESSONS"]
    titles = json.loads((DATA / "lesson_titles.json").read_text(encoding="utf-8"))
    app = json.loads((DATA / "app_data.json").read_text(encoding="utf-8"))
    from collections import defaultdict
    cand = defaultdict(list)
    for w in app["words"]:
        cand[w["s"]].append(w)
        if w.get("d"):
            cand[w["d"]].append(w)
    tl = lambda p: re.sub(r"[^a-zü]", "", p.lower().translate(str.maketrans("āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ", "aaaaeeeeiiiioooouuuuüüüü")))
    def pick(hz, py):
        ws = cand.get(hz) or []
        return next((w for w in ws if tl(w["p"]) == tl(py)), ws[0] if ws else None)
    key = lambda w: w.get("key", w["s"])
    vocab = {}
    for w in app["words"]:
        vocab.setdefault(w["s"], w)
    bykey = {key(w): w for w in app["words"]}
    group = json.loads((DATA / "group.json").read_text(encoding="utf-8"))
    maxlen = max(len(s) for s in vocab)
    out, stats = {}, {"units": 0, "noalign": 0, "tiles": 0}
    for L in range(1, 31):
        v = LESSONS[L]
        order = []
        for grp in ("words", "extra", "names"):
            for t in v.get(grp, []):
                w = pick(FIX.get(t[0], t[0]), t[1])
                if w and key(w) not in order:
                    order.append(key(w))
        # примеры, написанные для этого урока (лексика строго из пройденного)
        units, owners, seen = [], [], set()
        for s in order:
            w = bykey[s]
            if not w.get("ex") or min(w["k"]) != L:
                continue
            zh, py, ru = w["ex"]
            if zh in seen or not han(zh):
                continue
            seen.add(zh)
            segs = segment(zh, vocab, maxlen)
            sy = align(zh, py)
            if sy:   # нейтральные тоны словаря (péngyou, xiūxi) важнее механического пиньиня примера
                k = 0
                for sg in segs:
                    wp = vocab.get(sg, {}).get("p", "").split()
                    if len(sg) > 1 and len(wp) == len(sg):
                        for j in range(len(sg)):
                            if not (set(wp[j]) & TONED) and (set(sy[k + j]) & TONED):
                                sy[k + j] = wp[j]
                    k += len(sg)
            else:
                stats["noalign"] += 1
            units.append({"zh": zh, "py": py, "ru": ru, "sy": " ".join(sy) if sy else "", "_seg": segs, "_own": s})
        blocks = []
        for i in range(0, len(units), BLOCK):
            chunk = units[i:i + BLOCK]
            if blocks and len(chunk) < 2:
                blocks[-1]["u"].extend(chunk); continue
            blocks.append({"u": chunk})
        for b in blocks:
            words = []
            for u in b["u"]:
                for s in [u["_own"]] + [sg for sg in u["_seg"] if sg in vocab and L in (vocab[sg].get("k") or []) and sg in order]:
                    if s not in words:
                        words.append(s)
            b["w"] = words
            b["tl"] = [{"ru": u["ru"], "seg": u["_seg"], "alt": alts(u["_seg"])} for u in b["u"] if 3 <= len(u["_seg"]) <= 9]
            stats["tiles"] += len(b["tl"])
            for u in b["u"]:
                del u["_seg"], u["_own"]
            stats["units"] += len(b["u"])
        extra = [{"id": g["id"], "title": g["title"], "src": g["src"], "note": g.get("note", ""),
                  "o": [key(pick(x["s"], x.get("p", "")) or bykey[x["s"]]) for x in g["words"]]}
                 for g in group if g["after"] == L]
        out[str(L)] = {"t": titles.get(str(L), ""), "sub": v.get("sub", ""), "o": order, "b": blocks, "x": extra}
    (DATA / "lessons.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("lessons.json:", stats, "блоков:", sum(len(x["b"]) for x in out.values()))

if __name__ == "__main__":
    main()
