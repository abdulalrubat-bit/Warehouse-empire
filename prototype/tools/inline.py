# Bakes the atlas into landscape.html so the prototype is one downloadable file. The
# multi-file version broke the moment it was opened from a phone's Downloads folder --
# the HTML arrived on its own and had nothing to draw.
import base64, json, re, sys, os

here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
png = base64.b64encode(open(os.path.join(here, "atlas.png"), "rb").read()).decode()
meta = json.load(open(os.path.join(here, "atlas.json")))

block = ('<script id="atlasdata">window.__ATLAS=' + json.dumps(meta, separators=(",", ":")) +
         ';window.__ATLAS_PNG="data:image/png;base64,' + png + '";</script>')

f = os.path.join(here, "landscape.html")
s = open(f).read()
new, n = re.subn(r'<script id="atlasdata">.*?</script>|<script src="atlas\.js"></script>',
                 lambda m: block, s, count=1, flags=re.S)
assert n == 1, "atlas script tag not found"
open(f, "w").write(new)
print(f"inlined atlas: {len(png)//1024}KB base64, {len(meta['frames'])} frames -> "
      f"{os.path.getsize(f)//1024}KB html")
