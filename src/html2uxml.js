const cheerio = require('cheerio');
const { xmlheader, xmlfooter, tagMap, uxmlSkipTags } = require('./constants');

function html2uxml(name, h, ctx) {
	const $ = cheerio.load(h);
	let parsed = convertToXML($('body'), $, ctx);

	parsed = parsed.split('<body>').join(xmlheader + styleLinks($, ctx));
	parsed = parsed.split('</body>').join(xmlfooter);

	return formatXml(parsed);
}

async function html2uxmlFile(name, h, ctx) {
	const nodePath = require('path');
	const fsp = require('fs').promises;
	const result = html2uxml(name, h, ctx);
	const outputPath = nodePath.join(ctx.outputFolder, name + '.uxml');
	await fsp.writeFile(outputPath, result, 'utf-8');
	console.log(name + ' UXML written.');
	return result;
}

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

function convertToXML(element, $, ctx) {
	let xmlString = '';
	const rawTag = element.get(0).tagName;

	// Skip elements that have no UXML equivalent
	if (rawTag && uxmlSkipTags.has(rawTag.toLowerCase())) {
		return '';
	}

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
			if (ctx.config.options.uppercase == true) text = text.toUpperCase();
			xmlString += ' text="' + escapeXml(text) + '"';
		}
	}

	element.each((_, elem) => {
		const attributes = dataAttributesToClasses(elem.attribs, ctx);
		for (const attr in attributes) {
			xmlString += ` ${attr}="${attributes[attr]}"`;
		}
	});

	if (tagName == tagMap['input']) {
		if (ctx.config?.options?.focusable != undefined) xmlString += ` focusable="${ctx.config.options.focusable}"`;
	}

	xmlString += '>';

	element.contents().each((index, child) => {
		if (child.type != undefined && child.type != "comment") {
			const childElement = $(child);
			xmlString += convertToXML(childElement, $, ctx);
		}
	});

	xmlString += `</${tagName}>`;

	return valid ? xmlString : "";
}

// UXML drops attributes it does not know, so data-* attributes would be lost.
// Carry them as "data-key:value" classes instead (read back at runtime from the class list).
function dataAttributesToClasses(attributes, ctx) {
	if (!attributes || ctx.config?.options?.dataAttributes === false) return attributes;

	const result = {};
	const dataClasses = [];
	for (const attr in attributes) {
		if (!attr.startsWith('data-')) {
			result[attr] = attributes[attr];
			continue;
		}
		const value = String(attributes[attr]).trim();
		if (/\s/.test(value)) console.warn(`${attr}="${value}" has whitespace; it cannot be a class, spaces became "_".`);
		dataClasses.push(value === '' ? attr : `${attr}:${value.replace(/\s+/g, '_')}`);
	}
	if (dataClasses.length === 0) return result;

	const classes = (result['class'] || '').split(/\s+/).filter(Boolean).concat(dataClasses);
	result['class'] = classes.join(' ');
	return result;
}

// One <Style> per <link rel="stylesheet">, in HTML order, pointing at the converted .uss next to the .uxml.
function styleLinks($, ctx) {
	if (ctx.config?.options?.styleLinks === false) return '';

	let styles = '';
	$('link[rel="stylesheet"]').each((_, link) => {
		const href = $(link).attr('href');
		if (!href) return;
		const name = href.split(/[\\/]/).pop().replace(/\.[^.]*$/, '');
		if (ctx.cssNames && !ctx.cssNames.includes(name)) {
			console.warn(`Stylesheet "${href}" is not among the converted CSS files; no <Style> written for it.`);
			return;
		}
		styles += `<Style src="${name}.uss" />`;
	});
	return styles;
}

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

module.exports = {
	html2uxml,
	dataAttributesToClasses,
	html2uxmlFile,
	formatXml,
	escapeXml
};
