#!/usr/bin/env python3
"""Сборка приложения 朱: src/template.html + src/data/*.json -> index.html (корень репо = сайт GitHub Pages).

Запуск из корня репозитория:  python3 tools/build.py
После каждой правки шаблона/данных:
  1) python3 tools/build.py
  2) поднять версию кэша в service-worker.js (const CACHE='hanzi-vNN')
  3) npm test   (jsdom-тесты в tests/)
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC, DATA, APP = ROOT / "src", ROOT / "src" / "data", ROOT

def main():
    tpl = (SRC / "template.html").read_text(encoding="utf-8")
    parts = {
        "/*__DATA__*/": (DATA / "app_data.json").read_text(encoding="utf-8"),
        "/*__LESSON_TITLES__*/": (DATA / "lesson_titles.json").read_text(encoding="utf-8"),
        "/*__RADS__*/": (DATA / "radicals.json").read_text(encoding="utf-8"),
    }
    for ph, body in parts.items():
        if tpl.count(ph) != 1:
            sys.exit(f"Плейсхолдер {ph} должен встречаться ровно 1 раз")
        json.loads(body)  # валидация JSON
        tpl = tpl.replace(ph, body)
    out = APP / "index.html"
    out.write_text(tpl, encoding="utf-8")
    js = max(re.findall(r"<script>(.*?)</script>", tpl, re.S), key=len)
    tmp = ROOT / ".build-app.js"
    tmp.write_text(js, encoding="utf-8")
    try:
        r = subprocess.run(["node", "--check", str(tmp)], capture_output=True, text=True)
        print("node --check:", "OK" if r.returncode == 0 else r.stderr)
    except FileNotFoundError:
        print("node не найден — проверка синтаксиса пропущена")
    finally:
        tmp.unlink(missing_ok=True)
    print(f"index.html: {round(len(tpl.encode()) / 1024)} KB")

if __name__ == "__main__":
    main()
