"""Evaluate a parsed PQL AST against a Task (COS-154)."""

from __future__ import annotations

from datetime import date

from elliptic.modules.pql.parser import And, Comparison, Func, Node, Not, Or, PqlError
from elliptic.modules.tasks.models import STATUS_TO_CATEGORY, StatusCategory, Task

_FIELDS: dict[str, str] = {
    "status": "status",
    "priority": "priority",
    "kind": "kind",
    "severity": "severity",
    "component": "component",
    "title": "title",
    "description": "description",
    "number": "number",
    "assignee": "assignee_id",
    "release_blocker": "release_blocker",
    "is_triage": "is_triage",
    "due_date": "due_date",
}

_FUNCTIONS = {
    "is_overdue",
    "has_no_assignee",
    "has_no_label",
    "is_top_level",
    "is_done",
    "is_open",
}


def validate(node: Node) -> None:
    """Raise PqlError if the AST references an unknown field/function/operator."""
    if isinstance(node, Comparison):
        if node.field not in _FIELDS and node.field != "label":
            raise PqlError(f"Unknown field: {node.field}")
    elif isinstance(node, Func):
        if node.name not in _FUNCTIONS:
            raise PqlError(f"Unknown function: {node.name}()")
    elif isinstance(node, Not):
        validate(node.operand)
    elif isinstance(node, And | Or):
        validate(node.left)
        validate(node.right)


def _coerce(value: object) -> object:
    """Normalize enum / date values to comparable primitives."""
    if hasattr(value, "value"):
        return value.value
    if isinstance(value, date):
        return value.isoformat()
    return value


def _label_names(task: Task) -> list[str]:
    return [label.name for label in (task.labels or [])]


def _compare(task: Task, node: Comparison, today: date) -> bool:  # noqa: PLR0911, ARG001
    if node.field == "label":
        names = [n.lower() for n in _label_names(task)]
        targets = node.value if isinstance(node.value, list) else [node.value]
        targets = [str(t).lower() for t in targets]
        if node.op in ("=", "in"):
            return any(t in names for t in targets)
        if node.op in ("!=", "not in"):
            return all(t not in names for t in targets)
        raise PqlError(f"Operator {node.op} is not valid for label")

    raw = getattr(task, _FIELDS[node.field], None)
    actual = _coerce(raw)
    expected = node.value

    if node.op == "in":
        targets = expected if isinstance(expected, list) else [expected]
        return actual in [_norm(t) for t in targets]
    if node.op == "not in":
        targets = expected if isinstance(expected, list) else [expected]
        return actual not in [_norm(t) for t in targets]
    if node.op == "~":
        return actual is not None and str(expected).lower() in str(actual).lower()
    if node.op == "=":
        return actual == _norm(expected)
    if node.op == "!=":
        return actual != _norm(expected)
    if node.op in ("<", "<=", ">", ">="):
        if actual is None or expected is None:
            return False
        return _ordered(actual, expected, node.op)
    raise PqlError(f"Unsupported operator: {node.op}")


def _norm(value: object) -> object:
    return value


def _ordered(actual: object, expected: object, op: str) -> bool:
    try:
        if op == "<":
            return bool(actual < expected)  # type: ignore[operator]
        if op == "<=":
            return bool(actual <= expected)  # type: ignore[operator]
        if op == ">":
            return bool(actual > expected)  # type: ignore[operator]
        return bool(actual >= expected)  # type: ignore[operator]
    except TypeError:
        return False


def _func(task: Task, name: str, today: date) -> bool:
    if name == "has_no_assignee":
        return task.assignee_id is None
    if name == "has_no_label":
        return len(_label_names(task)) == 0
    if name == "is_top_level":
        return task.parent_task_id is None
    completed = STATUS_TO_CATEGORY.get(task.status) is StatusCategory.COMPLETED
    if name == "is_done":
        return completed
    if name == "is_open":
        return not completed
    if name == "is_overdue":
        return task.due_date is not None and task.due_date < today and not completed
    raise PqlError(f"Unknown function: {name}()")


def evaluate(node: Node, task: Task, today: date) -> bool:
    if isinstance(node, Comparison):
        return _compare(task, node, today)
    if isinstance(node, Func):
        return _func(task, node.name, today)
    if isinstance(node, Not):
        return not evaluate(node.operand, task, today)
    if isinstance(node, And):
        return evaluate(node.left, task, today) and evaluate(node.right, task, today)
    if isinstance(node, Or):
        return evaluate(node.left, task, today) or evaluate(node.right, task, today)
    raise PqlError("Invalid query node")
