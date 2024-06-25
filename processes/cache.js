let cache = require(`../utils/cache`);
let mongo = require(`../utils/mongo`);
let util = require(`../utils/util`);

let init = false;

module.exports = {
  init: () => {
    return init;
  },

  start: async (d) => {
    refreshCache(d);

    while (!init) {
      await util.wait(5);
    }

    return;
  },
};

async function refreshCache(d) {
  cache.refresh();
  await refreshCachedItems();

  console.log(init ? `cache refreshed` : `cache initiated`);
  init = true;

  await util.wait(30);
  refreshCache();
}

async function refreshCachedItems() {
  let keys = [
    `stats`,
    `users`,
  ];

  for (let key of keys) {
    let objs = await mongo.getAll(key);
    for (let obj of objs) {
      cache.set({ obj });
    }
    console.log(`refreshed cache objects: ${key}`);
  }
}
