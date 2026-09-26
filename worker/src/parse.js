const TAXONOMY = [
	{
		kind: 'ai-user',
		tokens: ['chatgpt-user', 'claude-user', 'perplexity-user', 'mistralai-user'],
	},
	{
		kind: 'ai',
		tokens: [
			'gptbot',
			'oai-searchbot',
			'claudebot',
			'claude-web',
			'anthropic-ai',
			'perplexitybot',
			'ccbot',
			'google-extended',
			'applebot-extended',
			'meta-externalagent',
			'bytespider',
			'amazonbot',
			'mistralai',
			'cohere-ai',
			'youbot',
			'imagesiftbot',
		],
	},
	{
		kind: 'search',
		tokens: [
			'googlebot',
			'google-inspectiontool',
			'bingbot',
			'bingpreview',
			'duckduckbot',
			'yandexbot',
			'baiduspider',
			'slurp',
			'applebot',
			'petalbot',
			'seznambot',
			'qwantify',
			'mojeekbot',
			'archive.org_bot',
			'ia_archiver',
			'marginalia',
		],
	},
	{
		kind: 'social',
		tokens: [
			'facebookexternalhit',
			'facebookcatalog',
			'twitterbot',
			'linkedinbot',
			'slackbot',
			'slack-imgproxy',
			'discordbot',
			'telegrambot',
			'whatsapp',
			'skypeuripreview',
			'embedly',
			'redditbot',
			'pinterest',
			'tumblr',
			'bitlybot',
			'nuzzel',
			'outbrain',
			'vkshare',
			'w3c_validator',
			'flipboard',
			'mastodon',
		],
	},
	{
		kind: 'seo',
		tokens: [
			'ahrefsbot',
			'semrushbot',
			'mj12bot',
			'dotbot',
			'rogerbot',
			'blexbot',
			'dataforseobot',
			'serpstatbot',
			'screaming frog',
			'sitebulb',
			'linkdexbot',
			'diffbot',
		],
	},
	{
		kind: 'tool',
		tokens: [
			'curl/',
			'wget/',
			'python-requests',
			'python-urllib',
			'scrapy',
			'go-http-client',
			'okhttp',
			'apache-httpclient',
			'java/',
			'httpclient',
			'libwww-perl',
			'node-fetch',
			'axios',
			'postmanruntime',
			'headlesschrome',
			'phantomjs',
			'puppeteer',
			'playwright',
			'lighthouse',
			'pingdom',
			'uptimerobot',
			'gtmetrix',
			'zgrab',
			'masscan',
			'nmap',
			'sqlmap',
			'nikto',
			'wpscan',
		],
	},
];

const BROWSER_UA = /Mozilla\/5|Gecko\/\d|Trident\/|Presto\//i;

const TABLET = /ipad|tablet|playbook|silk|kindle|gt-p\d|sm-t\d/i;
const MOBILE = /mobi|iphone|ipod|windows phone|blackberry|iemobile|opera mini|webos|palm/i;
const ANDROID = /android/i;

const OS_RULES = [
	[/android/i, 'android'],
	[/iphone|ipad|ipod/i, 'ios'],
	[/windows/i, 'windows'],
	[/cros/i, 'chromeos'],
	[/macintosh|mac os x/i, 'macos'],
	[/linux|x11/i, 'linux'],
];

const BROWSER_RULES = [
	[/\bedg[a-z]*\//i, 'edge'],
	[/\bopr\/|\bopera\b/i, 'opera'],
	[/\bfirefox\/|\bfxios\//i, 'firefox'],
	[/\bcrios\//i, 'chrome'],
	[/\bchrome\/|\bchromium\//i, 'chrome'],
	[/\bsafari\//i, 'safari'],
	[/\bcurl\//i, 'curl'],
];

const AI_KINDS = new Set(['ai', 'ai-user']);

function matchRule(ua, rules, fallback) {
	for (const [pattern, value] of rules) {
		if (pattern.test(ua)) return value;
	}
	return fallback;
}

function matchToken(lower, tokens) {
	for (const token of tokens) {
		if (lower.includes(token)) return token.replace(/\/$/, '');
	}
	return '';
}

export function classifyDevice(ua, isBot) {
	if (isBot) return 'bot';
	if (TABLET.test(ua)) return 'tablet';
	if (ANDROID.test(ua)) return MOBILE.test(ua) ? 'mobile' : 'tablet';
	if (MOBILE.test(ua)) return 'mobile';
	return BROWSER_UA.test(ua) ? 'desktop' : 'other';
}

export function classifyOs(ua) {
	return matchRule(ua, OS_RULES, 'other');
}

export function classifyBrowser(ua) {
	return matchRule(ua, BROWSER_RULES, 'other');
}

export function detectBot(ua, headers, cf) {
	if (cf?.botManagement?.verifiedBot === true) return { kind: 'other', bot: 'bot-management' };

	const lower = ua.toLowerCase();
	for (const { kind, tokens } of TAXONOMY) {
		const token = matchToken(lower, tokens);
		if (token) return { kind, bot: token };
	}

	if (!ua.trim()) return { kind: 'other', bot: 'no-user-agent' };

	if (lower.includes('bot') || lower.includes('crawler') || lower.includes('spider')) {
		if (!BROWSER_UA.test(ua)) return { kind: 'other', bot: 'generic-bot' };
	}

	if (!BROWSER_UA.test(ua)) return { kind: 'other', bot: 'not-a-browser' };

	const fetchMetadata =
		headers.get('sec-fetch-dest') || headers.get('sec-fetch-mode') || headers.get('sec-ch-ua');
	if (!fetchMetadata) return { kind: 'other', bot: 'no-fetch-metadata' };

	return { kind: 'human', bot: '' };
}

export function classify(ua, headers, cf) {
	const { kind, bot } = detectBot(ua, headers, cf);
	const isBot = kind !== 'human';
	return {
		kind,
		device: classifyDevice(ua, isBot),
		os: isBot ? 'bot' : classifyOs(ua),
		browser: isBot ? 'bot' : classifyBrowser(ua),
		bot,
		isBot,
		isAi: AI_KINDS.has(kind),
	};
}

export function referrerHost(referer, selfHost) {
	if (!referer) return 'direct';

	let host;
	try {
		host = new URL(referer).hostname.toLowerCase().replace(/^www\./, '');
	} catch {
		return 'unparsed';
	}
	if (!host) return 'unparsed';
	if (host === selfHost || host.endsWith(`.${selfHost}`) || host === `px.${selfHost}`) return 'self';
	return host;
}

export function normalizePage(raw) {
	if (!raw) return '?';
	const page = raw.length > 200 ? raw.slice(0, 200) : raw;
	return /^\/[^\s"<>\\^`{|}].*$/.test(page) && !page.startsWith('//') ? page : '?';
}

export function normalizeCountry(country) {
	if (!country || country.length !== 2) return '??';
	return country.toUpperCase();
}
