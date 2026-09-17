// ========== Cookie 工具函数 ==========
function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;

    cookieHeader.split(';').forEach(cookie => {
        const [name, ...rest] = cookie.split('=');
        const value = rest.join('=').trim();
        if (name) {
            cookies[name.trim()] = value;
        }
    });
    return cookies;
}

function generateAuthToken(password) {
    const timestamp = Date.now();
    const data = `${password}|${timestamp}`;
    return btoa(data);
}

function verifyAuthToken(token, correctPassword) {
    try {
        const decoded = atob(token);
        const [password, timestamp] = decoded.split('|');

        // 验证密码
        if (password !== correctPassword) {
            return false;
        }

        // 验证时间（24小时有效期）
        const now = Date.now();
        const tokenAge = now - parseInt(timestamp);
        const maxAge = 24 * 60 * 60 * 1000; // 24小时

        if (tokenAge > maxAge) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

// 登录页面
function getLoginHTML(errorMessage = '') {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录 - 图床上传</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 400px;
            width: 100%;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 28px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            color: #666;
            margin-bottom: 8px;
            font-weight: 500;
        }
        input[type="password"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="password"]:focus {
            outline: none;
            border-color: #667eea;
        }
        .btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        .btn:hover {
            transform: translateY(-2px);
        }
        .error {
            background: #f8d7da;
            color: #721c24;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid #f5c6cb;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 图床登录</h1>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
        <form method="POST" action="/auth">
            <div class="form-group">
                <label for="password">请输入访问密码</label>
                <input type="password" id="password" name="password" required autofocus>
            </div>
            <button type="submit" class="btn">登录</button>
        </form>
    </div>
</body>
</html>`;
}

// HTML 上传页面
function getUploadHTML() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>图床上传</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
            font-size: 28px;
        }
        .upload-area {
            border: 2px dashed #667eea;
            border-radius: 10px;
            padding: 40px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 20px;
        }
        .upload-area:hover {
            border-color: #764ba2;
            background: #f8f9ff;
        }
        .upload-area.dragover {
            border-color: #764ba2;
            background: #f0f4ff;
            transform: scale(1.02);
        }
        .upload-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .upload-text {
            color: #666;
            font-size: 16px;
        }
        input[type="file"] {
            display: none;
        }
        .file-info {
            background: #f8f9ff;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: none;
        }
        .file-info.show {
            display: block;
        }
        .file-name {
            color: #333;
            font-weight: 500;
            margin-bottom: 5px;
        }
        .file-size {
            color: #666;
            font-size: 14px;
        }
        .file-preview {
            display: none;
            margin-top: 15px;
            max-height: 400px;
            overflow-y: auto;
        }
        .file-preview.show {
            display: block;
        }
        .preview-item {
            display: flex;
            align-items: center;
            padding: 10px;
            background: white;
            border-radius: 8px;
            margin-bottom: 10px;
            border: 1px solid #e0e0e0;
        }
        .preview-thumbnail {
            width: 60px;
            height: 60px;
            object-fit: cover;
            border-radius: 6px;
            margin-right: 15px;
            background: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            flex-shrink: 0;
        }
        .preview-thumbnail img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 6px;
        }
        .preview-info {
            flex: 1;
            min-width: 0;
        }
        .preview-name {
            font-weight: 500;
            color: #333;
            margin-bottom: 4px;
            word-break: break-all;
            font-size: 14px;
        }
        .preview-size {
            color: #666;
            font-size: 12px;
        }
        .paste-hint {
            text-align: center;
            color: #999;
            font-size: 13px;
            margin-top: 10px;
            padding: 8px;
            background: #f8f9ff;
            border-radius: 6px;
        }
        .path-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 14px;
            margin-bottom: 15px;
            outline: none;
            transition: border-color 0.3s;
            box-sizing: border-box;
        }
        .path-input:focus {
            border-color: #667eea;
        }
        .path-hint {
            font-size: 12px;
            color: #999;
            margin: -8px 0 15px;
        }
        .btn {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        .btn:hover:not(:disabled) {
            transform: translateY(-2px);
        }
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .progress {
            width: 100%;
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin: 20px 0;
            overflow: hidden;
            display: none;
        }
        .progress.show {
            display: block;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            width: 0%;
            transition: width 0.3s ease;
        }
        .progress-text {
            text-align: center;
            color: #666;
            font-size: 13px;
            margin-top: 8px;
            display: none;
        }
        .progress-text.show {
            display: block;
        }
        .result {
            margin-top: 20px;
            padding: 15px;
            border-radius: 8px;
            display: none;
        }
        .result.show {
            display: block;
        }
        .result.success {
            background: #d4edda;
            color: #155724;
            border: 1px solid #c3e6cb;
        }
        .result.error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
        }
        .url-item {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 5px;
        }
        .url-label {
            font-weight: 600;
            margin-bottom: 5px;
            display: block;
        }
        .url-content {
            font-family: monospace;
            font-size: 12px;
            word-break: break-all;
            color: #333;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            margin-top: 5px;
            cursor: pointer;
            position: relative;
        }
        .url-content:hover {
            background: #e9ecef;
        }
        .copy-hint {
            position: absolute;
            right: 5px;
            top: 5px;
            background: #667eea;
            color: white;
            padding: 2px 8px;
            border-radius: 3px;
            font-size: 10px;
            opacity: 0;
            transition: opacity 0.3s;
        }
        .url-content:hover .copy-hint {
            opacity: 1;
        }
        .delete-btn {
            margin-top: 8px;
            padding: 6px 14px;
            border: 1px solid #f5c6cb;
            background: #fff5f5;
            color: #c0392b;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.3s;
        }
        .delete-btn:hover {
            background: #f8d7da;
        }
        .delete-btn:disabled {
            opacity: 0.6;
            cursor: default;
        }
        .delete-btn.deleted {
            border-color: #d4edda;
            background: #f0fff4;
            color: #27ae60;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🖼️ 图床上传</h1>

        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">📁</div>
            <div class="upload-text">点击选择文件或拖拽文件到这里</div>
            <div class="upload-text" style="font-size: 14px; margin-top: 10px; color: #999;">支持所有文件类型</div>
        </div>

        <div class="paste-hint">💡 提示：可以使用 Ctrl+V (Mac: Cmd+V) 直接粘贴图片</div>

        <input type="text" class="path-input" id="savePath" placeholder="保存路径（可选）如: avatar.png 或 blog/cover.jpg">
        <div class="path-hint">填写路径后将覆盖该路径下的旧文件并返回带新版本号的链接；留空则自动生成随机路径</div>

        <input type="file" id="fileInput" multiple>

        <div class="file-info" id="fileInfo">
            <div class="file-name" id="fileName"></div>
            <div class="file-size" id="fileSize"></div>
            <div class="file-preview" id="filePreview"></div>
        </div>

        <button class="btn" id="uploadBtn" disabled>上传文件</button>

        <div class="progress" id="progress">
            <div class="progress-bar" id="progressBar"></div>
        </div>
        <div class="progress-text" id="progressText"></div>

        <div class="result" id="result"></div>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileInfo = document.getElementById('fileInfo');
        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        const filePreview = document.getElementById('filePreview');
        const uploadBtn = document.getElementById('uploadBtn');
        const progress = document.getElementById('progress');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const result = document.getElementById('result');

        let selectedFiles = [];

        uploadArea.addEventListener('click', () => fileInput.click());

        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                handleFileSelect(files);
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFileSelect(Array.from(e.target.files));
            }
        });

        // 监听粘贴事件
        document.addEventListener('paste', (e) => {
            const items = e.clipboardData.items;
            const files = [];

            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.kind === 'file') {
                    const file = item.getAsFile();
                    if (file) {
                        files.push(file);
                    }
                }
            }

            if (files.length > 0) {
                e.preventDefault();
                handleFileSelect(files);
            }
        });

        function handleFileSelect(files) {
            selectedFiles = files;
            const totalSize = files.reduce((sum, file) => sum + file.size, 0);

            fileName.textContent = files.length === 1
                ? '文件名: ' + files[0].name
                : '已选择 ' + files.length + ' 个文件';
            fileSize.textContent = '总大小: ' + formatFileSize(totalSize);

            // 生成预览
            generatePreviews(files);

            fileInfo.classList.add('show');
            uploadBtn.disabled = false;
            result.classList.remove('show');
        }

        function generatePreviews(files) {
            filePreview.innerHTML = '';
            if (files.length === 0) {
                filePreview.classList.remove('show');
                return;
            }

            filePreview.classList.add('show');

            Array.from(files).forEach((file, index) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';

                const thumbnail = document.createElement('div');
                thumbnail.className = 'preview-thumbnail';

                // 判断是否是图片
                if (file.type.startsWith('image/')) {
                    const img = document.createElement('img');
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        img.src = e.target.result;
                    };
                    reader.readAsDataURL(file);
                    thumbnail.appendChild(img);
                } else {
                    // 根据文件类型显示不同图标
                    const icon = getFileIcon(file.type, file.name);
                    thumbnail.textContent = icon;
                }

                const info = document.createElement('div');
                info.className = 'preview-info';

                const name = document.createElement('div');
                name.className = 'preview-name';
                name.textContent = file.name;

                const size = document.createElement('div');
                size.className = 'preview-size';
                size.textContent = formatFileSize(file.size);

                info.appendChild(name);
                info.appendChild(size);

                previewItem.appendChild(thumbnail);
                previewItem.appendChild(info);

                filePreview.appendChild(previewItem);
            });
        }

        function getFileIcon(mimeType, fileName) {
            // 视频
            if (mimeType.startsWith('video/')) return '🎬';
            // 音频
            if (mimeType.startsWith('audio/')) return '🎵';
            // PDF
            if (mimeType === 'application/pdf') return '📄';
            // 压缩文件
            if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
            // 文档
            if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
            if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
            if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📽️';
            // 代码文件
            const ext = fileName.split('.').pop().toLowerCase();
            if (['js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml'].includes(ext)) return '💻';
            if (['py', 'java', 'cpp', 'c', 'go', 'rs'].includes(ext)) return '💻';
            // 其他
            return '📎';
        }

        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
        }

        uploadBtn.addEventListener('click', async () => {
            if (selectedFiles.length === 0) return;

            const savePath = document.getElementById('savePath').value.trim();
            if (savePath && selectedFiles.length > 1) {
                alert('指定保存路径时仅支持上传单个文件');
                return;
            }

            uploadBtn.disabled = true;
            progress.classList.add('show');
            progressText.classList.add('show');
            result.classList.remove('show');

            const results = [];
            const totalFiles = selectedFiles.length;

            for (let i = 0; i < totalFiles; i++) {
                const file = selectedFiles[i];
                const currentProgress = ((i / totalFiles) * 100);
                progressBar.style.width = currentProgress + '%';
                progressText.textContent = '正在上传 (' + (i + 1) + '/' + totalFiles + '): ' + file.name;

                const formData = new FormData();
                formData.append('file', file);
                if (savePath) formData.append('path', savePath);

                try {
                    const response = await fetch('/upload', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    results.push({
                        fileName: file.name,
                        success: data.ok,
                        data: data
                    });
                } catch (error) {
                    results.push({
                        fileName: file.name,
                        success: false,
                        error: error.message
                    });
                }
            }

            progressBar.style.width = '100%';
            progressText.textContent = '上传完成！';

            setTimeout(() => {
                progress.classList.remove('show');
                progressText.classList.remove('show');
                progressBar.style.width = '0%';

                const successCount = results.filter(r => r.success).length;
                const failCount = results.length - successCount;

                if (successCount > 0) {
                    result.className = 'result show success';
                    result.innerHTML = '<strong>✅ 上传完成！成功 ' + successCount + ' 个，失败 ' + failCount + ' 个</strong>' +
                        results.map(r => {
                            if (r.success) {
                                return generateSuccessHTML(r.fileName, r.data);
                            } else {
                                return '<div class="url-item" style="background: #f8d7da;">' +
                                    '<strong style="color: #721c24;">❌ ' + r.fileName + '</strong><br>' +
                                    '<span style="color: #721c24;">' + (r.error || r.data.message) + '</span>' +
                                '</div>';
                            }
                        }).join('');
                } else {
                    result.className = 'result show error';
                    result.innerHTML = '<strong>上传失败</strong><br>所有文件上传失败';
                }

                uploadBtn.disabled = false;
            }, 500);
        });

        function generateSuccessHTML(fileName, data) {
            let html = '<div class="url-item"><strong>' + fileName + '</strong>';

            if (data.globalUrl) {
                html += '<span class="url-label">🌍 全球直连</span>' +
                    '<div class="url-content" onclick="copyToClipboard(this)">' +
                        data.globalUrl +
                        '<span class="copy-hint">点击复制</span>' +
                    '</div>' +
                    '<div class="url-content" onclick="copyToClipboard(this)" style="margin-top: 5px;">' +
                        '![img](' + data.globalUrl + ')' +
                        '<span class="copy-hint">点击复制</span>' +
                    '</div>';
            }

            if (data.chinaUrl) {
                html += '<span class="url-label">🇨🇳 大陆优化</span>' +
                    '<div class="url-content" onclick="copyToClipboard(this)">' +
                        data.chinaUrl +
                        '<span class="copy-hint">点击复制</span>' +
                    '</div>' +
                    '<div class="url-content" onclick="copyToClipboard(this)" style="margin-top: 5px;">' +
                        '![img](' + data.chinaUrl + ')' +
                        '<span class="copy-hint">点击复制</span>' +
                    '</div>';
            }

            // 删除按钮（从 URL 提取 key）
            const key = data.key || (data.globalUrl || '').replace(/^https?:\/\/[^/]+\//, '').split('?', 1)[0];
            if (key) {
                html += '<button class="delete-btn" onclick="deleteFile(this, \'' + key + '\')">🗑️ 删除</button>';
            }

            html += '</div>';
            return html;
        }

        function copyToClipboard(element) {
            const text = element.textContent.replace('点击复制', '').trim();
            navigator.clipboard.writeText(text).then(() => {
                const hint = element.querySelector('.copy-hint');
                const originalText = hint.textContent;
                hint.textContent = '已复制!';
                hint.style.opacity = '1';
                setTimeout(() => {
                    hint.textContent = originalText;
                    hint.style.opacity = '';
                }, 1500);
            });
        }

        async function deleteFile(btn, key) {
            if (!confirm('确定删除该文件吗？\n' + key)) return;
            btn.disabled = true;
            btn.textContent = '⏳ 删除中...';
            const formData = new FormData();
            formData.append('path', key);
            try {
                const response = await fetch('/delete', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();
                if (data.ok) {
                    btn.textContent = '✅ 已删除';
                    btn.classList.add('deleted');
                    const item = btn.closest('.url-item');
                    if (item) item.style.opacity = '0.5';
                } else {
                    alert('删除失败: ' + (data.message || '未知错误'));
                    btn.disabled = false;
                    btn.textContent = '🗑️ 删除';
                }
            } catch (error) {
                alert('删除失败: ' + error.message);
                btn.disabled = false;
                btn.textContent = '🗑️ 删除';
            }
        }
    </script>
</body>
</html>`;
}

export default {
    async fetch(request, env) {
        // ========== 运行时配置 ==========
        // 机密信息全部从环境变量加载：本地开发读取 .env（wrangler 自动加载），
        // 生产环境用 `wrangler secret put <KEY>` 设置，绝不硬编码在代码里。
        const TELEGRAM_BOT_TOKEN = env.TELEGRAM_BOT_TOKEN || ''; // TG机器人token（机密）
        const CHAT_ID = (env.TELEGRAM_CHAT_IDS || '') // 允许访问机器人的用户ID，逗号分隔（隐私）
            .split(',')
            .map(id => id.trim())
            .filter(Boolean);
        const BUCKET_NAME = env.R2_BUCKET_NAME || 'static'; // R2 存储绑定名
        const BASE_CF_URL = env.BASE_CF_URL || 'https://static.zhire.de'; // 反向代理域名（公开）
        const BASE_URL = env.BASE_URL || 'https://static.marlon.life'; // R2 访问域名（公开）
        const WEB_UPLOAD_PASSWORD = env.WEB_UPLOAD_PASSWORD || ''; // 网页上传密码（机密）

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
                        mimeType = MIME_TYPES[fileExt] || 'application/octet-stream';
                    }
                } else {
                    const detectedType = detectImageType(uint8Array);
                    if (detectedType) {
                        fileExt = detectedType.ext;
                        mimeType = detectedType.mime;
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

                // 同步上传到S3，因为腾讯账号卖了所以没有可用的COS空间，这里注释掉了
                // let s3Result = await uploadImageToS3(buffer, key, mimeType, env);

                // 构建返回信息
                const buildMessage = (prefix, baseUrl) =>
                    `${prefix}直链\n${baseUrl}/${key}\nMarkdown\n![img](${baseUrl}/${key})`;

                const r2GlobalMessage = buildMessage("全球直连", BASE_CF_URL);
                const r2ChinaMessage = buildMessage("大陆优化", BASE_URL);

                let resultMessage = "✅ 图片上传成功！\n";
                resultMessage += r2GlobalMessage + "\n" + r2ChinaMessage;

                // 和上面S3上传一样，这里也注释掉了
                // if (s3Result.ok) {
                //     resultMessage += `\nS3 存储\n${s3Result.s3Url}\nMarkdown\n![img](${s3Result.s3Url})`;
                // } else if (s3Result.message !== "未配置S3") {
                //     resultMessage += `\n⚠️ S3 上传失败: ${s3Result.message}`;
                // }

                return { ok: true, message: resultMessage };
            } catch (error) {
                console.error('上传失败:', error);
                return { ok: false, message: '文件上传失败，请稍后再试。' };
            }
        }

        // 网页上传路由
        if (url.pathname === '/' && request.method === 'GET') {
            // 验证 Cookie
            const cookies = parseCookies(request.headers.get('Cookie') || '');
            const token = cookies['auth_token'];

            if (!token || !verifyAuthToken(token, WEB_UPLOAD_PASSWORD)) {
                return new Response(getLoginHTML(), {
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }

            return new Response(getUploadHTML(), {
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // 登录验证路由
        if (url.pathname === '/auth' && request.method === 'POST') {
            const formData = await request.formData();
            const password = formData.get('password');

            if (!WEB_UPLOAD_PASSWORD) {
                return new Response(getLoginHTML('服务未配置访问密码'), {
                    status: 500,
                    headers: { 'Content-Type': 'text/html; charset=utf-8' }
                });
            }

            if (password === WEB_UPLOAD_PASSWORD) {
                const token = generateAuthToken(password);
                return new Response(null, {
                    status: 302,
                    headers: {
                        'Location': '/',
                        'Set-Cookie': `auth_token=${token}; HttpOnly; Secure; Max-Age=86400; Path=/; SameSite=Lax`
                    }
                });
            }

            return new Response(getLoginHTML('密码错误，请重试'), {
                status: 401,
                headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
        }

        // 处理网页文件上传
        if (url.pathname === '/upload' && request.method === 'POST') {
            try {
                // 验证 Cookie
                const cookies = parseCookies(request.headers.get('Cookie') || '');
                const token = cookies['auth_token'];

                if (!token || !verifyAuthToken(token, WEB_UPLOAD_PASSWORD)) {
                    return new Response(JSON.stringify({
                        ok: false,
                        message: '未授权访问，请先登录'
                    }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const formData = await request.formData();
                const file = formData.get('file');
                const rawPath = formData.get('path');

                if (!file) {
                    return new Response(JSON.stringify({
                        ok: false,
                        message: '没有上传文件'
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // 可选：指定保存路径（覆盖式更新，URL 保持不变）。
                // 不传 path 时自动生成随机路径
                let customPath = null;
                if (rawPath !== null && rawPath !== undefined) {
                    const validated = validateCustomPath(rawPath, file.name);
                    if (!validated.ok) {
                        return new Response(JSON.stringify({
                            ok: false,
                            message: '路径不合法: ' + validated.error
                        }), {
                            status: 400,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                    customPath = validated.path;
                }

                // 上传文件到 R2
                const buffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);

                // 获取文件类型
                let fileExt = 'bin';
                let mimeType = 'application/octet-stream';

                // 从文件名提取扩展名
                if (file.name) {
                    const extractedExt = file.name.split('.').pop().toLowerCase();
                    if (extractedExt && extractedExt.length > 0 && extractedExt.length < 10) {
                        fileExt = extractedExt;
                        mimeType = MIME_TYPES[fileExt] || file.type || 'application/octet-stream';
                    }
                } else {
                    // 如果没有文件名，尝试检测图片类型
                    const detectedType = detectImageType(uint8Array);
                    if (detectedType) {
                        fileExt = detectedType.ext;
                        mimeType = detectedType.mime;
                    }
                }

                // 指定了保存路径时，以路径中的扩展名为准（覆盖场景下 URL 类型由路径决定）
                if (customPath) {
                    const pathExt = customPath.split('.').pop().toLowerCase();
                    if (pathExt && pathExt.length > 0 && pathExt.length < 10) {
                        fileExt = pathExt;
                        mimeType = MIME_TYPES[pathExt] || file.type || 'application/octet-stream';
                    }
                }

                // 生成文件路径：指定了 path 则覆盖式写入该路径，否则自动生成
                let key;
                if (customPath) {
                    key = customPath;
                } else {
                    const date = new Date();
                    const formattedDate = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
                    const shortUUID = crypto.randomUUID().split('-')[0];
                    key = `web/${formattedDate}/${shortUUID}.${fileExt}`;
                }

                // 上传到R2
                await env[BUCKET_NAME].put(key, buffer, {
                    httpMetadata: {
                        contentType: mimeType,
                        ...(customPath ? { cacheControl: 'no-cache, must-revalidate' } : {})
                    }
                });

                // 固定路径覆盖后生成同一版本参数，让两个 CDN 域名都绕过旧缓存。
                // R2 key 保持不变，只有返回给调用方的链接版本会更新。
                const cacheVersion = customPath ? crypto.randomUUID().replaceAll('-', '') : null;
                const versionQuery = cacheVersion ? `?v=${cacheVersion}` : '';
                const globalUrl = `${BASE_CF_URL}/${key}${versionQuery}`;
                const chinaUrl = `${BASE_URL}/${key}${versionQuery}`;

                // 发送 Telegram 通知
                try {
                    const notificationMessage =
                        `🌐 网页上传成功\n` +
                        `文件名: ${file.name}\n` +
                        `大小: ${(file.size / 1024).toFixed(2)} KB\n` +
                        `全球直连: ${globalUrl}\n` +
                        `大陆优化: ${chinaUrl}`;

                    await sendMessage(CHAT_ID[0], notificationMessage, TELEGRAM_API_URL);
                } catch (tgError) {
                    console.error('Telegram通知发送失败:', tgError);
                    // 通知失败不影响上传结果
                }

                // 返回成功响应
                return new Response(JSON.stringify({
                    ok: true,
                    message: '上传成功',
                    key: key,
                    version: cacheVersion,
                    globalUrl: globalUrl,
                    chinaUrl: chinaUrl
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('网页上传失败:', error);
                return new Response(JSON.stringify({
                    ok: false,
                    message: '上传失败: ' + error.message
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        // 处理文件删除（支持 key 或完整 URL，需登录）
        if (url.pathname === '/delete' && request.method === 'POST') {
            try {
                // 验证 Cookie
                const cookies = parseCookies(request.headers.get('Cookie') || '');
                const token = cookies['auth_token'];

                if (!token || !verifyAuthToken(token, WEB_UPLOAD_PASSWORD)) {
                    return new Response(JSON.stringify({
                        ok: false,
                        message: '未授权访问，请先登录'
                    }), {
                        status: 401,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                const formData = await request.formData();
                let target = (formData.get('path') || formData.get('key') || formData.get('url') || '').trim();
                if (!target) {
                    return new Response(JSON.stringify({
                        ok: false,
                        message: '没有指定要删除的文件'
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // 支持传完整 URL（自动提取路径）或直接传 key
                if (/^https?:\/\//i.test(target)) {
                    try {
                        target = decodeURIComponent(new URL(target).pathname).replace(/^\/+/, '');
                    } catch (_) {
                        return new Response(JSON.stringify({
                            ok: false,
                            message: 'URL 不合法'
                        }), {
                            status: 400,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                }

                // 复用路径校验（防目录穿越等）
                const validated = validateCustomPath(target, '');
                if (!validated.ok) {
                    return new Response(JSON.stringify({
                        ok: false,
                        message: '路径不合法: ' + validated.error
                    }), {
                        status: 400,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
                const key = validated.path;

                // 检查是否存在
                const existing = await env[BUCKET_NAME].head(key);
                if (!existing) {
                    return new Response(JSON.stringify({
                        ok: false,
                        message: '文件不存在'
                    }), {
                        status: 404,
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                await env[BUCKET_NAME].delete(key);
                return new Response(JSON.stringify({
                    ok: true,
                    message: '已删除',
                    key: key
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (error) {
                console.error('文件删除失败:', error);
                return new Response(JSON.stringify({
                    ok: false,
                    message: '删除失败: ' + error.message
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
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
                    const text = update.message.text.trim();
                    const isDeleteCommand = text === '删除' || text.toLowerCase() === 'delete' || text.toLowerCase() === 'del';

                    if (isDeleteCommand && update.message.reply_to_message?.text) {
                        const keys = extractR2KeysFromText(update.message.reply_to_message.text, BASE_CF_URL, BASE_URL);
                        if (keys.length === 0) {
                            await sendMessage(chatId, '未在被回复的消息中找到可删除的链接，请确认回复的是上传成功消息。', TELEGRAM_API_URL);
                            return new Response('OK');
                        }

                        const uniqueKeys = [...new Set(keys)];
                        const deleteResults = [];
                        for (const key of uniqueKeys) {
                            try {
                                await env[BUCKET_NAME].delete(key);
                                deleteResults.push(`✅ 已删除: ${key}`);
                            } catch (err) {
                                console.error('删除失败:', key, err);
                                deleteResults.push(`❌ 删除失败: ${key}`);
                            }
                        }

                        await sendMessage(chatId, deleteResults.join('\n'), TELEGRAM_API_URL);
                        return new Response('OK');
                    }

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

// ========== 工具函数 ==========

// 扩展名 → MIME 类型映射
const MIME_TYPES = {
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

// 校验并规范化用户指定的保存路径（覆盖式更新用）
// 返回 { ok: true, path } 或 { ok: false, error }
function validateCustomPath(rawPath, originalName) {
    let p = String(rawPath || '').trim();
    if (!p) return { ok: false, error: '路径为空' };
    // 折叠连续斜杠
    p = p.replace(/\/+/g, '/');
    if (p.length > 500) return { ok: false, error: '路径过长（最多 500 字符）' };
    if (p.includes('..')) return { ok: false, error: '路径不允许包含 ".."' };
    if (p.startsWith('/') || /^[a-zA-Z]:/.test(p)) return { ok: false, error: '路径不允许为绝对路径' };
    if (!/^[a-zA-Z0-9._\/-]+$/.test(p)) return { ok: false, error: '路径只允许字母、数字及 . _ - / 字符' };
    if (p.split('/').some(seg => seg.startsWith('.'))) return { ok: false, error: '路径段不允许以 "." 开头' };

    // 未指定扩展名时，沿用原文件的扩展名
    const lastSeg = p.split('/').pop();
    if (!lastSeg.includes('.')) {
        const originalExt = (originalName || '').split('.').pop();
        if (originalExt && originalExt.length > 0 && originalExt.length < 10) {
            p += '.' + originalExt.toLowerCase();
        }
    }
    return { ok: true, path: p };
}

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

function extractR2KeysFromText(text, baseCfUrl, baseUrl) {
    if (!text) return [];
    const urls = text.match(/https?:\/\/[^\s)]+/g) || [];
    const keys = [];
    let baseCfOrigin = '';
    let baseOrigin = '';

    try {
        baseCfOrigin = new URL(baseCfUrl).origin;
    } catch (_) {
        baseCfOrigin = '';
    }

    try {
        baseOrigin = new URL(baseUrl).origin;
    } catch (_) {
        baseOrigin = '';
    }

    for (const rawUrl of urls) {
        try {
            const url = new URL(rawUrl);
            if (url.origin === baseCfOrigin || url.origin === baseOrigin) {
                const key = url.pathname.replace(/^\/+/, '');
                if (key) keys.push(key);
            }
        } catch (_) {
            // ignore malformed URLs
        }
    }

    return keys;
}
