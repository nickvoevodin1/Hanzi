#!/usr/bin/env python3
"""src/data/etym.json — тип иероглифа и его части с ролями (для «Разбора на ключи»).

  python3 tools/make_etym.py

Вход:  src/data/etym_kondr.txt — ручной разбор 587 иероглифов уроков 1–30 (формат — в шапке файла);
       src/data/posobie.txt    — выписка из «Пособия по иероглифике» Кондрашевского: тип и ключи знаков, фонетики;
       src/data/etym_src.json  — выжимка 汉典 + Make Me a Hanzi (tools/fetch_etym_sources.py) — для остальных знаков;
       radicals.json (214 ключей: номер, пиньинь, название ДВФУ), hanzi.json, kondr_chars.json, char_ru.json.
Выход: etym.json = {знак: [тип, [[форма, роль, №ключа|0, пиньинь, рус., чтения фонетика?]…], примечание, спорно 0/1,
       авто 0/1, [ключи по пособию, урок пособия, тип по пособию 0/1] | 0, части видны в написании 0/1]}.
       Типы: g изобразительный (пиктограмма), z условный знак, i идеограмма, p фоноидеограмма.
       Роли: s смысловой ключ, f фонетик, m смысловая часть, x условный знак упрощения, w весь знак.
Проверки: каждый знак уроков разобран ровно один раз; тип совпадает с пособием (если пособие его даёт);
у фоноидеограммы один фонетик; части есть в составе знака (по IDS Make Me a Hanzi) — иначе предупреждение.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "src" / "data"
IDC = set("⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻")
# полная форма ключа в формуле 汉典 → как пишется в составе упрощённого знака
VAR = {"言": "讠", "水": "氵", "人": "亻", "心": "忄", "手": "扌", "金": "钅", "食": "饣", "糸": "纟", "示": "礻",
       "衣": "衤", "犬": "犭", "艸": "艹", "竹": "⺮", "辵": "辶", "邑": "阝", "阜": "阝", "刀": "刂", "火": "灬",
       "玉": "王", "肉": "月", "网": "罒", "攴": "攵", "頁": "页", "貝": "贝", "車": "车", "門": "门", "馬": "马",
       "鳥": "鸟", "魚": "鱼", "見": "见", "長": "长", "風": "风"}
ALIAS = {"丷": 12, "⺀": 15, "⺧": 77, "⺹": 125}


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def main():
    rads = load("radicals.json")
    hz = load("hanzi.json")
    kc = load("kondr_chars.json")
    cru = load("char_ru.json")
    src = load("etym_src.json")
    K = load("kondr_1-30.json")
    lesson = [c["c"] for c in K["chars"]]
    book, ph, phof = load_posobie()
    key_of = {}
    for r in rads:
        for f in r[4]:
            key_of.setdefault(f, r[0])
    key_of.update({k: v for k, v in ALIAS.items() if k not in key_of})

    def first(py):
        return (py or "").split(" / ")[0].strip()

    def py_of(x):
        return first((kc.get("py") or {}).get(x) or (hz["c"].get(x) or [""] * 8)[7] or (hz["p"].get(x) or [""])[0])

    def ru_of(x):
        return (hz["c"].get(x) or [""] * 7)[6] or cru.get(x) or (kc.get("ru") or {}).get(x) or (hz["p"].get(x) or ["", ""])[1] or ""

    def part(form, role, n=None, py=None):
        if n is None:
            n = key_of.get(form, 0) if len(form) == 1 else 0
        if form == "月" and n == 130:
            pass
        r = rads[n - 1] if n else None
        if n and form == "阝":
            pass
        pyv = py or (r[2] if r and role != "f" else "") or py_of(form) or (r[2] if r else "")
        ruv = (r[3] if r else "") or ru_of(form)
        return [form, role, n, pyv, ruv]

    def ids_all(ch, depth=0):
        """все компоненты знака по IDS (рекурсивно, до 3 уровней)"""
        d = (src["c"].get(ch) or {}).get("ids", "") or ""
        out = set(c for c in d if c not in IDC and c != "？")
        if depth < 3:
            for c in list(out):
                if c != ch:
                    out |= ids_all(c, depth + 1)
        return out

    res, warn, errs = {}, [], []
    seen = set()
    for ln, line in enumerate((DATA / "etym_kondr.txt").read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip() or line.startswith("#"):
            continue
        body, _, note = line.partition("|")
        tok = body.split()
        ch, t = tok[0], tok[1]
        disputed = "?" in tok[2:3]
        specs = [x for x in tok[2:] if x != "?"]
        if ch in seen:
            errs.append(f"{ln}: {ch} повторяется")
        seen.add(ch)
        if t not in "gzip":
            errs.append(f"{ln}: {ch} тип {t}")
        parts = []
        for sp in specs:
            m = re.fullmatch(r"(.+?):([sfmxw])(?::(\d+))?(?:=([^~]+))?(?:~(.+))?", sp)
            if not m:
                errs.append(f"{ln}: {ch} часть «{sp}»")
                continue
            form, role, n, py = m.group(1), m.group(2), m.group(3), m.group(4)
            if form == "阝" and not n:
                errs.append(f"{ln}: {ch} — у 阝 нужен номер (163 справа / 170 слева)")
            pt = part(form, role, int(n) if n else None, py)
            if m.group(5):
                pt[4] = m.group(5).replace("_", " ")
            parts.append(pt)
        roles = [p[1] for p in parts]
        if roles == ["w"]:
            pass
        elif "w" in roles:
            errs.append(f"{ln}: {ch} — «w» вместе с частями")
        elif t == "p" and (roles.count("f") > 1 or (not roles.count("f") and "x" not in roles)):
            errs.append(f"{ln}: {ch} — у фоноидеограммы один фонетик (или условный знак на его месте)")
        elif t == "p" and not any(r in "sx" for r in roles):
            errs.append(f"{ln}: {ch} — нет смысловой части")
        elif t == "i" and roles.count("m") < 1:
            errs.append(f"{ln}: {ch} — у идеограммы нет смысловых частей")
        elif t in "gz":
            errs.append(f"{ln}: {ch} — пиктограмма/указательная должна быть целой (w)")
        comp = ids_all(ch)
        vis = 1
        for p in parts:
            if p[1] != "w" and len(p[0]) == 1 and p[0] not in comp:
                warn.append(f"{ch}:{p[0]}")
                vis = 0
            if p[1] == "f" and not p[3]:
                errs.append(f"{ln}: {ch} — нет чтения фонетика {p[0]}")
        bk = book_info(book.get(ch, []))
        if bk and bk[2] and bk[2] != t:
            errs.append(f"{ln}: {ch} — тип {t}, а в пособии {bk[2]}")
        for p in parts:
            if p[1] == "f" and p[0] in ph:
                p.append(ph[p[0]])
        if ch in phof and not any(p[1] == "f" and p[0] == phof[ch][0] for p in parts):
            warn.append(f"{ch}:фонетик_по_пособию_{phof[ch][0]}")
        res[ch] = [t, parts, note.strip(), 1 if disputed else 0, 0,
                   [bk[0], bk[1], 1 if bk[2] else 0] if bk else 0, vis]
    missing = [c for c in lesson if c not in res]
    extra = [c for c in res if c not in lesson]
    if missing or extra:
        errs.append(f"не разобраны: {''.join(missing)}; лишние: {''.join(extra)}")
    if errs:
        sys.exit("ОШИБКИ:\n" + "\n".join(errs))

    # остальные знаки словаря — автоматически, если 汉典 и Make Me a Hanzi дают ясный разбор
    ts = src["ts"]
    auto = 0
    for ch, s in src["c"].items():
        if ch in res:
            continue
        d = s.get("ids", "")
        top = top_parts(d)

        def loc(c):
            for x in (c, ts.get(c, c), VAR.get(c), VAR.get(ts.get(c, c))):
                if x and x in top:
                    return x
            return None
        h = s.get("h", "")
        m = re.match(r"(形声|会意|象形|指事)", h)
        ht = {"形声": "p", "会意": "i", "象形": "g", "指事": "z"}.get(m.group(1)) if m else None
        sem = [loc(x) for x in re.findall(r"从([^\s,，。、“”\"()（）声省亦]{1,2}?)(?=[,，。、(（]|$|声|省)", h)]
        ph = [loc(x) for x in re.findall(r"([^\s,，。、从“”\"()（）]{1,2}?)(?:省)?(?:亦)?声", h)]
        mm = s.get("m") or []
        entry = None
        if ph and ph[0] and sem and sem[0] and sem[0] != ph[0]:
            entry = ["p", [part(sem[0], "s"), part(ph[0], "f")]]
        elif mm and mm[0] == "pictophonetic" and mm[1] in top and mm[2] in top and mm[1] != mm[2] and (not ht or ht == "p"):
            entry = ["p", [part(mm[1], "s"), part(mm[2], "f")]]
        elif ht in ("g", "z"):
            entry = [ht, [part(ch, "w")]]
        elif ht == "i" and len(sem) >= 2 and all(sem) and not ph:
            entry = ["i", [part(x, "m") for x in sem]]
        if entry:
            res[ch] = entry + ["", 0, 1, 0, 1]
            auto += 1
    (DATA / "etym.json").write_text(json.dumps(res, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    from collections import Counter
    lt = Counter(res[c][0] for c in lesson)
    nb = sum(1 for c in lesson if res[c][5])
    nt = sum(1 for c in lesson if res[c][5] and res[c][5][2])
    print(f"etym.json: уроки {len(lesson)} (изобразительных {lt['g']}, условных {lt['z']}, идеограмм {lt['i']}, "
          f"фоноидеограмм {lt['p']}; спорных {sum(res[c][3] for c in lesson)}; в пособии {nb}, из них с типом {nt}), "
          f"авто для остальных {auto}")
    if warn:
        print(f"части не найдены в IDS ({len(warn)}) — проверить вручную: " + " ".join(warn))


TYPE_OF = {"g": "g", "i": "i", "p": "p", "c": "z", "ф/и": "p", "и/г": "i"}


def load_posobie():
    """posobie.txt → ({знак: [(урок, раздел, [ключи], тип, примечание)…]}, {фонетик: чтения}, {знак: (фонетик, чтение)})"""
    book, ph, phof = {}, {}, {}
    for line in (DATA / "posobie.txt").read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        les, sec, form, keys, t, *rest = line.split(" ", 5) + [""]
        note = rest[0] if rest else ""
        ch = form[0]
        if form.endswith("*"):
            continue
        ks = [int(x) for x in re.findall(r"\d{3}", keys)]
        book.setdefault(ch, []).append((int(les), sec, ks, t, note))
        if t == "f":
            m = re.match(r"(\S+)(?: \(([^)]*)\))?", note)
            ph.setdefault(ch, ", ".join(x for x in re.split(r"[ ,]+", m.group(2) or "") if x) or m.group(1).split("/")[0])
        else:
            m = re.search(r"фонетик ([a-zü][a-zü ,]*)", note)
            if m:
                ph.setdefault(ch, ", ".join(x for x in re.split(r"[ ,]+", m.group(1)) if x))
            m = re.search(r"фонетик (\S) ([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+)", note)
            if m and sec == "B":
                phof[ch] = (m.group(1), m.group(2))
    return book, ph, phof


def book_info(rows):
    """строки пособия о знаке → ([ключи], урок, тип|None): сначала раздел B, потом A; тип '?' — по полной форме"""
    if not rows:
        return None
    rows = sorted(rows, key=lambda r: (r[1] != "B", r[0]))
    t = None
    for les, sec, ks, tt, note in rows:
        if tt in TYPE_OF:
            t = TYPE_OF[tt]
        elif tt == "?":
            m = re.search(r"\(\S+(?: [\d,]+)? (ф/и|и/г)", note)
            t = TYPE_OF[m.group(1)] if m else None
        if t:
            break
    keyed = [r for r in rows if r[2]]
    r = keyed[0] if keyed else rows[0]
    return [r[2], r[0], t]


def top_parts(d):
    """непосредственные части IDS: '⿰讠射' → ['讠','射']"""
    i = 0

    def node():
        nonlocal i
        c = d[i]
        i += 1
        if c in IDC:
            return ("op", [node() for _ in range(3 if c in "⿲⿳" else 2)])
        return ("leaf", c)

    def flat(x):
        return x[1] if x[0] == "leaf" else "".join(flat(k) for k in x[1])
    try:
        t = node()
    except IndexError:
        return []
    return [t[1]] if t[0] == "leaf" else [flat(k) for k in t[1]]


if __name__ == "__main__":
    main()
