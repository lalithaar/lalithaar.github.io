CREATE TABLE IF NOT EXISTS reads_daily (
	day     TEXT    NOT NULL,
	page    TEXT    NOT NULL,
	ref     TEXT    NOT NULL,
	country TEXT    NOT NULL,
	device  TEXT    NOT NULL,
	humans  INTEGER NOT NULL DEFAULT 0,
	bots    INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, page, ref, country, device)
);

CREATE INDEX IF NOT EXISTS reads_daily_page ON reads_daily (page);
CREATE INDEX IF NOT EXISTS reads_daily_day ON reads_daily (day);

CREATE TABLE IF NOT EXISTS reads_by_hour (
	day    TEXT    NOT NULL,
	hour   INTEGER NOT NULL,
	humans INTEGER NOT NULL DEFAULT 0,
	bots   INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, hour)
);

CREATE TABLE IF NOT EXISTS reads_crawlers (
	day   TEXT    NOT NULL,
	kind  TEXT    NOT NULL,
	bot   TEXT    NOT NULL,
	page  TEXT    NOT NULL,
	reads INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, kind, bot, page)
);

CREATE INDEX IF NOT EXISTS reads_crawlers_bot ON reads_crawlers (kind, bot);
