const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const css = require('css');

const {
	escapeXml,
	formatXml,
	translateValue,
	transformProperty,
	css2uss,
	tagMap,
	getAssetPath,
	extractCssVariables,
	resolveVariable,
	resolveValueWithVariables,
	getDefaultConfig,
	setConfig,
	setCssVariables
} = require('../index.js')._internal;

// ── escapeXml ──

describe('escapeXml', () => {
	it('escapes ampersand', () => {
		assert.strictEqual(escapeXml('a & b'), 'a &amp; b');
	});

	it('escapes angle brackets', () => {
		assert.strictEqual(escapeXml('<div>'), '&lt;div&gt;');
	});

	it('escapes quotes', () => {
		assert.strictEqual(escapeXml('"hello"'), '&quot;hello&quot;');
		assert.strictEqual(escapeXml("'hello'"), '&apos;hello&apos;');
	});

	it('handles empty string', () => {
		assert.strictEqual(escapeXml(''), '');
	});

	it('handles string with no special characters', () => {
		assert.strictEqual(escapeXml('hello world'), 'hello world');
	});
});

// ── transformProperty ──

describe('transformProperty', () => {
	it('maps background to background-color', () => {
		assert.strictEqual(transformProperty('background'), 'background-color');
	});

	it('maps font-family to -unity-font', () => {
		assert.strictEqual(transformProperty('font-family'), '-unity-font');
	});

	it('maps text-align to -unity-text-align', () => {
		assert.strictEqual(transformProperty('text-align'), '-unity-text-align');
	});

	it('passes through other properties unchanged', () => {
		assert.strictEqual(transformProperty('color'), 'color');
		assert.strictEqual(transformProperty('margin'), 'margin');
	});
});

// ── translateValue ──

describe('translateValue', () => {
	it('converts vw to %', () => {
		assert.strictEqual(translateValue('50vw', 'width'), '50%');
	});

	it('converts vh to %', () => {
		assert.strictEqual(translateValue('100vh', 'height'), '100%');
	});

	it('fixes leading dot in numbers', () => {
		assert.strictEqual(translateValue('.5px', 'margin'), '0.5px');
	});

	it('maps text-align left to middle-left', () => {
		assert.strictEqual(translateValue('left', '-unity-text-align'), 'middle-left');
	});

	it('maps text-align center to middle-center', () => {
		assert.strictEqual(translateValue('center', '-unity-text-align'), 'middle-center');
	});

	it('maps text-align right to middle-right', () => {
		assert.strictEqual(translateValue('right', '-unity-text-align'), 'middle-right');
	});

	it('maps text-align justify to middle-center', () => {
		assert.strictEqual(translateValue('justify', '-unity-text-align'), 'middle-center');
	});

	it('doubles letter-spacing px value', () => {
		assert.strictEqual(translateValue('2px', 'letter-spacing'), '4px');
	});
});

// ── tagMap ──

describe('tagMap', () => {
	it('maps div to ui:VisualElement', () => {
		assert.strictEqual(tagMap['div'], 'ui:VisualElement');
	});

	it('maps p to ui:Label', () => {
		assert.strictEqual(tagMap['p'], 'ui:Label');
	});

	it('maps input to ui:TextField', () => {
		assert.strictEqual(tagMap['input'], 'ui:TextField');
	});

	it('maps input[type="checkbox"] to ui:Toggle', () => {
		assert.strictEqual(tagMap['input[type="checkbox"]'], 'ui:Toggle');
	});

	it('maps heading tags to ui:Label', () => {
		for (let i = 1; i <= 6; i++) {
			assert.strictEqual(tagMap[`h${i}`], 'ui:Label');
		}
	});
});

// ── CSS Variables ──

describe('CSS variables', () => {
	beforeEach(() => {
		setCssVariables(new Map());
	});

	it('extractCssVariables extracts --vars from rules', () => {
		const rules = [{
			declarations: [
				{ property: '--color-primary', value: '#ff0000' },
				{ property: '--size', value: '16px' },
				{ property: 'color', value: 'red' }
			]
		}];
		extractCssVariables(rules);
		// After extraction, resolveVariable should find them
		assert.strictEqual(resolveVariable('--color-primary'), '#ff0000');
		assert.strictEqual(resolveVariable('--size'), '16px');
	});

	it('resolveVariable returns undefined for missing variables', () => {
		assert.strictEqual(resolveVariable('--missing'), undefined);
	});

	it('resolveVariable resolves chained variables', () => {
		const rules = [{
			declarations: [
				{ property: '--a', value: 'var(--b)' },
				{ property: '--b', value: 'blue' }
			]
		}];
		extractCssVariables(rules);
		assert.strictEqual(resolveVariable('--a'), 'blue');
	});

	it('resolveVariable detects circular references', () => {
		const rules = [{
			declarations: [
				{ property: '--a', value: 'var(--b)' },
				{ property: '--b', value: 'var(--a)' }
			]
		}];
		extractCssVariables(rules);
		assert.strictEqual(resolveVariable('--a'), undefined);
	});

	it('resolveValueWithVariables substitutes variables', () => {
		const rules = [{
			declarations: [{ property: '--gap', value: '10px' }]
		}];
		extractCssVariables(rules);
		assert.strictEqual(resolveValueWithVariables('var(--gap)'), '10px');
	});

	it('resolveValueWithVariables returns null for undefined vars', () => {
		assert.strictEqual(resolveValueWithVariables('var(--missing)'), null);
	});
});

// ── css2uss integration ──

describe('css2uss', () => {
	beforeEach(() => {
		setConfig(getDefaultConfig());
	});

	it('converts a simple rule with supported property', () => {
		const parsed = css.parse('.test { color: red; }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.ok(result.includes('.test'));
		assert.ok(result.includes('color: red'));
	});

	it('discards empty rulesets', () => {
		const parsed = css.parse('.test { some-unsupported-prop: value; }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.strictEqual(result, '');
	});

	it('maps body selector to :root', () => {
		const parsed = css.parse('body { color: white; }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.ok(result.includes(':root'));
		assert.ok(!result.includes('body'));
	});

	it('maps tag selectors to UXML equivalents', () => {
		const parsed = css.parse('div { color: red; }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.ok(result.includes('VisualElement'));
		assert.ok(!result.includes('div'));
	});

	it('skips rules with only CSS variable declarations', () => {
		const parsed = css.parse(':root { --color: red; }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.strictEqual(result, '');
	});

	it('ignores rules with breaking selectors (:last-of-type)', () => {
		const parsed = css.parse('.test:last-of-type { color: red; }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.strictEqual(result, '');
	});

	it('maps background to background-color', () => {
		const parsed = css.parse('.test { background: #ff0000; }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.ok(result.includes('background-color'));
	});

	it('adds -unity-font-definition: none after -unity-font', () => {
		setConfig({ assets: { 'Arial': { path: 'Assets/Fonts/Arial.asset' } }, options: {} });
		const parsed = css.parse('.test { font-family: Arial; }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.ok(result.includes('-unity-font'));
		assert.ok(result.includes('-unity-font-definition: none'));
	});

	it('substitutes CSS variables when option enabled', () => {
		setConfig({ assets: {}, options: { substituteVariables: true } });
		const parsed = css.parse(':root { --main-color: red; } .test { color: var(--main-color); }');
		const result = css2uss(parsed.stylesheet.rules);
		assert.ok(result.includes('color: red'));
	});
});

// ── getAssetPath ──

describe('getAssetPath', () => {
	beforeEach(() => {
		setConfig({ assets: { 'Roboto': { path: 'Assets/Fonts/Roboto.asset' } }, options: {} });
	});

	it('returns url for mapped asset', () => {
		assert.strictEqual(getAssetPath('Roboto'), 'url("Assets/Fonts/Roboto.asset")');
	});

	it('returns undefined for unmapped asset', () => {
		assert.strictEqual(getAssetPath('UnknownFont'), undefined);
	});
});
