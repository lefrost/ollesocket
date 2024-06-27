#### 🔮 ollesocket

- [socket.io](https://www.socket.io) api boilerplate by lé. preview on [heroku](https://ollesocket-api.herokuapp.com).
- `npm i`, `node index.js` to run. default port is 3001.
- deploy: push to github, `heroku login`, `heroku create app-name`, `heroku git:remote -a app-name`, `git push heroku main`.
- [atlas](https://www.mongodb.com/atlas/database) database, [discord.js](https://discordjs.guide) integration, alternative support for rest endpoints.
- [buildpack](https://github.com/jontewks/puppeteer-heroku-buildpack) for puppeteer support on heroku. [alternative solution](https://stackoverflow.com/a/74858297/8919391) for smaller slug size.
- add [data/gcloud_service_account_key.json](https://dev.to/kamalhossain/upload-file-to-google-cloud-storage-from-nodejs-server-5cdg) file to implement gcloud functions.