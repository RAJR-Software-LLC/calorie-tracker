#!/bin/bash

set -euo pipefail

input_json="$(cat)"

python3 - "$input_json" <<'PY'
import json
import os
import re
import sys
from typing import Any

raw_input = sys.argv[1] if len(sys.argv) > 1 else "{}"
try:
    payload = json.loads(raw_input or "{}")
except json.JSONDecodeError:
    print("{}")
    sys.exit(0)

workspace = os.getcwd()
targets: set[str] = set()

def maybe_add_path(value: str) -> None:
    if not value:
        return
    candidate = value
    if not os.path.isabs(candidate):
        candidate = os.path.join(workspace, candidate)
    candidate = os.path.normpath(candidate)
    if not candidate.startswith(workspace):
        return
    if os.path.isfile(candidate):
        targets.add(candidate)

def walk(node: Any) -> None:
    if isinstance(node, dict):
        for key, value in node.items():
            key_lower = str(key).lower()
            if isinstance(value, str) and ("path" in key_lower or "file" in key_lower):
                maybe_add_path(value)
            walk(value)
    elif isinstance(node, list):
        for item in node:
            walk(item)

walk(payload)

if not targets:
    print("{}")
    sys.exit(0)

disable_re = re.compile(r"eslint-disable(?:-next-line|-line)?\b")
line_comment_re = re.compile(r"^\s*//\s*\S")
block_comment_re = re.compile(r"^\s*/\*+\s*\S")
lint_directive_re = re.compile(r"eslint-(?:disable|enable)")

violations: list[str] = []

for file_path in sorted(targets):
    if not file_path.endswith((".js", ".jsx", ".ts", ".tsx")):
        continue
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()
    except (OSError, UnicodeDecodeError):
        continue

    for idx, line in enumerate(lines):
        if not disable_re.search(line):
            continue
        if "eslint-enable" in line:
            continue
        if idx == 0:
            violations.append(f"{os.path.relpath(file_path, workspace)}:{idx + 1}")
            continue

        prev_line = lines[idx - 1]
        has_reason_comment = bool(line_comment_re.match(prev_line) or block_comment_re.match(prev_line))
        is_another_lint_directive = bool(lint_directive_re.search(prev_line))
        if (not has_reason_comment) or is_another_lint_directive:
            violations.append(f"{os.path.relpath(file_path, workspace)}:{idx + 1}")

if violations:
    joined = ", ".join(violations[:10])
    if len(violations) > 10:
        joined += ", ..."
    message = (
        "Missing explanatory comment above eslint-disable directive at: "
        f"{joined}. Add a specific reason comment immediately above each disable."
    )
    print(json.dumps({"permission": "deny", "user_message": message}))
    sys.exit(2)

print("{}")
sys.exit(0)
PY
