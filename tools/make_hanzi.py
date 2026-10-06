#!/usr/bin/env python3
"""Собрать src/data/hanzi.json — разбор каждого иероглифа для приложения.

Вход:  src/data/hanzi_src.json (выжимка makemeahanzi + Unihan, см. fetch_hanzi_sources.py),
       src/data/char_ru.json   (ручные русские значения знаков и компонентов),
       src/data/app_data.json, src/data/radicals.json.
Выход: src/data/hanzi.json = {"c": {знак: [№ключа, форма ключа, состав IDS, тип, смысл.часть,
       звук.часть, рус., пиньинь, №ключа в других словарях|0, англ.|"", коды черт]}, "p": {компонент: [пиньинь, рус.]}}
Коды черт — буквы cnchar (src/data/stroke_codes.json), уточнённые по форме черты из hanzi-data.json:
  e → E, если это 横钩 (короткий крюк), иначе 横撇;  y → Y, если это 卧钩 (лежачая), иначе 斜钩.
Тип: p — смысл + звук (фоноидеограмма), i — составной по смыслу, g — рисунок (пиктограмма).
"""
import json, math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
IDC = set("⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻？")
TYPES = {"pictophonetic": "p", "ideographic": "i", "pictographic": "g"}
ALIASES = {'丷': '八', '⺊': '卜', '母': '毋', '㔾': '卩', '乛': '乙', '⺀': '冫', '民': '氏', '旡': '无', '虎': '虍'}

def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))

def refine(code, medians):
    """Уточнить неоднозначные коды по геометрии черт (медианы hanzi-writer)."""
    if not medians or len(medians) != len(code):
        return code
    out = []
    for c, pts in zip(code, medians):
        if c == "e":                     # 横钩: после угла — короткий крюк; 横撇: длинная откидная
            i = max(range(len(pts)), key=lambda k: pts[k][0])
            a = sum(math.dist(pts[k], pts[k + 1]) for k in range(i))
            b = sum(math.dist(pts[k], pts[k + 1]) for k in range(i, len(pts) - 1))
            c = "E" if b / max(a, 1) < 0.42 else "e"
        elif c == "y":                   # 斜钩 — крутая диагональ; 卧钩 — пологая (心)
            ys = [q[1] for q in pts]
            c = "y" if max(ys) - min(ys) > 450 else "Y"
        out.append(c)
    return "".join(out)

def main():
    src, ru, app, rads = load("hanzi_src.json"), load("char_ru.json"), load("app_data.json"), load("radicals.json")
    codes = load("stroke_codes.json")
    hd = json.loads((ROOT / "hanzi-data.json").read_text(encoding="utf-8"))
    ridx = {}
    for r in rads:
        for f in r[4]:
            ridx.setdefault(f, r[0])
    for a, b in ALIASES.items():
        ridx[a] = ridx[b]
    single = {}
    for w in app["words"]:
        if len(w["s"]) == 1 and w["s"] not in single:
            single[w["s"]] = w
    out, comps, warn = {}, {}, []
    for ch in app["chars"]:
        s = src[ch]
        kx = int(s["kx"].split(".")[0].rstrip("'"))
        forms = rads[kx - 1][4]
        mm_n = ridx.get(s["rad"])
        if s["rad"] == "阝":          # слева — №170 «холм», справа — №163 «город»
            mm_n = kx if kx in (163, 170) else (170 if s["ids"].startswith("⿰阝") else 163)
        if mm_n == kx:
            form = s["rad"]
        else:
            form = next((p for p in s["ids"] if ridx.get(p) == kx), forms[0])
        ety = s.get("ety", {})
        w = single.get(ch)
        mean = ru.get(ch) or (w and w.get("ru")) or ""
        py = w["p"] if w else " / ".join(s["py"])
        out[ch] = [kx, form, s["ids"] if s["ids"] != "？" else "", TYPES.get(ety.get("type"), ""),
                   ety.get("semantic", ""), ety.get("phonetic", ""), mean, py,
                   mm_n if (mm_n and mm_n != kx) else 0,
                   "" if mean else s.get("en", ""),   # англ. значение, если русского нет
                   refine(codes.get(ch, ""), (hd.get(ch) or {}).get("medians"))]
        for p in s["ids"]:
            if p in IDC or p in app["chars"] or p in comps:
                continue
            cs = src.get(p, {})
            comps[p] = [" / ".join(cs.get("py", [])), ru.get(p, "")]
    group = {g["s"] for x in load("group.json") for g in x["words"]}
    lesson_chars = {c for w in app["words"] if w.get("k") or w.get("grp") or w["s"] in group for c in w["s"] if c in out}
    no_ru = [c for c in lesson_chars if not out[c][6]]
    if no_ru:
        warn.append("без русского значения (знаки уроков): " + "".join(sorted(no_ru)))
    (DATA / "hanzi.json").write_text(json.dumps({"c": out, "p": comps}, ensure_ascii=False, separators=(",", ":")),
                                     encoding="utf-8")
    print(f"hanzi.json: знаков {len(out)}, компонентов {len(comps)}, "
          f"с русским значением {sum(1 for v in out.values() if v[6])}")
    for x in warn:
        print("⚠", x)

if __name__ == "__main__":
    main()
