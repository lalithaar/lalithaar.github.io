-- Daily write budget for the pixel endpoint.
--
-- D1 free tier allows 100k rows written per day, and going over does not
-- degrade gracefully: the whole database stops answering queries, which takes
-- the local dashboard down with it until the 00:00 UTC reset. The endpoint is
-- unauthenticated, so a loop against /px.gif is enough to trigger that.
--
-- One row per UTC day, holding the number of hits accepted so far. The Worker
-- reads it before writing and skips the write once the day's ceiling is hit,
-- so over-budget traffic costs a row read rather than four row writes. Reads
-- have 50x the headroom (5M/day), which is what makes that trade worthwhile.
--
-- This table holds no reader data - just a day and a counter.
CREATE TABLE IF NOT EXISTS write_budget (
	day TEXT PRIMARY KEY,
	hits INTEGER NOT NULL DEFAULT 0
);
