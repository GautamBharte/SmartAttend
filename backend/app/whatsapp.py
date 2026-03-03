"""
WhatsApp notification helper using the Meta WhatsApp Cloud API.
Reads WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN from environment.
"""

import os
import logging
import threading
import time
import requests

logger = logging.getLogger("smartattend.whatsapp")

# ── Meta WhatsApp Cloud API configuration ────────────────────────────
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")
WHATSAPP_WEBHOOK_VERIFY_TOKEN = os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "smartattend_verify_token")

API_URL = (
    f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"
    f"/{WHATSAPP_PHONE_NUMBER_ID}/messages"
)

HEADERS = {
    "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
    "Content-Type": "application/json",
}

# ── Retry configuration ──────────────────────────────────────────────
MAX_RETRIES = 3
RETRY_BACKOFF_BASE = 2  # seconds: 2, 4, 8


def is_whatsapp_configured() -> bool:
    """Return True if the required Meta API credentials are present."""
    return bool(WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN)


def _build_template_payload(to: str, template_name: str, params: list[str]) -> dict:
    """Build the JSON payload for a template message.

    Args:
        to: Recipient phone number in international format (e.g. '919876543210').
        template_name: Registered Meta template name.
        params: Ordered list of parameter values for {{1}}, {{2}}, … placeholders.
    """
    components = []
    if params:
        components.append({
            "type": "body",
            "parameters": [
                {"type": "text", "text": p} for p in params
            ],
        })

    return {
        "messaging_product": "whatsapp",
        "to": to,
        "type": "template",
        "template": {
            "name": template_name,
            "language": {"code": "en"},
            "components": components,
        },
    }


def _send_single(to: str, template_name: str, params: list[str]) -> bool:
    """Send a single template message with retry & exponential backoff.
    Returns True on success."""
    if not is_whatsapp_configured():
        logger.warning("WhatsApp not configured – skipping send.")
        return False

    payload = _build_template_payload(to, template_name, params)

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(API_URL, headers=HEADERS, json=payload, timeout=15)
            if resp.ok:
                logger.info("WhatsApp sent to %s (template=%s)", to, template_name)
                return True

            # Don't retry on 4xx client errors (bad request, auth failure, etc.)
            if 400 <= resp.status_code < 500:
                logger.error(
                    "WhatsApp API client error %s for %s (no retry): %s",
                    resp.status_code, to, resp.text,
                )
                return False

            # 5xx server errors — retry
            logger.warning(
                "WhatsApp API error %s for %s (attempt %d/%d): %s",
                resp.status_code, to, attempt, MAX_RETRIES, resp.text,
            )
        except requests.exceptions.Timeout:
            logger.warning(
                "WhatsApp send timeout for %s (attempt %d/%d)",
                to, attempt, MAX_RETRIES,
            )
        except Exception as e:
            logger.error(
                "WhatsApp send failed for %s (attempt %d/%d): %s",
                to, attempt, MAX_RETRIES, e,
            )

        # Exponential backoff before retry
        if attempt < MAX_RETRIES:
            wait = RETRY_BACKOFF_BASE ** attempt  # 2s, 4s
            logger.info("Retrying in %ds…", wait)
            time.sleep(wait)

    logger.error("WhatsApp send to %s FAILED after %d attempts.", to, MAX_RETRIES)
    return False


def truncate_name_list(names: list[str], max_chars: int = 900) -> str:
    """Join names with commas, truncating with '… and X more' if over max_chars.
    WhatsApp template param limit is 1024 chars — we use 900 for safety margin.
    """
    if not names:
        return "None"
    result = names[0]
    for i, name in enumerate(names[1:], start=2):
        candidate = f"{result}, {name}"
        if len(candidate) > max_chars:
            remaining = len(names) - (i - 1)
            return f"{result} … and {remaining} more"
        result = candidate
    return result


# ── Public helpers (called from routes / schedulers) ─────────────────

def send_whatsapp_to_numbers(
    phone_numbers: list[str],
    template_name: str,
    params: list[str],
) -> None:
    """Send a template message to every number in the list (blocking)."""
    for num in phone_numbers:
        _send_single(num, template_name, params)


def send_whatsapp_to_all(template_name: str, params: list[str]) -> None:
    """Fetch all saved numbers from DB and send the template to each one.

    NOTE: Must be called inside an application context.
    """
    from app.models.whatsapp_config import WhatsAppConfig

    numbers = [w.phone_number for w in WhatsAppConfig.query.all()]
    if not numbers:
        logger.info("No WhatsApp numbers configured – nothing to send.")
        return
    send_whatsapp_to_numbers(numbers, template_name, params)


def send_whatsapp_to_all_personalized(template_name: str, params_fn) -> None:
    """Send a personalized template to each admin number.

    params_fn: callable(label: str) -> list[str]
        A function that takes the admin's label/name and returns the
        parameter list for that recipient. This allows {{1}} to be
        the admin's own name instead of a generic "Team".

    NOTE: Must be called inside an application context.
    """
    from app.models.whatsapp_config import WhatsAppConfig

    entries = WhatsAppConfig.query.all()
    if not entries:
        logger.info("No WhatsApp numbers configured – nothing to send.")
        return
    for entry in entries:
        label = entry.label or "Team"
        _send_single(entry.phone_number, template_name, params_fn(label))


def send_whatsapp_async(template_name: str, params: list[str] = None, params_fn=None, app=None) -> None:
    """Fire-and-forget: send template to all saved numbers in a background thread.

    If params_fn is provided, uses send_whatsapp_to_all_personalized for per-admin names.
    Otherwise uses send_whatsapp_to_all with static params.
    """
    from flask import current_app
    _app = app or current_app._get_current_object()

    def _worker():
        with _app.app_context():
            if params_fn:
                send_whatsapp_to_all_personalized(template_name, params_fn)
            else:
                send_whatsapp_to_all(template_name, params or [])

    threading.Thread(target=_worker, daemon=True).start()


def send_whatsapp_to_number_async(
    phone_number: str,
    template_name: str,
    params: list[str],
    app=None,
) -> None:
    """Fire-and-forget: send template to a single number in a background thread."""
    from flask import current_app
    _app = app or current_app._get_current_object()

    def _worker():
        with _app.app_context():
            _send_single(phone_number, template_name, params)

    threading.Thread(target=_worker, daemon=True).start()
