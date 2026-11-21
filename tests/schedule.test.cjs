const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');

async function setup(now, saved = {}) {
    const dom = new JSDOM(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), {
        url: 'https://example.test/', runScripts: 'outside-only'
    });
    const w = dom.window;
    const state = { now, calls: 0, interval: null, cadence: null };
    const BaseDate = w.Date;
    w.Date = class extends BaseDate {
        constructor(...args) { super(...(args.length ? args : [state.now])); }
        static now() { return state.now; }
    };
    w.setInterval = (fn, ms) => { state.interval = fn; state.cadence = ms; return 1; };
    w.clearInterval = () => {};
    w.fetch = async () => {
        state.calls++;
        return { ok: true, json: async () => ({ data: [] }) };
    };
    // Inert marker only. All application transports are canned and local.
    w.localStorage.setItem('virloApiKey', 'synthetic-not-a-credential');
    for (const [key, value] of Object.entries(saved)) w.localStorage.setItem(key, value);
    w.eval(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
    if (w.document.readyState === 'loading') {
        await new Promise(resolve => w.document.addEventListener('DOMContentLoaded', resolve, { once: true }));
    }
    return {
        w, state,
        close: () => dom.window.close(),
        add(value) {
            w.document.getElementById('timeInput').value = value;
            w.document.getElementById('addTimeBtn').click();
        },
        async tick(at) {
            state.now = at;
            state.interval();
            // Drain the application's canned fetch/parse/display promise chain.
            for (let i = 0; i < 20; i++) await Promise.resolve();
        }
    };
}

// Local calendar constructors deliberately differ from UTC in America/New_York.
test('one configured local time repeats daily, once per matching minute', async () => {
    const first = new Date(2026, 10, 21, 23, 58).getTime();
    const next = new Date(2026, 10, 22, 23, 58).getTime();
    const app = await setup(first);
    try {
        app.add('23:58');
        assert.equal(app.state.cadence, 60000);
        await app.tick(first); assert.equal(app.state.calls, 2);
        await app.tick(first + 30000); assert.equal(app.state.calls, 2);
        await app.tick(next); assert.equal(app.state.calls, 4);
        await app.tick(next + 30000); assert.equal(app.state.calls, 4);
        assert.equal(app.w.localStorage.getItem('lastScheduledFetch'), '2026-11-22T23:58');
    } finally { app.close(); }
});

test('nonmatching minutes do not backfill, both configured local slots still run', async () => {
    const first = new Date(2026, 10, 21, 10, 0).getTime();
    const app = await setup(first);
    try {
        app.add('10:00'); app.add('11:00');
        await app.tick(first + 60000); assert.equal(app.state.calls, 0);
        await app.tick(first + 3600000); assert.equal(app.state.calls, 2);
        await app.tick(first + 3600000); assert.equal(app.state.calls, 2);
        await app.tick(new Date(2026, 10, 22, 10, 0).getTime()); assert.equal(app.state.calls, 4);
    } finally { app.close(); }
});

test('same dated minute remains deduplicated after reload', async () => {
    const now = new Date(2026, 10, 21, 10, 0).getTime();
    const app = await setup(now, {
        scheduledTimes: '["10:00"]', lastScheduledFetch: '2026-11-21T10:00'
    });
    try {
        await app.tick(now); assert.equal(app.state.calls, 0);
        await app.tick(new Date(2026, 10, 22, 10, 0).getTime()); assert.equal(app.state.calls, 2);
    } finally { app.close(); }
});
