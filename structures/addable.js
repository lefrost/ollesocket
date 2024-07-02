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
      case `stat`: {
        return await getStatStruct(d.obj);
      }
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

async function getStatStruct(d) {
  try {
    let id = util.generateId(20);
    
    let obj = {
      id: d.id || id,
      code: d.code || ``, // eg. `enter`
      data: d.data || {}, // eg. for code=`enter`: {total_count, guest_count, user_count}
      metadata: d.metadata || util.getStructMetadataObj(`stat`, util.getTimestamp())
    }

    return {
      collection_name: `stats`,
      in_database: true,
      pullable: false,
      obj
    }
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function getUserStruct(d) {
  try {
    let id = util.generateId(20);

    let obj = {
      id: d.id || id,
      code: d.code || id.substring(0, 10),
      name: d.name || ``,
      icon_image_url: d.icon_image_url || ``,
      timezone: d.timezone || ``,
      connections: d.connections || [], // [{type<`email`, `discord`, `solana`, `suave`, ...>, code, name}]
      stripe_subs: d.stripe_subs || [], // [{customer_id, customer_email, price_id, product_id, timestamp}]
      // nft_cxs: d.nft_cxs || [], // [{code, nfts[{addy, wallet_addy, name, image_url, metadata_url}]]
      // servers: d.servers || [], // [{id, type<`admin`, `staff`, `member`, `none`>}]
      settings: d.settings || {}, // {...}
      metadata: d.metadata || util.getStructMetadataObj(`user`, util.getTimestamp())
    }
  
    return {
      collection_name: `users`,
      in_database: true,
      pullable: false,
      obj
    }
  } catch (e) {
    console.log(e);
    return null;
  }
}
