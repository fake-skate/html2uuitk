const nodePath = require('path');
const fsp = require('fs').promises;
const cheerio = require('cheerio');
const { xmlheader, xmlfooter, tagMap, uxmlSkipTags } = require('./constants');

async function html2uxml(name, h, ctx) {
	const $ = cheerio.load(h);
	let parsed = convertToXML($('body'), $, ctx);

	parsed = parsed.split('<body>').join(xmlheader);
	parsed = parsed.split('</body>').join(xmlfooter);

	const outputPath = nodePath.join(ctx.outputFolder, name + '.uxml');
	await fsp.writeFile(outputPath, formatXml(parsed), 'utf-8');
	console.log(name + ' UXML written.');
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
		const attributes = elem.attribs;
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
	formatXml,
	escapeXml
};
