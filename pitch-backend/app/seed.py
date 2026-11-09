"""Seed the Mongo database with a realistic dataset for end-to-end testing.

Run inside the API container:

    docker compose exec api python -m app.seed

Wipes the seeded collections (users, grounds, slots, manager_assignments,
bookings, payments, reviews) plus sessions/OTP state, then rebuilds ~90 days
of platform history relative to *now*: grounds across Lahore, Karachi,
Islamabad and Rawalpindi, their slot grids, bookings in every lifecycle state,
the payments behind them, and reviews with owner/manager replies.

Every active ground is guaranteed activity in the current day, week and month,
and each manager test account has a game in progress to close out. Re-seed on
the day you test: all of this is anchored to the moment the seed runs.

Every document mirrors what the live code paths write (booking_service,
payment_service, review_service, slot_service), so the data behaves exactly
like organically created records. Slot hours are Pakistan wall-clock time
(PKT, UTC+5) — that is what the app displays.

The randomness is seeded, so re-running produces the same shape of data.
"""
from __future__ import annotations

import asyncio
import logging
import math
import random
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId

from app.core.database import close_mongo, connect_mongo, get_db, to_geojson
from app.core.security import create_qr_token

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s | %(message)s")
logger = logging.getLogger("seed")

PKT = timezone(timedelta(hours=5))
HISTORY_DAYS = 90
FUTURE_DAYS = 14  # PLAYER_MAX_BOOKING_DAYS_AHEAD
HOLD_MINUTES = 10  # HOLD_DURATION_SECONDS / 60
NO_SHOW_GRACE_HOURS = 2  # no_show_service

WIPE_COLLECTIONS = [
    "users",
    "grounds",
    "slots",
    "manager_assignments",
    "bookings",
    "payments",
    "reviews",
    "refresh_tokens",
    "otp_codes",
    "otp_requests",
]

rng = random.Random(20260921)
NOW = datetime.now(tz=timezone.utc)
TODAY = NOW.astimezone(PKT).date()


def _at(day: date, hour: int, minute: int = 0) -> datetime:
    """PKT wall-clock time on `day` as an aware UTC datetime (hour may be 24)."""
    local = datetime(day.year, day.month, day.day, tzinfo=PKT) + timedelta(hours=hour, minutes=minute)
    return local.astimezone(timezone.utc)


def _between(start: datetime, end: datetime) -> datetime:
    if end <= start:
        return start
    return start + timedelta(seconds=rng.uniform(0, (end - start).total_seconds()))


def _advance(total: float, percent: int) -> float:
    # Same rounding as booking_service.calculate_advance.
    return float(math.ceil(total * percent / 100 / 10) * 10)


# ---- Reference data ---------------------------------------------------------

# Fixed logins, documented in pitch-mobile/README.md. Any OTP works while
# AUTH_BYPASS_OTP=true.
TEST_ACCOUNTS = [
    ("+923000000001", "Sana Malik", "admin", "Lahore"),
    ("+923000000002", "Ali Khan", "ground_owner", "Lahore"),
    ("+923000000003", "Bilal Ahmed", "manager", "Lahore"),
    ("+923000000004", "Hamza Sheikh", "manager", "Karachi"),
    ("+923000000005", "Usman Ali", "player", "Lahore"),
    ("+923000000006", "Hassan Raza", "player", "Lahore"),
    ("+923000000007", "Zain Iqbal", "player", "Karachi"),
    ("+923000000008", "Faisal Siddiqui", "ground_owner", "Karachi"),
    ("+923000000009", "Adeel Abbasi", "ground_owner", "Islamabad"),
    ("+923000000010", "Tariq Mahmood", "manager", "Islamabad"),
    ("+923000000011", "Asad Raja", "manager", "Rawalpindi"),
    ("+923000000012", "Mohsin Abbasi", "player", "Islamabad"),
    ("+923000000013", "Ehsan Malik", "player", "Rawalpindi"),
]
TEST_PLAYERS = ("+923000000005", "+923000000006", "+923000000007", "+923000000012", "+923000000013")
SUSPENDED_PHONE = "+923000000014"  # fixed so the blocked-login path can be tested

EXTRA_MANAGERS = [
    ("kashif", "Kashif Mehmood", "Lahore"),
    ("imran", "Imran Butt", "Lahore"),
    ("waqas", "Waqas Javed", "Lahore"),
    ("owais", "Owais Qureshi", "Karachi"),
    ("nadeem", "Nadeem Akhtar", "Islamabad"),
]

PLAYER_NAMES = {
    "Lahore": [
        "Ahmed Raza", "Saad Chaudhry", "Fahad Mirza", "Talha Aslam", "Umair Tariq",
        "Shoaib Anwar", "Haris Nadeem", "Ammar Yasin", "Daniyal Khalid", "Moiz Saleem",
        "Abdullah Farooq", "Shahzaib Akram", "Rehan Latif", "Junaid Ashraf", "Noman Rafiq",
        "Arslan Haider", "Waleed Zafar", "Hamid Sultan", "Mubashir Hussain", "Taimoor Baig",
    ],
    "Karachi": [
        "Kamran Ansari", "Sufyan Memon", "Aamir Baloch", "Yasir Hashmi", "Farhan Zaidi",
        "Adnan Rizvi", "Shahid Qureshi", "Babar Jamali", "Salman Lakhani", "Irfan Soomro",
        "Muneeb Ahmed", "Zeeshan Kazmi", "Omer Farooqui", "Hasnain Abidi", "Faraz Naqvi",
    ],
    "Islamabad": [
        "Hammad Gillani", "Usama Awan", "Zohaib Janjua", "Raheel Satti", "Bilal Kiyani",
        "Waqar Minhas", "Anas Durrani", "Shayan Afridi", "Hashir Khattak",
    ],
    "Rawalpindi": [
        "Qasim Raja", "Sohaib Bhatti", "Azhar Mughal", "Nabeel Dar", "Faizan Qazi",
        "Umar Niazi", "Jawad Kayani", "Saqib Chattha",
    ],
}
# (name, city, days since signup): new accounts for the admin users list.
RECENT_SIGNUPS = [
    ("Tayyab Shafiq", "Lahore", 0),
    ("Sarmad Iqbal", "Lahore", 2),
    ("Ali Hasnain", "Karachi", 1),
    ("Hussain Bukhari", "Karachi", 5),
    ("Ibrahim Swati", "Islamabad", 3),
    ("Wahab Rathore", "Rawalpindi", 4),
]
SUSPENDED_PLAYER = "Hamid Sultan"  # repeat no-shows
DELETED_PLAYER = "Faraz Naqvi"  # closed their account

# Jazz, Zong, Warid, Ufone, Telenor mobile prefixes.
MOBILE_PREFIXES = [
    "300", "301", "302", "303", "304", "305", "306", "307", "308", "309",
    "310", "311", "312", "313", "314", "315", "316", "320", "321", "322", "323",
    "330", "331", "332", "333", "334", "335", "336", "340", "341", "342", "343", "344", "345", "346", "347",
]

PHOTOS = [
    "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=1200",
    "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?w=1200",
    "https://images.unsplash.com/photo-1593766788306-28561086694e?w=1200",
    "https://images.unsplash.com/photo-1607734834519-d8576ae60ea6?w=1200",
]

# (start_hour, end_hour). Night rate applies from 18:00, when floodlights go on.
TEMPLATE_2H = [(8, 10), (10, 12), (14, 16), (16, 18), (18, 20), (20, 22), (22, 24)]
TEMPLATE_3H = [(7, 10), (15, 18), (18, 21), (21, 24)]
TEMPLATE_NIGHT = [(16, 18), (18, 20), (20, 22), (22, 24)]

ALL_FACILITIES = ["Washrooms", "Floodlights", "Parking", "Cafeteria", "Bats"]


@dataclass
class GroundSpec:
    key: str
    owner: str  # owner phone
    name: str
    city: str
    area: str
    address: str
    lat: float
    lng: float
    day_rate: float
    night_rate: float
    advance: int
    facilities: list[str]
    template: list[tuple[int, int]]
    listed_days_ago: int
    status: str = "active"
    popularity: float = 1.0  # booking-demand multiplier
    quality: float = 4.0  # mean review score
    managers: list[str] = field(default_factory=list)
    suspended_days_ago: Optional[int] = None
    status_reason: Optional[str] = None


GROUNDS = [
    GroundSpec(
        "champions", "+923000000002", "Champions Cricket Ground", "Lahore", "DHA Phase 5",
        "Plot 23, Sector C, DHA Phase 5, Lahore", 31.4630, 74.4090,
        3000, 4500, 25, ALL_FACILITIES, TEMPLATE_2H, 150,
        popularity=1.15, quality=4.5, managers=["+923000000003", "kashif"],
    ),
    GroundSpec(
        "johar", "+923000000002", "Johar Town Cricket Arena", "Lahore", "Johar Town Block R",
        "Main Boulevard, Block R-1, Johar Town, Lahore", 31.4675, 74.2665,
        2500, 4000, 20, ["Washrooms", "Floodlights", "Parking", "Bats"], TEMPLATE_3H, 120,
        popularity=0.95, quality=4.1, managers=["imran", "+923000000003"],  # Bilal runs two grounds
    ),
    GroundSpec(
        "bahria_lhr", "+923000000002", "Bahria Night Cricket Club", "Lahore", "Bahria Town Sector C",
        "Street 12, Sector C, Bahria Town, Lahore", 31.3700, 74.1850,
        2200, 3800, 30, ["Washrooms", "Floodlights", "Parking", "Cafeteria"], TEMPLATE_NIGHT, 45,
        popularity=0.8, quality=3.9, managers=["waqas", "+923214400917"],  # second is a pending invite
    ),
    GroundSpec(
        "model_town", "+923000000002", "Model Town Turf Club", "Lahore", "Model Town Block B",
        "Link Road, Block B, Model Town, Lahore", 31.4805, 74.3239,
        2400, 3600, 25, ["Washrooms", "Floodlights", "Parking"], TEMPLATE_2H, 3,
        status="pending_verification",
    ),
    GroundSpec(
        "seaview", "+923000000008", "Seaview Sports Arena", "Karachi", "Clifton Block 2",
        "Plot 7, Block 2, Clifton, Karachi", 24.8210, 67.0300,
        3500, 5500, 20, ALL_FACILITIES, TEMPLATE_2H, 140,
        popularity=1.1, quality=4.3, managers=["+923000000004"],
    ),
    GroundSpec(
        "gulshan", "+923000000008", "Gulshan Cricket Dome", "Karachi", "Gulshan-e-Iqbal Block 13-D",
        "University Road, Block 13-D, Gulshan-e-Iqbal, Karachi", 24.9170, 67.0960,
        2800, 4200, 25, ["Washrooms", "Floodlights", "Parking"], TEMPLATE_3H, 100,
        popularity=1.0, quality=3.7, managers=["owais"],
    ),
    GroundSpec(
        "capital", "+923000000009", "Capital Cricket Arena", "Islamabad", "Sector G-11/3",
        "Street 45, G-11/3, Islamabad", 33.6690, 72.9950,
        3000, 4800, 25, ALL_FACILITIES, TEMPLATE_2H, 110,
        popularity=0.9, quality=4.6, managers=["+923000000010"],
    ),
    GroundSpec(
        "margalla", "+923000000009", "Margalla View Sports Club", "Islamabad", "Sector E-11/2",
        "Service Road North, E-11/2, Islamabad", 33.6975, 72.9790,
        2600, 4000, 20, ["Washrooms", "Floodlights", "Parking"], TEMPLATE_3H, 90,
        status="suspended", popularity=0.55, quality=2.4, managers=["nadeem"],
        suspended_days_ago=12,
        status_reason=(
            "Suspended after repeated player complaints: floodlights failing during "
            "booked night slots and advances not honoured. Reinstatement pending site inspection."
        ),
    ),
    GroundSpec(
        "pindi_stars", "+923000000009", "Pindi Stars Cricket Ground", "Rawalpindi", "Bahria Town Phase 7",
        "Sector B, Bahria Town Phase 7, Rawalpindi", 33.5265, 73.0935,
        2400, 3800, 25, ["Washrooms", "Floodlights", "Parking", "Bats"], TEMPLATE_2H, 75,
        popularity=0.85, quality=4.2, managers=["+923000000011"],
    ),
    GroundSpec(
        "satellite", "+923000000009", "Satellite Town Cricket Ground", "Rawalpindi", "Satellite Town Block D",
        "Murree Road, Block D, Satellite Town, Rawalpindi", 33.6385, 73.0725,
        2000, 3200, 20, ["Washrooms", "Floodlights"], TEMPLATE_3H, 6,
        status="pending_verification",
    ),
]

SPECS = {s.key: s for s in GROUNDS}

REVIEW_TEXTS = {
    5: [
        "Excellent ground, outfield was smooth and the floodlights were bright enough for hard ball. Will book again.",
        "Best night cricket spot in the area. Pitch was well rolled and stumps and boundary ropes were ready when we arrived.",
        "Zabardast experience! Ground bilkul saaf tha aur lights ekdum perfect thi.",
        "Booked for our office T10 league — everything on time and the manager was very cooperative.",
        "Great value for money. Parking was easy even on a Saturday night.",
        "Pitch has proper bounce, feels like a real cricket ground. Highly recommended.",
        "Handover was on time and the scoreboard app worked. Top class.",
    ],
    4: [
        "Good ground overall. Outfield a bit patchy near the boundary but the lights were good.",
        "Achi ground hai, bas washrooms thore aur saaf ho sakte hain.",
        "Nice setup and on-time handover. Slightly pricey for night slots.",
        "Pitch was fine and the staff were helpful. Cafeteria closes too early though.",
        "Solid ground for tape ball. Would give 5 if the parking was bigger.",
        "Lights and pitch both good. Took a while to find the entrance the first time.",
    ],
    3: [
        "Average. Lights on one side were dim so fielding at deep square leg was tough.",
        "Ground theek hai lekin pichli team late nikli, humara 15 minute time waste hua.",
        "Okay for the price. Outfield needs mowing and there was no drinking water.",
        "Decent pitch but the washrooms were not usable.",
    ],
    2: [
        "Floodlights went off twice during our match. Manager said it was a generator issue.",
        "Outfield full of stones, one of our players got hurt diving. Needs maintenance.",
        "Overpriced for what you get. No sight screen and the mat was torn.",
    ],
    1: [
        "Paid the advance but when we reached another team was already playing. Very bad management.",
        "Lights nahi chal rahi thi aur koi refund nahi mila. Not recommended.",
    ],
}

REPLIES_POSITIVE = [
    "Thank you for playing with us! See you on the ground again.",
    "Shukriya! Glad your team enjoyed the night slot.",
    "Thanks for the kind words — we just re-rolled the pitch, come try it out.",
    "Thanks! Weekend night slots fill fast, book early next time.",
]
REPLIES_NEGATIVE = [
    "Sorry about the lights — the generator has been serviced and a backup has been installed.",
    "Thanks for the feedback. The outfield is now mowed twice a week.",
    "Apologies for the late handover. We now keep a 10-minute buffer between slots.",
    "We're sorry to hear this. Please message us on WhatsApp so we can make it right.",
]


# ---- Builders ---------------------------------------------------------------


@dataclass
class Player:
    doc: dict
    city: str
    weight: float
    active_from: datetime
    active_until: datetime
    no_show_rate: float = 0.03
    review_rate: float = 0.3
    favorites: list[str] = field(default_factory=list)


def _phone(used: set[str]) -> str:
    while True:
        phone = f"+92{rng.choice(MOBILE_PREFIXES)}{rng.randint(0, 9_999_999):07d}"
        if phone not in used:
            used.add(phone)
            return phone


def _user(phone: str, name: Optional[str], role: str, city: Optional[str], created_at: datetime) -> dict:
    return {
        "_id": ObjectId(),
        "phone": phone,
        "full_name": name,
        "role": role,
        "city": city,
        "is_verified": True,
        "fcm_token": None,
        "created_at": created_at,
    }


def build_users() -> tuple[dict[str, dict], dict[str, dict], list[Player]]:
    """Return (users by phone, extra managers by key, players)."""
    used = {phone for phone, *_ in TEST_ACCOUNTS} | {"+923214400917", SUSPENDED_PHONE}
    by_phone: dict[str, dict] = {}
    for phone, name, role, city in TEST_ACCOUNTS:
        joined = NOW - timedelta(days=rng.randint(125, 170), hours=rng.randint(0, 23))
        by_phone[phone] = _user(phone, name, role, city, joined)
    # The admin was on the platform before anyone else.
    by_phone["+923000000001"]["created_at"] = NOW - timedelta(days=185)

    managers: dict[str, dict] = {}
    for key, name, city in EXTRA_MANAGERS:
        joined = NOW - timedelta(days=rng.randint(40, 150))
        managers[key] = _user(_phone(used), name, "manager", city, joined)

    # Former Gulshan manager, removed by the owner and demoted back to player.
    rizwan = _user(_phone(used), "Rizwan Shah", "player", "Karachi", NOW - timedelta(days=96))
    managers["rizwan"] = rizwan

    players: list[Player] = []
    for city, names in PLAYER_NAMES.items():
        for name in names:
            # Most joined over the last four months; a handful in the last fortnight.
            days_ago = rng.randint(3, 14) if rng.random() < 0.15 else rng.randint(20, 125)
            joined = NOW - timedelta(days=days_ago, hours=rng.randint(0, 23))
            doc = _user(_phone(used), name, "player", city, joined)
            players.append(
                Player(doc, city, min(rng.paretovariate(1.4), 8.0), joined, NOW,
                       review_rate=rng.uniform(0.15, 0.5))
            )

    # Two people who verified their number but never finished profile setup.
    for city_days in (4, 9):
        doc = _user(_phone(used), None, "player", None, NOW - timedelta(days=city_days))
        by_phone[doc["phone"]] = doc

    for name, city, days_ago in RECENT_SIGNUPS:
        joined = NOW - timedelta(days=days_ago, minutes=rng.randint(30, 300))
        players.append(Player(_user(_phone(used), name, "player", city, joined), city, 1.0, joined, NOW))

    # The test players are regulars with plenty of history.
    for phone in TEST_PLAYERS:
        doc = by_phone[phone]
        players.append(Player(doc, doc["city"], 6.0, doc["created_at"], NOW, review_rate=0.6))
    players.append(Player(rizwan, "Karachi", 1.0, NOW - timedelta(days=38), NOW))

    for p in players:
        name = p.doc["full_name"]
        if name == SUSPENDED_PLAYER:
            p.no_show_rate = 0.45
            p.weight = 3.0
            p.active_until = NOW - timedelta(days=6)
            p.doc["is_suspended"] = True
            p.doc["phone"] = SUSPENDED_PHONE
            p.doc["updated_at"] = p.active_until
        elif name == DELETED_PLAYER:
            p.active_until = NOW - timedelta(days=10)
            p.doc.update({"deleted_at": p.active_until, "is_verified": False})

    return by_phone, managers, players


def build_grounds(users: dict[str, dict]) -> dict[str, dict]:
    grounds: dict[str, dict] = {}
    for i, spec in enumerate(GROUNDS):
        listed = NOW - timedelta(days=spec.listed_days_ago, hours=rng.randint(1, 10))
        doc = {
            "_id": ObjectId(),
            "owner_id": users[spec.owner]["_id"],
            "name": spec.name,
            "city": spec.city,
            "area": spec.area,
            "address": spec.address,
            "latitude": spec.lat,
            "longitude": spec.lng,
            "location": to_geojson(spec.lng, spec.lat),
            "hourly_rate_day": float(spec.day_rate),
            "hourly_rate_night": float(spec.night_rate),
            "advance_percent": spec.advance,
            "facilities": spec.facilities,
            "photos": [PHOTOS[i % len(PHOTOS)], PHOTOS[(i + 1) % len(PHOTOS)]],
            "status": spec.status,
            "avg_rating": 0.0,
            "review_count": 0,
            "created_at": listed,
            "updated_at": listed,
        }
        if spec.status in ("active", "suspended"):
            # Admin verification typically lands a day or two after listing.
            doc["verified_at"] = listed + timedelta(days=rng.uniform(0.5, 2.5))
            doc["rejection_reason"] = None
        if spec.status == "suspended":
            doc["rejection_reason"] = spec.status_reason
            doc["updated_at"] = NOW - timedelta(days=spec.suspended_days_ago)
        grounds[spec.key] = doc
        owner = users[spec.owner]
        if owner["created_at"] > listed - timedelta(days=1):
            owner["created_at"] = listed - timedelta(days=rng.uniform(1, 6))
    return grounds


def build_assignments(grounds: dict[str, dict], users: dict[str, dict], managers: dict[str, dict]) -> list[dict]:
    docs = []
    for spec in GROUNDS:
        ground = grounds[spec.key]
        for ref in spec.managers:
            user = users.get(ref) or managers.get(ref)
            assigned = ground.get("verified_at", ground["created_at"]) + timedelta(hours=rng.randint(2, 30))
            docs.append({
                "_id": ObjectId(),
                "ground_id": ground["_id"],
                # A phone with no account yet is an invite waiting on signup.
                "manager_id": user["_id"] if user else None,
                "manager_phone": user["phone"] if user else ref,
                "is_active": True,
                "assigned_at": assigned,
                "created_at": assigned,
            })
            if user and user["created_at"] > assigned:
                user["created_at"] = assigned - timedelta(days=rng.randint(1, 20))
    rizwan = managers["rizwan"]
    gulshan = grounds["gulshan"]
    assigned = gulshan["verified_at"] + timedelta(hours=5)
    docs.append({
        "_id": ObjectId(),
        "ground_id": gulshan["_id"],
        "manager_id": rizwan["_id"],
        "manager_phone": rizwan["phone"],
        "is_active": False,
        "assigned_at": assigned,
        "created_at": assigned,
        "removed_at": NOW - timedelta(days=38),
    })
    return docs


def _slot_window(spec: GroundSpec, ground: dict) -> tuple[date, date]:
    first = max(TODAY - timedelta(days=HISTORY_DAYS), ground["created_at"].astimezone(PKT).date())
    last = TODAY + timedelta(days=FUTURE_DAYS - 1)
    if spec.suspended_days_ago is not None:
        last = TODAY - timedelta(days=spec.suspended_days_ago + 1)
    return first, last


def build_slots(grounds: dict[str, dict]) -> dict[tuple, dict]:
    """Slot grid per ground, keyed by (ground_key, date, start_hour)."""
    slots: dict[tuple, dict] = {}
    for spec in GROUNDS:
        ground = grounds[spec.key]
        first, last = _slot_window(spec, ground)
        day = first
        while day <= last:
            for start, end in spec.template:
                rate_type = "night" if start >= 18 else "day"
                rate = spec.night_rate if rate_type == "night" else spec.day_rate
                created = min(ground["created_at"] + timedelta(hours=3), _at(day, 0))
                slots[(spec.key, day, start)] = {
                    "_id": ObjectId(),
                    "ground_id": ground["_id"],
                    "date": day.isoformat(),
                    "start_hour": start,
                    "end_hour": end,
                    "rate_type": rate_type,
                    "price": float((end - start) * rate),
                    "status": "available",
                    "hold_expires_at": None,
                    "created_at": created,
                    "updated_at": created,
                }
            day += timedelta(days=1)
    return slots


# ---- Bookings ---------------------------------------------------------------


class Ledger:
    """Accumulates bookings/payments and keeps players from double-booking."""

    def __init__(self, grounds: dict[str, dict], slots: dict[tuple, dict]):
        self.grounds = grounds
        self.slots = slots
        self.bookings: list[dict] = []
        self.payments: list[dict] = []
        self.busy: dict[ObjectId, list[tuple[date, int, int]]] = {}

    def player_free(self, player: dict, day: date, start: int, end: int) -> bool:
        return all(
            d != day or end <= s or start >= e for d, s, e in self.busy.get(player["_id"], [])
        )

    def _payment(self, booking: dict, *, status: str, at: datetime, method: Optional[str] = None) -> dict:
        method = method or ("jazzcash" if rng.random() < 0.55 else "easypaisa")
        paid = status in ("completed", "refunded")
        txn = None
        if paid:
            txn = (
                "T" + at.astimezone(PKT).strftime("%Y%m%d%H%M%S") + f"{rng.randint(0, 99):02d}"
                if method == "jazzcash"
                else str(rng.randint(10**10, 10**11 - 1))
            )
        doc = {
            "_id": ObjectId(),
            "booking_id": booking["_id"],
            "player_id": booking["player_id"],
            "amount": booking["advance_amount"],
            "method": method,
            "status": status,
            "gateway_txn_id": txn,
            "paid_at": at if paid else None,
            "refunded_at": None,
            "created_at": at - timedelta(seconds=rng.randint(20, 150)),
            "updated_at": at,
        }
        self.payments.append(doc)
        return doc

    def book(self, key: tuple, player: dict, created_at: datetime, outcome: str) -> dict:
        """Create a booking on slot `key` and play it forward to `outcome`.

        Outcomes: confirmed, arrived, completed, no_show, cancelled (by the
        player, after paying), hold_expired (never paid).
        """
        ground_key, day, start = key
        slot = self.slots[key]
        ground = self.grounds[ground_key]
        end = slot["end_hour"]
        slot_start, slot_end = _at(day, start), _at(day, end)
        total = slot["price"]
        booking = {
            "_id": ObjectId(),
            "slot_id": slot["_id"],
            "player_id": player["_id"],
            "player_name": player.get("full_name"),
            "player_phone": player.get("phone"),
            "ground_id": ground["_id"],
            "ground_name": ground["name"],
            "ground_area": ground["area"],
            "slot_date": day.isoformat(),
            "start_hour": start,
            "end_hour": end,
            "status": "on_hold",
            "total_price": total,
            "advance_amount": _advance(total, ground["advance_percent"]),
            "qr_code": None,
            "qr_token": None,
            "arrived_at": None,
            "completion_payment_method": None,
            "remainder_collected": 0.0,
            "review_submitted": False,
            "cancelled_at": None,
            "cancellation_reason": None,
            "hold_expires_at": created_at + timedelta(minutes=HOLD_MINUTES),
            "created_at": created_at,
            "updated_at": created_at,
        }
        self.bookings.append(booking)

        if outcome == "hold_expired":
            if rng.random() < 0.5:  # tried to pay, wallet declined
                self._payment(booking, status="failed", at=created_at + timedelta(minutes=rng.uniform(2, 8)))
            expired = booking["hold_expires_at"] + timedelta(seconds=rng.randint(5, 60))
            booking.update(status="cancelled", cancelled_at=expired,
                           cancellation_reason="Hold expired", updated_at=expired)
            return booking

        # Paid within the hold window; occasionally after a failed first attempt.
        paid_at = created_at + timedelta(minutes=rng.uniform(1, 7))
        if rng.random() < 0.06:
            self._payment(booking, status="failed", at=created_at + timedelta(minutes=rng.uniform(0.5, 2)))
        payment = self._payment(booking, status="completed", at=paid_at)
        qr = create_qr_token(str(booking["_id"]), str(ground["_id"]))
        booking.update(status="confirmed", qr_code=qr, qr_token=qr, hold_expires_at=None, updated_at=paid_at)
        slot.update(status="booked", updated_at=paid_at)
        self.busy.setdefault(player["_id"], []).append((day, start, end))

        latest = min(slot_start - timedelta(hours=2), NOW - timedelta(minutes=5))
        if outcome == "cancelled" and latest <= paid_at + timedelta(minutes=2):
            outcome = "confirmed"  # no room to cancel before the cutoff
        if outcome == "cancelled":
            cancelled = min(_between(paid_at + timedelta(minutes=30), latest), latest)
            booking.update(status="cancelled", cancelled_at=cancelled,
                           cancellation_reason="Cancelled by player", updated_at=cancelled)
            payment.update(status="refunded", refunded_at=cancelled, updated_at=cancelled)
            slot.update(status="available", updated_at=cancelled)
            self.busy[player["_id"]].remove((day, start, end))
        elif outcome == "arrived":
            arrived = min(slot_start + timedelta(minutes=rng.randint(-10, 10)), NOW - timedelta(minutes=1))
            booking.update(status="arrived", arrived_at=arrived, updated_at=arrived)
        elif outcome == "completed":
            arrived = slot_start + timedelta(minutes=rng.randint(-12, 18))
            remainder = total - booking["advance_amount"]
            if rng.random() < 0.12:  # the usual end-of-match haggle
                remainder = max(0.0, remainder - rng.choice([200, 300, 500]))
            done = min(slot_end + timedelta(minutes=rng.randint(0, 25)), NOW - timedelta(minutes=1))
            booking.update(
                status="completed",
                arrived_at=arrived,
                completion_payment_method="cash" if rng.random() < 0.72 else "bank_transfer",
                remainder_collected=float(remainder),
                updated_at=done,
            )
        elif outcome == "no_show":
            # Written off by the hold_expiry_loop job after the grace window.
            flipped = slot_end + timedelta(hours=NO_SHOW_GRACE_HOURS, seconds=rng.randint(10, 60))
            booking.update(status="no_show", updated_at=flipped)
        return booking


def _demand(spec: GroundSpec, day: date, start: int) -> float:
    """Probability that a slot gets booked (before lead-time effects)."""
    if start >= 20:
        base = 0.62
    elif start >= 18:
        base = 0.55
    elif start >= 15:
        base = 0.30
    elif start >= 10:
        base = 0.07  # midday heat
    else:
        base = 0.16  # early-morning games before it heats up
    weekday = day.weekday()
    if weekday >= 5:  # weekend
        base *= 1.4
    elif weekday == 4 and 12 <= start < 16:  # Friday Jumma
        base *= 0.4
    age = (TODAY - day).days
    if age > 30:  # the platform is growing
        base *= 0.85
    elif 0 <= age <= 7:
        base *= 1.3
    elif age > 0:
        base *= 1.15
    return min(base * spec.popularity, 0.95)


def _future_factor(days_ahead: int) -> float:
    if days_ahead <= 0:
        return 0.95
    if days_ahead == 1:
        return 0.8
    if days_ahead == 2:
        return 0.65
    if days_ahead <= 6:
        return 0.45
    return 0.15


def _pick_player(players: list[Player], spec: GroundSpec, ledger: Ledger, day: date,
                 start: int, end: int, created_at: datetime) -> Optional[Player]:
    pool = [
        p for p in players
        if p.city == spec.city
        and p.active_from < created_at < p.active_until
        and ledger.player_free(p.doc, day, start, end)
    ]
    if not pool:
        return None
    weights = [p.weight * (3.0 if spec.key in p.favorites else 1.0) for p in pool]
    return rng.choices(pool, weights=weights, k=1)[0]


def _lead_time(slot_start: datetime) -> datetime:
    r = rng.random()
    if r < 0.4:
        lead = timedelta(hours=rng.uniform(1, 9))  # same day
    elif r < 0.75:
        lead = timedelta(days=rng.uniform(1, 3))
    else:
        lead = timedelta(days=rng.uniform(4, 10))
    return slot_start - lead


def build_bookings(ledger: Ledger, grounds: dict[str, dict], players: list[Player], reserved: set[tuple]) -> None:
    for p in players:
        home = [s.key for s in GROUNDS if s.city == p.city and s.status == "active"]
        p.favorites = rng.sample(home, k=min(len(home), rng.choice([1, 1, 2])))

    for spec in GROUNDS:
        if spec.status not in ("active", "suspended"):
            continue
        ground = grounds[spec.key]
        opened = ground["verified_at"]
        for (gkey, day, start), slot in sorted(ledger.slots.items(), key=lambda kv: (kv[0][1], kv[0][2])):
            if gkey != spec.key or (gkey, day, start) in reserved:
                continue
            end = slot["end_hour"]
            slot_start, slot_end = _at(day, start), _at(day, end)
            days_ahead = (day - TODAY).days
            p = _demand(spec, day, start)
            if slot_start > NOW:
                p *= _future_factor(days_ahead)
            if rng.random() >= p:
                continue

            # Up to two attempts: a cancelled booking frees the slot for someone else.
            earliest = max(opened, slot_start - timedelta(days=FUTURE_DAYS))
            for attempt in range(2):
                created = _lead_time(slot_start)
                if slot_start > NOW:
                    created = _between(max(earliest, NOW - timedelta(days=6)), NOW - timedelta(minutes=20))
                created = max(created, earliest)
                if created >= min(slot_start, NOW):
                    break
                player = _pick_player(players, spec, ledger, day, start, end, created)
                if player is None:
                    break

                r = rng.random()
                if slot_end <= NOW:
                    if r < 0.04:
                        outcome = "hold_expired"
                    elif r < 0.10 and slot_start - created > timedelta(hours=4):
                        outcome = "cancelled"
                    elif (r < 0.10 + player.no_show_rate
                          and NOW - slot_end > timedelta(hours=NO_SHOW_GRACE_HOURS)):
                        outcome = "no_show"
                    else:
                        outcome = "completed"
                elif slot_start <= NOW:
                    outcome = "arrived"
                else:
                    outcome = "cancelled" if r < 0.05 and slot_start - NOW > timedelta(hours=4) else "confirmed"

                booking = ledger.book((gkey, day, start), player.doc, created, outcome)
                if booking["status"] != "cancelled" or attempt == 1 or rng.random() > 0.35:
                    break
                earliest = booking["cancelled_at"] + timedelta(minutes=5)


def _live_slot(ledger: Ledger, spec: GroundSpec) -> tuple:
    """Key of a slot in progress right now, adding an off-grid one if the template has a gap."""
    hour = NOW.astimezone(PKT).hour
    for start, end in spec.template:
        if start <= hour < end:
            return (spec.key, TODAY, start)
    end = min([hour + 2] + [s for s, _ in spec.template if s > hour])
    rate_type = "night" if hour >= 18 or hour < 6 else "day"
    rate = spec.night_rate if rate_type == "night" else spec.day_rate
    created = NOW - timedelta(days=1)
    key = (spec.key, TODAY, hour)
    ledger.slots[key] = {
        "_id": ObjectId(),
        "ground_id": ledger.grounds[spec.key]["_id"],
        "date": TODAY.isoformat(),
        "start_hour": hour,
        "end_hour": end,
        "rate_type": rate_type,
        "price": float((end - hour) * rate),
        "status": "available",
        "hold_expires_at": None,
        "created_at": created,
        "updated_at": created,
    }
    return key


def build_current_activity(ledger: Ledger, players: list[Player], reserved: set[tuple]) -> None:
    """Guarantee every active ground appears on the Today views.

    Analytics count bookings by `created_at` in UTC, while manager lists and
    the player app go by `slot_date`, so this covers both: games booked and
    played since UTC midnight, and bookings made today for the next slots.
    """
    utc_midnight = NOW.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow = TODAY + timedelta(days=1)

    def book(key: tuple, created: datetime, outcome: str) -> None:
        slot = ledger.slots[key]
        player = _pick_player(players, SPECS[key[0]], ledger, key[1], key[2], slot["end_hour"], created)
        if player:
            reserved.add(key)
            ledger.book(key, player.doc, created, outcome)

    for spec in GROUNDS:
        if spec.status != "active":
            continue
        open_slots = sorted(
            ((k, s) for k, s in ledger.slots.items()
             if k[0] == spec.key and k not in reserved and s["status"] == "available"),
            key=lambda kv: (kv[0][1], kv[0][2]),
        )
        played = [k for k, s in open_slots
                  if _at(k[1], k[2]) >= utc_midnight + timedelta(hours=1) and _at(k[1], s["end_hour"]) <= NOW]
        for key in played[-2:]:
            book(key, _between(utc_midnight, _at(key[1], key[2]) - timedelta(minutes=30)), "completed")

        upcoming = [k for k, _ in open_slots if _at(k[1], k[2]) > NOW + timedelta(minutes=45)]
        evening_first = [k for k in upcoming if k[1] == TODAY][-3:] + [k for k in upcoming if k[1] == tomorrow][-2:]
        for key in evening_first:
            book(key, _between(utc_midnight, NOW - timedelta(minutes=10)), "confirmed")


def build_test_fixtures(ledger: Ledger, users: dict[str, dict]) -> set[tuple]:
    """Deterministic bookings the test accounts can exercise straight away."""
    usman, hassan, zain = (users[p] for p in ("+923000000005", "+923000000006", "+923000000007"))
    reserved: set[tuple] = set()

    def book(key: tuple, player: dict, created: datetime, outcome: str) -> dict:
        reserved.add(key)
        return ledger.book(key, player, created, outcome)

    yesterday, tomorrow = TODAY - timedelta(days=1), TODAY + timedelta(days=1)

    # Usman: played last night and hasn't reviewed yet -> review flow.
    book(("champions", yesterday, 20), usman, _at(yesterday, 11, 40), "completed")
    # Usman: game tomorrow night -> QR ticket on the player side.
    book(("champions", tomorrow, 20), usman, NOW - timedelta(hours=5), "confirmed")

    # Hassan: the next Champions slot tonight (or tomorrow if it's late)
    # -> manager Bilal sees it on today's list and can check him in.
    next_start = next((s for s, _ in TEMPLATE_2H if _at(TODAY, s) > NOW + timedelta(minutes=45)), None)
    if next_start is not None:
        book(("champions", TODAY, next_start), hassan, NOW - timedelta(hours=3), "confirmed")
    else:
        book(("champions", tomorrow, 18), hassan, NOW - timedelta(hours=3), "confirmed")
    # Hassan: cancelled a Johar Town booking -> refunded payment in history.
    in_three = TODAY + timedelta(days=3)
    book(("johar", in_three, 18), hassan, NOW - timedelta(days=2), "cancelled")

    # Zain: a completed game at Seaview last week, and one coming up.
    book(("seaview", TODAY - timedelta(days=5), 20), zain, _at(TODAY - timedelta(days=6), 19), "completed")
    book(("seaview", TODAY + timedelta(days=2), 18), zain, NOW - timedelta(hours=26), "confirmed")

    mohsin, ehsan = users["+923000000012"], users["+923000000013"]

    def played(ground: str, days_ago: int, start: int, player: dict, outcome: str = "completed") -> None:
        day = TODAY - timedelta(days=days_ago)
        book((ground, day, start), player, _at(day - timedelta(days=1), 19), outcome)

    def upcoming(ground: str, days_ahead: int, start: int, player: dict) -> None:
        book((ground, TODAY + timedelta(days=days_ahead), start), player, NOW - timedelta(hours=8), "confirmed")

    # A spread of grounds and outcomes across this week and month per player.
    played("johar", 3, 18, usman)
    played("champions", 12, 18, usman)
    played("champions", 8, 22, usman, "no_show")
    played("johar", 2, 15, usman, "hold_expired")
    upcoming("bahria_lhr", 4, 20, usman)

    played("johar", 1, 21, hassan)
    played("champions", 9, 20, hassan, "no_show")
    upcoming("johar", 1, 21, hassan)

    played("gulshan", 2, 21, zain)
    upcoming("gulshan", 1, 18, zain)

    played("capital", 1, 20, mohsin)
    played("capital", 6, 18, mohsin)
    upcoming("capital", 1, 20, mohsin)

    played("pindi_stars", 2, 20, ehsan)
    upcoming("pindi_stars", 1, 18, ehsan)

    # A game in progress on each manager account's ground -> "complete booking" flow.
    for ground, player in (("champions", usman), ("seaview", zain), ("capital", mohsin), ("pindi_stars", ehsan)):
        key = _live_slot(ledger, SPECS[ground])
        book(key, player, _at(TODAY, key[2]) - timedelta(hours=4), "arrived")
    return reserved


def block_maintenance(slots: dict[tuple, dict]) -> int:
    """Owners blocking morning slots for pitch work on a couple of upcoming days."""
    blocked = 0
    for spec in GROUNDS:
        if spec.status != "active":
            continue
        for offset in rng.sample(range(2, FUTURE_DAYS), k=rng.randint(1, 2)):
            day = TODAY + timedelta(days=offset)
            for start, _ in spec.template:
                slot = slots.get((spec.key, day, start))
                if start < 12 and slot and slot["status"] == "available":
                    slot.update(status="blocked", updated_at=NOW - timedelta(days=rng.uniform(0.5, 3)))
                    blocked += 1
    return blocked


# ---- Reviews ----------------------------------------------------------------


def _rating(mean: float) -> int:
    return max(1, min(5, round(rng.gauss(mean, 0.8))))


def _sub(overall: int) -> Optional[int]:
    if rng.random() < 0.12:  # skipped in the form
        return None
    return max(1, min(5, overall + rng.choice([-1, 0, 0, 0, 1])))


def _review(booking: dict, rating: int, created: datetime, *, text: Optional[str], visible: bool = True) -> dict:
    return {
        "_id": ObjectId(),
        "booking_id": booking["_id"],
        "ground_id": booking["ground_id"],
        "player_id": booking["player_id"],
        "player_name": booking.get("player_name") or "Player",
        "overall_rating": rating,
        "rating_pitch": _sub(rating),
        "rating_cleanliness": _sub(rating),
        "rating_value": _sub(rating),
        "rating_manager": _sub(rating),
        "review_text": text,
        "photos": [],
        "is_visible": visible,
        "manager_reply": None,
        "manager_reply_at": None,
        "created_at": created,
        "updated_at": created,
    }


def build_reviews(ledger: Ledger, players: list[Player], users: dict[str, dict]) -> list[dict]:
    quality = {ledger.grounds[s.key]["_id"]: s.quality for s in GROUNDS}
    review_rate = {p.doc["_id"]: p.review_rate for p in players}
    usman_id = users["+923000000005"]["_id"]
    yesterday = (TODAY - timedelta(days=1)).isoformat()

    reviews = []
    candidates = []
    for b in ledger.bookings:
        if b["status"] != "completed":
            continue
        if b["player_id"] == usman_id and b["slot_date"] == yesterday:
            continue  # left open for the review-flow test
        candidates.append(b)

    for b in candidates:
        if rng.random() >= review_rate.get(b["player_id"], 0.3):
            continue
        slot_end = _at(date.fromisoformat(b["slot_date"]), b["end_hour"])
        created = slot_end + timedelta(hours=rng.uniform(1, 40))
        if created >= NOW:
            continue
        rating = _rating(quality[b["ground_id"]])
        text = rng.choice(REVIEW_TEXTS[rating]) if rng.random() < 0.72 else None
        review = _review(b, rating, created, text=text)
        if rng.random() < (0.8 if rating <= 3 else 0.5):
            replied = created + timedelta(hours=rng.uniform(2, 36))
            if replied < NOW:
                pool = REPLIES_NEGATIVE if rating <= 3 else REPLIES_POSITIVE
                review.update(manager_reply=rng.choice(pool), manager_reply_at=replied, updated_at=replied)
        b["review_submitted"] = True
        reviews.append(review)

    reviewed = {r["booking_id"] for r in reviews}

    # A review from this week on every active ground, still waiting on a reply.
    for spec in GROUNDS:
        if spec.status != "active":
            continue
        gid = ledger.grounds[spec.key]["_id"]
        open_recent = [
            (slot_end, b) for b in candidates
            if b["ground_id"] == gid and b["_id"] not in reviewed
            for slot_end in [_at(date.fromisoformat(b["slot_date"]), b["end_hour"])]
            if NOW - timedelta(days=7) < slot_end < NOW - timedelta(hours=2)
        ]
        if not open_recent:
            continue
        slot_end, booking = max(open_recent, key=lambda pair: pair[0])
        rating = _rating(spec.quality)
        created = min(slot_end + timedelta(hours=3), NOW - timedelta(hours=1))
        reviews.append(_review(booking, rating, created, text=rng.choice(REVIEW_TEXTS[rating])))
        booking["review_submitted"] = True
        reviewed.add(booking["_id"])

    # Two reviews an admin has already hidden: one abusive, one spam.
    hidden = [
        ("gulshan", 1, "Worst ground ever, owner is a fraud!!! Everyone avoid this place, total scam"),
        ("seaview", 5, "Best cricket bats in Karachi at wholesale price, WhatsApp 0312 0000000 for orders"),
    ]
    for ground_key, rating, text in hidden:
        gid = ledger.grounds[ground_key]["_id"]
        booking = next(
            (b for b in reversed(candidates) if b["ground_id"] == gid and b["_id"] not in reviewed), None
        )
        if not booking:
            continue
        slot_end = _at(date.fromisoformat(booking["slot_date"]), booking["end_hour"])
        created = min(slot_end + timedelta(hours=3), NOW - timedelta(hours=1))
        review = _review(booking, rating, created, text=text, visible=False)
        review["updated_at"] = min(created + timedelta(hours=6), NOW)
        booking["review_submitted"] = True
        reviews.append(review)
    return reviews


async def recalc_ratings(db) -> None:
    # Same aggregation as review_service._recalc_ground_rating.
    async for ground in db.grounds.find({}, {"_id": 1}):
        doc = None
        async for d in db.reviews.aggregate([
            {"$match": {"ground_id": ground["_id"], "is_visible": True}},
            {"$group": {"_id": "$ground_id", "avg": {"$avg": "$overall_rating"}, "count": {"$sum": 1}}},
        ]):
            doc = d
        await db.grounds.update_one(
            {"_id": ground["_id"]},
            {"$set": {
                "avg_rating": round(float(doc["avg"]), 2) if doc else 0.0,
                "review_count": int(doc["count"]) if doc else 0,
            }},
        )


# ---- Main -------------------------------------------------------------------


async def main() -> None:
    await connect_mongo()
    db = get_db()
    try:
        for name in WIPE_COLLECTIONS:
            result = await db[name].delete_many({})
            logger.info("Cleared %s (%d docs)", name, result.deleted_count)

        users, managers, players = build_users()
        grounds = build_grounds(users)
        assignments = build_assignments(grounds, users, managers)
        slots = build_slots(grounds)

        ledger = Ledger(grounds, slots)
        reserved = build_test_fixtures(ledger, users)
        build_current_activity(ledger, players, reserved)
        build_bookings(ledger, grounds, players, reserved)
        blocked = block_maintenance(slots)
        reviews = build_reviews(ledger, players, users)

        all_users = {u["_id"]: u for u in [*users.values(), *managers.values(), *(p.doc for p in players)]}
        await db.users.insert_many(list(all_users.values()))
        await db.grounds.insert_many(list(grounds.values()))
        await db.manager_assignments.insert_many(assignments)
        await db.slots.insert_many(list(slots.values()))
        await db.bookings.insert_many(ledger.bookings)
        await db.payments.insert_many(ledger.payments)
        await db.reviews.insert_many(reviews)
        await recalc_ratings(db)

        by_status: dict[str, int] = {}
        for b in ledger.bookings:
            by_status[b["status"]] = by_status.get(b["status"], 0) + 1
        logger.info("Users %d | grounds %d | assignments %d | slots %d (%d blocked)",
                    len(all_users), len(grounds), len(assignments), len(slots), blocked)
        logger.info("Bookings %d %s", len(ledger.bookings), dict(sorted(by_status.items())))
        logger.info("Payments %d | reviews %d", len(ledger.payments), len(reviews))
        logger.info("---- Seed complete (any OTP works while AUTH_BYPASS_OTP=true) ----")
        for phone, name, role, _ in TEST_ACCOUNTS:
            logger.info("  %-13s %-16s %s", role, name, phone)
        logger.info("  %-13s %-16s %s", "suspended", SUSPENDED_PLAYER, SUSPENDED_PHONE)
    finally:
        await close_mongo()


if __name__ == "__main__":
    asyncio.run(main())
