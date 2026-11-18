#!/usr/bin/env python3
"""Exact numbered radicals from section A of Kondrashevsky's handwriting guide.
Do not infer lesson numbers from word decompositions or redistribute the other radicals.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
out={str(L):[] for L in range(1,31)}
for line in (ROOT/'src/data/posobie.txt').read_text().splitlines():
    fields=line.split()
    if len(fields)>4 and fields[0].isdigit() and fields[1]=='A' and fields[3].isdigit():
        L,n=int(fields[0]),int(fields[3])
        if not any(x['n']==n for x in out[str(L)]):out[str(L)].append({'n':n,'form':fields[2]})
(ROOT/'src/data/lesson_keys.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
print('lesson_keys:',sum(map(len,out.values())),'numbered radicals, section A, lessons1–30')
