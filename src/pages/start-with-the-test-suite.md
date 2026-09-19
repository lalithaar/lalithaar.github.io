---
title: "Start with the test suite or benchmark instead of main function file"
layout: ../layouts/Layout.astro
draft: true
---
# Start with the test suite or benchmark instead of main function file

It forces you to clarify
1. the constraints
2. what success looks like in concrete terms instead of something vague
3. what are the edge cases / failure modes you want to prevent

This is not a linear, let alone finished process at this stage. You will write (3) and realise it's due to a constraint you didn't formulate yet in (1). You will write the main functionality, then come across a weird edge case to add to or find out a criteria (2) was a bit too loose making it buggy. But overall seems like a better place to start than retrofitting everything post writing the function, esp when it's an AI writing it.

Some examples of where it worked:
- [Identity, Transformation, and Function: A Tri-Axial Model for the Classification of Food Ingredient Identity](https://doi.org/10.5281/zenodo.18714527). Designing the benchmark of what the model should do successfully helped me calibrate the nature of the model far better than starting off with hypothetical data, especially as the benchmark itself was derived from grey area and previously argued in court areas of where the boundaries lie. This was, again an application of using [law as timed dataset](https://www.doi.org/10.5281/zenodo.18741725) to calibrate against when there's no hard set ground truth to rely on.
- **Student Hall Allotment.** The usual assumptions of schedules break everytime when it meets reality, as reality is well - far more opinionated[^1] than an AI would ever dare to be even if kept at gunpoint. Understanding what matters to the people in the system and why it mattered, how it's relevant is far more to important to know before you automate something that just causes more friction.
[^1]: and classy.