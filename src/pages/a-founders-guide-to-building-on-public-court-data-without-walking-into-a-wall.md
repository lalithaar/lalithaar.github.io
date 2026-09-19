---
title: "The Legal-Tech Playbook if you are building in India"
description: "A founder's guide to building on public court data without walking into a wall This is for anyone building a product that takes public legal/court data and turns it into something structured, searchable, or scored — case outcome trackers, lawyer directories, litigation analytics, judge/bench insight"
layout: ../layouts/Layout.astro
---

### A founder's guide to building on public court data without walking into a wall

This is for anyone building a product that takes public legal/court data and turns it into something structured, searchable, or scored — case outcome trackers, lawyer directories, litigation analytics, judge/bench insight tools, anything in that space.

None of this is legal advice. It's a map of where other people have already hit trouble, built from real court cases and real laws, so you can make informed product decisions instead of finding out the hard way.


### The One-Paragraph Version

Public court data is genuinely public — you're usually allowed to use it. The trouble doesn't come from having the data. It comes from three specific things you do to it: attributing it to a named individual, scoring/ranking that individual, and making the tool commercial and queryable rather than a one-off publication. Every real-world legal fight in this space has been about one or more of those three things, not about the underlying data being off-limits.



### Part 1: The Core Pattern — Four Risk Tiers

Any feature in this space falls into one of four tiers. This is the single most useful mental model for the whole playbook — use it every time you're deciding whether to ship a feature.

### Tier 1 — Aggregate, no names. Lowest risk.

Stats about a court, forum, or case type as a whole. "32.8% of commercial cases in this jurisdiction settle." "Average time to disposal: 3.1 years." No individual — lawyer, litigant, or judge — is named or identifiable.

This is close to what courts and government bodies already publish themselves (India's National Judicial Data Grid is a working example). It's the safest place to build, and it's still useful — most "how long will my case take" or "what's typical here" questions can be answered at this level without ever naming anyone.

### Tier 2 — Named, but descriptive not evaluative. Moderate risk.

A named professional's public record, presented as facts: "has appeared in 243 matters in this court since 2018, primarily commercial disputes." No score, no grade, no ranking — just a factual summary sourced from the public record.

This is the "Avvo" model (a real US legal-directory company): they show credentials, case history, and disciplinary record, but explicitly do not score actual case outcomes. That one design choice is most of what keeps them out of the legal trouble their more aggressive competitors ran into.

### Tier 3 — Named individual, given a score. High risk.

"Lawyer X — 77% success rate." A real professional, publicly named, assigned an evaluative grade built from their case history, sold as a product feature — without their input or consent.

This is the exact model that got a real US company ([Lawyer.com](https://www.linkedin.com/redir/redirect?url=http%3A%2F%2FLawyer%2Ecom&urlhash=M8HE&trk=article-ssr-frontend-pulse_little-text-block)) hit with a privacy class-action lawsuit. The complaint wasn't about the accuracy of the underlying case data — it was about a company building and monetizing an unconsented public grade of someone's professional reputation. Non-paying subscribers reportedly scored worse than paying ones, which made it worse, but the core objection stands even without that.

### Tier 4 — Judge/bench-specific behavioral patterns. Highest risk.

Any feature that lets a user infer how a specific judge tends to rule — grant rates, favorability by case type, patterns by category of party or petitioner — even if you never show a number next to the judge's name directly.

This is the one real, documented case of an outright ban. France made this a criminal offense in 2019, specifically in response to a legal-tech tool that had surfaced uncomfortable patterns in how certain judges ruled on asylum cases. The reasoning the French courts gave when upholding the ban: this kind of tool lets lawyers "judge-shop," and that undermines the fairness of the system itself.

Important nuance on Tier 4: the ban wasn't really about the display of a judge's name next to a score. It was about the capability to reconstruct that pattern at all. If a user can filter lawyer win-rates by judge, and flip through a few judges comparing the numbers, they've built the judge's profile themselves — you don't need to have rendered it directly for the underlying problem to exist. This is the subtlest and most important thing to get right in this entire playbook.



### Part 2: Why the Same Data Can Be Safe or Risky Depending on Framing

This is a real trap: the exact same underlying capability can be low-risk or high-risk purely based on how it's used, not what data is behind it.

A one-off, editorially-authored, non-monetized published article that says "this court has been notably fast and favorable toward a certain category of petitioner" is Tier 1 — a forum-level finding, made once, for public-interest reasons, not sold as a product. Journalism and research get treated differently from commercial products under most privacy frameworks, precisely because of this distinction.


The same underlying dataset, sitting inside a persistent, paid, filterable product that lets any subscriber run that same query against any judge on demand, indefinitely — that's Tier 4. The data didn't change. The delivery mechanism did, and that's what moved the risk.

Practical takeaway: don't assume that because a similar-sounding analysis has been published somewhere safely, your product version of it is equally safe. Ask what made the safe version safe — usually it's one-time-ness, non-commercial framing, and aggregation level, not the topic itself.



### Part 3: The Legal Precedents, Plain-English

These are the actual cases and laws behind the tiers above. Useful to know by name if this ever comes up with a lawyer, investor, or regulator.

### Google Spain v. AEPD (2014) — where "right to be forgotten" started

A person wanted an old article about them de-listed from search results for their name. The court agreed: search engines have to stop surfacing certain links on name searches if asked, even though the original article stays published and legal. Critically — this is about hiding a search result, not deleting the underlying record. That "de-index, don't delete" distinction is now the standard remedy almost everywhere this issue comes up, including in newer rulings outside the EU.

### Google v. CNIL (2019) — how far de-listing has to reach

France's regulator wanted Google to de-list globally, not just in the EU. The EU's top court said no — de-listing only has to apply within the EU, though individual countries can still push for wider removal under their own laws if they choose to. The lesson: "right to be forgotten" remedies tend to stay geographically and technically narrow (name search only) even when the underlying privacy right is treated seriously.

### France's judge-analytics ban (2019) — the Tier 4 precedent

Explained above. The specific trigger was a legal-tech tool exposing a pattern in one category of judicial decisions that became publicly uncomfortable. The government responded with a criminal ban on reusing judge-identifiable data to evaluate, compare, or predict judicial behavior. This remains the single most direct precedent for anything resembling "search by judge" or "compare outcomes across judges" in a legal-tech product.

### GDPR's "purpose limitation" principle — the general EU argument against repurposing

If data was made public for one reason (court transparency, accountability), reusing it for an unrelated reason (a commercial ranking product) isn't automatically fine just because the data itself is public. There has to be a reasonable link between the original purpose and the new one. This is a general principle, not a single case, but it's the doctrinal backbone behind a lot of the more specific rulings above — and it shows up in most modern data protection laws in some form, not just the EU's.

### Lawyer.com vs. Avvo — the two real-world models, US

Covered under Tier 3 above. Worth remembering as a pair: [Lawyer.com](https://www.linkedin.com/redir/redirect?url=http%3A%2F%2FLawyer%2Ecom&urlhash=M8HE&trk=article-ssr-frontend-pulse_little-text-block) scored outcomes and got sued; Avvo stuck to credentials/background and didn't. If you're building a lawyer directory or ranking feature, this pair is the cleanest real-world A/B test of where the line tends to sit.

### "Public data" exemptions in privacy law — the trap founders miss

Many data protection laws (India's DPDP Act is one clear example) exempt data that's already legally public from most of the law's requirements. This can look, at first read, like a green light for any product built on public court records. The gap: these exemptions are usually about the original publisher's obligation to make the data public — they don't automatically say anything about what a third party can then build on top of it commercially. Whether the exemption "travels downstream" to a commercial repackaging product is often untested and unresolved. Don't treat a public-data exemption as a blanket license — treat it as covering your sourcing, not necessarily your product.



### Part 4: A Working Checklist for Product Decisions

Use this when you're deciding whether to ship a feature, not just when you're worried about it.

- [ ] Does this feature name a specific individual? If no, you're in Tier 1 — lowest friction, build freely.
- [ ] If it names someone, does it assign them a score, grade, or ranking — or just state facts? Facts-only is meaningfully safer (Tier 2 vs Tier 3). If you're building a score, know that you're choosing the higher-risk path deliberately, and know why.
- [ ] Can a user reconstruct judge-specific patterns from this feature, even indirectly? This includes filter combinations that let someone diff results across judges, not just a feature that displays a judge's name directly. This is the single highest-risk pattern across every precedent above — treat it as a distinct design review, separate from the general "is this feature risky" question.
- [ ] Is this feature a one-time output (a report, a published finding) or a persistent, queryable, monetized capability? The same underlying analysis is safer as the former than the latter. If you're building a standing product, you don't get the "it was just one article" defense that protects a lot of legitimate legal journalism and research.
- [ ] Does your data model support judge-level attribution at all, even if the UI doesn't currently expose it? If judge identity is a joinable field against individual outcomes anywhere in your system — UI, export, API — the risk exists structurally, independent of what you've chosen to display today. This is worth fixing at the data-model level, not just the UI level.
- [ ] Is there a sensitive-subject-matter overlap? Filtering by judge and by a sensitive case category (family law, matrimonial disputes, sexual offences, immigration/asylum-adjacent matters, similar) compounds risk — this is closer to the actual French precedent than a general commercial-litigation win-rate feature would be. Treat this combination as a hard stop until you've thought it through separately.
- [ ] Do you have a process for takedown/removal requests before you need one? "Right to be forgotten"-style rulings are landing in multiple jurisdictions now, and they specifically target name-based search of public records — exactly the category most legal-tech products live in. Having no policy is itself a risk; build the request-handling flow before your first request arrives, not after.
- [ ] If challenged, is your public-data legal basis about your sourcing or about your product? Be honest with yourself about whether your legal footing (e.g., a public-data exemption) actually covers what you've built, or just covers where the raw data came from. These are not the same question, and conflating them is the most common founder mistake in this space.



### Part 5: The Short Version, If You Only Remember One Thing

Aggregate data is safe. Named-but-descriptive is mostly fine. Named-and-scored is a real, litigated risk category. Judge-specific inference — even indirect, even unintentional — is the one thing that has already gotten an entire category of tool banned somewhere in the world.

Design your data model and your UI filters with that gradient in mind from day one. It's much cheaper to build the boundary in now than to retrofit it after a judge, a bar council, or a regulator notices.


---

This was written in context w.r.t [#August 2026](/timeline#august-2026)