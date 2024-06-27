let cache = require(`../utils/cache`);
let stripe = require(`../utils/stripe`);
let util = require(`../utils/util`);
let dataflow = require(`../controllers/dataflow`);
// const { PromisePool } = require("@supercharge/promise-pool");

// const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;
// const DISCORD_ROLE_ID = `discord_role_id_here`;

let init = false;

module.exports = {
  init: () => {
    return init;
  },

  start: async (d) => {
    await processStripeSubs(d);

    while (!init) {
      await util.wait(5);
    }

    return;
  },
};

async function processStripeSubs(d) {
  try {
    // note: handle any stripe events that haven't already been handled from stripe webhook listener

    let latest_stripe_events = await stripe.getLatestEvents() || [];

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