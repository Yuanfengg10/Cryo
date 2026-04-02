# CryoLeads Agent Blueprint

## Mission

Build a WhatsApp-first human-in-the-loop sales agent for Cryonick Wellness Factory that:

1. sources qualified leads automatically
2. drafts personalised outreach for approval
3. handles generic sales questions
4. warms leads until genuine buying intent appears
5. hands hot leads to Yuan for closing

## Primary Markets

- Singapore
- Malaysia

Future expansion can include other Southeast Asia markets once the first loop is stable.

## Priority Segments

- Gyms
- Clinics
- Spas
- Wellness studios
- Sports centres
- Longevity clinics
- Biohacking centres

## Product Positioning

Based on the current direction from Yuan, the highest-priority product narratives are:

- `Revique HaloX longevity capsule`
- `Antarctica cryotherapy chamber`

These should be positioned especially for longevity and biohacking prospects.

## Lead Sources

The agent should treat these as first-class sources:

- Google Places / Maps
- Instagram
- Facebook
- local Google search results
- event and summit pages

Suggested keyword clusters:

- `longevity clinic singapore`
- `longevity clinic malaysia`
- `biohacking center singapore`
- `biohacking center malaysia`
- `biohacking summit southeast asia`
- `longevity summit singapore`
- `recovery studio singapore`
- `premium wellness clinic kuala lumpur`

## Human Approval Rules

For now, the agent must not send autonomous outbound or inbound messages without approval.

Allowed now:

- discover leads
- qualify leads
- draft outreach
- draft replies
- recommend next actions

Not allowed now:

- send WhatsApp messages automatically
- promise terms outside approved materials

## Handoff Rule

Hand the lead to Yuan when all of these are true:

1. the prospect shows active interest
2. the agent has already handled generic questions
3. catalog, pricing, demo/video, and product overview have been covered
4. the prospect continues engaging after those answers

## Generic Questions The Agent Should Handle

- pricing
- which equipment is suitable
- whether demo material exists
- product overview
- general next-step questions

For demo-like requests, the agent should point to the `Cryonick Wellness Factory` YouTube channel when appropriate.

## Recommended Build Order

1. lead ingestion and scoring
2. approval-based outreach queue
3. inbound reply assistant
4. catalog/pricing response flows
5. handoff detection
6. compliant WhatsApp automation once business verification is in place
