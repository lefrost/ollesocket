const stream = require('stream');

const API_TYPE = process.env.API_TYPE;
const GCLOUD_PROJECT_ID = process.env.GCLOUD_PROJECT_ID;
const GCLOUD_BUCKET_ID = process.env.GCLOUD_BUCKET_ID;

const { Storage } = require('@google-cloud/storage')

// note: in gcloud->bucket->permissions, ensure "public access" is "enabled", ensure "access control" is "ACL", ensure to grant principal "xxx@xxx.iam.gserviceaccount.com" the role of "storage object admin", and ensure to grant principal "allUsers" the role of "storage object viewer"

let gcloud_storage;
let gcloud_bucket;

module.exports = {
  connect: async () => {
    try {
      gcloud_storage = new Storage({
        // projectId: GCLOUD_PROJECT_ID, // note: not required
        keyFilename: `./data/gcloud_service_account_key.json`
      });

      gcloud_bucket = gcloud_storage.bucket(GCLOUD_BUCKET_ID);
    } catch (e) {
      console.log(e);
    }
  },

  uploadImage: async (image_base64, image_extension, directory_name, file_name) => {
    return new Promise(async (resolve) => {
      try {
        // note: accept base64 format for image input --- if image upload is successful, will return url to the image uploaded to gcloud
        if (!(
          image_base64 &&
          image_extension &&
          directory_name &&
          file_name
        )) {
          resolve(null);
        } else {
          let buffer_stream = new stream.PassThrough();
          buffer_stream.end(
            Buffer.from(
              // note: remove `data:image/<image_format>;base64,` portion of base64 string when sending into buffer; ref - https://stackoverflow.com/a/74250660/8919391
              (image_base64 || ``).split(`;base64,`).pop(),
              `base64`
              )
          );
  
          let gcloud_file_path = `${(API_TYPE === `dev`) ? `dev` : `prod`}/images/${directory_name}/${file_name}.${image_extension}`;
  
          let file = gcloud_bucket.file(gcloud_file_path);
  
          buffer_stream.pipe(
            file.createWriteStream({
              metadata: {
                contentType: `image/${image_extension}`,
                metadata: {
                  custom: 'metadata'
                }
              },
              validation: `md5`
            })
          ).on(`error`, (e) => {
            console.log(e);
            resolve(null);
          }).on(`finish`, () => {
            resolve(`https://storage.googleapis.com/${GCLOUD_BUCKET_ID}/${gcloud_file_path}`);
          });
        }
      } catch (e) {
        console.log(e);
        resolve(null);
      }
    });
  },

  delImage: async (image_url) => {
    return new Promise(async (resolve) => {
      try {
        // note: accept image_url --- will return `done`/`error` depending on if image deletion is successful
        if (
          image_url &&
          image_url.includes(`https://storage.googleapis.com/${GCLOUD_BUCKET_ID}/`)
        ) {
          let gcloud_file_path = image_url.replace(`https://storage.googleapis.com/${GCLOUD_BUCKET_ID}/`, ``);
          let file = gcloud_bucket.file(gcloud_file_path);
          await file.delete();
          resolve(`done`);
        } else {
          resolve(`error`);
        }
      } catch (e) {
        console.log(e);
        resolve(`error`);
      }
    });
  }
}

/* ref:
  - setup gcloud and prelim for upload image to gcloud->project->bucket - https://dev.to/kamalhossain/upload-file-to-google-cloud-storage-from-nodejs-server-5cdg (setup instructions incomplete, see note(s) above)
  - (unused) specific code for upload image *object* to gcloud->project->bucket - https://stackoverflow.com/a/58478504/8919391
  - (partly used) various aspects of uploading image from frontend to nodejs, such as mimetype checking and size limit enforcement (involves importing `fileUpload = require('express-fileupload')` in index.js): https://pqina.nl/blog/upload-image-with-nodejs/
  - upload base64 image to gcloud->project->bucket - https://stackoverflow.com/a/42887642/8919391
  - get gcloud public file URL: https://cloud.google.com/storage/docs/access-public-data#api-link, https://stackoverflow.com/a/57154210/8919391, https://stackoverflow.com/a/21226442/8919391
  - del image from gcloud->project->bucket - https://stackoverflow.com/a/53298761/8919391, https://cloud.google.com/storage/docs/deleting-objects#storage-delete-object-nodejs
*/