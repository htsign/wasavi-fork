// Ambient declarations for globals referenced by options-core.js.
// Type-only; emits no runtime code.

// settings-io.js exposes its helpers on the global `SettingsIO`.
declare const SettingsIO: typeof import('./settings-io.js');

// only `chrome.runtime.getManifest().version` is used here
declare const chrome: {
  runtime?: {
    getManifest?(): { version: string };
  };
};
