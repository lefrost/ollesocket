#### 🔮 ollesocket

- [socket.io](https://socket.io) api boilerplate by lé. preview on [heroku](https://ollesocket-api.herokuapp.com).
- `npm i`, `node index.js` to run. default port is 3001.
- deploy: push to github, `heroku login`, `heroku create app-name`, `heroku git:remote -a app-name`, `git push heroku main`.
- [mongo](https://mongodb.com/atlas/database) database, [discord.js](https://discordjs.guide) integration, alternative support for rest endpoints.
- [puppeteer](https://pptr.dev) support, [buildpack](https://github.com/jontewks/puppeteer-heroku-buildpack) for usage on heroku. [alternative solution](https://stackoverflow.com/a/74858297/8919391) for smaller slug size.
- [stripe](https://stripe.com) integration and webhook for subscriptions.
- use `stripe listen --forward-to localhost:<port>/stripe` in separate terminal to listen to stripe webhook events at `/stripe`.
- [google cloud](https://cloud.google.com/) integration for file/image storage.
- add [data/gcloud_service_account_key.json](https://dev.to/kamalhossain/upload-file-to-google-cloud-storage-from-nodejs-server-5cdg) file to enable google cloud functions.
- default image file path expected by `utils->gcloud.js` is `<bucket_name>/<prod/dev>/images/<directory_name>`.