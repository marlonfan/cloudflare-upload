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
