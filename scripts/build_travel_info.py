#!/usr/bin/env python3
"""Driving side per country -> public/data/travel-info.json.

Source: @rapideditor/country-coder (OpenStreetMap / RapiD, ISC). Its data is read from the package
file as data (never executed). A country takes the side of its own territory, or — when it is
defined by parts — the side shared by all parts that are not separate ISO territories (e.g. the UK
= England, Scotland, Wales, Northern Ireland; Gibraltar has its own code GI). No answer when the
parts disagree. Run: python3 scripts/build_travel_info.py
"""
import collections, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "node_modules", "@rapideditor", "country-coder", "dist", "country-coder.mjs")
OUT = os.path.join(ROOT, "public", "data", "travel-info.json")

s = open(SRC, encoding="utf-8").read()
get = lambda p, k: (re.search(k + r': "([^"]*)"', p) or [None, None])[1]
feats = []
for m in re.finditer(r'properties: \{([^{}]*)\}, geometry: (null|\{)', s):
    p = m.group(1)
    groups = re.search(r'groups: \[([^\]]*)\]', p)
    feats.append({"iso": get(p, "iso1A2"), "country": get(p, "country"), "wd": get(p, "wikidata"), "name": get(p, "nameEn"),
                  "ds": get(p, "driveSide") or "right", "geom": m.group(2) == "{", "groups": re.findall(r'"([^"]+)"', groups.group(1)) if groups else []})

parts = collections.defaultdict(set)
for f in feats:
    if f["geom"] and f["country"] and not f["iso"]:
        parts[f["country"]].add(f["ds"])
drive = {}
for f in feats:
    if not f["iso"]:
        continue
    if f["geom"]:
        drive[f["iso"]] = f["ds"]
    elif len(parts.get(f["iso"], set())) == 1:
        drive[f["iso"]] = next(iter(parts[f["iso"]]))

# The UK also has overseas parts (e.g. Chagos) in the data: use its four constituent countries.
uk = next(f for f in feats if f["name"] == "Countries of the United Kingdom")
uk_sides = {f["ds"] for f in feats if f["geom"] and uk["wd"] in f["groups"]}
if len(uk_sides) == 1:
    drive["GB"] = next(iter(uk_sides))

out = {"drive": {k: ("l" if v == "left" else "r") for k, v in sorted(drive.items())}}
with open(OUT, "w", encoding="utf-8") as fh:
    json.dump(out, fh, separators=(",", ":"))
left = sorted(k for k, v in out["drive"].items() if v == "l")
print(f"travel-info.json: driving side for {len(drive)} countries; on the left: {' '.join(left)}")
