from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "web" / "assets"
SOURCE = ASSETS / "cloudsales-app-icon-source-v2.png"
OUT_512 = ASSETS / "cloudsales-app-icon-official-v2.png"
OUT_192 = ASSETS / "cloudsales-app-icon-official-v2-192.png"

# Keep the exact PWA background already used by CloudSales.
BACKGROUND = (36, 9, 60, 255)  # #24093c
# Deliberately smaller than the current launcher artwork to add breathing room.
FOREGROUND_RATIO = 0.68
BACKGROUND_TOLERANCE = 52


def color_distance(a, b):
    return max(abs(a[i] - b[i]) for i in range(3))


def extract_foreground(src: Image.Image) -> Image.Image:
    """Remove only edge-connected background; preserve the original isotipo pixels."""
    rgba = src.convert("RGBA")
    w, h = rgba.size
    px = rgba.load()
    seen = bytearray(w * h)
    q = deque()

    def add(x, y):
        idx = y * w + x
        if seen[idx]:
            return
        if color_distance(px[x, y], BACKGROUND) <= BACKGROUND_TOLERANCE:
            seen[idx] = 1
            q.append((x, y))

    for x in range(w):
        add(x, 0)
        add(x, h - 1)
    for y in range(h):
        add(0, y)
        add(w - 1, y)

    while q:
        x, y = q.popleft()
        if x:
            add(x - 1, y)
        if x + 1 < w:
            add(x + 1, y)
        if y:
            add(x, y - 1)
        if y + 1 < h:
            add(x, y + 1)

    out = rgba.copy()
    data = list(out.getdata())
    for idx, flagged in enumerate(seen):
        if flagged:
            r, g, b, _ = data[idx]
            data[idx] = (r, g, b, 0)
    out.putdata(data)
    bbox = out.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError("Could not isolate CloudSales isotipo from the official icon")
    return out.crop(bbox)


def build(size: int, output: Path) -> None:
    src = extract_foreground(Image.open(SOURCE))
    target = int(round(size * FOREGROUND_RATIO))
    scale = min(target / src.width, target / src.height)
    new_size = (max(1, round(src.width * scale)), max(1, round(src.height * scale)))
    src = src.resize(new_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    x = (size - src.width) // 2
    y = (size - src.height) // 2
    canvas.alpha_composite(src, (x, y))
    canvas.convert("RGB").save(output, "PNG", optimize=True)


if __name__ == "__main__":
    if not SOURCE.exists():
        raise RuntimeError(f"Stable source missing: {SOURCE}")
    build(512, OUT_512)
    build(192, OUT_192)
    print(f"Generated {OUT_512.relative_to(ROOT)} and {OUT_192.relative_to(ROOT)}")
