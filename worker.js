// 导入 AWS SDK
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const TELEGRAM_BOT_TOKEN = "TELEGRAM_BOT_TOKEN_PLACEHOLDER"; // 填入TG机器人token
const CHAT_ID = ["CHAT_ID_PLACEHOLDER"]; // 填入可以访问机器人的用户ID
const BUCKET_NAME = "static"; // 填入绑定的R2存储库变量名
const BASE_URL = "https://static.marlon.life" // 填入自己的R2访问域名
const BASE_CF_URL = "https://static.zhire.de" // 填入反向代理域名

// 配置 S3 客户端
const s3Client = new S3Client({
    region: 'ap-shanghai', // 例如 'us-east-1'
    endpoint: 'https://cos.ap-shanghai.myqcloud.com',
    credentials: {
        accessKeyId: 'AWS_ACCESS_KEY_PLACEHOLDER',
        secretAccessKey: 'AWS_SECRET_KEY_PLACEHOLDER'
    }
});

export default {
    async fetch(request, env) {
        const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
        const url = new URL(request.url);

        // 处理文件上传
        async function handleMediaUpload(chatId, fileId, isDocument = false, fileName = null) {
            try {
                await sendMessage(chatId, '收到文件, 正在上传ing', TELEGRAM_API_URL);
                const fileUrl = await getFileUrl(fileId, TELEGRAM_BOT_TOKEN);
                const uploadResult = await uploadImageToR2(fileUrl, env[BUCKET_NAME], isDocument, env, fileName);

                if (uploadResult.ok) {
                    await sendMessage(chatId, uploadResult.message, TELEGRAM_API_URL);
                } else {
                    await sendMessage(chatId, uploadResult.message, TELEGRAM_API_URL);
                }
            } catch (error) {
                console.error('处理文件失败:', error);
                await sendMessage(chatId, '文件处理失败，请稍后再试。', TELEGRAM_API_URL);
            }
        }

        // 上传到R2并同步上传S3
        async function uploadImageToR2(imageUrl, bucket, isDocument = false, env, fileName = null) {
            try {
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error('下载文件失败');

                const buffer = await response.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);

                // 获取文件类型（不再限制类型）
                let fileExt = 'bin';
                let mimeType = 'application/octet-stream';
                
                // 如果提供了原始文件名，从中提取扩展名
                if (fileName) {
                    const extractedExt = fileName.split('.').pop().toLowerCase();
                    if (extractedExt && extractedExt.length > 0 && extractedExt.length < 10) {
                        fileExt = extractedExt;
                        // 尝试根据扩展名设置MIME类型
                        const mimeTypes = {
                            'jpg': 'image/jpeg',
                            'jpeg': 'image/jpeg',
                            'png': 'image/png',
                            'gif': 'image/gif',
                            'webp': 'image/webp',
                            'svg': 'image/svg+xml',
                            'pdf': 'application/pdf',
                            'doc': 'application/msword',
                            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                            'xls': 'application/vnd.ms-excel',
                            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'ppt': 'application/vnd.ms-powerpoint',
                            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                            'zip': 'application/zip',
                            'rar': 'application/x-rar-compressed',
                            '7z': 'application/x-7z-compressed',
                            'mp3': 'audio/mpeg',
                            'mp4': 'video/mp4',
                            'avi': 'video/x-msvideo',
                            'mov': 'video/quicktime',
                            'txt': 'text/plain',
                            'html': 'text/html',
                            'css': 'text/css',
                            'js': 'application/javascript',
                            'json': 'application/json',
                            'xml': 'application/xml',
                        };
                        mimeType = mimeTypes[fileExt] || 'application/octet-stream';
                    }
                }

                // 生成文件路径
                const date = new Date();
                const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
                const shortUUID = crypto.randomUUID().split('-')[0];
                const key = `tg/${formattedDate}/${shortUUID}.${fileExt}`;

                // 上传到R2
                await bucket.put(key, buffer, {
                    httpMetadata: { contentType: mimeType }
                });

                // 同步上传到S3
                let s3Result = await uploadImageToS3(buffer, key, mimeType, env);

                // 构建返回信息
                const buildMessage = (prefix, baseUrl) =>
                    `${prefix}直链\n${baseUrl}/${key}\nMarkdown\n![img](${baseUrl}/${key})`;

                const r2GlobalMessage = buildMessage("全球直连", BASE_CF_URL);
                const r2ChinaMessage = buildMessage("大陆优化", BASE_URL);

                let resultMessage = "✅ 图片上传成功！\n";
                resultMessage += r2GlobalMessage + "\n" + r2ChinaMessage;

                if (s3Result.ok) {
                    resultMessage += `\nS3 存储\n${s3Result.s3Url}\nMarkdown\n![img](${s3Result.s3Url})`;
                } else if (s3Result.message !== "未配置S3") {
                    resultMessage += `\n⚠️ S3 上传失败: ${s3Result.message}`;
                }

                return { ok: true, message: resultMessage };
            } catch (error) {
                console.error('上传失败:', error);
                return { ok: false, message: '文件上传失败，请稍后再试。' };
            }
        }

        // 设置 Webhook
        if (url.pathname === '/setWebhook') {
            const webhookUrl = `${url.protocol}//${url.host}/webhook`;
            const webhookResponse = await setWebhook(webhookUrl, TELEGRAM_API_URL);
            if (webhookResponse.ok) {
                return new Response(`Webhook set successfully to ${webhookUrl}`);
            }
            return new Response('Failed to set webhook', { status: 500 });
        }

        // 处理Telegram回调
        if (url.pathname === '/webhook' && request.method === 'POST') {
            try {
                const update = await request.json();

                if (!update.message) return new Response('OK');
                const chatId = update.message.chat.id;

                // 验证用户权限
                if (!CHAT_ID.includes(chatId.toString())) {
                    return new Response('Unauthorized access', { status: 403 });
                }

                // 处理文本消息
                if (update.message.text) {
                    await sendMessage(chatId, '请发给我一张图片', TELEGRAM_API_URL);
                    return new Response('OK');
                }

                // 处理文档文件
                if (update.message.document) {
                    const doc = update.message.document;
                    // 传递文件名以便提取正确的扩展名
                    await handleMediaUpload(chatId, doc.file_id, true, doc.file_name);
                    return new Response('OK');
                }

                // 处理图片消息
                if (update.message.photo) {
                    const fileId = update.message.photo.slice(-1)[0].file_id;
                    await handleMediaUpload(chatId, fileId);
                    return new Response('OK');
                }

                return new Response('OK');
            } catch (err) {
                console.error(err);
                return new Response('Error processing request', { status: 500 });
            }
        }

        return new Response('Not found', { status: 404 });
    },
};

async function uploadImageToS3(buffer, key, mimeType, env) {
    try {
        // 准备上传到 S3 的参数
        const uploadParams = {
            Bucket: 'scf-deploy-ap-shanghai-1255094666',
            Key: key, // 文件在 S3 中的路径
            Body: buffer,
            ContentType: mimeType
        };

        // 上传到 S3
        const command = new PutObjectCommand(uploadParams);
        await s3Client.send(command);
        return { ok: false, message: "未配置S3", s3Url: "" };
    } catch (error) {
        return { ok: false, message: error, s3Url: "" };
    }
}

// ========== 工具函数 ==========
function detectImageType(uint8Array) {
    // JPEG检测
    if (uint8Array.length >= 3 &&
        uint8Array[0] === 0xFF &&
        uint8Array[1] === 0xD8 &&
        uint8Array[2] === 0xFF) {
        return { mime: 'image/jpeg', ext: 'jpg' };
    }

    // PNG检测
    const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    if (uint8Array.length >= pngSignature.length) {
        const isPng = pngSignature.every(
            (byte, index) => uint8Array[index] === byte
        );
        if (isPng) return { mime: 'image/png', ext: 'png' };
    }

    return null;
}

async function getFileUrl(fileId, botToken) {
    const response = await fetch(
        `https://api.telegram.org/bot${botToken}/getFile?file_id=${fileId}`
    );
    const data = await response.json();
    
    // Check if the result exists and has a file_path
    if (!data.result || !data.result.file_path) {
        // Check if the file is too large (Telegram has a 20MB limit for bot API)
        if (data.description && data.description.includes('file is too big')) {
            throw new Error('文件大小超过Telegram的20MB限制，无法处理');
        } else {
            throw new Error('无法获取文件路径: ' + JSON.stringify(data));
        }
    }
    
    return `https://api.telegram.org/file/bot${botToken}/${data.result.file_path}`;
}

async function sendMessage(chatId, text, apiUrl) {
    await fetch(`${apiUrl}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
        }),
    });
}

async function setWebhook(webhookUrl, apiUrl) {
    const response = await fetch(`${apiUrl}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl }),
    });
    return response.json();
}