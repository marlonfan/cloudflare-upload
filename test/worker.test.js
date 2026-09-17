import assert from 'node:assert/strict';
import test from 'node:test';

import worker from '../worker.js';

class MemoryBucket {
    constructor() {
        this.objects = new Map();
    }

    async put(key, value, options = {}) {
        const body = new Uint8Array(value);
        this.objects.set(key, { body, options });
        return { etag: `etag-${body.length}` };
    }

    async head(key) {
        return this.objects.get(key) || null;
    }

    async delete(key) {
        this.objects.delete(key);
    }
}

function createEnv(bucket) {
    return {
        static: bucket,
        WEB_UPLOAD_PASSWORD: 'secret',
        BASE_CF_URL: 'https://global.example.test',
        BASE_URL: 'https://china.example.test',
    };
}

async function login(env) {
    const form = new FormData();
    form.set('password', env.WEB_UPLOAD_PASSWORD);
    const response = await worker.fetch(new Request('https://worker.example.test/auth', {
        method: 'POST',
        body: form,
    }), env);
    return response.headers.get('set-cookie').split(';', 1)[0];
}

async function upload(env, cookie, path, contents) {
    const form = new FormData();
    if (path) form.set('path', path);
    form.set('file', new File([contents], 'asset.txt', { type: 'text/plain' }));
    const response = await worker.fetch(new Request('https://worker.example.test/upload', {
        method: 'POST',
        headers: { Cookie: cookie },
        body: form,
    }), env);
    assert.equal(response.status, 200);
    return response.json();
}

test('an overwrite returns a URL that cannot reuse the previous cached body', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });

    try {
        const bucket = new MemoryBucket();
        const env = createEnv(bucket);
        const cookie = await login(env);
        const edgeCache = new Map();
        const decoder = new TextDecoder();
        const readPublicUrl = url => {
            if (!edgeCache.has(url)) {
                const key = new URL(url).pathname.replace(/^\/+/, '');
                edgeCache.set(url, decoder.decode(bucket.objects.get(key).body));
            }
            return edgeCache.get(url);
        };

        const first = await upload(env, cookie, 'web/assets/current.txt', 'first');
        assert.equal(readPublicUrl(first.globalUrl), 'first');

        const second = await upload(env, cookie, 'web/assets/current.txt', 'second');
        assert.equal(readPublicUrl(second.globalUrl), 'second');
        assert.notEqual(new URL(first.globalUrl).searchParams.get('v'), new URL(second.globalUrl).searchParams.get('v'));
        assert.equal(new URL(second.globalUrl).searchParams.get('v'), new URL(second.chinaUrl).searchParams.get('v'));
        assert.equal(bucket.objects.get('web/assets/current.txt').options.httpMetadata.cacheControl, 'no-cache, must-revalidate');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('web upload directory behavior remains unchanged', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
    });

    try {
        const bucket = new MemoryBucket();
        const env = createEnv(bucket);
        const cookie = await login(env);

        await upload(env, cookie, 'blog/cover.txt', 'custom');
        await upload(env, cookie, null, 'automatic');

        const keys = [...bucket.objects.keys()];
        assert(keys.includes('blog/cover.txt'));
        assert(keys.some(key => /^web\/\d{8}\/[a-f0-9]{8}\.txt$/.test(key)));
    } finally {
        globalThis.fetch = originalFetch;
    }
});
