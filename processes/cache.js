let cache = require(`../utils/cache`);
let mongo = require(`../utils/mongo`);
let util = require(`../utils/util`);

let init = false;

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
      refreshCache(d);
  
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

async function refreshCache(d) {
  try {
    cache.refresh();
    await refreshCachedItems();
  
    console.log(init ? `cache refreshed` : `cache initiated`);
    init = true;
  
    await util.wait(30);
    refreshCache();
  } catch (e) {
    console.log(e);
  }
}

async function refreshCachedItems() {
  try {
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
  } catch (e) {
    console.log(e);
  }
}
