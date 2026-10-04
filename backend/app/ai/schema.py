"""Turn Pydantic models into JSON schemas that strict structured output accepts.

Strict mode (OpenAI-compatible, which ILMU follows) requires every object to list
all of its properties as required and to forbid extra properties, and it does
not accept `$ref`. Optional fields stay nullable, so the model answers `null`
instead of leaving a key out.
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

_DROP_KEYS = {"$defs", "title", "default", "examples"}


def strict_json_schema(model: type[BaseModel]) -> dict[str, Any]:
    schema = model.model_json_schema()
    return _strictify(schema, schema.get("$defs", {}))


def _strictify(node: Any, defs: dict[str, Any]) -> Any:
    if isinstance(node, list):
        return [_strictify(item, defs) for item in node]
    if not isinstance(node, dict):
        return node
    if "$ref" in node:
        return _strictify(defs[node["$ref"].rsplit("/", 1)[-1]], defs)
    out: dict[str, Any] = {}
    for key, value in node.items():
        if key in _DROP_KEYS:
            continue
        if key == "properties":
            # Property *names* are data here, not schema keywords: keep them all.
            out[key] = {name: _strictify(sub, defs) for name, sub in value.items()}
        else:
            out[key] = _strictify(value, defs)
    if out.get("type") == "object":
        out["additionalProperties"] = False
        out["required"] = list(out.get("properties", {}))
    return out
