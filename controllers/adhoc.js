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
      case `user_edit_image`: {
        data = await loadUserEditImage(obj);
        break;
      }
      case `component_sample`: {
        data = await loadComponentSample(obj);
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
    const ENFORCE_EMAIL_SIGNUP_ONLY = true;

    let name = d.name || ``;
    let icon_image_obj = d.icon_image_obj || {};
    let timezone = d.timezone || ``;
    let connections = d.connections || [];
    let stripe_subs = d.stripe_subs || [];
    let settings = d.settings || {};

    if (!(
      name &&
      icon_image_obj &&
      icon_image_obj.value &&
      icon_image_obj.format &&
      (connections.length >= 1) &&
      (
        ENFORCE_EMAIL_SIGNUP_ONLY ?
          connections.some(c =>
            (c.type === `email`) &&
            c.code
          )
          : true
      )
    )) {
      return null;
    }

    let new_user = (await dataflow.add({
      url: `add`,
      type: `user`,
      obj: {
        name,
        icon_image_url: ``,
        timezone,
        connections,
        stripe_subs,
        settings,
      }
    }) || {}).data || null;

    if (new_user && new_user.id) {
      let edit_image_res = await loadUserEditImage({
        image_value: icon_image_obj.value,
        image_format: icon_image_obj.format
      }) || ``

      if (edit_image_res === `done`) {
        let updated_user = await dataflow.get({
          all: false,
          type: `user`,
          id: new_user.id || ``,
        }) || null;

        if (updated_user && updated_user.id) {
          new_user = util.clone(updated_user);
        }
      }
    }

    return new_user || null;
  } catch (e) {
    console.log(e);
    return null;
  }
}

async function loadUserEditImage(d) {
  try {
    // note: handle `user.icon_image_url` based on `d.image_value/image_format<'url', 'base64'>` --- need to call util.imgUrlToBase64() if image_format is `url`

    let image_value = d.image_value || ``;
    let image_format = d.image_format || ``;
    let user_id = d.user_id || ``;
    
    if (!(
      image_value &&
      image_format &&
      user_id
    )) {
      return `error`;
    }

    let icon_image_base64 = ``;

    if (image_format === `base64`) {
      icon_image_base64 = image_value || ``;
    } else if (image_format === `url`) {
      icon_image_base64 = util.imgUrlToBase64(image_value) || ``;
    }

    let icon_image_extension = util.getImageExtensionFromBase64(icon_image_base64) || ``;

    // note: upload user's icon image to google cloud, retrieve the resulting image url, and set that image url in mongodb

    let icon_image_url = ``;

    if (icon_image_base64 && icon_image_extension) {
      icon_image_url = await gcloud.uploadImage(
        icon_image_base64,
        icon_image_extension,
        `user_icons`,
        `${user_id}_${util.getTimestamp()}`
      ) || ``;
    }

    await dataflow.edit({
      type: `user`,
      obj: {
        id: user_id,
        icon_image_url
      }
    });

    return `error`;
  } catch (e) {
    console.log(e);
    return `error`;
  }
}

async function loadComponentSample(d) {
  try {
    let sample_var = d.sample_var || ``;

    return {
      text: `The sample_var is "${sample_var || `n/a`}".`
    }
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