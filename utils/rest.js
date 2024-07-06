const axios = require(`axios`);

// const EXTERNAL_API_URL = process.env.EXTERNAL_API_URL;
// const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY;

module.exports = {
  get: async (d) => {
    try {
      let headers = d.headers || {};
      // if (d.url.includes(EXTERNAL_API_URL)) {
      //   payload.api_key = EXTERNAL_API_KEY;
      // }
      let res = null;
      
      if (headers) {
        res = (await axios.get(d.url || ``, headers));
      } else {
        res = (await axios.get(d.url || ``));
      }
  
      return d.all ? res : res.data;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  post: async (d) => {
    try {
      let api_key = ``;

      // if (d.url.includes(EXTERNAL_API_URL)) {
      //   api_key = EXTERNAL_API_KEY;
      // }
      
      let headers_obj = {}

      if (api_key) {
        headers_obj[`x_api_key`] = api_key || ``;
      }

      let res = await axios.post(
        d.url || ``,
        d.payload || {},
        {
          headers: headers_obj || {}
        }
      );

      return d.all ? res : res.data;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
};
