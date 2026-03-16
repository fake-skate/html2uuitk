const nodePath = require('path');
const fsp = require('fs').promises;
const uss_properties = require('../uss_properties.json');
const breaking_selectors = require('../breaking_selectors.json');
const { tagMap } = require('./constants');
const { extractCssVariables, resolveValueWithVariables } = require('./css-variables');
const { transformProperty, translateValue, getExtras } = require('./css-transform');

async function convertCss(name, data, ctx) {
	let parsedCSS = require('css').parse(data);
	const ussContent = css2uss(parsedCSS.stylesheet.rules, ctx);
	const outputPath = nodePath.join(ctx.outputFolder, name + '.uss');
	await fsp.writeFile(outputPath, ussContent, 'utf-8');
	console.log(name + ' USS written.');
}

function css2uss(rules, ctx) {
	let result = '';
	let not_implemented = {};
	let unity_support = {};
	let removed_properties = {};

	let cssVariables = null;
	if (ctx.config.options && ctx.config.options.substituteVariables) {
		cssVariables = extractCssVariables(rules);
	}

	for(let i = 0; i < rules.length; i++) {
		let rule = rules[i];
		let ignoreRule = false;

		if (!rule.selectors) {
			continue;
		}

		if (rule.declarations && rule.declarations.every(d =>
			d.property && d.property.startsWith('--'))) {
			continue;
		}

		let additional = "";
		for (let x = 0; x < rule.selectors.length; x++) {
			let selector = rule.selectors[x];
			let selectors = selector.split(" ");

			for (let j = 0; j < selectors.length; j++) {
				let s = selectors[j];
				if (tagMap[s]) {
					selectors[j] = tagMap[s].split('ui:').join('');
				}

				for (let bs of breaking_selectors) {
					if (s.includes(bs)) ignoreRule = true;
				}
			}

			selectors = selectors.join(" ");
			rule.selectors[x] = selectors;
		}
		let selector = rule.selectors.join(', ');

		additional += (selector == 'body' ? ':root' : selector) + ' {\n';

		let valid = 0;
		for(let d = 0; d < rule.declarations.length; d++) {
			let declaration = rule.declarations[d];

			if (declaration.property && declaration.property.startsWith('--')) {
				continue;
			}

			let property = transformProperty(declaration.property);
			let processedValue = declaration.value;

			if (ctx.config.options && ctx.config.options.substituteVariables && cssVariables) {
				processedValue = resolveValueWithVariables(declaration.value, cssVariables);

				if (processedValue === null) {
					removed_properties[`${selector}.${property}`] = true;
					continue;
				}
			}

			if (uss_properties[property]) {
				if(uss_properties[property].native == true) {
					let value = translateValue(processedValue, property, ctx);
					additional += '    ' + property + ': ' + value + ';\n';
					additional += getExtras(property, value);
					valid++;
				}
				else not_implemented[declaration.property] = true;
			}
			else unity_support[declaration.property] = true;
		}

		additional += '}\n';

		if (valid == 0 || ignoreRule) console.log("- Empty/invalid ruleset discarded: " + selector);
		else {
			result += additional;
		}
	}

	if(Object.keys(unity_support).length > 0) console.warn("- UI Toolkit doesn't support: " + Object.keys(unity_support).join(', '));
	if(Object.keys(not_implemented).length > 0) console.warn('- Not implemented yet: ' + Object.keys(not_implemented).join(', '));
	if(ctx.config.options && ctx.config.options.substituteVariables && Object.keys(removed_properties).length > 0) console.warn('- Properties removed due to missing variables: ' + Object.keys(removed_properties).join(', '));

	return result;
}

module.exports = {
	convertCss,
	css2uss
};
