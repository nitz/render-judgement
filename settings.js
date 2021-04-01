require('dotenv').config()

const getenv = require('getenv')

let settings = {
    target_sub: getenv('TARGET_SUBREDDIT'),
    hash_salt: getenv('HASH_SALT', ''),
    ignore_mods: getenv.boolish('IGNORE_MODS', false),

    dry_run: getenv.boolish('DRY_RUN', true),
    interval_seconds: getenv('RUN_EVERY_SECONDS'),

    db: {
        type: getenv('DATABASE_TYPE'),
        key: getenv('DATABASE_KEY', '')
    },

    reddit: {
        cid: getenv('REDDIT_CLIENT_ID'),
        secret: getenv('REDDIT_CLIENT_SECRET'),
        token: getenv('REDDIT_REFRESH_TOKEN')
    }
}

module.exports = settings
