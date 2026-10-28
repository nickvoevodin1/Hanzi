#!/usr/bin/env python3
"""Прописи ключей: какие формы ключа писать, их графика и порядок черт.

  python3 tools/make_rad_strokes.py <hanzi-writer-data/package> <cnchar.order.min.js> <mmah dictionary.txt>

Источники (те же, что у fetch_strokes.py / make_kchars.py): hanzi-writer-data 2.0.1 (контуры и медианы черт,
radStrokes — какие черты знака относятся к его ключу), cnchar-order 3.2.6 (порядок черт буквами),
Make Me a Hanzi dictionary.txt (ключ каждого знака).
Формы для прописей — те, что пишутся в упрощённых знаках: форма — сам знак словаря или часть состава (IDS) знаков
словаря; полные формы, которых в упрощённом письме нет (見 訁 糹 車…), не берутся. Не больше двух форм на ключ,
основная — первой.
Порядок черт формы: из cnchar, а если там формы нет (亻 讠 氵 辶 …) — по знакам с этим ключом: черты ключа в знаке
(radStrokes) → их коды; берётся код, на котором сходится большинство знаков (сколько сошлось — в отчёте).
Пять форм, для которых не нашлось ни того ни другого, — по знаку, где форма пишется первой (MANUAL: 亅 — вторая черта 了,
丬 — первые три черты 将, 耂 — 老, ⺌ — 当, ⺍ — 学). Коды e/y уточняются по геометрии черты, как в make_hanzi.py.
Если ни одна форма ключа не встречается в упрощённых знаках словаря — берётся последняя форма с графикой и порядком черт
(у 鹵卤, 黽黾, 龜龟 это упрощённая).
Выход: src/data/rad_write.json = {№: [[форма, коды черт], …]}; графика форм дописывается в hanzi-data.json.
"""
import json, re, sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
sys.path.insert(0, str(ROOT / "tools"))
from make_hanzi import refine  # noqa: E402

MANUAL = {"亅": ("了", 1, 2), "丬": ("将", 0, 3), "耂": ("老", 0, 4), "⺌": ("当", 0, 3), "⺍": ("学", 0, 3)}


def main(hwd, order_js, mmah):
    hwd = Path(hwd)
    src = Path(order_js).read_text(encoding="utf-8")
    blobs = [json.loads(m.replace("\\'", "'")) for m in re.findall(r"JSON\.parse\('(.*?)'\)", src, re.S)]
    orders = next(b for b in blobs if b.get("一") == "j")
    dic = [json.loads(x) for x in Path(mmah).read_text(encoding="utf-8").splitlines() if x.strip()]
    rads = json.loads((DATA / "radicals.json").read_text(encoding="utf-8"))
    app = json.loads((DATA / "app_data.json").read_text(encoding="utf-8"))
    hz = json.loads((DATA / "hanzi.json").read_text(encoding="utf-8"))
    hd = json.loads((ROOT / "hanzi-data.json").read_text(encoding="utf-8"))

    def gfx(c):
        if c in hd:
            return hd[c]
        f = hwd / (c + ".json")
        return json.loads(f.read_text(encoding="utf-8")) if f.exists() else None

    by_rad = {}
    for d in dic:
        by_rad.setdefault(d.get("radical"), []).append(d["character"])
    used = set(app["chars"]) | {p for v in hz["c"].values() for p in (v[2] or "")}

    def codes_of(f, g):
        n = len(g["strokes"])
        if f in orders and len(orders[f]) == n:
            return refine(orders[f], g["medians"]), "cnchar", 0
        if f in MANUAL:
            c, a, b = MANUAL[f]
            if len(orders[c][a:b]) == n:
                return refine(orders[c][a:b], g["medians"]), f"черты {a + 1}–{b} знака {c}", 1
        votes = Counter()
        for c in by_rad.get(f, []):
            o, cg = orders.get(c), gfx(c)
            rs = cg and cg.get("radStrokes")
            if not o or not rs or len(rs) != n or len(o) != len(cg["strokes"]):
                continue
            votes["".join(o[i] for i in rs)] += 1
        if not votes:
            return None, "", 0
        best, k = votes.most_common(1)[0]
        return refine(best, g["medians"]), f"по знакам {k}/{sum(votes.values())}", sum(votes.values())

    out, report, added = {}, [], []
    for r in rads:
        n, forms = r[0], r[4]
        cand = []
        for f in forms:
            g = gfx(f)
            if not g or not (f in used or f == forms[0] and len(forms) == 1):
                continue
            cs, how, _ = codes_of(f, g)
            if not cs:
                report.append(f"{n} {f}: нет порядка черт — пропущено")
                continue
            cand.append([f, cs])
            if how != "cnchar":
                report.append(f"{n} {f} {cs} ({how})")
        if not cand:                 # ни одна форма не встречается в упрощённых знаках словаря — последняя с данными
            for f in reversed(forms):
                g = gfx(f)
                cs = g and codes_of(f, g)[0]
                if cs:
                    cand = [[f, cs]]
                    report.append(f"{n} {forms}: в словаре не встречается, берём {f} {cs}")
                    break
        if not cand:
            sys.exit(f"ключ {n}: нет формы с графикой и порядком черт")
        out[str(n)] = cand[:2]
        for f, _ in cand[:2]:
            if f not in hd:
                hd[f] = {k: v for k, v in gfx(f).items() if k in ("strokes", "medians")}
                added.append(f)
    (DATA / "rad_write.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (ROOT / "hanzi-data.json").write_text(json.dumps(hd, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"ключей {len(out)}, форм {sum(len(v) for v in out.values())}; графика добавлена: {''.join(added)}")
    print("\n".join(report))


if __name__ == "__main__":
    main(*sys.argv[1:4])
