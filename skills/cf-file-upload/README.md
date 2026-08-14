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
# 上传（自动生成随机路径，返回 global/china 双链接）
python3 scripts/upload_file.py /path/to/file.png

# 指定路径上传 / 覆盖更新（URL 不变，无扩展名自动补原文件扩展名）
python3 scripts/upload_file.py --path avatar.png /path/to/new.png
python3 scripts/upload_file.py --path blog/cover.jpg /path/to/cover.jpg

# 删除文件（支持 key 或完整 URL）
python3 scripts/upload_file.py --delete avatar.png
python3 scripts/upload_file.py --delete https://static.zhire.de/blog/cover.jpg

# 机器可读输出
python3 scripts/upload_file.py --format json /path/to/file
```

## 文件结构

```
SKILL.md             # Skill 指令（agent 读取）
scripts/upload_file.py   # 上传/覆盖/删除脚本
scripts/init_config.py   # 首次配置向导
agents/openai.yaml       # Agent 接口描述
```
