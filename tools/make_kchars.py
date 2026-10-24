#!/usr/bin/env python3
"""src/data/kondr_chars.json — разбор иероглифов на ключи (для режима «Разбор на ключи» и колоды ключей).

Источник: src/data/kondr_1-30.json (подготовлен в чате проекта: 587 иероглифов уроков 1–30, порядок изучения
214 ключей keys_study_order, частота ключей в уроках). Для остальных иероглифов словаря (список группы, HSK)
разбор считается тем же алгоритмом: рекурсивно по IDS makemeahanzi до форм из таблицы 214 ключей, «？» пропускается,
阝 слева — №170, справа — №163; иероглиф, который сам является ключом, не делится.
Алгоритм проверяется: на 587 иероглифах JSON он обязан давать ровно тот же разбор.

  python3 tools/make_kchars.py path/to/makemeahanzi/dictionary.txt
"""
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
IDC = set("⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻")
EXTRA = {"⺈": 18, "丷": 12, "⺊": 25, "乛": 5, "⺀": 15, "母": 80, "民": 83, "⺌": 42, "⺍": 42}

def main(mm_path):
    src = json.loads((DATA / "kondr_1-30.json").read_text(encoding="utf-8"))
    app = json.loads((DATA / "app_data.json").read_text(encoding="utf-8"))
    mm = {}
    for line in open(mm_path, encoding="utf-8"):
        x = json.loads(line); mm[x["character"]] = x
    tbl = {}
    for k in src["keys"]:
        for f in k["forms"]:
            if f.strip():
                tbl.setdefault(f, k["n"])
    for f, n in EXTRA.items():
        tbl.setdefault(f, n)

    def keys(x, top=True, parent=""):
        if x in tbl and not top:
            n = tbl[x]
            if x == "阝":
                n = 170 if parent.startswith("⿰阝") else 163
            return [[x, n]]
        ids = (mm.get(x) or {}).get("decomposition", "？")
        if top and x in tbl:
            return [[x, tbl[x]]]
        out = []
        for p in ids:
            if p in IDC or p == "？":
                continue
            out += keys(p, False, ids)
        return out

    given = {c["c"]: [[k["f"], k["n"]] for k in c["keys"]] for c in src["chars"]}
    bad = [c for c, v in given.items() if keys(c) != v]
    if bad:
        sys.exit("алгоритм расходится с JSON: " + "".join(bad))
    out, auto = {}, []
    for ch in app["chars"]:
        if ch in given:
            out[ch] = given[ch]
        else:
            out[ch] = keys(ch); auto.append(ch)
    empty = [c for c, v in out.items() if not v]
    res = {"c": out, "order": src["keys_study_order"],
           "freq": {str(k["n"]): k["freq_in_lessons"] for k in src["keys"]}, "auto": "".join(auto)}
    (DATA / "kondr_chars.json").write_text(json.dumps(res, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"kondr_chars.json: из JSON {len(given)}, посчитано тем же алгоритмом {len(auto)}, без разбора {len(empty)}: {''.join(empty)}")

if __name__ == "__main__":
    main(sys.argv[1])
