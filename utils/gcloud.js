const GCLOUD_PROJECT_ID = process.env.GCLOUD_PROJECT_ID;
const GCLOUD_BUCKET_ID = process.env.GCLOUD_BUCKET_ID;

// tba (gcloud): env (eg. GCLOUD_PROJECT_ID, GCLOUD_BUCKET_ID) and code (eg. import from "@google-cloud/storage") setup for connecting to googlecloud --- implement similar one-time connect() function to utils->mongo.connect()

// tba (gcloud): uploadImage(image_obj, name) used in adhoc->addUser()/editUser()

// tba (gcloud): delImage(image_url) used in processes->user.js when processing `user.metadata.prev_gcloud_image_urls`

/* references:
  - setup gcloud and prelim for upload image to gcloud->project->bucket - https://dev.to/kamalhossain/upload-file-to-google-cloud-storage-from-nodejs-server-5cdg
  - specific code for upload image *object* to gcloud->project->bucket - https://stackoverflow.com/a/58478504/8919391
  - various aspects of uploading image from frontend to nodejs, such as mimetype checking and size limit enforcement (involves importing `fileUpload = require('express-fileupload')` in index.js): https://pqina.nl/blog/upload-image-with-nodejs/
  - del image from gcloud->project->bucket - https://stackoverflow.com/a/53298761/8919391
*/