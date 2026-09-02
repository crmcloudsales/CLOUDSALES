from pathlib import Path
from PIL import Image

BG = (8, 8, 15, 255)  # #08080f
ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'web/assets/cloudsales-isotipo-official-512.png'
OUT512 = ROOT / 'web/assets/cloudsales-app-icon-official-v3.png'
OUT192 = ROOT / 'web/assets/cloudsales-app-icon-official-v3-192.png'

src = Image.open(SRC).convert('RGBA')

# Crop only fully transparent padding; never alter the artwork itself.
alpha = src.getchannel('A')
bbox = alpha.getbbox()
art = src.crop(bbox) if bbox else src


def build(size: int, target_fraction: float = 0.625):
    target = round(size * target_fraction)
    w, h = art.size
    scale = min(target / w, target / h)
    nw = max(1, round(w * scale))
    nh = max(1, round(h * scale))
    resized = art.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (size, size), BG)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas, (x, y, nw, nh)

img512, box512 = build(512)
img192, box192 = build(192)
img512.convert('RGB').save(OUT512, 'PNG', optimize=True)
img192.convert('RGB').save(OUT192, 'PNG', optimize=True)

print('source_size=', src.size, 'cropped_art=', art.size)
print('512 placement=', box512, 'background=#08080f')
print('192 placement=', box192, 'background=#08080f')
print('wrote', OUT512)
print('wrote', OUT192)
