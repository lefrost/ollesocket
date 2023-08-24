let cache_process = require(`../processes/cache`);
let user_process = require(`../processes/user`);

module.exports = {
  init: () => {
    return {
      cache: cache_process.init(),
      user: user_process.init(),
    };
  },

  start: async (d) => {
    let name = d.name;
    let payload = d.payload;

    switch (name) {
      case `cache`: {
        console.log(`initiated process: cache`);
        await cache_process.start(payload);
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
  },
};
