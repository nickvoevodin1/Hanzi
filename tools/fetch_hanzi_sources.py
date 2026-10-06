#!/usr/bin/env python3
"""Собрать src/data/hanzi_src.json — выжимку внешних баз по иероглифам приложения.

Нужно запускать только при добавлении новых иероглифов в app_data.json.
Источники (скачать заранее, пути передать аргументами):
  1) makemeahanzi dictionary.txt — состав (IDS), тип (смысл+звук и т.п.), чтения
     https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt
  2) Unihan (kRSUnicode — номер ключа Канси). Удобно из npm-пакета cjk-unihan:
     https://registry.npmjs.org/cjk-unihan/-/cjk-unihan-0.0.3.tgz -> package/data/unihan.db

  python3 tools/fetch_hanzi_sources.py path/to/dictionary.txt path/to/unihan.db
"""
import json, sqlite3, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
IDC = set("⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻？")

def main(mm_path, db_path):
    mm = {}
    for line in open(mm_path, encoding="utf-8"):
        d = json.loads(line); mm[d["character"]] = d
    app = json.loads((DATA / "app_data.json").read_text(encoding="utf-8"))
    want = list(app["chars"].keys())
    # компоненты первого уровня тоже нужны (их чтение / тип)
    comps = []
    for ch in want:
        for p in (mm.get(ch, {}).get("decomposition") or ""):
            if p not in IDC and p not in app["chars"] and p not in comps:
                comps.append(p)
    db = sqlite3.connect(db_path)
    out = {}
    for ch in want + comps:
        d = mm.get(ch, {})
        row = db.execute("select SUnicode from unihan where character=?", (ch,)).fetchone()
        rs = (row[0] if row else "") or ""
        out[ch] = {
            "py": d.get("pinyin", []),
            "ids": d.get("decomposition", ""),
            "rad": d.get("radical", ""),
            "ety": {k: v for k, v in (d.get("etymology") or {}).items() if k in ("type", "semantic", "phonetic")},
            "kx": rs.split(" ")[0],          # «149'.7» — ключ 149 (упрощ. форма), 7 доп. черт
            "en": d.get("definition", ""),
        }
    (DATA / "hanzi_src.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("иероглифов:", len(want), "компонентов:", len(comps))

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
