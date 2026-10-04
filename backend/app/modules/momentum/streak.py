"""Streaks of brief-check days.

A day counts when the user opened their brief. Days without a scheduled brief (say,
weekends for a Monday-to-Friday radar) neither count nor break the streak, and today
doesn't break it until it's over.
"""

from __future__ import annotations

from collections.abc import Collection, Sequence
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Literal

DayState = Literal["checked", "missed", "off", "today", "ahead", "before"]
LOOKBACK_DAYS = 400


@dataclass(frozen=True)
class Streak:
    current: int
    best: int
    checked_today: bool


def _on(day: date, brief_days: Collection[int]) -> bool:
    return day.weekday() in brief_days


def streak(checked: Collection[date], today: date, brief_days: Sequence[int]) -> Streak:
    days_on = set(brief_days)
    current = 0
    day = today if today in checked else today - timedelta(days=1)
    for _ in range(LOOKBACK_DAYS):
        if day in checked:
            current += 1
        elif _on(day, days_on):
            break
        day -= timedelta(days=1)

    best, run = 0, 0
    if checked:
        day = min(checked)
        while day <= today:
            if day in checked:
                run += 1
                best = max(best, run)
            elif _on(day, days_on) and day < today:
                run = 0
            day += timedelta(days=1)
    return Streak(current=current, best=max(best, current), checked_today=today in checked)


def week(
    checked: Collection[date], today: date, brief_days: Sequence[int]
) -> list[tuple[date, DayState]]:
    """Monday to Sunday of this week, each with what happened.

    Days before the first brief ever opened are "before": nothing was missed yet.
    """
    days_on = set(brief_days)
    first = min(checked) if checked else today
    monday = today - timedelta(days=today.weekday())
    out: list[tuple[date, DayState]] = []
    for offset in range(7):
        day = monday + timedelta(days=offset)
        state: DayState
        if day in checked:
            state = "checked"
        elif day == today:
            state = "today"
        elif day > today:
            state = "ahead"
        elif day < first:
            state = "before"
        elif _on(day, days_on):
            state = "missed"
        else:
            state = "off"
        out.append((day, state))
    return out
