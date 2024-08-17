#### 🔮 ollesocket

- [socket.io](https://socket.io) api boilerplate by lé. preview on [heroku](https://ollesocket-api.herokuapp.com).
- `npm i`, `node index.js` to run. default port is 3001.
- deploy: push to github, `heroku login`, `heroku create app-name`, `heroku git:remote -a app-name`, `git push heroku main`.
- `env.PORT` is assigned automatically when deployed to heroku, and hence only needs to be declared locally.
- [mongo](https://mongodb.com/atlas/database) database, [discord.js](https://discordjs.guide) integration, alternative support for rest endpoints.
- [puppeteer](https://pptr.dev) support, [buildpack](https://github.com/jontewks/puppeteer-heroku-buildpack) for usage on heroku. [alternative solution](https://stackoverflow.com/a/74858297/8919391) for smaller slug size.
- [stripe](https://stripe.com) integration and webhook for subscriptions.
- use `stripe listen --forward-to localhost:<port>/stripe` in separate terminal to listen to stripe webhook events at `/stripe`.
- [google cloud](https://cloud.google.com/) integration for file/image storage.
- grant [`allUsers`](https://cloud.google.com/storage/docs/access-control/making-data-public#buckets) principle the `roles/storage.objectViewer` role for public google cloud bucket. 
- add [data/gcloud_service_account.json](https://console.cloud.google.com/iam-admin/serviceaccounts) ([guide](https://dev.to/kamalhossain/upload-file-to-google-cloud-storage-from-nodejs-server-5cdg)) file to enable google cloud functions.
- default image file path expected by `utils->gcloud.js` is `<bucket_name>/<prod/dev>/images/<directory_name>`.
- [nodemailer](https://nodemailer.com/) support for sending emails, designed to be used alongside [google workspace](https://blog.shaoula.com/using-nodemailer-with-google-workspace-oauth2-c338834659b2) email address(es). set domain-wide delegation scope to `https://mail.google.com/` to avoid google cloud scope auth error.
- designed to be used alongside [ollesvelke](https://github.com/lefrost/ollesvelke) frontend.