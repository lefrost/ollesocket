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
    return util.getRes({
      res: `ok`,
      act: `get`,
      type: d.type,
      data: await cache.get(d),
    });
  } catch (e) {
    return util.getRes({ res: `no`, act: `get`, type: d.type, data: null });
  }
}

async function getMany(d) {
  try {
    return util.getRes({
      res: `ok`,
      act: `get_many`,
      type: d.type,
      data: await cache.getMany(d),
    });
  } catch (e) {
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
          d.obj[key] !== null &&
          d.obj[key] !== undefined
        ) {
          if (editable_data.attributes.numerics.includes(key)) {
            edits[key] = Number(d.obj[key]);
          } else if (editable_data.attributes.booleans.includes(key)) {
            edits[key] = Boolean(d.obj[key]);
          } else {
            edits[key] = d.obj[key];
          }
        }
      }

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
        obj = {
          id: d.obj.id,
          ...edits,
        };
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
