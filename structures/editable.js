let util = require("../utils/util");
let mongo = require("../utils/mongo");
let _ = require("lodash");

let cache = {};

module.exports = {
  // type
  get: async (d) => {
    return await get(d);
  },
};

async function get(d) {
  try {
    switch (d.type) {
      case `user`: {
        return await getUserStruct(d);
      }
    }

    return null;
  } catch (e) {
    console.log(e);
    return null;
  }
}
async function getUserStruct(d) {
  return {
    collection_name: `users`,
    in_database: true,
    attributes: {
      editables: [`name`],
      numerics: [],
      booleans: [],
    },
  };
}
