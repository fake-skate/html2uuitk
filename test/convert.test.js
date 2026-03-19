const { describe, it } = require('node:test');
const assert = require('node:assert');
const css = require('css');

const {
	escapeXml,
	formatXml,
	translateValue,
	transformProperty,
	expandBorderRadius,
	mapDisplayValue,
	mapOverflowValue,
	mapPositionValue,
	mapFontStyleValue,
	parseBackground,
	parseBorder,
	parseFont,
	parseBoxShadow,
	expandShorthand,
	mapPseudoClass,
	css2uss,
	tagMap,
	htmlOnlyElements,
	uxmlSkipTags,
	cssOnlyProperties,
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
	it('maps font-family to -unity-font', () => {
		assert.strictEqual(transformProperty('font-family'), '-unity-font');
	});

	it('maps text-align to -unity-text-align', () => {
		assert.strictEqual(transformProperty('text-align'), '-unity-text-align');
	});

	it('maps font-style to -unity-font-style', () => {
		assert.strictEqual(transformProperty('font-style'), '-unity-font-style');
	});

	it('maps font-weight to -unity-font-style', () => {
		assert.strictEqual(transformProperty('font-weight'), '-unity-font-style');
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
		assert.strictEqual(translateValue('0.1em', 'letter-spacing', defaultCtx), '3px');
	});

	it('converts rem in translateValue', () => {
		assert.strictEqual(translateValue('1rem', 'margin', defaultCtx), '16px');
	});

	it('converts modern rgb() in translateValue', () => {
		const result = translateValue('rgb(22 101 52 / 1)', 'color', defaultCtx);
		assert.strictEqual(result, 'rgba(22, 101, 52, 1)');
	});
});

// ── expandBorderRadius ──

describe('expandBorderRadius', () => {
	it('returns null for null input', () => {
		assert.strictEqual(expandBorderRadius(null, {}), null);
	});

	it('expands single value to all corners', () => {
		const result = expandBorderRadius('10px', {});
		assert.deepStrictEqual(result, { tl: '10px', tr: '10px', br: '10px', bl: '10px' });
	});

	it('expands two values', () => {
		const result = expandBorderRadius('10px 20px', {});
		assert.deepStrictEqual(result, { tl: '10px', tr: '20px', br: '10px', bl: '20px' });
	});

	it('expands three values', () => {
		const result = expandBorderRadius('10px 20px 30px', {});
		assert.deepStrictEqual(result, { tl: '10px', tr: '20px', br: '30px', bl: '20px' });
	});

	it('expands four values', () => {
		const result = expandBorderRadius('10px 20px 30px 40px', {});
		assert.deepStrictEqual(result, { tl: '10px', tr: '20px', br: '30px', bl: '40px' });
	});

	it('warns about elliptical radius', () => {
		const warnings = {};
		expandBorderRadius('10px / 20px', warnings);
		assert.strictEqual(warnings['elliptical-radius-ignored'], true);
	});
});

// ── mapDisplayValue ──

describe('mapDisplayValue', () => {
	it('returns null for null input', () => {
		assert.strictEqual(mapDisplayValue(null), null);
	});

	it('passes through flex unchanged', () => {
		const result = mapDisplayValue('flex');
		assert.strictEqual(result.value, 'flex');
		assert.strictEqual(result.mapped, false);
	});

	it('passes through none unchanged', () => {
		const result = mapDisplayValue('none');
		assert.strictEqual(result.value, 'none');
		assert.strictEqual(result.mapped, false);
	});

	it('maps block to flex', () => {
		const result = mapDisplayValue('block');
		assert.strictEqual(result.value, 'flex');
		assert.strictEqual(result.mapped, true);
	});

	it('maps grid to flex', () => {
		const result = mapDisplayValue('grid');
		assert.strictEqual(result.value, 'flex');
		assert.strictEqual(result.mapped, true);
	});

	it('returns null value for unsupported display', () => {
		const result = mapDisplayValue('table');
		assert.strictEqual(result.value, null);
	});
});

// ── mapOverflowValue ──

describe('mapOverflowValue', () => {
	it('returns null for null input', () => {
		assert.strictEqual(mapOverflowValue(null), null);
	});

	it('passes through visible unchanged', () => {
		const result = mapOverflowValue('visible');
		assert.strictEqual(result.value, 'visible');
		assert.strictEqual(result.mapped, false);
	});

	it('maps auto to hidden', () => {
		const result = mapOverflowValue('auto');
		assert.strictEqual(result.value, 'hidden');
		assert.strictEqual(result.mapped, true);
	});

	it('maps scroll to hidden', () => {
		const result = mapOverflowValue('scroll');
		assert.strictEqual(result.value, 'hidden');
		assert.strictEqual(result.mapped, true);
	});
});

// ── mapPositionValue ──

describe('mapPositionValue', () => {
	it('returns null for null input', () => {
		assert.strictEqual(mapPositionValue(null), null);
	});

	it('passes through relative unchanged', () => {
		const result = mapPositionValue('relative');
		assert.strictEqual(result.value, 'relative');
		assert.strictEqual(result.mapped, false);
	});

	it('maps fixed to absolute', () => {
		const result = mapPositionValue('fixed');
		assert.strictEqual(result.value, 'absolute');
		assert.strictEqual(result.mapped, true);
	});
});

// ── mapFontStyleValue ──

describe('mapFontStyleValue', () => {
	it('returns null for null input', () => {
		assert.strictEqual(mapFontStyleValue(null, 'font-style'), null);
	});

	it('maps font-style italic', () => {
		const r = mapFontStyleValue('italic', 'font-style');
		assert.strictEqual(r.value, 'italic');
	});

	it('maps font-style oblique to italic', () => {
		const r = mapFontStyleValue('oblique', 'font-style');
		assert.strictEqual(r.value, 'italic');
	});

	it('maps font-weight bold', () => {
		const r = mapFontStyleValue('bold', 'font-weight');
		assert.strictEqual(r.value, 'bold');
	});

	it('maps font-weight 700 to bold', () => {
		const r = mapFontStyleValue('700', 'font-weight');
		assert.strictEqual(r.value, 'bold');
	});

	it('maps font-weight 600 to bold (mapped)', () => {
		const r = mapFontStyleValue('600', 'font-weight');
		assert.strictEqual(r.value, 'bold');
		assert.strictEqual(r.mapped, true);
	});

	it('maps font-weight 300 to normal (mapped)', () => {
		const r = mapFontStyleValue('300', 'font-weight');
		assert.strictEqual(r.value, 'normal');
		assert.strictEqual(r.mapped, true);
	});
});

// ── parseFont ──

describe('parseFont', () => {
	it('returns null for null input', () => {
		assert.strictEqual(parseFont(null), null);
	});

	it('returns null for single token', () => {
		assert.strictEqual(parseFont('bold'), null);
	});

	it('parses size and family', () => {
		const r = parseFont('14px Arial');
		assert.strictEqual(r.fontSize, '14px');
		assert.strictEqual(r.fontFamily, 'Arial');
	});

	it('parses weight, size, and family', () => {
		const r = parseFont('bold 14px Arial');
		assert.strictEqual(r.fontWeight, 'bold');
		assert.strictEqual(r.fontSize, '14px');
		assert.strictEqual(r.fontFamily, 'Arial');
	});

	it('parses style, size, and family', () => {
		const r = parseFont('italic 16px Roboto');
		assert.strictEqual(r.fontStyle, 'italic');
		assert.strictEqual(r.fontSize, '16px');
		assert.strictEqual(r.fontFamily, 'Roboto');
	});

	it('handles size/line-height syntax', () => {
		const r = parseFont('16px/1.5 Arial');
		assert.strictEqual(r.fontSize, '16px');
		assert.strictEqual(r.fontFamily, 'Arial');
	});

	it('takes first family from comma-separated list', () => {
		const r = parseFont('14px Arial, Helvetica, sans-serif');
		assert.strictEqual(r.fontFamily, 'Arial');
	});
});

// ── parseBackground ──

describe('parseBackground', () => {
	it('returns null for null input', () => {
		assert.strictEqual(parseBackground(null), null);
	});

	it('parses color only', () => {
		const result = parseBackground('#ff0000');
		assert.strictEqual(result.color, '#ff0000');
		assert.strictEqual(result.image, null);
	});

	it('parses url only', () => {
		const result = parseBackground('url(image.png)');
		assert.strictEqual(result.image, 'url(image.png)');
		assert.strictEqual(result.color, null);
	});

	it('parses rgba color in background shorthand', () => {
		const result = parseBackground('rgba(255,0,0,0.5)');
		assert.strictEqual(result.color, 'rgba(255,0,0,0.5)');
	});

	it('parses transparent', () => {
		const result = parseBackground('transparent');
		assert.strictEqual(result.color, 'transparent');
	});

	it('returns null for unparseable value', () => {
		assert.strictEqual(parseBackground('some-unknown-value'), null);
	});
});

// ── parseBorder ──

describe('parseBorder', () => {
	it('returns null for null input', () => {
		assert.strictEqual(parseBorder(null), null);
	});

	it('parses width and color', () => {
		const result = parseBorder('1px solid #000');
		assert.strictEqual(result.width, '1px');
		assert.strictEqual(result.color, '#000');
	});

	it('parses width only', () => {
		const result = parseBorder('2px');
		assert.strictEqual(result.width, '2px');
		assert.strictEqual(result.color, null);
	});
});

// ── tagMap expanded ──

describe('tagMap expanded', () => {
	it('maps input[type="radio"] to ui:RadioButton', () => {
		assert.strictEqual(tagMap['input[type="radio"]'], 'ui:RadioButton');
	});

	it('maps input[type="range"] to ui:Slider', () => {
		assert.strictEqual(tagMap['input[type="range"]'], 'ui:Slider');
	});

	it('maps button to ui:Button', () => {
		assert.strictEqual(tagMap['button'], 'ui:Button');
	});

	it('maps select to ui:DropdownField', () => {
		assert.strictEqual(tagMap['select'], 'ui:DropdownField');
	});

	it('maps textarea to ui:TextField', () => {
		assert.strictEqual(tagMap['textarea'], 'ui:TextField');
	});

	it('maps img to ui:VisualElement', () => {
		assert.strictEqual(tagMap['img'], 'ui:VisualElement');
	});

	it('maps progress to ui:ProgressBar', () => {
		assert.strictEqual(tagMap['progress'], 'ui:ProgressBar');
	});

	it('maps semantic HTML5 elements to ui:VisualElement', () => {
		assert.strictEqual(tagMap['section'], 'ui:VisualElement');
		assert.strictEqual(tagMap['nav'], 'ui:VisualElement');
		assert.strictEqual(tagMap['header'], 'ui:VisualElement');
		assert.strictEqual(tagMap['footer'], 'ui:VisualElement');
		assert.strictEqual(tagMap['main'], 'ui:VisualElement');
	});

	it('maps a to ui:Label', () => {
		assert.strictEqual(tagMap['a'], 'ui:Label');
	});

	it('maps ul/ol/li to ui:VisualElement', () => {
		assert.strictEqual(tagMap['ul'], 'ui:VisualElement');
		assert.strictEqual(tagMap['ol'], 'ui:VisualElement');
		assert.strictEqual(tagMap['li'], 'ui:VisualElement');
	});
});

// ── htmlOnlyElements ──

describe('htmlOnlyElements', () => {
	it('contains common HTML-only tags', () => {
		assert.ok(htmlOnlyElements.has('table'));
		assert.ok(htmlOnlyElements.has('svg'));
		assert.ok(htmlOnlyElements.has('iframe'));
	});

	it('does not contain tags that have UXML equivalents', () => {
		assert.ok(!htmlOnlyElements.has('div'));
		assert.ok(!htmlOnlyElements.has('button'));
		assert.ok(!htmlOnlyElements.has('input'));
	});
});

// ── uxmlSkipTags ──

describe('uxmlSkipTags', () => {
	it('contains script and style', () => {
		assert.ok(uxmlSkipTags.has('script'));
		assert.ok(uxmlSkipTags.has('style'));
	});

	it('contains svg and form', () => {
		assert.ok(uxmlSkipTags.has('svg'));
		assert.ok(uxmlSkipTags.has('form'));
	});

	it('does not contain div or span', () => {
		assert.ok(!uxmlSkipTags.has('div'));
		assert.ok(!uxmlSkipTags.has('span'));
	});
});

// ── cssOnlyProperties ──

describe('cssOnlyProperties', () => {
	it('contains cursor', () => {
		assert.ok(cssOnlyProperties.has('cursor'));
	});

	it('does not contain color', () => {
		assert.ok(!cssOnlyProperties.has('color'));
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
	});

	it('maps tag selectors to UXML equivalents', () => {
		const parsed = css.parse('div { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('VisualElement'));
	});

	it('skips rules with only CSS variable declarations', () => {
		const parsed = css.parse(':root { --color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.strictEqual(result, '');
	});

	it('ignores rules with breaking selectors', () => {
		const parsed = css.parse('.test::before { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.strictEqual(result, '');
	});

	it('preserves :hover rules (USS supports pseudo-classes)', () => {
		const parsed = css.parse('.test:hover { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes(':hover'));
		assert.ok(result.includes('color: red'));
	});

	it('expands background shorthand', () => {
		const parsed = css.parse('.test { background: #ff0000; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('background-color: #ff0000'));
	});

	it('expands border-radius shorthand', () => {
		const parsed = css.parse('.box { border-radius: 5px; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('border-top-left-radius: 5px'));
		assert.ok(result.includes('border-bottom-right-radius: 5px'));
	});

	it('maps display:block to display:flex', () => {
		const parsed = css.parse('.box { display: block; color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('display: flex'));
	});

	it('converts font-style: italic to -unity-font-style', () => {
		const parsed = css.parse('.test { font-style: italic; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('-unity-font-style: italic'));
	});

	it('converts font-weight: bold to -unity-font-style', () => {
		const parsed = css.parse('.test { font-weight: bold; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('-unity-font-style: bold'));
	});

	it('strips inherit values', () => {
		const parsed = css.parse('.test { color: inherit; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.strictEqual(result, '');
	});

	it('strips cursor property', () => {
		const parsed = css.parse('.test { cursor: pointer; color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('color: red'));
		assert.ok(!result.includes('cursor'));
	});

	it('discards rules targeting HTML-only elements', () => {
		const parsed = css.parse('fieldset { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.strictEqual(result, '');
	});

	it('discards rules targeting table elements', () => {
		const parsed = css.parse('table { border-color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.strictEqual(result, '');
	});

	it('converts rem to px in declarations', () => {
		const parsed = css.parse('.test { margin-bottom: 0.5rem; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('margin-bottom: 8px'));
	});

	it('converts modern rgb() space-syntax in declarations', () => {
		const parsed = css.parse('.test { color: rgb(59 130 246 / 0.5); }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('rgba(59, 130, 246, 0.5)'));
	});

	it('passes through opacity (now native)', () => {
		const parsed = css.parse('.test { opacity: 0.5; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('opacity: 0.5'));
	});

	it('passes through rotate (now native)', () => {
		const parsed = css.parse('.test { rotate: 45deg; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('rotate: 45deg'));
	});

	it('passes through scale (now native)', () => {
		const parsed = css.parse('.test { scale: 1.5; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('scale: 1.5'));
	});

	it('substitutes CSS variables when option enabled', () => {
		const ctx = { config: { assets: {}, options: { substituteVariables: true } } };
		const parsed = css.parse(':root { --main-color: red; } .test { color: var(--main-color); }');
		const result = css2uss(parsed.stylesheet.rules, ctx);
		assert.ok(result.includes('color: red'));
	});

	it('deduplicates identical rule blocks', () => {
		const parsed = css.parse('.test { color: red; } .test { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		const matches = result.match(/\.test/g);
		assert.strictEqual(matches.length, 1);
	});

	it('deduplicates redundant mapped selectors (h1,h2,h3 → Label)', () => {
		const parsed = css.parse('h1, h2, h3 { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		const labelMatches = result.match(/Label/g);
		assert.strictEqual(labelMatches.length, 1);
	});

	it('keeps non-duplicate rules', () => {
		const parsed = css.parse('.a { color: red; } .b { color: blue; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('.a'));
		assert.ok(result.includes('.b'));
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
});

// ── isLengthToken / isColorToken ──

describe('isLengthToken', () => {
	it('recognizes 0', () => assert.strictEqual(isLengthToken('0'), true));
	it('recognizes px values', () => assert.strictEqual(isLengthToken('10px'), true));
	it('recognizes keyword lengths', () => assert.strictEqual(isLengthToken('thin'), true));
	it('rejects non-length tokens', () => assert.strictEqual(isLengthToken('solid'), false));
});

describe('isColorToken', () => {
	it('recognizes hex colors', () => assert.strictEqual(isColorToken('#fff'), true));
	it('recognizes rgba', () => assert.strictEqual(isColorToken('rgba(0,0,0,1)'), true));
	it('recognizes transparent', () => assert.strictEqual(isColorToken('transparent'), true));
	it('rejects non-color tokens', () => assert.strictEqual(isColorToken('solid'), false));
});

// ── expandShorthand ──

describe('expandShorthand', () => {
	it('returns null for single value', () => {
		assert.strictEqual(expandShorthand('margin', '10px'), null);
	});

	it('expands two values', () => {
		const result = expandShorthand('margin', '10px 20px');
		assert.deepStrictEqual(result, {
			'margin-top': '10px',
			'margin-right': '20px',
			'margin-bottom': '10px',
			'margin-left': '20px'
		});
	});

	it('expands three values', () => {
		const result = expandShorthand('padding', '10px 20px 30px');
		assert.deepStrictEqual(result, {
			'padding-top': '10px',
			'padding-right': '20px',
			'padding-bottom': '30px',
			'padding-left': '20px'
		});
	});

	it('expands four values', () => {
		const result = expandShorthand('margin', '1px 2px 3px 4px');
		assert.deepStrictEqual(result, {
			'margin-top': '1px',
			'margin-right': '2px',
			'margin-bottom': '3px',
			'margin-left': '4px'
		});
	});
});

// ── parseBoxShadow ──

describe('parseBoxShadow', () => {
	it('returns null for null input', () => {
		assert.strictEqual(parseBoxShadow(null), null);
	});

	it('parses offset-x, offset-y, blur, color', () => {
		const result = parseBoxShadow('2px 4px 6px rgba(0,0,0,0.5)');
		assert.strictEqual(result.offsetX, '2px');
		assert.strictEqual(result.offsetY, '4px');
		assert.strictEqual(result.blurRadius, '6px');
		assert.strictEqual(result.color, 'rgba(0,0,0,0.5)');
	});

	it('parses offset-x and offset-y only', () => {
		const result = parseBoxShadow('2px 4px');
		assert.strictEqual(result.offsetX, '2px');
		assert.strictEqual(result.offsetY, '4px');
		assert.strictEqual(result.blurRadius, '0');
	});

	it('returns null for single value', () => {
		assert.strictEqual(parseBoxShadow('2px'), null);
	});
});

// ── mapPseudoClass ──

describe('mapPseudoClass', () => {
	it('maps :hover to USS :hover', () => {
		const result = mapPseudoClass('.btn:hover');
		assert.strictEqual(result, '.btn:hover');
	});

	it('maps :active to USS :active', () => {
		const result = mapPseudoClass('.btn:active');
		assert.strictEqual(result, '.btn:active');
	});

	it('maps :focus to USS :focus', () => {
		const result = mapPseudoClass('.input:focus');
		assert.strictEqual(result, '.input:focus');
	});

	it('returns null for unsupported pseudo-class', () => {
		const result = mapPseudoClass('.test:nth-child(2)');
		assert.strictEqual(result, null);
	});
});

// ── css2uss advanced features ──

describe('css2uss advanced features', () => {
	it('expands margin shorthand into individual properties', () => {
		const parsed = css.parse('.test { margin: 10px 20px; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('margin-top: 10px'));
		assert.ok(result.includes('margin-right: 20px'));
		assert.ok(result.includes('margin-bottom: 10px'));
		assert.ok(result.includes('margin-left: 20px'));
	});

	it('expands padding shorthand into individual properties', () => {
		const parsed = css.parse('.test { padding: 5px 10px 15px 20px; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('padding-top: 5px'));
		assert.ok(result.includes('padding-right: 10px'));
		assert.ok(result.includes('padding-bottom: 15px'));
		assert.ok(result.includes('padding-left: 20px'));
	});

	it('passes through single-value margin without expansion', () => {
		const parsed = css.parse('.test { margin: 10px; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('margin: 10px'));
	});

	it('converts box-shadow to USS shadow properties', () => {
		const parsed = css.parse('.test { box-shadow: 2px 4px 6px rgba(0,0,0,0.5); }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes('--unity-shadow-offset-x: 2px'));
		assert.ok(result.includes('--unity-shadow-offset-y: 4px'));
		assert.ok(result.includes('--unity-shadow-blur-radius: 6px'));
		assert.ok(result.includes('--unity-shadow-color: rgba(0,0,0,0.5)'));
	});

	it('preserves :hover rules (USS pseudo-class support)', () => {
		const parsed = css.parse('.btn:hover { color: red; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes(':hover'));
		assert.ok(result.includes('color: red'));
	});

	it('preserves :active rules (USS pseudo-class support)', () => {
		const parsed = css.parse('.btn:active { color: blue; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes(':active'));
		assert.ok(result.includes('color: blue'));
	});

	it('preserves :focus rules (USS pseudo-class support)', () => {
		const parsed = css.parse('.input:focus { border-color: blue; }');
		const result = css2uss(parsed.stylesheet.rules, defaultCtx);
		assert.ok(result.includes(':focus'));
		assert.ok(result.includes('border-color: blue'));
	});

	it('resolves var() with fallback value', () => {
		const ctx = { config: { assets: {}, options: { substituteVariables: true } } };
		const parsed = css.parse('.test { color: var(--undefined-color, red); }');
		const result = css2uss(parsed.stylesheet.rules, ctx);
		assert.ok(result.includes('color: red'));
	});

	it('resolves var() with defined variable (ignores fallback)', () => {
		const ctx = { config: { assets: {}, options: { substituteVariables: true } } };
		const parsed = css.parse(':root { --my-color: blue; } .test { color: var(--my-color, red); }');
		const result = css2uss(parsed.stylesheet.rules, ctx);
		assert.ok(result.includes('color: blue'));
	});
});

// ── resolveValueWithVariables fallback ──

describe('resolveValueWithVariables fallback', () => {
	it('uses fallback when variable is undefined', () => {
		const vars = new Map();
		assert.strictEqual(resolveValueWithVariables('var(--missing, red)', vars), 'red');
	});

	it('uses variable value when defined (ignores fallback)', () => {
		const vars = new Map([['--color', 'blue']]);
		assert.strictEqual(resolveValueWithVariables('var(--color, red)', vars), 'blue');
	});

	it('returns null when no fallback and variable undefined', () => {
		const vars = new Map();
		assert.strictEqual(resolveValueWithVariables('var(--missing)', vars), null);
	});
});
