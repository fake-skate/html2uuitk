const { tagMap, htmlOnlyElements, uxmlSkipTags, cssOnlyProperties } = require('./src/constants');
const { convertRelativeUnits, convertModernColorSyntax } = require('./src/css-value-utils');
const { extractCssVariables, resolveVariable, resolveValueWithVariables } = require('./src/css-variables');
const { transformProperty, translateValue, expandBorderRadius, expandShorthand, mapDisplayValue, mapOverflowValue, mapPositionValue, mapFontStyleValue, parseBackground, parseBorder, parseFont, parseBoxShadow, mapPseudoClass, getAssetPath, getExtras } = require('./src/css-transform');
const { css2uss, convertCss } = require('./src/css2uss');
const { html2uxml, formatXml, escapeXml } = require('./src/html2uxml');

function getDefaultConfig() {
	return {
		assets: {},
		options: {
			uppercase: false,
			substituteVariables: false
		}
	};
}

function convert(html, css, config) {
	config = config || getDefaultConfig();
	const ctx = { config };
	const warnings = [];

	const origWarn = console.warn;
	const origLog = console.log;
	console.warn = function () {
		const msg = Array.prototype.slice.call(arguments).join(' ');
		warnings.push(msg);
	};
	console.log = function () {
		const msg = Array.prototype.slice.call(arguments).join(' ');
		if (msg.includes('discarded')) warnings.push(msg);
	};

	let uxml = '';
	let uss = '';

	try {
		if (html && html.trim()) {
			uxml = html2uxml('output', html, ctx);
		}
		if (css && css.trim()) {
			uss = convertCss('output', css, ctx);
		}
	} finally {
		console.warn = origWarn;
		console.log = origLog;
	}

	return { uxml, uss, warnings };
}

module.exports = { convert, getDefaultConfig };
