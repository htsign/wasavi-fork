// Ambient declarations for the shared utility globals published by
// src/core/frontend/utils.js (inside its IIFE as `g.X = function (...) {...}`)
// and a few neighbouring vendored globals (unistring.js, unicode_utils.js).
// Type-only; emits no runtime code. The `Wasavi` namespace is intentionally
// out of scope here (handled separately).

// === prototype extensions (utils.js) =====================================

interface Array<T> {
  /** First element, or undefined when empty (utils.js Array.prototype getter/setter). */
  firstItem: T | undefined;
  /** Last element, or undefined when empty (utils.js Array.prototype getter/setter). */
  lastItem: T | undefined;
}

// === DOM manipulators (utils.js) =========================================

/** Resolve an id string to its element, or pass an element through. */
declare function $(arg: string | HTMLElement): HTMLElement | null;

declare function docScrollLeft(): number;
declare function docScrollTop(): number;
declare function docScrollWidth(): number;
declare function docScrollHeight(): number;
declare function docClientWidth(): number;
declare function docClientHeight(): number;

/** Remove every child of the given node (id string or element). */
declare function emptyNodeContents(node: string | HTMLElement): void;

/** Detach each given node (id string or element) from its parent. */
declare function removeChild(...nodes: readonly (string | HTMLElement)[]): void;

/** Tests the target's nodeName; accepts a DOM node or wasavi's target descriptor. */
declare function isMultilineTextInput(target: { nodeName: string }): boolean;

/** Copy each property of `styles` onto `src.style`. */
declare function style(src: HTMLElement, styles: Record<string, string>): void;

// === simple functions (utils.js) =========================================

/** Invoke each argument that is a function. */
declare function $call(...fns: readonly unknown[]): void;

declare function extend<T extends object, U extends object>(dest: T, src: U): T & U;

declare function isKeyOf<T extends object>(target: T, key: string): key is keyof T;

declare function isTextNode(node: Node | null): node is Text;
declare function isElementNode(node: Node | null): node is Element;

/** Parse JSON, returning `null` instead of throwing on malformed input. */
declare function parseJson(src: string): unknown;

/** Swap keys and values of an object. */
declare function reverseObject(o: Record<string, string>): Record<string, string>;

/** Repeat `letter` `times` times. */
declare function multiply(letter: string, times: number): string;

/** Render any value as a human-readable string, escaping control characters. */
declare function toVisibleString(s: unknown): string;

/** Map control characters to U+2400-block visible pictures (string or code point). */
declare function toVisibleControl(s: string | number): string;

/** Inverse of toVisibleControl (string or code point). */
declare function toNativeControl(s: string | number): string;

declare function _toVisibleControl(code: number): string;
declare function _toNativeControl(code: number): string;

/** Strip a single trailing terminator (default '\n') from `s`. */
declare function trimTerm(s: string, ch?: string): string;

/** The bracketed type name from Object.prototype.toString (e.g. 'Array'). */
declare function getObjectType(value: unknown): string;

declare function isObject(value: unknown): value is Record<string, unknown>;
declare function isString(value: unknown): value is string;
declare function isNumber(value: unknown): value is number;
declare function isBoolean(value: unknown): value is boolean;
declare function isArray(value: unknown): value is unknown[];
declare function isFunction(value: unknown): value is Function;
declare function isGenerator(value: unknown): value is GeneratorFunction;

/** Array.prototype.slice over an array-like value. */
declare function toArray<T>(arg: ArrayLike<T>, index?: number): T[];

/** Clamp `value` into [min, max]. */
declare function minmax(min: number, value: number, max: number): number;

/** Escape regexp metacharacters in `s`. */
declare function getLiteralRegexp(s: string): string;

// === a bit complicated functions (utils.js) ==============================

/** gettext-style formatter: first arg is the format, rest fill `{n}` slots. */
declare function _(format: string, ...args: unknown[]): string;

/** Define enumerable, read-only members on `target` from functions/objects. */
declare function publish(target: object, ...sources: readonly unknown[]): void;

/** Evaluate an arithmetic expression string. */
declare function expr(source: string): { result?: number; error?: string };

/** strftime-compatible formatter; returns `false` on invalid arguments. */
declare function strftime(format: string, datetime?: Date): string | false;

/** Drive a generator that yields Promises, resolving with its return value. */
declare function execGenerator<Args extends unknown[], T>(
  generatorFn: (...args: Args) => Generator<unknown, T, unknown>,
  thisObj: unknown,
  ...args: Args
): Promise<T>;

/** split() that caps the result length at `num`, packing the remainder. */
declare function splitex(s: string, d: string | RegExp, num: number): string[];

// === vendored globals =====================================================

/** A single word cluster produced by Unistring.getWords. */
interface UnistringWord {
  text: string;
  index: number;
  length: number;
  type: number;
}

/** Array of word clusters with an extra wordIndexOf lookup. */
interface UnistringWords extends Array<UnistringWord> {
  wordIndexOf(index: number): number;
}

/** A grapheme-cluster-aware string instance produced by calling `Unistring(s)`. */
interface UnistringInstance {
  readonly length: number;
  toString(): string;
  charAt(index: number): string;
  charCodeAt(index: number): number;
  codePointsAt(index?: number): number[] | undefined;
  clusterAt(index?: number): string;
  rawStringAt(index?: number): string;
  rawIndexAt(index?: number): number;
  getClusterIndexFromUTF16Index(index: number): number;
  delete(start?: number, length?: number): UnistringInstance;
  insert(s: string | UnistringInstance, start?: number): UnistringInstance;
  append(s: string | UnistringInstance): UnistringInstance;
  concat(s: string | UnistringInstance): UnistringInstance;
  substring(start?: number, end?: number): UnistringInstance;
  substr(start?: number, length?: number): UnistringInstance;
  slice(start?: number, end?: number): UnistringInstance;
  indexOf(s: string | UnistringInstance): number;
  lastIndexOf(s: string | UnistringInstance): number;
  toLowerCase(useLocale?: boolean): UnistringInstance;
  toUpperCase(useLocale?: boolean): UnistringInstance;
  forEach(callback: (g: unknown, index: number, array: readonly unknown[]) => void): void;
}

/** Minimal surface of the vendored Unistring global (src/core/frontend/unistring.js). */
interface UnistringStatic {
  (s: string | UnistringInstance): UnistringInstance;
  new (s: string | UnistringInstance): UnistringInstance;
  WBP: Record<string, number>;
  GBP: Record<string, number>;
  SBP: Record<string, number>;
  SCRIPT: Record<string, number>;
  WBP_NAMES: string[];
  GBP_NAMES: string[];
  SBP_NAMES: string[];
  SCRIPT_NAMES: string[];
  getWords(s: string, useScripts?: boolean): UnistringWords;
  getSentences(s: string): UnistringWord[];
  getCodePointArray(s: string): number[];
  getGraphemeBreakProp(cp: number): number;
  getWordBreakProp(cp: number): number;
  getSentenceBreakProp(cp: number): number;
  getScriptProp(cp: number): number;
  getUTF16FromCodePoint(cp: number): string;
  getCodePointString(cp: number, type?: string): string;
}

declare var Unistring: UnistringStatic;

/** Frozen helper bag from src/core/frontend/unicode_utils.js. */
declare var unicodeUtils: {
  readonly BREAK_PROP: Record<string, number>;
  readonly BREAK_ACTION: Record<string, number>;
  readonly LineBreaker: Function;
  readonly FfttDictionary: Function;
  getScriptClass(cp: number): number;
  isSpace(ch: string): boolean;
  isClosedPunct(ch: string): boolean;
  isSTerm(ch: string): boolean;
  isPTerm(ch: string): boolean;
  isIdeograph(ch: string): boolean;
  isNonLetter(ch: string): boolean;
  isHighSurrogate(cp: number): boolean;
  isLowSurrogate(cp: number): boolean;
  toUCS32(hcp: number, lcp: number): number;
  toUTF16(cp: number): string;
  canBreak(act: number): boolean;
  getUnicodeGeneralSpaceRegex(source: string, opts?: string): RegExp;
};

/** Shortcut for unicodeUtils.getUnicodeGeneralSpaceRegex. */
declare function spc(source: string, opts?: string): RegExp;
