const GCLOUD_PROJECT_ID = process.env.GCLOUD_PROJECT_ID;
const GCLOUD_BUCKET_ID = process.env.GCLOUD_BUCKET_ID;

const { Storage } = require('@google-cloud/storage')

let gcloud_storage;
let gcloud_bucket;

module.exports = {
  connect: async () => {
    try {
      gcloud_storage = new Storage({
        keyFilename: `gcloud_service_account_key.json`
      });
  
      gcloud_bucket = gcloud_storage.bucket(GCLOUD_BUCKET_ID);
    } catch (e) {
      console.log(e);
    }
  },

  uploadImage: async (image_file, directory_name, file_name) => {
    try {
      // note: if successful, will return url to the image uploaded to gcloud
      if (!(
        image_file &&
        image_file.mimetype &&
        /^image/.test(image_file.mimetype) &&
        directory_name &&
        file_name
      )) {
        return null;
      } else {
        // note: accept base64 format for image input
        // let file = gcloud_bucket.file(`images/${directory_name}/${file_name}`);

        return `tba`;
      }
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}

// tba (gcloud): uploadImage(image_file, directory, name) used in adhoc->addUser()/editUser()

// tba (gcloud): delImage(image_url) used in processes->user.js when processing `user.metadata.prev_gcloud_image_urls`

/* references:
  - setup gcloud and prelim for upload image to gcloud->project->bucket - https://dev.to/kamalhossain/upload-file-to-google-cloud-storage-from-nodejs-server-5cdg
  - specific code for upload image *object* to gcloud->project->bucket - https://stackoverflow.com/a/58478504/8919391
  - various aspects of uploading image from frontend to nodejs, such as mimetype checking and size limit enforcement (involves importing `fileUpload = require('express-fileupload')` in index.js): https://pqina.nl/blog/upload-image-with-nodejs/
  - del image from gcloud->project->bucket - https://stackoverflow.com/a/53298761/8919391
*/