// config

require(`dotenv`).config();

const express = require(`express`);
const fileUpload = require('express-fileupload');
const compression = require(`compression`);
const app = express();
const {
  AttachmentBuilder,
  Client,
  EmbedBuilder,
  Partials,
  IntentsBitField,
} = require(`discord.js`);

let adhoc = require(`./controllers/adhoc`);
let dataflow = require(`./controllers/dataflow`);
let processes = require(`./controllers/processes`);
let cache = require(`./utils/cache`);
let gcloud = require(`./utils/gcloud`);
let mongo = require(`./utils/mongo`);
let rest = require(`./utils/rest`);
let util = require(`./utils/util`);

let port = process.env.PORT || 3001;
let API_KEY = process.env.API_KEY;

let jobs = [];
let maintenance_timestamp = null;
let stats = {
  enter_total_count: 0,
  enter_user_count: 0,
  enter_guest_count: 0,
}

// ---- app & server

app.use(express.json({ limit: `50mb`, extended: true }));
app.use(compression());
app.use(
  fileUpload({
    limits: {
      fileSize: 10000000, // note: limit any file objects (eg. images) that get sent in from frontend to be under ~10mb --- reference: https://pqina.nl/blog/upload-image-with-nodejs/
    },
    abortOnLimit: true,
  })
);


const server = app.listen(port, async () => {
  console.log(`up on http://localhost:${port}`);
  await mongo.connect();
  await gcloud.connect();
  await processes.start({ name: `cache`, payload: {} }); // note: await cache proces before any others
  processes.start({ name: `stripe_sub`, payload: {} });
  // processes.start({ name: `your_object_name`, payload: { /*...*/ } });
});

// const { Server } = require(`socket.io`);
const io = require(`socket.io`)(server, {
  cors: {
    origin: [
      `http://localhost:3000`,
      `https://www.ollesocket.vercel.app`,
      `https://ollesocket.vercel.app`,
    ],
  },
});

app.use(function (req, res, next) {
  let auth_origins = [
    `http://localhost:3000`,
    `https://www.ollesocket.vercel.app`,
    `https://ollesocket.vercel.app`,
  ];

  // Website you wish to allow to connect
  // res.setHeader("Access-Control-Allow-Origin", "*");
  let origin = req.headers.origin;
  if (
    auth_origins.includes(origin) &&
    (util.isEmptyObj(req.body) || req.headers.x_api_key === API_KEY)
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );
  // Request headers you wish to allow
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type,x_api_key"
  );
  // Set to true if you need the website to include cookies in the requests sent to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", true);
  // Pass to next layer of middleware
  next();
});

app.get(`/`, (req, res) => {
  res.send(`Ollesocket API`);
});

io.on(`connection`, (socket) => {
  /*
    post routes
    - /get {id, type, filters!}
    - /get_many {type, filters}
    - /add {obj, type}
    - /edit {obj, type}
    - /del {id, type}
    - /pull {obj, type}
  */

  socket.on(`init`, async (d, callback) => {
    if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
    else callback(
      await util.getRes({
        res: `ok`,
        act: `get`,
        type: `init`,
        data: processes.init(),
      })
    );
  });

  // socket.on(`connect`, async (d, callback) => {
  //   // { user_id, page_code }
  //   // io.emit(`connect`, d);
  //   // callback(
  //   //   process.init().cache ?
  //   // )

  //   if (process.init().cache) {
  //     io.emit(`connect_res`, await dataflow.add(d));
  //   }
  // });

  // socket.on(`new_instance`, async (d, callback) => {
  //   if (processes.init().cache) {
  //     let new_obj = await dataflow.add(d);

  //     socket.emit(
  //       `new_instance_update`,
  //       await dataflow.getMany({
  //         type: `io_instance`,
  //         filters: [],
  //       })
  //     );

  //     callback(new_obj || util.getWaitCacheRes());
  //   }
  // });

  socket.on(`load`, async (d, callback) => {
    if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
    else if (!processes.init().cache) {
      callback(util.getWaitCacheRes());
    } else {
      if (d.is_cache_request && !util.isEmptyObj(d.cache_get_params)) {
        // console.log(`------------------- initial data`);
        // console.log(d);

        let cache_obj = await dataflow.get(d.cache_get_params);

        callback(cache_obj);

        // console.log(`------------------- cache obj`);
        // console.log(cache_obj);

        let updated_obj = await adhoc.load(d);

        // console.log(`------------------- load params`);
        // console.log(d);

        if (!util.isEmptyObj(updated_obj)) {
          await dataflow.add({
            type: d.type,
            obj: updated_obj.data,
          });

          cache_obj = await dataflow.get(d.cache_get_params);

          // console.log(`------------------- updated obj`);
          // console.log(updated_obj);

          // console.log(`------------------- new cache obj`);
          // console.log(cache_obj);

          socket.emit(`new_load_${d.type}`, cache_obj);
        }
      } else {
        callback(await adhoc.load(d));
      }
    }
  });

  socket.on(`get`, async (d, callback) => {
    if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
    else callback(
      processes.init().cache ? await dataflow.get(d) : util.getWaitCacheRes()
    );
  });

  socket.on(`get_many`, async (d, callback) => {
    if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
    else callback(
      processes.init().cache
        ? await dataflow.getMany(d)
        : util.getWaitCacheRes()
    );
  });

  socket.on(`add`, async (d, callback) => {
    if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
    else callback(
      processes.init().cache ? await dataflow.add(d) : util.getWaitCacheRes()
    );
  });

  socket.on(`edit`, async (d, callback) => {
    if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
    else callback(
      processes.init().cache ? await dataflow.edit(d) : util.getWaitCacheRes()
    );
  });

  socket.on(`del`, async (d, callback) => {
    if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
    else callback(
      processes.init().cache ? await dataflow.del(d) : util.getWaitCacheRes()
    );
  });

  socket.on(`pull`, async (d, callback) => {
    if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
    else callback(
      processes.init().cache ? await dataflow.pull(d) : util.getWaitCacheRes()
    );
  });

  // space

  // socket.on(`space_enter`, async (d, callback) => {
  //   try {
  //     ioRefreshObjects();
      
  //     callback({});
  //   } catch (e) {
  //     console.log(e);
  //   }
  // });

  // socket.on(`space_add_object`, async (d, callback) => {
  //   try {
  //     await spaceAddObject(d);
  //     callback({});
  //   } catch (e) {
  //     console.log(e);
  //   }
  // });

  // socket.on(`space_edit_object`, async (d, callback) => {
  //   try {
  //     await spaceEditObject(d);
  //     callback({});
  //   } catch (e) {
  //     console.log(e);
  //   }
  // });
});

// "space" funcs

// async function spaceAddObject(d) {
//   try {
//     let matching_object = await dataflow.get({
//       all: false,
//       type: `object`,
//       id: d.object_id || ``,
//     });

//     if (matching_object) {
//       await dataflow.add({
//         type: `object`,
//         obj: {
//           //
//         },
//       });
      
//       ioRefreshObjects();
//     }
//   } catch (e) {
//     console.log(e);
//   }
// }

// async function spaceEditObject(d) {
//   try {
//     let matching_object = await dataflow.get({
//       all: false,
//       type: `object`,
//       id: d.object_id || ``,
//     });

//     if (matching_object) {
//       await dataflow.edit({
//         type: `object`,
//         obj: {
//           // 
//         },
//       });
      
//       ioRefreshObjects();
//     } else {
//       await spaceAddObj(d);
//     }
//   } catch (e) {
//     console.log(e);
//   }
// }

// io emits

// async function ioRefreshObjects() {
//   try {
//     let objects = await dataflow.getMany({
//       all: false,
//       type: `object`,
//       filters: [],
//     });
    
//     io.emit(`refresh_objects`, {
//       objects,
//     });
//   } catch (e) {
//     console.log(e);
//   }
// }

// io refresh

// initIoObjectRefresh();

// async function initIoObjectRefresh() {
//   try {
//     await util.wait(30);

//     if (processes.init().cache) {
//       ioRefreshObjects();
//       console.log(`executed io refresh - object`) 
//     } else {
//       console.log(`unable to execute io refresh - object (cache not initiated). trying again in 30 seconds.`)
//     }
//   } catch (e) {
//     console.log(e);
//   } finally {
//     initIoObjectRefresh();
//   }
// }

// maintenance io emits

async function ioRefreshMaintenanceTimestamp(d) {
  try {
    io.emit(`refresh_maintenance_timestamp`, {
      maintenance_timestamp,
    });
  } catch (e) {
    console.log(e);
  }
}

// maintenance io refresh

initIoMaintenanceRefresh();

async function initIoMaintenanceRefresh() {
  try {
    await util.wait(30);

    ioRefreshMaintenanceTimestamp();
  } catch (e) {
    console.log(e);
  } finally {
    initIoMaintenanceRefresh();
  }
}

// rest

app.post(`/init`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send(
    await util.getRes({
      res: `ok`,
      act: `get`,
      type: `init`,
      data: processes.init(),
    })
  );
});

app.post(`/get`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send(
    processes.init().cache
      ? await dataflow.get(fe.body)
      : util.getWaitCacheRes()
  );
});

app.post(`/get_many`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send(
    processes.init().cache
      ? await dataflow.getMany(fe.body)
      : util.getWaitCacheRes()
  );
});

app.post(`/add`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send(
    processes.init().cache
      ? await dataflow.add(fe.body)
      : util.getWaitCacheRes()
  );
});

app.post(`/edit`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send(
    processes.init().cache
      ? await dataflow.edit(fe.body)
      : util.getWaitCacheRes()
  );
});

app.post(`/del`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send(
    processes.init().cache
      ? await dataflow.del(fe.body)
      : util.getWaitCacheRes()
  );
});

app.post(`/pull`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send(
    processes.init().cache
      ? await dataflow.pull(fe.body)
      : util.getWaitCacheRes()
  );
});

app.post(`/load`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send(
    processes.init().cache ? await adhoc.load(fe.body) : util.getWaitCacheRes()
  );
});

app.post(`/enter`, async (fe, api) => {
  try {
    let user_id = fe.body.user_id || ``;

    stats.enter_total_count += 1;

    if (user_id) {
      stats.enter_user_count += 1;
    } else {
      stats.enter_guest_count += 1;
    }

    api.send({
      data: `done`
    });
  } catch (e) {
    console.log(e);
    api.send({
      data: `error`
    });
  }
});

app.post(`/stripe`, async (fe, api) => {
  try {
    // tba (stripe): set up stripe webhook from stripe's dashboard --- call utils->stripe.handleEvent(fe.body, is_event_parsed:false) --- see stripe.js "references" notes for reference
    
    api.send({
      data: null
    });
  } catch (e) {
    console.log(e);
    api.send({
      data: `error`
    });
  }
});

// stats

statsRefresh();

async function statsRefresh() {
  try {
    await util.wait(60);

    // tba (misc): clone `stats` obj to temp var, reset `stats`, then call `dataflow.edit()` to update `stat:code="enter".data.total_count/guest_count/user_count` to increment with the aforementioned temp var's values
  } catch (e) {
    console.log(e);
  } finally {
    statsRefresh();
  }
}

// maintenace timestamp

app.post(`/get_maintenance_timestamp`, async (fe, api) => {
  if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
  else api.send({
    data: maintenance_timestamp || null
  });
});

app.get(`/get_maintenance_timestamp`, async (fe, api) => {
  try {
    let key = fe.query.key || ``;
    
    if (key !== API_KEY) {
      api.send({
        data: `wrong key`
      });
    } else {
      api.send({
        data: maintenance_timestamp || null
      }); 
    }
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.get(`/set_maintenance_timestamp`, async (fe, api) => {
  try {
    let key = fe.query.key || ``;
    let t_mins = fe.query.t_mins || `empty`;

    if (key !== API_KEY) {
      api.send({
        data: `wrong key`
      });
    } else if (t_mins === `empty`) {
      maintenance_timestamp = null;

      api.send({
        data: `done - set to empty (null)`
      });
    } else if (Number(t_mins) === NaN) {
      api.send({
        data: `error - NaN`
      });
    } else {
      maintenance_timestamp = util.alterTimestamp(`add`, t_mins || 1, `minutes`, util.getTimestamp());

      api.send({
        data: `done - set to ${maintenance_timestamp}`
      });
    }
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

// get routes

// app.get(`/`, (req, res) => {
//   res.send(`Suave API`);
// });

app.get(`/cache/:type`, async (fe, api) => {
  let key = fe.query.key || ``;
  
  if (key !== API_KEY) {
    api.send({
      data: `wrong key`
    });
  } else {
    api.send(
      await cache.getMany({
        type: fe.params.type,
        filters: [],
      })
    );
  }
});

// app.get(`/test`, async (req, res) => {
//   //
// });

// ---- discord bot

// let DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
// let DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;

// const discord_intents = new IntentsBitField();
// discord_intents.add(
//   IntentsBitField.Flags.Guilds,
//   IntentsBitField.Flags.GuildMembers
// );

// const discord_bot = new Client({
//   intents: discord_intents,
//   partials: [Partials.GuildMember],
// });

// discord_bot.login(DISCORD_BOT_TOKEN);

// discord_bot.once(`ready`, async () => {
//   console.log(`Discord bot ready`);
//   startDiscordBoundProcesses();
// });


// async function startDiscordBoundProcesses() {
//   try {
//     if (cache_initiated) {
//       // note: wait for `cache` process to init
//       while (!processes.init().cache) {
//         await util.wait(5);
//       }

//       processes.start({ name: `user`, payload: { discord_client: discord_bot } });

//       // processes.start({ name: `your_object_name`, payload: { discord_client: discord_bot } });

//       // while (!(processes.init()[`your_object_name`])) {
//       //   await util.wait(5);
//       // }

//       // // note: `another_object_name` process relies on `your_object_name` process(es)
//       // processes.start({ name: `another_object_name`, payload: { discord_client: discord_bot } });
//     } else {
//       await util.wait(5);
//       startDiscordBoundProcesses();
//     }
//   } catch (e) {
//     console.log(e);
//   }
// }

// discord_bot.on(`interactionCreate`, async (interaction) => {
//   if (!interaction.isCommand()) return;

//   // let errors = [];
//   let is_private_command = interaction.options.getBoolean(`private`);

//   const { commandName } = interaction;
//   switch (commandName) {
//     case `ping`: {
//       await interaction.reply(`pong!`);
//       break;
//     }

//     case `user`: {
//       switch (interaction.options.getSubcommand()) {
//         case `view`: {
//           if (is_private_command === null) {
//             is_private_command = true;
//           }

//           let name = interaction.options.getString(`name`);

//           let embed = new EmbedBuilder()
//             .setColor(`#BAE8F9`)
//             .setAuthor({
//               name: `Test command`,
//               iconURL: ``,
//               url: `https://ollesocket.vercel.app`,
//             })
//             .addFields([
//               {
//                 name: `Viewing user`,
//                 value: name,
//               },
//             ]);

//           await interaction.reply({
//             embeds: [embed],
//             ephemeral: is_private_command,
//           });

//           break;
//         }
//       }

//       break;
//     }
//   }
// });

// // ---- discord bot command config

// const { SlashCommandBuilder } = require("@discordjs/builders");
// const { REST } = require("@discordjs/rest");
// const { Routes } = require("discord-api-types/v9");

// registerDiscordBotCommands();

// function registerDiscordBotCommands() {
//   const commands = [
//     new SlashCommandBuilder().setName(`ping`).setDescription(`Ping the bot.`),

//     new SlashCommandBuilder()
//       .setName(`user`)
//       .setDescription(`Related to users.`)
//       .addSubcommand((subcmd) =>
//         subcmd
//           .setName(`view`)
//           .setDescription(`View user.`)
//           .addStringOption((option) =>
//             option.setName(`name`).setDescription(`Name.`).setRequired(true)
//           )
//           .addBooleanOption((option) =>
//             option
//               .setName(`private`)
//               .setDescription(`Private query? True by default.`)
//               .setRequired(false)
//           )
//       ),
//   ].map((command) => command.toJSON());

//   const rest = new REST({ version: `9` }).setToken(DISCORD_BOT_TOKEN);

//   rest
//     .put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
//       body: commands,
//     })
//     .then(() => console.log(`Successfully registered Discord bot commands.`))
//     .catch(console.error);
// }
