let cache = require(`../utils/cache`);
let dataflow = require(`./dataflow`);
let gcloud = require(`../utils/gcloud`);
let util = require(`../utils/util`);

const ITEM_TYPES = require(`../data/item_types.json`);

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
      //   data = await category_name.load(d);
      //   break;
      // }
      case `user_add`: {
        data = await loadUserAdd(obj);
        break;
      }
      case `user_edit`: {
        data = await loadUserEdit(obj);
        break;
      }
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

async function loadUserAdd(d) {
  try {
    // tba (misc): uploading user's icon image to google cloud, retrieving the resulting image url, and setting that image url in mongodb
    // note: handle `user.icon_image_url` based on `d.icon_image_obj.value/format<'url', 'base64'>`

    console.log(`test: user add`);
    console.log(d);

    return null;
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function loadUserEdit(d) {
  try {
    // tba (misc): uploading user's icon image to google cloud, retrieving the resulting image url, and setting that image url in mongodb
    // note: handle `user.icon_image_url` based on `d.icon_image_obj.value/format<'url', 'base64'>`
    
    return null;
  } catch (e) {
    console.log(e);
    return null;
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

async function getMapArrays() {
  try {
    // get array-type obj of items with arrays of every item type required in util->mapItem()
    
    var arrays = {};
    let array_types = [`user`];

    for (let array_type of array_types) {
      let MATCHING_ARRAY_ITEM_TYPE = ITEM_TYPES.find(T => T.code === array_type) || null;

      if (MATCHING_ARRAY_ITEM_TYPE) {
        arrays[MATCHING_ARRAY_ITEM_TYPE.plural_code] = (await dataflow.getMany({
          all: false,
          type: MATCHING_ARRAY_ITEM_TYPE.code || ``,
          filters: []
        }) || []).filter(i =>
          (i.metadata || {}).status === `active`
        ) || [];
      }
    }

    return arrays || {};
  } catch (e) {
    console.log(e);
    return {};
  }
}