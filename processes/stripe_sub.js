let cache = require(`../utils/cache`);
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
    // tba (stripe): call utils->stripe.getLatestEvents(), and for any stripe events that haven't been handled in stripe webhook listener, call handleEvent(req, is_event_parsed:true)
    
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