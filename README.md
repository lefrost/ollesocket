#### 🔮 ollesocket

- [socket.io](https://www.socket.io) api boilerplate by lé. preview on [heroku](https://ollesocket-api.herokuapp.com).
- `npm i`, `node index.js` to run. default port is 3001.
- deploy: push to github, `heroku login`, `heroku create app-name`, `heroku git:remote -a app-name`, `git push heroku main`.
- [atlas](atlas) database, [discord.js](https://discordjs.guide) integration, alternative support for rest endpoints.
- [buildpack](https://github.com/jontewks/puppeteer-heroku-buildpack) for puppeteer support on heroku. [alternative solution](https://stackoverflow.com/a/74858297/8919391) for smaller slug size.
- remember to re-add `.env` in `.gitignore`