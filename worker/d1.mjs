/**
 * D1 access shared by read.mjs (terminal) and dashboard.mjs (local server).
 *
 * Two ways in, because the wrangler OAuth access token on disk goes stale:
 *
 *   1. The D1 REST API, using the stored token. Fast, but only while that token
 *      is current. wrangler refreshes its own copy in memory and does not
 *      rewrite the file, so a token that has expired keeps failing here even
 *      though `wrangler whoami` works.
 *   2. `wrangler d1 execute`, which refreshes for itself. Slower (a process per
 *      query) but cannot go stale, and it keeps a credential out of this repo
 *      entirely.
 *
 * So: try the fast path, fall back to wrangler on an auth failure. Either way
 * nothing reads a secret from the repository.
 */

import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ACCOUNT_ID = '252fa1a6a585d7f784df3811dd3dc0ce';
export const DATABASE_ID = process.env.D1_DATABASE_ID ?? '6a9dce0c-6f06-4fcb-91b9-d96e79d40068';
const API = 'https://api.cloudflare.com/client/v4';
const BINDING = process.env.D1_BINDING ?? 'isrl-reads';

function configPaths() {
	return [
		process.env.WRANGLER_CONFIG,
		join(process.env.XDG_CONFIG_HOME ?? '', 'wrangler', 'config', 'default.toml'),
		join(process.env.APPDATA ?? '', 'xdg.config', '.wrangler', 'config', 'default.toml'),
		join(process.env.HOME ?? '', '.config', '.wrangler', 'config', 'default.toml'),
	].filter(Boolean);
}

/** A long-lived scoped token in .dev.vars (gitignored) wins when present. */
function envToken() {
	return process.env.D1_API_TOKEN || null;
}

async function storedAuth() {
	for (const path of configPaths()) {
		try {
			const text = await readFile(path, 'utf8');
			const token = text.match(/^oauth_token\s*=\s*"(.+)"$/m)?.[1];
			if (!token) continue;
			const expires = text.match(/^expiration_time\s*=\s*"(.+)"$/m)?.[1];
			return { token, expiresAt: expires ? Date.parse(expires) : 0 };
		} catch {
			// try the next candidate
		}
	}
	return null;
}

function isAuthFailure(error) {
	return /10000|Authentication error/i.test(error.message);
}

async function viaRest(sql) {
	const token = envToken() ?? (await storedAuth())?.token;
	if (!token) throw new Error('no Cloudflare token available');

	const response = await fetch(`${API}/accounts/${ACCOUNT_ID}/d1/database/${DATABASE_ID}/query`, {
		method: 'POST',
		headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
		body: JSON.stringify({ sql }),
	});
	const parsed = await response.json();
	if (!response.ok || parsed.success === false) {
		throw new Error(JSON.stringify(parsed.errors ?? parsed).slice(0, 400));
	}
	return parsed.result?.[0]?.results ?? [];
}

async function viaWrangler(sql) {
	// Run wrangler's JS entry with node directly. A shell would word-split the
	// SQL on Windows, and passing SQL through a shell is avoidable risk.
	const entry = fileURLToPath(new URL('./node_modules/wrangler/bin/wrangler.js', import.meta.url));
	const args = [entry, 'd1', 'execute', BINDING, '--remote', '--command', sql, '--json'];

	const { code, stdout, stderr } = await new Promise((resolve, reject) => {
		const child = spawn(process.execPath, args, { cwd: dirname(fileURLToPath(import.meta.url)) });
		let out = '', err = '';
		child.stdout.on('data', (c) => (out += c));
		child.stderr.on('data', (c) => (err += c));
		child.on('error', reject);
		child.on('close', (c) => resolve({ code: c, stdout: out, stderr: err }));
	});

	// On a SQL mistake wrangler exits non-zero and reports the real reason as
	// JSON on stdout, so surface that verbatim rather than "Command failed".
	const raw = stdout.trim();
	let payload;
	try {
		payload = JSON.parse(raw);
	} catch {
		const start = raw.indexOf('[');
		try {
			payload = start === -1 ? null : JSON.parse(raw.slice(start));
		} catch {
			payload = null;
		}
	}

	if (!payload) {
		throw new Error(`wrangler d1 execute failed (exit ${code}): ${(stderr || raw).trim().slice(0, 400)}`);
	}
	if (!Array.isArray(payload)) {
		throw new Error(JSON.stringify(payload.error ?? payload).slice(0, 400));
	}
	if (payload.length && payload[0].success === false) {
		throw new Error(JSON.stringify(payload[0].errors ?? payload[0]).slice(0, 400));
	}
	return payload[0]?.results ?? [];
}

let useWrangler = false;

export async function query(sql) {
	// A read is idempotent, so retrying the transport is safe. A rejected
	// statement fails at once rather than being retried three times.
	let lastError;
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			return useWrangler ? await viaWrangler(sql) : await viaRest(sql);
		} catch (error) {
			if (!useWrangler && isAuthFailure(error)) {
				useWrangler = true;
				lastError = error;
				continue;
			}
			if (/SQLITE_ERROR|syntax|no such|too many|ambiguous|error: /i.test(error.message)) throw error;
			lastError = error;
			if (attempt < 3) await new Promise((done) => setTimeout(done, 400 * attempt));
		}
	}
	throw new Error(
		`D1 query failed after 3 attempts: ${lastError?.message ?? lastError}\n` +
			'If this says "Authentication error", your wrangler login has expired: run npx wrangler login',
	);
}

/** Which path is in use, for the dashboard footer. */
export function transport() {
	return useWrangler ? 'wrangler' : 'rest';
}
