#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Генератор аудио-пака для тренажёра 朱 (озвучка нейроголосом носителя).

Что делает: берёт ВСЕ слова, иероглифы, ключи, примеры и предложения проверочных прямо из index.html
и озвучивает их через Microsoft Edge TTS (бесплатно, без ключей).
Результат кладёт в папку ./audio рядом с index.html + пишет manifest.json.
Приложение само найдёт папку audio и начнёт играть эти файлы вместо синтеза.

Как запустить (один раз, на компьютере с интернетом):
  1) установи Python 3.9+
  2) pip install edge-tts
  3) положи этот файл рядом с index.html (в папку репозитория)
  4) python make_audio.py
  5) загрузи появившуюся папку audio/ в репозиторий вместе с остальными файлами

Полезное:
  python make_audio.py --voice zh-CN-YunxiNeural   # мужской голос
  python make_audio.py --list-voices               # показать голоса zh
  Повторный запуск докачивает только недостающее.
"""
import argparse, asyncio, json, re, sys
from pathlib import Path

DEF_VOICE = "zh-CN-XiaoxiaoNeural"   # женский, очень естественный
RATE = "-10%"                         # чуть медленнее для учёбы

def load_texts(index_path: Path):
    """Всё, что приложение озвучивает: слова, примеры, иероглифы, ключи, предложения проверочных."""
    html = index_path.read_text(encoding="utf-8")
    dec = json.JSONDecoder()
    def const(name):
        m = re.search(r"const " + name + r" = ", html)
        if not m:
            sys.exit("Не нашёл данные в index.html — положи скрипт рядом с index.html из приложения.")
        return dec.raw_decode(html, m.end())[0]
    db, lessons, tests, rads = const("DB_RAW"), const("LESSONS"), const("TESTS"), const("RADS")
    texts, seen = [], set()
    def add(t):
        if t and t not in seen:
            seen.add(t); texts.append(t)
    for w in db["words"]:
        add(w.get("s"))
        if w.get("ex"): add(w["ex"][0])
    for ch in db["chars"]: add(ch)
    for r in rads: add(r[4][0])
    blocks = [b for l in lessons.values() for b in l["b"]] + [b for t in tests for b in t["blocks"]]
    for b in blocks:
        for u in b["u"]:
            add(u["zh"])
            for part in u.get("parts", []): add(part[1])
    return texts

async def synth_all(texts, outdir: Path, voice: str, concurrency: int = 4):
    import edge_tts
    outdir.mkdir(exist_ok=True)
    sem = asyncio.Semaphore(concurrency)
    done = skipped = failed = 0
    async def one(t):
        nonlocal done, skipped, failed
        f = outdir / (t + ".mp3")
        if f.exists() and f.stat().st_size > 0:
            skipped += 1; return
        async with sem:
            try:
                await edge_tts.Communicate(t, voice, rate=RATE).save(str(f))
                done += 1
                if done % 100 == 0: print(f"  озвучено {done}…")
            except Exception as e:
                failed += 1; print("  ✗", t, e)
    await asyncio.gather(*(one(t) for t in texts))
    return done, skipped, failed

def write_manifest(outdir: Path):
    names = sorted(p.name for p in outdir.glob("*.mp3") if p.stat().st_size > 0)
    (outdir / "manifest.json").write_text(json.dumps(names, ensure_ascii=False), encoding="utf-8")
    return len(names)

async def list_voices():
    import edge_tts
    for v in await edge_tts.list_voices():
        if v["Locale"].startswith("zh"):
            print(f'{v["ShortName"]:<28} {v["Gender"]:<7} {v["Locale"]}')

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default=DEF_VOICE)
    ap.add_argument("--index", default="index.html")
    ap.add_argument("--list-voices", action="store_true")
    a = ap.parse_args()
    if a.list_voices:
        asyncio.run(list_voices()); return
    try:
        import edge_tts  # noqa
    except ImportError:
        sys.exit("Сначала:  pip install edge-tts")
    texts = load_texts(Path(a.index))
    print(f"К озвучке: {len(texts)} фраз (слова + примеры), голос {a.voice}")
    outdir = Path("audio")
    d, s, f = asyncio.run(synth_all(texts, outdir, a.voice))
    n = write_manifest(outdir)
    print(f"Готово: новых {d}, уже было {s}, ошибок {f}. В manifest.json — {n} файлов.")
    print("Теперь загрузи папку audio/ в репозиторий. Приложение подхватит её само.")

if __name__ == "__main__":
    main()
