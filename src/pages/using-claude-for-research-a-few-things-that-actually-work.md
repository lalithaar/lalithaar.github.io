---
title: "Using Claude for Research: a few things that actually work"
layout: ../layouts/Layout.astro
---

# Using Claude for Research: a few things that actually work

Someone asked me about Claude for research (in this context, industrial), so here was the ones in top of mind.

I haven't tested Claude Science extensively. Incase of general Claude, here are some things that work really well,

1. **Maintain a papertable.md**

If you are indeed using it to find literatures and approaches, tell it to maintain something I call the papertable.md, basically let it maintain 1 file with a table of title, authors, doi/link, core theme/topic and another file where it lays out exactly why it thinks that is relevant and it rating each paper out of 100 in relevancy. This is really helpful when we want to audit or even check by ourself.

2. **Verification scripts for any data analysis**

Incase of it reading/running analysis on existing data, let it create a python (or whatever the language of your choice is) script that prints out the numbers and stats it claims the data has. Usually, when I know I will use a number - it will create a folder isfv/ (immutable scripts for verification) where it creates a copy of the data it runs the experiment from, the script, along with a README.md that outlines the core stats, purpose etc. 

At times, the script may print correct but still the number Claude says will be off or it will assume usual case and round it off (can mess up loads of calcs if you want more decimals and stuff).

3. **Reading PDFs — source folders and a verification pass**

If you are using Claude code to read pdfs etc, let there be a source/ folder where you dump all the pdfs, and let it first read and fetch all core numbers/data/facts it needs from each pdf to a paper_files/ where each paper is title of the paper.md per paper. Spawn another agent after this process is complete which verifies every number and stat. 

This helps alot because one in saving the tokens beyond one time whenever you need to refer a paper, another in decreasing hallucinations by a lot.

4. **Be careful of context — a number can be right and still wrong**

Be careful of the context it's pulling the paper from. We once had this situation where there were two stats: 6/10 and 6/16 and both as a number for exact same context/problem framing evth. 

Claude chose one over another, but then someone in our team flagged that there are 2 numbers and turns out, the one Claude pulled in was - yes in the same subject, but not relevant to the problem at all cuz that paper's original goal was something else.

5. **Trust your judgement over Claude's on what counts as valid**

Claude sometimes dismisses numbers/fact because it isn't 'scientific' enough, but often what counts as valid in academic research and industrial research differs alot. Make sure to trust your judgement above what it says and decide for yourself.

6. **Watch the Reviewer 2 tone**

Also Claude sometimes default to writing for the Reviewer 2 and preempt everything, and adds quite a bit of jargon for the sake of it (inherited from academia a bit yeah), instead of just treating it as a record of scientific activity. Make sure to let it know of the tone and utility/goal of the work, it helps better.