function extractCssVariables(rules) {
	const cssVariables = new Map();

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

	return cssVariables;
}

function resolveVariable(varName, cssVariables, visited = new Set()) {
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
		return resolveVariable(varMatch[1], cssVariables, visited);
	}

	const resolvedValue = value.replace(/var\((--[\w-]+)\)/g, (match, refVar) => {
		visited.add(varName);
		const resolved = resolveVariable(refVar, cssVariables, new Set(visited));
		return resolved !== undefined ? resolved : match;
	});

	return resolvedValue;
}

function resolveValueWithVariables(value, cssVariables) {
	// Match var(--name) and var(--name, fallback)
	const resolvedValue = value.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (match, varName, fallback) => {
		const resolved = resolveVariable(varName, cssVariables);
		if (resolved === undefined) {
			if (fallback !== undefined) {
				return fallback.trim();
			}
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

module.exports = {
	extractCssVariables,
	resolveVariable,
	resolveValueWithVariables
};
