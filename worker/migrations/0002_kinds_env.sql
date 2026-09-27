CREATE TABLE IF NOT EXISTS reads_kinds (
	day   TEXT    NOT NULL,
	kind  TEXT    NOT NULL,
	reads INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, kind)
);

CREATE INDEX IF NOT EXISTS reads_kinds_kind ON reads_kinds (kind);

CREATE TABLE IF NOT EXISTS reads_env (
	day     TEXT    NOT NULL,
	os      TEXT    NOT NULL,
	browser TEXT    NOT NULL,
	region  TEXT    NOT NULL,
	humans  INTEGER NOT NULL DEFAULT 0,
	PRIMARY KEY (day, os, browser, region)
);
