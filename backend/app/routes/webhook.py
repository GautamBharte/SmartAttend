"""
WhatsApp webhook endpoint for delivery status updates from Meta.

Meta sends:
  1. GET  /whatsapp/webhook?hub.mode=subscribe&hub.verify_token=...&hub.challenge=…
     → for webhook verification
  2. POST /whatsapp/webhook
     → with delivery status updates (sent, delivered, read, failed)
"""

import logging
from flask import Blueprint, request, jsonify

logger = logging.getLogger("smartattend.webhook")

webhook_bp = Blueprint("webhook", __name__)


@webhook_bp.route("/whatsapp/webhook", methods=["GET"])
def verify_webhook():
    """Meta webhook verification (challenge-response)."""
    from app.whatsapp import WHATSAPP_WEBHOOK_VERIFY_TOKEN

    mode = request.args.get("hub.mode")
    token = request.args.get("hub.verify_token")
    challenge = request.args.get("hub.challenge")

    if mode == "subscribe" and token == WHATSAPP_WEBHOOK_VERIFY_TOKEN:
        logger.info("Webhook verified successfully.")
        return challenge, 200
    else:
        logger.warning("Webhook verification failed: mode=%s token=%s", mode, token)
        return "Forbidden", 403


@webhook_bp.route("/whatsapp/webhook", methods=["POST"])
def receive_webhook():
    """Receive delivery status updates from Meta WhatsApp Cloud API.

    Status values: sent, delivered, read, failed
    """
    payload = request.get_json(silent=True) or {}

    # Extract status updates from the webhook payload
    try:
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                statuses = value.get("statuses", [])
                for status in statuses:
                    recipient = status.get("recipient_id", "unknown")
                    status_val = status.get("status", "unknown")
                    timestamp = status.get("timestamp", "")
                    msg_id = status.get("id", "")

                    if status_val == "failed":
                        errors = status.get("errors", [])
                        error_msg = errors[0].get("title", "Unknown error") if errors else "Unknown error"
                        logger.error(
                            "WhatsApp FAILED for %s (msg=%s): %s",
                            recipient, msg_id, error_msg,
                        )
                    else:
                        logger.info(
                            "WhatsApp status: %s → %s (msg=%s, ts=%s)",
                            recipient, status_val, msg_id, timestamp,
                        )
    except Exception as e:
        logger.error("Error processing webhook payload: %s", e)

    # Always return 200 to acknowledge receipt (Meta retries on non-200)
    return jsonify({"status": "ok"}), 200
