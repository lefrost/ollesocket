### 🍃 「olleatlas」 is Léfrost's Node.js socket-based API boilerplate.

- `npm i` to install packages.
- `node index.js` to run.
- `.env` file required. Variables: `API_TYPE = prod/dev`, `DB_URI = mongodb+srv:...`, `DISCORD_SERVER_ID`, `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`.
- [package.json](https://github.com/lefrst/ollesocket/blob/main/package.json) shows stable package versions.
- [Atlas](https://www.mongodb.com/atlas) database.
- [Socket.io](https://www.socket.io) lifecycle.
- [Heroku](https://www.heroku.com/home) deployment.
- [Discord.js](https://discordjs.guide) integration.
- Deploy to Heroku: `heroku login`, `heroku create app-name`, `heroku git:remote -a app-name`, `git push heroku main`. Push to Github first.
- [Buildpack](https://github.com/jontewks/puppeteer-heroku-buildpack) to make Puppeteer package work on Heroku.
- [Alternative solution](https://stackoverflow.com/a/74858297/8919391) for Puppeteer support on Heroku, reducing slug size.
