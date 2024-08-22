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
let stripe = require(`./utils/stripe`);
let util = require(`./utils/util`);

let PORT = process.env.PORT || 3001;
let API_KEY = process.env.API_KEY;
let PROJECT_LINK = process.env.PROJECT_LINK;
let PROJECT_NAME = process.env.PROJECT_NAME;

let jobs = [];
let maintenance_timestamp = null;
// let stats = {
//   enter_total_count: 0,
//   enter_user_count: 0,
//   enter_guest_count: 0,
// }

// ---- app & server

const raw_endpoints = [`/stripe`];

for (let raw_endpoint of raw_endpoints) {
  // note: use express.raw for endpoints that require raw req.body, eg. `/stripe` - https://stackoverflow.com/a/67531558/8919391
  app.use(raw_endpoint, express.raw({type: `*/*`}));
}

app.use(express.json({ limit: `50mb`, extended: true }));
app.use(compression());
app.use(
  fileUpload({
    limits: {
      fileSize: 10000000, // note: limit any file objects (eg. images) that get sent in from frontend to be under ~10mb --- ref: https://pqina.nl/blog/upload-image-with-nodejs/
    },
    abortOnLimit: true,
  })
);

const server = app.listen(PORT, async () => {
  console.log(`up on http://localhost:${PORT}`);
  // await mongo.connect(); // todo: setup mongo
  // await gcloud.connect(); // todo: setup gcloud

  // todo: activate processes
  // await processes.start({ name: `cache`, payload: {} }); // note: await cache proces before any others
  // processes.start({ name: `stripe_sub`, payload: {} });
  // processes.start({ name: `user`, payload: {} });

  // processes.start({ name: `your_object_name`, payload: { /*...*/ } });
});

// const { Server } = require(`socket.io`);
const io = require(`socket.io`)(server, {
  // cors: {
  //   origin: [
  //     `http://localhost:${PORT}`,
  //     `https://www.${PROJECT_LINK}`,
  //     `https://${PROJECT_LINK}`,
  //   ],
  // },
});

app.use(function (req, res, next) {
  if (raw_endpoints.includes(req.originalUrl)) {
    // note: skip code block below if raw endpoint is connecting, eg. webhook for `/stripe`
    next();
  } else {
    // let auth_origins = [
    //   `http://localhost:${PORT}`,
    //   `https://www.${PROJECT_LINK}`,
    //   `https://${PROJECT_LINK}`,
    // ];

    // Website you wish to allow to connect
    // res.setHeader("Access-Control-Allow-Origin", "*");
    // let origin = req.headers.origin;
    if (
      // auth_origins.includes(origin) &&
      (util.isEmptyObj(req.body) || [API_KEY, `component`].includes(req.headers.x_api_key)) // note: allow `component` calls to access
    ) {
      // res.setHeader("Access-Control-Allow-Origin", "origin");
      res.setHeader("Access-Control-Allow-Origin", "*");
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
  }
});

app.get(`/`, (fe, api) => {
  try {
    api.send(`${PROJECT_NAME} API`);
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
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
    try {
      if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
      else callback(
        await util.getRes({
          res: `ok`,
          act: `get`,
          type: `init`,
          data: processes.init(),
        })
      );
    } catch (e) {
      console.log(e);
      callback({data: `error`});
    }
  });

  // socket.on(`connect`, async (d, callback) => {
  //   try {
  //     // { user_id, page_code }
  //     // io.emit(`connect`, d);
  //     // callback(
  //     //   process.init().cache ?
  //     // )
  
  //     if (process.init().cache) {
  //       io.emit(`connect_res`, await dataflow.add(d));
  //     }
  //   } catch (e) {
  //     console.log(e);
  //     callback({data: `error`});
  //   }
  // });

  // socket.on(`new_instance`, async (d, callback) => {
  //   try {
  //     if (processes.init().cache) {
  //       let new_obj = await dataflow.add(d);
  
  //       socket.emit(
  //         `new_instance_update`,
  //         await dataflow.getMany({
  //           type: `io_instance`,
  //           filters: [],
  //         })
  //       );
  
  //       callback(new_obj || util.getWaitCacheRes());
  //     }
  //   } catch (e) {
  //     console.log(e);
  //     callback({data: `error`});
  //   }
  // });

  socket.on(`load`, async (d, callback) => {
    try {
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
    } catch (e) {
      console.log(e);
      callback({data: `error`});
    }
  });

  socket.on(`get`, async (d, callback) => {
    try {
      if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
      else callback(
        processes.init().cache ? await dataflow.get(d) : util.getWaitCacheRes()
      );
    } catch (e) {
      console.log(e);
      callback({data: `error`});
    }
  });

  socket.on(`get_many`, async (d, callback) => {
    try {
      if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
      else callback(
        processes.init().cache
          ? await dataflow.getMany(d)
          : util.getWaitCacheRes()
      );
    } catch (e) {
      console.log(e);
      callback({data: `error`});
    }
  });

  socket.on(`add`, async (d, callback) => {
    try {
      if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
      else callback(
        processes.init().cache ? await dataflow.add(d) : util.getWaitCacheRes()
      );
    } catch (e) {
      console.log(e);
      callback({data: `error`});
    }
  });

  socket.on(`edit`, async (d, callback) => {
    try {
      if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
      else callback(
        processes.init().cache ? await dataflow.edit(d) : util.getWaitCacheRes()
      );
    } catch (e) {
      console.log(e);
      callback({data: `error`});
    }
  });

  socket.on(`del`, async (d, callback) => {
    try {
      if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
      else callback(
        processes.init().cache ? await dataflow.del(d) : util.getWaitCacheRes()
      );
    } catch (e) {
      console.log(e);
      callback({data: `error`});
    }
  });

  socket.on(`pull`, async (d, callback) => {
    try {
      if (socket.handshake.headers.x_api_key !== API_KEY) callback({error: `Unauthorised.`});
      else callback(
        processes.init().cache ? await dataflow.pull(d) : util.getWaitCacheRes()
      );
    } catch (e) {
      console.log(e);
      callback({data: `error`});
    }
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
  try {
    // note: allow `component` calls to access /init
    if (![API_KEY, `component`].includes(fe.headers.x_api_key)) api.send({error: `Unauthorised.`});
    else api.send(
      await util.getRes({
        res: `ok`,
        act: `get`,
        type: `init`,
        data: processes.init(),
      })
    );
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.post(`/get`, async (fe, api) => {
  try {
    if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
    else api.send(
      processes.init().cache
        ? await dataflow.get(fe.body)
        : util.getWaitCacheRes()
    );
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.post(`/get_many`, async (fe, api) => {
  try {
    if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
    else api.send(
      processes.init().cache
        ? await dataflow.getMany(fe.body)
        : util.getWaitCacheRes()
    );
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.post(`/add`, async (fe, api) => {
  try {
    if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
    else api.send(
      processes.init().cache
        ? await dataflow.add(fe.body)
        : util.getWaitCacheRes()
    );
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.post(`/edit`, async (fe, api) => {
  try {
    if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
    else api.send(
      processes.init().cache
        ? await dataflow.edit(fe.body)
        : util.getWaitCacheRes()
    );
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.post(`/del`, async (fe, api) => {
  try {
    if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
    else api.send(
      processes.init().cache
        ? await dataflow.del(fe.body)
        : util.getWaitCacheRes()
    );
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.post(`/pull`, async (fe, api) => {
  try {
    if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
    else api.send(
      processes.init().cache
        ? await dataflow.pull(fe.body)
        : util.getWaitCacheRes()
    );
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.post(`/load`, async (fe, api) => {
  try {
    const TYPES_LOADABLE_BY_COMPONENT = [
      // note: add any adhoc calls that are callable by `component`, which may be used by the public
      `component_sample`
    ];
    
    if (
      (fe.headers.x_api_key !== API_KEY) &&
      !(
        (fe.headers.x_api_key === `component`) &&
        TYPES_LOADABLE_BY_COMPONENT.includes(fe.body.type)
      )
    ) api.send({error: `Unauthorised.`});
    else api.send(
      processes.init().cache ? await adhoc.load(fe.body) : util.getWaitCacheRes()
    );
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

// app.post(`/enter`, async (fe, api) => {
//   try {
//     let user_id = fe.body.user_id || ``;

//     stats.enter_total_count += 1;

//     if (user_id) {
//       stats.enter_user_count += 1;
//     } else {
//       stats.enter_guest_count += 1;
//     }

//     api.send({
//       data: `done`
//     });
//   } catch (e) {
//     console.log(e);
    
//     api.send({
//       data: `error`
//     });
//   }
// });

app.post(`/stripe`, async (fe, api) => {
  try {
    // note: do `stripe listen --forward-to localhost:3001/stripe` to start listening to stripe events
    await stripe.handleEvent(fe, false);
    
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

// statsRefresh();

// async function statsRefresh() {
//   try {
//     await util.wait(60);

//     let temp_stats = util.clone(stats);

//     stats = {
//       enter_total_count: 0,
//       enter_user_count: 0,
//       enter_guest_count: 0,
//     }

//     let enter_stat = await dataflow.get({
//       all: false,
//       type: `stat`,
//       filters: [
//         {
//           prop: `code`,
//           value: `enter`,
//           condition: `match`,
//           options: []
//         }
//       ]
//     }) || null;

//     if (
//       enter_stat &&
//       enter_stat.id
//     ) {
//       let enter_stat_c = util.clone(enter_stat);

//       let updated_enter_stat_data = enter_stat_c.data || {};

//       updated_enter_stat_data.total_count = (updated_enter_stat_data.total_count || 0) + (temp_stats.enter_total_count || 0);
//       updated_enter_stat_data.user_count = (updated_enter_stat_data.user_count || 0) + (temp_stats.enter_user_count || 0);
//       updated_enter_stat_data.guest_count = (updated_enter_stat_data.guest_count || 0) + (temp_stats.enter_guest_count || 0);

//       await dataflow.edit({
//         type: `stat`,
//         obj: {
//           id: enter_stat.id,
//           data: updated_enter_stat_data || {}
//         }
//       });
//     }
//   } catch (e) {
//     console.log(e);
//   } finally {
//     statsRefresh();
//   }
// }

// maintenace timestamp

app.post(`/get_maintenance_timestamp`, async (fe, api) => {
  try {
    if (fe.headers.x_api_key !== API_KEY) api.send({error: `Unauthorised.`});
    else api.send({
      data: maintenance_timestamp || null
    });
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
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

app.get(`/cache/:type`, async (fe, api) => {
  try {
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
  } catch (e) {
    console.log(e);

    api.send({
      data: `error`
    });
  }
});

app.get(`/add_user_honorary`, async (fe, api) => {
  try {
    let key = fe.query.key || ``;
    let user_id = fe.query.user_id || ``;
    let code = fe.query.code || ``;

    if (key !== API_KEY) {
      api.send({
        data: `wrong key`
      });
    } else {
      let matching_user = await dataflow.get({
        all: false,
        type: `user`,
        id: user_id || ``
      }) || null;

      if (!(matching_user && matching_user.id)) {
        api.send({
          data: `error: user not found`
        });
      } else {
        let matching_user_c = util.clone(matching_user);

        let new_honorary;

        switch (code) {
          // todo: add honorary obj{code, data{...}} based on code
        }

        if (!new_honorary) {
          api.send({
            data: `error: new honorary unable to be built`
          });
        } else {
          await dataflow.edit({
            type: `user`,
            obj: {
              id: matching_user_c.id || ``,
              honoraries: [
                ...(matching_user_c.honoraries || []),
                new_honorary
              ]
            }
          });
        }
        
        api.send({
          data: `done`
        });
      }
    }
  } catch (e) {
    console.log(e);

    api.send({
      data: `error: ${e}`
    });
  }
});

// app.get(`/test`, async (fe, api) => {
//   try {
//     // add any test code here
//   } catch (e) {
//     console.log(e);

//     api.send({
//       data: `error`
//     });
//   }
// });

// app.get(`/add_init_stats`, async (fe, api) => {
//   try {
//     await dataflow.add({
//       type: `stat`,
//       code: `enter`,
//       data: {
//         total_count: 0,
//         guest_count: 0,
//         user_count: 0
//       }
//     });
//   } catch (e) {
//     console.log(e);

//     api.send({
//       data: `error`
//     });
//   }
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
//   try {
//     console.log(`Discord bot ready`);
//     startDiscordBoundProcesses();
//   } catch (e) {
//     console.log(e);
//   }
// });

// async function startDiscordBoundProcesses() {
//   try {
//     if (cache_initiated) {
//       // note: wait for `cache` process to init
//       while (!processes.init().cache) {
//         await util.wait(5);
//       }

//       processes.start({ name: `user`, payload: { discord_client: discord_bot } }); // note: remove processes.start() for `user` above if enabling this discord-bound one

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
//   try {
//     if (!interaction.isCommand()) return;
  
//     // let errors = [];
//     let is_private_command = interaction.options.getBoolean(`private`);
  
//     const { commandName } = interaction;
//     switch (commandName) {
//       case `ping`: {
//         await interaction.reply(`pong!`);
//         break;
//       }
  
//       case `user`: {
//         switch (interaction.options.getSubcommand()) {
//           case `view`: {
//             if (is_private_command === null) {
//               is_private_command = true;
//             }
  
//             let name = interaction.options.getString(`name`);
  
//             let embed = new EmbedBuilder()
//               .setColor(`#BAE8F9`)
//               .setAuthor({
//                 name: `Test command`,
//                 iconURL: ``,
//                 url: `https://${PROJECT_LINK}`,
//               })
//               .addFields([
//                 {
//                   name: `Viewing user`,
//                   value: name,
//                 },
//               ]);
  
//             await interaction.reply({
//               embeds: [embed],
//               ephemeral: is_private_command,
//             });
  
//             break;
//           }
//         }
  
//         break;
//       }
//     }
//   } catch (e) {
//     console.log(e);
//   }
// });

// // ---- discord bot command config

// const { SlashCommandBuilder } = require("@discordjs/builders");
// const { REST } = require("@discordjs/rest");
// const { Routes } = require("discord-api-types/v9");

// registerDiscordBotCommands();

// function registerDiscordBotCommands() {
//   try {
//     const commands = [
//       new SlashCommandBuilder().setName(`ping`).setDescription(`Ping the bot.`),
  
//       new SlashCommandBuilder()
//         .setName(`user`)
//         .setDescription(`Related to users.`)
//         .addSubcommand((subcmd) =>
//           subcmd
//             .setName(`view`)
//             .setDescription(`View user.`)
//             .addStringOption((option) =>
//               option.setName(`name`).setDescription(`Name.`).setRequired(true)
//             )
//             .addBooleanOption((option) =>
//               option
//                 .setName(`private`)
//                 .setDescription(`Private query? True by default.`)
//                 .setRequired(false)
//             )
//         ),
//     ].map((command) => command.toJSON());
  
//     const rest = new REST({ version: `9` }).setToken(DISCORD_BOT_TOKEN);
  
//     rest
//       .put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
//         body: commands,
//       })
//       .then(() => console.log(`Successfully registered Discord bot commands.`))
//       .catch(console.error);
//   } catch (e) {
//     console.log(e);
//   }
// }

// note: nodemailer testing area

// const nodemailer = require(`nodemailer`);
// const GCLOUD_SERVICE_ACCOUNT = JSON.parse(process.env.GCLOUD_SERVICE_ACCOUNT);

// testNodemailer();

// async function testNodemailer() {
//   try {
//     const nodemailer_transporter = nodemailer.createTransport({
//       host: `smtp.gmail.com`,
//       port: 465,
//       secure: true,
//       auth: {
//        type: `OAuth2`,
//        user: `noreply@your.website`, // sender address
//        serviceClient: GCLOUD_SERVICE_ACCOUNT.client_id,
//        privateKey: GCLOUD_SERVICE_ACCOUNT.private_key,
//        accessUrl: GCLOUD_SERVICE_ACCOUNT.token_uri,
//       }
//     });

//     await nodemailer_transporter.verify();
  
//     const nodemailer_options = {
//       from: `"Your.website" <noreply@your.website>`, // sender address
//       to: `useremail@gmail.com`, // list of receiver(s), eg. `one@gmail.com, two@gmail.com`
//       subject: `This is a test email.`, // subject line
//       // text: ``, // plain text body
//       html: `
//         <table
//           width="100%"
//           border="0"
//           cellspacing="0"
//           cellpadding="0"
//           style="
//             text-align: center;
//             padding: 20px;
//             background-color: #f7f7f7;
//           "  
//         >
//           <tr>
//             <td align="center">
//               <div
//                 style="
//                   width: 92%;
//                   padding: 4%;
//                   max-width: 450px;
//                   background-color: #ffffff;
//                   font-size: 15px;
//                   font-family: 'Arial';
//                   text-align: left;
//                 "
//               >
//                 Hey, user. 👋<br /><br />
                
//                 This is a line with <b>important information</b>.<br /><br />

//                 This is another line.<br /><br /><br />

//                 <i style="font-size: 12px;">This is an automated email from <a href="https://lef.la" target="_blank">Lefrost</a>.</i><br /><br />

//                 <i style="font-size: 12px;">You can opt out of notification emails in your <a href="https://lef.la">Settings</a>.</i>
//               <div>
//             </td>
//           </tr>
//         </table>
//       ` // html body
//     }
  
//     const nodemailer_info = await nodemailer_transporter.sendMail(nodemailer_options)
//     console.log(`Message sent: ${nodemailer_info.messageId}`)
//   } catch (e) {
//     console.log(e)
//   }  
// }