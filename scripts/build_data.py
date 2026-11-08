#!/usr/bin/env python3
"""Reproducible data pipeline for Supreme Guide.

Reads *data files* shipped inside npm packages (never executes their code) and
writes compact JSON into public/data/. Run with:  npm run data

Sources & licences (see also CREDITS in README.md):
  - world-countries (mledoze/countries)  ODbL-1.0    -> countries.json
  - world-atlas (Natural Earth 1:50m)    Public domain -> world-50m.json
  - airport-data-js (OurAirports-derived) CC BY 4.0   -> airports.json
  - all-the-cities (GeoNames)             CC BY 4.0   -> cities.json
"""
import base64, gzip, json, os, re, shutil, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, "node_modules")
OUT = os.path.join(ROOT, "public", "data")
os.makedirs(OUT, exist_ok=True)


def dump(name, obj):
    path = os.path.join(OUT, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
    print(f"  {name}: {os.path.getsize(path)/1024:.0f} KB")


# ---------------------------------------------------------------- countries
raw = json.load(open(os.path.join(NM, "world-countries", "countries.json"), encoding="utf-8"))
countries = []
for c in raw:
    cap = c.get("capital") or []
    countries.append({
        "iso2": c["cca2"], "iso3": c["cca3"], "num": c.get("ccn3") or "",
        "name": c["name"]["common"], "official": c["name"]["official"],
        "capital": cap[0] if cap else "", "capitals": cap,
        "region": c.get("region", ""), "subregion": c.get("subregion", ""),
        "lat": c["latlng"][0], "lng": c["latlng"][1],
        "area": c.get("area", 0), "borders": c.get("borders", []),
        "landlocked": bool(c.get("landlocked")), "flag": c.get("flag", ""),
        "independent": bool(c.get("independent")), "un": bool(c.get("unMember")),
        "currencies": [v.get("name", "") for v in (c.get("currencies") or {}).values()],
        "languages": list((c.get("languages") or {}).values()),
        "demonym": ((c.get("demonyms") or {}).get("eng") or {}).get("m", ""),
    })
countries.sort(key=lambda x: x["name"])
dump("countries.json", countries)

# ---------------------------------------------------------------- geometry
shutil.copy(os.path.join(NM, "world-atlas", "countries-50m.json"), os.path.join(OUT, "world-50m.json"))
shutil.copy(os.path.join(NM, "world-atlas", "countries-110m.json"), os.path.join(OUT, "world-110m.json"))
print(f"  world-50m.json: {os.path.getsize(os.path.join(OUT,'world-50m.json'))/1024:.0f} KB")

# ---------------------------------------------------------------- airports
src = open(os.path.join(NM, "airport-data-js", "lib", "index.js"), encoding="utf-8").read()
blob = re.search(r'["\'`](H4sI[A-Za-z0-9+/=]{5000,})["\'`]', src).group(1)
airports_raw = json.loads(gzip.decompress(base64.b64decode(blob)))
airports = []
seen = set()
for a in airports_raw:
    iata = (a.get("iata") or "").strip()
    if not re.fullmatch(r"[A-Z]{3}", iata) or iata in seen:
        continue
    if a.get("type") not in ("large_airport", "medium_airport"):
        continue
    if str(a.get("scheduled_service")).upper() != "TRUE" or not a.get("time"):
        continue
    seen.add(iata)
    airports.append([iata, a.get("icao") or "", a["airport"], a["country_code"],
                     round(float(a["latitude"]), 4), round(float(a["longitude"]), 4),
                     a["time"], "L" if a["type"] == "large_airport" else "M"])
airports.sort()
dump("airports.json", airports)

# ---------------------------------------------------------------- cities
b = open(os.path.join(NM, "all-the-cities", "cities.pbf"), "rb").read()

def varint(p):
    r = s = 0
    while True:
        c = b[p]; p += 1; r |= (c & 0x7F) << s; s += 7
        if c < 0x80:
            return r, p

def zz(n):
    return (n >> 1) ^ -(n & 1)

p = 0; lon = lat = 0; cities = []
names = {2: "name", 3: "cc", 4: "alt", 5: "muni", 6: "sub", 7: "fc", 8: "admin"}
while p < len(b):
    ln, p = varint(p); end = p + ln; c = {}
    while p < end:
        key, p = varint(p); tag, wt = key >> 3, key & 7
        if wt == 2:
            l, p = varint(p); c[names[tag]] = b[p:p + l].decode(); p += l
        else:
            v, p = varint(p)
            if tag == 9: c["pop"] = v
            elif tag == 10: lon += zz(v); c["lon"] = lon / 1e5
            elif tag == 11: lat += zz(v); c["lat"] = lat / 1e5
    if c.get("pop", 0) >= 50000 or c.get("fc") == "PPLC":
        cities.append([c["name"], c["cc"], round(c["lat"], 4), round(c["lon"], 4), c.get("pop", 0),
                       1 if c.get("fc") == "PPLC" else 0])
cities.sort(key=lambda x: -x[4])
dump("cities.json", cities)
print("done:", len(countries), "countries,", len(airports), "airports,", len(cities), "cities")
