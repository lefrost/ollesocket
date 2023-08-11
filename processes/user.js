let cache = require(`../utils/cache`);
let util = require(`../utils/util`);
let dataflow = require(`../controllers/dataflow`);
const { PromisePool } = require("@supercharge/promise-pool");

const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;
const DISCORD_ROLE_ID = `discord_role_id_here`;

let init = false;

module.exports = {
  init: () => {
    return init;
  },

  start: async (d) => {
    // processUsers(d);
  },
};

// async function processUsers(d) {
//   try {
//     let client = d.client;
//     let guild = await client.guilds.fetch(DISCORD_SERVER_ID);
//     let members = (await guild.members.fetch({ force: true })).map((m) => m);
//     let users = await getUsers();
//     let count = 0;

//     if (users.length > 0) {
//       await PromisePool.for(members)
//         .withConcurrency(Math.min(members.length, 10))
//         .process(async (user) => {
//           let matching_user = users.find(u => u.connections.some(c => c.type === `discord` && c.code === member.id));

//           if (!matching_user) {
//             if (member._roles.includes(DISCORD_ROLE_ID)) {
//               member.roles.remove(DISCORD_ROLE_ID);
//             }
//           } else {
//             if (true) {
//               if (member._roles.includes(DISCORD_ROLE_ID)) {
//                 member.roles.remove(DISCORD_ROLE_ID);
//               }
//             } else if (!member._roles.includes(DISCORD_ROLE_ID)) {
//               member.roles.add(DISCORD_ROLE_ID);
//             }
//           }

//           count++;
//           console.log(`process members: ${count} / ${members.length}`);
//         });

//       console.log(init ? `users refreshed` : `users initiated`);
//       init = true;

//       await util.wait(60);
//     } else {
//       console.log(
//         `process user - users cache not initiated yet. trying again in 10 seconds.`
//       );
//       await util.wait(10);
//     }
//   } catch (e) {
//     console.log(e);
//     await util.wait(10);
//   } finally {
//     processUsers(d);
//   }
// }