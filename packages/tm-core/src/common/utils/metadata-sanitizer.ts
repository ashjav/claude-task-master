/**
 * @fileoverview Metadata sanitization utilities
 *
 * The `metadata` field on tasks is user-defined `Record<string, unknown>` and
 * is preserved end-to-end through AI operations, MCP responses, CLI output, and
 * persisted JSON. That makes it a vehicle for several attacks if left raw:
 *
 * 1. **Prompt injection** — when MCP tools return task data to an LLM, an
 *    attacker-controlled metadata string can carry instructions that override
 *    the host agent's intent.
 * 2. **Terminal escape injection** — ANSI control sequences embedded in
 *    metadata can spoof CLI output (fake "verified" lines, scroll rewrites).
 * 3. **Resource exhaustion** — deeply nested or very large metadata blobs
 *    inflate memory and prompt token use.
 *
 * The sanitizer is the single chokepoint at every metadata ingress/egress.
 */

const DEFAULT_MAX_DEPTH = 5;
const DEFAULT_MAX_KEYS = 100;
const DEFAULT_MAX_STRING_LENGTH = 4096;
const DEFAULT_MAX_KEY_LENGTH = 128;

/**
 * ASCII control characters that are not safe to render in a terminal or to
 * pass back to an LLM as untrusted content.
 *
 * - Stripped: 0x00-0x08, 0x0B-0x1F, 0x7F
 * - Preserved: 0x09 tab, 0x0A LF, 0x0D CR (common whitespace in user content)
 */
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export interface MetadataSanitizeOptions {
	maxDepth?: number;
	maxKeys?: number;
	maxStringLength?: number;
	maxKeyLength?: number;
}

export class MetadataValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'MetadataValidationError';
	}
}

/**
 * Strip ANSI escapes and other terminal control characters from a string.
 * Truncates if longer than `maxLength`.
 */
export function sanitizeMetadataString(
	value: string,
	maxLength: number = DEFAULT_MAX_STRING_LENGTH
): string {
	const stripped = value.replace(CONTROL_CHAR_PATTERN, '');
	if (stripped.length <= maxLength) return stripped;
	return `${stripped.slice(0, maxLength)}…[truncated]`;
}

/**
 * Recursively sanitize a metadata value. Throws `MetadataValidationError` if
 * the structure violates depth/key limits or contains an unserializable value
 * (function, symbol, bigint).
 *
 * Strings are scrubbed of control characters and truncated.
 * Numbers/booleans/null pass through.
 * Arrays and plain objects are walked recursively.
 */
export function sanitizeMetadata(
	value: unknown,
	options: MetadataSanitizeOptions = {}
): unknown {
	const opts = {
		maxDepth: options.maxDepth ?? DEFAULT_MAX_DEPTH,
		maxKeys: options.maxKeys ?? DEFAULT_MAX_KEYS,
		maxStringLength: options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH,
		maxKeyLength: options.maxKeyLength ?? DEFAULT_MAX_KEY_LENGTH
	};
	let totalKeys = 0;
	const seen = new WeakSet<object>();

	function walk(node: unknown, depth: number): unknown {
		if (depth > opts.maxDepth) {
			throw new MetadataValidationError(
				`metadata exceeds max nesting depth of ${opts.maxDepth}`
			);
		}

		if (node === null) return null;

		switch (typeof node) {
			case 'string':
				return sanitizeMetadataString(node, opts.maxStringLength);
			case 'number':
				return Number.isFinite(node) ? node : null;
			case 'boolean':
				return node;
			case 'undefined':
				return undefined;
			case 'function':
			case 'symbol':
			case 'bigint':
				throw new MetadataValidationError(
					`metadata may not contain values of type ${typeof node}`
				);
		}

		if (typeof node === 'object') {
			if (seen.has(node)) {
				throw new MetadataValidationError(
					'metadata contains a circular reference'
				);
			}
			seen.add(node);

			if (Array.isArray(node)) {
				return node.map((item) => walk(item, depth + 1));
			}

			// Reject anything exotic: Date/Map/Set/RegExp/Buffer/etc. all serialize
			// to surprising shapes and have no well-defined string form.
			const proto = Object.getPrototypeOf(node);
			if (proto !== Object.prototype && proto !== null) {
				throw new MetadataValidationError(
					'metadata may only contain plain objects, arrays, and primitives'
				);
			}

			const out: Record<string, unknown> = {};
			for (const [rawKey, rawVal] of Object.entries(node as Record<string, unknown>)) {
				totalKeys += 1;
				if (totalKeys > opts.maxKeys) {
					throw new MetadataValidationError(
						`metadata exceeds maximum total keys of ${opts.maxKeys}`
					);
				}
				const key = sanitizeMetadataString(rawKey, opts.maxKeyLength);
				if (key.length === 0) {
					throw new MetadataValidationError(
						'metadata keys must be non-empty after sanitization'
					);
				}
				const sanitizedVal = walk(rawVal, depth + 1);
				if (sanitizedVal !== undefined) {
					out[key] = sanitizedVal;
				}
			}
			return out;
		}

		return undefined;
	}

	return walk(value, 0);
}

/**
 * Validate and sanitize the top-level metadata object. The top level must be
 * a plain object (or null/undefined to clear).
 */
export function sanitizeTaskMetadata(
	metadata: unknown,
	options?: MetadataSanitizeOptions
): Record<string, unknown> | undefined {
	if (metadata === undefined || metadata === null) return undefined;
	if (
		typeof metadata !== 'object' ||
		Array.isArray(metadata) ||
		Object.getPrototypeOf(metadata) !== Object.prototype
	) {
		throw new MetadataValidationError(
			'metadata must be a plain JSON object'
		);
	}
	const result = sanitizeMetadata(metadata, options);
	return result as Record<string, unknown>;
}
