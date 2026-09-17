# cf-file-upload Skill

让 AI 助手（Claude Code / Cursor / 其他支持 skills.sh 的 agent）上传文件到 Cloudflare Worker 文件托管服务，返回公开链接。

## 一句话安装

```bash
npx skills add marlonfan/cloudflare-upload@cf-file-upload
```

> 全局安装加 `-g`，跳过确认加 `-y`：
> `npx skills add marlonfan/cloudflare-upload@cf-file-upload -g -y`

不安装直接体验：

```bash
npx skills use marlonfan/cloudflare-upload@cf-file-upload
```

## 首次配置

安装后需要配置 Worker 地址和上传密码（向服务提供者索取）：

```bash
# 全局安装后
python3 ~/.claude/skills/cf-file-upload/scripts/init_config.py
# 项目级安装后
python3 ./.claude/skills/cf-file-upload/scripts/init_config.py
```

按提示填入 `Worker base URL` 和 `Upload password`。配置保存在 `~/.config/cf-file-upload/config.json`（权限 600）。
不想落盘密码可改用环境变量：`CF_FILE_UPLOAD_PASSWORD`。

## 用法

```bash
# 上传（脚本自动生成 uploads/YYYYMMDD/随机路径）
python3 scripts/upload_file.py /path/to/file.png

# 指定路径上传 / 覆盖更新（自动限制在 uploads/ 下）
python3 scripts/upload_file.py --path avatar.png /path/to/new.png
python3 scripts/upload_file.py --path blog/cover.jpg /path/to/cover.jpg

# 删除文件（支持 key 或完整 URL）
python3 scripts/upload_file.py --delete uploads/avatar.png
python3 scripts/upload_file.py --delete https://static.zhire.de/uploads/blog/cover.jpg

# 机器可读输出
python3 scripts/upload_file.py --format json /path/to/file
```

普通上传和指定路径上传都会收口到 `uploads/`。例如 `--path blog/cover.jpg`
实际写入 `uploads/blog/cover.jpg`。覆盖后对象 key 不变，但返回链接会携带新的
`?v=` 参数，用来绕过 CDN/浏览器旧缓存。此目录规则只属于 Skill/脚本，
不会改变网页上传或 Telegram 机器人的目录。

## 文件结构

```
SKILL.md             # Skill 指令（agent 读取）
scripts/upload_file.py   # 上传/覆盖/删除脚本
scripts/init_config.py   # 首次配置向导
agents/openai.yaml       # Agent 接口描述
```
