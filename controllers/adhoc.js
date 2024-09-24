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
      case `image_edit`: {
        data = await loadImageEdit(obj);
        break;
      }
      case `user_add`: {
        data = await loadUserAdd(obj);
        break;
      }
      case `user_edit`: {
        data = await loadUserEdit(obj);
        break;
      }
      case `user_generate_access_token`: {
        data = await loadUserGenerateAccessToken(obj);
        break;
      }
      case `user_login_by_access_token`: {
        data = await loadUserLoginByAccessToken(obj);
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

async function loadImageEdit(d) {
  try {
    // returns `done` || `error` - no socket_emit_obj

    // note: handle resulting image_url based on `d.image_value/image_format<'url', 'base64'>` --- need to call util.imgUrlToBase64() if `d.image_format` is `url`

    let item_type = d.item_type || ``;
    let item_id = d.item_id || ``;
    let item_image_prop = d.item_image_prop || ``;
    let image_directory = d.image_directory || ``;
    let image_value = d.image_value || ``;
    let image_format = d.image_format || ``;
    let prev_image_value = d.prev_image_value || ``; // note: optional

    if (!(
      item_type &&
      item_id &&
      item_image_prop &&
      image_directory &&
      image_value &&
      image_format
    )) {
      return `error`;
    }

    let matching_item = await dataflow.get({
      all: false,
      type: item_type,
      id: item_id
    }) || null;

    if (!(
      matching_item &&
      matching_item.id
    )) {
      return `error`;
    }

    let image_base64 = ``;

    if (image_format === `base64`) {
      image_base64 = image_value || ``;
    } else if (image_format === `url`) {
      image_base64 = await util.imgUrlToBase64(image_value) || ``;
    }

    let image_extension = util.getImageExtensionFromBase64(image_base64) || ``;

    // note: upload image to google cloud, retrieve the resulting image url, and set that image url in mongodb

    let image_url = ``;

    if (image_base64 && image_extension) {
      image_url = await gcloud.uploadImage(
        image_base64,
        image_extension,
        image_directory,
        `${item_id}_${util.getTimestamp()}`
      ) || ``;
    }

    let edit_obj = {
      id: item_id
    }

    edit_obj[item_image_prop] = image_url;

    await dataflow.edit({
      type: item_type,
      obj: edit_obj
    });

    if (prev_image_value) {
      await loadPrevImageHandle({
        item_type,
        item_id,
        prev_image_value
      });
    }

    return `done`;
  } catch (e) {
    console.log(e);
    return `error`;
  }
}

async function loadUserAdd(d) {
  // returns obj - no socket_emit_obj

  try {
    let arrays = await getMapArrays() || {};

    const ENFORCE_EMAIL_SIGNUP_ONLY = true;

    let name = d.name || ``;
    let icon_image_obj = d.icon_image_obj || {};
    let timezone = d.timezone || ``;
    let connections = d.connections || [];
    let stripe_subs = d.stripe_subs || [];
    let honoraries = d.honoraries || [];
    let settings = d.settings || {};

    if (!(
      name &&
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
      return { error: `Invalid vars` };
    }
    
    for (let connection of connections.slice()) {
      let matching_user = await dataflow.get({
        all: false,
        type: `user`,
        filters: [
          {
            prop: `connections`,
            value: {
              type: connection.type,
              code: connection.code
            },
            condition: `some`,
            options: []
          }
        ]
      }) || null;

      if (matching_user && matching_user.id) {
        // note: if matching user already exists, simply use the existing matching user , and don't add any new user
        let access_token = (await loadUserGenerateAccessToken({
          user_id: util.clone(matching_user.id) || ``,
        }) || {}).access_token || ``;

        return {
          user: util.mapItem(`user_self`, matching_user, arrays, {}),
          access_token_string: access_token.split(`_`)[1] || ``
        }
      }
    }

    let new_user = (await dataflow.add({
      type: `user`,
      obj: {
        name,
        icon_image_url: ``,
        timezone,
        connections,
        stripe_subs,
        honoraries,
        settings,
      }
    }) || {}).data || null;

    if (!(new_user && new_user.id)) return { error: `User could not be added` };
    
    let new_user_c = util.clone(new_user);

    if (
      icon_image_obj &&
      icon_image_obj.value &&
      icon_image_obj.format
    ) {
      let edit_image_res = await loadImageEdit({
        item_type: `user`,
        item_id: new_user_c.id,
        item_image_prop: `icon_image_url`,
        image_directory: `user_icons`,
        image_value: icon_image_obj.value,
        image_format: icon_image_obj.format,
        prev_image_value: ``
      }) || ``;

      if (edit_image_res === `done`) {
        let updated_user = await dataflow.get({
          all: false,
          type: `user`,
          id: new_user_c.id || ``,
        }) || null;

        if (updated_user && updated_user.id) {
          new_user = util.clone(updated_user);
        }
      }
    }

    let access_token = (await loadUserGenerateAccessToken({
      user_id: new_user_c.id || ``
    }) || {}).access_token || ``;

    return {
      user: util.mapItem(`user_self`, new_user, arrays, {}),
      access_token_string: access_token.split(`_`)[1] || ``
    } || { error: `Unknown error` };
  } catch (e) {
    console.log(e);
    return { error: `Unknown error` };
  }
}

async function loadUserEdit(d) {
  // returns obj - has socket_emit_obj

  try {
    let arrays = await getMapArrays() || {};

    let user_id = d.user_id || ``;
    let edit_obj = d.edit_obj || {};

    // check vars

    if (!(
      user_id &&
      edit_obj &&
      edit_obj.code &&
      edit_obj.name
    )) {
      return { error: `Invalid vars` };
    }

    // note: get matching user

    let matching_user = (arrays[`users`] || []).find(u => 
      u.id === user_id
    ) || null;

    if (!(matching_user && matching_user.id)) {
      return { error: `Matching user not found` };
    }

    let matching_user_c = util.clone(matching_user);

    // note: check if user with matching code exists

    let matching_code_user = (arrays[`users`] || []).find(u =>
      (util.sanitiseString(u.code) === util.sanitiseString(edit_obj.code)) &&
      (u.id !== matching_user.id)
    ) || null;
    
    if (matching_code_user && matching_code_user.id) {
      return { error: `User handle already in use` };
    }

    // note: handle possible edit_obj.icon_image_obj

    let icon_image_obj;
    
    if (
      edit_obj.icon_image_obj &&
      edit_obj.icon_image_obj.value &&
      edit_obj.icon_image_obj.format
    ) {
      icon_image_obj = util.clone(edit_obj.icon_image_obj);
      delete edit_obj.icon_image_obj;
    }

    // parse settings if any

    let edit_settings_obj = {};

    if ((Object.keys(edit_obj.settings || {}).length >= 1)) {
      for (let key of Object.keys(edit_obj.settings || {})) {
        edit_settings_obj[key] = (edit_obj.settings || {})[key] || null;
      }
    }

    if (Object.keys(edit_settings_obj || {}).length >= 1) {
      edit_obj[`settings`] = {
        ...(matching_user_c.settings || {}),
        ...edit_settings_obj
      }
    }

    // note: edit user
    
    let updated_user = (await dataflow.edit({
      type: `user`,
      obj: {
        id: user_id,
        ...(edit_obj || {})
      }
    }) || {}).data || null;

    if (!(updated_user && updated_user.id)) return { error: `User could not be edited` };
    
    let updated_user_c = util.clone(updated_user);

    // note: edit user's icon image if icon_image_obj is present

    if (icon_image_obj) {
      let edit_image_res = await loadImageEdit({
        item_type: `user`,
        item_id: updated_user_c.id,
        item_image_prop: `icon_image_url`,
        image_directory: `user_icons`,
        image_value: icon_image_obj.value,
        image_format: icon_image_obj.format,
        prev_image_value: (matching_user_c.icon_image_url || ``).trim() || ``
      }) || ``;
  
      if (edit_image_res === `done`) {
        let updated_image_user = await dataflow.get({
          all: false,
          type: `user`,
          id: updated_user_c.id || ``,
        }) || null;
  
        if (updated_image_user && updated_image_user.id) {
          updated_user = util.clone(updated_image_user);
        }
      }
    } else if (edit_obj.icon_image_url === ``) {
      await loadPrevImageHandle({
        item_type: `user`,
        item_id: updated_user_c.id,
        prev_image_value: (matching_user_c.icon_image_url || ``).trim() || ``
      });
    }
    
    return {
      user: util.mapItem(`user_self`, updated_user, arrays, {}),
      socket_emit_obj: {
        user: util.mapItem(`user`, updated_user, arrays, {}), // note: map item with public-facing `user` type here, instead of `user_self`
      }
     } || { error: `Unknown error` };
  } catch (e) {
    console.log(e);
    return { error: `Unknown error` };
  }
}

async function loadUserGenerateAccessToken(d) {
  try {
    // returns obj - no socket_emit_obj

    let user_id = d.user_id || ``;
    let access_token_string = d.access_token_string || ``; // format: 20-char string --- note: optional, pass value in certain scenarios, eg. for logging in inside component: generate access token in component, and pass value into this function, so when user authorises from website and socket emits access token, it can be compared against the previously generated access token, and thus login inside component can be authorised

    if (!user_id) {
      return { error: `Invalid vars` };
    }

    let matching_user = await dataflow.get({
      all: false,
      type: `user`,
      id: user_id
    }) || null;

    if (!(matching_user && matching_user.id)) {
      return { error: `Matching user not found` };
    }

    let matching_user_c = util.clone(matching_user);

    let updated_user = (await dataflow.edit({
      type: `user`,
      obj: {
        id: matching_user_c.id,
        metadata: {
          ...matching_user_c.metadata,
          access_token: util.generateAccessToken(access_token_string || ``) || ``
        }
      }
    }) || {}).data || null;

    if (!(updated_user && updated_user.id)) {
      return { error: `Matching user couldn't be updated` };
    }

    // note: return access_token_string, rather than entire access_token, given that access_token format is `<access_token_timestamp>_<access_token_string>`
    return { access_token: (updated_user.metadata || {}).access_token || `` } || { error: `Unknown error` };
  } catch (e) {
    console.log(e);
    return { error: `Unknown error` };
  }
}

async function loadUserLoginByAccessToken(d) {
  try {
    // returns obj - has socket_emit_obj (optional, only received if function called through socket, to facilitate eg. login flow from inside component)

    var arrays = await getMapArrays() || {};

    let user_id = d.user_id || ``;
    let access_token_string = d.access_token_string || ``;

    if (!(
      user_id &&
      access_token_string
    )) {
      return { error: `Invalid vars` };
    }

    let matching_user = await dataflow.get({
      all: false,
      type: `user`,
      id: user_id
    }) || null;

    if (
      matching_user &&
      matching_user.id
    ) {
      let matching_user_c = util.clone(matching_user);

      let existing_access_token = (matching_user_c.metadata || {}).access_token || ``;

      if (!existing_access_token) {
        return null;
      }

      await dataflow.edit({
        type: `user`,
        obj: {
          id: matching_user_c.id || ``,
          metadata: {
            ...(matching_user_c.metadata || {}),
            access_token: `` // note: reset access token once used
          }
        }
      });

      let existing_access_token_frags = existing_access_token.split(`_`) || [];
      let existing_access_token_timestamp = existing_access_token_frags[0] || null;
      let existing_access_token_string = existing_access_token_frags[1] || ``;

      let seconds_since_token_timestamp = util.getTimestampDiff(existing_access_token_timestamp, util.getTimestamp(), `seconds`);

      if (
        (seconds_since_token_timestamp >= 0) &&
        (seconds_since_token_timestamp <= 60) &&
        (existing_access_token_string === access_token_string)
      ) {
        return {
          user: util.mapItem(`user_self`, matching_user, arrays, {}),
          socket_emit_obj: {
            user: util.mapItem(`user_self`, matching_user, arrays, {}),
            access_token_string: access_token_string || ``
          }
        }
      } else {
        return { error: `Access token expired` };
      }
    } else {
      return { error: `Matching user not found` };
    }
  } catch (e) {
    console.log(e);
    return { error: `Unknown error` };
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

async function loadPrevImageHandle(d) {
  try {
    let item_type = d.item_type || ``;
    let item_id = d.item_id || ``;
    let prev_image_value = d.prev_image_value || ``;

    if (!(
      item_type &&
      item_id &&
      prev_image_value
    )) {
      return `error`;
    }

    let matching_item = await dataflow.get({
      all: false,
      type: item_type,
      id: item_id
    }) || null;

    if (!(
      matching_item &&
      matching_item.id
    )) {
      return `error`;
    }

    let edit_obj = {
      id: item_id
    }

    if (
      prev_image_value &&
      !((matching_item.metadata || {}).prev_gcloud_image_urls || []).includes(prev_image_value)
    ) {
      edit_obj.metadata = {
        ...(matching_item.metadata || {}),
        prev_gcloud_image_urls: [
          ...((matching_item.metadata || {}).prev_gcloud_image_urls || []),
          prev_image_value
        ]
      }
    }

    await dataflow.edit({
      type: item_type,
      obj: edit_obj
    });

    return `done`;
  } catch (e) {
    console.log(e);
    return `error`;
  }
}

async function delAssociatedItems(parent_item_type, parent_item_ident_value, keys, arrays) {
  try {
    if (!(parent_item_type && parent_item_ident_value && keys && arrays)) return;

    for (let key of keys) {
      const MATCHING_ITEM_TYPE = ITEM_TYPES.find(T => T.code === key) || null;
  
      if (MATCHING_ITEM_TYPE) {
        for (let item of (arrays[MATCHING_ITEM_TYPE.plural_code] || []).filter(i => {
          try {
            switch (MATCHING_ITEM_TYPE.code) {
              // todo: item types

              // case `votes`: {
              //   if (parent_item_type === `user`) {
              //     return (i.user_id === parent_item_ident_value) || false;
              //   } else {
              //     return false;
              //   }
              // }
              
              default: {
                return false;
              }
            }
          } catch (e) {
            console.log(e);
            return false;
          }
        }).slice()) {
          await dataflow.del({
            type: MATCHING_ITEM_TYPE.code || ``,
            id: item.id || ``
          });
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
}