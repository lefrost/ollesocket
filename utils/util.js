// var ffmpeg = require("fluent-ffmpeg");
// const ffprobeInstaller = require("@ffprobe-installer//ffprobe");
// ffmpeg.setFfprobePath(ffprobeInstaller.path);

var crypto = require("crypto");
var moment = require(`moment`);
// var _ = require(`lodash`);

module.exports = {
  generateId: (length) => {
    return crypto
      .randomBytes(length ? Math.floor(length / 2) : 20)
      .toString("hex");
  },
  getRandomNumber: (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  getTimestamp: () => {
    return moment.utc().unix();
  },
  convertToTimestamp: (input, format) => {
    return moment.utc(input, format).unix();
  },
  formatTimestamp: (timestamp, format) => {
    return moment.unix(timestamp).format(format);
  },
  getTimestampDiff: (start, end, format) => {
    let diff = moment.duration(moment.unix(end).diff(moment.unix(start)));
    // let diff = moment.duration(start.diff(end));

    switch (format) {
      case `days`:
        return diff.asDays();
      case `minutes`:
        return diff.asMinutes();
      case `seconds`:
      default:
        return diff.asSeconds();
    }
  },
  alterTimestamp: (operation, offset, type, timestamp) => {
    switch (operation) {
      case "add":
        return moment
          .utc(timestamp, `X`)
          .add(offset || 0, type || `seconds`)
          .unix();
      case "subtract":
        return moment
          .utc(timestamp, `X`)
          .subtract(offset || 0, type || `seconds`)
          .unix();
      default:
        return timestamp;
    }
  },
  isEmptyObj: (obj) => {
    for (let i in obj) return false;
    return true;
  },
  isNumeric: (val) => {
    return /^-?\d+$/.test(val);
  },
  isUrl: (val) => {
    let url;
    try {
      url = new URL(val);
    } catch (e) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  },
  removeNonalphanumerics: (str) => {
    return str.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
  },
  removeNonnumerics: (str) => {
    return str.replace(/[^0-9]/g, "").toLowerCase();
  },
  round: (num, precision) => {
    if (num) {
      if (num >= 0) {
        return parseFloat(
          Math.abs(parseFloat(num.toString().split("e")[0])).toFixed(precision)
        );
      } else {
        return (
          parseFloat(
            Math.abs(parseFloat(num.toString().split("e")[0])).toFixed(
              precision
            )
          ) * -1
        );
      }
    } else {
      return 0;
    }
  },
  stripHtml: (html) => {
    return html.replace(/(<([^>]+)>)/gi, "");
  },
  squeezeStr: (str) => {
    let m = module.exports;
    return m.stripHtml(m.removeNonalphanumerics(str));
  },
  squeezeNum: (str) => {
    let m = module.exports;
    return +m.stripHtml(m.removeNonnumerics(str));
  },
  squeezeWebsiteName: (url) => {
    url = url.toLowerCase();
    let searchFor = url.includes(`www.`)
      ? `www.`
      : url.includes(`https://`)
      ? `https://`
      : `http://`;

    return url.substring(
      url.indexOf(searchFor) + searchFor.length,
      url.indexOf(`.`, url.indexOf(searchFor))
    );
  },
  // getVideoDetails: (videoUrl) => {
  //   let done = new Promise((resolve, reject) => {
  //     ffmpeg.ffprobe(videoUrl, function (err, metadata) {
  //       resolve(metadata ? metadata : null);
  //     });
  //   });
  //   return done;
  // },
  cleanObj: (obj) => {
    // https://stackoverflow.com/a/38340730/8919391
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== null && v.length > 0)
    );
  },

  wait: (seconds) => {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve();
      }, seconds * 1000);
    });
  },

  clone: (obj) => {
    return JSON.parse(JSON.stringify(obj));
  },

  urlifyString: (str) => {
    return str.replaceAll(`&`, `[ampersand]`);
  },

  unurlifyString: (str) => {
    return str.replaceAll(`[ampersand]`, `&`);
  },

  normaliseNum: (num) => {
    if (num.toString().includes(`e`)) {
      return Number(num.toLocaleString("fullwide", { useGrouping: false }));
    } else {
      return num;
    }
  },

  removeDuplicateArrayObjects: (arr, key) => {
    // https://stackoverflow.com/a/56757215/8919391
    return arr.filter(
      (v, i, a) => a.findIndex((v2) => v2[key] === v[key]) === i
    );
  },

  getRes: (d) => {
    let msg = `Unknown.`;

    switch (d.res) {
      case `ok`: {
        msg = `Completed [${d.act}] {${d.type}} in DB and cache.`;
        break;
      }
      case `no`: {
        msg = `Unable to [${d.act}] {${d.type}} in DB and cache.`;
        break;
      }
    }

    return {
      res: d.res,
      msg,
      data: d.data,
    };
  },

  getWaitCacheRes: () => {
    return {
      res: `wait`,
      msg: `Cache hasn't finished intiating.`,
      data: null,
    };
  },

  getOptionsFromBody: (body) => {
    return {
      sorters: body.sorters ? body.sorters.split(`,`) : [`id`],
      sort_direction: body.sort_direction || `ascending`,
    };
  },

  calcValBeforePercChange: (val, perc_change) => {
    return (val / (100 + perc_change)) * 100;
  },

  formatAddress: (address) => {
    return !module.exports.isEmptyObj(address)
      ? `${address.substring(0, 4)}...${address.substring(
          address.length - 4,
          address.length
        )}`
      : ``;
  },
};
