/**
 * Pain-first cold-email templates. Each uses merge tags ({{greeting}}, {{company}},
 * {{niche}}, {{painOpener}}, {{companyLabel}}…) and spintax {a|b|c} so every send
 * is personalized and varied. Used by the composer "Shuffle" button and, when
 * "rotate templates" is on, randomly per-recipient in a bulk send.
 */
export const EMAIL_TEMPLATES = [
  {
    name: 'Ops bottleneck',
    subject: 'A {{niche}} ops pattern teams at {{company}} run into',
    body: `{{greeting}},

{{painOpener}} often hit the same bottleneck: {growth stalls because manual follow-up eats the week|manual follow-up quietly caps growth|the week disappears into follow-up instead of closing}.

I have been mapping {what separates teams that fix that quietly vs. teams that stay stuck|which teams break through vs. plateau|the pattern behind teams that recover vs. stay in the grind}. No pitch, just the pattern.

If it resonates at {{companyLabel}}, happy to share the one-pager.

{Worth a quick reply?|Open to a quick reply?|Would a short reply be useful?}

Alex`,
  },
  {
    name: 'Time leak',
    subject: 'Where {{company}} likely loses 5 hours/week',
    body: `{{greeting}},

Most {{nicheLabel}} teams I talk to lose {4-6 hours a week|most of a day each week|a surprising chunk of the week} to {copy-pasting between tools|chasing status updates|manual reporting}.

I put together a short breakdown of {where that time goes and how to claw it back|the three biggest leaks and the fix}. Not a sales thing, genuinely useful.

Want me to send it over to {{companyLabel}}?

Alex`,
  },
  {
    name: 'Competitor angle',
    subject: 'How faster {{niche}} teams are pulling ahead',
    body: `{{greeting}},

The {{nicheLabel}} teams growing fastest right now aren't working harder, they've just {removed the busywork between tools|automated the boring follow-up|stopped doing the same task five times}.

I wrote up {what they do differently|the playbook} in a page. Happy to share it with {{companyLabel}} if it's relevant.

{Want it?|Should I send it?|Worth a look?}

Alex`,
  },
  {
    name: 'Quick question',
    subject: 'Quick question about {{company}}',
    body: `{{greeting}},

Quick one: who owns {content and outreach|publishing and follow-up|growth ops} at {{companyLabel}}?

I ask because most {{nicheLabel}} teams have that {split across three tools|spread too thin|stuck on one person}, and it's usually an easy fix once you see it.

If that's you, I'll send over a short breakdown.

Alex`,
  },
  {
    name: 'Result-led',
    subject: '{{firstName}}, cut your posting time by ~80%',
    body: `{{greeting}},

Teams like {{company}} usually spend {hours|half a day|too long} reformatting one update for every channel.

We've seen {{nicheLabel}} teams take that {from two hours to ten minutes|down to a few clicks|off their plate entirely}. Same message, every platform, scheduled once.

Want the 2-minute version of how?

Alex`,
  },
  {
    name: 'Empathy open',
    subject: 'Running {{niche}} marketing solo is brutal',
    body: `{{greeting}},

If you're handling {{niche}} marketing at {{companyLabel}} {mostly alone|with a small team|on top of everything else}, you already know the problem isn't ideas, it's {the hours|the tab-switching|the follow-through}.

I help teams get that time back. {Mind if I share how?|Open to a quick idea?|Want the short version?}

Alex`,
  },
  {
    name: 'Before/after',
    subject: 'Before vs after for {{company}}',
    body: `{{greeting}},

Before: {five tabs, five logins, one idea posted five times|notes here, tasks there, nothing connected}.
After: {compose once, publish everywhere, on schedule|one workspace, every channel, automated}.

That's the shift most {{nicheLabel}} teams are making. Want to see what it'd look like for {{companyLabel}}?

Alex`,
  },
  {
    name: 'Social proof',
    subject: 'What other {{niche}} teams switched to',
    body: `{{greeting}},

A few {{nicheLabel}} teams recently moved off {scattered tools|manual posting|three separate subscriptions} and onto one workflow, and the first thing they mention is {getting their week back|how much faster shipping got|never missing prime time again}.

Happy to share what they changed at {{companyLabel}}. {Worth a reply?|Interested?}

Alex`,
  },
  {
    name: 'Curiosity gap',
    subject: "The {{niche}} mistake that's easy to miss",
    body: `{{greeting}},

There's one {{nicheLabel}} habit that quietly caps growth, and almost nobody notices it because it {feels productive|looks like normal work|hides in the day-to-day}.

I broke it down in a page. {Want me to send it?|Should I share it with {{companyLabel}}?}

No pitch, just the pattern.

Alex`,
  },
  {
    name: 'Direct value',
    subject: 'One workspace for all of {{company}}\'s channels',
    body: `{{greeting}},

{{painOpener}} usually juggle a different tool for every channel. {{companyLabel}} probably does too.

We put {posting, scheduling, previews and email|every channel and the calendar} in one place, so one update goes everywhere, formatted right, on time.

Want a 2-minute look?

Alex`,
  },
  {
    name: 'Low-key follow-up',
    subject: 'Re: {{niche}} workflow at {{company}}',
    body: `{{greeting}},

Circling back, no worries if now's not the time.

The short version: {{nicheLabel}} teams using one workspace for publishing {save hours a week|ship more consistently|stop missing windows}. If that's useful for {{companyLabel}}, I'll send the one-pager.

{Just say the word.|Reply "yes" and it's yours.}

Alex`,
  },
]
