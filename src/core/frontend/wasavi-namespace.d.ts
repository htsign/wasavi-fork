// Ambient declarations for the `Wasavi` global namespace published by
// src/core/frontend/init.js (as `g.Wasavi = Object.defineProperties({}, {...})`)
// and grown by each class file via `Wasavi.ClassName = class/function ...`.
//
// Because every definition lives inside an IIFE, TypeScript cannot see the
// `Wasavi` symbol from consumer files; this declaration restores it.
//
// Type-only; emits no runtime code. Constructors and instance members are
// typed best-effort from the implementations. Genuinely ambiguous argument /
// return types are left as `unknown` (never `any`) and refined per-file later.

// === shared cross-class interfaces =======================================

/** A position-like value: either a real WasaviPosition or a {row, col} pair. */
type WasaviPositionLike = WasaviPosition | { row: number; col: number };

/**
 * A mounted file system entry stored in `app.fstab` (one per drive/backend).
 * `name` is the drive label and `cwd` the current working directory; the
 * latter is rewritten by `:cd`.
 */
interface WasaviFsEntry {
  name: string;
  cwd: string;
}

/**
 * A single abbreviation entry stored in `app.abbrevs` (keyed by the lhs
 * keyword). `final` marks a non-recursive abbreviation, `value` the expansion.
 */
interface WasaviAbbrevEntry {
  final: boolean;
  value: string;
}

/**
 * The abbreviation table on `app.abbrevs`: a map from lhs keyword to its entry,
 * plus a `clear()` to drop every abbreviation at once.
 */
type WasaviAbbrevs = Record<string, WasaviAbbrevEntry> & { clear(): void };

/**
 * The edit target on `app.targetElement` (the wasavi.js local `targetElement`,
 * exposed read-only via the `app` getter). It is the serialized descriptor of
 * the page element wasavi is editing (or a synthesized one in app mode), not a
 * live DOM node; its members are stamped on across wasavi.js / agent.js as the
 * editing session progresses. `null` while no element is bound.
 */
interface WasaviTargetElement {
  nodeName: string;
  id: string;
  elementType: string;
  value: string;
  /** Page URL of the element's document. */
  url: string;
  /** Title of the element's document. */
  title: string;
  /** Output format selected via the `writeas` option / agent detection. */
  writeAs: string;
  /** Set true to ask the page to submit the owning form on terminate. */
  isSubmitRequested: boolean;
  setargs: string;
  selectionStart: number;
  selectionEnd: number;
  scrollTop: number;
  scrollLeft: number;
  readOnly: boolean;
  fontStyle: string;
  rect: { width: number; height: number };
  frameId: unknown;
  parentTabId: unknown;
  tabId: unknown;
  isTopFrame: boolean;
  isImplicit: boolean;
  ros: string;
  marks: unknown;
}

/**
 * Buffer position. Instances are produced by `new Wasavi.Position(row, col)`.
 * Fully typed (heavily used across the editor).
 */
interface WasaviPosition {
  row: number;
  col: number;
  toString(): string;
  clone(): WasaviPosition;
  /** Clamp the position into the bounds of editor `t`; returns `this`. */
  round(t: WasaviEditor): this;
  isp(o: unknown): o is WasaviPositionLike;
  eq(o: WasaviPositionLike): boolean;
  ne(o: WasaviPositionLike): boolean;
  gt(o: WasaviPositionLike): boolean;
  lt(o: WasaviPositionLike): boolean;
  ge(o: WasaviPositionLike): boolean;
  le(o: WasaviPositionLike): boolean;
}

/**
 * Minimal surface of the central wasavi application object passed as `app` to
 * most class constructors. Members with a known instance interface are typed;
 * the rest are left `unknown` (the full app type lives outside this file).
 */
interface WasaviApp {
  buffer: WasaviEditor;
  marks: WasaviMarks;
  registers: WasaviRegisters;
  backlog: WasaviBacklog;
  editLogger: WasaviEditLogger;
  theme: WasaviTheme;
  mapManager: WasaviMapManager;
  prefixInput: WasaviPrefixInput;
  cursor: WasaviCursorUI;
  scroller: WasaviScroller;
  searchUtils: WasaviSearchUtils;
  low: WasaviAppLow;
  config: WasaviConfigurator;
  edit: WasaviEditOps;
  exvm: WasaviExViewModel;
  extensionChannel: WasaviExtensionWrapperInstance;
  lastRegexFindCommand: WasaviRegexFinderInfo;
  keyManager: WasaviAppKeyManager;
  fileName: string;
  motion: WasaviMotion;
  targetElement: WasaviTargetElement | null;
  lastSubstituteInfo: WasaviSubstituteInfo;
  fstab: readonly WasaviFsEntry[];
  abbrevs: WasaviAbbrevs;
  isTextDirty: unknown;
  fileSystemIndex: number;
  isEditCompleted: unknown;
  ffttDictionary: WasaviFfttDictionary;
  isJumpBaseUpdateRequested: unknown;
  version: unknown;
  preferredNewline: string;
  lineHeight: number;
  lastMessage: string;
  inputMode: unknown;
  terminated: unknown;
  requestedState: WasaviRequestedState;
  charWidth: number;
  state: unknown;
  isVerticalMotion: unknown;
  isTestMode: unknown;
  devMode: unknown;
}

/**
 * Low-level methods exposed on `app.low` (frozen object built in wasavi.js
 * `AppProxy`). Signatures are typed from the wasavi.js implementations; values
 * that the implementation genuinely leaves open are `unknown`.
 */
interface WasaviAppLow {
  log(...args: readonly unknown[]): void;
  info(...args: readonly unknown[]): void;
  error(...args: readonly unknown[]): void;
  getLocalStorage(keyName: string, callback?: (value: unknown) => void): void;
  setLocalStorage(keyName: string, value: unknown): void;
  isEditing(mode?: unknown): boolean;
  isBound(mode?: unknown): string | false;
  pushInputMode(context: Record<string, unknown>, newInputMode: unknown, newInputModeOpts?: unknown): void;
  popInputMode(context?: Record<string, unknown>): void;
  showPrefixInput(message?: string): void;
  showMessage(text: string, em?: unknown, pc?: unknown, plm?: unknown): void;
  showMessageCore(message: string, emphasis?: unknown, pseudoCursor?: unknown, preserveLastMessage?: unknown): void;
  requestShowMessage(message: string, emphasis?: unknown, pseudoCursor?: unknown, preserveLastMessage?: unknown): string;
  requestNotice(args?: unknown): void;
  requestInputMode(mode: unknown, opts?: Record<string, unknown>): unknown;
  requestConsoleOpen(): void;
  requestConsoleClose(): void;
  executeViCommand(arg: string): void;
  getFindRegex(src: string | RegExp | Record<string, unknown>): RegExp | null;
  getFileIoResultInfo(aFileName: string, charLength: number, isNew?: boolean): string;
  getFileInfo(fullPath?: boolean): string;
  notifyToParent<R = unknown>(eventName: string, payload?: Record<string, unknown>, callback?: (response: R) => void): boolean;
  notifyActivity(code: string, key: string, note: string): void;
  notifyCommandComplete(eventName?: string | null, modeOverridden?: unknown): void;
  extractDriveName(path: string, callback: (whole: string, drive: string) => void): string;
  getFileSystemIndex(name: string): number;
  splitPath(path: string, escapeChar?: string): string[];
  regalizeFilePath(path: string, completeDriveName?: boolean): string;
  notifyError(message: unknown, fileName?: string, lineNumber?: number, columnNumber?: number, errObj?: unknown): void;
  getContainerRect(): DOMRect;
}

/**
 * The subset of the wasavi.js `requestedState` object reachable cross-file via
 * `app.requestedState`. The full object carries more transient fields, set and
 * cleared inside wasavi.js; only the members read through `app` are declared.
 */
interface WasaviRequestedState {
  console?: { open: boolean } | null;
  showInput?: { message: unknown } | null;
  inputMode?: { mode: unknown } | null;
}

// === instance interfaces =================================================

/**
 * Keyboard input manager (the `qeema` library instance assigned to
 * `app.keyManager`). Only the surface reached cross-file via `app.keyManager`
 * is declared; the full library type lives outside this file.
 */
interface WasaviAppKeyManager {
  lock(): void;
  unlock(): void;
  createSequences(s: string): WasaviKeySequenceItem[];
  insertFnKeyHeader(s: string): string;
  isInputEvent(e: unknown): boolean;
  addListener<E>(type: string, handler: (e: E) => unknown): void;
  removeListener<E>(type: string, handler?: (e: E) => unknown): void;
  editable: {
    setSelectionRange(node: HTMLElement, col: number): void;
  };
}

/** A WebExtension message catalog (messages.json shape), keyed by message id. */
type WasaviMessageCatalog = Record<string, { message: string }>;

/** Localization helper (classes.js). */
interface WasaviL10n {
  getMessage(messageId: string): string;
  getTranslator(): (...args: unknown[]) => string;
}

/**
 * The read-only descriptor returned by `WasaviConfigurator.getInfo` (the
 * getter bag built by `VariableItem.getInfo`). `defaultValue` is whatever the
 * option's default is, so it stays `unknown`.
 */
interface WasaviConfigInfo {
  readonly name: string;
  readonly type: string;
  readonly isLateBind: boolean;
  readonly isDynamic: boolean;
  readonly isAsync: boolean;
  readonly defaultValue: unknown;
}

/** Runtime values of every active vi/wasavi option (wasavi.js Configurator definition). */
interface WasaviConfigVars {
  autoindent: boolean;
  autoprint: boolean;
  autowrite: boolean;
  beautify: boolean;
  edcompatible: boolean;
  errorbells: boolean;
  exrc: boolean;
  ignorecase: boolean;
  list: boolean;
  magic: boolean;
  mesg: boolean;
  number: boolean;
  prompt: boolean;
  readonly: boolean;
  redraw: boolean;
  remap: boolean;
  showmatch: boolean;
  showmode: boolean;
  slowopen: boolean;
  terse: boolean;
  warn: boolean;
  wrapscan: boolean;
  writeany: boolean;
  smooth: boolean;
  fullscreen: boolean;
  jkdenotative: boolean;
  stripe: boolean;
  syncsize: boolean;
  override: boolean;
  cursorblink: boolean;
  esctoblur: boolean;
  launchbell: boolean;
  expandtab: boolean;
  searchincr: boolean;
  smartcase: boolean;
  relativenumber: boolean;
  modified: boolean;
  cursorline: boolean;
  cursorcolumn: boolean;
  visualbell: boolean;

  report: number;
  scroll: number;
  shiftwidth: number;
  tabstop: number;
  taglength: number;
  window: number;
  wrapmargin: number;
  bellvolume: number;
  history: number;
  monospace: number;
  undoboundlen: number;
  undolevels: number;
  textwidth: number;
  columns: number;
  lines: number;
  matchtime: number;

  directory: string;
  paragraphs: string;
  sections: string;
  shell: string;
  tags: string;
  term: string;
  theme: string;
  datetime: string;
  writeas: string;
  quoteescape: string;
  nrformats: string;

  iskeyword: RegExp;
}

/** vi/wasavi option value type code (classes.js VariableItem). */
type WasaviConfigType = 'b' | 'i' | 'I' | 's' | 'r';

/**
 * Per-option setter hook run when an option is assigned (classes.js).
 * The argument is the already-coerced value, whose concrete type
 * (boolean / number / string) depends on the option's `WasaviConfigType`
 * and is only known at runtime; each subSetter narrows it as needed.
 */
type WasaviConfigSubSetter = (v: unknown) => unknown;

/** Per-option flags passed in the trailing element of a config tuple (classes.js). */
interface WasaviConfigOptions {
  isDynamic?: boolean;
  isAsync?: boolean;
}

/**
 * A single option definition tuple supplied to `Wasavi.Configurator`
 * (wasavi.js configuration object): `[name, type, defaultValue, subSetter?, opts?]`.
 */
type WasaviConfigInternal = [
  name: string,
  type: WasaviConfigType,
  defaultValue: unknown,
  subSetter?: WasaviConfigSubSetter | null,
  opts?: WasaviConfigOptions,
];

/** Option / variable configurator (classes.js). */
interface WasaviConfigurator {
  getInfo(name: string): WasaviConfigInfo | null;
  // `reformat` truthy returns `item.visibleString` (always a string); otherwise
  // the raw `item.value` (option-dependent) or null when the option is unknown.
  getData(name: string, reformat: true): string;
  getData(name: string, reformat?: boolean): unknown;
  setData(name: string, value?: unknown, skipSubSetter?: boolean): unknown;
  dump(cols: number, all?: boolean): string[];
  dumpData(): string;
  dumpScript(modifiedOnly?: boolean): string[];
  reset(name?: string): void;
  saveSnapshot(name: string): void;
  loadSnapshot(name: string, optionName?: string): void;
  readonly vars: WasaviConfigVars;
  readonly abbrevs: Record<string, string>;
}

/** vi-to-JS regex converter (classes.js). */
interface WasaviRegexConverter {
  fixup(s: string): string;
  toJsRegexString(s: string | RegExp): string;
  toJsRegex(s: string | RegExp, opts?: string): RegExp | null;
  toLiteralString(s: string): string;
  getCS(s: string): string;
  getDefaultOption(): { wrapscan: boolean };
  readonly SPECIAL_SPACE: string;
  readonly SPECIAL_NONSPACE: string;
}

/** Initializer accepted by `new Wasavi.PrefixInput(init)` / `assign` (classes.js). */
interface WasaviPrefixInputInit {
  register?: string;
  operation?: string;
  motion?: string;
  count1?: string | number;
  count2?: string | number;
  trailer?: string;
  isEmpty?: boolean;
  isLocked?: boolean;
}

/** Parsed prefix command input (classes.js). */
interface WasaviPrefixInput {
  reset(...keys: (keyof WasaviPrefixInputInit)[]): void;
  clone(): WasaviPrefixInput;
  assign(pi: WasaviPrefixInput | WasaviPrefixInputInit): void;
  toString(): string;
  toVisibleString(): string;
  appendCount(v: string | number): void;
  appendRegister(v: string): void;
  appendOperation(v: string): void;
  appendMotion(v: string): void;
  appendTrailer(v: string): void;
  register: string;
  operation: string;
  motion: string;
  readonly count1: string | number;
  readonly count2: string | number;
  readonly count: number;
  trailer: string;
  readonly isEmpty: boolean;
  readonly isEmptyOperation: boolean;
  readonly isCountSpecified: boolean;
  isLocked: boolean;
}

/** State of an in-progress search (classes.js). */
interface WasaviRegexFinderPushArg {
  head?: string;
  direction?: number;
  offset?: number;
  scrollTop?: number;
  scrollLeft?: number;
  updateBound?: string | false;
}

interface WasaviRegexFinderInternalRegex {
  pattern: string;
  regex: RegExp;
}

interface WasaviRegexFinderInfo {
  push(o: WasaviRegexFinderPushArg): void;
  setPattern(p: string, withOffset?: boolean): void;
  readonly head: string;
  readonly direction: number;
  readonly offset: number;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly pattern: string;
  verticalOffset: number | undefined;
  text: string | null | undefined;
  readonly updateBound: string | false;
  internalRegex: WasaviRegexFinderInternalRegex | undefined;
}

/** A single named history slot stored by `WasaviLineInputHistories`. */
interface WasaviLineInputHistoryEntry {
  lines: string[];
  current: number;
}

/** Command/search line input history (classes.js). */
interface WasaviLineInputHistories {
  push(line?: string): void;
  prev(): string | null;
  next(): string | null;
  save(): void;
  load(value?: unknown): void;
  isInitial: boolean;
  defaultName: string;
  readonly storageKey: string;
}

/**
 * A single key event in a sequence (qeema's `VirtualInputEvent`, returned by
 * `WasaviAppKeyManager.createSequences` and flowing through the map manager and
 * the key-dequeue). `mapExpanded` / `isNoremap` / `overrideMap` are not set by
 * the constructor; they are attached later while expanding map rules.
 */
interface WasaviKeySequenceItem {
  nativeEvent: Event | null;
  code: number;
  char: string;
  key: string;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  isSpecial: boolean;
  isCompositioned: boolean;
  isCompositionedFirst: boolean;
  isCompositionedLast: boolean;
  mapExpanded?: boolean;
  isNoremap?: boolean;
  overrideMap?: string;
  preventDefault(): void;
  code2letter(c: number, useSpecial?: boolean): string;
  toInternalString(): string;
  clone(): WasaviKeySequenceItem;
}

/**
 * Options accepted by the `WasaviMapManager` constructor and exposed via its
 * `onexpand` / `onrecursemax` accessors.
 */
interface WasaviMapManagerOptions {
  onexpand?: (sequences: WasaviKeySequenceItem[]) => void;
  onrecursemax?: () => void;
}

/** Key-mapping manager (classes.js). */
interface WasaviMapManager {
  markExpanded(items: readonly WasaviKeySequenceItem[]): void;
  markExpandedNoremap(items: readonly WasaviKeySequenceItem[]): void;
  process(mode: string, e: WasaviKeySequenceItem): Promise<WasaviKeySequenceItem | undefined>;
  readonly maps: Record<string, unknown>;
  onexpand: WasaviMapManagerOptions['onexpand'];
  onrecursemax: WasaviMapManagerOptions['onrecursemax'];
  readonly isWaiting: boolean;
}

/**
 * A single register slot returned by `WasaviRegisters.get` (the internal
 * `RegisterItem`). `data` is always coerced to a string by `set`/`setData`/
 * `appendData`, so it is genuinely `string`.
 */
interface WasaviRegisterItem {
  data: string;
  isLineOrient: boolean;
  locked: boolean;
  set(data: unknown, isLineOrient?: boolean): void;
  setData(data: unknown): void;
  appendData(data: unknown): void;
}

/** Register store (classes.js). */
interface WasaviRegisters {
  set(name: string, data: unknown, isLineOrient?: boolean, isInteractive?: boolean): unknown;
  get(name: string): WasaviRegisterItem;
  isWritable(name: string): boolean;
  isReadable(name: string): boolean;
  isClipboard(name: string): boolean;
  exists(name: string): boolean;
  dump(): unknown;
  dumpData(): unknown;
  save(): unknown;
  load(value?: unknown): unknown;
  readonly storageKey: string;
  readonly writableList: string;
  readonly readableList: string;
}

/** Mark store (classes.js). */
interface WasaviMarks {
  set(name: string, pos: WasaviPositionLike): unknown;
  get(name: string): WasaviPosition | undefined;
  setPrivate(name: string, pos: WasaviPositionLike): unknown;
  getPrivate(name: string): WasaviPosition | undefined;
  setJumpBaseMark(pos: WasaviPositionLike): unknown;
  setInputOriginMark(pos: WasaviPositionLike): unknown;
  getJumpBaseMark(): WasaviPosition | undefined;
  getInputOriginMark(): WasaviPosition | undefined;
  update(pos: WasaviPositionLike, func?: unknown): unknown;
  dump(): unknown;
  dumpData(): Record<string, { row: number; col: number }>;
  save(): unknown;
  load(value?: unknown): unknown;
  isValidName(name: string): boolean;
  clear(): unknown;
  dispose(): void;
}

/** The text editor / buffer (classes.js). Heavily used as `app.buffer`. */
interface WasaviEditor {
  elm: HTMLElement;
  isLineOrientSelection: boolean;
  unicodeCacheMax: number;

  isEndOfText(...args: readonly unknown[]): boolean;
  isNewline(...args: readonly unknown[]): boolean;
  getValue(from?: unknown, to?: unknown, newline?: string | null): string;
  rowNodes(arg: unknown, newline?: unknown): Node;
  rowTextNodes(arg: unknown): unknown;
  rows(arg: unknown): string;
  charAt(...args: readonly unknown[]): string;
  charCodeAt(...args: readonly unknown[]): number;
  charClassAt(a: unknown, treatNewlineAsSpace?: boolean, extraWordRegex?: RegExp): number;
  charRectAt(position: unknown, length?: number): unknown;
  ensureNewline(...args: readonly unknown[]): unknown;
  getSelectionRange(): unknown;
  getSelection(from?: WasaviPositionLike, to?: WasaviPositionLike): string;
  getSelectionLinewise(from?: WasaviPositionLike, to?: WasaviPositionLike): string;
  leftPos(...args: readonly unknown[]): WasaviPosition;
  leftClusterPos(...args: readonly unknown[]): WasaviPosition;
  rightPos(...args: readonly unknown[]): WasaviPosition;
  rightClusterPos(...args: readonly unknown[]): WasaviPosition;
  indexOf(node: Node): number;
  getLineTopOffset(...args: readonly unknown[]): WasaviPosition;
  getLineTopOffset2(pos: WasaviPositionLike): WasaviPosition;
  getLineTopOffset2(row: number, col: number): WasaviPosition;
  getLineTailOffset(...args: readonly unknown[]): WasaviPosition;
  getIndent(...args: readonly unknown[]): string;
  getBackIndent(...args: readonly unknown[]): string;
  getSpans(className: string, start?: unknown, end?: unknown): readonly unknown[];
  invalidateUnicodeCache(): void;
  initUnicodeCache(): unknown;
  getGraphemeClusters(n?: unknown): unknown;
  getWords(n: unknown): unknown;
  getClosestOffsetToPixels(n: unknown, pixels: number): unknown;
  setRow(arg: unknown, text: string): unknown;
  setSelectionRange(...args: readonly unknown[]): unknown;
  adjustBackgroundImage(...args: readonly unknown[]): unknown;
  adjustLineNumberClass(isAbsolute?: boolean, isRelative?: boolean): unknown;
  adjustLineNumber(...args: readonly unknown[]): unknown;
  adjustWrapGuide(width: number, unit: number): unknown;
  updateActiveRow(...args: readonly unknown[]): unknown;
  insertChars(pos: WasaviPositionLike, text: string): unknown;
  overwriteChars(pos: WasaviPositionLike, text: string): unknown;
  shift(
    row: number,
    rowCount: number,
    shiftCount: number,
    shiftWidth: number,
    tabWidth: number,
    isExpandTab: boolean,
    indents?: unknown
  ): unknown;
  deleteRange(...args: readonly unknown[]): unknown;
  selectRowsLinewise(count: number): unknown;
  divideLine(n?: unknown): unknown;
  extendSelectionTo(n: unknown): unknown;
  linearPositionToBinaryPosition(n: number): WasaviPosition | null;
  binaryPositionToLinearPosition(a: WasaviPositionLike): number;
  emphasis(pos: WasaviPositionLike | undefined, length: number, className?: string): readonly HTMLSpanElement[];
  unEmphasis(className?: string, start?: unknown, end?: unknown): unknown;
  offsetBy(s: WasaviPositionLike, offset: number, treatLastLineAsNormal?: boolean): WasaviPosition;
  regalizeSelectionRelation(): unknown;
  clipPosition(...args: readonly unknown[]): unknown;

  readonly rowLength: number;
  value: string;
  readonly selected: boolean;
  get selectionStart(): WasaviPosition;
  set selectionStart(v: WasaviPosition | number);
  readonly selectionStartRow: number;
  readonly selectionStartCol: number;
  get selectionEnd(): WasaviPosition;
  set selectionEnd(v: WasaviPosition | number);
  readonly selectionEndRow: number;
  readonly selectionEndCol: number;
  scrollTop: number;
  scrollLeft: number;
}

/** Numeric/codepoint literal input state machine (classes.js). */
interface WasaviLiteralInput {
  value: string;
  radix: number;
  pattern: RegExp | undefined;
  processor: string;
  maxLength: number;
  message: string;
  process(c: string): unknown;
  process_0(c: string, code: number): unknown;
  process_codepoint(c: string, code: number): unknown;
  process_literal(c: string, code: number): unknown;
  getResult(c: string): unknown;
}

/** Insert-mode input bookkeeping (classes.js). */
interface WasaviInputHandler {
  app: unknown;
  inputHeadPosition: WasaviPosition | null;
  count: number;
  countOrig: number;
  suffix: string;
  text: string;
  textFragment: string;
  stroke: string;
  overwritten: unknown;
  prevLengthText: readonly unknown[];
  prevLengthStroke: boolean;
  stackText: readonly unknown[];
  stackStroke: readonly unknown[];
  dispose(): void;
  reset(count?: number, suffix?: string, position?: unknown, initStartPosition?: unknown): unknown;
  close(): unknown;
  newState(position: unknown): unknown;
  setStartPosition(pos: WasaviPositionLike): unknown;
  getStartPosition(): WasaviPosition | undefined;
  invalidateHeadPosition(): unknown;
  pushText(...args: readonly unknown[]): unknown;
  popText(...args: readonly unknown[]): unknown;
  appendText(e: unknown): unknown;
  ungetText(...args: readonly unknown[]): unknown;
  pushStroke(...args: readonly unknown[]): unknown;
  popStroke(...args: readonly unknown[]): unknown;
  appendStroke(e: unknown): unknown;
  ungetStroke(...args: readonly unknown[]): unknown;
  updateHeadPosition(...args: readonly unknown[]): unknown;
  updateOverwritten(...args: readonly unknown[]): unknown;
  flush(...args: readonly unknown[]): unknown;
}

/** Completion engine (classes.js). */
interface WasaviCompleter {
  add(patterns: unknown, index: unknown, handler: unknown): unknown;
  reset(): void;
  run(value: string, pos: WasaviPositionLike, invert?: boolean, callback?: unknown): unknown;
  dispose(): void;
  readonly running: boolean;
}

/** Recorded keystroke buffers (classes.js). */
interface WasaviStrokeRecorder {
  add(key: string, opts?: Record<string, unknown>): { strokes: string } & Record<string, unknown>;
  remove(key: string): void;
  items(key: string): ({ strokes: string } & Record<string, unknown>) | null;
  appendStroke(stroke: string): void;
  dump(): string;
}

/** vim-surround style operations (classes.js). */
interface WasaviSurrounding {
  insert(s: string, isLineOrient?: boolean): unknown;
  remove(id: string): unknown;
  replace(id: string, s: string): unknown;
  isCharwiseTagPrefix(line: string): boolean;
  isLinewiseTagPrefix(line: string): boolean;
  isTagPrefix(line: string): boolean;
  dispose(): void;
}

/** Ctrl-A / Ctrl-X number increment/decrement (classes.js). */
interface WasaviIncDec {
  extractTargets(s: string, pos: WasaviPositionLike, opts?: Record<string, unknown>): unknown;
  getReplacement(matches: unknown, count: number): unknown;
  getAllReplacements(matches: unknown, count: number): unknown;
  applyReplacement(rep: unknown): unknown;
}

/** `:sort` worker (classes.js, ES class). */
/**
 * Flags parsed from an ex command's argument syntax (the `result.flags` bag
 * built by parseArgs).
 */
type WasaviExCommandArgFlags = {
  force: boolean;
  hash: boolean;
  list: boolean;
  print: boolean;
  dash: boolean;
  dot: boolean;
  plus: boolean;
  carat: boolean;
  equal: boolean;
  register: boolean;
  count: boolean;
};

/**
 * Parsed argument object handed to each ex command handler (the `result` object
 * assembled by parseArgs, with extra properties stamped on by callers).
 */
type WasaviExCommandArg = {
  range: number[];
  flagoff: number;
  flags: WasaviExCommandArgFlags;
  argv: string[];
  args?: string;
  register?: string;
  count?: number;
  lineNumber?: number;
  initCommand?: string;
  isBuffered?: boolean;
};

interface WasaviSortWorker {
  app: unknown;
  t: WasaviEditor;
  a: WasaviExCommandArg;
  content: string[] | null;
  opts: Record<string, unknown> | null;
  terminalType: number;
  /** Number of rows in the sort range (set by buildContent). */
  rows: number;
  dosort(content: string[], key: string, regex: RegExp, opts: Record<string, unknown>): string[];
  preSort(type: number, content: string): string;
  postSort(type: number, content: string): string;
  parseArgs(arg?: string): unknown;
  buildContent(content?: string): unknown;
  sort(): unknown;
  getContent(): string;
}

/** Result of a regex-based motion search (wasavi.js motionFindByRegex*). */
interface WasaviRegexFindResult {
  offset: number;
  matchLength: number;
}

/**
 * Cursor-motion commands (wasavi.js `motion` object). Only the members invoked
 * cross-file via `app.motion` are declared; the full set lives in wasavi.js.
 */
interface WasaviMotion {
  right(c: string, count?: number): boolean;
  lineStart(c: string, realTop?: boolean): boolean;
  lineEnd(c: string): boolean;
  nextWord(c: string, count?: number, bigWord?: boolean, wordEnd?: boolean): boolean;
  findByRegexForward(c: string | RegExp, count?: number, opts?: Record<string, unknown>): WasaviRegexFindResult | null;
  findByRegexBackward(c: string | RegExp, count?: number, opts?: Record<string, unknown>): WasaviRegexFindResult | null;
}

/** Full/half-width-to-thin transliteration dictionary (unicode_utils.js FfttDictionary). */
interface WasaviFfttDictionary {
  addGeneralData(d: string): void;
  addHanJaData(d: string): void;
  addData(name: string, d: unknown, handler?: unknown): void;
  /** Map of equivalent characters for `ch`, or `false` when none. */
  get(ch: string): Record<string, true> | false;
  match(ch: string, target: string): boolean;
}

/** Blinking match-bracket indicator (classes_search.js). */
interface WasaviPairBracketsIndicator {
  clear(): void;
  dispose(): void;
}

/** Text-object / motion search helpers (classes_search.js). */
interface WasaviSearchUtils {
  findQuoteRange(line: string, firstCol: number, quoteChar: string): { start: number; end: number } | false;
  findSentenceBoundary(count: number, isForward: boolean, isFindOnly?: boolean): WasaviPosition | false;
  findParagraphBoundary(
    count: number,
    isForward: boolean,
    isFindOnly: boolean,
    what: string | null,
    both?: unknown
  ): WasaviPosition | false;
  findMatchedBracket(count: number, bracketSpecified?: string, initialPos?: WasaviPositionLike): WasaviPosition | null;
  quote(count: number, quoteChar: string, includeAnchor?: boolean): boolean;
  word(count: number, bigwordChar: string, includeAnchor?: boolean): boolean;
  block(count: number, what: string, over: string, includeAnchor?: boolean): boolean;
  sentence(count: number, includeAnchor?: boolean): boolean;
  paragraph(count: number, includeAnchor?: boolean): boolean;
  dispatchRangeSymbol(count: number, targetChar: string, includeAnchor?: boolean): boolean;
  setParagraphMacros(m: string): void;
  setSectionMacros(m: string): void;
  getPairBracketsIndicator(
    targetChar: string,
    initialPos?: WasaviPositionLike
  ): WasaviPairBracketsIndicator | null;
  dispose(): void;
}

/**
 * Buffer-mutating operations exposed on `app.edit` (frozen object built in
 * wasavi.js). Signatures are typed from the wasavi.js implementations; trailing
 * option bags the implementation genuinely leaves open are `Record<string, unknown>`.
 */
interface WasaviEditOps {
  deleteSelection(isSubseq?: boolean): unknown;
  deleteCharsForward(count: number, opts?: Record<string, unknown>): unknown;
  deleteCharsBackward(count: number, opts?: Record<string, unknown>): unknown;
  insert(s: string, opts?: Record<string, unknown>): unknown;
  overwrite(s: string, opts?: Record<string, unknown>): unknown;
  shift(rowCount: number, shiftCount: number): unknown;
  unshift(rowCount: number, shiftCount: number): unknown;
  joinLines(count: number, asis?: unknown): unknown;
  yank(count: number, isLineOrient?: boolean, register?: string): unknown;
  paste(count: number, opts?: Record<string, unknown>): unknown;
}

/** An ex-command instruction (wasavi.js `ExICode`); `items`/`nestLength` are stamped only onto the `:global` latter opcodes. */
interface WasaviExOpcode {
  command: WasaviExCommandItem;
  items?: (number | Node)[];
  nestLength?: number;
}

/** The `items`/`nestLength` stamped onto a `:global` latter opcode (all that globalLatterHead/Bottom read). */
type WasaviExGlobalOpcode = Required<Omit<WasaviExOpcode, 'command'>>;

/**
 * The ex-command instruction list exposed on `app.exvm.inst` (frozen object
 * built in wasavi.js ExCommandExecutor). Members the implementation leaves
 * structurally open are `unknown`.
 */
interface WasaviExViewModelInst {
  clear(): void;
  createOpcode(command: unknown, args?: unknown, rangeSource?: unknown): WasaviExOpcode;
  add(opcodes: readonly WasaviExOpcode[]): readonly WasaviExOpcode[];
  add(command: unknown, args?: unknown, rangeSource?: unknown): WasaviExOpcode;
  insert(...args: readonly unknown[]): unknown;
  compile(source: unknown, parents?: unknown): unknown;
  index: number;
  readonly opcodes: readonly unknown[];
  readonly currentOpcode: WasaviExOpcode;
  readonly errorVectors: unknown[];
}

/**
 * The ex-command executor exposed on `app.exvm` (wasavi.js ExCommandExecutor).
 * Only the surface reached cross-file is declared.
 */
interface WasaviExViewModel {
  clone(): WasaviExViewModel;
  run(source: unknown): unknown;
  showOverlay(): void;
  hideOverlay(): void;
  toString(): string;
  readonly running: boolean;
  readonly executedRegisterFlags: Record<string, boolean>;
  lastError: unknown;
  readonly inst: WasaviExViewModelInst;
}

/**
 * Last `:substitute` pattern/replacement bag (wasavi.js `lastSubstituteInfo`,
 * a `Collection` whose members are stamped on dynamically). Both members are
 * absent until the first substitution runs.
 */
interface WasaviSubstituteInfo {
  pattern?: string;
  replacement?: string;
  clear(): void;
  size(): number;
}

/** `:substitute` worker (classes_subst.js, ES class). */
interface WasaviSubstituteWorker {
  app: WasaviApp;
  patternString: string;
  pattern: RegExp | null;
  replOpcodes: unknown;
  range: readonly [number, number] | null;
  isGlobal: boolean;
  isConfirm: boolean;
  substCount: number;
  buffer: RegExpExecArray[] | null;
  kontinueWorker: { index: number; pos: WasaviPosition; replacer: string } | null;
  run(
    range: [number, number],
    pattern: string,
    repl: string,
    options?: string
  ): string | Promise<void> | undefined;
  createBuffer(text: string): RegExpExecArray[];
  burst(startIndex?: number, startPos?: WasaviPosition, startReplacer?: string): void;
  setupConfirmModeSubst(): void;
  continueConfirmModeSubst(action: string): boolean;
  doSubstitute(pos: WasaviPosition, length: number, replacer: string): void;
  showResult(immediate?: boolean): void;
  showNotFound(): void;
  executeReplacer(re: RegExpExecArray, opcodes?: unknown): string;
  compileReplacer(repl: string): unknown;
}

/** A single ex command descriptor (classes_ex.js, internal `ExCommand`). */
interface WasaviExCommandItem {
  name: string;
  shortName: string;
  handler: unknown;
  syntax: unknown;
  rangeCount: number;
  flags: Record<string, boolean>;
  clone(): WasaviExCommandItem;
  parseArgs(app: WasaviApp, range: unknown, line: string, syntax: unknown): unknown;
}

/**
 * Result of `Wasavi.ExCommand.parseRange`. On error it returns the error
 * message string; on success the `{rows, rest}` object (callers also stamp a
 * `source` property onto it afterwards).
 */
interface WasaviExParseRangeResult {
  rows: readonly number[];
  rest: string;
  source?: string;
}

/** Color theme manager (classes_ui.js). */
interface WasaviTheme {
  /** Snapshot of the active color set (set on the instance in the ctor/select). */
  colors: Record<string, string>;
  /** Apply a named color set; returns `false` on an unknown key, `undefined` when already active, else `true`. */
  select(colorSetName: string): boolean | undefined;
  update(): void;
  dispose(): void;
  /** Set externally; consumed internally by Theme. */
  container: HTMLElement | null;
  /** Set externally; consumed internally by Theme. */
  fontStyle: string;
  /** Set externally; consumed internally by Theme. */
  lineHeight: number;
  /** Set externally; consumed internally by Theme. */
  useStripe: boolean;
  /** Names of available color sets (a fresh array; callers may sort it). */
  readonly colorSets: string[];
}

/** Visual/audible bell (classes_ui.js). */
interface WasaviBell {
  play(key?: string, forcePlay?: boolean): void;
}

/** On-screen cursor manager (classes_ui.js). */
interface WasaviCursorUI {
  ensureVisible(smooth?: boolean): void;
  update(opts?: { visible?: boolean; focused?: boolean; type?: string }): void;
  setupEventHandlers(install: boolean): void;
  windup(): void;
  dispose(): void;
  readonly type: string | null | undefined;
  readonly focused: boolean;
  readonly visible: boolean;
  readonly commandCursor: HTMLElement;
  locked: boolean;
}

/** Smooth scroller (classes_ui.js). */
interface WasaviScroller {
  run(dest: number): Promise<boolean>;
  dispose(): void;
  readonly running: boolean;
  consumeMsecs: number;
  timerPrecision: number;
}

/** A single backlog/console line (classes_ui.js internal). */
interface WasaviBacklogLine {
  text: string;
  emphasis?: boolean;
}

/** Console / backlog pager (classes_ui.js). */
interface WasaviBacklog {
  push(arg: unknown): void;
  pushEmphasis(arg: unknown): void;
  show(): void;
  hide(): void;
  clear(): void;
  open(byLine?: boolean): void;
  dispose(): void;
  readonly buffer: readonly WasaviBacklogLine[];
  readonly queued: boolean;
  readonly rows: number;
  readonly cols: number;
  readonly visible: boolean;
  readonly text: string;
}

/** A notifier message: literal text or a callback rendering into the container. */
type WasaviNotifierMessage = string | ((container: HTMLElement) => void);

/** Transient notification UI (classes_ui.js). */
interface WasaviNotifier {
  register(message: WasaviNotifierMessage, intervalMsecs?: number, delayMsecs?: number): void;
  show(message: WasaviNotifierMessage, intervalMsecs?: number): void;
  hide(): void;
  dispose(): void;
}

/** Undo/redo logger (classes_undo.js). */
interface WasaviEditLogger {
  clear(): WasaviEditLogger;
  open(tag: unknown, func?: unknown): WasaviEditLogger;
  close(): WasaviEditLogger;
  write(type: unknown): unknown;
  undo(): unknown;
  redo(): unknown;
  dump(): unknown;
  notifySave(): unknown;
  dispose(): void;
  logMax: number;
  readonly clusterNestLevel: number;
  readonly logLength: number;
  readonly currentPosition: number;
  readonly isClean: boolean;
}

// === the Wasavi global ===================================================

declare var Wasavi: {
  // --- constants (init.js) ---
  readonly IS_GECKO: boolean;
  readonly BRACKETS: string;
  readonly CLOSE_BRACKETS: string;
  readonly LINE_NUMBER_MAX_WIDTH: number;
  readonly LINE_NUMBER_RELATIVE_WIDTH: number;
  readonly COMPOSITION_CLASS: string;
  readonly LEADING_CLASS: string;
  readonly MARK_CLASS: string;
  readonly EMPHASIS_CLASS: string;
  readonly CURSOR_SPAN_CLASS: string;
  readonly BOUND_CLASS: string;
  readonly MIGEMO_EXTENSION_ID: string;
  readonly MIGEMO_GET_REGEXP_STRING: string;
  readonly LOG_PROMISE: boolean;
  readonly LOG_EX: boolean;
  readonly LOG_MAP_MANAGER: boolean;
  readonly LOG_LAST_SIMPLE_COMMAND: boolean;

  // --- classes (classes.js) ---
  Position: new (row: number, col: number) => WasaviPosition;
  L10n: new (app: WasaviApp, catalog?: WasaviMessageCatalog) => WasaviL10n;
  Configurator: new (app: WasaviApp, internals: readonly WasaviConfigInternal[], abbrevs: Record<string, string>) => WasaviConfigurator;
  RegexConverter: new (app: WasaviApp) => WasaviRegexConverter;
  PrefixInput: new (init?: string | WasaviPrefixInputInit) => WasaviPrefixInput;
  RegexFinderInfo: new () => WasaviRegexFinderInfo;
  LineInputHistories: new (
    app: WasaviApp,
    maxSize: number,
    names: readonly string[],
    value?: unknown
  ) => WasaviLineInputHistories;
  MapManager: new (app: WasaviApp, opts?: WasaviMapManagerOptions) => WasaviMapManager;
  Registers: new (app: WasaviApp, value?: unknown) => WasaviRegisters;
  Marks: new (app: WasaviApp, value?: unknown) => WasaviMarks;
  Editor: new (element: string | HTMLElement) => WasaviEditor;
  LiteralInput: new () => WasaviLiteralInput;
  InputHandler: new (appProxy: WasaviApp) => WasaviInputHandler;
  Completer: new (appProxy: WasaviApp, alist?: unknown) => WasaviCompleter;
  StrokeRecorder: new () => WasaviStrokeRecorder;
  Surrounding: new (app: WasaviApp) => WasaviSurrounding;
  IncDec: new (app: WasaviApp, defaultOpts?: Record<string, unknown>) => WasaviIncDec;
  SortWorker: new (app: WasaviApp, t: WasaviEditor, a: WasaviExCommandArg) => WasaviSortWorker;

  // --- classes (other files) ---
  SearchUtils: new (app: WasaviApp) => WasaviSearchUtils;
  SubstituteWorker: new (app: WasaviApp) => WasaviSubstituteWorker;
  Theme: new (app: WasaviApp) => WasaviTheme;
  Bell: new (app: WasaviApp) => WasaviBell;
  CursorUI: new (
    app: WasaviApp,
    comCursor: HTMLElement,
    comCursorLine: HTMLElement,
    comCursorColumn: HTMLElement,
    comFocusHolder: HTMLElement,
    input: HTMLElement
  ) => WasaviCursorUI;
  Scroller: new (app: WasaviApp, cursor: WasaviCursorUI, modeLine: unknown) => WasaviScroller;
  Backlog: new (app: WasaviApp, container: unknown, con: unknown) => WasaviBacklog;
  Notifier: new (app: WasaviApp, container: unknown) => WasaviNotifier;
  EditLogger: {
    new (app: WasaviApp, max: number): WasaviEditLogger;
    readonly ITEM_TYPE: Record<string, number>;
  };

  // --- frozen namespace object (classes_ex.js) ---
  ExCommand: {
    find(name: string): WasaviExCommandItem | null;
    create(
      name: string,
      shortName: string,
      syntax: unknown,
      flags: number,
      handler: unknown
    ): WasaviExCommandItem;
    parseRange(
      app: WasaviApp,
      s: string,
      requiredCount?: number,
      allowZeroAddress?: boolean
    ): WasaviExParseRangeResult | string;
    defaultCommand: WasaviExCommandItem;
    printRow(app: WasaviApp, t: WasaviEditor, from: number, to: number, flags: Record<string, boolean>): void;
    commands: readonly WasaviExCommandItem[];
  };
};
