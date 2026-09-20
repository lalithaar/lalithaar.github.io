---
title: "Maximising variance in dimensionality reduction PCA and chettinad paneer gravy"
layout: ../layouts/LayoutMath.astro
---

# Maximising variance in dimensionality reduction (PCA) and chettinad paneer gravy

Okay, image you are a spy and you are looking to find more information about your target. But you have far too many files at hand and need to scope it down so you can actually find the person.

You have clue 

$X$ = The person breathes oxygen

$Y$ = The person likes chapati with chettinad paneer

$Z$ = The person knows how to make chettinad dishes and salna

Now, can you tell anything unique about the person to track down based on $X$? Nope. It'S same for every human in the list.[^1] But then $Y$ and $Z$ tells you something:

1. Either they have lived in tamilnadu / knows tamil or atleast have travelled
2. But when you add they also know how to cook, you can pretty much say most likely someone who lived in tamilnadu and mother tongue being tamil 

They both point in the same direction and lets you deduce: Tamil person. 

So instead of keeping all the clues (which was our problem to begin with), you do 

$$\text{PC}_1 \approx 0.707Y + 0.707Z$$

Basically, when we are working with too much data and you want to tone it down so you get information[^2], you see which directs are useful and throw others away.

[^1]: Unless we are talking about non-human humans, in which case you may check [AO3](https://archiveofourown.org/) instead for clues.  If your spy target is a 500-year-old brooding creature of the night who doesn't respire, suddenly feature $X$ has variance again.
[^2]: Another example is "gender" column in an all girls school. Ofcourse it all says 'female', it gives no new information to your model.

