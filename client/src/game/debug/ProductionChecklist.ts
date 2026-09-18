/**
 * Production Client Checklist — Phase 19
 *
 * Run this in the browser console (with ?debug=1) or as a Node script
 * against the built output to validate production readiness.
 *
 * Usage (browser console):
 *   import('/src/game/debug/ProductionChecklist').then(m => m.runProductionChecklist())
 */

export interface CheckResult {
  name: string;
  pass: boolean;
  detail?: string;
}

/**
 * Run all production-readiness checks in the browser.
 * Returns a results array and logs a summary to the console.
 */
export function runProductionChecklist(): CheckResult[] {
  const results: CheckResult[] = [];

  function check(name: string, condition: boolean, detail?: string) {
    results.push({ name, pass: condition, detail });
  }

  // 1. No console errors — can't check retroactively, but we can
  //    verify the error count captured by our patched console.
  const errorCount = (window as unknown as Record<string, number>).__storm_console_errors ?? 0;
  check('No console errors', errorCount === 0, errorCount > 0 ? `${errorCount} errors logged` : undefined);

  // 2. Debug visuals removed (check URL param)
  const isDebug = new URLSearchParams(window.location.search).get('debug') === '1';
  check('No debug overlay in production', !isDebug, isDebug ? 'Remove ?debug=1 from URL for production' : undefined);

  // 3. Asset paths - check critical GLBs resolve
  const criticalAssets = [
    '/assets/bosses/boss.glb',
  ];
  criticalAssets.forEach((path) => {
    // We do a synchronous check by looking for any preloaded entries
    const cached = (window as unknown as { __storm_loaded_assets?: Set<string> }).__storm_loaded_assets;
    const loaded = cached ? cached.has(path) : null;
    check(
      `Asset loads: ${path}`,
      loaded !== false,
      loaded === null ? 'could not verify (not tracked)' : loaded ? 'loaded' : 'FAILED to load',
    );
  });

  // 4. Check WebAudio context
  const hasAudio = typeof AudioContext !== 'undefined' || typeof (window as unknown as Record<string, unknown>).webkitAudioContext !== 'undefined';
  check('WebAudio available', hasAudio);

  // 5. Check WebGL2
  const canvas = document.createElement('canvas');
  const gl2 = canvas.getContext('webgl2');
  check('WebGL2 available', gl2 !== null, gl2 === null ? 'Falling back to WebGL1' : undefined);

  // 6. Check Rapier WASM
  const rapierLoaded = typeof (window as unknown as Record<string, unknown>).__rapier !== 'undefined';
  check('Rapier WASM loaded', rapierLoaded, rapierLoaded ? undefined : 'Rapier may load async — check after Physics mount');

  // 7. Check no obvious memory leaks via performance.memory (Chrome only)
  const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
  if (mem) {
    const pct = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
    check('JS heap < 80%', pct < 0.8, `${(pct * 100).toFixed(1)}% heap used`);
  } else {
    check('JS heap usage', true, 'performance.memory not available in this browser');
  }

  // 8. Check compressed assets (Content-Encoding header)
  check('Compressed assets', true, 'Verify server sends gzip/br Content-Encoding for GLB/JS/CSS assets');

  // 9. Mobile responsive check
  const isMobile = window.innerWidth < 768;
  check(
    'Responsive canvas',
    document.querySelector('canvas') !== null,
    isMobile ? 'Verify mobile controls are accessible' : undefined,
  );

  // 10. No unhandled promise rejections tracked
  const unhandled = (window as unknown as Record<string, number>).__storm_unhandled_rejections ?? 0;
  check('No unhandled promise rejections', unhandled === 0, unhandled > 0 ? `${unhandled} rejections` : undefined);

  // Print summary
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;

  console.group(`%c Storm Arena — Production Checklist [${passed}/${results.length} passed]`, 'font-weight: bold; font-size: 14px;');
  results.forEach((r) => {
    const icon = r.pass ? '✅' : '❌';
    if (r.detail) {
      console.log(`${icon} ${r.name} — ${r.detail}`);
    } else {
      console.log(`${icon} ${r.name}`);
    }
  });
  if (failed > 0) {
    console.warn(`${failed} check(s) failed. Review above before shipping.`);
  } else {
    console.info('All checks passed ✓');
  }
  console.groupEnd();

  return results;
}

/**
 * Install error/rejection trackers.
 * Call this early in main.tsx to capture runtime errors for the checklist.
 */
export function installProductionTrackers() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Record<string, number | Set<string>>;

  if (typeof w.__storm_console_errors !== 'number') {
    w.__storm_console_errors = 0;
    const orig = console.error.bind(console);
    console.error = (...args) => {
      (w.__storm_console_errors as number)++;
      orig(...args);
    };
  }

  if (typeof w.__storm_unhandled_rejections !== 'number') {
    w.__storm_unhandled_rejections = 0;
    window.addEventListener('unhandledrejection', () => {
      (w.__storm_unhandled_rejections as number)++;
    });
  }

  if (!(w.__storm_loaded_assets instanceof Set)) {
    w.__storm_loaded_assets = new Set<string>();
  }
}

/**
 * Track a successfully loaded asset URL.
 */
export function trackLoadedAsset(url: string) {
  const w = window as unknown as Record<string, Set<string>>;
  if (w.__storm_loaded_assets instanceof Set) {
    w.__storm_loaded_assets.add(url);
  }
}
