# Cloudflare 图床 Worker + cf-file-upload Skill

自建图床/文件托管服务：Cloudflare Worker + R2 存储，支持网页上传、Telegram 机器人上传、指定路径覆盖更新、删除。

## 📦 给别人的 Agent 安装这个 Skill（一句话）

让你的 AI 助手（Claude Code / Cursor / 其他支持 skills.sh 的 agent）拥有上传文件到本服务的能力：

```bash
npx skills add marlonfan/cloudflare-upload@cf-file-upload
```

> 装到全局（用户级）：加 `-g`；跳过确认：加 `-y`：
> `npx skills add marlonfan/cloudflare-upload@cf-file-upload -g -y`

安装后**首次使用需要配置连接信息**（Worker 地址 + 上传密码，找服务提供者要）：

```bash
# 全局安装后（默认位置）
python3 ~/.claude/skills/cf-file-upload/scripts/init_config.py
# 项目级安装后
python3 ./.claude/skills/cf-file-upload/scripts/init_config.py
```

按提示填入 `Worker base URL` 和 `Upload password` 即可，配置保存在 `~/.config/cf-file-upload/config.json`（权限 600）。

不想安装？也可以直接用 `npx skills use` 生成提示词：

```bash
npx skills use marlonfan/cloudflare-upload@cf-file-upload
```

完整的面向 AI Agent 的分步安装指南见 [INSTALL.md](INSTALL.md)。

## 🛠️ Skill 能力

```bash
# 上传（自动生成随机路径）
python3 scripts/upload_file.py /path/to/file.png

# 指定路径上传 / 覆盖更新（URL 不变）
python3 scripts/upload_file.py --path avatar.png /path/to/new.png

# 删除文件（key 或完整 URL）
python3 scripts/upload_file.py --delete avatar.png
python3 scripts/upload_file.py --delete https://static.zhire.de/blog/cover.jpg
```

## 🚀 部署（服务提供者）

```bash
cp .env.example .env    # 填入真实密钥（.env 已被 git 忽略）
npx wrangler login      # 首次登录
./deploy.sh             # 设置 secrets + 部署，一键完成
```

- 机密配置从环境变量加载：本地开发读取 `.env`，生产用 `wrangler secret put`
- `./deploy.sh dev` 本地开发，`./deploy.sh doctor` 检查配置

## 📁 项目结构

```
worker.js                        # Worker 主逻辑（上传/覆盖/删除/TG 机器人）
wrangler.jsonc                   # Wrangler 配置（R2 绑定）
deploy.sh                        # 一键部署脚本
.env.example                     # 环境变量模板
skills/cf-file-upload/           # 可发布的 Agent Skill
```
