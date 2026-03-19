function convertRelativeUnits(value) {
	return value.replace(/(-?\d+(?:\.\d+)?)(r?em)\b/g, (match, num, unit) => {
		const px = parseFloat(num) * 16;
		return px + 'px';
	});
}

function convertModernColorSyntax(value) {
	value = value.replace(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*\/\s*([^)]+)\)/g,
		(_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${a.trim()})`);
	value = value.replace(/hsl\(\s*(\d+)\s+(\d+%?)\s+(\d+%?)\s*\/\s*([^)]+)\)/g,
		(_, h, s, l, a) => `hsla(${h}, ${s}, ${l}, ${a.trim()})`);
	return value;
}

function splitCssTokens(value) {
	let tokens = [];
	let current = '';
	let depth = 0;
	for (let i = 0; i < value.length; i++) {
		let ch = value[i];
		if (ch == '(') depth++;
		if (ch == ')') depth = Math.max(0, depth - 1);
		if (/\s/.test(ch) && depth == 0) {
			if (current.length > 0) {
				tokens.push(current);
				current = '';
			}
		} else {
			current += ch;
		}
	}
	if (current.length > 0) tokens.push(current);
	return tokens;
}

function isLengthToken(token) {
	if (token == '0') return true;
	if (token == 'thin' || token == 'medium' || token == 'thick') return true;
	return /^-?\d+(\.\d+)?(px|em|rem|%|vh|vw)?$/i.test(token);
}

function isColorToken(token) {
	let lower = token.toLowerCase();
	if (lower == 'transparent') return true;
	if (/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(token)) return true;
	if (/^rgba?\([^)]+\)$/i.test(token)) return true;
	if (/^hsla?\([^)]+\)$/i.test(token)) return true;
	return false;
}

module.exports = {
	convertRelativeUnits,
	convertModernColorSyntax,
	splitCssTokens,
	isLengthToken,
	isColorToken
};
