"""
WhatsApp notification helper using the Meta WhatsApp Cloud API.
Reads WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN from environment.
"""

import os
import logging
import threading
import requests

logger = logging.getLogger("smartattend.whatsapp")

# ── Meta WhatsApp Cloud API configuration ────────────────────────────
WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
WHATSAPP_ACCESS_TOKEN = os.getenv("WHATSAPP_ACCESS_TOKEN", "")
WHATSAPP_API_VERSION = os.getenv("WHATSAPP_API_VERSION", "v21.0")

API_URL = (
    f"https://graph.facebook.com/{WHATSAPP_API_VERSION}"
    f"/{WHATSAPP_PHONE_NUMBER_ID}/messages"
)

HEADERS = {
    "Authorization": f"Bearer {WHATSAPP_ACCESS_TOKEN}",
    "Content-Type": "application/json",
}


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
    """Send a single template message. Returns True on success."""
    if not is_whatsapp_configured():
        logger.warning("WhatsApp not configured – skipping send.")
        return False

    payload = _build_template_payload(to, template_name, params)
    try:
        resp = requests.post(API_URL, headers=HEADERS, json=payload, timeout=15)
        if resp.ok:
            logger.info("WhatsApp sent to %s (template=%s)", to, template_name)
            return True
        else:
            logger.error(
                "WhatsApp API error %s for %s: %s",
                resp.status_code, to, resp.text,
            )
            return False
    except Exception as e:
        logger.error("WhatsApp send failed for %s: %s", to, e)
        return False


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


def send_whatsapp_async(template_name: str, params: list[str], app=None) -> None:
    """Fire-and-forget: send template to all saved numbers in a background thread.

    Pass the Flask `app` so the thread can push an application context.
    """
    from flask import current_app
    _app = app or current_app._get_current_object()

    def _worker():
        with _app.app_context():
            send_whatsapp_to_all(template_name, params)

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
