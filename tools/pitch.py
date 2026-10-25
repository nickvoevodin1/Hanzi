#!/usr/bin/env python3
"""Высота голоса (F0) в записи: ffmpeg → 16 кГц моно → автокорреляция по кадрам.

  from pitch import contour, tone_of
  f0 = contour('a.mp3')            # список Гц по кадрам 10 мс (0 — нет голоса)
  tone_of(f0, ref_hz)              # 1–4: ровный / восходящий / нисходяще-восходящий / нисходящий

Используется в make_audio_pack.py: проверка, что в записи слышен нужный тон, и «график тона» для приложения.
"""
import subprocess
import numpy as np

SR = 16000


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def contour(path, fmin=70, fmax=420, win=0.040, hop=0.010):
    x = load(path)
    n, h = int(win * SR), int(hop * SR)
    lo, hi = int(SR / fmax), int(SR / fmin)
    if len(x) < n:
        return []
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::h]
    rms = np.sqrt((frames ** 2).mean(axis=1))
    thr = max(0.004, rms.max() * 0.06)
    out = []
    for fr, r in zip(frames, rms):
        if r < thr:
            out.append(0.0)
            continue
        fr = fr - fr.mean()
        # нормированная разностная функция (YIN, шаги 1–3)
        d = np.array([np.sum((fr[:-t] - fr[t:]) ** 2) for t in range(1, hi + 1)])
        cmnd = d * np.arange(1, hi + 1) / np.maximum(np.cumsum(d), 1e-9)
        c = cmnd[lo - 1:]
        cand = np.where(c < 0.35)[0]
        if not len(cand):
            out.append(0.0)
            continue
        i = cand[0]
        while i + 1 < len(c) and c[i + 1] < c[i]:
            i += 1
        t = i + lo
        # параболическая интерполяция
        if 1 <= t - 1 < len(cmnd) - 1:
            a, b, g = cmnd[t - 2], cmnd[t - 1], cmnd[t]
            den = a - 2 * b + g
            t = t + (0.5 * (a - g) / den if den else 0)
        out.append(SR / t)
    return clean(out)


def clean(f0):
    """убрать одиночные выбросы и октавные скачки (медиана по 5 кадрам среди озвученных)"""
    f = np.array(f0)
    v = f > 0
    if v.sum() < 3:
        return f.tolist()
    med = np.median(f[v])
    for i in np.where(v)[0]:
        if f[i] > med * 1.8 or f[i] < med * 0.55:
            f[i] = 0
    g = f.copy()
    for i in range(len(f)):
        w = f[max(0, i - 2):i + 3]
        w = w[w > 0]
        if f[i] > 0 and len(w):
            g[i] = np.median(w)
    return g.tolist()


def voiced_st(f0, ref):
    """озвученная часть контура в полутонах относительно ref (без краёв — там «атака» и затухание)"""
    f = np.array(f0)
    idx = np.where(f > 0)[0]
    if len(idx) < 6:
        return None
    seg = f[idx[0]:idx[-1] + 1]
    seg = seg[seg > 0]
    k = max(1, len(seg) // 10)
    seg = seg[k:len(seg) - k] if len(seg) > 2 * k + 4 else seg
    return 12 * np.log2(seg / ref)


def tone_of(f0, ref, glide=False):
    """1–4 по форме контура одиночного слога; ref — средняя высота голоса диктора (Гц);
    glide — слог начинается с сонорного (w y r l m n): первые 30% контура — переход, не тон"""
    s = voiced_st(f0, ref)
    if s is None:
        return 0
    if glide and len(s) > 10:
        s = s[int(len(s) * 0.3):]
    n = len(s)
    a, m, z = np.mean(s[:max(2, n // 5)]), s[n // 5: n - n // 5], np.mean(s[-max(2, n // 5):])
    mn = float(np.min(s)) if len(s) else 0
    imn = int(np.argmin(s))
    if a - z > 3.5 and imn > n * 0.6:
        return 4
    if (imn > n * 0.2 and imn < n * 0.8 and min(a, z) - mn > 1.2 and mn < -1.5) or (np.max(s) < -1.0 and np.ptp(s) < 4):
        return 3
    if z - a > 2.0:
        return 2
    if abs(z - a) <= 2.0 and np.ptp(s) < 4:
        return 1
    return 4 if a > z else 2


def shape(f0, ref, n=24):
    """контур для рисования: n точек в полутонах (None — пауза), обрезаны тишина в начале и конце"""
    f = np.array(f0)
    idx = np.where(f > 0)[0]
    if not len(idx):
        return []
    f = f[idx[0]:idx[-1] + 1]
    xs = np.linspace(0, len(f) - 1, n)
    out = []
    for x in xs:
        w = f[max(0, int(x) - 1):int(x) + 2]
        w = w[w > 0]
        out.append(round(float(12 * np.log2(np.median(w) / ref)), 1) if len(w) else None)
    return out
