"""Calendar windows for the owner and admin analytics dashboards."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from app.core.exceptions import validation_error

# Dashboards follow the Pakistan calendar that owners and admins see.
PKT = timezone(timedelta(hours=5))
PKT_OFFSET = "+05:00"


@dataclass(frozen=True)
class PeriodWindow:
    start: datetime
    end: datetime
    previous_start: datetime
    previous_end: datetime
    days: list[str]


def _midnight(day: date) -> datetime:
    return datetime(day.year, day.month, day.day, tzinfo=PKT)


def resolve_period(period: str, anchor: Optional[str] = None) -> PeriodWindow:
    """Return the day, Monday-based week, or calendar month containing `anchor`.

    `anchor` is a YYYY-MM-DD date and defaults to today.
    """
    if anchor:
        try:
            day = datetime.strptime(anchor, "%Y-%m-%d").date()
        except ValueError:
            raise validation_error("anchor must be a date in YYYY-MM-DD format.")
    else:
        day = datetime.now(tz=PKT).date()

    if period in ("day", "today"):
        first, after, previous = day, day + timedelta(days=1), day - timedelta(days=1)
    elif period == "week":
        first = day - timedelta(days=day.weekday())
        after, previous = first + timedelta(days=7), first - timedelta(days=7)
    elif period == "month":
        first = day.replace(day=1)
        after = (first + timedelta(days=32)).replace(day=1)
        previous = (first - timedelta(days=1)).replace(day=1)
    else:
        raise validation_error("period must be one of: day, week, month")

    days = [(first + timedelta(days=i)).isoformat() for i in range((after - first).days)]
    return PeriodWindow(_midnight(first), _midnight(after), _midnight(previous), _midnight(first), days)
