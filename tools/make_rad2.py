#!/usr/bin/env python3
"""src/data/rad_petrosyan_raw.json (распознанные страницы пособия) → src/data/rad_petrosyan.json.

Пособие: К.С. Петросян, «部首 Таблица иероглифических ключей (согласно словарю Кан Си)», Рига 2014.
Распознавание — два независимых прохода по сканам + сверка расхождений (см. CLAUDE.md).
Выход: {№: {"f": формы, "pn": помета положения, "p": пиньинь, "m": значение, "s": упрощённая форма,
             "e": пример, "ep": пиньинь примера, "er": перевод примера}}
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "src" / "data"

def main():
    raw = json.loads((DATA / "rad_petrosyan_raw.json").read_text(encoding="utf-8"))
    out = {}
    for r in sorted(raw, key=lambda x: x["n"]):
        out[str(r["n"])] = {"f": r.get("forms", ""), "pn": r.get("position_note", ""), "p": r.get("pinyin", ""),
                            "m": r.get("meaning", ""), "s": r.get("simplified", ""), "e": r.get("example_char", ""),
                            "ep": r.get("example_pinyin", ""), "er": r.get("example_meaning", "")}
    missing = [n for n in range(1, 215) if str(n) not in out]
    (DATA / "rad_petrosyan.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("ключей:", len(out), "нет:", missing)

if __name__ == "__main__":
    main()
