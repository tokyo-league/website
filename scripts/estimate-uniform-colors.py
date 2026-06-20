import colorsys
import io
import json
import math
import sys
import urllib.request
from collections import defaultdict
from pathlib import Path

from PIL import Image

PUBLIC_DIR = Path(__file__).resolve().parents[1] / "public"


def open_image(path):
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        request = urllib.request.Request(path, headers={"User-Agent": "TokyoLeagueColorBackfill/1.0"})
        with urllib.request.urlopen(request, timeout=20) as response:
            return Image.open(io.BytesIO(response.read())).convert("RGB")
    local_path = PUBLIC_DIR / path.lstrip("/")
    if not local_path.is_file():
        return None
    return Image.open(local_path).convert("RGB")


def color_distance(left, right):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(left, right)))


def to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(value))):02X}" for value in rgb)


def estimate(path):
    image = open_image(path)
    if image is None:
        return None

    width, height = image.size
    image = image.crop((width * 0.04, height * 0.16, width * 0.96, height * 0.78))
    image.thumbnail((220, 220))
    buckets = defaultdict(lambda: [0.0, 0.0, 0.0, 0.0])

    for red, green, blue in image.getdata():
        hue, saturation, value = colorsys.rgb_to_hsv(red / 255, green / 255, blue / 255)
        degrees = hue * 360

        if value < 0.16 or value > 0.97:
            continue
        if 72 <= degrees <= 172 and saturation > 0.22:
            continue
        if saturation < 0.24:
            continue

        hue_bin = int(degrees / 24)
        value_bin = min(4, int(value * 5))
        key = (hue_bin, value_bin)
        weight = saturation ** 2.4 * (0.35 + value)
        bucket = buckets[key]
        bucket[0] += weight
        bucket[1] += red * weight
        bucket[2] += green * weight
        bucket[3] += blue * weight

    candidates = []
    for weight, red, green, blue in buckets.values():
        if weight < 1:
            continue
        rgb = (red / weight, green / weight, blue / weight)
        candidates.append((weight, rgb))

    candidates.sort(key=lambda item: item[0], reverse=True)
    if not candidates:
        return None

    primary = candidates[0][1]
    secondary = next((rgb for _, rgb in candidates[1:] if color_distance(primary, rgb) >= 92), None)

    return {"home": to_hex(primary), "away": to_hex(secondary) if secondary else None}


def main():
    teams = json.load(sys.stdin)
    results = []
    for team in teams:
        logo_path = team.get("logoPath") or ""
        is_invalid_logo = (
            not logo_path
            or "ロゴグレー" in logo_path
            or "集合グレー" in logo_path
            or "/teams/photos/" in logo_path.lower()
        )
        source = None if is_invalid_logo else logo_path
        try:
            colors = estimate(source)
            results.append({"id": team["id"], "source": source, "colors": colors})
        except Exception as error:
            results.append({"id": team["id"], "source": source, "colors": None, "error": str(error)})
    json.dump(results, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
