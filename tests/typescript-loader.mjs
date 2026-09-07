import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

let databaseUrl;
export function initialize(data) {
	databaseUrl = data.databaseUrl;
}

export async function resolve(specifier, context, nextResolve) {
	if (specifier === '$env/dynamic/private')
		return { url: 'test:env', shortCircuit: true };
	if (specifier.startsWith('$lib/')) {
		let url = new URL(`../src/lib/${specifier.slice(5)}`, import.meta.url);
		if (!existsSync(fileURLToPath(url)) || !url.pathname.endsWith('.ts')) {
			const file = new URL(`${url.href}.ts`);
			url = existsSync(fileURLToPath(file))
				? file
				: new URL(`${url.href}/index.ts`);
		}
		return { url: url.href, shortCircuit: true };
	}
	if (
		context.parentURL?.endsWith('.ts') &&
		specifier.startsWith('.') &&
		!specifier.endsWith('.ts')
	) {
		const url = new URL(`${specifier}.ts`, context.parentURL);
		if (existsSync(fileURLToPath(url)))
			return { url: url.href, shortCircuit: true };
	}
	return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
	if (url === 'test:env')
		return {
			format: 'module',
			source: `export const env = ${JSON.stringify({ DATABASE_URL: databaseUrl })};`,
			shortCircuit: true
		};
	if (url.endsWith('.ts')) {
		const source = await readFile(new URL(url), 'utf8');
		const { outputText } = ts.transpileModule(source, {
			compilerOptions: {
				module: ts.ModuleKind.ESNext,
				target: ts.ScriptTarget.ES2022
			}
		});
		return { format: 'module', source: outputText, shortCircuit: true };
	}
	return nextLoad(url, context);
}
