const { MongoClient } = require(`mongodb`);
const uri = process.env.DB_URI;
const API_TYPE = process.env.API_TYPE;
const PROJECT_NAME = process.env.PROJECT_NAME;

let util = require("./util");

let client;

module.exports = {
  connect: async () => {
    try {
      client = new MongoClient(uri);
      await client.connect({ useUnifiedTopology: true });
    } catch (e) {
      console.log(e);
    }
  },

  getAll: async (collection_name) => {
    try {
      let data = (
        await client
          .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
          .collection(collection_name)
          .find()
          .toArray()
      ).map((d) => {
        delete d._id;
        return d;
      });
  
      return data;
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  getMany: async (collectionName, params, options) => {
    try {
      if (options.sorters === undefined) {
        options.sorters = [`id`];
      }
  
      if (options.sort_direction === undefined) {
        options.sort_direction = `ascending`;
      }
  
      if (options.result_count === undefined) {
        options.result_count = 100;
      }
  
      let data;
  
      let sorters = {};
      for (let sorter_string of options.sorters) {
        sorters[sorter_string] = options.sort_direction === `ascending` ? 1 : -1;
      }
  
      await client
        .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
        .collection(collectionName)
        .find(params, {
          sort: sorters,
          limit: options.result_count,
          collation: { locale: `en`, strength: 2 },
        })
        // limit-sort-find for lazy loading (need to update code for newer vers.) - https://tomkit.wordpress.com/2013/02/08/mongodb-lazy-loading-infinite-scrolling/
        // `sort` and `limit` in `find` (for newer vers.) - https://stackoverflow.com/a/60447623/8919391
        // `collation` for case-insensitive MongoDB query - https://stackoverflow.com/a/40914924
        .toArray(async (err, result) => {
          if (!util.isEmptyObj(result)) {
            data = result;
            data.forEach((d) => delete d._id); // MongoDB automatically adds an `_id` prop to its objects; don't show that at the endpoint
          } else {
            data = [];
          }
        });
  
      return data;
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  getOne: async (collectionName, params) => {
    try {
      let data = await client
        .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
        .collection(collectionName)
        .findOne(params, { collation: { locale: `en`, strength: 2 } });
  
      if (!util.isEmptyObj(data)) {
        delete data._id;
      }
  
      return data;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  addOne: async (collectionName, obj) => {
    let responseCode = 503;
    
    try {
      await client
        .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
        .collection(collectionName)
        .insertOne(obj);
      responseCode = 201;
    } finally {
      return responseCode;
    }
  },

  updateOne: async (collectionName, idObj, setObj) => {
    let responseCode = 503;

    try {
      await client
        .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
        .collection(collectionName)
        .updateOne(idObj, setObj);
      responseCode = 200;
    } finally {
      return responseCode;
    }
  },

  deleteOne: async (collectionName, idObj) => {
    let responseCode = 503;

    try {
      await client
        .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
        .collection(collectionName)
        .deleteOne(idObj);
      responseCode = 200;
    } finally {
      return responseCode;
    }
  },

  deleteMany: async (collectionName, idObj) => {
    let responseCode = 503;

    try {
      await client
        .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
        .collection(collectionName)
        .deleteMany(idObj);
      responseCode = 200;
    } finally {
      return responseCode;
    }
  },

  clear: async (collectionName) => {
    let responseCode = 503;

    try {
      await client
        .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
        .collection(collectionName)
        .remove();
      responseCode = 200;
    } finally {
      return responseCode;
    }
  },

  count: async (collectionName, params) => {
    let count;

    try {
      count = await client
        .db((API_TYPE === `dev`) ? `${PROJECT_NAME}-dev` : `${PROJECT_NAME}`)
        .collection(collectionName)
        .find(params, {
          collation: { locale: `en`, strength: 2 },
        })
        .count();
    } finally {
      return { count };
    }
  },
};
