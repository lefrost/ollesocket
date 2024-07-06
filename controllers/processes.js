let util = require(`../utils/util`);

let cache_process = require(`../processes/cache`);
let stripe_sub_process = require(`../processes/stripe_sub`);
let user_process = require(`../processes/user`);

module.exports = {
  init: () => {
    try {
      return {
        cache: cache_process.init(),
        stripe_sub: stripe_sub_process.init(),
        user: user_process.init(),
      };
    } catch (e) {
      console.log(e);
      return {}
    }
  },

  start: async (d) => {
    try {
      let name = d.name;
      let payload = d.payload;
  
      while (!cache_process.init() && (name !== `cache`)) {
        console.log(`waiting another 10s before initiating process ${name}, due to cache not being loaded yet`);
        
        await util.wait(10);
      }
  
      switch (name) {
        case `cache`: {
          console.log(`initiated process: cache`);
          await cache_process.start(payload);
          break;
        }
        case `stripe_sub`: {
          console.log(`initiated process: stripe_sub`);
          await stripe_sub_process.start(payload);
          break;
        }
        case `user`: {
          console.log(`initiated process: user`);
          await user_process.start(payload);
          break;
        }
        default: {
          console.log(`process ${name} not found.`);
        }
      }
    } catch (e) {
      console.log(e);
    }
  },
};
