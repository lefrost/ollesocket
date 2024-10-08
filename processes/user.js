let cache = require(`../utils/cache`);
let gcloud = require(`../utils/gcloud`);
let util = require(`../utils/util`);
let dataflow = require(`../controllers/dataflow`);
const { PromisePool } = require("@supercharge/promise-pool");

const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID;
const DISCORD_ROLE_ID = `discord_role_id_here`;

let init = false;

module.exports = {
  init: () => {
    try {
      return init;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  start: async (d) => {
    try {
      await processUsers(d);
  
      while (!init) {
        await util.wait(5);
      }
  
      return;
    } catch (e) {
      console.log(e);
      return;
    }
  },
};

async function processUsers(d) {
  try {
    // let discord_client = d.discord_client;
    // let guild = await discord_client.guilds.fetch(DISCORD_SERVER_ID);
    // let members = (await guild.members.fetch({ force: true })).map((m) => m);
    let users = (await dataflow.getMany({
      all: false,
      type: `user`,
      filters: []
    }) || []).slice().sort((a, b) => 
      (b.metadata || {}).add_timestamp - (a.metadata || {}).add_timestamp
    ) || [];
    let count = 0;

    let user_ids_slated_for_deletion = [];

    if (users.length >= 0) {
      await PromisePool.for(users)
        // .withConcurrency(Math.min(users.length, 5))
        .withConcurrency(1) // note: process users 1 at a time
        .process(async (user) => {
          try {
            // note: process any user.metadata.prev_gcloud_image_urls and exec utils->gcloud.delImage() calls, then wiping user.metadata.prev_gcloud_image_urls clean in mongo

            if (((user.metadata || {}).prev_gcloud_image_urls || []).length >= 1) {
              let remaining_gcloud_image_urls = user.metadata.prev_gcloud_image_urls.slice() || [];

              for (let gcloud_image_url of user.metadata.prev_gcloud_image_urls.slice()) {
                let del_res = ``;
                
                if (gcloud_image_url !== user.icon_image_url) {
                  del_res = await gcloud.delImage(gcloud_image_url) || ``;
                } else {
                  del_res = `done`;
                };

                if (del_res === `done`) {
                  remaining_gcloud_image_urls = remaining_gcloud_image_urls.filter(u => u !== gcloud_image_url);
                }
              }

              await dataflow.edit({
                type: `user`,
                obj: {
                  id: user.id,
                  metadata: {
                    ...(user.metadata || {}),
                    prev_gcloud_image_urls: remaining_gcloud_image_urls || []
                  }
                }
              });
            }

            // todo: send email to user if condition is met

            // if (false) {
            //   let projects_in_submissions = user_full_access_projects.filter(p =>
            //     eligible_pending_submissions.some(s =>
            //       s.project_id === p.id
            //     )
            //   ).slice() || [];

            //   try {
            //     const nodemailer_transporter = nodemailer.createTransport({
            //       host: `smtp.gmail.com`,
            //       port: 465,
            //       secure: true,
            //       auth: {
            //         type: `OAuth2`,
            //         user: `noreply@your.website`, // sender address
            //         serviceClient: GCLOUD_SERVICE_ACCOUNT.client_id,
            //         privateKey: GCLOUD_SERVICE_ACCOUNT.private_key,
            //         accessUrl: GCLOUD_SERVICE_ACCOUNT.token_uri,
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
            //             width: calc(100% - 20px * 2);
            //             text-align: center;
            //             padding: 20px;
            //             background-color: #f7f7f7;
            //           "  
            //         >
            //           <tr>
            //             <td align="center">
            //               <div
            //                 style="
            //                   width: calc(100% - 20px * 2);
            //                   padding: 20px;
            //                   max-width: calc(500px - 20px * 2);
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
            //     // console.log(`Message sent: ${nodemailer_info.messageId}`);
            //   } catch (er) {
            //     console.log(er)
            //   }
            // }

            // note: dupe check --- check accounts with matching emails for dupes, prioritise newest dupe, move all unadded user.connections and user.stripe_subs from older dupes to newest dupe, remove older dupes

            let matching_users = users.filter(mu =>
              (mu.id !== user.id) &&
              (mu.connections || []).some(muc =>
                (muc.type === `email`) &&
                (user.connections || []).some(uc =>
                  (uc.type === `email`) &&
                  (uc.code === muc.code)
                )
              ) &&
              ((mu.metadata || {}).add_timestamp <= (user.metadata || {}).add_timestamp)
            ).slice() || [];

            if (matching_users.length >= 1) {
              let user_updated_connections = (user.connections || []).slice() || [];
              let user_updated_stripe_subs = (user.stripe_subs || []).slice() || [];
              let user_updated_honoraries = (user.honoraries || []).slice() || [];
              // let user_updated_nft_cxs = (user.nft_cxs || []).slice() || [];
  
              for (let matching_user of matching_users) {
                let matching_user_c = util.clone(matching_user);
  
                user_ids_slated_for_deletion.push(matching_user_c.id);
  
                user_updated_connections.push(
                  ...(matching_user_c.connections || []).filter(muc =>
                    !user_updated_connections.some(uc =>
                      (uc.type === muc.type) &&
                      (uc.code === muc.code)
                    )
                  )
                );
  
                user_updated_stripe_subs.push(
                  ...(matching_user_c.stripe_subs || []).filter(mus =>
                    !user_updated_stripe_subs.some(us => {
                      try {
                        let is_customer_matching = false;
          
                        if (us.type === `one_time`) {
                          is_customer_matching = (us.customer_email === mus.customer_email) || false;
                        } else if (us.type === `subscription`) {
                          is_customer_matching = (us.customer_id === mus.customer_id) || false; // note: don't use email to find matching stripe_sub, because a user may have changed their [lefrost product] account's and/or stripe account's email since their stripe_sub first started 
                        }
          
                        return (
                          is_customer_matching &&
                          (
                            (us.type === `one_time`) ?
                              (us.session_id === mus.session_id) :
                              true
                          ) &&
                          (us.type === mus.type) &&
                          (us.price_id === mus.price_id) &&
                          (us.product_id === mus.product_id)
                        ) || false;
                      } catch (e) {
                        console.log(e);
                        return false;
                      }
                    })
                  )
                );
  
                user_updated_honoraries.push(
                  ...(matching_user_c.honoraries || []).filter(muh =>
                    !user_updated_honoraries.some(uh =>
                      (uh.code === muh.code)
                    )
                  )
                );

                // for (let nft_cx of (matching_user.nft_cxs || []).slice()) {
                //   let nft_cx_index = (user_updated_nft_cxs || []).findIndex(c =>
                //     c.code === nft_cx.code
                //   );
  
                //   if (nft_cx_index === -1) {
                //     user_updated_nft_cxs.push({
                //       code: nft_cx.code || ``,
                //       chain: nft_cx.chain || ``,
                //       nfts: []
                //     });
                //   }
                  
                //   nft_cx_index = (user_updated_nft_cxs || []).findIndex(c =>
                //     c.code === nft_cx.code
                //   );
  
                //   if (nft_cx_index >= 0) {
                //     user_updated_nft_cxs[nft_cx_index].nfts.push(
                //       ...(nft_cx.nfts || []).filter(mn =>
                //         !(user_updated_nft_cxs[nft_cx_index].nfts || []).some(un =>
                //           un.addy === mn.addy
                //         )
                //       ) || []
                //     );
                //   }
                // }
  
                // todo: handle any objs associated with to-be-deleted matching_user, and set each's user_id to overriding user's --- required for [add collection names here]
              }
  
              await dataflow.edit({
                type: `user`,
                obj: {
                  id: user.id,
                  connections: user_updated_connections || [],
                  stripe_subs: user_updated_stripe_subs || [],
                  honoraries: user_updated_honoraries || [],
                  // nft_cxs: user_updated_nft_cxs || []
                }
              });
            }
          } catch (e) {
            console.log(e);
          } finally {
            count++;
            console.log(`process users: ${count} / ${users.length}`);
          }
      });
    }

    for (let user_id of user_ids_slated_for_deletion) {
      await dataflow.del({
        type: `user`,
        id: user_id
      });
    }
        
    // count = 0;

    // if (members.length > 0) {
    //   await PromisePool.for(members)
    //     .withConcurrency(Math.min(members.length, 10))
    //     .process(async (member) => {
    //       let matching_user = users.find(u => u.connections.some(c => c.type === `discord` && c.code === member.id));

    //       if (!matching_user) {
    //         if (member._roles.includes(DISCORD_ROLE_ID)) {
    //           member.roles.remove(DISCORD_ROLE_ID);
    //         }
    //       } else {
    //         if (true) { // todo: if `user is obligated to role`
    //           if (!member._roles.includes(DISCORD_ROLE_ID)) {
    //             member.roles.add(DISCORD_ROLE_ID);
    //           }
    //         } else if (member._roles.includes(DISCORD_ROLE_ID)) {
    //           member.roles.remove(DISCORD_ROLE_ID);
    //         }
    //       }

    //       count++;
    //       console.log(`process members: ${count} / ${members.length}`);
    //     });
    // }
    
    console.log(init ? `users refreshed` : `users initiated`);
    init = true;

    await util.wait(180); // 60 * 2
  } catch (e) {
    console.log(e);
  } finally {
    await util.wait(10);
    processUsers(d);
  }
}