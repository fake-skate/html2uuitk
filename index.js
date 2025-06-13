// USS reference: https://docs.unity3d.com/Manual/UIE-USS-Properties-Reference.html

const fs = require('fs');
const cheerio = require('cheerio');
const css = require('css');
const uss_properties = require('./uss_properties.json');
const breaking_selectors = require('./breaking_selectors.json');

let config, html, cssContent, outputFolder;

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
	if(tagName == "input") tagname += `[type="${element.get(0).attribs.type}"`;
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
	
	for(let i = 0; i < rules.length; i++) {
		let rule = rules[i];
		let ignoreRule = false;

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
			let property = transformProperty(declaration.property);

			//console.log(property);
			if (uss_properties[property]) {
				if(uss_properties[property].native == true) {
					let value = translateValue(declaration.value, property);
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
	
	return result;
}

function translateValue(value, property) {
	value = value.replace(/(^|\s)\.(\d)/g, '$10.$2');
	value = value.split('vw').join('%');
	value = value.split('vh').join('%');
	value = property == "-unity-font" ? getAssetPath(value) : value;
	value = property == "letter-spacing" ? (+(value.split('px')[0]) * 2).toFixed(0) + 'px' : value; // dont know why but unity renders letter spacing 2x smaller
	return value;
}

function transformProperty(property) {
	property = property == 'background' ? 'background-color' : property;
	property = property == 'font-family' ? '-unity-font' : property;
	return property
}

function getAssetPath(value) {
	if(config.assets[value]) return config.assets[value].path;
}

function getExtras(property, value) {
	let extras = '';
	extras += property == '-unity-font' ? '	-unity-font-definition: none;\n' : '';
	return extras;
}

function convert(argv) {
	config = require(require("path").resolve(__dirname, argv.config));

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
	argv.css = argv.css.concat(argv.reset)
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

function formatXml(xml, tab) { // tab = optional indent value, default is tab (\t)
    var formatted = '', indent= '';
    tab = tab || '\t';
    xml.split(/>\s*</).forEach(function(node) {
        if (node.match( /^\/\w/ )) indent = indent.substring(tab.length); // decrease indent by one 'tab'
        formatted += indent + '<' + node + '>\r\n';
        if (node.match( /^<?\w[^>]*[^\/]$/ )) indent += tab;              // increase indent
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