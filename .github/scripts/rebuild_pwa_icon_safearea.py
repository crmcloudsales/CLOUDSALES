from pathlib import Path
from PIL import Image, ImageChops, ImageFile

ImageFile.LOAD_TRUNCATED_IMAGES = True
ROOT = Path(__file__).resolve().parents[2]
SRC512 = ROOT / 'web/assets/cloudsales-app-icon-official-v2.png'
OUT512 = SRC512
OUT192 = ROOT / 'web/assets/cloudsales-app-icon-official-v2-192.png'

src = Image.open(SRC512).convert('RGBA')
# Use the exact background already present in the current official icon.
bg = src.getpixel((0, 0))

# Isolate the visible isotipo from its current flat background without redrawing it.
base = Image.new('RGBA', src.size, bg)
diff = ImageChops.difference(src, base).convert('L')
mask = diff.point(lambda p: 255 if p > 10 else 0)
bbox = mask.getbbox()
if not bbox:
    raise SystemExit('Could not detect isotipo against current background')
art = src.crop(bbox)


def build(size: int, target_fraction: float = 0.625):
    target = round(size * target_fraction)
    w, h = art.size
    scale = min(target / w, target / h)
    nw = max(1, round(w * scale))
    nh = max(1, round(h * scale))
    resized = art.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size), bg)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas, (x, y, nw, nh)

img512, box512 = build(512)
img192, box192 = build(192)
img512.convert('RGB').save(OUT512, 'PNG', optimize=True)
img192.convert('RGB').save(OUT192, 'PNG', optimize=True)

print('source_size=', src.size)
print('detected_background=', bg)
print('detected_isotipo_bbox=', bbox, 'art_size=', art.size)
print('512 placement=', box512)
print('192 placement=', box192)
print('wrote', OUT512)
print('wrote', OUT192)
