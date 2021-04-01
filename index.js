'use strict';

const settings = require('./settings')
const { Judgement } = require('./Judgement')
const server = require('@fwd/server')

const database = require('@fwd/database')(settings.db.type || 'local', {
	apikey: settings.db.key
})

const judge = new Judgement(settings, database)

async function run() {
	judge.update()
}

server.cron(async () => {
	run()
}, `every ${settings.interval_seconds} seconds`)

run()
