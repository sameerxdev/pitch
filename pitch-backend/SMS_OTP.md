# PITCH — OTP delivery via SMSGate (Local Server mode)

This document describes how login codes (OTPs) reach users' phones, why this
approach was chosen, and how to set it up and operate it.

---

## 1. Why this approach

PITCH logs users in with their phone number, so every login needs an SMS. The
project has no budget for a paid SMS provider. Options considered (Oct 2026):

| Option | Cost | Why not chosen |
|---|---|---|
| Firebase Phone Auth | Paid since Sep 2024 (10/day free on the paid plan) | Needs a billing account |
| WhatsApp Cloud API | ~$0.015 per OTP in Pakistan | Not free |
| Telegram Gateway | $0.01 per code | Not free; user needs Telegram |
| Email OTP / Google Sign-In | Free | App identifies users by phone number |
| **SMSGate on an Android phone** | Free software + a SIM bundle (~PKR 100–200/month) | **Chosen** |

[SMSGate](https://sms-gate.app/) is an open-source (Apache 2.0) Android app that
turns a phone into an SMS gateway with a small HTTP API. We use its
**Local Server** mode: the backend talks to the phone directly over the local
network, so codes never pass through any third-party server.

---

## 2. How it works

```
 PITCH app            Backend (FastAPI)                Android phone             User's phone
                                                        (SMSGate + SIM)
    │ POST /auth/request-otp │                                │                         │
    │───────────────────────►│ 1. rate-limit check            │                         │
    │                        │ 2. generate 6-digit code       │                         │
    │                        │ 3. store SHA-256 hash in Mongo │                         │
    │                        │ 4. POST /message (Basic auth)  │                         │
    │                        │───────────────────────────────►│                         │
    │                        │◄────────── 202 Accepted ───────│ 5. send SMS from SIM    │
    │◄──── { expires_in } ───│                                │────────────────────────►│
    │                                                                                   │
    │ POST /auth/verify-otp  (user types the code)                                      │
    │───────────────────────►│ 6. compare with stored hash → JWT tokens                 │
```

Only step 4 is SMSGate-specific. Everything else (generation, hashing,
expiry, attempt limits, throttling) is the existing logic in
`app/services/auth_service.py`.

Network layout — the server and phone must be on the **same network**:

```
 ┌────────────────────┐        Wi-Fi / LAN         ┌───────────────────────┐
 │ Backend server     │ ─────────────────────────► │ Android phone         │
 │ (Docker: pitch-api)│   http://192.168.1.50:8080 │ SMSGate, Local Server │
 └────────────────────┘                            └───────────────────────┘
```

### Code map

| File | Role |
|---|---|
| `app/services/sms_service.py` | Sends the SMS. Providers: `console` (log only) and `smsgate`. |
| `app/services/auth_service.py` → `request_otp` | Generates/stores the code, then calls `sms_service.send_otp`. |
| `app/core/config.py` | `SMS_PROVIDER`, `SMSGATE_*`, `SMS_TIMEOUT_SECONDS`. |

Request the backend sends to the phone:

```http
POST http://<phone-ip>:8080/message
Authorization: Basic <username:password>
Content-Type: application/json

{ "textMessage": { "text": "Your PITCH code is 482913. It expires in 5 min. Do not share it." },
  "phoneNumbers": ["+923001234567"] }
```

A `2xx` response means the phone accepted the message into its outbox. Carrier
delivery happens afterwards on the phone and is not tracked by the backend.

### When sending fails

If the phone is off, unreachable, rejects the credentials, or SMSGate isn't
configured, `POST /auth/request-otp` returns:

```json
{ "data": null, "error": { "code": "SMS_SEND_FAILED", "message": "We couldn't send the code right now. Please try again in a minute." } }
```

with HTTP **503**. The stored code is deleted so it can't be verified. The
request still counts towards the per-phone resend cooldown (30 s) and hourly
cap, which stops a broken gateway from being hammered. The real cause is logged
on the server as `OTP SMS send failed: ...`. The app shows the message as-is.

---

## 3. Setup

### What you need
- An Android phone (Android 5.0+) that can stay at the server's location, always on charge.
- A Jazz/Zong/Telenor/Ufone SIM with an SMS bundle. **Check that the bundle covers
  other networks** — many cover on-net SMS only and charge off-net SMS from balance.
- The server and phone on the same trusted Wi-Fi/LAN.

### Phone
1. Install **SMS Gateway for Android** from <https://sms-gate.app/> (or its GitHub releases).
2. Open it, grant the SMS permission, and turn on **Local Server**.
3. Tap the **Offline** status button to start it; it changes to **Online**.
4. Note the **local address** (e.g. `192.168.1.50:8080`), **username** and **password** shown.
5. In Android settings, **disable battery optimisation** for the app so it isn't
   put to sleep, and keep the phone plugged in.
6. On the router, give the phone a **fixed IP** (DHCP reservation) so the address never changes.

You can try the phone's API from the server's machine before touching the backend:

```bash
curl -X POST -u '<username>:<password>' -H 'Content-Type: application/json' \
  -d '{"textMessage":{"text":"PITCH test"},"phoneNumbers":["+923001234567"]}' \
  http://192.168.1.50:8080/message
```

Swagger for the phone's API is at `http://<phone-ip>:8080/docs`.

### Backend
In `pitch-backend/.env`:

```env
SMS_PROVIDER=smsgate
SMSGATE_URL=http://192.168.1.50:8080
SMSGATE_USERNAME=<from the app>
SMSGATE_PASSWORD=<from the app>
SMS_TIMEOUT_SECONDS=10

# Turn real OTP on
AUTH_BYPASS_OTP=false
OTP_DEBUG=false
```

Then `docker compose up -d`. The `pitch-api` container reaches the phone's LAN
IP through Docker's default bridge network — no compose changes needed.

### Development without a phone
Keep `SMS_PROVIDER=console`. With `AUTH_BYPASS_OTP=false`, codes are printed in the
API log (`docker compose logs -f api`) as `[console SMS] to +92...: Your PITCH code is ...`.
With `AUTH_BYPASS_OTP=true` (the default), no code is generated at all and any code is accepted.

---

## 4. Operating it

| Concern | Detail |
|---|---|
| **Carrier limits** | Pakistani operators auto-block SIMs sending > ~150 SMS / 15 min, > 250 / hour, or > 750 / day. Enough for launch; add a second phone/SIM if you outgrow it. |
| **Single point of failure** | If the phone is off, out of battery, off Wi-Fi or without signal, nobody can log in. Watch for `SMS_SEND_FAILED` in the API logs. |
| **Balance** | Bundles expire. Track the renewal date, or set up auto-renewal on the SIM. |
| **Security** | Local Server uses plain HTTP with Basic auth. Use a private, trusted network only — not guest or public Wi-Fi. Don't commit the password; it lives only in `.env`. |
| **Sender ID** | Users see an ordinary mobile number, not "PITCH". Consider saving this number in a support FAQ. |
| **Terms of service** | Business traffic on a personal SIM is a grey area in operator terms. Fine for an MVP; move to a registered sender with a paid provider as volume grows. |
| **Delivery status** | Not tracked. If users report missing codes, check the SMSGate app's message list on the phone. |

---

## 5. Changing providers later

`sms_service.send_sms(phone, text)` is the only place that knows how SMS is sent.
To add a provider (e.g. a paid SMS API or WhatsApp), add a `_send_via_<name>`
function, a branch in `send_sms`, and its settings in `config.py`; raise
`SmsSendError` on failure. Nothing in `auth_service` or the mobile app changes.
