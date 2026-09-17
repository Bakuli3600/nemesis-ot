/**
 * threeCompat — temporary compatibility shim.
 *
 * React Three Fiber's render loop still instantiates `THREE.Clock` internally
 * (pmndrs/react-three-fiber#3741), and three r183+ prints a deprecation
 * warning for it on every Canvas mount. R3F will migrate to `THREE.Timer` in
 * its next major version; until then this shim suppresses ONLY that exact
 * message, leaving every other console.error untouched and unredacted.
 *
 * Delete this file when @react-three/fiber ships Timer-based internals
 * (check their changelog for "Timer").
 */

const SUPPRESSED = 'THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.';

let installed = false;

export function installThreeCompat(): void {
  if (installed || typeof console === 'undefined') return;
  installed = true;

  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (args.some((a) => typeof a === 'string' && a.startsWith(SUPPRESSED))) return;
    originalError(...args);
  };
}
