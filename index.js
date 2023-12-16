const fs = require('fs');
const cheerio = require('cheerio');
const css = require('css');
const uss_properties = require('./uss_properties.json');

const html = fs.readFileSync('input.html', 'utf8');
const cssContent = fs.readFileSync('style.css', 'utf8')
let parsedCSS =  css.parse(cssContent);
const $ = cheerio.load(html);
let xmlheader = '<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" editor-extension-mode="False">';
let xmlfooter = '</ui:UXML>';

html2uxml();

function html2uxml() {
    let parsed = convertToXML($('body'));

    parsed = parsed.split('<body>').join(xmlheader);
    parsed = parsed.split('</body>').join(xmlfooter);

    fs.writeFile('./view.uxml', parsed, 'utf-8', err => {
        console.log(err);
    });
}


function convertToXML(element) {
    let xmlString = '';
  
    // Map specific tag names to their XML equivalents
    const tagMap = {
      div: 'ui:VisualElement',
      p: 'ui:Label'
      // Add other specific tag mappings as needed
    };
  
    // Get tag name or use a default tag name if not found in the mapping
    const tagName = tagMap[element.get(0).tagName] || element.get(0).tagName;
  
    xmlString += `<${tagName}`;

    if(tagName == tagMap['p']) {
        xmlString += ' text="' + element.first().text() + '"';
    }
  
    // Convert attributes to XML attributes
    element.each((_, elem) => {
      const attributes = elem.attribs;
      for (const attr in attributes) {
        xmlString += ` ${attr}="${attributes[attr]}"`;
      }
    });
  
    // Check if the element has children
    if (element.children().length > 0) {
      xmlString += '>';
  
      // Recursively handle children
      element.children().each((index, child) => {
        const childElement = $(child);
        xmlString += convertToXML(childElement);
      });
  
      xmlString += `</${tagName}>`;
    } else {
      xmlString += ' />';
    }
  

    return xmlString;
}

fs.writeFile('./style.uss', css2uss(parsedCSS.stylesheet.rules), 'utf-8', err => {
    console.log(err);
});

function css2uss(rules) {
    let result = '';

    for(let i = 0; i < rules.length; i++) {
        let rule = rules[i];
        let selector = rule.selectors.join(' ');
        result += (selector == 'body' ? ':root' : selector) + ' {\n';
        for(let d = 0; d < rule.declarations.length; d++) {
            let declaration = rule.declarations[d];
            if (uss_properties[declaration.property]) {
                if(uss_properties[declaration.property].native == true) {
                    result += '    ' + declaration.property + ': ' + translateValue(declaration.value) + ';\n';
                }
            }
        }
        result += '}\n';        
    }
    
    return result;
}

function translateValue(value) {
    value = value.split('vw').join('%');
    value = value.split('vh').join('%');
    return value;
}