const axios = require(`axios`);

// const OLLEATLAS_API_URL = process.env.OLLEATLAS_API_URL;
// const OLLEATLAS_API_KEY = process.env.OLLEATLAS_API_KEY;

module.exports = {
  get: async (url) => {
    return (await axios.get(url)).data;
  },

  post: async (d) => {
    try {
      let payload = d.payload || {};
      // if (d.url.includes(OLLEATLAS_API_URL)) {
      //   payload.api_key = OLLEATLAS_API_KEY;
      // }
      let res = (await axios.post(d.url || ``, payload));
      return d.all ? res : res.data;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
};
