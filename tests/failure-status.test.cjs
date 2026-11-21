const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');

async function setup(outcomes) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
        url: 'https://example.test/', runScripts: 'outside-only'
    });
    const w = dom.window;
    const state = { calls: 0, outcomes: [...outcomes] };
    w.setInterval = () => 1;
    w.clearInterval = () => {};
    w.console.warn = () => {};
    w.fetch = async () => {
        state.calls++;
        const outcome = state.outcomes.shift();
        assert.notEqual(outcome, undefined, 'No unplanned transport call');
        if (outcome === 'fail') return { ok: false, status: 503, json: async () => ({ message: 'Synthetic unavailable' }) };
        return { ok: true, json: async () => ({ data: [
            { id: 'fixture', type: outcome, description: 'Synthetic real-response fixture', url: '#', thumbnail_url: 'fixture.png' }
        ] }) };
    };
    // Inert marker, not a credential. jsdom does not load external resources.
    w.localStorage.setItem('virloApiKey', 'synthetic-not-a-credential');
    w.eval(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
    if (w.document.readyState === 'loading') await new Promise(resolve => w.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    return {
        w, state, close: () => dom.window.close(),
        async click(platform) {
            const id = platform === 'both' ? 'fetchBothBtn' : platform === 'tiktok' ? 'fetchTikTokBtn' : 'fetchYouTubeBtn';
            w.document.getElementById(id).click();
            for (let i = 0; i < 40; i++) await Promise.resolve();
            assert.equal(w.document.getElementById(id).disabled, false);
        },
        label: platform => w.document.getElementById(`${platform}LastUpdated`).textContent,
        cards: platform => w.document.querySelectorAll(`#${platform}Grid .video-card`).length,
        status: () => w.document.getElementById('statusMessage'),
        snapshot(file) {
            w.document.querySelectorAll('script, img, link').forEach(n => n.remove());
            const style = w.document.createElement('style');
            style.textContent = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
            w.document.head.appendChild(style);
            fs.writeFileSync(file, dom.serialize());
        }
    };
}

function assertDemo(app, platform) {
    assert.equal(app.cards(platform), 25);
    assert.match(app.label(platform), /Demo data \(API unavailable\)/);
    assert.equal(app.status().className, 'status-message info');
    assert.match(app.status().textContent, new RegExp(platform));
    assert.doesNotMatch(app.status().textContent, /fetched successfully/);
}

test('single failure keeps intentional demo cards visibly identified after completion', async () => {
    const app = await setup(['fail']);
    try {
        await app.click('tiktok');
        assert.equal(app.state.calls, 1);
        assertDemo(app, 'tiktok');
        assert.equal(app.w.localStorage.getItem('tiktokVideos'), null, 'Demo fallback is still not cached');
        if (process.env.TREND_SNAPSHOT) app.snapshot(process.env.TREND_SNAPSHOT);
    } finally { app.close(); }
});

test('successful fetch clears that panel demo identity and retains normal success/cache', async () => {
    const app = await setup(['fail', 'tiktok']);
    try {
        await app.click('tiktok');
        await app.click('tiktok');
        assert.equal(app.cards('tiktok'), 1);
        assert.match(app.label('tiktok'), /^Last updated:/);
        assert.doesNotMatch(app.label('tiktok'), /Demo/);
        assert.equal(app.status().className, 'status-message success');
        assert.equal(app.status().textContent, 'Videos fetched successfully!');
        assert.equal(JSON.parse(app.w.localStorage.getItem('tiktokVideos')).videos[0].id, 'fixture');
    } finally { app.close(); }
});

for (const failed of ['tiktok', 'youtube']) {
    test(`Both partial failure identifies only ${failed} as demo`, async () => {
        const app = await setup(failed === 'tiktok' ? ['fail', 'youtube'] : ['tiktok', 'fail']);
        try {
            await app.click('both');
            assert.equal(app.state.calls, 2);
            assertDemo(app, failed);
            const success = failed === 'tiktok' ? 'youtube' : 'tiktok';
            assert.equal(app.cards(success), 1);
            assert.match(app.label(success), /^Last updated:/);
            assert.doesNotMatch(app.label(success), /Demo/);
            if (failed === 'youtube' && process.env.TREND_PARTIAL_SNAPSHOT) app.snapshot(process.env.TREND_PARTIAL_SNAPSHOT);
        } finally { app.close(); }
    });
}

test('Both failure identifies both retained demo panels', async () => {
    const app = await setup(['fail', 'fail']);
    try {
        await app.click('both');
        assertDemo(app, 'tiktok'); assertDemo(app, 'youtube');
    } finally { app.close(); }
});

test('Both valid responses preserve normal success and no demo labels', async () => {
    const app = await setup(['tiktok', 'youtube']);
    try {
        await app.click('both');
        for (const platform of ['tiktok', 'youtube']) {
            assert.equal(app.cards(platform), 1);
            assert.match(app.label(platform), /^Last updated:/);
        }
        assert.equal(app.status().className, 'status-message success');
    } finally { app.close(); }
});
