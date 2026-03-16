const { convertRelativeUnits, convertModernColorSyntax } = require('./css-value-utils');

function transformProperty(property) {
	property = property == 'background' ? 'background-color' : property;
	property = property == 'font-family' ? '-unity-font' : property;

	if (property == 'text-align') {
		return '-unity-text-align';
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

function getAssetPath(value, ctx) {
	if (ctx.config.assets && ctx.config.assets[value]) {
		return `url("${ctx.config.assets[value].path}")`;
	}
	console.warn(`- Asset not mapped: ${value}`);
	return value;
}

function getExtras(property, value) {
	let extras = '';
	extras += property == '-unity-font' ? '	-unity-font-definition: none;\n' : '';
	return extras;
}

module.exports = {
	transformProperty,
	translateValue,
	getAssetPath,
	getExtras
};
