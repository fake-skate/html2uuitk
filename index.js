const fs = require('fs');
const nodePath = require('path');

const { tagMap } = require('./src/constants');
const { convertRelativeUnits, convertModernColorSyntax, splitCssTokens, isLengthToken, isColorToken } = require('./src/css-value-utils');
const { extractCssVariables, resolveVariable, resolveValueWithVariables } = require('./src/css-variables');
const { transformProperty, translateValue, getAssetPath, getExtras } = require('./src/css-transform');
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

async function convert(argv) {
	let config;
	if (argv.config) {
		try {
			let configPath = nodePath.resolve(__dirname, argv.config);
			config = require(configPath);
		} catch (error) {
			console.warn(`Config file not found: ${argv.config}. Using defaults.`);
			config = getDefaultConfig();
		}
	} else {
		config = getDefaultConfig();
	}

	const ctx = {
		config: config,
		outputFolder: argv.output
	};

	const htmlFiles = [];
	for (let i = 0; i < argv.input.length; i++) {
		let filePath = argv.input[i];
		htmlFiles.push({
			name: nodePath.basename(filePath, nodePath.extname(filePath)),
			data: fs.readFileSync(filePath, 'utf8')
		});
	}

	const cssFiles = [];

	const resetIsSet = process.argv.includes('--reset');
	if (resetIsSet) argv.css = argv.css.concat(argv.reset);

	for (let i = 0; i < argv.css.length; i++) {
		let filePath = argv.css[i];
		cssFiles.push({
			name: nodePath.basename(filePath, nodePath.extname(filePath)),
			originalPath: filePath,
			data: fs.readFileSync(filePath, 'utf8')
		});
	}

	const writes = [];
	for (let i = 0; i < htmlFiles.length; i++) {
		writes.push(html2uxml(htmlFiles[i].name, htmlFiles[i].data, ctx));
	}

	for (let i = 0; i < cssFiles.length; i++) {
		writes.push(convertCss(cssFiles[i].name, cssFiles[i].data, ctx));
	}

	await Promise.all(writes);
}

module.exports = convert;

// Export internal functions for testing
module.exports._internal = {
	escapeXml,
	formatXml,
	translateValue,
	transformProperty,
	css2uss,
	tagMap,
	getAssetPath,
	getExtras,
	extractCssVariables,
	resolveVariable,
	resolveValueWithVariables,
	getDefaultConfig,
	convertRelativeUnits,
	convertModernColorSyntax,
	splitCssTokens,
	isLengthToken,
	isColorToken
};
