"""JSON Schema for the config-as-code document (COS-243)."""

CONFIG_SCHEMA: dict[str, object] = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "required": ["version", "projects"],
    "additionalProperties": False,
    "properties": {
        "version": {"type": "integer", "enum": [1]},
        "projects": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["key", "name"],
                "additionalProperties": True,
                "properties": {
                    "key": {"type": "string", "minLength": 1, "maxLength": 6},
                    "name": {"type": "string", "minLength": 1},
                    "description": {"type": ["string", "null"]},
                },
            },
        },
        "labels": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name"],
                "properties": {"name": {"type": "string"}, "color": {"type": ["string", "null"]}},
            },
        },
        "workflow_statuses": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "category"],
                "properties": {"name": {"type": "string"}, "category": {"type": "string"}},
            },
        },
        "views": {"type": "array", "items": {"type": "object"}},
    },
}
