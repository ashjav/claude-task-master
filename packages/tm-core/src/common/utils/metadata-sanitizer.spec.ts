/**
 * @fileoverview Unit tests for the metadata sanitizer.
 *
 * These are regression tests for the security fixes that landed alongside
 * task metadata becoming a free-form `Record<string, unknown>`.
 */

import { describe, expect, it } from 'vitest';
import {
	MetadataValidationError,
	sanitizeMetadata,
	sanitizeMetadataString,
	sanitizeTaskMetadata
} from './metadata-sanitizer.js';

describe('sanitizeMetadataString', () => {
	it('strips ANSI escape sequences', () => {
		const malicious = '\x1b[31mFAKE ERROR\x1b[0m payload';
		expect(sanitizeMetadataString(malicious)).toBe('[31mFAKE ERROR[0m payload');
		// The escape byte (0x1B) is removed; the visible characters remain.
		expect(sanitizeMetadataString(malicious)).not.toContain('\x1b');
	});

	it('strips bell, backspace, NUL and other control bytes', () => {
		const garbage = 'a\x00b\x07c\x08d\x7Fe';
		expect(sanitizeMetadataString(garbage)).toBe('abcde');
	});

	it('preserves common whitespace (\\t \\n \\r)', () => {
		const formatted = 'line1\n\tindented\r\n';
		expect(sanitizeMetadataString(formatted)).toBe(formatted);
	});

	it('truncates strings longer than the limit', () => {
		const huge = 'x'.repeat(10);
		expect(sanitizeMetadataString(huge, 5)).toBe('xxxxx…[truncated]');
	});
});

describe('sanitizeTaskMetadata', () => {
	it('returns undefined for null/undefined input', () => {
		expect(sanitizeTaskMetadata(undefined)).toBeUndefined();
		expect(sanitizeTaskMetadata(null)).toBeUndefined();
	});

	it('rejects non-object top-level metadata', () => {
		expect(() => sanitizeTaskMetadata('hello')).toThrow(
			MetadataValidationError
		);
		expect(() => sanitizeTaskMetadata([1, 2, 3])).toThrow(
			MetadataValidationError
		);
		expect(() => sanitizeTaskMetadata(42)).toThrow(MetadataValidationError);
	});

	it('rejects class instances (non-plain objects)', () => {
		class Custom {
			constructor(public name = 'x') {}
		}
		expect(() => sanitizeTaskMetadata(new Custom() as unknown)).toThrow(
			MetadataValidationError
		);
	});

	it('rejects bigint, function and symbol values', () => {
		expect(() => sanitizeTaskMetadata({ x: BigInt(1) })).toThrow(
			MetadataValidationError
		);
		expect(() =>
			sanitizeTaskMetadata({ x: () => 1 } as unknown)
		).toThrow(MetadataValidationError);
		expect(() => sanitizeTaskMetadata({ x: Symbol('s') })).toThrow(
			MetadataValidationError
		);
	});

	it('rejects circular references', () => {
		const circular: Record<string, unknown> = { a: 1 };
		circular.self = circular;
		expect(() => sanitizeTaskMetadata(circular)).toThrow(
			MetadataValidationError
		);
	});

	it('enforces a maximum nesting depth', () => {
		// 6 levels of nesting beyond the root → exceeds default depth of 5
		const deep: Record<string, unknown> = {};
		let cursor: Record<string, unknown> = deep;
		for (let i = 0; i < 7; i += 1) {
			const next: Record<string, unknown> = {};
			cursor.next = next;
			cursor = next;
		}
		expect(() => sanitizeTaskMetadata(deep)).toThrow(MetadataValidationError);
	});

	it('enforces a maximum total key count', () => {
		const wide: Record<string, unknown> = {};
		for (let i = 0; i < 200; i += 1) {
			wide[`k${i}`] = i;
		}
		expect(() => sanitizeTaskMetadata(wide, { maxKeys: 100 })).toThrow(
			MetadataValidationError
		);
	});

	it('strips ANSI from nested string values', () => {
		const out = sanitizeTaskMetadata({
			label: '\x1b[31mfake\x1b[0m',
			nested: { note: '\x1b[1mbold\x1b[0m' }
		}) as Record<string, any>;
		expect(out.label).not.toContain('\x1b');
		expect(out.nested.note).not.toContain('\x1b');
	});

	it('preserves typical integration metadata shape', () => {
		const integration = {
			jira: { key: 'PROJ-123', type: 'story', epic: 'EPIC-45' },
			linkedPRs: ['#101', '#102']
		};
		expect(sanitizeTaskMetadata(integration)).toEqual(integration);
	});
});

describe('sanitizeMetadata (recursive primitive handling)', () => {
	it('coerces non-finite numbers to null', () => {
		const result = sanitizeMetadata({ inf: Infinity, nan: NaN }) as Record<
			string,
			unknown
		>;
		expect(result.inf).toBeNull();
		expect(result.nan).toBeNull();
	});

	it('preserves booleans and null', () => {
		expect(sanitizeMetadata({ a: true, b: false, c: null })).toEqual({
			a: true,
			b: false,
			c: null
		});
	});
});
