## Project summary

Here's the worst case: 500+ foundational works across subject matters turned into fully accessible responsive html that can be indexed in google, and filtered by exactly what you want to look for. An SSR framework in golang that is strong enough to host the scale - open sourced so people working in resource constrained environments can whip up a project 0-1 without sacrificing the performance go language offers. A free space for people to host their works, and each funding bringing down the costs needed to add further papers compounding down.

***

In 3rd century BCE, there goes the legend of a scholar who stared in the eyes of the lord to say "A flaw is a flaw, even if you open your third eye," calling out a factual error even if you are the god. While the king stands perplexed between bowing to the lord, but not daring the scholar to calm down.

The scholars were never the ones to bow down to anything. Journals were meant as a curated collections with the particular vision, for easier reading and follow through.

But today:
- Public tax and grants fund the research work
- Researchers do research on their subject and create breakthroughs
- Researchers then spend months in the submission cycle for every single journal they want to attempt to, because you cannot publish one paper to be included in two journals (Imagine if someone said one song can only be in person's playlist and no other?)
- Other researchers spend their time reviewing the draft for free
- They tell you, your work is accepted to their journal
- So after doing the work, you also pay in thousands of dollars to sign over your copyright, you bundle it into 2 column 8pt layout that got it's culture from 17th century when you had to save space, except it's digital now and still hasn't changed after centuries. 
- Your institution either pays millions of dollars to read and access the work they funded.
- Oh you want it without a subscription? Pay 48 for 24 hours access to this specific article. For the work your fellow colleague did.

and that's assuming your paper fits that specific human committee's vision of what the field should read. 

If your paper is slightly outside of any of the conditions laid out even if it's world changing? Nope for journals. If it's Math/CS/.., you could probably try Arxiv. But any moment it fails to be captured in just 2-3 fields because it applies methods used in one field, theory of another, and experimenting routines of 3rd (even if it's how the best discoveries and inventions are made) ? Nope.

That's what academic journal wheel tells everyone. 

What do you do? Dump it as a pdf in a format that's expected into any of the servers that serve PDF, and let's not even start about their discoverability.

Back in mid to late 2000's, fan made stories also called fanfictions, were forming a community. You write and submit it to fanfiction.net or similar app, guess what they did? deleted thousands of works overnight without notice of what they considered as bad or good, deleted any works that could offend the advertisers, and thousands of fans lost hundreds of thousands of words of writing. It's either their curated collection, which holds every right over your life's work and can delete them at whim

...sounds eerily familiar? Yup, same problem as current research distribution.

Guess what they did? Fans came together to create "Archive of our own" (AO3) - a non profit, non commercial archive by and for fans to host their works without the overlords, with one goal:

Make a work findable to someone to who wants it by...letting them search for it. Yes, not a fancy algorithm, but literally lets you do

Fandom: Harry potter, Lord of rings
Include: Time travel, Chamber of Secrets
Exclude: Mature Scenes

Oh yes,

Field: Biotechnology, Biology
Include: Protein Folds, Negative Results
Exclude: Survey Papers

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

## Who is on your team? What's your track record on similar projects?

I will be working on this solo, while consulting Subject Matter Experts for any doubts that may arise during tag creations in the respective fields. 

In the last year, I led an [open research lab](https://isrl.in/pausing-isrl-respecting-the-work-supporters-and-oneself/). It started with a computer saying instant noodles is healthier than rice and as an advocate for non violence, I didn't want it to be beaten by every grandma in the area. So I went down a 9 month rabbit hole that produced 9 works, all open source with 3,813 reads, 1,780 downloads,

It was process open, not just outputs. 

Developed the E-M-F Tri-Axial Model for ingredient identity, transformation, and function: a method informed by S. R. Ranganathan's Colon Classification, a century of Supreme Court precedents, ITC-HSN codes, and FSSAI rulesets.

It is the first method to apply NOVA processing deterministically at the ingredient level, trained undergraduate researchers to move from basic research practice to multi-jurisdiction legal analysis in four weeks.

Whenever I signed off on a work, there was always a question of how to water it down to fit a particular journal's vision of what it should contain or shouldn't, do we generalise a solution specific to a country to make it more 'fit' for Q1? But that was trying to fit infant food to adults, when it was formalised for newborns. 

Few months later is when I got a direction on how we can tackle this, cue OORA.

## What are the most likely causes and outcomes if this project fails?

- Agentic workflows not being strong enough to cleanly port the papers, but we still have the fallback of existing agentic system even if the experiment to bring down the costs fail
- Feature bloat. I plan to tackle this by only adding the core features needed for it to be functional, and nothing more. AO3's codebase will also help me anchor this in the heuristic.