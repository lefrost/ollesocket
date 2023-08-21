let cache = require(`../utils/cache`);
let dataflow = require(`./dataflow`);
let util = require(`../utils/util`);

// let category_name = require(`./adhoc/category_name`);

module.exports = {
  load: async (d) => {
    return await load(d);
  },
};

async function load(d) {
  try {
    let obj = d.obj || {};
    let data;

    switch (d.type) {
      // case `object`: {
      //   data = await loadObject(obj);
      //   break;
      // }
      // case `category_name_foo`:
      // case `category_name_bar`: {
      //   data = await category_name.load(obj);
      //   break;
      // }
      default: {
        data = null;
        break;
      }
    }

    return util.getRes({
      res: `ok`,
      act: `load`,
      type: d.type,
      data,
    });
  } catch (e) {
    console.log(e);
    return util.getRes({ res: `no`, act: `load`, type: d.type, data: null });
  }
}

// async function loadObject(d) {
//   try {
//     let id = d.id || ``;

//     return {
//       foo: `bar`,
//     };
//   } catch (e) {
//     console.log(e);
//     return null;
//   }
// }
