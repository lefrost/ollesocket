// config

require(`dotenv`).config();
const express = require(`express`);
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
let mongo = require(`./utils/mongo`);
let rest = require(`./utils/rest`);
let util = require(`./utils/util`);

let port = process.env.PORT || 3001;

// ---- app & server

app.use(express.json({ limit: `50mb`, extended: true }));

const server = app.listen(port, async () => {
  console.log(`up on http://localhost:${port}`);
  await mongo.connect();
  processes.start({ name: `cache`, payload: null });
  // processes.start({ name: `your_object_name`, payload: null });
});

// ---- cors config

const auth_origins = [
  `http://localhost:3000`,
  `https://www.ollesocket.vercel.app`,
  `https://ollesocket.vercel.app`,
];

const io = require(`socket.io`)(server, {
  cors: {
    origin: auth_origins,
  },
});

app.use(function (req, res, next) {
  let origin = req.headers.origin;
  if (auth_origins.includes(origin)) {
    res.setHeader(`Access-Control-Allow-Origin`, origin);
  }
  res.setHeader(
    `Access-Control-Allow-Methods`,
    `GET, POST, OPTIONS, PUT, PATCH, DELETE`
  );
  res.setHeader(
    `Access-Control-Allow-Headers`,
    `X-Requested-With,content-type`
  );
  res.setHeader(`Access-Control-Allow-Credentials`, true);
  next();
});

// ---- socket routes

io.on(`connection`, (socket) => {
  socket.on(`init`, async (d, callback) => {
    callback(
      await util.getRes({
        res: `ok`,
        act: `get`,
        type: `init`,
        data: processes.init(),
      })
    );
  });

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
    if (!processes.init().cache) {
      callback(util.getWaitCacheRes());
    } else {
      if (d.is_cache_request && !util.isEmptyObj(d.cache_get_params)) {
        let cache_obj = await dataflow.get(d.cache_get_params);

        callback(cache_obj);

        let updated_obj = await adhoc.load(d);

        if (!util.isEmptyObj(updated_obj)) {
          await dataflow.add({
            type: d.type,
            obj: updated_obj.data,
          });

          cache_obj = await dataflow.get(d.cache_get_params);

          socket.emit(`new_load_${d.type}`, cache_obj);
        }
      } else {
        callback(await adhoc.load(d));
      }
    }
  });

  socket.on(`get`, async (d, callback) => {
    callback(
      processes.init().cache ? await dataflow.get(d) : util.getWaitCacheRes()
    );
  });

  socket.on(`get_many`, async (d, callback) => {
    callback(
      processes.init().cache
        ? await dataflow.getMany(d)
        : util.getWaitCacheRes()
    );
  });

  socket.on(`add`, async (d, callback) => {
    callback(
      processes.init().cache ? await dataflow.add(d) : util.getWaitCacheRes()
    );
  });

  socket.on(`edit`, async (d, callback) => {
    callback(
      processes.init().cache ? await dataflow.edit(d) : util.getWaitCacheRes()
    );
  });

  socket.on(`del`, async (d, callback) => {
    callback(
      processes.init().cache ? await dataflow.del(d) : util.getWaitCacheRes()
    );
  });

  socket.on(`pull`, async (d, callback) => {
    callback(
      processes.init().cache ? await dataflow.pull(d) : util.getWaitCacheRes()
    );
  });
});

// ---- rest post routes

app.post(`/init`, async (req, res) => {
  res.send(
    await util.getRes({
      res: `ok`,
      act: `get`,
      type: `init`,
      data: processes.init(),
    })
  );
});

app.post(`/load`, async (req, res) => {
  res.send(
    processes.init().cache ? await adhoc.load(req.body) : util.getWaitCacheRes()
  );
});

// ---- rest get routes

app.get(`/`, (req, res) => {
  res.send(`Ollesocket API`);
});

app.get(`/cache/:type`, async (req, res) => {
  res.send(
    await cache.getMany({
      type: req.params.type,
      filters: [],
    })
  );
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
//   // processes.start({
//   //   name: `user`,
//   //   payload: {
//   //     client: discord_bot,
//   //   },
//   // });
// });

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
