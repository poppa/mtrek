import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), '');

	return {
		server: {
			https: getHttpsOptions(env.MTREK_CERT),
			allowedHosts: getAllowedHosts(env.MTREK_HMR_HOST),
			ws: getWebSocketOptions({
				host: env.MTREK_HMR_HOST,
				port: env.MTREK_HMR_PORT,
				protocol: env.MTREK_HMR_PROTOCOL,
				clientPort: env.MTREK_HMR_CLIENT_PORT
			})
		},
		plugins: [
			sveltekit({
				compilerOptions: {
					// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
					runes: ({ filename }) =>
						filename.split(/[/\\]/).includes('node_modules') ? undefined : true
				},

				adapter: adapter()
			})
		]
	};
});

function getAllowedHosts(hmrHost: string | undefined) {
	return hmrHost ? [hmrHost] : undefined;
}

function getWebSocketOptions(input: {
	host?: string;
	port?: string;
	protocol?: string;
	clientPort?: string;
}) {
	if (!input.host && !input.port && !input.protocol && !input.clientPort) {
		return undefined;
	}

	return {
		host: input.host,
		port: parseOptionalPort(input.port, 'MTREK_HMR_PORT'),
		clientPort: parseOptionalPort(
			input.clientPort ?? input.port,
			input.clientPort ? 'MTREK_HMR_CLIENT_PORT' : 'MTREK_HMR_PORT'
		),
		protocol: input.protocol
	};
}

function parseOptionalPort(value: string | undefined, name: string) {
	if (!value) {
		return undefined;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
		throw new Error(`${name} must be a valid TCP port.`);
	}

	return parsed;
}

function getHttpsOptions(certPath: string | undefined) {
	if (!certPath) {
		return undefined;
	}

	const resolvedPath = isAbsolute(certPath)
		? certPath
		: resolve(process.cwd(), certPath);

	if (!existsSync(resolvedPath)) {
		throw new Error(
			`MTREK_CERT points to a file that does not exist: ${resolvedPath}`
		);
	}

	const pem = readFileSync(resolvedPath, 'utf8');
	const key = pem.match(
		/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z0-9 ]*PRIVATE KEY-----/
	)?.[0];
	const cert = pem
		.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g)
		?.join('\n');

	if (!key || !cert) {
		throw new Error(
			'MTREK_CERT must point to a combined PEM file containing a private key and certificate.'
		);
	}

	return {
		key,
		cert
	};
}
