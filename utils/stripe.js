
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
// const STRIPE_PRODUCTS = require(`../data/stripe_products.json`); // todo: define stripe products data for processing

const stripe = require('stripe')(STRIPE_SECRET_KEY);

let adhoc = require(`../controllers/adhoc`);
let dataflow = require(`../controllers/dataflow`);
let util = require("../utils/util");

module.exports = {
  handleEvent: async (req, is_event_parsed) => {
    try {
      // note: `is_event_parsed` param refers to whether `req` (ie. `fe`) param is an entire POST request, or if it's an already-parsed stripe event, in which case `let event = stripe.webhooks.constructEvent(...)` can be skipped and just instead do `let event = breqody`

      if (!req) {
        console.log(`stripe.handleEvent - invalid req`);
        return;
      };

      let event;

      if (is_event_parsed) {
        event = req;
      } else {
        const body = req.body;
        const stripe_signature = req.headers[`stripe-signature`] || ``;

        event = stripe.webhooks.constructEvent(body, stripe_signature, STRIPE_WEBHOOK_SECRET);
      }

      if (!(
        event &&
        event.type &&
        event.data &&
        event.data.object &&
        event.data.object.id
      )) {
        console.log(`stripe.handleEvent - invalid event`);
        return;
      }

      switch (event.type) {
        case `checkout.session.completed`: {
          const session = await stripe.checkout.sessions.retrieve(
            event.data.object.id, { expand: [`line_items`] }
          );

          if (!(
            session &&
            session.id &&
            session.line_items &&
            session.line_items.data &&
            session.line_items.data[0] &&
            session.line_items.data[0].price &&
            session.line_items.data[0].price.id &&
            session.line_items.data[0].price.type &&
            session.line_items.data[0].price.product
          )) {
            console.log(`stripe.handleEvent - checkout.session.completed - invalid session`);
            return;
          }

          const price_id = session.line_items.data[0].price.id;
          const price_type = session.line_items.data[0].price.type;
          const product_id = session.line_items.data[0].price.product;

          if (![`one_time`, `recurring`].includes(price_type)) {
            console.log(`stripe.handleEvent - checkout.session.completed - unsupported price type`);
            return;
          }

          let customer_id = ``;
          let customer_email = ``;

          if (price_type === `one_time`) {
            const one_time_customer_details = session.customer_details;

            if (!(
              one_time_customer_details &&
              one_time_customer_details.email
            )) {
              console.log(`stripe.handleEvent - checkout.session.completed - invalid one-time subscription customer details`);
              return;
            }

            customer_id = ``; // note: empty
            customer_email = one_time_customer_details.email;
          } else if (price_type === `recurring`) {
            const recurring_subscription_customer = await stripe.customers.retrieve(session.customer);

            if (!(
              recurring_subscription_customer &&
              recurring_subscription_customer.id &&
              recurring_subscription_customer.email
            )) {
              console.log(`stripe.handleEvent - checkout.session.completed - invalid recurring subscription customer`);
              return;
            }

            customer_id = recurring_subscription_customer.id;
            customer_email = recurring_subscription_customer.email;
          }
          
          if (!(
            customer_email &&
            (
              (
                (price_type === `one_time`)
              ) ||
              (
                (price_type === `recurring`) &&
                customer_id
              )
            )
          )) {
            console.log(`stripe.handleEvent - checkout.session.completed - invalid customer`);
            return;
          }

          const price = await stripe.prices.retrieve(price_id);

          if (!(
            price &&
            price.id
          )) {
            console.log(`stripe.handleEvent - checkout.session.completed - invalid price`);
            return;
          }

          const product = await stripe.products.retrieve(product_id);

          if (!(
            product &&
            product.id
          )) {
            console.log(`stripe.handleEvent - checkout.session.completed - invalid product`);
            return;
          }
          
          let matching_user = await dataflow.get({
            all: false,
            type: `user`,
            filters: [
              {
                prop: `connections`,
                value: {
                  type: `email`,
                  code: customer_email
                },
                condition: `some`,
                options: []
              }
            ]
          }) || null;

          if (!(
            matching_user &&
            matching_user.id
          )) {
            console.log(`stripe.handleEvent - checkout.session.completed - no matching user found`);
            return;
          } else if ((matching_user.stripe_subs || []).some(s => {
            try {
              let is_price_type_valid = false;

              if (price_type === `one_time`) {
                is_price_type_valid = (s.customer_email === customer_email) || false;
              } else if (price_type === `recurring`) {
                is_price_type_valid = (s.customer_id === customer_id) || false; // note: for recurring subscription, don't use email to find matching stripe_sub, because a user may have changed their [lefrost product] account's and/or stripe account's email since their stripe_sub first started 
              }

              return (
                is_price_type_valid &&
                (
                  (price_type === `one_time`) ?
                    (s.session_id === session.id) :
                    true
                )
                // (s.price_id === price.id) &&
                // (s.product_id === product.id)
              ) || false;
            } catch (e) {
              console.log(e);
              return false;
            }
          })) {
            console.log(`stripe.handleEvent - checkout.session.completed - matching user stripe_sub already added`);
            return;
          }
      
          await dataflow.edit({
            type: `user`,
            obj: {
              id: matching_user.id,
              stripe_subs: [
                ...matching_user.stripe_subs || [],
                {
                  session_id: session.id,
                  customer_id: customer_id || ``,
                  payment_intent_id: session.payment_intent || ``,
                  customer_email: customer_email || ``,
                  price_id: price.id,
                  product_id: product.id,
                  type: price_type,
                  timestamp: event.created || util.getTimestamp()
                }
              ]
            }
          });

          break;
        }

        case `charge.refunded`: {
          const charge = event.data.object || {};

          if (!charge) {
            console.log(`stripe.handleEvent - charge.refunded - invalid charge`);
            return;
          }
          
          const payment_intent_id = charge.payment_intent || ``;

          if (!payment_intent_id) {
            console.log(`stripe.handleEvent - charge.refunded - invalid payment intent ID`);
            return;
          }

          let matching_user = await dataflow.get({
            all: false,
            type: `user`,
            filters: [
              {
                prop: `stripe_subs`,
                value: {
                  payment_intent_id: payment_intent_id
                },
                condition: `some`,
                options: []
              }
            ]
          }) || null;

          if (!(matching_user && matching_user.id)) {
            console.log(`stripe.handleEvent - charge.refunded - matching user not found`);
            return;
          }

          let matching_user_c = util.clone(matching_user);

          let matching_stripe_sub = (matching_user.stripe_subs || []).find(s =>
            s.payment_intent_id === payment_intent_id
          ) || null;

          if (!matching_stripe_sub) {
            console.log(`stripe.handleEvent - charge.refunded - matching stripe sub already removed`);
          }

          for (let db_item of (matching_stripe_sub.db_items || []).filter(i =>
            i.type && i.id
          ) || []) {
            await dataflow.del({
              type: db_item.type || ``,
              id: db_item.id || ``
            });
          }

          await dataflow.edit({
            type: `user`,
            obj: {
              id: matching_user_c.id || ``,
              stripe_subs: (matching_user_c.stripe_subs || []).filter(s =>
                s.payment_intent_id !== payment_intent_id
              )
            }
          });

          break;
        }

        case `customer.subscription.deleted`: {
          // note: only meant for `recurring` subscriptions, not `one_time`

          const subscription = await stripe.subscriptions.retrieve(event.data.object.id);

          if (!(
            subscription &&
            subscription.id &&
            subscription.customer &&
            subscription.items &&
            subscription.items.data
          )) {
            console.log(`stripe.handleEvent - customer.subscription.deleted - invalid subscription (might not be a "recurring" subscription type)`);
            return;
          }

          const subscription_items = subscription.items.data.filter(i => 
            (i.object === `subscription_item`) &&
            i.id &&
            i.price &&
            i.price.id
          ) || [];

          if (subscription_items.length === 0) {
            console.log(`stripe.handleEvent - customer.subscription.deleted - invalid subscription item(s)`);
            return;
          }

          let prices = [];

          for (let subscription_item of subscription_items.slice()) {
            if (!prices.some(p => p.id !== subscription_item.price.id)) {
              prices.push(subscription_item.price);
            }
          }

          if (prices.length === 0) {
            console.log(`stripe.handleEvent - customer.subscription.deleted - invalid price(s)`);
            return;
          }

          let matching_user = await dataflow.get({
            all: false,
            type: `user`,
            filters: [
              {
                prop: `stripe_subs`,
                value: {
                  customer_id: subscription.customer, // note: getting `subscription.customer` here is safe since only "recurring"-type subscriptions are subject to deletion (ie. this event type), which are the subscriptions which have `subscription.customer` assigned
                  type: `recurring`
                },
                condition: `some`,
                options: []
              }
            ]
          }) || null;

          if (!(
            matching_user &&
            matching_user.id
          )) {
            console.log(`stripe.handleEvent - checkout.session.deleted - no matching user with recurring stripe_sub(s) found`);
            return;
          } else if (!(matching_user.stripe_subs || []).some(s =>
            (s.customer_id === subscription.customer) &&
            prices.some(p =>
              p.id === s.price_id
            ) &&
            (s.type === `recurring`) &&
            (s.timestamp <= event.created) // note: only del matching stripe subs that were created *before* the "del" event
          )) {
            console.log(`stripe.handleEvent - checkout.session.deleted - matching user stripe_sub already deleted`);
            return;
          }

          await dataflow.edit({
            type: `user`,
            obj: {
              id: matching_user.id,
              stripe_subs: (matching_user.stripe_subs || []).filter(s =>
                !(
                  (s.customer_id === subscription.customer) &&
                  prices.some(p =>
                    p.id === s.price_id
                  ) &&
                  (s.type === `recurring`) &&
                  (s.timestamp <= event.created)
                )
              ) || []
            }
          });

          break;
        }
      }

    } catch (e) {
      console.log(e);
    }
  },

  getLatestEvents: async (earliest_timestamp) => {
    try {
      let timestamp = util.getTimestamp();
      let timestamp_24h_ago = util.alterTimestamp(`subtract`, 24, `hours`, timestamp);

      let latest_events = ((await stripe.events.list({
        types: [`checkout.session.completed`, `customer.subscription.deleted`],
        limit: 20
      }) || {}).data || []).filter(e =>
        e.type &&
        e.data &&
        e.data.object &&
        e.data.object.id &&
        e.created
      );

      if (earliest_timestamp) {
        latest_events = latest_events.filter(e =>
          (e.created >= earliest_timestamp) &&
          (e.created >= timestamp_24h_ago)
        ) || [];
      }

      return latest_events || [];
    } catch (e) {
      console.log(e);
      return [];
    }
  }
}

/* ref:
  - setup stripe in general: https://youtu.be/ag7HXbgJtuk?si=Fxxkv7x8p_lNU3Nv
  - setup stripe webhook in nodejs: https://docs.stripe.com/webhooks/quickstart?lang=node
  - handle stripe webhook events, for handleEvent() function: https://github.com/marclou/stripe-sub/blob/main/app/api/webhook/stripe/route.js
  - get list of stripe events: https://docs.stripe.com/api/events/list
*/