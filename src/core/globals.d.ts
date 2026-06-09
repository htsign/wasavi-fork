// Ambient declarations for the web-extension and wasavi globals that the
// script-loaded frontend relies on. Type-only; emits no runtime code.

// minimal surface of the WebExtension `chrome` API actually used in src/core
declare var chrome: {
  runtime: {
    getManifest(): { version: string };
    getURL(path: string): string;
    sendMessage(message: unknown, callback?: (response: unknown) => void): void;
    onMessage: {
      addListener(
        handler: (request: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => void
      ): void;
      removeListener(
        handler: (request: unknown, sender: unknown, sendResponse: (response?: unknown) => void) => void
      ): void;
    };
  };
  i18n: {
    getMessage(messageId: string): string;
  };
};

// Firefox exposes `browser`; only the runtime origin probe is used here
declare var browser:
  | {
      runtime?: {
        getURL(path: string): string;
      };
    }
  | undefined;

interface WasaviUrlInfo {
  optionsUrl: string | undefined;
  internalUrl: string | undefined;
  eq(u1: string | undefined, u2: string | undefined): boolean;
  readonly externalUrl: string;
  readonly externalSecureUrl: string;
  readonly isInternal: boolean;
  readonly isExternal: boolean;
  readonly isAny: boolean;
  readonly frameSource: string;
}

interface WasaviExtensionWrapperInstance {
  tabId: string | null;
  requestNumber: number;
  readonly name: string;
  runType?: string;
  // only present on the chrome instance returned by create() in an extension context
  urlInfo?: WasaviUrlInfo;
  isTopFrame(): boolean;
  postMessage(data?: Record<string, unknown>, callback?: (response: unknown) => void): number;
  doPostMessage(data: Record<string, unknown>, callback?: (response: unknown) => void): void;
  connect(type?: string, callback?: (response: unknown) => void): void;
  doConnect(): void;
  disconnect(): void;
  doDisconnect(): void;
  setMessageListener(handler: Function): void;
  addMessageListener(handler: Function): void;
  removeMessageListener(handler: Function): void;
  runCallback(...args: unknown[]): unknown;
  getUniqueId(): string;
  getNewRequestNumber(): number;
  getMessage(messageId: string): string | undefined;
  setClipboard(data: string): void;
  getClipboard(...args: unknown[]): void;
  getPageContextScriptSrc(path?: string): string;
  ensureRun(...args: unknown[]): void;
}

interface WasaviExtensionWrapperStatic {
  new (): WasaviExtensionWrapperInstance;
  create(opts?: {
    extensionName?: string;
    externalFrameURL?: string;
    externalSecureUrl?: string;
  }): WasaviExtensionWrapperInstance;
  urlInfo: WasaviUrlInfo;
  IS_GECKO: boolean;
  IS_FX_WEBEXT: boolean;
}

declare var WasaviExtensionWrapper: WasaviExtensionWrapperStatic;
