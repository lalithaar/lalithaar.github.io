-- reads_crawlers gains `ref` in its key and reads_env gains `country`.
--
-- Both are rebuilds rather than ADD COLUMN because the new value has to be part
-- of the primary key. Two AI fetches of the same page can arrive from different
-- referrers, and ai-user traffic (ChatGPT-User and friends) is precisely where
-- the referrer carries the most signal. Without ref in the key, the first
-- referrer to land would stick and the rest would be silently miscounted.

CREATE TABLE reads_crawlers_next (
	day   TEXT    NOT NULL,
	kind  TEXT    NOT NULL,
	bot   TEXT    NOT NULL,
	page  TEXT    NOT NULL,
	ref   TEXT    NOT NULL,
	reads INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, kind, bot, page, ref)
);

INSERT INTO reads_crawlers_next (day, kind, bot, page, ref, reads)
	SELECT day, kind, bot, page, '', reads FROM reads_crawlers;

DROP TABLE reads_crawlers;
ALTER TABLE reads_crawlers_next RENAME TO reads_crawlers;

CREATE INDEX reads_crawlers_bot ON reads_crawlers (kind, bot);
CREATE INDEX reads_crawlers_ref ON reads_crawlers (ref);

CREATE TABLE reads_env_next (
	day     TEXT    NOT NULL,
	country TEXT    NOT NULL,
	os      TEXT    NOT NULL,
	browser TEXT    NOT NULL,
	region  TEXT    NOT NULL,
	humans  INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, country, os, browser, region)
);

INSERT INTO reads_env_next (day, country, os, browser, region, humans)
	SELECT day, '', os, browser, region, humans FROM reads_env;

DROP TABLE reads_env;
ALTER TABLE reads_env_next RENAME TO reads_env;
