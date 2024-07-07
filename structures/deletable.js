let util = require("../utils/util");

module.exports = {
  // type
  get: async (d) => {
    return await get(d);
  },
};

async function get(d) {
  try {
    switch (d.type) {
      case `stat`: {
        return await getStatStruct(d);
      }
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

async function getStatStruct(d) {
  try {
    return {
      collection_name: `stats`,
      in_database: true,
      pullable_attributes: []
    }
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function getUserStruct(d) {
  try {
    return {
      collection_name: `users`,
      in_database: true,
      pullable_attributes: []
    }
  } catch (e) {
    console.log(e);
    return null;
  }
}
