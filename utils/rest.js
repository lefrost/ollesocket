const axios = require(`axios`);

module.exports = {
  get: async (url) => {
    return (await axios.get(url)).data;
  },
};
