#!/usr/bin/env python3
"""Upload files to the current Cloudflare Worker file service."""

from __future__ import annotations

import argparse
import http.cookiejar
import json
import mimetypes
import os
import re
import secrets
import sys
from datetime import datetime
from pathlib import Path
from urllib import error, parse, request


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
UPLOAD_ROOT = "uploads"


def normalize_upload_path(path: str) -> str:
    """Validate a custom object path and keep it below uploads/."""
    value = str(path or "").strip()
    value = re.sub(r"/+", "/", value)
    if not value:
        raise ValueError("Upload path cannot be empty")
    if ".." in value:
        raise ValueError('Upload path cannot contain ".."')
    if value.startswith("/") or re.match(r"^[a-zA-Z]:", value):
        raise ValueError("Upload path must be relative")
    if not re.fullmatch(r"[a-zA-Z0-9._/-]+", value):
        raise ValueError("Upload path contains unsupported characters")
    if any(segment.startswith(".") for segment in value.split("/")):
        raise ValueError('Upload path segments cannot start with "."')
    if value == UPLOAD_ROOT or value.endswith("/"):
        raise ValueError("Upload path must include a file name")
    scoped = value if value.startswith(f"{UPLOAD_ROOT}/") else f"{UPLOAD_ROOT}/{value}"
    if len(scoped) > 500:
        raise ValueError("Upload path is too long (maximum: 500 characters)")
    return scoped


def generate_upload_path(
    file_path: Path,
    now: datetime | None = None,
    token: str | None = None,
) -> str:
    """Generate a dated path for a Skill/script upload."""
    date = (now or datetime.now()).strftime("%Y%m%d")
    unique = token or secrets.token_hex(4)
    suffix = file_path.suffix.lower().lstrip(".")
    if not re.fullmatch(r"[a-z0-9]{1,9}", suffix):
        suffix = "bin"
    return f"{UPLOAD_ROOT}/{date}/{unique}.{suffix}"


def default_config_path() -> Path:
    override = os.environ.get("CF_FILE_UPLOAD_CONFIG")
    if override:
        return Path(override).expanduser()
    xdg_config = os.environ.get("XDG_CONFIG_HOME")
    if xdg_config:
        return Path(xdg_config).expanduser() / "cf-file-upload" / "config.json"
    return Path.home() / ".config" / "cf-file-upload" / "config.json"


def load_config(path: Path) -> dict:
    if not path.exists():
        raise SystemExit(
            f"Config not found: {path}\n"
            "Run: python3 scripts/init_config.py"
        )
    return json.loads(path.read_text(encoding="utf-8"))


def url_join(base_url: str, path: str) -> str:
    return base_url.rstrip("/") + "/" + path.lstrip("/")


def build_multipart(
    file_path: Path,
    field_name: str = "file",
    extra_fields: dict | None = None,
) -> tuple[bytes, str]:
    boundary = "----cf-file-upload-" + secrets.token_hex(16)
    filename = file_path.name
    content_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    file_bytes = file_path.read_bytes()

    parts = []
    for name, value in (extra_fields or {}).items():
        parts.append(f"--{boundary}\r\n".encode("utf-8"))
        parts.append(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        parts.append(str(value).encode("utf-8"))
        parts.append(b"\r\n")
    parts += [
        f"--{boundary}\r\n".encode("utf-8"),
        (
            f'Content-Disposition: form-data; name="{field_name}"; '
            f'filename="{filename}"\r\n'
        ).encode("utf-8"),
        f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"),
        file_bytes,
        b"\r\n",
        f"--{boundary}--\r\n".encode("utf-8"),
    ]
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def open_json(opener: request.OpenerDirector, req: request.Request) -> dict:
    try:
        with opener.open(req, timeout=120) as resp:
            raw = resp.read().decode("utf-8")
    except error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(raw).get("message", raw)
        except Exception:
            detail = raw
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Expected JSON response, got: {raw[:300]}") from exc


def login(opener: request.OpenerDirector, base_url: str, password: str, user_agent: str) -> None:
    body = parse.urlencode({"password": password}).encode("utf-8")
    req = request.Request(
        url_join(base_url, "/auth"),
        data=body,
        method="POST",
        headers={
            "User-Agent": user_agent,
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    try:
        opener.open(req, timeout=60).read()
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Authentication failed: HTTP {exc.code} {detail[:200]}") from exc


def upload_one(
    opener: request.OpenerDirector,
    base_url: str,
    file_path: Path,
    user_agent: str,
    path: str | None = None,
) -> dict:
    if not file_path.exists() or not file_path.is_file():
        raise RuntimeError(f"File not found: {file_path}")

    extra_fields = {"path": path} if path else None
    body, content_type = build_multipart(file_path, extra_fields=extra_fields)
    req = request.Request(
        url_join(base_url, "/upload"),
        data=body,
        method="POST",
        headers={
            "User-Agent": user_agent,
            "Content-Type": content_type,
            "Content-Length": str(len(body)),
        },
    )
    data = open_json(opener, req)
    if not data.get("ok"):
        raise RuntimeError(data.get("message", "Upload failed"))
    return data


def delete_one(opener: request.OpenerDirector, base_url: str, target: str) -> dict:
    """Delete an object by key or full URL."""
    body = parse.urlencode({"path": target}).encode("utf-8")
    req = request.Request(
        url_join(base_url, "/delete"),
        data=body,
        method="POST",
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )
    return open_json(opener, req)


def markdown_for(file_path: Path, url: str) -> str:
    mime = mimetypes.guess_type(file_path.name)[0] or ""
    label = file_path.name.replace("[", "\\[").replace("]", "\\]")
    if mime.startswith("image/"):
        return f"![{label}]({url})"
    return f"[{label}]({url})"


def plain_output(results: list[dict]) -> str:
    chunks = []
    for result in results:
        file_path = Path(result["file"])
        data = result["response"]
        lines = [f"file: {file_path}"]
        if data.get("globalUrl"):
            lines.append(f"global: {data['globalUrl']}")
            lines.append(f"markdown_global: {markdown_for(file_path, data['globalUrl'])}")
        if data.get("chinaUrl"):
            lines.append(f"china: {data['chinaUrl']}")
            lines.append(f"markdown_china: {markdown_for(file_path, data['chinaUrl'])}")
        if data.get("key"):
            label = "key" if data.get("globalUrl") else "deleted"
            lines.append(f"{label}: {data['key']}")
        if data.get("message") and not data.get("globalUrl"):
            lines.append(f"message: {data['message']}")
        chunks.append("\n".join(lines))
    return "\n\n".join(chunks)


def main() -> int:
    parser = argparse.ArgumentParser(description="Upload files and print public links.")
    parser.add_argument("files", nargs="+", type=Path, help="File paths to upload")
    parser.add_argument("--config", type=Path, default=default_config_path(), help="Config file path")
    parser.add_argument("--base-url", help="Override Worker base URL")
    parser.add_argument("--password", help="Override upload password")
    parser.add_argument("--path", help="Save path below uploads/ (overwrite existing file, e.g. avatar.png or blog/cover.jpg). Auto-appends original extension if omitted")
    parser.add_argument("--delete", action="store_true", help="Delete files by key or URL instead of uploading (files argument is treated as keys/URLs)")
    parser.add_argument("--user-agent", help="Override the browser-like User-Agent header")
    parser.add_argument("--format", choices=["plain", "json"], default="plain")
    args = parser.parse_args()

    config = load_config(args.config.expanduser())
    base_url = (args.base_url or config.get("base_url") or "").rstrip("/")
    password = args.password or os.environ.get("CF_FILE_UPLOAD_PASSWORD") or config.get("password")
    path = args.path or os.environ.get("CF_FILE_UPLOAD_PATH") or None
    if path and not args.delete:
        path = normalize_upload_path(path)
        if len(args.files) > 1:
            parser.error("--path/CF_FILE_UPLOAD_PATH can only be used with one file")
    user_agent = (
        args.user_agent
        or os.environ.get("CF_FILE_UPLOAD_USER_AGENT")
        or config.get("user_agent")
        or DEFAULT_USER_AGENT
    )
    if not base_url:
        raise SystemExit("Missing base_url. Run scripts/init_config.py")
    if not password:
        raise SystemExit("Missing password. Run scripts/init_config.py or set CF_FILE_UPLOAD_PASSWORD")

    cookie_jar = http.cookiejar.CookieJar()
    opener = request.build_opener(request.HTTPCookieProcessor(cookie_jar))
    opener.addheaders = [("User-Agent", user_agent)]
    login(opener, base_url, password, user_agent)

    results = []
    if args.delete:
        # 删除模式：files 参数按 key 或完整 URL 处理
        for target in args.files:
            data = delete_one(opener, base_url, str(target))
            results.append({"file": str(target), "response": data})
    else:
        for file_path in args.files:
            resolved = file_path.expanduser()
            upload_path = path or generate_upload_path(resolved)
            data = upload_one(opener, base_url, resolved, user_agent, path=upload_path)
            results.append({"file": str(resolved), "response": data})

    if args.format == "json":
        print(json.dumps(results, ensure_ascii=False, indent=2))
    else:
        print(plain_output(results))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)
