let cache = require(`../utils/cache`);
let stripe = require(`../utils/stripe`);
let util = require(`../utils/util`);
let dataflow = require(`../controllers/dataflow`);
// const { PromisePool } = require("@supercharge/promise-pool");

// const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;
// const DISCORD_ROLE_ID = `discord_role_id_here`;

let init = false;
let latest_process_timestamp = null;

module.exports = {
  init: () => {
    try {
      return init;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  start: async (d) => {
    try {
      await processStripeSubs(d);
  
      while (!init) {
        await util.wait(5);
      }
  
      return;
    } catch (e) {
      console.log(e);
      return;
    }
  },
};

async function processStripeSubs(d) {
  try {
    // note: handle any stripe events that haven't already been handled from stripe webhook listener (checking of "if already handled" is done within utils->stripe.handleEevent() itself)

    let latest_stripe_events = (await stripe.getLatestEvents(latest_process_timestamp) || []).sort((a, b) =>
      a.created - b.created // note: sort in ascending order
    );

    latest_stripe_events = latest_stripe_events.filter(e => {
      try {
        // note: filter out `checkout.session.completed` events with matching `charge.refunded` events after it, and `charge.refunded` events with matching `checkout.session.completed` events before it --- `customer.subscription.deleted` (for recurring payments) checking for this currently not supported here
        
        if (![`charge.refunded`, `checkout.session.completed`].includes(e.type)) {
          return true;
        }

        if (e.type === `charge.refunded`) {
          let matching_checkout_events_before = latest_stripe_events.filter(ce =>
            (ce.type === `checkout.session.completed`) &&
            ((ce.data.object || {}).payment_intent === (e.data.object || {}).payment_intent) &&
            (ce.created < e.created)
          ).slice() || [];
          
          return (matching_checkout_events_before.length === 0);
        } else if (e.type === `checkout.session.completed`) {
          let matching_refund_events_after = latest_stripe_events.filter(re =>
            (re.type === `charge.refunded`) &&
            ((re.data.object || {}).payment_intent === (e.data.object || {}).payment_intent) &&
            (re.created >= e.created)
          ).slice() || [];
          
          return (matching_refund_events_after.length === 0);
        }

        return true; // note: default
      } catch (e) {
        console.log(e);
        return false;
      }
    }) || [];

    latest_process_timestamp = util.getTimestamp();
    
    for (let event of latest_stripe_events) {
      await stripe.handleEvent(event, true);
    }
    
    console.log(init ? `stripe_subs refreshed` : `stripe_subs initiated`);
    init = true;

    await util.wait(180); // 60 * 2
  } catch (e) {
    console.log(e);
  } finally {
    await util.wait(10);
    processStripeSubs(d);
  }
}