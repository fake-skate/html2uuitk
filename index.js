// USS reference: https://docs.unity3d.com/Manual/UIE-USS-Properties-Reference.html

const fs = require('fs');
const cheerio = require('cheerio');
const css = require('css');
const uss_properties = require('./uss_properties.json');
const config = require('./config.json');

const html = [{name: 'panasonic_menu.html', data: fs.readFileSync('panasonic_menu.html', 'utf8')}];
const cssContent = [{name: 'reset.css', data: fs.readFileSync('reset.css', 'utf8')}, {name: 'panasonic_style.css', data: fs.readFileSync('panasonic_style.css', 'utf8')}]

let xmlheader = '<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" editor-extension-mode="False">';
let xmlfooter = '</ui:UXML>';
let resetAll = 'body, div, p';

for(let i = 0; i < html.length; i++) {
	html2uxml(html[i].name.split('.html').join(''), html[i].data);
}

for(let i = 0; i < cssContent.length; i++) {
	convertCss(cssContent[i].name.split('.css').join(''), cssContent[i].data);
}

function html2uxml(name, h) {
	const $ = cheerio.load(h);
	let parsed = convertToXML($('body'), $);
	
	parsed = parsed.split('<body>').join(xmlheader);
	parsed = parsed.split('</body>').join(xmlfooter);
	
	fs.writeFile('./results/' + name + '.uxml', parsed, 'utf-8', err => {
		if(err) console.log(err);
		else console.log(name + ' UXML written ✓');
	});
}


function convertToXML(element, $) {
	let xmlString = '';
	
	const tagMap = {
		div: 'ui:VisualElement',
		p: 'ui:Label'
	};
	
	const tagName = tagMap[element.get(0).tagName] || element.get(0).tagName;
	
	xmlString += `<${tagName}`;
	
	if(tagName == tagMap['p']) {
		let text = element.first().text();
		if(config.options.uppercase == true) text = text.toUpperCase();
		xmlString += ' text="' + text + '"';
	}
	
	element.each((_, elem) => {
		const attributes = elem.attribs;
		for (const attr in attributes) {
			xmlString += ` ${attr}="${attributes[attr]}"`;
		}
	});
	
	if (element.children().length > 0) {
		xmlString += '>';
		
		element.children().each((index, child) => {
			const childElement = $(child);
			xmlString += convertToXML(childElement, $);
		});
		
		xmlString += `</${tagName}>`;
	} else {
		xmlString += ' />';
	}
	
	
	return xmlString;
}

function convertCss(name, data) {
	let parsedCSS =  css.parse(data);
	fs.writeFile('./results/' + name + '.uss', css2uss(parsedCSS.stylesheet.rules), 'utf-8', err => {
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
		let selector = rule.selectors.join(', ');
		result += (selector == 'body' ? ':root' : selector == resetAll ? '*' : selector) + ' {\n';
		for(let d = 0; d < rule.declarations.length; d++) {
			let declaration = rule.declarations[d];
			let property = transformProperty(declaration.property);
			console.log(property);
			if (uss_properties[property]) {
				if(uss_properties[property].native == true) {
					let value = translateValue(declaration.value, property);
					result += '    ' + property + ': ' + value + ';\n';
					result += getExtras(property, value);
				}
				else not_implemented[declaration.property] = true;
			}
			else unity_support[declaration.property] = true;
		}
		result += '}\n';        
	}
	
	if(Object.keys(unity_support).length > 0) console.warn("- UI Toolkit doesn't support: " + Object.keys(unity_support).join(', '));
	if(Object.keys(not_implemented).length > 0) console.warn('- Not implemented yet: ' + Object.keys(not_implemented).join(', '));
	
	return result;
}

function translateValue(value, property) {
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