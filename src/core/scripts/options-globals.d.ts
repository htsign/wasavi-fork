// Ambient declarations for globals referenced by options-core.js.
// Type-only; emits no runtime code.

// settings-io.js exposes its helpers on the global `SettingsIO`.
declare const SettingsIO: typeof import('./settings-io.js');

// `chrome` is declared in ../globals.d.ts (shared web-extension globals).
