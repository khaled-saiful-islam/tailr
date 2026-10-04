"""Read salary text from job ads into a monthly range in ringgit.

Handles the shapes Malaysian listings use: "RM 15,000 - RM 20,000 per month",
"MYR 20K-MYR 25K / month", "MYR 120,000.00/yr - MYR 150,000.00/yr", "RM 4,500".
Hourly and daily rates are ignored (too ambiguous to compare).
"""

from __future__ import annotations

import re
from dataclasses import dataclass

_AMOUNT = re.compile(r"(\d[\d,]*(?:\.\d+)?)\s*([kK])?")
_YEARLY = re.compile(r"\b(year|yr|annum|annual|p\.?a\.?)\b", re.I)
_UNPARSEABLE = re.compile(r"\b(hour|hr|day|daily)\b", re.I)
_CURRENCY = re.compile(r"\b(RM|MYR)\b|RM(?=\d)", re.I)
_FOREIGN = re.compile(r"\b(USD|SGD|EUR|GBP|AUD)\b|[$€£]")


@dataclass(frozen=True)
class SalaryRange:
    minimum: int
    maximum: int

    @property
    def label(self) -> str:
        if self.minimum == self.maximum:
            return f"RM {self.minimum:,} a month"
        return f"RM {self.minimum:,} to RM {self.maximum:,} a month"


def parse_salary(text: str | None) -> SalaryRange | None:
    if not text or _UNPARSEABLE.search(text) or _FOREIGN.search(text):
        return None
    if not _CURRENCY.search(text) and "per month" not in text.lower():
        return None
    values = []
    for number, thousands in _AMOUNT.findall(text):
        value = float(number.replace(",", ""))
        if thousands:
            value *= 1000
        values.append(value)
    if not values:
        return None
    if _YEARLY.search(text):
        values = [v / 12 for v in values]
    values = [v for v in values if 300 <= v <= 300_000]
    if not values:
        return None
    low, high = min(values[:2]), max(values[:2])
    return SalaryRange(int(round(low, -1)), int(round(high, -1)))
