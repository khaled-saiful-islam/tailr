"""Project cover pictures for the demo: a bold gradient with a simple app screen on it."""

from __future__ import annotations

import io

from PIL import Image, ImageDraw, ImageFont

WIDTH, HEIGHT = 1600, 1000


def _rgb(hex_colour: str) -> tuple[int, int, int]:
    value = hex_colour.lstrip("#")
    return int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16)


def _gradient(start: str, end: str) -> Image.Image:
    """A diagonal blend from `start` (top left) to `end` (bottom right)."""
    a, b = _rgb(start), _rgb(end)
    small = Image.new("RGB", (64, 40))
    pixels = small.load()
    assert pixels is not None
    for x in range(64):
        for y in range(40):
            t = (x / 63 + y / 39) / 2
            pixels[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    return small.resize((WIDTH, HEIGHT), Image.Resampling.BICUBIC)


def _font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:  # very old Pillow: no sizes
        return ImageFont.load_default()


def cover(title: str, start: str, end: str) -> bytes:
    """A 1600x1000 PNG: gradient, a window with a title bar, a heading and text lines."""
    image = _gradient(start, end)
    draw = ImageDraw.Draw(image)
    left, top, right, bottom = 260, 170, 1340, 830
    draw.rectangle((left + 18, top + 22, right + 18, bottom + 22), fill=(0, 0, 0))
    draw.rectangle((left, top, right, bottom), fill=(244, 246, 250))
    draw.rectangle((left, top, right, top + 70), fill=_rgb(start))
    for index, colour in enumerate(((255, 95, 86), (255, 189, 46), (39, 201, 63))):
        x = left + 36 + index * 34
        draw.ellipse((x, top + 24, x + 20, top + 44), fill=colour)
    draw.text((left + 70, top + 130), title, fill=(17, 24, 39), font=_font(76))
    for index, length in enumerate((720, 640, 560, 480, 400)):
        y = top + 280 + index * 62
        draw.rectangle((left + 70, y, left + 70 + length, y + 22), fill=(127, 137, 160))
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()
