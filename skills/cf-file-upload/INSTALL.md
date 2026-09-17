# CF File Upload 安装指南

以下步骤面向 AI Agent，部分步骤需要用户在浏览器或终端中配合完成。

## 环境要求

开始安装之前，请确保环境中已安装：

- Node.js（npm/npx）
- Python 3（仅使用命令行上传脚本时需要）

## 第 1 步 安装

```shell
# 安装 SKILL（必需）
npx -y skills add marlonfan/cloudflare-upload@cf-file-upload -g -y
```

## 第 2 步 配置连接信息

Agent 运行以下命令，并让用户协助提供 Worker 地址和上传密码。

```shell
python3 ~/.claude/skills/cf-file-upload/scripts/init_config.py
```

按提示依次输入：

1. Worker base URL，例如 `https://image.marlonfan.workers.dev`
2. 本地账户标签（可选，仅本机标识用）
3. Upload password（隐藏输入，向服务提供者索取）

配置保存在 `~/.config/cf-file-upload/config.json`（权限 600）。不想落盘密码时，可改用环境变量 `CF_FILE_UPLOAD_PASSWORD`。

## 第 3 步 验证

```shell
python3 ~/.claude/skills/cf-file-upload/scripts/upload_file.py --help
```

返回 `--path`、`--delete` 等参数说明即安装成功。也可直接上传一个小文件实测：

```shell
echo test > /tmp/smoke.txt
python3 ~/.claude/skills/cf-file-upload/scripts/upload_file.py /tmp/smoke.txt
```

输出中应包含 `global:` 开头的公开链接。

## 能力一览

```shell
# 上传（脚本自动生成 uploads/YYYYMMDD/随机路径）
python3 scripts/upload_file.py /path/to/file.png

# 指定路径上传 / 覆盖更新（自动限制在 uploads/ 下）
python3 scripts/upload_file.py --path avatar.png /path/to/new.png

# 删除文件（支持 key 或完整 URL）
python3 scripts/upload_file.py --delete uploads/avatar.png
python3 scripts/upload_file.py --delete https://static.zhire.de/uploads/blog/cover.jpg

# 机器可读输出
python3 scripts/upload_file.py --format json /path/to/file
```

更多细节，可参考 [cf-file-upload Skill 说明](https://github.com/marlonfan/cloudflare-upload/tree/main/skills/cf-file-upload)。
