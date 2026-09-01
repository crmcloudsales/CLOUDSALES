from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "web" / "assets"
SOURCE = ASSETS / "cloudsales-isotipo-official-512.png"
OUT_512 = ASSETS / "cloudsales-app-icon-official-v2.png"
OUT_192 = ASSETS / "cloudsales-app-icon-official-v2-192.png"

# Must remain identical to the existing PWA manifest background/theme color.
BACKGROUND = (36, 9, 60, 255)  # #24093c
# Keep the isotipo deliberately smaller than the current icon so it has
# consistent breathing room on Android/iOS launchers and maskable crops.
FOREGROUND_RATIO = 0.68


def build(size: int, output: Path) -> None:
    src = Image.open(SOURCE).convert("RGBA")
    alpha = src.getchannel("A")
    bbox = alpha.getbbox()
    if not bbox:
        raise RuntimeError("Official CloudSales isotipo has no visible pixels")

    src = src.crop(bbox)
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
    build(512, OUT_512)
    build(192, OUT_192)
    print(f"Generated {OUT_512.relative_to(ROOT)} and {OUT_192.relative_to(ROOT)}")
