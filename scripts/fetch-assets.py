#!/usr/bin/env python3
"""Fetch remaining assets: 8k textures, Pluto map, spacecraft photos (Wikimedia), fonts."""
import io, json, os, re, subprocess, sys, urllib.parse

ROOT = os.path.join(os.path.dirname(__file__), "..")
TEX = os.path.join(ROOT, "public", "textures")
IMG = os.path.join(ROOT, "public", "img")
FONTS = os.path.join(ROOT, "public", "fonts")
for d in (TEX, IMG, FONTS):
    os.makedirs(d, exist_ok=True)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 solar-catalog-build/0.1"

def curl_bytes(url, timeout=180):
    r = subprocess.run(
        ["curl", "-sL", "--fail", "--max-time", str(timeout), "-A", UA, url],
        capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"curl exit {r.returncode}")
    return r.stdout

class _Resp(io.BytesIO):
    def __enter__(self): return self
    def __exit__(self, *a): pass

def get(url, timeout=180):
    return _Resp(curl_bytes(url, timeout))

def download(url, path, min_bytes=10000):
    try:
        data = curl_bytes(url)
        if len(data) < min_bytes:
            print(f"FAIL  {os.path.basename(path)} — too small ({len(data)}b) from {url}")
            return False
        with open(path, "wb") as f:
            f.write(data)
        print(f"ok    {os.path.basename(path)} ({len(data)//1024}KB)")
        return True
    except Exception as e:
        print(f"FAIL  {os.path.basename(path)} — {e} ({url})")
        return False

# ---- 1. 8k textures (hi-res tier) ----
print("== 8k textures ==")
for name in ["8k_sun.jpg", "8k_mercury.jpg", "8k_venus_surface.jpg", "8k_earth_daymap.jpg",
             "8k_moon.jpg", "8k_mars.jpg", "8k_jupiter.jpg", "8k_saturn.jpg"]:
    out = os.path.join(TEX, name)
    if os.path.exists(out):
        print(f"skip  {name}"); continue
    download(f"https://www.solarsystemscope.com/textures/download/{name}", out)

# ---- 2. Wikimedia helpers ----
def commons_search(query, limit=8):
    q = urllib.parse.quote(query)
    url = (f"https://commons.wikimedia.org/w/api.php?action=query&list=search"
           f"&srsearch={q}&srnamespace=6&srlimit={limit}&format=json")
    with get(url, timeout=30) as r:
        data = json.load(r)
    return [hit["title"] for hit in data.get("query", {}).get("search", [])]

def commons_download(file_title, path, width=1600):
    # file_title like "File:Foo bar.jpg" or bare name
    name = file_title.replace("File:", "")
    url = ("https://commons.wikimedia.org/wiki/Special:FilePath/"
           + urllib.parse.quote(name) + f"?width={width}")
    return download(url, path)

print("== Pluto map ==")
pluto_out = os.path.join(TEX, "2k_pluto.jpg")
if not os.path.exists(pluto_out):
    ok = False
    for cand in ["Pluto global map (New Horizons).jpg",
                 "Pluto Global Color Map of Pluto.png"]:
        ok = commons_download(cand, pluto_out, width=2048)
        if ok: break
    if not ok:
        for title in commons_search("Pluto global mosaic map New Horizons cylindrical"):
            if re.search(r"(map|mosaic)", title, re.I) and re.search(r"\.(jpg|jpeg|png)$", title, re.I):
                print(f"  trying search hit: {title}")
                if commons_download(title, pluto_out, width=2048):
                    ok = True; break
    if not ok:
        print("PLUTO MAP NOT FOUND")

# ---- 3. Spacecraft photos ----
print("== Spacecraft photos ==")
CRAFT = {
    "iss.jpg": (["International Space Station after undocking of STS-132.jpg"],
                "International Space Station photograph orbit"),
    "hubble.jpg": (["HST-SM4.jpeg"], "Hubble Space Telescope photographed shuttle"),
    "jwst.jpg": (["James Webb Space Telescope 2009 top.jpg",
                  "James Webb Space Telescope Artist Conception.jpg"],
                 "James Webb Space Telescope artist rendering full observatory"),
    "voyager.jpg": (["Voyager spacecraft model.png", "Voyager.jpg"],
                    "Voyager spacecraft artist NASA model"),
    "newhorizons.jpg": (["New Horizons spacecraft model 1.png"],
                        "New Horizons spacecraft artist NASA"),
    "parker.jpg": (["Parker Solar Probe spacecraft model.png"],
                   "Parker Solar Probe spacecraft artist sun"),
}
for fname, (cands, query) in CRAFT.items():
    out = os.path.join(IMG, fname)
    if os.path.exists(out):
        print(f"skip  {fname}"); continue
    ok = False
    for cand in cands:
        ok = commons_download(cand, out)
        if ok: break
    if not ok:
        for title in commons_search(query):
            if re.search(r"\.(jpg|jpeg|png)$", title, re.I):
                print(f"  trying search hit: {title}")
                if commons_download(title, out):
                    ok = True; break
    if not ok:
        print(f"PHOTO NOT FOUND: {fname}")

# ---- 4. Fonts (Google Fonts, self-hosted woff2) ----
print("== Fonts ==")
FAMS = [
    ("Space Grotesk", "space-grotesk", [400, 500, 700]),
    ("IBM Plex Mono", "ibm-plex-mono", [400, 500, 600]),
]
css_out = []
for fam, slug, weights in FAMS:
    w = ";".join(str(x) for x in weights)
    url = f"https://fonts.googleapis.com/css2?family={urllib.parse.quote(fam)}:wght@{w}&display=swap"
    try:
        with get(url, timeout=30) as r:
            css = r.read().decode()
    except Exception as e:
        print(f"FAIL  fonts css {fam}: {e}"); continue
    # keep only latin blocks (they come last per weight, marked by unicode-range with U+0000)
    blocks = re.findall(r"/\* ([a-z-]+) \*/\s*@font-face\s*{([^}]+)}", css)
    for subset, body in blocks:
        if subset != "latin":
            continue
        m_url = re.search(r"src: url\((https://[^)]+\.woff2)\)", body)
        m_w = re.search(r"font-weight: (\d+)", body)
        if not (m_url and m_w):
            continue
        weight = m_w.group(1)
        fpath = os.path.join(FONTS, f"{slug}-{weight}.woff2")
        if not os.path.exists(fpath):
            download(m_url.group(1), fpath, min_bytes=5000)
        css_out.append(
            f"@font-face {{\n  font-family: '{fam}';\n  font-style: normal;\n"
            f"  font-weight: {weight};\n  font-display: swap;\n"
            f"  src: url('/fonts/{slug}-{weight}.woff2') format('woff2');\n}}")
with open(os.path.join(ROOT, "scripts", "fonts.css"), "w") as f:
    f.write("\n".join(css_out) + "\n")
print(f"wrote scripts/fonts.css with {len(css_out)} faces")
print("--- done ---")
