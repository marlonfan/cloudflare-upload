#!/usr/bin/env bash
# ============================================================
# 统一部署脚本 - Cloudflare Worker (cf-image-worker)
#
# 用法:
#   ./deploy.sh             # 设置生产 secrets + 部署 Worker
#   ./deploy.sh secrets     # 只更新生产 secrets（不部署）
#   ./deploy.sh dev         # 本地开发（自动生成 .dev.vars 后启动 wrangler dev）
#   ./deploy.sh doctor      # 检查登录状态与 .env 配置
#
# 说明:
#   - 机密配置唯一真源是 .env（已被 .gitignore 忽略，勿提交）
#   - 部署时会自动把 .env 里的机密项通过 `wrangler secret bulk` 写入生产
#   - 本地开发时 wrangler 只认 .dev.vars，脚本会自动从 .env 生成
#   - 首次使用需先登录: npx wrangler login
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

# ---- 加载 .env ----
if [[ ! -f .env ]]; then
    echo "❌ 缺少 .env 文件，请先执行: cp .env.example .env 并填入真实值" >&2
    exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

# 需要作为生产 secret 的键（其余为公开配置，走代码默认值或 wrangler.jsonc vars）
SECRET_KEYS=(TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_IDS WEB_UPLOAD_PASSWORD)

require_login() {
    if ! npx wrangler whoami >/dev/null 2>&1; then
        echo "❌ 未登录 Cloudflare，请先运行: npx wrangler login" >&2
        exit 1
    fi
}

cmd_secrets() {
    require_login
    local tmp
    tmp="$(mktemp)"
    trap 'rm -f "$tmp"' EXIT

    for key in "${SECRET_KEYS[@]}"; do
        if [[ -z "${!key:-}" ]]; then
            echo "⚠️  跳过 $key（.env 中未配置）"
            continue
        fi
        echo "${key}=${!key}" >> "$tmp"
    done

    if [[ ! -s "$tmp" ]]; then
        echo "❌ .env 中没有可设置的 secret" >&2
        exit 1
    fi

    echo "🔐 写入生产 secrets..."
    npx wrangler secret bulk "$tmp"
}

cmd_deploy() {
    cmd_secrets
    echo "🚀 部署 Worker..."
    npx wrangler deploy "$@"
    echo ""
    echo "✅ 部署完成。若更换过 Telegram token，需重新设置 webhook："
    echo "   访问 https://<你的worker域名>/setWebhook"
}

cmd_dev() {
    cp .env .dev.vars
    echo "✅ 已从 .env 生成 .dev.vars"
    echo "🚀 启动本地开发服务: http://localhost:8787"
    exec npx wrangler dev "$@"
}

cmd_doctor() {
    echo "── Cloudflare 登录 ──"
    if npx wrangler whoami 2>/dev/null | grep -q "associated with"; then
        npx wrangler whoami 2>/dev/null | grep -m1 "associated with"
    else
        echo "❌ 未登录（需要先执行: npx wrangler login）"
    fi

    echo "── 机密配置（.env）──"
    for key in "${SECRET_KEYS[@]}"; do
        if [[ -n "${!key:-}" ]]; then
            local v="${!key}"
            echo "  ✅ $key = ${v:0:4}...（已配置，${#v} 字符）"
        else
            echo "  ❌ $key（未配置）"
        fi
    done

    echo "── 公开配置（.env）──"
    for key in R2_BUCKET_NAME BASE_CF_URL BASE_URL; do
        if [[ -n "${!key:-}" ]]; then
            echo "  ✅ $key = ${!key}"
        else
            echo "  ⚠️  $key（未配置，使用 worker.js 默认值）"
        fi
    done
}

case "${1:-deploy}" in
    dev)      shift; cmd_dev "$@" ;;
    secrets)  cmd_secrets ;;
    doctor)   cmd_doctor ;;
    deploy)   shift; cmd_deploy "$@" ;;
    *)
        echo "用法: $0 [deploy|secrets|dev|doctor]" >&2
        exit 1
        ;;
esac
