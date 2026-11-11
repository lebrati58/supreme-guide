#!/usr/bin/env python3
"""Rivers, mountain ranges / deserts and peaks for the route guide — public/data/geo-features.json.

Sources (both free, offline once built):
  - Natural Earth 1:10m (public domain): rivers & lake centerlines, geography regions (polygons),
    elevation points. Ranges, deserts and peaks carry names in the game languages.
  - GeoNames (CC BY 4.0) for river names in the game languages: each Natural Earth river is matched
    to a GeoNames stream (feature code STM) with the same name inside the river's bounding box.

Usage (inputs not committed):
    git clone --depth 1 --filter=blob:none --sparse https://github.com/nvkelso/natural-earth-vector.git ne
    (cd ne && git sparse-checkout set --no-cone /geojson/ne_10m_rivers_lake_centerlines.geojson \
        /geojson/ne_10m_geography_regions_polys.geojson /geojson/ne_10m_geography_regions_elevation_points.geojson)
    curl -O https://download.geonames.org/export/dump/allCountries.zip
    curl -O https://download.geonames.org/export/dump/alternateNamesV2.zip
    pip install opencc-python-reimplemented
    python3 scripts/build_geo_features.py ne/geojson allCountries.zip alternateNamesV2.zip
"""
import io, json, math, os, re, sys, zipfile
from opencc import OpenCC

T2S = OpenCC("t2s")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "data", "geo-features.json")
LANGS = ["en", "fr", "es", "de", "it", "pt", "ru", "he", "ar", "zh"]
SCRIPT = {
    "ru": re.compile(r"^[Ѐ-ӿ\s\-'’.()0-9]+$"),
    "he": re.compile(r"^[֐-׿\s\-'’\"״׳.()0-9]+$"),
    "ar": re.compile(r"^[؀-ۿݐ-ݿ\s\-'’.()0-9]+$"),
    "zh": re.compile(r"^[㐀-鿿··\s\-()0-9]+$"),
}
LATIN = re.compile(r"^[A-Za-zÀ-ɏḀ-ỿ\s\-'’.()0-9]+$")


def ok_name(lang, name):
    if not name or len(name) > 60:
        return False
    return bool(SCRIPT[lang].match(name) if lang in SCRIPT else LATIN.match(name))


def names_row(default, by_lang):
    """[en, fr, …] with '' where same as default or missing; zh in Simplified."""
    row = []
    for l in LANGS:
        n = re.sub(r"\s*\([^)]*\)$", "", (by_lang.get(l) or "").strip())
        if l == "zh" and n:
            n = T2S.convert(n)
        row.append("" if (not ok_name(l, n) or n == default) else n)
    return row


# ---------------------------------------------------------------- geometry helpers
def rdp(points, eps):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = math.hypot(dx, dy)
    dmax, idx = 0.0, 0
    for i in range(1, len(points) - 1):
        x0, y0 = points[i]
        # Closed rings start and end on the same point: fall back to the distance to that point.
        d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / norm if norm > 1e-9 else math.hypot(x0 - x1, y0 - y1)
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        return rdp(points[: idx + 1], eps)[:-1] + rdp(points[idx:], eps)
    return [points[0], points[-1]]


def simplify_line(coords, eps):
    pts = rdp([(round(x, 4), round(y, 4)) for x, y in coords[:]], eps)
    return [[round(x, 3), round(y, 3)] for x, y in pts]


def lines_of(geom):
    if geom["type"] == "LineString":
        return [geom["coordinates"]]
    if geom["type"] == "MultiLineString":
        return geom["coordinates"]
    return []


def polys_of(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    return []


def bbox(lines):
    xs = [p[0] for l in lines for p in l]; ys = [p[1] for l in lines for p in l]
    return min(xs), min(ys), max(xs), max(ys)


def main(ne_dir, all_zip, alt_zip):
    # ---------------------------------------------------------------- rivers (Natural Earth)
    rv = json.load(open(os.path.join(ne_dir, "ne_10m_rivers_lake_centerlines.geojson"), encoding="utf-8"))
    rivers = {}
    for f in rv["features"]:
        p = f["properties"]
        name = (p.get("name_en") or p.get("name") or "").strip()
        if not name or p.get("featurecla") not in ("River", "Lake Centerline") or (p.get("scalerank") or 99) > 7:
            continue
        r = rivers.setdefault(name, {"lines": [], "rank": 99})
        r["lines"] += lines_of(f["geometry"])
        r["rank"] = min(r["rank"], int(p.get("scalerank") or 99))
    print("rivers (NE):", len(rivers))

    # ---------------------------------------------------------------- GeoNames streams with the same names
    key = lambda s: re.sub(r"\s+(river|rivière|fleuve)$", "", s.strip().lower())
    wanted = {}
    for name, r in rivers.items():
        x0, y0, x1, y1 = bbox(r["lines"])
        wanted.setdefault(key(name), []).append((name, (x0 - 1, y0 - 1, x1 + 1, y1 + 1)))
    match = {}  # NE name -> (geonameid, population-like rank = len(alternatenames))
    with zipfile.ZipFile(all_zip) as z, z.open("allCountries.txt") as fh:
        for line in io.TextIOWrapper(fh, encoding="utf-8"):
            col = line.split("\t")
            if len(col) < 8 or col[6] != "H" or col[7] not in ("STM", "STMS"):
                continue
            for nm in {key(col[1]), key(col[2])}:
                for ne_name, (x0, y0, x1, y1) in wanted.get(nm, []):
                    lat, lng = float(col[4]), float(col[5])
                    if x0 <= lng <= x1 and y0 <= lat <= y1:
                        weight = len(col[3].split(",")) if col[3] else 0  # many alternate names = major river
                        if weight >= 3 and (ne_name not in match or weight > match[ne_name][1]):
                            match[ne_name] = (int(col[0]), weight)
    print("rivers matched in GeoNames:", len(match))
    ids = {gid: n for n, (gid, _) in match.items()}
    tags = {l: [l] for l in LANGS}; tags["he"] = ["he", "iw"]; tags["zh"] = ["zh-CN", "zh-Hans", "zh"]
    want_tag = {t: l for l in LANGS for t in tags[l]}
    best = {}
    with zipfile.ZipFile(alt_zip) as z, z.open("alternateNamesV2.txt") as fh:
        for line in io.TextIOWrapper(fh, encoding="utf-8"):
            col = line.rstrip("\n").split("\t")
            if len(col) < 8:
                continue
            gid = int(col[1])
            if gid not in ids or col[2] not in want_tag or col[6] == "1" or col[7] == "1":
                continue
            l = want_tag[col[2]]
            rank = (tags[l].index(col[2]), 0 if col[4] == "1" else 1)
            k = (ids[gid], l)
            if k not in best or rank < best[k][0]:
                best[k] = (rank, col[3])
    out_rivers = []
    for name, r in sorted(rivers.items(), key=lambda kv: kv[1]["rank"]):
        by = {l: best[(name, l)][1] for l in LANGS if (name, l) in best and l != "en"}  # keep Natural Earth's English name
        lines = [simplify_line(l, 0.02) for l in r["lines"]]
        lines = [l for l in lines if len(l) >= 2]
        if lines:
            out_rivers.append({"name": name, "n": names_row(name, by), "r": r["rank"], "l": lines})

    # ---------------------------------------------------------------- ranges, deserts, plateaus (Natural Earth)
    rg = json.load(open(os.path.join(ne_dir, "ne_10m_geography_regions_polys.geojson"), encoding="utf-8"))
    kinds = {"Range/mtn": "range", "Desert": "desert", "Plateau": "plateau"}
    out_regions = []
    for f in rg["features"]:
        p = f["properties"]
        kind = kinds.get(p.get("FEATURECLA"))
        name = (p.get("NAME_EN") or p.get("NAME") or "").strip()
        if not kind or not name or (p.get("SCALERANK") or 99) > 5:
            continue
        by = {l: p.get(f"NAME_{l.upper()}") for l in LANGS}
        polys = []
        for poly in polys_of(f["geometry"]):
            ring = simplify_line(poly[0], 0.05)
            if len(ring) >= 4:
                polys.append(ring)
        if polys:
            out_regions.append({"name": name, "n": names_row(name, by), "k": kind, "r": int(p.get("SCALERANK") or 9), "p": polys})

    # ---------------------------------------------------------------- peaks (Natural Earth elevation points)
    ep = json.load(open(os.path.join(ne_dir, "ne_10m_geography_regions_elevation_points.geojson"), encoding="utf-8"))
    out_peaks = []
    for f in ep["features"]:
        p = f["properties"]
        name = (p.get("name_en") or p.get("name") or "").strip()
        if p.get("featurecla") not in ("mountain", "volcano") or not name or not p.get("elevation"):
            continue
        x, y = f["geometry"]["coordinates"][:2]
        by = {l: p.get(f"name_{l}") for l in LANGS}
        out_peaks.append({"name": name, "n": names_row(name, by), "e": int(p["elevation"]), "v": p.get("featurecla") == "volcano", "c": [round(x, 3), round(y, 3)]})

    data = {"rivers": out_rivers, "regions": out_regions, "peaks": out_peaks}
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))
    cov = sum(1 for r in out_rivers if any(r["n"][1:]))
    print(f"geo-features.json: {os.path.getsize(OUT)/1024:.0f} KB — {len(out_rivers)} rivers ({cov} with translated names), "
          f"{len(out_regions)} ranges/deserts/plateaus, {len(out_peaks)} peaks")


if __name__ == "__main__":
    main(*sys.argv[1:4])
