let util = require("../utils/util");

module.exports = {
  // obj, type
  get: async (d) => {
    return await get(d);
  },
};

async function get(d) {
  try {
    switch (d.type) {
      case `user`: {
        return await getUserStruct(d.obj);
      }
    }

    return null;
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function getUserStruct(d) {
  let id = util.generateId(20);
  // let obj = {
  //   id,
  //   username: d.username || id.substring(0, 10),
  //   timezone: d.timezone || ``,
  //   connections: d.connections || [],
  //   metadata: {
  //     type: `user`,
  //     create_timestamp: util.getTimestamp(),
  //   },
  // };
  let obj = {
    id,
    name: d.name || id.substring(0, 10),
  };

  // if (d.discord_account) {
  //   obj.connections.discord_accounts.push(d.discord_account);
  //   // {code, name}
  // }

  // if (d.wallet_address) {
  //   obj.connections.wallet_addresses.push(d.wallet_address);
  //   // {code, name}
  // }

  return { collection_name: `users`, pullable: false, obj };
}
