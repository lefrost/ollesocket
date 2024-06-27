
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = require('stripe')(STRIPE_SECRET_KEY);

module.exports = {
  handleEvent: (body, is_event_parsed) => {
    try {
      // tba (stripe): handleEvent(body, is_event_parsed), to handle stripe POST webhook events (eg. `checkout.session.completed`) coming from index.js->`/stripe` --- `is_event_parsed` param refers to whether `req` (ie. `fe`) param is an entire POST request.body, or if it's an already-parsed stripe event, in which case `let event = stripe.webhooks.constructEvent(...)` can be skipped and just instead do `let event = body`
    } catch (e) {
      console.log(e);
    }
  },

  getLatestEvents: () => {
    try {
      let latest_events = [];

      // tba (stripe): getLatestEvents(), to poll latest x (eg. 500) stripe events and process in `processes->stripe_subs.processStripeSubs()` in case stripe webhook listener wasn't able to capture a stripe event live (eg. due to api outage)

      return latest_events || [];
    } catch (e) {
      console.log(e);
      return [];
    }
  }
}

/* references:
  - setup stripe in general: https://youtu.be/ag7HXbgJtuk?si=Fxxkv7x8p_lNU3Nv
  - setup stripe webhook in nodejs: https://docs.stripe.com/webhooks/quickstart?lang=node
  - handle stripe webhook events, for handleEvent() function: https://github.com/marclou/stripe-sub/blob/main/app/api/webhook/stripe/route.js
*/