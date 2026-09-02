# Packs the rendered sprites into one atlas. Each frame records the offset from the
# model origin to the trimmed sprite's top-left, so the renderer can place a sprite from
# a grid coordinate without knowing anything about the model it came from.
from PIL import Image
import json, os, math

SRC = "sprites"; CANVAS = 1024
man = json.load(open(f"{SRC}/manifest.json"))
names = sorted(man.keys())

items = []
for n in names:
    im = Image.open(f"{SRC}/{n}.png").convert("RGBA")
    bb = im.split()[3].getbbox()
    if not bb:
        print("  ! empty:", n); continue
    crop = im.crop(bb)
    # The model origin sits at the canvas centre; record where it lands inside the trim.
    items.append({"name": n, "img": crop,
                  "ax": CANVAS//2 - bb[0], "ay": CANVAS//2 - bb[1]})

# shelf pack, tallest first
items.sort(key=lambda i: -i["img"].height)
W = 2048
x = y = rowh = 0
for it in items:
    if x + it["img"].width > W:
        x = 0; y += rowh; rowh = 0
    it["x"], it["y"] = x, y
    x += it["img"].width; rowh = max(rowh, it["img"].height)
H = y + rowh
H = 1 << (H-1).bit_length()          # power of two height

atlas = Image.new("RGBA", (W, H), (0,0,0,0))
frames = {}
for it in items:
    atlas.paste(it["img"], (it["x"], it["y"]))
    frames[it["name"]] = {
        "x": it["x"], "y": it["y"], "w": it["img"].width, "h": it["img"].height,
        "ax": it["ax"], "ay": it["ay"],                     # origin inside the sprite
        "tags": man[it["name"]].get("tags", []),
        "yaw": man[it["name"]].get("yaw", 0)
    }
atlas.save("atlas.png", optimize=True)
json.dump({"tilePx": 48, "frames": frames}, open("atlas.json","w"), separators=(",",":"))
kb = os.path.getsize("atlas.png")//1024
fill = sum(i["img"].width*i["img"].height for i in items) / (W*H) * 100
print(f"atlas {W}x{H}  {len(frames)} frames  {kb}KB  {fill:.0f}% filled")
