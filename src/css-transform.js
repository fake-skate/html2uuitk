const { convertRelativeUnits, convertModernColorSyntax, splitCssTokens, isLengthToken, isColorToken } = require('./css-value-utils');

function transformProperty(property) {
	property = property == 'font-family' ? '-unity-font' : property;

	if (property == 'text-align') {
		return '-unity-text-align';
	}

	if (property == 'font-style' || property == 'font-weight') {
		return '-unity-font-style';
	}

	return property
}

function translateValue(value, property, ctx) {
	value = value.replace(/(^|\s)\.(\d)/g, '$10.$2');
	value = value.split('vw').join('%');
	value = value.split('vh').join('%');
	value = convertRelativeUnits(value);
	value = convertModernColorSyntax(value);
	value = property == "-unity-font" ? getAssetPath(value, ctx) : value;

	if (property === 'letter-spacing') {
		const pxMatch = value.match(/^(-?\d+(?:\.\d+)?)px$/);
		if (pxMatch) {
			value = (parseFloat(pxMatch[1]) * 2).toFixed(0) + 'px';
		} else {
			console.warn(`- letter-spacing: non-px unit "${value}" passed through as-is`);
		}
	}

	if (property == "-unity-text-align") {
		switch(value) {
			case "left": return "middle-left";
			case "center": return "middle-center";
			case "right": return "middle-right";
			case "justify": return "middle-center";
			default: return value;
		}
	}

	return value;
}

function expandBorderRadius(value, warnings) {
	if (!value) return null;
	if (value.includes('/')) {
		warnings['elliptical-radius-ignored'] = true;
	}
	let clean = value.split('/')[0].trim();
	if (clean.length == 0) return null;

	let parts = clean.split(/\s+/).filter(p => p.length > 0);
	if (parts.length == 0) return null;

	let tl, tr, br, bl;
	if (parts.length == 1) {
		tl = tr = br = bl = parts[0];
	} else if (parts.length == 2) {
		tl = br = parts[0];
		tr = bl = parts[1];
	} else if (parts.length == 3) {
		tl = parts[0];
		tr = bl = parts[1];
		br = parts[2];
	} else {
		tl = parts[0];
		tr = parts[1];
		br = parts[2];
		bl = parts[3];
	}

	return { tl, tr, br, bl };
}

function mapDisplayValue(value) {
	if (!value) return null;
	let v = value.trim().toLowerCase();
	if (v == 'none') return { value: 'none', mapped: false };
	if (v == 'flex') return { value: 'flex', mapped: false };
	if (v == 'block' || v == 'inline' || v == 'inline-block' || v == 'inline-flex' || v == 'grid' || v == 'inline-grid') {
		return { value: 'flex', mapped: true };
	}
	return { value: null, mapped: false };
}

function mapOverflowValue(value) {
	if (!value) return null;
	let v = value.trim().toLowerCase();
	if (v == 'visible' || v == 'hidden') return { value: v, mapped: false };
	if (v == 'auto' || v == 'scroll') return { value: 'hidden', mapped: true };
	return { value: null, mapped: false };
}

function mapFontStyleValue(value, originalProperty) {
	if (!value) return null;
	let v = value.trim().toLowerCase();

	if (originalProperty == 'font-style') {
		if (v == 'normal') return { value: 'normal', mapped: false };
		if (v == 'italic' || v == 'oblique') return { value: 'italic', mapped: false };
		return { value: null, mapped: false };
	}

	if (originalProperty == 'font-weight') {
		if (v == 'normal' || v == '400') return { value: 'normal', mapped: false };
		if (v == 'bold' || v == '700') return { value: 'bold', mapped: false };
		if (parseInt(v) >= 600) return { value: 'bold', mapped: true };
		if (parseInt(v) < 600 && parseInt(v) > 0) return { value: 'normal', mapped: true };
		return { value: null, mapped: false };
	}

	return { value: null, mapped: false };
}

function parseFont(value) {
	if (!value) return null;
	let result = {};
	let tokens = splitCssTokens(value);
	if (tokens.length < 2) return null;

	let i = 0;

	// Optional font-style
	if (tokens[i] == 'italic' || tokens[i] == 'oblique') {
		result.fontStyle = tokens[i];
		i++;
	} else if (tokens[i] == 'normal' && i + 1 < tokens.length) {
		i++;
	}

	// Optional font-weight
	if (i < tokens.length && (tokens[i] == 'bold' || tokens[i] == 'lighter' || tokens[i] == 'bolder' || /^\d{3}$/.test(tokens[i]))) {
		result.fontWeight = tokens[i];
		i++;
	}

	// font-size (required) — may include /line-height
	if (i < tokens.length) {
		let sizeToken = tokens[i];
		if (sizeToken.includes('/')) {
			let parts = sizeToken.split('/');
			result.fontSize = parts[0];
		} else {
			result.fontSize = sizeToken;
		}
		i++;
	} else {
		return null;
	}

	// font-family (rest of tokens)
	if (i < tokens.length) {
		result.fontFamily = tokens.slice(i).join(' ').replace(/['"]/g, '').split(',')[0].trim();
	}

	return result;
}

function mapPositionValue(value) {
	if (!value) return null;
	let v = value.trim().toLowerCase();
	if (v == 'relative' || v == 'absolute') return { value: v, mapped: false };
	if (v == 'fixed') return { value: 'absolute', mapped: true };
	return { value: null, mapped: false };
}

function parseBackground(value) {
	if (!value) return null;
	let tokens = splitCssTokens(value);
	let imageMatch = value.match(/url\([^)]+\)/i);
	let repeatMatch = value.match(/\b(no-repeat|repeat|repeat-x|repeat-y)\b/i);
	let colorMatch = value.match(/(#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]+\)|hsla?\([^)]+\)|transparent\b)/i);
	let warnings = [];

	if (!imageMatch && !repeatMatch && !colorMatch) return null;

	if (tokens.length > 0 && (imageMatch || repeatMatch || colorMatch)) {
		let leftovers = tokens.filter(t => {
			let lower = t.toLowerCase();
			if (imageMatch && t.includes(imageMatch[0])) return false;
			if (repeatMatch && lower == repeatMatch[0].toLowerCase()) return false;
			if (colorMatch && t.includes(colorMatch[0])) return false;
			return true;
		});
		if (leftovers.length > 0) warnings.push('unparsed-tokens:' + leftovers.join(' '));
	}

	return {
		image: imageMatch ? imageMatch[0] : null,
		repeat: repeatMatch ? repeatMatch[0] : null,
		color: colorMatch ? colorMatch[0] : null,
		warnings
	};
}

function parseBorder(value) {
	if (!value) return null;
	let tokens = splitCssTokens(value);
	if (tokens.length == 0) return null;

	let width = null;
	let color = null;
	let warnings = [];

	for (let t of tokens) {
		let lower = t.toLowerCase();
		if (!width && isLengthToken(lower)) {
			width = t;
			continue;
		}
		if (!color && isColorToken(t)) {
			color = t;
			continue;
		}
	}

	if (!width && !color) return null;

	let leftover = tokens.filter(t => t != width && t != color);
	if (leftover.length > 0) warnings.push('unparsed-tokens:' + leftover.join(' '));

	return { width, color, warnings };
}

function getAssetPath(value, ctx) {
	if (ctx.config.assets && ctx.config.assets[value]) {
		return `url("${ctx.config.assets[value].path}")`;
	}
	console.warn(`- Asset not mapped: ${value}`);
	return value;
}

function expandShorthand(property, value) {
	if (!value) return null;
	let parts = value.trim().split(/\s+/).filter(p => p.length > 0);
	if (parts.length <= 1) return null;

	let top, right, bottom, left;
	if (parts.length == 2) {
		top = bottom = parts[0];
		right = left = parts[1];
	} else if (parts.length == 3) {
		top = parts[0];
		right = left = parts[1];
		bottom = parts[2];
	} else {
		top = parts[0];
		right = parts[1];
		bottom = parts[2];
		left = parts[3];
	}

	return {
		[`${property}-top`]: top,
		[`${property}-right`]: right,
		[`${property}-bottom`]: bottom,
		[`${property}-left`]: left
	};
}

function parseBoxShadow(value) {
	if (!value) return null;
	let tokens = splitCssTokens(value);
	if (tokens.length < 2) return null;

	let lengths = [];
	let color = null;

	for (let t of tokens) {
		if (isColorToken(t)) {
			color = t;
		} else if (isLengthToken(t.toLowerCase())) {
			lengths.push(t);
		}
	}

	if (lengths.length < 2) return null;

	return {
		offsetX: lengths[0],
		offsetY: lengths[1],
		blurRadius: lengths[2] || '0',
		color: color || 'rgba(0,0,0,0.5)'
	};
}

function mapPseudoClass(selectorPart) {
	const pseudoMap = {
		':hover': ':hover',
		':active': ':active',
		':focus': ':focus'
	};

	for (let [cssPseudo, ussPseudo] of Object.entries(pseudoMap)) {
		if (selectorPart.includes(cssPseudo)) {
			return selectorPart.replace(cssPseudo, ussPseudo);
		}
	}
	return null;
}

function getExtras(property, value) {
	let extras = '';
	extras += property == '-unity-font' ? '	-unity-font-definition: none;\n' : '';
	return extras;
}

module.exports = {
	transformProperty,
	translateValue,
	expandBorderRadius,
	expandShorthand,
	mapDisplayValue,
	mapOverflowValue,
	mapPositionValue,
	mapFontStyleValue,
	parseBackground,
	parseBorder,
	parseFont,
	parseBoxShadow,
	mapPseudoClass,
	getAssetPath,
	getExtras
};
