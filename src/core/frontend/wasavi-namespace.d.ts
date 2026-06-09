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
  low: unknown;
  config: unknown;
  edit: unknown;
  exvm: unknown;
  extensionChannel: unknown;
  lastRegexFindCommand: unknown;
  keyManager: unknown;
  fileName: unknown;
  motion: unknown;
  targetElement: unknown;
  lastSubstituteInfo: unknown;
  fstab: unknown;
  abbrevs: unknown;
  isTextDirty: unknown;
  fileSystemIndex: unknown;
  isEditCompleted: unknown;
  ffttDictionary: unknown;
  isJumpBaseUpdateRequested: unknown;
  version: unknown;
  preferredNewline: unknown;
  lineHeight: unknown;
  lastMessage: unknown;
  inputMode: unknown;
  terminated: unknown;
  requestedState: unknown;
  charWidth: unknown;
  state: unknown;
  isVerticalMotion: unknown;
  isTestMode: unknown;
  devMode: unknown;
}

// === instance interfaces =================================================

/** Localization helper (classes.js). */
interface WasaviL10n {
  getMessage(messageId: string): string;
  getTranslator(): (...args: readonly unknown[]) => string;
  dispose(): void;
}

/** Option / variable configurator (classes.js). */
interface WasaviConfigurator {
  getInfo(name: string): unknown;
  getData(name: string, reformat?: boolean): unknown;
  setData(name: string, value?: unknown, skipSubSetter?: boolean): unknown;
  dump(cols: number, all?: boolean): unknown;
  dumpData(): unknown;
  dumpScript(modifiedOnly?: boolean): unknown;
  reset(name?: string): unknown;
  saveSnapshot(name: string): unknown;
  loadSnapshot(name: string): unknown;
  dispose(): void;
  readonly vars: Record<string, unknown>;
  readonly abbrevs: unknown;
}

/** vi-to-JS regex converter (classes.js). */
interface WasaviRegexConverter {
  fixup(s: string): string;
  toJsRegexString(s: string | RegExp): string;
  toJsRegex(s: string | RegExp, opts?: string): RegExp | null;
  toLiteralString(s: string): string;
  getCS(s: string): string;
  getDefaultOption(): { wrapscan: unknown };
  readonly SPECIAL_SPACE: string;
  readonly SPECIAL_NONSPACE: string;
}

/** Parsed prefix command input (classes.js). */
interface WasaviPrefixInput {
  reset(): void;
  clone(): WasaviPrefixInput;
  assign(pi: WasaviPrefixInput | Record<string, unknown>): void;
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
interface WasaviRegexFinderInfo {
  push(o: Record<string, unknown>): void;
  setPattern(p: string, withOffset?: boolean): void;
  readonly head: string;
  readonly direction: number;
  readonly offset: number;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly pattern: string;
  readonly verticalOffset: number | undefined;
  text: unknown;
  readonly updateBound: boolean;
  internalRegex: RegExp | undefined;
}

/** Command/search line input history (classes.js). */
interface WasaviLineInputHistories {
  push(line: string): unknown;
  prev(): unknown;
  next(): unknown;
  save(): unknown;
  load(value?: unknown): unknown;
  isInitial: boolean;
  defaultName: string;
  readonly storageKey: string;
}

/** Key-mapping manager (classes.js). */
interface WasaviMapManager {
  markExpanded(items: unknown): unknown;
  markExpandedNoremap(items: unknown): unknown;
  process(mode: string, e: unknown): unknown;
  readonly maps: Record<string, unknown>;
  onexpand: unknown;
  onrecursemax: unknown;
  readonly isWaiting: boolean;
}

/** Register store (classes.js). */
interface WasaviRegisters {
  set(name: string, data: unknown, isLineOrient?: boolean, isInteractive?: boolean): unknown;
  get(name: string): unknown;
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
  dumpData(): unknown;
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
  getSelection(): unknown;
  getSelectionLinewise(): unknown;
  leftPos(...args: readonly unknown[]): WasaviPosition;
  leftClusterPos(...args: readonly unknown[]): WasaviPosition;
  rightPos(...args: readonly unknown[]): WasaviPosition;
  rightClusterPos(...args: readonly unknown[]): WasaviPosition;
  indexOf(node: Node): number;
  getLineTopOffset(...args: readonly unknown[]): WasaviPosition;
  getLineTopOffset2(pos: WasaviPositionLike): WasaviPosition;
  getLineTailOffset(...args: readonly unknown[]): WasaviPosition;
  getIndent(...args: readonly unknown[]): string;
  getBackIndent(...args: readonly unknown[]): string;
  getSpans(className: string, start?: unknown, end?: unknown): readonly unknown[];
  invalidateUnicodeCache(): void;
  initUnicodeCache(): unknown;
  getGraphemeClusters(n: unknown): unknown;
  getWords(n: unknown): unknown;
  getClosestOffsetToPixels(n: unknown, pixels: number): unknown;
  setRow(arg: unknown, text: string): unknown;
  setSelectionRange(...args: readonly unknown[]): unknown;
  adjustBackgroundImage(...args: readonly unknown[]): unknown;
  adjustLineNumberClass(isAbsolute?: boolean, isRelative?: boolean): unknown;
  adjustLineNumber(...args: readonly unknown[]): unknown;
  adjustWrapGuide(width: number, unit: string): unknown;
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
  divideLine(n: unknown): unknown;
  extendSelectionTo(n: unknown): unknown;
  linearPositionToBinaryPosition(n: number): WasaviPosition | null;
  binaryPositionToLinearPosition(a: WasaviPositionLike): number;
  emphasis(pos: WasaviPositionLike, length: number, className?: string): unknown;
  unEmphasis(className: string, start?: unknown, end?: unknown): unknown;
  offsetBy(s: unknown, offset: number, treatLastLineAsNormal?: boolean): unknown;
  regalizeSelectionRelation(): unknown;
  clipPosition(...args: readonly unknown[]): unknown;

  readonly rowLength: number;
  value: string;
  readonly selected: boolean;
  selectionStart: WasaviPosition | number;
  readonly selectionStartRow: number;
  readonly selectionStartCol: number;
  selectionEnd: WasaviPosition | number;
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
  dispose(): void;
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
interface WasaviSortWorker {
  app: unknown;
  t: WasaviEditor;
  a: unknown;
  content: string | null;
  opts: Record<string, unknown> | null;
  terminalType: number;
  dosort(content: string[], key: string, regex: RegExp, opts: Record<string, unknown>): string[];
  preSort(type: number, content: string): string;
  postSort(type: number, content: string): string;
  parseArgs(arg: string): unknown;
  buildContent(content: string): unknown;
  sort(): unknown;
  getContent(): unknown;
}

/** Text-object / motion search helpers (classes_search.js). */
interface WasaviSearchUtils {
  findQuoteRange(line: string, firstCol: number, quoteChar: string): unknown;
  findSentenceBoundary(count: number, isForward: boolean, isFindOnly?: boolean): unknown;
  findParagraphBoundary(
    count: number,
    isForward: boolean,
    isFindOnly: boolean,
    what: unknown,
    both?: boolean
  ): unknown;
  findMatchedBracket(count: number, bracketSpecified: unknown, initialPos?: WasaviPositionLike): unknown;
  quote(count: number, quoteChar: string, includeAnchor?: boolean): unknown;
  word(count: number, bigword: boolean, includeAnchor?: boolean): unknown;
  block(count: number, what: unknown, over: unknown, includeAnchor?: boolean): unknown;
  sentence(count: number, includeAnchor?: boolean): unknown;
  paragraph(count: number, includeAnchor?: boolean): unknown;
  dispatchRangeSymbol(count: number, targetChar: string, includeAnchor?: boolean): unknown;
  setParagraphMacros(m: unknown): unknown;
  setSectionMacros(m: unknown): unknown;
  getPairBracketsIndicator(targetChar: string, initialPos?: WasaviPositionLike): unknown;
  dispose(): void;
}

/** `:substitute` worker (classes_subst.js). */
interface WasaviSubstituteWorker {
  app: unknown;
  patternString: string;
  pattern: RegExp | null;
  replOpcodes: unknown;
  range: unknown;
  isGlobal: boolean;
  isConfirm: boolean;
  substCount: number;
  buffer: unknown;
  kontinueWorker: unknown;
  run(range: unknown, pattern: string, repl: string, options?: string): unknown;
  createBuffer(text: string): unknown;
  burst(startIndex: number, startPos: WasaviPositionLike, startReplacer: unknown): unknown;
  setupConfirmModeSubst(): unknown;
  continueConfirmModeSubst(action: unknown): unknown;
  doSubstitute(pos: WasaviPositionLike, length: number, replacer: unknown): unknown;
  showResult(immediate?: boolean): unknown;
  showNotFound(): unknown;
  executeReplacer(re: RegExpExecArray, opcodes: unknown): unknown;
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
  colors: Record<string, unknown>;
  select(colorSetName: string): unknown;
  update(): unknown;
  dispose(): void;
  container: unknown;
  fontStyle: unknown;
  lineHeight: unknown;
  useStripe: unknown;
  /** Names of available color sets (a fresh array; callers may sort it). */
  readonly colorSets: string[];
}

/** Visual/audible bell (classes_ui.js). */
interface WasaviBell {
  play(key?: string, forcePlay?: boolean): unknown;
}

/** On-screen cursor manager (classes_ui.js). */
interface WasaviCursorUI {
  ensureVisible(smooth?: boolean): unknown;
  update(opts?: unknown): unknown;
  setupEventHandlers(install: boolean): unknown;
  windup(): unknown;
  dispose(): void;
  readonly type: string | null;
  readonly focused: boolean;
  readonly visible: boolean;
  readonly commandCursor: unknown;
  locked: boolean;
}

/** Smooth scroller (classes_ui.js). */
interface WasaviScroller {
  run(dest: unknown): unknown;
  dispose(): void;
  readonly running: boolean;
  consumeMsecs: number;
  timerPrecision: number;
}

/** Console / backlog pager (classes_ui.js). */
interface WasaviBacklog {
  push(arg: unknown): unknown;
  pushEmphasis(arg: unknown): unknown;
  show(): unknown;
  hide(): unknown;
  clear(): unknown;
  open(byLine?: boolean): unknown;
  dispose(): void;
  readonly buffer: unknown;
  readonly queued: unknown;
  readonly rows: unknown;
  readonly cols: unknown;
  readonly visible: boolean;
  readonly text: unknown;
}

/** Transient notification UI (classes_ui.js). */
interface WasaviNotifier {
  register(message: string, intervalMsecs?: number, delayMsecs?: number): unknown;
  show(message: string, intervalMsecs?: number): unknown;
  hide(): unknown;
  dispose(): void;
}

/** Undo/redo logger (classes_undo.js). */
interface WasaviEditLogger {
  clear(): WasaviEditLogger;
  open(tag: unknown, func?: unknown): unknown;
  close(): unknown;
  write(type: unknown): unknown;
  undo(): unknown;
  redo(): unknown;
  dump(): unknown;
  notifySave(): unknown;
  dispose(): void;
  logMax: number;
  readonly clusterNestLevel: number;
  readonly logLength: number;
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
  L10n: new (app: WasaviApp, catalog?: unknown) => WasaviL10n;
  Configurator: new (app: WasaviApp, internals?: unknown, abbrevs?: unknown) => WasaviConfigurator;
  RegexConverter: new (app: WasaviApp) => WasaviRegexConverter;
  PrefixInput: new (init?: string | Record<string, unknown>) => WasaviPrefixInput;
  RegexFinderInfo: new () => WasaviRegexFinderInfo;
  LineInputHistories: new (
    app: WasaviApp,
    maxSize: number,
    names: unknown,
    value?: unknown
  ) => WasaviLineInputHistories;
  MapManager: new (app: WasaviApp, opts?: Record<string, unknown>) => WasaviMapManager;
  Registers: new (app: WasaviApp, value?: unknown) => WasaviRegisters;
  Marks: new (app: WasaviApp, value?: unknown) => WasaviMarks;
  Editor: new (element: string | HTMLElement) => WasaviEditor;
  LiteralInput: new () => WasaviLiteralInput;
  InputHandler: new (appProxy: WasaviApp) => WasaviInputHandler;
  Completer: new (appProxy: WasaviApp, alist?: unknown) => WasaviCompleter;
  StrokeRecorder: new () => WasaviStrokeRecorder;
  Surrounding: new (app: WasaviApp) => WasaviSurrounding;
  IncDec: new (app: WasaviApp, defaultOpts?: Record<string, unknown>) => WasaviIncDec;
  SortWorker: new (app: WasaviApp, t: WasaviEditor, a: unknown) => WasaviSortWorker;

  // --- classes (other files) ---
  SearchUtils: new (app: WasaviApp) => WasaviSearchUtils;
  SubstituteWorker: new (app: WasaviApp) => WasaviSubstituteWorker;
  Theme: new (app: WasaviApp) => WasaviTheme;
  Bell: new (app: WasaviApp) => WasaviBell;
  CursorUI: new (
    app: WasaviApp,
    comCursor: unknown,
    comCursorLine: unknown,
    comCursorColumn: unknown,
    comFocusHolder: unknown,
    input: unknown
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
