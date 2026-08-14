---
name: cf-file-upload
description: Upload local files or attachments to the user's Cloudflare Worker file host and return public links. Use when the user asks to upload an image, file, document, archive, attachment, or other local artifact and wants a shareable URL, Markdown link, global link, or China-optimized link from the current cf-image-worker style service.
---

# CF File Upload

## Overview

Use this skill to upload local files to the user's Cloudflare Worker file service. The current worker authenticates by password at `POST /auth`, then accepts multipart uploads at `POST /upload` with form field `file`.

The upload script sends a Chrome-like `User-Agent` by default because Cloudflare security rules may block Python's default client with HTTP 403 / 1010.

## First-Time Setup

If no config exists, initialize it before uploading:

```bash
python3 scripts/init_config.py
```

The script prompts for:

- Worker base URL, for example `https://image.example.workers.dev`
- Optional local account label
- Upload password

The config is saved to `~/.config/cf-file-upload/config.json` with mode `0600`. The current Worker does not submit a username; the account label is only for local identification.

For non-interactive setup, use:

```bash
python3 scripts/init_config.py --base-url https://example.com --account main
```

The password prompt is still hidden. To avoid storing a password, set `CF_FILE_UPLOAD_PASSWORD` when running the upload script.

If Cloudflare rules require a different client identity, set `CF_FILE_UPLOAD_USER_AGENT` or pass `--user-agent`.

## Upload Workflow

1. Confirm the file path exists locally.
2. Run the upload script from this skill directory:

```bash
python3 scripts/upload_file.py /path/to/file
```

3. Return the script output to the user. Prefer the `global` link unless the user asks for the China-optimized link.

Upload multiple files by passing multiple paths:

```bash
python3 scripts/upload_file.py /path/a.png /path/report.pdf
```

### Overwrite a specific path (指定路径覆盖更新)

Pass `--path` to save the file at a fixed path and overwrite any existing object there (the public URL stays the same). Use this when the user asks to update/replace an existing image or file in place:

```bash
python3 scripts/upload_file.py --path avatar.png /path/to/new.png
python3 scripts/upload_file.py --path blog/cover.jpg /path/to/cover.jpg
```

- The path may contain subdirectories (`blog/cover.jpg`).
- If the path has no extension, the original file's extension is appended automatically (e.g. `--path avatar` with a PNG becomes `avatar.png`).
- Paths must be relative and use only letters, digits, `.`, `_`, `-`, `/`; traversal (`..`) and absolute paths are rejected by the worker.
- Without `--path`, a random `web/YYYYMMDD/<uuid>.<ext>` path is generated as before.
- The environment variable `CF_FILE_UPLOAD_PATH` can be used instead of `--path`.

### Delete files (删除文件)

Pass `--delete` to remove objects from the worker instead of uploading. The positional arguments are treated as keys or full URLs:

```bash
python3 scripts/upload_file.py --delete avatar.png
python3 scripts/upload_file.py --delete https://static.zhire.de/blog/cover.jpg
python3 scripts/upload_file.py --delete blog/old-a.png blog/old-b.png
```

- Accepts either a bare key (`avatar.png`) or a full service URL (the path is extracted automatically).
- Deleting keeps the URL returning 404 afterwards; use when the user asks to remove a file, take down a link, or clean up.
- The web upload page also shows a delete button next to each uploaded file.

For machine-readable output:

```bash
python3 scripts/upload_file.py --format json /path/to/file
```

## Output Rules

- For images, include Markdown image syntax: `![filename](url)`.
- For non-image files, include Markdown link syntax: `[filename](url)`.
- If the script returns both `globalUrl` and `chinaUrl`, preserve both labels.
- If authentication fails, rerun `scripts/init_config.py` to refresh the Worker URL or password.
- If network access is restricted by the host environment, request the required approval and rerun the same upload command.
