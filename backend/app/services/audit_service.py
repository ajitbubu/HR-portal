import json
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def _json_serializer(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def log_audit(
    db: Session,
    user_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
):
    entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        old_values=json.dumps(old_values, default=_json_serializer) if old_values else None,
        new_values=json.dumps(new_values, default=_json_serializer) if new_values else None,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
    return entry
