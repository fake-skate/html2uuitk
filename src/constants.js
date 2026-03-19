const xmlheader = '<ui:UXML xmlns:ui="UnityEngine.UIElements" xmlns:uie="UnityEditor.UIElements" editor-extension-mode="False">';
const xmlfooter = '</ui:UXML>';

const tagMap = {
	div: 'ui:VisualElement',
	p: 'ui:Label',
	span: 'ui:Label',
	input: 'ui:TextField',
	'input[type="text"]': 'ui:TextField',
	'input[type="checkbox"]': 'ui:Toggle',
	'input[type="radio"]': 'ui:RadioButton',
	'input[type="range"]': 'ui:Slider',
	'input[type="number"]': 'ui:IntegerField',
	'input[type="password"]': 'ui:TextField',
	'input[type="search"]': 'ui:TextField',
	'input[type="email"]': 'ui:TextField',
	'input[type="url"]': 'ui:TextField',
	textarea: 'ui:TextField',
	button: 'ui:Button',
	select: 'ui:DropdownField',
	img: 'ui:VisualElement',
	progress: 'ui:ProgressBar',
	section: 'ui:VisualElement',
	article: 'ui:VisualElement',
	nav: 'ui:VisualElement',
	header: 'ui:VisualElement',
	footer: 'ui:VisualElement',
	main: 'ui:VisualElement',
	aside: 'ui:VisualElement',
	ul: 'ui:VisualElement',
	ol: 'ui:VisualElement',
	li: 'ui:VisualElement',
	a: 'ui:Label',
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

// HTML elements that have no USS/UXML equivalent
const htmlOnlyElements = new Set([
	'hr', 'sub', 'sup', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
	'fieldset', 'legend', 'menu', 'dialog', 'audio', 'canvas',
	'embed', 'iframe', 'object', 'svg', 'video', 'kbd', 'pre', 'samp',
	'blockquote', 'dd', 'dl', 'dt', 'figure', 'figcaption', 'optgroup',
	'summary', 'details'
]);

// HTML elements to skip during UXML conversion
const uxmlSkipTags = new Set([
	'script', 'style', 'svg', 'form',
	'iframe', 'canvas', 'audio', 'video', 'object', 'embed', 'noscript',
	'link', 'meta', 'head', 'title'
]);

// CSS properties that accept only values unsupported by USS
const cssOnlyProperties = new Set([
	'cursor'
]);

module.exports = {
	xmlheader,
	xmlfooter,
	tagMap,
	htmlOnlyElements,
	uxmlSkipTags,
	cssOnlyProperties
};
