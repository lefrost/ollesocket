
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = require('stripe')(STRIPE_SECRET_KEY);

let adhoc = require(`../controllers/adhoc`);
let dataflow = require(`../controllers/dataflow`);

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
        const body = await req.text();
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
            session.customer &&
            session.line_items &&
            session.line_items.data &&
            session.line_items.data[0] &&
            session.line_items.data[0].price &&
            session.line_items.data[0].price.id &&
            session.line_items.data[0].price.product
          )) {
            console.log(`stripe.handleEvent - checkout.session.completed - invalid session`);
            return;
          }

          const price_id = customer.line_items.data[0].price.id;
          const product_id = customer.line_items.data[0].price.product;
          const customer = await stripe.customers.retrieve(session.customer);
          
          if (!(
            customer &&
            customer.id &&
            customer.email
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
                  code: customer.email
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
          }
      
          await dataflow.edit({
            type: `user`,
            obj: {
              id: matching_user.id,
              stripe_subs: [
                ...matching_user.stripe_subs || [],
                {
                  customer_id: customer.id,
                  customer_email: customer.email,
                  price_id: price.id,
                  product_id: product.id
                }
              ]
            }
          });

          break;
        }
        case `customer.subscription.deleted`: {
          const subscription = await stripe.subscriptions.retrieve(event.data.object.id);

          if (!(
            subscription &&
            subscription.id &&
            subscription.customer
          )) {
            console.log(`stripe.handleEvent - customer.subscription.deleted - invalid subscription`);
            return;
          }

          let matching_user = await dataflow.get({
            all: false,
            type: `user`,
            filters: [
              {
                prop: `stripe_subs`,
                value: {
                  type: `customer_id`,
                  code: subscription.customer
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
          }

          await dataflow.edit({
            type: `user`,
            obj: {
              id: matching_user.id,
              stripe_subs: (matching_user.stripe_subs || []).filter(s => s.customer_id !== subscription.customer) || []
            }
          });

          break;
        }
      }

    } catch (e) {
      console.log(e);
    }
  },

  getLatestEvents: async () => {
    try {
      let latest_events = (await stripe.events.list({
        types: [`checkout.session.completed`, `customer.subscription.deleted`],
        limit: 50
      }) || {}).data || [];

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