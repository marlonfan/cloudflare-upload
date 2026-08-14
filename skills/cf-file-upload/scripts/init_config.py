#!/usr/bin/env python3
"""Initialize local configuration for the CF file upload skill."""

from __future__ import annotations

import argparse
import getpass
import json
import os
from pathlib import Path
from urllib.parse import urlparse


def default_config_path() -> Path:
    override = os.environ.get("CF_FILE_UPLOAD_CONFIG")
    if override:
        return Path(override).expanduser()
    xdg_config = os.environ.get("XDG_CONFIG_HOME")
    if xdg_config:
        return Path(xdg_config).expanduser() / "cf-file-upload" / "config.json"
    return Path.home() / ".config" / "cf-file-upload" / "config.json"


def normalize_base_url(value: str) -> str:
    value = value.strip().rstrip("/")
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise SystemExit("Worker base URL must include http:// or https://")
    return value


def read_existing(path: Path) -> dict:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def prompt_with_default(label: str, current: str = "") -> str:
    suffix = f" [{current}]" if current else ""
    value = input(f"{label}{suffix}: ").strip()
    return value or current


def main() -> int:
    parser = argparse.ArgumentParser(description="Save CF file upload connection settings.")
    parser.add_argument("--config", type=Path, default=default_config_path(), help="Config file path")
    parser.add_argument("--base-url", help="Worker base URL, such as https://image.example.workers.dev")
    parser.add_argument("--account", help="Optional local account label")
    parser.add_argument("--password", help="Upload password. Prefer the hidden prompt over this flag.")
    args = parser.parse_args()

    config_path = args.config.expanduser()
    existing = read_existing(config_path)

    base_url = args.base_url or prompt_with_default("Worker base URL", existing.get("base_url", ""))
    if not base_url:
        raise SystemExit("Worker base URL is required")
    base_url = normalize_base_url(base_url)

    account = args.account
    if account is None:
        account = prompt_with_default("Local account label (optional)", existing.get("account", ""))

    password = args.password
    if password is None:
        current_password = existing.get("password", "")
        prompt = "Upload password"
        if current_password:
            prompt += " [press Enter to keep existing]"
        entered = getpass.getpass(prompt + ": ")
        password = entered or current_password
    if not password:
        raise SystemExit("Upload password is required")

    config = {
        "base_url": base_url,
        "account": account,
        "password": password,
    }

    config_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = config_path.with_suffix(config_path.suffix + ".tmp")
    tmp_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    os.chmod(tmp_path, 0o600)
    tmp_path.replace(config_path)
    os.chmod(config_path, 0o600)

    print(f"Saved config: {config_path}")
    print(f"Worker: {base_url}")
    if account:
        print(f"Account label: {account}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
