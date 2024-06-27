// var ffmpeg = require("fluent-ffmpeg");
// const ffprobeInstaller = require("@ffprobe-installer//ffprobe");
// ffmpeg.setFfprobePath(ffprobeInstaller.path);

var crypto = require(`crypto`);
var moment = require(`moment`);
var moment_tz = require(`moment-timezone`);
// var _ = require(`lodash`);

let rest = require(`./rest`);

const ITEM_TYPES = require(`../data/item_types.json`);

module.exports = {
  generateId: (length) => {
    return crypto
      .randomBytes(length ? Math.floor(length / 2) : 20)
      .toString("hex");
  },
  getRandomNumber: (min, max) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  getWeekdayOfTimestamp: (timestamp) => {
    try {
      let weekdays = [
        `Monday`,
        `Tuesday`,
        `Wednesday`,
        `Thursday`,
        `Friday`,
        `Saturday`,
        `Sunday`,
      ];
      return weekdays[moment.unix(timestamp).isoWeekday() - 1];
    } catch (e) {
      console.log(e);
      return ``;
    }
  },
  getTimestamp: () => {
    return moment.utc().unix();
  },
  convertToTimestamp: (input, format) => {
    return moment.utc(input, format).unix();
  },
  datetimeToTimestamp: (d) => {
    // new
    try {
      let datetime_timezone = d.datetime_timezone || `UTC`;
      let datetime = d.datetime || ``;
      
      return Number(moment(datetime).tz(datetime_timezone).format(`X`));
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  timestampToDatetime: (d) => {
    // new
    try {
      let timestamp = d.timestamp || 0;
      let datetime_timezone = d.datetime_timezone || `UTC`;
      let datetime_format = d.datetime_format || `YYYY-MM-DDTHH:mm`;
      
      return moment.tz(moment.unix(timestamp), datetime_timezone).format(datetime_format);
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  formatTimestamp: (timestamp, format) => {
    return moment.unix(timestamp).utc().format(format);
  },
  formatDatetime: (datetime, format, timezone) => {
    // deprecated
    if (!timezone) {
      timezone = `UTC`;
    }
    return moment_tz.utc(datetime).tz(timezone).format(format);
  },
  getTimestampDiff: (start, end, format) => {
    let diff = moment.duration(moment.unix(end).diff(moment.unix(start)));
    // let diff = moment.duration(start.diff(end));

    switch (format) {
      case `days`:
        return diff.asDays();
      case `hours`:
        return diff.asHours();
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
    try {
      return obj ? JSON.parse(JSON.stringify(obj)) : null;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  sanitiseString: (str) => {
    try {
      return (str || ``).trim().toLowerCase().replaceAll(` `, ``);
    } catch (e) {
      console.log(e);
      return ``;
    }
  },

  urlifyString: (str) => {
    return str.replaceAll(`&`, `[ampersand]`);
  },

  unurlifyString: (str) => {
    return str.replaceAll(`[ampersand]`, `&`);
  },

  normaliseNum: (num) => {
    try {
      let num_string = num.toString();
      if (num_string.includes(`e`)) {
        return Number(num.toLocaleString("fullwide", { useGrouping: false }));
      } else {
        return num;
      }
    } catch (e) {
      console.log(e);
      return 0;
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
  
  calcPercChange: (a, b) => {
    let perc_change;
    if (b !== 0) {
      if (a !== 0) {
        perc_change = (b - a) / a * 100;
      } else {
        perc_change = b * 100;
      }
    } else {
      perc_change = - a * 100;            
    }       
    return Number(perc_change.toFixed(2));
  },

  calcValBeforePercChange: (val, perc_change) => {
    let val_before_perc_change = (val / (100 + perc_change)) * 100;
    if (val_before_perc_change === Infinity) {
      val_before_perc_change = val * 2;
    }
    return val_before_perc_change || 0;
  },

  formatAddress: (address) => {
    return !module.exports.isEmptyObj(address)
      ? `${address.substring(0, 4)}...${address.substring(
          address.length - 4,
          address.length
        )}`
      : ``;
  },

  roundNum(num, decimals) {
    try {
      return +(Math.round(num + `e+${decimals || 0}`) + `e-${decimals || 0}`);
    } catch (e) {
      console.log(e);
      return 0;
    }
  },

  shuffleArray: (arr) => {
    // https://stackoverflow.com/a/46545530/8919391
    return arr
      .map((value) => ({ value, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ value }) => value);
  },

  getStructMetadataObj: (type, timestamp) => {
    try {
      return {
        type: type || ``,
        add_timestamp: timestamp || module.exports.getTimestamp(),
        edit_timestamp: null,
        status: `active`,
        issues: [],
        flags: [],
        prev_gcloud_image_urls: []
      }
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  mapItem: (type, item, arrays, options) => {
    try {
      // note: used to map items from adhoc for processing and/or sending to frontend
      // note: arrays is retrieved from adhoc->getMapArrays()
      // note: options{...}

      let mapped_item = util.clone(item);

      switch (type) {
        case `user`: {
          // todo
          break;
        }
      }

      return mapped_item || null;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  imgUrlToBase64: async (img_url) => {
    try {
      if (!(img_url || ``).trim()) {
        return null;
      }

      // ref: get online image with axios, response type has to be set to `arraybuffer` - https://stackoverflow.com/a/52648030/8919391
      let img = await rest.get({
        url: img_url,
        headers: {
          responseType: `arraybuffer`
        }
      });

      if (!(
        img &&
        img.data
      )) {
        return null;
      }

      return Buffer.from(img.data).toString(`base64`) || ``;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  getImageExtensionFromBase64: async (img_base64) => {
    try {
      if (!img_base_64) {
        return ``;
      }

      // reference: https://stackoverflow.com/a/40708540/8919391
      return img_base64.substring(`data:image/`.length, img_base64.indexOf(`;base64`)) || ``;
    } catch (e) {
      console.log(e);
      return ``;
    }
  }
};
