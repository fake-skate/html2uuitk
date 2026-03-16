const nodePath = require('path');
const fsp = require('fs').promises;
const uss_properties = require('../uss_properties.json');
const breaking_selectors = require('../breaking_selectors.json');
const { tagMap, htmlOnlyElements, cssOnlyProperties } = require('./constants');
const { convertRelativeUnits, convertModernColorSyntax } = require('./css-value-utils');
const { extractCssVariables, resolveValueWithVariables } = require('./css-variables');
const { transformProperty, translateValue, expandBorderRadius, mapDisplayValue, mapOverflowValue, mapPositionValue, mapFontStyleValue, parseBackground, parseBorder, parseFont, getExtras } = require('./css-transform');

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
	let mapped_value_warnings = {};
	let background_value_warnings = {};
	let border_value_warnings = {};
	let border_radius_warnings = {};

	let cssVariables = null;
	if (ctx.config.options && ctx.config.options.substituteVariables) {
		cssVariables = extractCssVariables(rules);
	}

	for(let i = 0; i < rules.length; i++) {
		let rule = rules[i];
		let ignoreRule = false;

		if (!rule.selectors) {
			if (rule.type === 'media') {
				console.warn('- @media queries are not supported by USS, skipped.');
			} else if (rule.type === 'keyframes') {
				console.warn('- @keyframes are not supported by USS, skipped.');
			} else if (rule.type === 'font-face') {
				console.warn('- @font-face is not supported by USS, skipped.');
			}
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
				let baseTag = s.replace(/[.#:\[].*/,'').toLowerCase();
				if (tagMap[s]) {
					selectors[j] = tagMap[s].split('ui:').join('');
				}

				if (baseTag && htmlOnlyElements.has(baseTag)) ignoreRule = true;

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

			let originalProperty = declaration.property;
			let processedValue = declaration.value;

			// Strip 'inherit' — not supported in USS
			if (processedValue && processedValue.trim().toLowerCase() === 'inherit') {
				continue;
			}

			// Strip CSS-only properties
			if (cssOnlyProperties.has(originalProperty)) {
				continue;
			}

			// Convert rem/em to px
			if (processedValue) {
				processedValue = convertRelativeUnits(processedValue);
			}

			// Convert modern color syntax
			if (processedValue) {
				processedValue = convertModernColorSyntax(processedValue);
			}

			if (ctx.config.options && ctx.config.options.substituteVariables && cssVariables) {
				processedValue = resolveValueWithVariables(declaration.value, cssVariables);

				if (processedValue === null) {
					removed_properties[`${selector}.${originalProperty}`] = true;
					continue;
				}
			}

			// Handle background shorthand
			if (originalProperty == 'background') {
				let parsed = parseBackground(processedValue);
				if (parsed) {
					if (parsed.color) {
						additional += '    background-color: ' + parsed.color + ';\n';
						valid++;
					}
					if (parsed.image) {
						additional += '    background-image: ' + parsed.image + ';\n';
						valid++;
					}
					if (parsed.repeat) {
						additional += '    background-repeat: ' + parsed.repeat + ';\n';
						valid++;
					}
					if (parsed.warnings && parsed.warnings.length > 0) {
						for (let w of parsed.warnings) background_value_warnings[w] = true;
					}
					continue;
				}
				// Fallback: treat as background-color
				originalProperty = 'background-color';
			}

			// Handle border shorthand
			if (originalProperty == 'border') {
				let parsed = parseBorder(processedValue);
				if (parsed) {
					if (parsed.width) {
						additional += '    border-width: ' + parsed.width + ';\n';
						valid++;
					}
					if (parsed.color) {
						additional += '    border-color: ' + parsed.color + ';\n';
						valid++;
					}
					if (parsed.warnings && parsed.warnings.length > 0) {
						for (let w of parsed.warnings) border_value_warnings[w] = true;
					}
					continue;
				}
			}

			let property = transformProperty(originalProperty);

			// Handle font shorthand
			if (originalProperty == 'font') {
				let parsed = parseFont(processedValue);
				if (parsed) {
					if (parsed.fontSize) {
						let fontSize = convertRelativeUnits(parsed.fontSize);
						additional += '    font-size: ' + fontSize + ';\n';
						valid++;
					}
					if (parsed.fontFamily) {
						let fontVal = translateValue(parsed.fontFamily, '-unity-font', ctx);
						additional += '    -unity-font: ' + fontVal + ';\n';
						additional += '    -unity-font-definition: none;\n';
						valid++;
					}
					if (parsed.fontStyle) {
						let mapped = mapFontStyleValue(parsed.fontStyle, 'font-style');
						if (mapped && mapped.value) {
							additional += '    -unity-font-style: ' + mapped.value + ';\n';
							valid++;
						}
					}
					if (parsed.fontWeight) {
						let mapped = mapFontStyleValue(parsed.fontWeight, 'font-weight');
						if (mapped && mapped.value) {
							additional += '    -unity-font-style: ' + mapped.value + ';\n';
							valid++;
						}
					}
					continue;
				}
			}

			// Handle font-style / font-weight → -unity-font-style
			if (originalProperty == 'font-style' || originalProperty == 'font-weight') {
				let mapped = mapFontStyleValue(processedValue, originalProperty);
				if (mapped && mapped.value) {
					additional += '    -unity-font-style: ' + mapped.value + ';\n';
					valid++;
					if (mapped.mapped) mapped_value_warnings[`${originalProperty}:${processedValue}`] = true;
					continue;
				}
				mapped_value_warnings[`${originalProperty}:unsupported:${processedValue}`] = true;
				continue;
			}

			// Handle border-radius shorthand
			if (property == 'border-radius') {
				let radii = expandBorderRadius(processedValue, border_radius_warnings);
				if (radii) {
					additional += '    border-top-left-radius: ' + radii.tl + ';\n';
					additional += '    border-top-right-radius: ' + radii.tr + ';\n';
					additional += '    border-bottom-right-radius: ' + radii.br + ';\n';
					additional += '    border-bottom-left-radius: ' + radii.bl + ';\n';
					valid += 4;
					continue;
				}
			}

			// Handle display value mapping
			if (property == 'display') {
				let mapped = mapDisplayValue(processedValue);
				if (mapped && mapped.value) {
					additional += '    display: ' + mapped.value + ';\n';
					valid++;
					if (mapped.mapped) mapped_value_warnings[`display:${processedValue}`] = true;
					continue;
				}
				mapped_value_warnings[`display:unsupported:${processedValue}`] = true;
				continue;
			}

			// Handle overflow value mapping
			if (property == 'overflow') {
				let mapped = mapOverflowValue(processedValue);
				if (mapped && mapped.value) {
					additional += '    overflow: ' + mapped.value + ';\n';
					valid++;
					if (mapped.mapped) mapped_value_warnings[`overflow:${processedValue}`] = true;
					continue;
				}
				mapped_value_warnings[`overflow:unsupported:${processedValue}`] = true;
				continue;
			}

			// Handle position value mapping
			if (property == 'position') {
				let mapped = mapPositionValue(processedValue);
				if (mapped && mapped.value) {
					additional += '    position: ' + mapped.value + ';\n';
					valid++;
					if (mapped.mapped) mapped_value_warnings[`position:${processedValue}`] = true;
					continue;
				}
				mapped_value_warnings[`position:unsupported:${processedValue}`] = true;
				continue;
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
	if(Object.keys(mapped_value_warnings).length > 0) console.warn('- Value mapped to supported USS: ' + Object.keys(mapped_value_warnings).join(', '));
	if(Object.keys(background_value_warnings).length > 0) console.warn('- background shorthand partial parse: ' + Object.keys(background_value_warnings).join(', '));
	if(Object.keys(border_value_warnings).length > 0) console.warn('- border shorthand partial parse: ' + Object.keys(border_value_warnings).join(', '));
	if(Object.keys(border_radius_warnings).length > 0) console.warn('- border-radius warnings: ' + Object.keys(border_radius_warnings).join(', '));
	if(ctx.config.options && ctx.config.options.substituteVariables && Object.keys(removed_properties).length > 0) console.warn('- Properties removed due to missing variables: ' + Object.keys(removed_properties).join(', '));

	return result;
}

module.exports = {
	convertCss,
	css2uss
};
