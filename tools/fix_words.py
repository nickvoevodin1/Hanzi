#!/usr/bin/env python3
"""Правки словаря по материалам курса (идемпотентно): python3 tools/fix_words.py

1) Пиньинь слов уроков — как в учебнике Кондрашевского (сандхи 一/不, нейтральные тоны, 大夫 dàifu…).
2) Омографы уроков — отдельные слова со своим ключом карточки: 还 huán (ур. 11) / 还 hái (ур. 15),
   行 háng (ур. 14) / 行 xíng (ур. 28). Ключ второго слова — «иероглифы:пиньинь» (поле key).
3) Слова из списка группы и презентаций (src/data/group.json), которых нет в словаре, — добавляются.
4) Слитная запись пиньиня (gōngrén) → по слогам (gōng rén) по таблице слогов курса.
"""
import json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pinyin_util import syllables  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"

# Пиньинь как в учебнике (рамки «Новые слова»). Старое чтение уходит в alt, если это другое слово.
TEXTBOOK_P = {
    "大夫": ("dài fu", "dà fū"),      # доктор (dàfū — сановник)
    "多少": ("duō shao", None),
    "一下儿": ("yí xiàr", None),
    "爱人": ("ài rén", None),
    "告诉": ("gào su", None),
    "教": ("jiāo", "jiào"),          # учить, обучать (jiào — в 教室)
    "一起": ("yì qǐ", None),
    "一定": ("yí dìng", None),
    "后边": ("hòu biān", None), "上边": ("shàng biān", None), "左边": ("zuǒ biān", None),
    "里边": ("lǐ biān", None), "前边": ("qián biān", None), "东边": ("dōng biān", None),
    "得": ("de", None),              # служебное слово (ур. 25)
    "哪里": ("nǎ li", None),
    "不错": ("bú cuò", None),
    "一点儿": ("yì diǎnr", None),
    "东西": ("dōng xi", "dōng xī"),  # вещь (dōngxī — восток и запад)
    "一路平安": ("yí lù píng ān", None),
    "地方": ("dì fang", None),
    "不客气": ("bú kè qi", None),
}
# Омографы: (иероглифы, пиньинь, рус., уроки)
HOMOGRAPHS = [
    {"s": "还", "p": "hái", "ru": "ещё, всё же", "en": ["still; yet; also"], "hsk": 1, "k": [15], "pos": ["нареч."]},
    {"s": "行", "p": "xíng", "ru": "идти, ехать; поездка", "en": ["to walk; to go; to travel; OK"], "hsk": 4, "k": [28], "pos": ["гл."]},
]
HOMO_MAIN = {"还": [11], "行": [14]}


def main():
    app = json.loads((DATA / "app_data.json").read_text(encoding="utf-8"))
    group = json.loads((DATA / "group.json").read_text(encoding="utf-8"))
    words = app["words"]
    by = {}
    for w in words:
        by.setdefault(w.get("key", w["s"]), w)
    changed = []

    for s, (p, old) in TEXTBOOK_P.items():
        w = by[s]
        if w["p"] != p:
            changed.append(f"{s}: {w['p']} → {p}")
            alts = [a for a in (w.get("alt") or []) if a.get("p") != p]
            if old and not any(a.get("p") == old for a in alts):
                alts.insert(0, {"p": old, "en": []})
            w["p"] = p
            if alts:
                w["alt"] = alts
            else:
                w.pop("alt", None)

    for h in HOMOGRAPHS:
        key = h["s"] + ":" + h["p"]
        main_w = by[h["s"]]
        main_w["k"] = HOMO_MAIN[h["s"]]
        main_w["alt"] = [a for a in (main_w.get("alt") or []) if a.get("p") != h["p"]] or None
        if main_w["alt"] is None:
            main_w.pop("alt")
        if key not in by:
            nw = dict(h, key=key, rad=main_w.get("rad"), f=main_w.get("f"))
            words.append(nw)
            by[key] = nw
            changed.append(f"+ омограф {key}")

    for g in group:
        for gw in g["words"]:
            if gw["s"] in by or gw.get("key") in by:
                continue
            nw = {"s": gw["s"], "p": gw["p"], "ru": gw["ru"], "grp": 1}
            words.append(nw)
            by[gw["s"]] = nw
            changed.append(f"+ {gw['s']} ({g['id']})")

    fixed = 0
    for w in words:
        if not any("一" <= c <= "鿿" for c in w["s"]) or not w["s"].isascii() and any(c.isascii() and c.isalpha() for c in w["s"]):
            continue                      # T恤 и т.п. — латиница в слове, не трогаем
        syl = syllables(w["p"], w["s"])
        if syl and " ".join(syl) != w["p"]:
            w["p"] = " ".join(syl)
            fixed += 1

    (DATA / "app_data.json").write_text(json.dumps(app, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("\n".join(changed))
    print(f"слитный пиньинь → слоги: {fixed}; слов всего: {len(words)}")


if __name__ == "__main__":
    main()
