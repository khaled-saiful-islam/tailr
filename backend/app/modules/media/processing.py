"""Turn an uploaded picture into a safe, small WebP.

- The format is read from the file's own bytes, never from its name or the browser.
- Images that would decode to more than 40 megapixels are refused (decompression bombs).
- EXIF orientation is applied, then every bit of metadata (GPS, camera) is dropped.
- Avatars become a centred square; other images shrink to fit, never enlarge.
"""

from __future__ import annotations

import io
import warnings
from dataclasses import dataclass
from typing import Literal

from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.errors import UnprocessableError

Purpose = Literal["avatar", "project"]

ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}
MAX_PIXELS = 40_000_000
MAX_EDGE = 1600
AVATAR_SIZE = 640
QUALITY = 82


@dataclass(frozen=True)
class ProcessedImage:
    data: bytes
    width: int
    height: int


def _not_an_image() -> UnprocessableError:
    return UnprocessableError(
        "That isn't a picture Tailr can use. Try a JPG, PNG, WebP or GIF.", code="not_an_image"
    )


def _open(data: bytes) -> Image.Image:
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(data))
    except (Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise _too_large() from error
    except (UnidentifiedImageError, OSError, ValueError) as error:
        raise _not_an_image() from error
    if image.format not in ALLOWED_FORMATS:
        raise _not_an_image()
    if image.width * image.height > MAX_PIXELS:
        raise _too_large()
    try:
        image.load()
    except (OSError, ValueError, SyntaxError) as error:  # truncated or corrupt
        raise _not_an_image() from error
    return image


def _too_large() -> UnprocessableError:
    return UnprocessableError(
        "That picture is too big to process. Try one under 40 megapixels.",
        code="image_too_large",
    )


def process_image(data: bytes, *, purpose: Purpose) -> ProcessedImage:
    image = _open(data)
    image = ImageOps.exif_transpose(image) or image
    has_alpha = image.mode in {"RGBA", "LA", "PA"} or (
        image.mode == "P" and "transparency" in image.info
    )
    image = image.convert("RGBA" if has_alpha else "RGB")
    if purpose == "avatar":
        image = ImageOps.fit(image, (AVATAR_SIZE, AVATAR_SIZE), Image.Resampling.LANCZOS)
    else:
        image.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    image.save(buffer, format="WEBP", quality=QUALITY, method=4)  # no exif= → no metadata
    return ProcessedImage(data=buffer.getvalue(), width=image.width, height=image.height)
