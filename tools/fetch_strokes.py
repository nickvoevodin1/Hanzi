#!/usr/bin/env python3
"""Порядок черт (коды cnchar) и графика hanzi-writer для иероглифов словаря.

Нужно только при добавлении новых иероглифов. Источники (npm):
  cnchar-order 3.2.6  -> cnchar.order.min.js  (порядок черт буквами: j横 f竖 s撇 l捺 k点 d点2 …)
  hanzi-writer-data 2.0.1 -> <знак>.json      (контуры и медианы черт)
  python3 tools/fetch_strokes.py path/cnchar.order.min.js path/hanzi-writer-data/package
Пишет src/data/stroke_codes.json, дополняет hanzi-data.json и app_data.json.chars для новых знаков.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"

def main(order_js, hwd_dir):
    src = Path(order_js).read_text(encoding="utf-8")
    blobs = [json.loads(m.replace("\\'", "'")) for m in re.findall(r"JSON\.parse\('(.*?)'\)", src, re.S)]
    orders = next(b for b in blobs if b.get("一") == "j")
    names = next(b for b in blobs if isinstance(b.get("w"), dict) and "name" in b["w"])
    app = json.loads((DATA / "app_data.json").read_text(encoding="utf-8"))
    hd = json.loads((ROOT / "hanzi-data.json").read_text(encoding="utf-8"))
    need = sorted({c for w in app["words"] for c in w["s"] if "一" <= c <= "鿿"})
    codes, added = {}, []
    for c in need:
        o = orders.get(c)
        if not o:
            sys.exit("нет порядка черт для " + c)
        codes[c] = o
        if c not in app["chars"]:
            app["chars"][c] = [len(o), " ".join(names[k]["name"].split("|")[0].replace("点2", "点") for k in o)]
            added.append(c)
        if c not in hd:
            hd[c] = json.loads((Path(hwd_dir) / (c + ".json")).read_text(encoding="utf-8"))
    (DATA / "stroke_codes.json").write_text(json.dumps(codes, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DATA / "app_data.json").write_text(json.dumps(app, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (ROOT / "hanzi-data.json").write_text(json.dumps(hd, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("порядок черт:", len(codes), "новые знаки:", "".join(added))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
