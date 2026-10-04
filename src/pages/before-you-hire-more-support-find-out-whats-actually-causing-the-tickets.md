---
title: "Before you hire more support, find out what's actually causing the tickets"
layout: ../layouts/Layout.astro
---

# Before you hire more support, find out what's actually causing the tickets

> [!NOTE]
> One of our well funded competitors’ CTO called one of our users who was not able to get hold of our support person and tried to move him. After a few weeks, he got hold of me and told about the same and nothing made him budge, but he was like please improve your support. 
> 
> Lesson learnt: We need more people on support and engineers who think customer support is the highest priority. DM me if you are one of the above.
> 
> Also: Good products always wins.


We think of fixing support or improving support in two cases:
1. The existing support is so bad, and you need to fix it because customers are asking for it. In which case, you have a great product. Congratulations.
2. The support has too many tickets, and team cannot take the load.

Usual fix, especially after AI, is to either throw more humans at it or deploy more agents. By agents, most of these are so hard to reach a human with that people just give up, and that leads to churn and low retention. We then wonder, "Where did this go wrong?" We have so many agents working 24/7. 

If it is a technical audience, or if we are in a regulated industry (or basically B2B especially enterprise), we add more docs to it and just point to it. What if we **pause for a moment** and **think of where the confusion is coming from?** A support ticket is just "Hey, I don't know how to approach this. Can you help me out?" It is some form of help, and help is arising from confusion, doubt, or some form of assurance before they take an action.

What if we go through the product? Let's say it is refund policy questions. If you are getting too many refund policy questions, then think of where the question is arising from. It is on the page where they are considering buying, and it is a cart or product page. They are going to click Buy.

What if we just add a one-liner that summarizes the refund policy with a link to the doc that has a more detailed policy? Policy, in the sense, is not legal jargon, but rather something the user can understand. It is written in their language, not legal compliance, because when we are talking about legal compliance, we talk in a legal proof way. The words are not those that we use in daily life.

When we are talking to actual humans, listen to your support team, and how they talk to the customer, the way of talking between these two is widly different. Usually, pointing to a legal document helps them understand nothing. It just leads to the user either giving up or adding a ticket of "Hey, how to get a refund? When can I get refund?"

This is one thing we can do: check out where the point of confusion is, think of the action which could lead to the support ticket.

Whether it is a new feature they are not familiar with or it is a new thing they haven't tried before. Can we do a small onboarding? This is not the five-step onboarding we do when the user signs up, of course, but a single step or single tooltip/modal saying, "Here is how to use this feature" when they first try it out.

Take all the support tickets and sort them by the most common questions. Go through your product through that lens and mark the UI with the points of confusion.
- A user is asking how to log out, but because the button is three steps away, can we bring that somewhere else or point the user to log out within the UI when they are actively looking for it?
- If it is a refund, then it is a one-line explainer with a link to a more detailed policy.
- If it is how to download this thing, then a more visible download button in a way that they expect it to be (the download icon with visible Download text instead of them needing to click the 3 dots, then choose more actions, then delete)
- What is the conventional way they use? What is the mental model of the user who's searching for something? Try to replicate that.

But while we go through the support tickets and try to understand and create support within the UI, more of a ramp to the particular things the users are confused with, it is also important not to overfit to a single instance. A single user may be on a tired Friday night, and they just can't find it because they are tired. It doesn't mean every single user needs that one.

Instead of just adding things just because a single user pointed it out [^1], go through the tickets and find out what things they most frequently ask about. See what people are most frequently confused with and try to only add that. Based on the response, add more kinds of what specifically works for this audience, because what kind of support works for a tech user or someone who's a develope doesn't work for a non-technical user.

Basically:
1. Try to identify the source of confusion and try to fix it in the UI itself
2. Seperate docs written for legal compliance to the ones written in the language the customer understands.
3. Identify when it needs a human support (some cases do really need human support and it's important) and make sure your agents if you have one have the right boundaries to escalate to a human without annoying a user who's frustrated.
4. Ask: Does it need a human support, an agent finding the right doc and explaining the how, or just a better onboarding for a specific feature or process.
5. What support means for someone differs so much based on who they are, so think of the literal meaning of support. Supporting a boyfriend's football game is cheerleading and hyping, while supporting a sick friend is bringing them porridge (or chicken nuggets, basically whatever is their language of support). So, let's take a moment to understand what would best work here instead of throwing the terms and conditions doc's 5th page's 8th clause which has refund policy at them.

[^1]: Only a single user pointed it out doesn't mean it's dismissable, sometimes that could be the only user who cared and understood why they are confused to take the effort to send a ticket, and others could just silently stop using it instead of raising a ticket. Triage the tickets to see if it's an actual confusing thing vs one tired user, and don't let the valuable findings go based on it not meeting "but more than 100 users didn't say that, so we aren't considering it"