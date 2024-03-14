let util = require("../utils/util");
let mongo = require("../utils/mongo");
let _ = require("lodash");

// let intiated = false;
let cache = {};

module.exports = {
  // setInitiated: () => {
  //   return setInitiated();
  // },

  // isInitiated: () => {
  //   return isInitiated();
  // },

  // {id, type}
  get: async (d) => {
    return await get(d);
  },

  // {type, filters}
  getMany: async (d) => {
    return await getMany(d);
  },

  // -
  getAll: async () => {
    return await getAll();
  },

  // {db_obj}
  set: async (d) => {
    return await set(d);
  },

  // {id, type}
  del: async (d) => {
    return await del(d);
  },

  // {obj, type, exceptions}
  // pull: async (d) => {
  //   return await pull(d);
  // },

  // -
  refresh: async () => {
    return await refresh();
  },
};

// function setInitiated() {
//   intiated = true;
// }

// function isInitiated() {
//   return intiated;
// }

async function get(d) {
  try {
    let obj;
    if (d.type && d.id !== null && d.id !== undefined) {
      obj = cache[`${d.type}-${d.id}`];
      
      if (
        (d.include_inactive !== true) &&
        (obj.metadata || {}).type !== `active`
      ) {
        obj = null;
      }
    } else {
      let objs = await getMany(d);
      if (objs.length > 0) {
        obj = objs[0];
      }
    }
    return obj || null;
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function getMany(d) {
  try {
    d.filters = [
      ...d.filters,
      {
        prop: `metadata.type`,
        value: d.type,
        condition: `match`,
        options: [],
      },
    ];
    
    if (d.include_inactive !== true) {
      d.filters.push({
        prop: `metadata.status`,
        value: `active`,
        condition: `match`,
        options: []
      });
    }

    return Object.keys(cache)
      .filter((k) => k.startsWith(`${d.type}-`))
      .filter((k) => {
        let item = cache[k];
        let passed = true;

        for (let filter of d.filters) {
          if (
            _.get(item, filter.prop) !== null &&
            _.get(item, filter.prop) !== undefined
          ) {
            switch (filter.condition) {
              // conditions: match, some
              case `match`: {
                // match options: non-case-sensitive
                if (filter.options.includes(`non-case-sensitive`)) {
                  passed =
                    _.get(item, filter.prop).toLowerCase() ===
                    filter.value.toLowerCase();
                } else {
                  passed = _.get(item, filter.prop) === filter.value;
                }
                break;
              }
              case `includes`: {
                if (filter.options.includes(`non-case-sensitive`)) {
                  passed = _.includes((_.get(item, filter.prop) || ``).toLowerCase().trim(), (filter.value || ``).toLowerCase().trim());
                } else {
                  passed = _.includes(_.get(item, filter.prop), filter.value);
                }
                break;
              }
              case `some`: {
                // some options: ...
                passed = _.some(_.get(item, filter.prop), filter.value);
                break;
              }
            }
          } else {
            passed = false;
          }

          if (!passed) {
            break;
          }
        }

        return passed;
      })
      .map((k) => cache[k]);
  } catch (e) {
    console.log(e);
    return [];
  }
}

async function getAll() {
  try {
    return cache;
  } catch (e) {
    console.log(e);
    return [];
  }
}

async function set(d) {
  try {
    cache[`${d.obj.metadata.type}-${d.obj.id}`] = {
      ...d.obj,
      cache_metadata: {
        timestamp: util.getTimestamp(),
      },
    };
  } catch (e) {
    console.log(e);
  }
}

async function del(d) {
  try {
    delete cache[`${d.type}-${d.id}`];
  } catch (e) {}
}

// async function pull(d) {
//   try {
//     let filters = [
//       {
//         prop: `metadata.type`,
//         value: d.type,
//         condition: `match`,
//         options: [],
//       },
//     ];

//     for (let key of Object.keys(d.obj)) {
//       if (!d.exceptions.includes(key)) {
//         filters.push({
//           prop: key,
//           value: d.obj[key],
//           condition: `match`,
//           options: [],
//         });
//       }
//     }

//     let matches = await getMany({ filters });

//     for (let match of matches) {
//       await del({ type: d.type, id: match.id });
//     }
//   } catch (e) {
//     console.log(e);
//   }
// }

async function refresh() {
  let deletables = [
    {
      id: `io_instance`,
      timespan_mins: 10,
    },
  ];

  for (let key of Object.keys(cache)) {
    if (
      util.isEmptyObj(cache[key]) ||
      util.getTimestampDiff(
        cache[key].cache_metadata.timestamp,
        util.getTimestamp(),
        `minutes`
      ) >=
        (deletables.some((d) => d.id === cache[key].metadata.type)
          ? deletables.find((d) => d.id === cache[key].metadata.type)
              .timespan_mins
          : 30)
    ) {
      delete cache[key];
    }
  }
}
