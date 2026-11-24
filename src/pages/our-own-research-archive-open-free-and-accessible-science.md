---
title: "Our Own Research Archive - Open, free and accessible science"
layout: ../layouts/LayoutFund.astro
---


# Our Own Research Archive - Open, free and accessible science

*500 foundational works across subjects released as responsive HTML, an open source golang framework that just works, and infra that maintains itself further*

![oora](../attachments/oora-1.png)
![oora](../attachments/oora-2.png)
![oora](../attachments/oora-3.png)


<style>
  .fw-widget {
    margin: 2rem 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: inherit;
    line-height: 1.4;
  }
  .fw-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem 1rem;
    margin-bottom: 1rem;
  }
  .fw-total {
    font-size: 1.25rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .fw-total-goal {
    font-size: 0.95rem;
    font-weight: 500;
    opacity: 0.8;
  }
  .fw-gate-pill {
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.25rem 0.65rem;
    border-radius: 6px;
    border: 1.5px solid currentColor;
  }
  .fw-track-wrap {
    position: relative;
    padding-top: 3.1rem;
  }
  .fw-marker {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    pointer-events: none;
  }
  .fw-marker-label {
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.2;
    white-space: nowrap;
  }
  .fw-marker-sub {
    font-size: 0.75rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    opacity: 0.85;
  }
  .fw-tick {
    width: 2px;
    height: 10px;
    background: currentColor;
    opacity: 0.65;
    margin-top: 3px;
  }
  .fw-bar-outer {
    display: flex;
    width: 100%;
    height: 26px;
    gap: 4px;
  }
  .fw-bucket {
    position: relative;
    height: 100%;
    overflow: hidden;
    background: var(--bucket-tint);
    border: 1.5px solid var(--bucket-color);
    border-radius: 4px;
    box-sizing: border-box;
  }
  .fw-bucket:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  .fw-bucket:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
  .fw-bucket-fill {
    height: 100%;
    background: var(--bucket-color);
  }
  .fw-bucket-fill[data-queued="true"] {
    background-image: repeating-linear-gradient(
      -45deg,
      var(--bucket-color),
      var(--bucket-color) 6px,
      rgba(255, 255, 255, 0.35) 6px,
      rgba(255, 255, 255, 0.35) 12px
    );
  }
  .fw-scale {
    display: flex;
    justify-content: space-between;
    font-size: 0.8125rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    margin-top: 0.5rem;
    opacity: 0.85;
  }
  .fw-legend {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem 1.25rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1.5px solid rgba(128, 128, 128, 0.3);
  }
  .fw-legend-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 0.65rem;
    border: 1px solid rgba(128, 128, 128, 0.3);
    border-radius: 6px;
  }
  .fw-legend-left {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
  }
  .fw-dot {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    flex-shrink: 0;
  }
  .fw-legend-name {
    font-size: 0.9375rem;
    font-weight: 600;
  }
  .fw-legend-meta {
    display: inline-flex;
    align-items: center;
    gap: 0.55rem;
    flex-shrink: 0;
  }
  .fw-legend-val {
    font-size: 0.875rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .fw-badge {
    font-size: 0.75rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid currentColor;
    white-space: nowrap;
  }
  @media (max-width: 640px) {
    .fw-legend {
      grid-template-columns: 1fr;
    }
    .fw-marker-label {
      font-size: 0.75rem;
    }
    .fw-marker-sub {
      font-size: 0.6875rem;
    }
  }
</style>

<div class="fw-widget" role="region" aria-label="Funding Progress">
  <div class="fw-header">
    <div>
      <span class="fw-total">₹0</span>
      <span class="fw-total-goal">/ ₹5,00,000 backed</span>
    </div>
    <span class="fw-gate-pill">Base Gate: Stipend (₹0 / ₹2.5L)</span>
  </div>
  <div class="fw-track-wrap">
    <div class="fw-marker" style="left: 50%;">
      <span class="fw-marker-label">Stipend</span>
      <span class="fw-marker-sub">₹2.5L</span>
      <div class="fw-tick"></div>
    </div>
    <div class="fw-marker" style="left: 60%;">
      <span class="fw-marker-label">Infra</span>
      <span class="fw-marker-sub">₹3L</span>
      <div class="fw-tick"></div>
    </div>
    <div class="fw-marker" style="left: 80%;">
      <span class="fw-marker-label">APIs</span>
      <span class="fw-marker-sub">₹4L</span>
      <div class="fw-tick"></div>
    </div>
    <div class="fw-bar-outer" role="progressbar" aria-valuemin="0" aria-valuemax="500000" aria-valuenow="0" aria-label="Total backed funding out of 5 Lakh INR across 4 buckets">
      <div class="fw-bucket" style="width: 50%; --bucket-color: #4f46e5; --bucket-tint: rgba(79, 70, 229, 0.22);" title="Stipend (Base Gate): ₹0 / ₹2.5L">
        <div class="fw-bucket-fill" style="width: 0%;"></div>
      </div>
      <div class="fw-bucket" style="width: 10%; --bucket-color: #db2777; --bucket-tint: rgba(219, 39, 119, 0.22);" title="Server &amp; Tooling: ₹0 / ₹50k">
        <div class="fw-bucket-fill" style="width: 0%;"></div>
      </div>
      <div class="fw-bucket" style="width: 20%; --bucket-color: #059669; --bucket-tint: rgba(5, 150, 105, 0.22);" title="API Credits: ₹0 / ₹1L">
        <div class="fw-bucket-fill" style="width: 0%;"></div>
      </div>
      <div class="fw-bucket" style="width: 20%; --bucket-color: #d97706; --bucket-tint: rgba(217, 119, 6, 0.22);" title="Hardware: ₹0 / ₹1L">
        <div class="fw-bucket-fill" style="width: 0%;"></div>
      </div>
    </div>
    <div class="fw-scale">
      <span>₹0</span>
      <span>₹5,00,000 Goal</span>
    </div>
  </div>
  <div class="fw-legend">
    <div class="fw-legend-item">
      <span class="fw-legend-left">
        <span class="fw-dot" style="background: #4f46e5;"></span>
        <span class="fw-legend-name">1. Stipend</span>
      </span>
      <span class="fw-legend-meta">
        <span class="fw-legend-val">₹0 / ₹2.5L</span>
        <span class="fw-badge">Base Gate</span>
      </span>
    </div>
    <div class="fw-legend-item">
      <span class="fw-legend-left">
        <span class="fw-dot" style="background: #db2777;"></span>
        <span class="fw-legend-name">2. Server &amp; Tooling</span>
      </span>
      <span class="fw-legend-meta">
        <span class="fw-legend-val">₹0 / ₹50k</span>
        <span class="fw-badge">Open</span>
      </span>
    </div>
    <div class="fw-legend-item">
      <span class="fw-legend-left">
        <span class="fw-dot" style="background: #059669;"></span>
        <span class="fw-legend-name">3. API Credits</span>
      </span>
      <span class="fw-legend-meta">
        <span class="fw-legend-val">₹0 / ₹1L</span>
        <span class="fw-badge">Open</span>
      </span>
    </div>
    <div class="fw-legend-item">
      <span class="fw-legend-left">
        <span class="fw-dot" style="background: #d97706;"></span>
        <span class="fw-legend-name">4. Hardware</span>
      </span>
      <span class="fw-legend-meta">
        <span class="fw-legend-val">₹0 / ₹1L</span>
        <span class="fw-badge">Open</span>
      </span>
    </div>
  </div>
</div>

## Project summary

In 3rd century BCE, there goes the legend of a scholar who stared in the eyes of the lord to say "A flaw is a flaw, even if you open your third eye," calling out a factual error even if you are the god. While the king stands perplexed between bowing to the lord, but not daring the scholar to calm down.

![oora](../attachments/oora-4.png)

The scholars were never the ones to bow down to anything. Journals were meant as a curated collections with the particular vision, for easier reading and follow through.

But today:
- Public tax and grants fund the research work
- Researchers do research on their subject and create breakthroughs
- Researchers then spend months in the submission cycle for every single journal they want to attempt to, because you cannot publish one paper to be included in two journals (Imagine if someone said one song can only be in person's playlist and no other?)
- Other researchers spend their time reviewing the draft for free
- They tell you, your work is accepted to their journal
- So after doing the work, you also pay in thousands of dollars to sign over your copyright, you bundle it into 2 column 8pt layout that got it's culture from 17th century when you had to save space, except it's digital now and still hasn't changed after centuries. 
- Your institution either pays millions of dollars to read and access the work they funded.
- Oh you want it without a subscription? Pay $48 for 24 hours access to this specific article. For the work your fellow colleague did.

and that's assuming your paper fits that specific human committee's vision of what the field should read. 

If your paper is slightly outside of any of the conditions laid out even if it's world changing? Nope for journals. If it's Math/CS/.., you could probably try Arxiv. But any moment it fails to be captured in just 2-3 fields because it applies methods used in one field, theory of another, and experimenting routines of 3rd (even if it's how the best discoveries and inventions are made) ? Nope.

That's what academic journal wheel tells everyone. 

What do you do? Dump it as a pdf in a format that's expected into any of the servers that serve PDF, and let's not even start about their discoverability.

Back in mid to late 2000's, fan made stories also called fanfictions, were forming a community. You write and submit it to fanfiction.net or similar app, guess what they did? deleted thousands of works overnight without notice of what they considered as bad or good, deleted any works that could offend the advertisers, and thousands of fans lost hundreds of thousands of words of writing. It's either their curated collection, which holds every right over your life's work and can delete them at whim

...sounds eerily familiar? Yup, same problem as current research distribution.

Guess what they did? Fans came together to create "Archive of our own" (AO3) - a non profit, non commercial archive by and for fans to host their works without the overlords, with one goal:

Make a work findable to someone to who wants it by...letting them search for it. Yes, not a fancy algorithm, but literally lets you do

**Fandom: Harry potter, Lord of rings**\
**Include: Time travel, Chamber of Secrets**\
**Exclude: Mature Scenes**

Oh yes,

**Field: Biotechnology, Biology**\
**Include: Protein Folds, Negative Results**\
**Exclude: Survey Papers**

See? It's been 17 years that day, and now has hosted over 18.4 million works. You get it. (If you don't it's okay, please feel free to drop your doubts in comments and I will be happy to explain : )

## What are this project's goals? How will you achieve them?

The codebase of AO3 is open source. But it was built in 2008-09 when Ruby on Rails were the gold standard for web frameworks, and we have come a long way since then.

Adopting a system is taking the best parts of it (architecture) and leaving the baggage that comes with that history (Ruby, Elastic search is an absolute hoarder), and implementing it through what's gold standard today.

Everything in rust would give the best performance, but not so much in long term maintenance. So, we are going with golang - accessible enough language for the community to learn but performant enough for sustainability.   

There comes our goals in the long term:
- Full feature parity (as appropriate, leaving out fandom specific quirks) golang port becomes OORA - Our Own Research Archive
- A server side rendering golang framework strong enough to hold the logic of AO3, also open sourced for the wider community, so it's useful beyond this immediate project. (See cozy-mug for current progress) to support projects built in resource constrained environments, so you don't have to choose between performance, accessibility, and minimal resource usage.
- Allow researchers; to post their works freely, write in markdown, HTML first with PDF Download support, built in search engine optimization, along with choice to consent to AI reading it vs training in it.
- Release foundational works across the fields in the same format to make science accessible, even if retrospectively. Further funds will help increase the coverage of these works in CC by or public domains.
- Give back journal curation to scholars. Anyone with their team can form a thesis to create a journal on, and community kudos support it.
- Researchers wake up to kudos and bookmarks of their works, rather than just 1-2 citations now and then.
You may ask, but Lalitha how are you even going to scrape and format all those papers? I plan to expand upon the CAAS framework (Constrained AI-Assisted Sampling for Fragmented Textual Spaces: https://isrl-research.github.io/pub/2026-04-m-caas/) I used to tackle the last project (also converged with Google Research independently on global flood data.)  for agentic workflows, 

But grounding it through taxonomy, and guidelines that's not just mark down files, so it doesn't go into existential crisis over a single confusion that could have been resolved with a single yes or no from the user, thereby wasting tons of tokens.

<style>
  .fw-follow {
    margin: 1.5rem 0;
    padding: 1.25rem;
    border: 1px solid rgba(128, 128, 128, 0.3);
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.04);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: inherit;
    line-height: 1.5;
  }
  .fw-follow-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.25rem 1rem;
    margin-bottom: 0.75rem;
  }
  .fw-follow-title {
    font-size: 1rem;
    font-weight: 700;
    margin: 0;
  }
  .fw-follow-sub {
    font-size: 0.875rem;
    opacity: 0.8;
    margin: 0;
  }
  .fw-follow-form {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: stretch;
  }
  .fw-follow-input {
    flex: 1 1 240px;
    min-width: 0;
    padding: 0.55rem 0.75rem;
    font-size: 0.9375rem;
    font-family: inherit;
    color: inherit;
    background: transparent;
    border: 1.5px solid rgba(128, 128, 128, 0.45);
    border-radius: 6px;
  }
  .fw-follow-input:focus {
    outline: 2px solid currentColor;
    outline-offset: 1px;
  }
  .fw-follow-btn {
    padding: 0.55rem 1rem;
    font-size: 0.875rem;
    font-weight: 700;
    font-family: inherit;
    color: inherit;
    background: transparent;
    border: 1.5px solid currentColor;
    border-radius: 6px;
    cursor: pointer;
    white-space: nowrap;
  }
  .fw-follow-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .fw-follow-status {
    font-size: 0.8125rem;
    font-weight: 600;
    margin: 0.6rem 0 0 0;
    min-height: 1.2em;
  }
</style>

<div class="fw-follow" role="region" aria-label="Follow progress by email">
  <div class="fw-follow-header">
    <h3 class="fw-follow-title">Follow the build by email</h3>
    <p class="fw-follow-sub">Occasional updates when milestones ship — no spam.</p>
  </div>
  <form class="fw-follow-form" id="fw-follow-form">
    <label for="fw-follow-email" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);">Email address</label>
    <input class="fw-follow-input" id="fw-follow-email" type="email" name="email" placeholder="you@domain.com" required autocomplete="email" />
    <button class="fw-follow-btn" id="fw-follow-btn" type="submit">Follow Updates</button>
  </form>
  <p class="fw-follow-status" id="fw-follow-status" aria-live="polite"></p>
</div>

<script>
  (() => {
    const GOOGLE_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSdQXGAUGeMyVR3xvBJvW1G6OKSuTevviFZlDRut1F3-Msq8Qw/formResponse";
    const form = document.getElementById("fw-follow-form");
    const input = document.getElementById("fw-follow-email");
    const btn = document.getElementById("fw-follow-btn");
    const status = document.getElementById("fw-follow-status");

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = input.value.trim();
      if (!email) return;

      btn.disabled = true;
      btn.textContent = "Adding...";
      status.textContent = "";

      try {
        const body = new URLSearchParams({
          "entry.309804683": email,
        });

        await fetch(GOOGLE_FORM_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        input.value = "";
        status.textContent = "Added — you'll get updates when milestones ship.";
      } catch (err) {
        status.textContent = "Couldn't submit right now. Try again in a moment.";
      } finally {
        btn.disabled = false;
        btn.textContent = "Follow Updates";
      }
    });
  })();
</script>

## How will you know it worked?

- Golang framework developed enough for alpha
- 500 foundational papers in accessible HTML, indexed in google.

**Here's the deal**, I know it is only the best case that everyone finds their place and it becomes the new standard, I know the probability is low.

**But here's the worst case:** 500+ foundational works across subject matters turned into fully accessible responsive html that can be indexed in google, and filtered by exactly what you want to look for. An SSR framework in golang that is strong enough to host the scale - open sourced so people working in resource constrained environments can whip up a project 0-1 without sacrificing the performance go language offers. A free space for people to host their works, and each funding bringing down the costs needed to add further papers compounding down.

## How will this funding be used?

Total to get it running: ₹5,00,000 (~$5,400) (brought down from ~$8,500 as shown in manifund)

**Capex:**
- ₹1,00,000 for hardware (Marker PDF, core library needed for this work needs better hardware) 
- ₹50,000 (~$500) for server (Looking into Hetzner CAX21), image processing, backups and deployment.

**Opex:** ₹1,00,000 for AI credits across parsing, typesetting, taxonomy work, etc.

**Stipend & Tax Buffer:** ₹2,50,000 (~\$2,900) for working on processing, overseeing, engineering, along with taxonomy classification and design. I previously listed this as \$6,000, but I do not wish for this to be a blocker to this work as it stemmed from something I believe in.


I also accounted for the 10% TDS buffer and kept hard expenses at or below 48% for Section 44ADA so the project doesn’t become unsustainable from running short on cash or paying out of pocket.

**This will enable:**

- Release 500 foundational works across subjects in responsive HTML in the web instead of it being stuck in PDF's.
- Give researchers a place to publish their works with proper in site search, along with SEO built in. They don't have to worry about formatting and can write in markdown. Control over whether it can be cited by AI, and also if it can be used for training purposes (through `robots.txt` support per work).
- Running server for 2 years to ensure the work remains active. 
- Covers core Capital expenditures, so every further fund focuses on Operational expenditures and releasing more and more papers.
- Alpha Release of SSR Golang framework that just works.

**Past the initial 5 lakhs, every ₹ from here on:** split between stipend and AI credits.

**This will enable:**
- Support further development of the go lang framework
- Maintenance and support for OORA application
- Research, catalogue and discover more works with open licenses
- Produce OORA versions of the works
- Support proper tagging, and tag wrangling of the new works added.
- Estimated 300 works per month.
- Further development of the architecture/pipeline used in this process to reduce costs per paper the more papers we add.

## How can I support this?

Right now, direct financial backing and introductions to people who back independent open work are what move the needle most. If you're not in a position to back it financially, sharing the page with someone who might be is just as useful. Email replies typically take a few hours during this build phase, and the progress bar updates within 24 hours of any transfer.


<style>
  .fw-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin: 1.5rem 0;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: inherit;
    line-height: 1.5;
  }
  .fw-card {
    display: flex;
    flex-direction: column;
    padding: 1.25rem;
    border: 1px solid rgba(128, 128, 128, 0.3);
    border-radius: 6px;
    background: rgba(128, 128, 128, 0.04);
  }
  .fw-card-kicker {
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: 0.7;
    margin-bottom: 0.35rem;
  }
  .fw-card-title {
    font-size: 1.125rem;
    font-weight: 700;
    margin: 0 0 0.85rem 0;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(128, 128, 128, 0.25);
  }
  .fw-card-body {
    font-size: 0.9375rem;
    margin: 0 0 1rem 0;
  }
  .fw-card-qr {
    width: 140px;
    height: 140px;
    border-radius: 6px;
    border: 1px solid rgba(128, 128, 128, 0.3);
    background: #ffffff;
    padding: 6px;
    margin-bottom: 1rem;
    object-fit: contain;
  }
  .fw-card-meta {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .fw-card-field-label {
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    opacity: 0.7;
  }
  .fw-card-mono {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.875rem;
    font-weight: 600;
    word-break: break-all;
  }
  .fw-card-foot {
    font-size: 0.8125rem;
    opacity: 0.8;
    margin: 0.5rem 0 0 0;
  }
  .fw-card-btn {
    display: inline-block;
    text-align: center;
    padding: 0.55rem 0.9rem;
    font-size: 0.875rem;
    font-weight: 700;
    text-decoration: none;
    color: inherit;
    border: 1.5px solid currentColor;
    border-radius: 6px;
  }
  @media (max-width: 820px) {
    .fw-cards {
      grid-template-columns: 1fr;
    }
  }
</style>

<div class="fw-cards">
  <div class="fw-card">
    <span class="fw-card-kicker">UPI · India</span>
    <h3 class="fw-card-title">Back OORA via UPI</h3>
    <p class="fw-card-body">Zero platform fees — everything goes straight into the work.</p>
    <img src="data:image/png;base64,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" alt="UPI QR code for isrl-res@ptyes" class="fw-card-qr">
    <div class="fw-card-meta">
      <div>
        <div class="fw-card-field-label">UPI ID</div>
        <div class="fw-card-mono">isrl-res@ptyes</div>
      </div>
    </div>
  </div>
<div class="fw-card">
    <span class="fw-card-kicker">NEFT / IMPS · India</span>
    <h3 class="fw-card-title">Direct Bank Transfer</h3>
    <p class="fw-card-body">Prefer regular bank transfer or coordinating a larger bucket transfer / TDS note? Drop a quick email and I'll reply with the account details.</p>
    <div class="fw-card-meta">
      <a class="fw-card-btn" href="mailto:lalithaar.research@gmail.com?subject=Bank%20details%20for%20OORA">Request Bank Details →</a>
    </div>
  </div>
  <div class="fw-card">
    <span class="fw-card-kicker">GitHub Sponsors</span>
    <h3 class="fw-card-title">Sponsor on GitHub</h3>
    <p class="fw-card-body">For backers outside India or teams already set up on GitHub billing.</p>
    <div class="fw-card-meta">
      <a class="fw-card-btn" href="https://github.com/sponsors/YOUR-HANDLE" target="_blank" rel="noopener noreferrer">Open GitHub Sponsors →</a>
    </div>
  </div>
</div>

## Who is on your team? What's your track record on similar projects?

I will be working on this solo, while consulting Subject Matter Experts for any doubts that may arise during tag creations in the respective fields. 

In the last year, I led an [open research lab](https://isrl.in/pausing-isrl-respecting-the-work-supporters-and-oneself/). It started with a computer saying instant noodles is healthier than rice and as an advocate for non violence, I didn't want it to be beaten by every grandma in the area. So I went down a 9 month rabbit hole that produced 9 works, all open source with 3,813 reads, 1,780 downloads,

It was process open, not just outputs. 

Developed the E-M-F Tri-Axial Model for ingredient identity, transformation, and function: a method informed by S. R. Ranganathan's Colon Classification, a century of Supreme Court precedents, ITC-HSN codes, and FSSAI rulesets.

It is the first method to apply NOVA processing deterministically at the ingredient level, trained undergraduate researchers to move from basic research practice to multi-jurisdiction legal analysis in four weeks.

We produced an [allergen](https://github.com/orgs/isrl-research/discussions/4) report that compared the regulations regarding food allergens across 5 jurisdictions along with reconciling it with what the medical literature said.

It was reviewed by an expert who spent his career on studying food allergens in India, and his comment was “It has come out well. Very few comments”.

We planned to submit the work to a journal but also push it to a preprint server. Then came the task that was tougher than producing the work itself: finding a journal.

No, this didn't have a generalised global report because the problem at hand was for India. Submitting it to a global journal meant toning down everything that was India specific about it, that is trying to pose infant food as adult food and vice versa.

We tried Indian journals, but all of them meant we must not push it to an open server or internet at any level and must be in their format however inaccessible.

I paused the project few months later to protect the integrity of the work, because despite all the work, the first doubt wasn’t about a methodology we used, or how it can be generalized, but rather that of the legitimacy of the work and which huge institution is doing the work to deserve/receive support and funding.

The second doubt was, why is it not published in an international Q1 journal (Even if that would mean watering down the reports to fit the journal’s vision and to generalize it so it’s not ‘only for India’ but widely applicable. In a work, that is specifically for India.)

That was an open question I had in mind since then, where is the space for works that don't fit the specific academic silo a particular journal expects? That publishing a non silo'd work in the open without paying $8000 shouldn't mean the work being inaccessible, un-indexed, skepticism at every stance instead of rational judgement of the work.

Few months later is when I got a direction on how we can tackle this, cue OORA.

## What are the most likely causes and outcomes if this project fails?

- Agentic workflows not being strong enough to cleanly port the papers, but we still have the fallback of existing agentic system even if the experiment to bring down the costs fail
- Feature bloat. I plan to tackle this by only adding the core features needed for it to be functional, and nothing more. AO3's codebase will also help me anchor this in the heuristic.

## How much money have you raised in the last 12 months, and from where?

It was a microgrant of ₹50K to cover a component of the work done by the open lab I said about, from FOSS United Foundation through Nagarathna Memorial Grant.


## FAQ

1. **What do you mean by ₹2.5L being a gate?**\
   The compute and hardware will not be useful immediately unless I have the capacity locked in to work on this in time and effort.
2. **Why this project?**\
   I am familiar with underlying components of this seperately: data aggregation and classification using AI, how research publishing happens, golang and it's library ecosystem, and python. So that makes it clean enough to execute, but still challenging enough for it to be fascinating.
3. **Why not instituional grants that pay far more?**\
   Because I want this to be deployed in near-future, and not a decade later after all the committe discussions and bureaucracy trap.