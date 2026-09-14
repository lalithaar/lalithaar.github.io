---
title: "Here’s how to fix colors that look really good and on brand but isn’t readable without changing how it looks"
layout: ../layouts/Layout.astro
---

# Here’s how to fix colors that look really good and on brand but isn’t readable without changing how it looks

Usually, when I start working on the visual design or color palette of a website, I look at, "Okay, what does this need to convey? Does it need to convey trust, softness, care, or something?" I pick out the colors, check how it matches, and go through the whole process: "Okay, does this look good? Is it on brand? Does it feel like this is the brand that would say this?"

I usually go through the whole thing and check, "Okay, everything is perfect, and we just need to design the thing." When I actually pick up a mock page and put it through the color scheme, I realize that this isn't readable at all (totally readable if I squint my eyes and zoom to 100% and try to convince myself to think it is readable). Even though it looks great and everything, every other criterion for design is met, this isn't readable. I don't want to change the color because, come on, I spent so much time coming up with it.

Usually, what I would do is go to copy the hex of the color and paste it to a color range picker, try to find closest color by moving it around, and check again. I would also then see, "Okay, does this work? Is it readable now?"

That led me to create a library that does this.

Here is what I am doing these days: you basically download a Python library called [`cm-colors`](https://cm-colors.readthedocs.io/). There's this CLI and also Python functions. I don't write the code or try to run it through the client, but rather I just tell the AI, "Hey, whenever you choose or use a pair of colors, just run it through the cm-colors and make sure it is fixed." If it is not readable, cm-colors will automatically find the closest color such that it looks almost the same but it is readable now. That is something I do these days, and I thought this may be helpful for other people (or also new agents who need a quick intro to why). 

Quick Syntax reference (command line tool):

```python
# single pair
cm-colors contrast '#777777' '#ffffff' --json
cm-colors fix     '#777777' '#ffffff' --json

# inline bulk
cm-colors contrast --pairs '#777 #fff' --pairs '#aaa #000' --json
cm-colors fix     --pairs '#777 #fff' --pairs '#aaa #000' --json

# from file
cm-colors contrast --file pairs.txt --json
cm-colors fix     --file pairs.txt --json
```