#!/usr/bin/env node

/**
 * Lighthouse Performance Audit for ApartmentHub
 *
 * Runs Google Lighthouse audits against key pages served by the local
 * Next.js dev server (http://localhost:3000) and prints Core Web Vitals.
 *
 * Usage:
 *   node tests/performance/lighthouse-audit.js
 *
 * Requires:  npm i -D lighthouse chrome-launcher
 */

'use strict';

const PAGE_URLS = [
    { name: 'Homepage', path: '/' },
    { name: 'Apartments (NL)', path: '/nl/appartementen' },
    { name: 'Aanvraag Form', path: '/aanvraag' },
    { name: 'Login', path: '/login' },
    { name: 'About Us', path: '/about-us' },
    { name: 'FAQ', path: '/faq' },
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// ---------------------------------------------------------------------------

async function main() {
    let lighthouse, chromeLauncher;
    try {
        lighthouse = (await import('lighthouse')).default;
        chromeLauncher = await import('chrome-launcher');
    } catch {
        console.error(
            '❌  Missing dependencies. Install them first:\n' +
            '    npm i -D lighthouse chrome-launcher\n'
        );
        process.exit(1);
    }

    console.log('\n🔦  ApartmentHub — Lighthouse Performance Audit');
    console.log('='.repeat(60));
    console.log(`   Base URL : ${BASE_URL}`);
    console.log(`   Pages    : ${PAGE_URLS.length}`);
    console.log('='.repeat(60) + '\n');

    // Launch headless Chrome
    const chrome = await chromeLauncher.launch({
        chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
    });

    const results = [];

    for (const page of PAGE_URLS) {
        const url = `${BASE_URL}${page.path}`;
        process.stdout.write(`  ⏳  Auditing ${page.name} (${url}) ...`);

        try {
            const runnerResult = await lighthouse(url, {
                port: chrome.port,
                output: 'json',
                onlyCategories: ['performance'],
                formFactor: 'desktop',
                screenEmulation: { disabled: true },
                throttling: {
                    // Simulate decent broadband
                    rttMs: 40,
                    throughputKbps: 10240,
                    cpuSlowdownMultiplier: 1,
                    requestLatencyMs: 0,
                    downloadThroughputKbps: 10240,
                    uploadThroughputKbps: 5120,
                },
            });

            const lhr = runnerResult.lhr;
            const perf = lhr.categories.performance;
            const audits = lhr.audits;

            const metrics = {
                page: page.name,
                url: page.path,
                score: Math.round((perf.score || 0) * 100),
                lcp: audits['largest-contentful-paint']?.displayValue || 'N/A',
                fid: audits['max-potential-fid']?.displayValue || 'N/A',
                cls: audits['cumulative-layout-shift']?.displayValue || 'N/A',
                ttfb: audits['server-response-time']?.displayValue || 'N/A',
                si: audits['speed-index']?.displayValue || 'N/A',
                tbt: audits['total-blocking-time']?.displayValue || 'N/A',
                fcp: audits['first-contentful-paint']?.displayValue || 'N/A',
            };

            results.push(metrics);
            console.log(` ✅  Score: ${metrics.score}/100`);
        } catch (err) {
            console.log(` ❌  Failed: ${err.message}`);
            results.push({
                page: page.name,
                url: page.path,
                score: 'ERR',
                lcp: '-',
                fid: '-',
                cls: '-',
                ttfb: '-',
                si: '-',
                tbt: '-',
                fcp: '-',
                error: err.message,
            });
        }
    }

    await chrome.kill();

    // ---------------------------------------------------------------------------
    // Summary table
    // ---------------------------------------------------------------------------
    console.log('\n' + '='.repeat(60));
    console.log('  📊  LIGHTHOUSE RESULTS SUMMARY');
    console.log('='.repeat(60));
    console.log('');

    const header = `${'Page'.padEnd(22)} ${'Score'.padStart(5)} ${'LCP'.padStart(8)} ${'FCP'.padStart(8)} ${'TBT'.padStart(8)} ${'CLS'.padStart(8)} ${'SI'.padStart(8)} ${'TTFB'.padStart(8)}`;
    console.log(header);
    console.log('-'.repeat(header.length));

    for (const r of results) {
        const scoreStr = typeof r.score === 'number' ? `${r.score}` : r.score;
        console.log(
            `${r.page.padEnd(22)} ${scoreStr.padStart(5)} ${r.lcp.padStart(8)} ${r.fcp.padStart(8)} ${r.tbt.padStart(8)} ${r.cls.padStart(8)} ${r.si.padStart(8)} ${r.ttfb.padStart(8)}`
        );
    }

    console.log('');

    // Scoring guide
    const avgScore =
        results.reduce((sum, r) => sum + (typeof r.score === 'number' ? r.score : 0), 0) /
        results.filter((r) => typeof r.score === 'number').length;

    if (avgScore >= 90) {
        console.log(`🟢  Average Performance Score: ${avgScore.toFixed(0)}/100 — Excellent!`);
    } else if (avgScore >= 50) {
        console.log(`🟡  Average Performance Score: ${avgScore.toFixed(0)}/100 — Needs improvement`);
    } else {
        console.log(`🔴  Average Performance Score: ${avgScore.toFixed(0)}/100 — Poor`);
    }

    // Write JSON results
    const fs = await import('fs');
    const outPath = new URL('./lighthouse-results.json', import.meta.url).pathname;
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log(`\n📁  Detailed results saved to: ${outPath}\n`);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
