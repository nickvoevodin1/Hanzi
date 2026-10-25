#!/usr/bin/env python3
"""Аудио-пак с живыми голосами: чёткие тоны вместо синтеза речи.

  python3 tools/make_audio_pack.py <папка hsk> <папка syl>

Источник — открытая база audio-cmn (Hugo Lopez, INALCO; CC BY-SA): github.com/hugolpz/audio-cmn, качество 64k:
  64k/hsk/cmn-<слово>.mp3     — слова HSK, диктор Yue Tan (из базы Shtooka);
  64k/syllabs/cmn-<слог><тон>.mp3 — все слоги путунхуа с тонами 1–4, диктор Chen Wang
  (у слогов с ü имена непостоянны: «nv3», но «ju1»/«jv4» — скачивать оба варианта).
Скачанные файлы лежат вне репозитория; сюда — только обработанные:
  audio/s/<слог><тон>.mp3 — слог (тон — по имени файла);
  audio/w/<коды знаков через ->.mp3 — слово из двух и более знаков (односложные слова и знаки читаются слогом —
  так тон всегда тот, что в учебнике, даже у многочтенных 行 还 长); односложные лёгкого тона (吗 呢 的 了…) — записью знака.
Обработка: обрезка тишины по краям, выравнивание громкости, MP3 48 кбит/с моно 24 кГц.
Проверка тона по высоте голоса (tools/pitch.py) для каждого слога; несовпадения — в отчёт (детектор ошибается на
очень коротких 4-х тонах, поэтому файл не выбрасывается, а помечается для прослушивания).
Выход: src/data/audio.json = {s:[слоги], w:[слова], n:{слог: тон по детектору, если не совпал}} и audio/README.md.
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
sys.path.insert(0, str(ROOT / "tools"))
from pitch import contour, tone_of  # noqa: E402

TM = {'ā': ('a', 1), 'á': ('a', 2), 'ǎ': ('a', 3), 'à': ('a', 4), 'ē': ('e', 1), 'é': ('e', 2), 'ě': ('e', 3), 'è': ('e', 4),
      'ī': ('i', 1), 'í': ('i', 2), 'ǐ': ('i', 3), 'ì': ('i', 4), 'ō': ('o', 1), 'ó': ('o', 2), 'ǒ': ('o', 3), 'ò': ('o', 4),
      'ū': ('u', 1), 'ú': ('u', 2), 'ǔ': ('u', 3), 'ù': ('u', 4), 'ǖ': ('v', 1), 'ǘ': ('v', 2), 'ǚ': ('v', 3), 'ǜ': ('v', 4), 'ü': ('v', 5)}


def syl(s):
    """слог пиньиня с тоном → ('xie', 4); лёгкий тон — 5"""
    t, o = 5, ''
    for ch in s.lower():
        if ch in TM:
            b, tt = TM[ch]
            o += b
            t = tt if tt < 5 else t
        elif ch.isalpha():
            o += ch
    return o, t


def wid(w):
    return '-'.join('%x' % ord(c) for c in w)


def encode(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    af = ("silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.03,"
          "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06,areverse,"
          "loudnorm=I=-18:TP=-2:LRA=11")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af", af, "-ac", "1", "-ar", "24000",
                    "-b:a", "48k", str(dst)], check=True)


def main():
    hsk, sy = Path(sys.argv[1]), Path(sys.argv[2])
    L = json.loads((DATA / "lessons.json").read_text(encoding="utf-8"))
    D = json.loads((DATA / "app_data.json").read_text(encoding="utf-8"))
    K = json.loads((DATA / "kondr_1-30.json").read_text(encoding="utf-8"))
    byk = {}
    for w in D["words"]:
        byk.setdefault(w.get("key", w["s"]), w)
    keys = []
    for l in L.values():
        keys += l["o"]
        for x in l["x"]:
            keys += x["o"]
    words = [byk[k] for k in dict.fromkeys(keys) if k in byk]
    out = ROOT / "audio"
    s_ok, w_ok, flags = [], [], {}
    # слоги: всё, что встречается в словах курса и в чтениях знаков
    need = set()
    for w in words:
        for p in w["p"].split():
            o, t = syl(p)
            if o and t < 5:
                need.add(f"{o}{t}")
    for c in K["chars"]:
        for p in c["py"].split("/")[0].split():
            o, t = syl(p)
            if o and t < 5:
                need.add(f"{o}{t}")
    sylf = {}
    for s in sorted(need):
        f = sy / f"{s}.mp3"
        if not f.exists():
            continue
        dst = out / "s" / f"{s}.mp3"
        if not dst.exists():
            encode(f, dst)
        s_ok.append(s)
        sylf[s] = contour(f)
    import numpy as np
    allv = np.concatenate([np.array(v)[np.array(v) > 0] for v in sylf.values() if any(x > 0 for x in v)])
    ref = float(np.median(allv))
    for s, v in sylf.items():
        got = tone_of(v, ref, glide=s[0] in "wyrlmn")
        if got != int(s[-1]):
            flags[s] = got
    # слова из 2+ знаков — записью слова; односложные лёгкого тона — записью знака
    done = set()
    for w in words:
        hz = [c for c in w["s"] if '㐀' <= c <= '鿿']
        sy_ = [syl(p) for p in w["p"].split()]
        one_neutral = len(hz) == 1 and sy_ and sy_[0][1] == 5
        if (len(hz) < 2 and not one_neutral) or w["s"] in done:
            continue
        f = hsk / f"{w['s']}.mp3"
        if not f.exists():
            continue
        dst = out / "w" / f"{wid(w['s'])}.mp3"
        if not dst.exists():
            encode(f, dst)
        w_ok.append(w["s"])
        done.add(w["s"])
    res = {"s": s_ok, "w": sorted(w_ok), "n": flags}
    (DATA / "audio.json").write_text(json.dumps(res, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (out / "README.md").write_text(
        "# Аудио «朱»\n\nЗаписи живых дикторов из открытой базы **audio-cmn** "
        "(Hugo Lopez, PLIDAM/INALCO): https://github.com/hugolpz/audio-cmn\n\n"
        "* `s/` — слоги путунхуа с тонами, диктор **Chen Wang** (CC BY-SA);\n"
        "* `w/` — слова, диктор **Yue Tan** (база Shtooka, CC BY-SA, http://packs.shtooka.net/cmn-caen-tan/readme.txt).\n\n"
        "Обработка (tools/make_audio_pack.py): обрезка тишины, выравнивание громкости, MP3 48 кбит/с. "
        "Распространяется на тех же условиях — CC BY-SA 3.0/4.0, с указанием авторов.\n", encoding="utf-8")
    print(f"слогов {len(s_ok)} из {len(need)}, слов {len(w_ok)}; детектор тона не подтвердил {len(flags)} слогов: "
          + " ".join(f"{k}→{v}" for k, v in sorted(flags.items())))
    miss = [w["s"] for w in words if len([c for c in w["s"] if '㐀' <= c <= '鿿']) > 1 and w["s"] not in done]
    print(f"слова без записи ({len(miss)}) — читаются по слогам или голосом устройства: " + " ".join(miss[:60]))


if __name__ == "__main__":
    main()
