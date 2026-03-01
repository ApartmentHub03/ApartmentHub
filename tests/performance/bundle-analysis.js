#!/usr/bin/env node

/**
 * Next.js Bundle Size Analysis for ApartmentHub
 *
 * Runs `next build` and parses the stdout to extract per-route bundle sizes,
 * then flags routes exceeding configurable thresholds.
 *
 * Usage:
 *   node tests/performance/bundle-analysis.js
 */

'use strict';

const { execSync } = require('child_process');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const WARN_THRESHOLD_KB = 200; // gzipped JS per route
const FAIL_THRESHOLD_KB = 500;

// ---------------------------------------------------------------------------

function main() {
    console.log('\n📦  ApartmentHub — Next.js Bundle Size Analysis');
    console.log('='.repeat(60));

    let buildOutput;
    try {
        process.stdout.write('  ⏳  Running next build ...\n');
        buildOutput = execSync('npx next build', {
            cwd: PROJECT_ROOT,
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, NODE_ENV: 'production' },
            timeout: 300_000, // 5 min max
        });
    } catch (err) {
        // next build may exit 1 due to ESLint warnings but still produce output
        buildOutput = (err.stdout || '') + '\n' + (err.stderr || '');
        if (!buildOutput.includes('Route')) {
            console.error('❌  next build failed and produced no route table.');
            console.error(buildOutput.slice(-500));
            process.exit(1);
        }
    }

    // ---------------------------------------------------------------------------
    // Parse the build output for the route table
    // Next.js build output looks like:
    //   Route (app)                              Size     First Load JS
    //   ┌ ○ /                                    5.12 kB        91.4 kB
    //   ├ ○ /about-us                            2.31 kB        88.6 kB
    //   ...
    // ---------------------------------------------------------------------------

    const lines = buildOutput.split('\n');
    const routes = [];
    const routeRegex = /[┌├└●○ƒλ]\s+([/\w\-[\]().]+)\s+([\d.]+)\s*(kB|B)\s+([\d.]+)\s*(kB|B)/;

    for (const line of lines) {
        const m = line.match(routeRegex);
        if (m) {
            const routePath = m[1].trim();
            const sizeVal = parseFloat(m[2]) * (m[3] === 'kB' ? 1 : 0.001);
            const firstLoadVal = parseFloat(m[4]) * (m[5] === 'kB' ? 1 : 0.001);
            routes.push({
                route: routePath,
                sizeKB: sizeVal,
                firstLoadKB: firstLoadVal,
            });
        }
    }

    if (routes.length === 0) {
        console.log('  ⚠️  Could not parse any routes from build output.');
        console.log('      Printing raw build output tail:\n');
        console.log(buildOutput.slice(-1500));
        // Still write the raw output for reference
        const fs = require('fs');
        const outPath = path.join(__dirname, 'build-output-raw.txt');
        fs.writeFileSync(outPath, buildOutput);
        console.log(`\n📁  Raw build output saved to: ${outPath}\n`);
        return;
    }

    // ---------------------------------------------------------------------------
    // Summary table
    // ---------------------------------------------------------------------------

    console.log('');
    const header = `${'Route'.padEnd(45)} ${'Size'.padStart(8)} ${'First Load JS'.padStart(15)} ${'Status'.padStart(8)}`;
    console.log(header);
    console.log('-'.repeat(header.length));

    let warnings = 0;
    let failures = 0;

    for (const r of routes) {
        let status = '✅';
        if (r.firstLoadKB >= FAIL_THRESHOLD_KB) {
            status = '🔴 FAIL';
            failures++;
        } else if (r.firstLoadKB >= WARN_THRESHOLD_KB) {
            status = '🟡 WARN';
            warnings++;
        }

        console.log(
            `${r.route.padEnd(45)} ${(r.sizeKB.toFixed(1) + ' kB').padStart(8)} ${(r.firstLoadKB.toFixed(1) + ' kB').padStart(15)} ${status.padStart(8)}`
        );
    }

    // Totals
    const totalSize = routes.reduce((s, r) => s + r.sizeKB, 0);
    const avgFirstLoad = routes.reduce((s, r) => s + r.firstLoadKB, 0) / routes.length;

    console.log('');
    console.log(`  Total unique route JS : ${totalSize.toFixed(1)} kB`);
    console.log(`  Avg first-load JS     : ${avgFirstLoad.toFixed(1)} kB`);
    console.log(`  Routes                : ${routes.length}`);
    console.log(`  ⚠️  Warnings (>${WARN_THRESHOLD_KB} kB) : ${warnings}`);
    console.log(`  🔴  Failures (>${FAIL_THRESHOLD_KB} kB) : ${failures}`);
    console.log('');

    if (failures > 0) {
        console.log('🔴  Some routes exceed the failure threshold. Consider code-splitting or lazy-loading heavy components.');
    } else if (warnings > 0) {
        console.log('🟡  Some routes are above the warning threshold. Monitor these for growth.');
    } else {
        console.log('🟢  All routes are within acceptable bundle size limits!');
    }

    // Save results as JSON
    const fs = require('fs');
    const outPath = path.join(__dirname, 'bundle-results.json');
    fs.writeFileSync(
        outPath,
        JSON.stringify({ routes, totalSizeKB: totalSize, avgFirstLoadKB: avgFirstLoad, warnings, failures }, null, 2)
    );
    console.log(`\n📁  Results saved to: ${outPath}\n`);
}

main();
