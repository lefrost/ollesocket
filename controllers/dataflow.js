let addable = require(`../structures/addable`);
let deletable = require(`../structures/deletable`);
let editable = require(`../structures/editable`);

let cache = require(`../utils/cache`);
let util = require(`../utils/util`);
let mongo = require(`../utils/mongo`);

module.exports = {
  get: async (d) => {
    return await get(d);
  },

  getMany: async (d) => {
    return await getMany(d);
  },

  add: async (d) => {
    return await add(d);
  },

  edit: async (d) => {
    return await edit(d);
  },

  del: async (d) => {
    return await del(d);
  },

  pull: async (d) => {
    return await pull(d);
  },
};

async function get(d) {
  try {
    let obj = util.clone(await cache.get(d));

    return d.all === false
      ? obj
      : util.getRes({
          res: `ok`,
          act: `get`,
          type: d.type,
          data: obj,
        });
  } catch (e) {
    return util.getRes({ res: `no`, act: `get`, type: d.type, data: null });
  }
}

async function getMany(d) {
  try {
    let objs = util.clone((await cache.getMany(d)) || []);
    
    if (d.skip && d.skip > 0) {
      objs.splice(0, d.skip); // https://bobbyhadz.com/blog/javascript-remove-first-n-elements-from-array
    }

    if (d.count && d.count > 0) {
      objs = objs.slice(0, d.count); // https://stackoverflow.com/a/34883171/8919391
    }

    return d.all === false
      ? objs
      : util.getRes({
          res: `ok`,
          act: `get_many`,
          type: d.type,
          data: objs,
        });
  } catch (e) {
    console.log(e);
    return util.getRes({
      res: `no`,
      act: `get_many`,
      type: d.type,
      data: null,
    });
  }
}

async function add(d) {
  try {
    let addable_data = await addable.get({ obj: d.obj, type: d.type });

    if (addable_data && addable_data.obj) {
      if (addable_data.pullable) {
        await pull({ obj: d.obj, type: d.type });
      }

      let obj;

      if (addable_data.in_database) {
        await mongo.addOne(addable_data.collection_name, addable_data.obj);

        obj = await mongo.getOne(addable_data.collection_name, {
          id: addable_data.obj.id,
        });
      } else {
        obj = addable_data.obj;
      }

      await cache.set({ obj });

      return util.getRes({ res: `ok`, act: `add`, type: d.type, data: obj });
    }

    return util.getRes({ res: `no`, act: `add`, type: d.type, data: null });
  } catch (e) {
    console.log(e);
    return util.getRes({ res: `no`, act: `add`, type: d.type, data: null });
  }
}

async function edit(d) {
  try {
    let edits = {};
    let increments = {};

    let editable_data = await editable.get({ type: d.type });

    if (editable_data) {
      for (let key of Object.keys(d.obj)) {
        if (
          editable_data.attributes.editables.includes(key) &&
          // d.obj[key] !== null &&
          d.obj[key] !== undefined
        ) {
          if (editable_data.attributes.numerics.includes(key)) {
            edits[key] = (d.obj[key] === null) ? null : Number(d.obj[key]);
          } else if (editable_data.attributes.booleans.includes(key)) {
            edits[key] = (d.obj[key] === null) ? null : Boolean(d.obj[key]);
          } else {
            edits[key] = d.obj[key];
          }
        }
      }

      edits[`metadata.edit_timestamp`] = util.getTimestamp();

      let obj;

      if (editable_data.in_database) {
        await mongo.updateOne(
          editable_data.collection_name,
          { id: d.obj.id },
          { $set: edits, $inc: increments }
        );

        obj = await mongo.getOne(editable_data.collection_name, {
          id: d.obj.id,
        });
      } else {
        let matching_obj = await cache.get({
          type: d.type,
          id: d.obj.id,
        });

        if (!util.isEmptyObj(matching_obj)) {
          obj = {
            ...matching_obj,
            ...edits,
          };
        }
      }

      await cache.set({ obj });

      return util.getRes({ res: `ok`, act: `edit`, type: d.type, data: obj });
    }

    return util.getRes({ res: `no`, act: `edit`, type: d.type, data: null });
  } catch (e) {
    console.log(e);
    return util.getRes({ res: `no`, act: `edit`, type: d.type, data: null });
  }
}

async function del(d) {
  try {
    let deletable_data = await deletable.get({ type: d.type });

    if (deletable_data) {
      if (deletable_data.in_database) {
        await mongo.deleteOne(deletable_data.collection_name, { id: d.id });
      }

      await cache.del({ id: d.id, type: d.type });

      return util.getRes({ res: `ok`, act: `del`, type: d.type, data: null });
    }

    return util.getRes({ res: `no`, act: `del`, type: d.type, data: null });
  } catch (e) {
    return util.getRes({ res: `no`, act: `del`, type: d.type, data: null });
  }
}

async function pull(d) {
  try {
    // {obj, type}
    let deletable_data = await deletable.get({ type: d.type });

    if (deletable_data) {
      let filters = [
        {
          prop: `metadata.type`,
          value: d.type,
          condition: `match`,
          options: [],
        },
      ];

      for (let key of Object.keys(d.obj)) {
        if (deletable_data.pullable_attributes.includes(key)) {
          filters.push({
            prop: key,
            value: d.obj[key] || ``,
            condition: `match`,
            options: [],
          });
        }
      }

      let matches = (await getMany({ type: d.type, filters })).data;

      for (let match of matches) {
        if (deletable_data.in_database) {
          await mongo.deleteOne(deletable_data.collection_name, {
            id: match.id,
          });
        }

        await cache.del({ id: match.id, type: d.type });
      }

      return util.getRes({ res: `ok`, act: `pull`, type: d.type, data: null });
    }

    return util.getRes({ res: `no`, act: `pull`, type: d.type, data: null });
  } catch (e) {
    return util.getRes({ res: `no`, act: `pull`, type: d.type, data: null });
  }
}
