from pathlib import Path
import sys

from PIL import Image


def extract_signature(source_path: Path, output_path: Path) -> None:
    source = Image.open(source_path).convert("RGB")
    width, height = source.size
    # Signature bounds in the supplied 1448x1086 reference. Scaling keeps the
    # extraction deterministic if the same artwork is exported at another size.
    crop_box = (
        round(width * 0.640),
        round(height * 0.690),
        round(width * 0.855),
        round(height * 0.822),
    )
    crop = source.crop(crop_box)
    transparent = Image.new("RGBA", crop.size, (17, 43, 151, 0))
    source_pixels = crop.load()
    output_pixels = transparent.load()

    for y in range(crop.height):
        for x in range(crop.width):
            red, green, blue = source_pixels[x, y]
            blue_separation = blue - max(red, green)
            darkness = 235 - ((red + green + blue) // 3)
            # The reference ink is chromatic blue. Gold ornament, gray shadow
            # and paper remain transparent even where they are relatively dark.
            if blue > 65 and blue_separation > 18 and blue > red * 1.14 and blue > green * 1.06:
                alpha = max(0, min(255, blue_separation * 5 + darkness))
                output_pixels[x, y] = (17, 43, 151, alpha)

    alpha = transparent.getchannel("A")
    bounds = alpha.getbbox()
    if not bounds:
        raise RuntimeError("No blue signature ink was found in the supplied reference.")
    left, top, right, bottom = bounds
    padding = 6
    cleaned = transparent.crop((
        max(0, left - padding), max(0, top - padding),
        min(transparent.width, right + padding), min(transparent.height, bottom + padding),
    ))
    cleaned = cleaned.resize((cleaned.width * 3, cleaned.height * 3), Image.Resampling.LANCZOS)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cleaned.save(output_path, "PNG", optimize=True)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract-certificate-signature.py SOURCE OUTPUT")
    extract_signature(Path(sys.argv[1]), Path(sys.argv[2]))
