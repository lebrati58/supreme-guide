#!/usr/bin/env python3
"""Small offline photos for the landmarks, from Wikimedia Commons, with their credits.

For each landmark of src/content/landmarks.ts: the lead image of its English Wikipedia article,
kept only if the file is on Wikimedia Commons under a free licence (public domain, CC0, CC BY,
CC BY-SA). The photo is saved at 400 px wide in public/photos/landmarks/<id>.jpg and its credit
(author, licence, file page) in public/data/landmark-photos.json — shown with the photo, as the
licences require. Landmarks without a suitable free image are simply left without a photo.

Run: python3 scripts/build_landmark_photos.py [--only id1,id2]     (needs en.wikipedia.org, commons.wikimedia.org,
upload.wikimedia.org, thumb.wikimedia.org)
"""
import html, io, json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "content", "landmarks.ts")
OUT_DIR = os.path.join(ROOT, "public", "photos", "landmarks")
OUT_JSON = os.path.join(ROOT, "public", "data", "landmark-photos.json")
UA = "SupremeGuideBuild/1.0 (https://github.com/lebrati58/supreme-guide; offline travel quiz, build script)"
# Clearly free licences only: public domain, CC0, CC BY, CC BY-SA, Free Art License, KOGL Type 1 (attribution only).
FREE = re.compile(r"^(public domain|pd\b|cc0|cc[ -]by(-sa)?[ -]\d(\.\d)?|fal\b|free art licen[cs]e|kogl type 1\b)", re.I)
WIDTH = 400      # thumbnail requested from Commons
OUT_W, QUALITY = 360, 70   # stored size: ≈25–40 KB per photo, offline


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
                return data if binary else json.loads(data.decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:  # rate limit / busy: back off politely
                wait = int(e.headers.get("Retry-After") or 0) or 5 * (attempt + 1)
                time.sleep(min(wait, 60)); continue
            print(f"  ! {url[:90]}… {e}", file=sys.stderr); return None
        except Exception as e:  # noqa: BLE001
            if attempt == 4:
                print(f"  ! {url[:90]}… {e}", file=sys.stderr); return None
            time.sleep(3 * (attempt + 1))
    return None


def shrink(data):
    """Resize to OUT_W px wide and re-encode as a small progressive JPEG (format change only; metadata dropped)."""
    from PIL import Image
    try:
        im = Image.open(io.BytesIO(data))
        if im.mode in ("RGBA", "LA", "P"):
            im = im.convert("RGBA"); bg = Image.new("RGB", im.size, (255, 255, 255)); bg.paste(im, mask=im.split()[3]); im = bg
        im = im.convert("RGB")
        if im.width > OUT_W:
            im = im.resize((OUT_W, round(im.height * OUT_W / im.width)), Image.LANCZOS)
        buf = io.BytesIO(); im.save(buf, "JPEG", quality=QUALITY, optimize=True, progressive=True)
        return buf.getvalue()
    except Exception as e:  # noqa: BLE001
        print(f"  ! image: {e}", file=sys.stderr); return None


def chunks(xs, n):
    for i in range(0, len(xs), n):
        yield xs[i:i + n]


def plain(s, n=120):
    s = re.sub(r"<span[^>]*display:\s*none[^>]*>.*?</span>", "", s or "", flags=re.S)
    s = html.unescape(re.sub(r"<[^>]+>", " ", s)).strip()
    s = re.sub(r"\s+", " ", s)
    m = re.fullmatch(r"(.+?) ?\1", s)  # "Unknown authorUnknown author" → "Unknown author"
    return (m.group(1) if m else s)[:n]


def lead_images(titles):
    """English Wikipedia title -> lead image file name, 50 titles per request."""
    res = {}
    for part in chunks(titles, 50):
        q = get("https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&piprop=name&pilicense=free&redirects=1&titles="
                + urllib.parse.quote("|".join(part)))
        query = (q or {}).get("query", {})
        alias = {}
        for k in ("normalized", "redirects"):
            for m in query.get(k, []):
                alias[m["to"]] = alias.get(m["from"], m["from"])
        for p in query.get("pages", []):
            if p.get("pageimage"):
                t = p["title"]
                while t in alias and alias[t] != t:
                    t = alias[t]
                res[t] = p["pageimage"]
        time.sleep(1)
    return res


# Hand-picked Commons files where the article's lead image doesn't show the landmark from outside
# (still checked for a free licence like the others).
OVERRIDE = {
    "louvre": "Louvre Museum Wikimedia Commons.jpg",            # the Louvre Pyramid seen from the courtyard
}

NOT_A_PHOTO = re.compile(r"logo|map|flag|icon|coat.of.arms|seal|diagram|plan\b|locator|\.svg$|\.png$|\.gif$", re.I)


def article_photo(title):
    """First photo of the article when its lead image is missing or is a logo / map / drawing."""
    q = get("https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=images&imlimit=100&redirects=1&titles="
            + urllib.parse.quote(title))
    time.sleep(1)
    for p in (q or {}).get("query", {}).get("pages", []):
        for im in p.get("images", []):
            n = im["title"].split(":", 1)[1]
            if re.search(r"\.jpe?g$", n, re.I) and not NOT_A_PHOTO.search(n):
                return n
    return None


def commons_info(names):
    """File name -> imageinfo (thumb URL + licence metadata), 25 files per request."""
    res = {}
    for part in chunks(sorted(set(names)), 25):
        q = get("https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=%d&titles=%s"
                % (WIDTH, urllib.parse.quote("|".join("File:" + n for n in part))))
        query = (q or {}).get("query", {})
        norm = {m["to"]: m["from"] for m in query.get("normalized", [])}
        for p in query.get("pages", []):
            ii = (p.get("imageinfo") or [None])[0]
            if ii:
                res[norm.get(p["title"], p["title"])[5:]] = ii
        time.sleep(1)
    return res


def main():
    src = open(SRC, encoding="utf-8").read()
    marks = [(lid, urllib.parse.unquote(w).replace("_", " ")) for lid, w in re.findall(r"\{ id: '([a-z0-9-]+)',.*?wiki: '([^']+)'", src)]
    os.makedirs(OUT_DIR, exist_ok=True)
    out, skipped = {}, []
    only = set(sys.argv[2].split(",")) if len(sys.argv) > 2 and sys.argv[1] == "--only" else None
    if only:  # refresh just these landmarks, keep the others
        out = json.load(open(OUT_JSON, encoding="utf-8"))
        marks = [m for m in marks if m[0] in only]
    leads = {t: OVERRIDE[lid] for lid, t in marks if lid in OVERRIDE}
    leads.update(lead_images([t for lid, t in marks if lid not in OVERRIDE]))
    for _, t in marks:
        if t in leads and any(lid in OVERRIDE and tt == t for lid, tt in marks):
            continue
        if not leads.get(t) or NOT_A_PHOTO.search(leads[t]):
            alt = article_photo(t)
            if alt: leads[t] = alt
            else: leads.pop(t, None)
    infos = commons_info([n.replace("_", " ") for n in leads.values()])
    for lid, title in marks:
        name = leads.get(title)
        if not name:
            skipped.append((lid, "no lead image")); continue
        ii = infos.get(name.replace("_", " "))
        if not ii:  # lead image hosted on Wikipedia only: try the article's first free photo on Commons
            alt = article_photo(title)
            if alt and alt != name:
                ii = commons_info([alt.replace("_", " ")]).get(alt.replace("_", " "))
        if not ii:  # not on Commons (e.g. a non-free image hosted on Wikipedia itself)
            skipped.append((lid, "not on Commons")); continue
        em = ii.get("extmetadata", {})
        lic = plain(em.get("LicenseShortName", {}).get("value", ""), 40)
        low = lic.lower()
        if not FREE.match(lic) or "nc" in re.split(r"[ -]", low) or "nd" in re.split(r"[ -]", low):
            skipped.append((lid, f"licence {lic or '?'}")); continue
        thumb = ii.get("thumburl")
        path = os.path.join(OUT_DIR, f"{lid}.jpg")
        img = get(thumb, binary=True) if thumb else None
        time.sleep(1)
        small = shrink(img) if img else None
        if not small:
            skipped.append((lid, "download")); continue
        open(path, "wb").write(small)
        img = small
        artist = plain(em.get("Artist", {}).get("value", "")) or plain(em.get("Credit", {}).get("value", "")) or "Wikimedia Commons"
        out[lid] = {"f": f"photos/landmarks/{lid}.jpg", "a": artist, "l": lic, "u": ii.get("descriptionurl", ""),
                   "lu": plain(em.get("LicenseUrl", {}).get("value", ""), 200)}
        print(f"  ✓ {lid}: {lic} — {artist[:50]} ({len(img)//1024} KB)", flush=True)
    with open(OUT_JSON, "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    total = sum(os.path.getsize(os.path.join(ROOT, "public", v["f"])) for v in out.values())
    print(f"landmark-photos.json: {len(out)}/{src.count("{ id: '")} landmarks with a free photo, {total/1024:.0f} KB of images")
    for lid, why in skipped:
        print(f"  – {lid}: {why}")


if __name__ == "__main__":
    main()
