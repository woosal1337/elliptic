"""A small query language (PQL) — tokenizer + recursive-descent parser (COS-154).

Grammar (filter-only):
    expr    := or_expr
    or_expr := and_expr (OR and_expr)*
    and_expr:= not_expr (AND not_expr)*
    not_expr:= NOT not_expr | primary
    primary := '(' expr ')' | func | comparison
    func    := IDENT '(' ')'
    comparison := IDENT OP value
    OP      := = | != | ~ | < | <= | > | >= | IN | NOT IN
    value   := STRING | NUMBER | DATE | BOOL | NULL | '[' value (',' value)* ']'
"""

from __future__ import annotations

import re
from dataclasses import dataclass

__all__ = ["And", "Comparison", "Func", "Node", "Not", "Or", "PqlError", "parse"]


class PqlError(ValueError):
    """Raised on a malformed PQL query."""


@dataclass(frozen=True)
class Comparison:
    field: str
    op: str
    value: object


@dataclass(frozen=True)
class Func:
    name: str


@dataclass(frozen=True)
class Not:
    operand: Node


@dataclass(frozen=True)
class And:
    left: Node
    right: Node


@dataclass(frozen=True)
class Or:
    left: Node
    right: Node


Node = Comparison | Func | Not | And | Or

_TOKEN_RE = re.compile(
    r"""
    \s*(?:
      (?P<lparen>\() | (?P<rparen>\)) | (?P<lbrack>\[) | (?P<rbrack>\]) | (?P<comma>,)
      | (?P<op><=|>=|!=|=|~|<|>)
      | (?P<string>"[^"]*"|'[^']*')
      | (?P<number>-?\d+(?:\.\d+)?)
      | (?P<ident>[A-Za-z_][A-Za-z0-9_]*)
    )
    """,
    re.VERBOSE,
)

_KEYWORDS = {"and", "or", "not", "in", "true", "false", "null"}


def _tokenize(text: str) -> list[tuple[str, str]]:
    tokens: list[tuple[str, str]] = []
    pos = 0
    while pos < len(text):
        if text[pos].isspace():
            pos += 1
            continue
        match = _TOKEN_RE.match(text, pos)
        if not match or match.end() == pos:
            raise PqlError(f"Unexpected character at position {pos}: {text[pos]!r}")
        pos = match.end()
        kind = match.lastgroup or ""
        value = match.group(kind)
        if kind == "ident" and value.lower() in _KEYWORDS:
            tokens.append(("kw", value.lower()))
        else:
            tokens.append((kind, value))
    tokens.append(("eof", ""))
    return tokens


class _Parser:
    def __init__(self, tokens: list[tuple[str, str]]) -> None:
        self.tokens = tokens
        self.i = 0

    def _peek(self) -> tuple[str, str]:
        return self.tokens[self.i]

    def _next(self) -> tuple[str, str]:
        tok = self.tokens[self.i]
        self.i += 1
        return tok

    def _expect(self, kind: str) -> tuple[str, str]:
        tok = self._next()
        if tok[0] != kind:
            raise PqlError(f"Expected {kind}, got {tok[1] or tok[0]!r}")
        return tok

    def parse(self) -> Node:
        node = self._or()
        if self._peek()[0] != "eof":
            raise PqlError(f"Unexpected trailing input near {self._peek()[1]!r}")
        return node

    def _or(self) -> Node:
        node = self._and()
        while self._peek() == ("kw", "or"):
            self._next()
            node = Or(node, self._and())
        return node

    def _and(self) -> Node:
        node = self._not()
        while self._peek() == ("kw", "and"):
            self._next()
            node = And(node, self._not())
        return node

    def _not(self) -> Node:
        if self._peek() == ("kw", "not"):
            self._next()
            return Not(self._not())
        return self._primary()

    def _primary(self) -> Node:
        tok = self._peek()
        if tok[0] == "lparen":
            self._next()
            node = self._or()
            self._expect("rparen")
            return node
        if tok[0] == "ident":
            self._next()
            if self._peek()[0] == "lparen":
                self._next()
                self._expect("rparen")
                return Func(tok[1].lower())
            return self._comparison(tok[1].lower())
        raise PqlError(f"Expected a field or '(', got {tok[1] or tok[0]!r}")

    def _comparison(self, field: str) -> Comparison:
        op_tok = self._next()
        if op_tok[0] == "op":
            return Comparison(field, op_tok[1], self._value())
        if op_tok == ("kw", "in"):
            return Comparison(field, "in", self._list())
        if op_tok == ("kw", "not"):
            if self._next() != ("kw", "in"):
                raise PqlError("Expected 'in' after 'not'")
            return Comparison(field, "not in", self._list())
        raise PqlError(f"Expected an operator after {field!r}, got {op_tok[1] or op_tok[0]!r}")

    def _list(self) -> list[object]:
        self._expect("lbrack")
        values: list[object] = []
        if self._peek()[0] != "rbrack":
            values.append(self._value())
            while self._peek()[0] == "comma":
                self._next()
                values.append(self._value())
        self._expect("rbrack")
        return values

    def _value(self) -> object:
        tok = self._next()
        if tok[0] == "string":
            return tok[1][1:-1]
        if tok[0] == "number":
            return float(tok[1]) if "." in tok[1] else int(tok[1])
        if tok == ("kw", "true"):
            return True
        if tok == ("kw", "false"):
            return False
        if tok == ("kw", "null"):
            return None
        if tok[0] == "ident":
            return tok[1]
        raise PqlError(f"Expected a value, got {tok[1] or tok[0]!r}")


def parse(query: str) -> Node:
    if not query or not query.strip():
        raise PqlError("Empty query")
    return _Parser(_tokenize(query)).parse()
