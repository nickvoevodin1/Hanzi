#!/usr/bin/env python3
"""src/data/etym_src.json — выжимка этимологии для всех иероглифов приложения (вход для make_etym.py).

  python3 tools/fetch_etym_sources.py <word.json> <dictionary.txt> <STCharacters.txt>

word.json      — словарь «Синьхуа» с толкованиями 汉典 (github.com/pwxcoo/chinese-xinhua, data/word.json):
                 берём первую формулу образования («形声。从言，射声。», «会意。从女，从子。», «象形。…», «指事。…»).
dictionary.txt — Make Me a Hanzi (github.com/skishore/makemeahanzi): etymology {type, semantic, phonetic},
                 decomposition (IDS).
STCharacters.txt — таблица упрощённых/полных форм OpenCC (github.com/BYVoid/OpenCC): полные формы из формул 汉典
                 переводятся в упрощённые (從 → 从).
Результат: {"c": {знак: {"h": формула 汉典 (до 80 знаков) | "", "m": [тип, смысл, звук] | [], "ids": IDS}},
            "ts": {полная форма из формул: упрощённая}}.
"""
import json, re, sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data"


def main(word_json, mmah_txt, st_txt):
    app = json.loads((DATA / "app_data.json").read_text(encoding="utf-8"))
    chars = set(app["chars"])
    xh = {x["word"]: x for x in json.loads(Path(word_json).read_text(encoding="utf-8")) if x["word"] in chars}
    mm = {}
    for line in open(mmah_txt, encoding="utf-8"):
        x = json.loads(line)
        if x["character"] in chars:
            mm[x["character"]] = x
    out = {}
    for ch in sorted(chars):
        h = ""
        if ch in xh:
            m = re.search(r"(形声|会意|象形|指事)(兼(形声|会意|象形|指事))?[。，,][^。]*", xh[ch].get("more", ""))
            if m:
                h = m.group(0).replace("\n", " ")[:80]
        e = (mm.get(ch) or {}).get("etymology") or {}
        out[ch] = {"h": h, "m": [e.get("type", ""), e.get("semantic", ""), e.get("phonetic", "")] if e else [],
                   "ids": (mm.get(ch) or {}).get("decomposition", "")}
    ts = {}
    for line in open(st_txt, encoding="utf-8"):
        p = line.rstrip("\n").split("\t")
        if len(p) < 2 or line.startswith("#"):
            continue
        for t in p[1].split(" "):
            ts.setdefault(t, p[0])
    used = {c for v in out.values() for c in v["h"]}
    ts = {t: s for t, s in ts.items() if t in used and t != s}
    (DATA / "etym_src.json").write_text(json.dumps({"c": out, "ts": ts}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"etym_src.json: {len(out)} знаков, с формулой 汉典 {sum(1 for v in out.values() if v['h'])}, "
          f"с этимологией MMAH {sum(1 for v in out.values() if v['m'])}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], sys.argv[3])
