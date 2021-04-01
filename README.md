<h1 align="center">Render Judgement ⚒️</h1>

> Brand them with your might! 🔥

## What's it?

A node.js package that monitors for incoming comments on a given subreddits, assigning goofy flair to users as it finds them.

## Legal

This package is licened under the GPL 3.0 only (SPDX GPL-3.0-only). The packages it makes use of are licensed under their own terms.

Use at your own risk. There is no guarantee of profits.

## Setup

These are very brief instructions, because I can't be arsed to write anything more for a dumb joke.

You'll need (some version) of `nodejs` and `npm`. I used v15.12.0 and v7.6.3 respectively. Might work with more, who knows.

- [ ] Sign Into Reddit
- [ ] Create a new [app](https://www.reddit.com/prefs/apps/), with whatever name you like, as a 'script'.
- [ ] Use this url as the redirect URL: https://not-an-aardvark.github.io/reddit-oauth-helper/
- [ ] Go to that page, and give it your client ID and secret, and tick `Permanent`.
- [ ] Select the scopes `read`, `flair`, `modflair`, then hit `Generate Tokens`.
- [ ] Duplicate the file `.env.example`, and name it `.env`
- [ ] Edit `.env`, and fill in all the information you've aquired, as well as target subreddit, etc.
  - You can leave blank: `HASH_SALT` and `DATABASE_KEY`. Everything else should be set with the values you obtained above, or based on what you want to do.
- [ ] Run `npm install`
- [ ] Run `npm start` (Or, you can use `pm2` or your favorite method of managing node modules. I can't stop you, I'm not your supervisor.)
- [ ] Enjoy flair.
- [ ] If you want to edit the flair randomization, check the function `Judgement.generateFlair` in `Judgement/index.ts`.

## Why?

Happy April Fools, 2021!

## Bugs?

Almost assuredly. You're welcome to open an issue, but I'm likely to ignore it. 😉

## 📝 License

© 2020 [Chris Marc Dailey](https://cmd.wtf).

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
