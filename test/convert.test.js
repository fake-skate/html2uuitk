const { describe, it } = require('node:test');
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
	convertRelativeUnits,
	convertModernColorSyntax,
	splitCssTokens,
	isLengthToken,
	isColorToken
} = require('../index.js')._internal;

const defaultCtx = { config: { assets: {}, options: {} } };

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
		assert.strictEqual(translateValue('50vw', 'width', defaultCtx), '50%');
	});

	it('converts vh to %', () => {
		assert.strictEqual(translateValue('100vh', 'height', defaultCtx), '100%');
	});

	it('fixes leading dot in numbers', () => {
		assert.strictEqual(translateValue('.5px', 'margin', defaultCtx), '0.5px');
	});

	it('maps text-align left to middle-left', () => {
		assert.strictEqual(translateValue('left', '-unity-text-align', defaultCtx), 'middle-left');
	});

	it('maps text-align center to middle-center', () => {
		assert.strictEqual(translateValue('center', '-unity-text-align', defaultCtx), 'middle-center');
	});

	it('maps text-align right to middle-right', () => {
		assert.strictEqual(translateValue('right', '-unity-text-align', defaultCtx), 'middle-right');
	});

	it('maps text-align justify to middle-center', () => {
		assert.strictEqual(translateValue('justify', '-unity-text-align', defaultCtx), 'middle-center');
	});

	it('doubles letter-spacing px value', () => {
		assert.strictEqual(translateValue('2px', 'letter-spacing', defaultCtx), '4px');
	});

	it('handles negative letter-spacing', () => {
		assert.strictEqual(translateValue('-1px', 'letter-spacing', defaultCtx), '-2px');
	});

	it('converts em letter-spacing to px then doubles', () => {
		// 0.1em → 1.6px (rem/em conversion), then doubled → 3px
		assert.strictEqual(translateValue('0.1em', 'letter-spacing', defaultCtx), '3px');
	});

	it('converts rem in translateValue', () => {
		assert.strictEqual(translateValue('1rem', 'margin', defaultCtx), '16px');
	});

	it('converts em in translateValue', () => {
		assert.strictEqual(translateValue('1em', 'font-size', defaultCtx), '16px');
	});

	it('converts modern rgb() in translateValue', () => {
		const result = translateValue('rgb(22 101 52 / 1)', 'color', defaultCtx);
		assert.strictEqual(result, 'rgba(22, 101, 52, 1)');
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
	it('extractCssVariables extracts --vars from rules', () => {
		const rules = [{
			declarations: [
				{ property: '--color-primary', value: '#ff0000' },
				{ property: '--size', value: '16px' },
				{ property: 'color', value: 'red' }
			]
		}];
		const vars = extractCssVariables(rules);
		assert.strictEqual(vars.get('--color-primary'), '#ff0000');
		assert.strictEqual(vars.get('--size'), '16px');
		assert.strictEqual(vars.has('color'), false);
	});

	it('resolveVariable returns undefined for missing variables', () => {
		const vars = new Map();
		assert.strictEqual(resolveVariable('--missing', vars), undefined);
	});

	it('resolveVariable resolves chained variables', () => {
		const vars = new Map([
			['--a', 'var(--b)'],
			['--b', 'blue']
		]);
		assert.strictEqual(resolveVariable('--a', vars), 'blue');
	});

	it('resolveVariable detects circular references', () => {
		const vars = new Map([
			['--a', 'var(--b)'],
			['--b', 'var(--a)']
		]);
		assert.strictEqual(resolveVariable('--a', vars), undefined);
	});

	it('resolveValueWithVariables substitutes variables', () => {
		const vars = new Map([['--gap', '10px']]);
		assert.strictEqual(resolveValueWithVariables('var(--gap)', vars), '10px');
	});

	it('resolveValueWithVariables returns null for undefined vars', () => {
		const vars = new Map();
		assert.strictEqual(resolveValueWithVariables('var(--missing)', vars), null);
	});
});

// ── css2uss integration ──

describe('css2uss', () => {
	it('converts a simple rule with supported property', () => {
		const parsed = css.parse('.test { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('.test'));
		assert.ok(result.includes('color: red'));
	});

	it('discards empty rulesets', () => {
		const parsed = css.parse('.test { some-unsupported-prop: value; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.strictEqual(result, '');
	});

	it('maps body selector to :root', () => {
		const parsed = css.parse('body { color: white; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes(':root'));
		assert.ok(!result.includes('body'));
	});

	it('maps tag selectors to UXML equivalents', () => {
		const parsed = css.parse('div { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('VisualElement'));
		assert.ok(!result.includes('div'));
	});

	it('skips rules with only CSS variable declarations', () => {
		const parsed = css.parse(':root { --color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.strictEqual(result, '');
	});

	it('ignores rules with breaking selectors (:last-of-type)', () => {
		const parsed = css.parse('.test:last-of-type { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.strictEqual(result, '');
	});

	it('maps background to background-color', () => {
		const parsed = css.parse('.test { background: #ff0000; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('background-color'));
	});

	it('adds -unity-font-definition: none after -unity-font', () => {
		const ctx = { config: { assets: { 'Arial': { path: 'Assets/Fonts/Arial.asset' } }, options: {} } };
		const parsed = css.parse('.test { font-family: Arial; }');
		const result = css2uss(parsed.stylesheet.rules, ctx);
		assert.ok(result.includes('-unity-font'));
		assert.ok(result.includes('-unity-font-definition: none'));
	});

	it('substitutes CSS variables when option enabled', () => {
		const ctx = { config: { assets: {}, options: { substituteVariables: true } } };
		const parsed = css.parse(':root { --main-color: red; } .test { color: var(--main-color); }');
		const result = css2uss(parsed.stylesheet.rules, ctx);
		assert.ok(result.includes('color: red'));
	});

	it('converts rem to px in declarations', () => {
		const parsed = css.parse('.test { margin-bottom: 0.5rem; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('margin-bottom: 8px'));
	});

	it('converts em to px in declarations', () => {
		const parsed = css.parse('.test { font-size: 1.5em; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('font-size: 24px'));
	});

	it('converts modern rgb() space-syntax in declarations', () => {
		const parsed = css.parse('.test { color: rgb(59 130 246 / 0.5); }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('rgba(59, 130, 246, 0.5)'));
	});
});

// ── getAssetPath ──

describe('getAssetPath', () => {
	it('returns url for mapped asset', () => {
		const ctx = { config: { assets: { 'Roboto': { path: 'Assets/Fonts/Roboto.asset' } } } };
		assert.strictEqual(getAssetPath('Roboto', ctx), 'url("Assets/Fonts/Roboto.asset")');
	});

	it('returns original value for unmapped asset', () => {
		const ctx = { config: { assets: {} } };
		assert.strictEqual(getAssetPath('UnknownFont', ctx), 'UnknownFont');
	});
});

// ── convertRelativeUnits ──

describe('convertRelativeUnits', () => {
	it('converts rem to px (1rem = 16px)', () => {
		assert.strictEqual(convertRelativeUnits('1rem'), '16px');
	});

	it('converts em to px (1em = 16px)', () => {
		assert.strictEqual(convertRelativeUnits('1em'), '16px');
	});

	it('converts fractional rem', () => {
		assert.strictEqual(convertRelativeUnits('0.5rem'), '8px');
	});

	it('converts multiple values in one string', () => {
		assert.strictEqual(convertRelativeUnits('1rem 2rem'), '16px 32px');
	});

	it('leaves px values unchanged', () => {
		assert.strictEqual(convertRelativeUnits('16px'), '16px');
	});

	it('handles negative values', () => {
		assert.strictEqual(convertRelativeUnits('-0.25em'), '-4px');
	});
});

// ── convertModernColorSyntax ──

describe('convertModernColorSyntax', () => {
	it('converts rgb() space-syntax with / alpha to rgba()', () => {
		assert.strictEqual(
			convertModernColorSyntax('rgb(59 130 246 / 0.5)'),
			'rgba(59, 130, 246, 0.5)'
		);
	});

	it('converts hsl() space-syntax with / alpha to hsla()', () => {
		assert.strictEqual(
			convertModernColorSyntax('hsl(220 90% 56% / 0.5)'),
			'hsla(220, 90%, 56%, 0.5)'
		);
	});

	it('leaves traditional rgba() unchanged', () => {
		assert.strictEqual(
			convertModernColorSyntax('rgba(255, 0, 0, 0.5)'),
			'rgba(255, 0, 0, 0.5)'
		);
	});

	it('leaves hex colors unchanged', () => {
		assert.strictEqual(convertModernColorSyntax('#ff0000'), '#ff0000');
	});
});

// ── splitCssTokens ──

describe('splitCssTokens', () => {
	it('splits simple space-separated tokens', () => {
		assert.deepStrictEqual(splitCssTokens('a b c'), ['a', 'b', 'c']);
	});

	it('keeps parenthesized groups together', () => {
		assert.deepStrictEqual(splitCssTokens('rgba(1, 2, 3) solid'), ['rgba(1, 2, 3)', 'solid']);
	});

	it('handles empty string', () => {
		assert.deepStrictEqual(splitCssTokens(''), []);
	});

	it('handles single token', () => {
		assert.deepStrictEqual(splitCssTokens('10px'), ['10px']);
	});
});

// ── isLengthToken ──

describe('isLengthToken', () => {
	it('recognizes 0', () => {
		assert.strictEqual(isLengthToken('0'), true);
	});

	it('recognizes px values', () => {
		assert.strictEqual(isLengthToken('10px'), true);
	});

	it('recognizes keyword lengths', () => {
		assert.strictEqual(isLengthToken('thin'), true);
		assert.strictEqual(isLengthToken('medium'), true);
		assert.strictEqual(isLengthToken('thick'), true);
	});

	it('recognizes percentage', () => {
		assert.strictEqual(isLengthToken('50%'), true);
	});

	it('rejects non-length tokens', () => {
		assert.strictEqual(isLengthToken('solid'), false);
		assert.strictEqual(isLengthToken('#fff'), false);
	});
});

// ── isColorToken ──

describe('isColorToken', () => {
	it('recognizes hex colors', () => {
		assert.strictEqual(isColorToken('#fff'), true);
		assert.strictEqual(isColorToken('#ff0000'), true);
		assert.strictEqual(isColorToken('#ff000080'), true);
	});

	it('recognizes rgba', () => {
		assert.strictEqual(isColorToken('rgba(0,0,0,1)'), true);
	});

	it('recognizes transparent', () => {
		assert.strictEqual(isColorToken('transparent'), true);
	});

	it('rejects non-color tokens', () => {
		assert.strictEqual(isColorToken('10px'), false);
		assert.strictEqual(isColorToken('solid'), false);
	});
});
