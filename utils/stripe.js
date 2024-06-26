
// tba (stripe): env (eg. STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET) and code (eg. import from "stripe") setup for connecting to stripe

// tba (stripe): handleEvent(body, is_event_parsed), to handle stripe POST webhook events (eg. `checkout.session.completed`) coming from index.js->`/stripe` --- `is_event_parsed` param refers to whether `req` (ie. `fe`) param is an entire POST request.body, or if it's an already-parsed stripe event, in which case `let event = stripe.webhooks.constructEvent(...)` can be skipped and just instead do `let event = body`

// tba (stripe): getLatestEvents(), to poll latest x (eg. 500) stripe events and process in `processes->stripe_subs.processStripeSubs()` in case stripe webhook listener wasn't able to capture a stripe event live (eg. due to api outage)

/* references:
  - setup stripe in nodejs: https://docs.stripe.com/webhooks/quickstart?lang=node
  - handle stripe webhook events, for handleEvent() function: https://github.com/marclou/stripe-sub/blob/main/app/api/webhook/stripe/route.js
*/