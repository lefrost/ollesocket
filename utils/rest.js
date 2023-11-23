const axios = require(`axios`);

// const OLLESOCKET_API_URL = process.env.OLLESOCKET_API_URL;
// const OLLESOCKET_API_KEY = process.env.OLLESOCKET_API_KEY;

module.exports = {
  get: async (url) => {
    return (await axios.get(url)).data;
  },

  post: async (d) => {
    try {
      let payload = d.payload || {};
      // if (d.url.includes(OLLESOCKET_API_URL)) {
      //   payload.api_key = OLLESOCKET_API_KEY;
      // }
      let res = (await axios.post(d.url || ``, payload));
      return d.all ? res : res.data;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
};
