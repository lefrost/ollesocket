const axios = require(`axios`);

// const OLLESOCKET_API_URL = process.env.OLLESOCKET_API_URL;
// const OLLESOCKET_API_KEY = process.env.OLLESOCKET_API_KEY;

module.exports = {
  get: async (d) => {
    let headers = d.headers || {};
    // if (d.url.includes(OLLESOCKET_API_URL)) {
    //   payload.api_key = OLLESOCKET_API_KEY;
    // }
    let res = null;
    
    if (headers) {
      res = (await axios.get(d.url || ``, { headers }));
    } else {
      res = (await axios.get(d.url || ``));
    }

    return d.all ? res : res.data;
  },

  post: async (d) => {
    try {
      let headers = d.headers || {};
      let payload = d.payload || {};
      // if (d.url.includes(OLLESOCKET_API_URL)) {
      //   payload.api_key = OLLESOCKET_API_KEY;
      // }
      let res = null;

      if (headers) {
        res = (await axios.post(d.url || ``, payload, { headers }));
      } else {
        res = (await axios.post(d.url || ``, payload));
      }

      return d.all ? res : res.data;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
};
