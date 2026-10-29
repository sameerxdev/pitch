"""Outbound SMS for OTP codes.

Two providers, picked by `SMS_PROVIDER`:

- `console` (default) — writes the code to the server log. For development
  only; nothing leaves the machine.
- `smsgate` — hands the message to the SMSGate Android app running in
  **Local Server** mode on a phone on the same network as this server. The
  phone sends it as an ordinary SMS from its SIM. See SMS_OTP.md.

Unlike push notifications, a failed OTP send must reach the caller — the user
is waiting for the code — so `send_sms` raises `SmsSendError` instead of
swallowing it.

This module is a leaf — it imports only settings.
"""
from __future__ import annotations

import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


class SmsSendError(Exception):
    """The SMS could not be handed off for delivery."""


def _mask(phone: str) -> str:
    return phone[:-4] + "****" if len(phone) > 4 else "****"


async def _send_via_smsgate(phone: str, text: str) -> None:
    if not (settings.SMSGATE_URL and settings.SMSGATE_USERNAME and settings.SMSGATE_PASSWORD):
        raise SmsSendError("SMSGate is selected but SMSGATE_URL/USERNAME/PASSWORD are not all set.")

    url = settings.SMSGATE_URL.rstrip("/") + "/message"
    try:
        async with httpx.AsyncClient(timeout=settings.SMS_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                json={"textMessage": {"text": text}, "phoneNumbers": [phone]},
                auth=(settings.SMSGATE_USERNAME, settings.SMSGATE_PASSWORD),
            )
    except httpx.HTTPError as exc:
        raise SmsSendError(f"SMSGate unreachable at {url}: {exc!r}") from exc

    if response.status_code >= 400:
        raise SmsSendError(f"SMSGate rejected the message ({response.status_code}): {response.text[:300]}")
    # 202 means the phone accepted the message into its outbox. Carrier delivery
    # happens asynchronously on the phone and isn't tracked here.
    logger.info("OTP SMS queued on SMSGate for %s", _mask(phone))


async def send_sms(phone: str, text: str) -> None:
    provider = settings.SMS_PROVIDER.lower()
    if provider == "smsgate":
        await _send_via_smsgate(phone, text)
    elif provider == "console":
        logger.info("[console SMS] to %s: %s", phone, text)
    else:
        raise SmsSendError(f"Unknown SMS_PROVIDER '{settings.SMS_PROVIDER}'.")


async def send_otp(phone: str, code: str) -> None:
    minutes = max(1, settings.OTP_TTL_SECONDS // 60)
    await send_sms(phone, f"Your PITCH code is {code}. It expires in {minutes} min. Do not share it.")
