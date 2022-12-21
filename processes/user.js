let cache = require(`../utils/cache`);
let util = require(`../utils/util`);
let dataflow = require(`../controllers/dataflow`);
const { PromisePool } = require("@supercharge/promise-pool");
let DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;
// let suave_collection_types = require(`../data/suave_collection_types.json`);
// let suave_collections = require(`../data/suave_collections.json`);

let init = false;
let users = [];

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
//     users = await getUsers();
//     let count = 0;

//     if (users.length > 0) {
//       await PromisePool.for(users)
//         .withConcurrency(Math.min(users.length, 10))
//         .process(async (user) => {
//           await processUser({ user });
//           count++;
//         });

//       users = await getUsers();

//       for (let member of members) {
//         let matching_user = await getUserOfMember({ member });
//         if (matching_user) {
//           count++;
//         }
//         // await updateMemberRoles({ member, user: matching_user });
//       }

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

// async function processUser(d) {
//   let user = d.user;

//   //
// }
