#!/usr/bin/env python3
"""City names in the game's 10 languages, from GeoNames alternate names (CC BY 4.0).

Usage (needs the 200 MB GeoNames dump, not committed, and OpenCC for Simplified Chinese):
    curl -O https://download.geonames.org/export/dump/alternateNamesV2.zip
    pip install opencc-python-reimplemented
    python3 scripts/build_city_names.py alternateNamesV2.zip

Writes public/data/city-names.json, aligned with public/data/cities.json (same order):
    {"n": <number of cities>, "langs": [...], "names": [[...10 names...] | 0, ...]}
A city with no translated name is 0; an empty string means "same as the default name".
Only names GeoNames tags with the language are used (preferred names first; colloquial and
historic names are skipped), and each name must be written in the script of its language.
"""
import io, json, os, re, sys, zipfile
from opencc import OpenCC  # Traditional → Simplified Chinese (GeoNames “zh” mixes both)

T2S = OpenCC("t2s")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, "node_modules")
OUT = os.path.join(ROOT, "public", "data")
LANGS = ["en", "fr", "es", "de", "it", "pt", "ru", "he", "ar", "zh"]
# GeoNames language tags accepted for each game language, best first.
TAGS = {l: [l] for l in LANGS}
TAGS["he"] = ["he", "iw"]
TAGS["zh"] = ["zh-CN", "zh-Hans", "zh"]

SCRIPT = {
    "ru": re.compile(r"^[Ѐ-ӿ\s\-'’.()0-9]+$"),
    "he": re.compile(r"^[֐-׿\s\-'’\"״׳.()0-9]+$"),
    "ar": re.compile(r"^[؀-ۿݐ-ݿ\s\-'’.()0-9]+$"),
    "zh": re.compile(r"^[㐀-鿿··\s\-()0-9]+$"),
}
LATIN = re.compile(r"^[A-Za-zÀ-ɏḀ-ỿ\s\-'’.()0-9]+$")


def city_ids():
    """Same parse, filter and order as build_data.py, plus the GeoNames id (field 1)."""
    b = open(os.path.join(NM, "all-the-cities", "cities.pbf"), "rb").read()

    def varint(p):
        r = s = 0
        while True:
            c = b[p]; p += 1; r |= (c & 0x7F) << s; s += 7
            if c < 0x80:
                return r, p

    names = {2: "name", 3: "cc", 4: "alt", 5: "muni", 6: "sub", 7: "fc", 8: "admin"}
    p = 0; out = []
    while p < len(b):
        ln, p = varint(p); end = p + ln; c = {}
        while p < end:
            key, p = varint(p); tag, wt = key >> 3, key & 7
            if wt == 2:
                l, p = varint(p); c[names[tag]] = b[p:p + l].decode(); p += l
            else:
                v, p = varint(p)
                if tag == 1: c["id"] = (v >> 1) ^ -(v & 1)  # zigzag (readSVarint)
                elif tag == 9: c["pop"] = v
        if c.get("pop", 0) >= 50000 or c.get("fc") == "PPLC":
            out.append((c["id"], c["name"], c["cc"], c.get("pop", 0)))
    out.sort(key=lambda x: -x[3])
    return out


def main(zip_path):
    cities = city_ids()
    ref = json.load(open(os.path.join(OUT, "cities.json"), encoding="utf-8"))
    assert len(ref) == len(cities) and all(r[0] == c[1] and r[1] == c[2] for r, c in zip(ref, cities)), \
        "cities.json is not aligned with all-the-cities: run `npm run data` first"
    index = {c[0]: i for i, c in enumerate(cities)}
    wanted = {t: l for l in LANGS for t in TAGS[l]}
    best = {}  # (i, lang) -> (rank, name)
    with zipfile.ZipFile(zip_path) as z, z.open("alternateNamesV2.txt") as f:
        for line in io.TextIOWrapper(f, encoding="utf-8"):
            col = line.rstrip("\n").split("\t")
            if len(col) < 8:
                continue
            gid = int(col[1]); i = index.get(gid)
            if i is None or col[2] not in wanted:
                continue
            if col[6] == "1" or col[7] == "1" or (len(col) > 9 and col[9]):  # colloquial, historic, ended
                continue
            lang = wanted[col[2]]; name = col[3].strip()
            ok = SCRIPT[lang].match(name) if lang in SCRIPT else LATIN.match(name)
            if not ok or len(name) > 60:
                continue
            rank = (TAGS[lang].index(col[2]), 0 if col[4] == "1" else 1, 0 if col[5] != "1" else 1)
            if (i, lang) not in best or rank < best[(i, lang)][0]:
                best[(i, lang)] = (rank, name)
    rows = []
    for i, c in enumerate(cities):
        row = [best.get((i, l), (None, ""))[1] for l in LANGS]
        row[LANGS.index("zh")] = T2S.convert(row[LANGS.index("zh")])
        row = [("" if n == c[1] else n) for n in row]
        rows.append(row if any(row) else 0)
    path = os.path.join(OUT, "city-names.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump({"n": len(cities), "langs": LANGS, "names": rows}, fh, ensure_ascii=False, separators=(",", ":"))
    covered = {l: sum(1 for i in range(len(cities)) if (i, l) in best) for l in LANGS}
    print(f"city-names.json: {os.path.getsize(path)/1024:.0f} KB, {len(cities)} cities; with a name per language: {covered}")


if __name__ == "__main__":
    main(sys.argv[1])
