"""Malaysian places, so "Selangor" also matches a job in Cyberjaya or Puchong.

Job sources write locations many ways ("Petaling Jaya, Selangor, Malaysia",
"Greater Kuala Lumpur", "Bayan Lepas"). Each state lists the names that point to it.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Place:
    key: str
    label: str
    aliases: tuple[str, ...]

    @property
    def search_name(self) -> str:
        """What we send to job sources."""
        return self.label


def _place(key: str, label: str, aliases: str) -> Place:
    return Place(key, label, tuple(name.strip() for name in aliases.split("|")))


# Ordered by job volume, so the busiest match wins when a place is ambiguous.
PLACES: tuple[Place, ...] = (
    _place(
        "kuala_lumpur",
        "Kuala Lumpur",
        "Kuala Lumpur | KL | Federal Territory of Kuala Lumpur | Wilayah Persekutuan Kuala Lumpur"
        " | Greater Kuala Lumpur | Bangsar | Mont Kiara | Cheras | Bukit Jalil | KLCC | Sentul"
        " | Setapak | Kepong | Wangsa Maju | Sri Petaling | Mid Valley | Brickfields | TTDI"
        " | Bukit Bintang | Damansara Heights | Titiwangsa | Segambut",
    ),
    _place(
        "selangor",
        "Selangor",
        "Selangor | Petaling Jaya | PJ | Shah Alam | Subang Jaya | Subang | Cyberjaya | Puchong"
        " | Klang | Port Klang | Kajang | Bangi | Seri Kembangan | Serdang | Ampang | Rawang"
        " | Sepang | Kota Damansara | Mutiara Damansara | Ara Damansara | Bandar Utama | Sunway"
        " | Semenyih | Selayang | Gombak | Batu Caves | Banting | Dengkil | Glenmarie"
        " | Greater Kuala Lumpur",
    ),
    _place(
        "penang",
        "Penang",
        "Penang | Pulau Pinang | George Town | Georgetown | Bayan Lepas | Bayan Baru | Butterworth"
        " | Bukit Mertajam | Seberang Perai | Batu Kawan | Penang Island | Gelugor | Jelutong"
        " | Simpang Ampat | Nibong Tebal | Air Itam",
    ),
    _place(
        "johor",
        "Johor",
        "Johor | Johor Bahru | JB | Iskandar Puteri | Nusajaya | Skudai | Pasir Gudang"
        " | Batu Pahat | Muar | Kluang | Senai | Kulai | Segamat | Tebrau",
    ),
    _place("putrajaya", "Putrajaya", "Putrajaya"),
    _place(
        "negeri_sembilan",
        "Negeri Sembilan",
        "Negeri Sembilan | Seremban | Nilai | Port Dickson | Senawang | Enstek",
    ),
    _place("melaka", "Melaka", "Melaka | Malacca | Ayer Keroh | Alor Gajah | Jasin"),
    _place(
        "perak",
        "Perak",
        "Perak | Ipoh | Taiping | Teluk Intan | Seri Iskandar | Kampar | Sitiawan | Manjung"
        " | Lumut",
    ),
    _place("kedah", "Kedah", "Kedah | Alor Setar | Sungai Petani | Kulim | Langkawi"),
    _place(
        "pahang",
        "Pahang",
        "Pahang | Kuantan | Bentong | Temerloh | Genting Highlands | Cameron Highlands | Gebeng",
    ),
    _place("terengganu", "Terengganu", "Terengganu | Kuala Terengganu | Kemaman | Kerteh"),
    _place("kelantan", "Kelantan", "Kelantan | Kota Bharu"),
    _place("perlis", "Perlis", "Perlis | Kangar"),
    _place("sabah", "Sabah", "Sabah | Kota Kinabalu | Sandakan | Tawau | Lahad Datu"),
    _place("sarawak", "Sarawak", "Sarawak | Kuching | Miri | Sibu | Bintulu"),
    _place("labuan", "Labuan", "Labuan"),
)

BY_KEY = {place.key: place for place in PLACES}


@lru_cache(maxsize=64)
def _pattern(place_key: str) -> re.Pattern[str]:
    aliases = sorted(BY_KEY[place_key].aliases, key=len, reverse=True)
    return re.compile(r"\b(" + "|".join(re.escape(a) for a in aliases) + r")\b", re.I)


def places_in(text: str | None) -> set[str]:
    """Every state a location string points to."""
    if not text:
        return set()
    return {place.key for place in PLACES if _pattern(place.key).search(text)}


def guess_place(text: str | None) -> str | None:
    """The single most likely state for free text (a profile's location)."""
    found = places_in(text)
    if not found:
        return None
    for place in PLACES:  # PLACES is ordered by job volume
        if place.key in found:
            return place.key
    return None
