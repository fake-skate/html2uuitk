const esbuild = require('esbuild');
const { builtinModules } = require('module');

esbuild.buildSync({
	entryPoints: ['browser.js'],
	bundle: true,
	outfile: 'demo/html2uuitk.js',
	format: 'iife',
	globalName: 'html2uuitk',
	platform: 'browser',
	external: builtinModules.concat(builtinModules.map(m => 'node:' + m)),
	minify: true,
});

console.log('Browser bundle built: demo/html2uuitk.js');
