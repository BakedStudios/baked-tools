"""
Contains all the important Shotgrid webhook endpoints.
"""
from datetime import datetime, timezone

from flask import Blueprint, request, current_app, g
import pydantic

from status import WebhookBody
from libsg import (
    update_linked_tasks, update_linked_shot, update_linked_task, SG
)
from errors import UnknownStatusError
from secret import verify_signature

bp = Blueprint("status", __name__)

def validation_error_response(validation_error):
    # Generates a validation error response with a description.
    return {
        "error": "Validation Error",
        "description": str(validation_error),
    }

def unknown_status_error_response(unknown_status_error):
    # Generates an unknown status error response with a description.
    return {
        "error": "Unknown Status",
        "description": str(unknown_status_error),
    }

@bp.before_request
def ensure_request_from_shotgrid():
    # Ensures that the request contains a valid Shotgrid signature.
    if "x-sg-signature" not in request.headers:
        return {
            "error": "Authentication Error",
            "description": 'You must provide the "x-sg-signature" header.',
        }, 401

    signature = request.headers["x-sg-signature"]
    if not verify_signature(
        request.get_data(), current_app.config["SECRET_TOKEN"], signature,
    ):
        return {
            "error": "Authentication Error",
            "description": "Request signature not valid.",
        }, 401

@bp.before_request
def handle_webhook():
    # Parses the webhook request body and stores it in the application context.
    post_body = request.get_json()

    try:
        webhook_post_body = WebhookBody.parse_obj(post_body)
    except pydantic.ValidationError as e:
        return validation_error_response(e), 400

    g.webhook = webhook_post_body
    if g.webhook.is_test_connection:
        return "", 204

    if g.webhook.data.user.type != "HumanUser":
        return "", 204

@bp.route("/task", methods=("POST",))
def handle_task_status_change():
    """
    Endpoint to handle status changes of tasks in Shotgrid.
    It updates the linked shot status based on the new task status.
    """
    task_id = g.webhook.data.entity.id
    project_id = g.webhook.data.project.id
    old_task_status = g.webhook.data.meta.old_value
    new_task_status = g.webhook.data.meta.new_value
    print(f'Task {task_id} was updated from status "{old_task_status}" to "{new_task_status}" in project {project_id}.')

    try:
        shot_statuses = current_app.config["STATUS_MAPPING"].map_task_status(new_task_status)
    except UnknownStatusError as e:
        return unknown_status_error_response(e), 400

    if not shot_statuses:
        print("Status not mapped to anything.")
        return "", 204

    print("Updating linked shot to a status that is one of: " + ", ".join(shot_statuses))

    original_shot, updated_shot = update_linked_shot(project_id, task_id, shot_statuses)

    if updated_shot is None:
        print("Linked shot did not need to be changed.")
    else:
        print("Updated linked shot.")

    now = datetime.now(timezone.utc)
    delay_second = (now - g.webhook.timestamp).total_seconds()
    return {
        "project_id": project_id,
        "task_id": task_id,
        "lag_after_original_event_ms": int(delay_second * 1000),
        "old_task_status": old_task_status,
        "new_task_status": new_task_status,
        "original_shot": original_shot,
        "updated_shot": updated_shot,
    }, 200