from __future__ import annotations

from datetime import date, timedelta

from app.modules.momentum.streak import streak, week

WEEKDAYS = (0, 1, 2, 3, 4)
EVERY_DAY = (0, 1, 2, 3, 4, 5, 6)
MONDAY = date(2026, 10, 5)


def days(*offsets: int) -> set[date]:
    return {MONDAY + timedelta(days=offset) for offset in offsets}


def test_weekends_off_dont_break_a_weekday_streak() -> None:
    # Thu, Fri last week, then Mon and Tue this week; today is Tuesday.
    checked = days(-4, -3, 0, 1)
    result = streak(checked, MONDAY + timedelta(days=1), WEEKDAYS)
    assert result.current == 4
    assert result.checked_today


def test_a_missed_brief_day_breaks_it() -> None:
    checked = days(-4, -3, 1)  # Monday missed
    result = streak(checked, MONDAY + timedelta(days=1), WEEKDAYS)
    assert result.current == 1
    assert result.best == 2


def test_today_counts_only_once_checked_and_never_breaks_early() -> None:
    checked = days(-2, -1)
    result = streak(checked, MONDAY, EVERY_DAY)
    assert result.current == 2
    assert not result.checked_today


def test_a_paused_radar_never_breaks_the_streak() -> None:
    checked = days(-10, -9)
    assert streak(checked, MONDAY, ()).current == 2


def test_no_history() -> None:
    result = streak(set(), MONDAY, EVERY_DAY)
    assert (result.current, result.best, result.checked_today) == (0, 0, False)


def test_week_strip() -> None:
    today = MONDAY + timedelta(days=2)  # Wednesday
    states = [state for _, state in week(days(0), today, WEEKDAYS)]
    assert states == ["checked", "missed", "today", "ahead", "ahead", "ahead", "ahead"]
    weekend = [state for _, state in week(days(-7), MONDAY + timedelta(days=6), WEEKDAYS)]
    assert weekend[5] == "off"
    assert weekend[6] == "today"


def test_days_before_the_first_check_were_not_missed() -> None:
    sunday = MONDAY + timedelta(days=6)
    states = [state for _, state in week(days(6), sunday, EVERY_DAY)]
    assert states == ["before"] * 6 + ["checked"]
    [(_, first), *_] = week(set(), MONDAY + timedelta(days=1), EVERY_DAY)
    assert first == "before"
