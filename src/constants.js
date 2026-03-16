const xmlheader = '<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" editor-extension-mode="False">';
const xmlfooter = '</ui:UXML>';

const tagMap = {
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

module.exports = {
	xmlheader,
	xmlfooter,
	tagMap
};
