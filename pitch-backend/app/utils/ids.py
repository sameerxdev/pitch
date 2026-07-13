from __future__ import annotations

from typing import Any, Optional

from bson import ObjectId
from bson.errors import InvalidId


def to_oid(value: Any) -> ObjectId:
    if isinstance(value, ObjectId):
        return value
    try:
        return ObjectId(str(value))
    except (InvalidId, TypeError) as exc:
        raise ValueError(f"Invalid ObjectId: {value!r}") from exc


def try_oid(value: Any) -> Optional[ObjectId]:
    try:
        return to_oid(value)
    except ValueError:
        return None


def stringify_id(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    out = dict(doc)
    if "_id" in out:
        out["id"] = str(out.pop("_id"))
    for k, v in list(out.items()):
        if isinstance(v, ObjectId):
            out[k] = str(v)
    return out
