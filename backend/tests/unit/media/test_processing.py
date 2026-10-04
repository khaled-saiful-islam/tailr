"""Uploaded images are checked by their bytes, cleaned of metadata, resized and re-encoded."""

from __future__ import annotations

import io

import pytest
from PIL import Image

from app.core.errors import UnprocessableError
from app.modules.media.processing import (
    AVATAR_SIZE,
    MAX_EDGE,
    process_image,
)


def _image(fmt: str = "JPEG", size: tuple[int, int] = (800, 600), **save: object) -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", size, (200, 40, 40)).save(buffer, format=fmt, **save)
    return buffer.getvalue()


def _with_gps_and_rotation() -> bytes:
    image = Image.new("RGB", (400, 200), (10, 120, 200))
    exif = Image.Exif()
    exif[0x0112] = 6  # Orientation: rotate 90° clockwise to display
    exif[0x8825] = {2: (3.0, 8.0, 0.0)}  # GPS latitude
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", exif=exif)
    return buffer.getvalue()


def test_output_is_webp_without_metadata() -> None:
    result = process_image(_with_gps_and_rotation(), purpose="project")
    out = Image.open(io.BytesIO(result.data))
    assert out.format == "WEBP"
    assert not out.getexif()  # no GPS, no camera details
    # The EXIF orientation was applied before it was dropped: 400x200 → 200x400.
    assert (result.width, result.height) == (200, 400)


def test_large_project_images_shrink_but_keep_their_shape() -> None:
    result = process_image(_image(size=(4000, 2000)), purpose="project")
    assert max(result.width, result.height) == MAX_EDGE
    assert result.width == 2 * result.height


def test_small_images_are_not_enlarged() -> None:
    result = process_image(_image(size=(300, 200)), purpose="project")
    assert (result.width, result.height) == (300, 200)


def test_avatars_are_square() -> None:
    result = process_image(_image(size=(900, 600)), purpose="avatar")
    assert (result.width, result.height) == (AVATAR_SIZE, AVATAR_SIZE)


@pytest.mark.parametrize("fmt", ["PNG", "WEBP", "GIF"])
def test_common_formats_are_accepted(fmt: str) -> None:
    assert process_image(_image(fmt), purpose="project").data[:4] == b"RIFF"


def test_transparency_is_kept() -> None:
    buffer = io.BytesIO()
    Image.new("RGBA", (64, 64), (0, 0, 0, 0)).save(buffer, format="PNG")
    out = Image.open(io.BytesIO(process_image(buffer.getvalue(), purpose="project").data))
    assert out.mode == "RGBA"


@pytest.mark.parametrize(
    "data",
    [
        b"%PDF-1.7 not an image",
        b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
        b"",
        _image()[:200],  # truncated
    ],
)
def test_non_images_are_refused(data: bytes) -> None:
    with pytest.raises(UnprocessableError) as caught:
        process_image(data, purpose="project")
    assert caught.value.code == "not_an_image"


def test_decompression_bombs_are_refused() -> None:
    # A tiny file that claims to be enormous once decoded.
    data = _image("PNG", size=(12000, 12000), optimize=True)
    with pytest.raises(UnprocessableError) as caught:
        process_image(data, purpose="project")
    assert caught.value.code == "image_too_large"
