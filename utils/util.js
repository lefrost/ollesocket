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
    try {
      return crypto
        .randomBytes(length ? Math.floor(length / 2) : 20)
        .toString("hex");
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  
  generateAccessToken: () => {
    try {
      return `${module.exports.getTimestamp()}_${module.exports.generateId(20)}`;
    } catch (e) {
      console.log(e);
      return ``;
    }
  },

  getRandomNumber: (min, max) => {
    try {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    } catch (e) {
      console.log(e);
      return null;
    }
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
    try {
      return moment.utc().unix();
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  convertToTimestamp: (input, format) => {
    try {
      return moment.utc(input, format).unix();
    } catch (e) {
      console.log(e);
      return null;
    }
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
    try {
      return moment.unix(timestamp).utc().format(format);
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  formatDatetime: (datetime, format, timezone) => {
    try {
      // deprecated
      if (!timezone) {
        timezone = `UTC`;
      }
      return moment_tz.utc(datetime).tz(timezone).format(format);
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  getTimestampDiff: (start, end, format) => {
    try {
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
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  alterTimestamp: (operation, offset, type, timestamp) => {
    try {
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
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  isEmptyObj: (obj) => {
    try {
      for (let i in obj) return false;
      return true;
    } catch (e) {
      console.log(e);
      return false;
    }
  },

  isNumeric: (val) => {
    try {
      return /^-?\d+$/.test(val);
    } catch (e) {
      console.log(e);
      return false;
    }
  },
  
  isUrl: (val) => {
    try {
      let url;
      url = new URL(val);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch (e) {
      return false;
    }
  },

  removeNonalphanumerics: (str) => {
    try {
      return str.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  removeNonnumerics: (str) => {
    try {
      return str.replace(/[^0-9]/g, "").toLowerCase();
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  round: (num, precision) => {
    try {
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
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  
  stripHtml: (html) => {
    try {
      return html.replace(/(<([^>]+)>)/gi, "");
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  squeezeStr: (str) => {
    try {
      let m = module.exports;
      return m.stripHtml(m.removeNonalphanumerics(str));
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  squeezeNum: (str) => {
    try {
      let m = module.exports;
      return +m.stripHtml(m.removeNonnumerics(str));
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  squeezeWebsiteName: (url) => {
    try {
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
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  
  // getVideoDetails: (videoUrl) => {
  //   try {
  //     let done = new Promise((resolve, reject) => {
  //       ffmpeg.ffprobe(videoUrl, function (err, metadata) {
  //         resolve(metadata ? metadata : null);
  //       });
  //     });
  //     return done;
  //   } catch (e) {
  //     console.log(e);
  //     return null;
  //   }
  // },

  cleanObj: (obj) => {
    try {
      // https://stackoverflow.com/a/38340730/8919391
      return Object.fromEntries(
        Object.entries(obj).filter(([_, v]) => v !== null && v.length > 0)
      );
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  wait: (seconds) => {
    try {
      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve();
        }, seconds * 1000);
      });
    } catch (e) {
      console.log(e);
      return null;
    }
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
    try {
      return str.replaceAll(`&`, `[ampersand]`);
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  unurlifyString: (str) => {
    try {
      return str.replaceAll(`[ampersand]`, `&`);
    } catch (e) {
      console.log(e);
      return null;
    }
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
    try {
      // https://stackoverflow.com/a/56757215/8919391
      return arr.filter(
        (v, i, a) => a.findIndex((v2) => v2[key] === v[key]) === i
      );
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  getRes: (d) => {
    try {
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
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  getWaitCacheRes: () => {
    try {
      return {
        res: `wait`,
        msg: `Cache hasn't finished intiating.`,
        data: null,
      };
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  getOptionsFromBody: (body) => {
    try {
      return {
        sorters: body.sorters ? body.sorters.split(`,`) : [`id`],
        sort_direction: body.sort_direction || `ascending`,
      };
    } catch (e) {
      console.log(e);
      return null;
    }
  },
  
  calcPercChange: (a, b) => {
    try {
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
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  calcValBeforePercChange: (val, perc_change) => {
    try {
      let val_before_perc_change = (val / (100 + perc_change)) * 100;
      if (val_before_perc_change === Infinity) {
        val_before_perc_change = val * 2;
      }
      return val_before_perc_change || 0;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  formatAddress: (address) => {
    try {
      return !module.exports.isEmptyObj(address)
        ? `${address.substring(0, 4)}...${address.substring(
            address.length - 4,
            address.length
          )}`
        : ``;
    } catch (e) {
      console.log(e);
      return null;
    }
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
    try {
      // https://stackoverflow.com/a/46545530/8919391
      return arr
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value);
    } catch (e) {
      console.log(e);
      return [];
    }
  },

  getStructMetadataObj: (type, timestamp) => {
    try {
      let metadata_obj = {
        type: type || ``,
        add_timestamp: timestamp || module.exports.getTimestamp(),
        edit_timestamp: null,
        status: `active`,
        issues: [],
        flags: []
      }

      if ([`user`].includes(type)) {
        metadata_obj[`prev_gcloud_image_urls`] = []
      }

      if ([`user`].includes(type)) {
        metadata_obj[`access_token`] = ``; // format: `<timestamp>_<string>`
      }

      return metadata_obj;
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

      if (!(
        type &&
        item
      )) {
        return null;
      }

      let mapped_item = module.exports.clone(item);

      switch (type) {
        case `stat`: {
          // none
          break;
        }

        case `user_self`: {
          // note: logged-in user object of itself

          delete mapped_item.metadata;
          delete mapped_item.cache_medata;

          break;
        }
        
        case `user`: {
          // note: public-facing user object

          delete mapped_item.timezone;
          delete mapped_item.connections;
          delete mapped_item.stripe_subs;
          delete mapped_item.settings;
          delete mapped_item.metadata;
          delete mapped_item.cache_metadata;

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

      // ref: get online image with axios, response type has to be set to `arraybuffer` - https://stackoverflow.com/a/52648030/8919391, https://stackoverflow.com/a/47567280/8919391, https://stackoverflow.com/a/67629456/8919391
      let res = await rest.get({
        all: true,
        url: img_url,
        headers: {
          responseType: `arraybuffer`
        }
      });

      let res_content_type = (res && res.headers) ?
        res.headers.get(`content-type`) :
        ``;

      if (!(
        res &&
        res.data &&
        res_content_type
      )) {
        return null;
      }

      return `data:${res_content_type};base64,${Buffer.from(res.data).toString(`base64`) || ``}`;
    } catch (e) {
      console.log(e);
      return null;
    }
  },

  getImageExtensionFromBase64: (img_base64) => {
    try {
      if (!img_base64) {
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
