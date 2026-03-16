const fs = require('fs');
const cheerio = require('cheerio');
const css = require('css');
const uss_properties = require('./uss_properties.json');
const breaking_selectors = require('./breaking_selectors.json');

let config, html, cssContent, outputFolder;
let cssVariables = new Map();

let xmlheader = '<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" editor-extension-mode="False">';
let xmlfooter = '</ui:UXML>';

function html2uxml(name, h) {
	const $ = cheerio.load(h);
	let parsed = convertToXML($('body'), $);
	
	parsed = parsed.split('<body>').join(xmlheader);
	parsed = parsed.split('</body>').join(xmlfooter);
	
	fs.writeFile(`${outputFolder}/` + name + '.uxml', formatXml(parsed), 'utf-8', err => {
		if(err) console.log(err);
		else {
			console.log(name + ' UXML written ✓');
		} 
	});
}

let tagMap = {
	div: 'ui:VisualElement',
	p: 'ui:Label',
	span: 'ui:Label',
	input: 'ui:TextField',
	'input[type="text"]': 'ui:TextField',
	'input[type="checkbox"]': 'ui:Toggle',
	'text': 'ui:Label',
	h1: 'ui:Label',
	h2: 'ui:Label',
	h3: 'ui:Label',
	h4: 'ui:Label',
	h5: 'ui:Label',
	h6: 'ui:Label',
	label: 'ui:Label',
	strong: 'ui:Label',
	b: 'ui:Label',
	em: 'ui:Label',
	i: 'ui:Label',
	small: 'ui:Label',
	mark: 'ui:Label',
	abbr: 'ui:Label',
	cite: 'ui:Label',
	code: 'ui:Label',
	q: 'ui:Label',
	time: 'ui:Label'
};

function getElementTagName(element) {
	let tagName = element.get(0).tagName || element.get(0).type;
	if (tagName == "input") {
		const inputType = element.get(0).attribs && element.get(0).attribs.type;
		if (inputType) {
			tagName += `[type="${inputType}"]`;
		}
	}
	tagName = tagMap[tagName] || tagName;

	return tagName;
}

function convertToXML(element, $) {
	let xmlString = '';	
	let tagName = getElementTagName(element);
	
	xmlString += `<${tagName}`;
	let valid = true;

	if (tagName == 'ui:Label') {
		if (getElementTagName(element.parent()) == "ui:Label" && element.get(0).tagName == undefined) { 
			valid = false;
		}
		else {
			let text = element.first().text();
			if (text.trim().split(" ").join("") == "") valid = false;
			if (config.options.uppercase == true) text = text.toUpperCase();
			xmlString += ' text="' + escapeXml(text) + '"';
		}
	}

	element.each((_, elem) => {
		const attributes = elem.attribs;
		for (const attr in attributes) {
			xmlString += ` ${attr}="${attributes[attr]}"`;
		}
	});

	if (tagName == tagMap['input']) {
		if (config?.options?.focusable != undefined) xmlString += ` focusable="${config.options.focusable}"`;
	}
	
	xmlString += '>';
		
	element.contents().each((index, child) => {
		if (child.type != undefined && child.type != "comment") {
			const childElement = $(child);
			xmlString += convertToXML(childElement, $);
		}
	});
	
	xmlString += `</${tagName}>`;	
	
	return valid ? xmlString : "";
}

function extractCssVariables(rules) {
	cssVariables.clear();

	for (let rule of rules) {
		if (rule.declarations) {
			for (let declaration of rule.declarations) {
				if (declaration.property && declaration.property.startsWith('--')) {
					const varName = declaration.property;
					const varValue = declaration.value.trim();
					cssVariables.set(varName, varValue);
				}
			}
		}
	}
}

function resolveVariable(varName, visited = new Set()) {
	if (visited.has(varName)) {
		console.warn(`Circular reference detected in CSS variable: ${varName}`);
		return undefined;
	}

	const value = cssVariables.get(varName);
	if (!value) {
		return undefined;
	}

	const varMatch = value.match(/^var\((--[\w-]+)\)$/);
	if (varMatch) {
		visited.add(varName);
		return resolveVariable(varMatch[1], visited);
	}

	const resolvedValue = value.replace(/var\((--[\w-]+)\)/g, (match, refVar) => {
		visited.add(varName);
		const resolved = resolveVariable(refVar, new Set(visited));
		return resolved !== undefined ? resolved : match;
	});

	return resolvedValue;
}

function resolveValueWithVariables(value) {
	const resolvedValue = value.replace(/var\((--[\w-]+)\)/g, (match, varName) => {
		const resolved = resolveVariable(varName);
		if (resolved === undefined) {
			console.warn(`Undefined CSS variable: ${varName}`);
			return null;
		}
		return resolved;
	});

	if (resolvedValue.includes('null')) {
		return null;
	}

	return resolvedValue;
}

function convertCss(name, data) {
	let parsedCSS =  css.parse(data);
	fs.writeFile(`${outputFolder}/` + name + '.uss', css2uss(parsedCSS.stylesheet.rules), 'utf-8', err => {
		if(err) console.log(err);
		else console.log(name + ' USS written ✓');
	});
}

function css2uss(rules) {
	let result = '';
	let not_implemented = {};
	let unity_support = {};
	let removed_properties = {};

	if (config.options && config.options.substituteVariables) {
		extractCssVariables(rules);
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
			
			for (let i = 0; i < selectors.length; i++) {
				let s = selectors[i];
				if (tagMap[s]) {
					selectors[i] = tagMap[s].split('ui:').join('');
				}

				for (let selector of breaking_selectors) {
					if(s.split(selector).length > 1) ignoreRule = true;
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

			if (config.options && config.options.substituteVariables) {
				processedValue = resolveValueWithVariables(declaration.value);

				if (processedValue === null) {
					removed_properties[`${selector}.${property}`] = true;
					continue;
				}
			}

			if (uss_properties[property]) {
				if(uss_properties[property].native == true) {
					let value = translateValue(processedValue, property);
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
	if(config.options && config.options.substituteVariables && Object.keys(removed_properties).length > 0) console.warn('- Properties removed due to missing variables: ' + Object.keys(removed_properties).join(', '));
	
	return result;
}

function translateValue(value, property) {
	value = value.replace(/(^|\s)\.(\d)/g, '$10.$2');
	value = value.split('vw').join('%');
	value = value.split('vh').join('%');
	value = property == "-unity-font" ? getAssetPath(value) : value;
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

function transformProperty(property) {
	property = property == 'background' ? 'background-color' : property;
	property = property == 'font-family' ? '-unity-font' : property;

	if (property == 'text-align') {
		return '-unity-text-align';
	}

	return property
}

function getAssetPath(value) {
	if (config.assets && config.assets[value]) {
		return `url("${config.assets[value].path}")`;
	}
	console.warn(`- Asset not mapped: ${value}`);
	return value;
}

function getExtras(property, value) {
	let extras = '';
	extras += property == '-unity-font' ? '	-unity-font-definition: none;\n' : '';
	return extras;
}

function getDefaultConfig() {
	return {
		assets: {},
		options: {
			uppercase: false,
			substituteVariables: false
		}
	};
}

function convert(argv) {
	if (argv.config) {
		try {
			let configPath = require("path").resolve(__dirname, argv.config);
			config = require(configPath);
		} catch (error) {
			console.warn(`Config file not found: ${argv.config}. Using defaults.`);
			config = getDefaultConfig();
		}
	} else {
		config = getDefaultConfig();
	}

	outputFolder = argv.output;

	html = [];
	for (let i = 0; i < argv.input.length; i++) {
		let path = argv.input[i];		
		let splitted = path.split('\\');
		if (splitted.length == 1) splitted = path.split('/')
			
		html.push({
			name: splitted.length > 1 ? splitted[splitted.length - 1] : path,
			data: fs.readFileSync(path, 'utf8')
		})
	}

	cssContent = [];

	const resetIsSet = process.argv.includes('--reset');
	if (resetIsSet) argv.css = argv.css.concat(argv.reset)
		
	for (let i = 0; i < argv.css.length; i++) {
		let path = argv.css[i];
		let splitted = path.split('\\');
		if (splitted.length == 1) splitted = path.split('/')

		cssContent.push({
			name: splitted.length > 1 ? splitted[splitted.length - 1] : path,
			originalPath: path,
			data: fs.readFileSync(path, 'utf8')
		})
	}

	for(let i = 0; i < html.length; i++) {
		html2uxml(html[i].name.split('.html').join(''), html[i].data);
	}
	
	for(let i = 0; i < cssContent.length; i++) {
		convertCss(cssContent[i].name.split('.css').join(''), cssContent[i].data);
	}
};

function formatXml(xml, tab) {
    var formatted = '', indent= '';
    tab = tab || '\t';
    xml.split(/>\s*</).forEach(function(node) {
        if (node.match( /^\/\w/ )) indent = indent.substring(tab.length);
        formatted += indent + '<' + node + '>\r\n';
        if (node.match( /^<?\w[^>]*[^\/]$/ )) indent += tab;
    });
    return formatted.substring(1, formatted.length-3);
}

function escapeXml(str) {
  return str.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
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
	// Allow tests to set module-level config
	setConfig: (c) => { config = c; },
	setCssVariables: (vars) => { cssVariables = vars; }
};