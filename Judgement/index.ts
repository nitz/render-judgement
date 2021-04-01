import snoowrap from 'snoowrap';
const server = require('@fwd/server');

export class Judgement {
	readonly USER_AGENT = `random-flair-nodejs-v1.0.0`;
	readonly FLAIRED_CSS_CLASS = `judgement-calculated`;
	reddit: snoowrap;
	latest_seen: { [key: string]: number } = {};
	moderators: { [key: string]: string[] } = {};

	constructor(private settings: any,
		private database: any) {
		this.reddit = new snoowrap({
			userAgent: this.USER_AGENT,
			clientId: settings.reddit.cid,
			clientSecret: settings.reddit.secret,
			refreshToken: settings.reddit.token
		});
	}

	async getMods(target: string): Promise<string[]> {
		if (!this.settings.ignore_mods) {
			return [];
		}
		if (this.moderators[target]) {
			return this.moderators[target];
		}

		let sub = this.reddit.getSubreddit(target);
		let id = await sub.id;
		let name = await sub.display_name_prefixed;

		let sub_mods = sub.getModerators();
		let mods = await sub_mods.map(m => m.name);
		//let mods: string[] = [];
		//let mods = sub_mods.map(m => m.name);
		//let mods = await Promise.all(await sub_mods.map(m => m.name));
		//sub_mods.forEach(m => mods.push(m.name));
		//for (let scan = 0; scan < sub_mods.length; ++scan) {
		//	mods.push(await sub_mods[scan].name);
		//}

		console.log(`Moderators for ${name} (${id}): ${mods.join(', ')}`);
		this.moderators[name] = mods;
		if (name !== target) {
			this.moderators[target] = mods;
		}
		return mods;
	}

	async update() {
		try {
			let target = this.settings.target_sub;

			await this.getMods(target);

			console.log(`Checking to judge /r/${target}`);

			let sub = this.reddit.getSubreddit(target);

			let s = sub.getNew().then(async submissions => {
				return await this.judiciumDivinum(submissions, target, 'submission');
			});

			let c = sub.getNewComments(target).then(async comments => {
				return await this.judiciumDivinum(comments, target, 'comment');
			});

			let retribution = [s, c];

			Promise.all(retribution).then(judgements => {
				let total_judgements = judgements.reduce((a, b) => a + b, 0);
				if (total_judgements > 0) {
					console.log(`Judgements issued: ${total_judgements}`)
				} else {
					console.log(`Done checking, no new judgements.`);
				}
			});
		} catch (e) {
			console.log(e.message);
			console.log(`Failed.`);
		}
	}

	// judgement is imminent!
	async judiciumDivinum<T extends snoowrap.VoteableContent<T>>(
		listing: snoowrap.Listing<T>,
		target: string,
		seen_type: string) {
		let judgements_made = 0;
		const seen_key = `${target}.${seen_type}`;

		if (!this.latest_seen[seen_key]) {
			this.latest_seen[seen_key] = 0;
		}

		let ts = new Date(this.latest_seen[seen_key]).toString();
		console.log(`Latest ${seen_type} seen: ${ts}`);

		for (let scan = listing.length - 1; scan >= 0; --scan) {
			let content = listing[scan];

			if (content.created_utc <= this.latest_seen[seen_key]) {
				continue;
			}

			if (await this.issueDivineJudgement(content, seen_type)) {
				judgements_made++;
			}

			if (content.created_utc > this.latest_seen[seen_key]) {
				this.latest_seen[seen_key] = content.created_utc;
			}
		}

		return judgements_made;
	}

	// glorious retribution has arrived!
	async issueDivineJudgement<T>(content: snoowrap.VoteableContent<T>, type: string): Promise<boolean> {
		let user = content.author;
		let sub = content.subreddit;
		let sub_id = sub.id;
		let sub_name_raw = content.subreddit.display_name;
		let sub_name = content.subreddit_name_prefixed;
		let new_flair = this.generateFlair(user.name, this.settings.hash_salt);
		let key = this.getUserKey(content);
		let mods = await this.getMods(sub_name);

		if (mods.includes(user.name)) {
			console.log(`Skipping judgement for ${user.name}. They're a mod, after all.`);
			return false;
		}

		let current_flair = await sub.getUserFlair(user.name);
		let user_data = await this.database.findOne('users/flair', { key: key });

		if (current_flair.flair_css_class === new_flair.css_class) {
			console.log(`${user.name} judgement already rendered.  (${type})`);
			return false;
		}

		if (user_data) {
			console.log(`${user.name} is judged, but they've modified their flair! Resetting.`);
		}

		if (this.settings.dry_run) {
			console.log(`**DRY_RUN** JUDGING: ${sub_name}/${user.name} flair: ${new_flair.text}`);
			return true;
		} else {
			console.log(`JUDGING: ${sub_name}/${user.name} flair: ${new_flair.text} (${type})`);
		}

		// they haven't been judged. store their current flair, and JUDGE THEM
		await this.dbCreateOrUpdate('users/flair', {
			key: key,
			user: user.name,
			text: current_flair.flair_text,
			css_class: current_flair.flair_css_class,
			judgedment: new_flair
		});

		user.assignFlair({
			subredditName: sub_name_raw,
			text: new_flair.text,
			cssClass: new_flair.css_class
		});

		return true;
	}

	getUserKey<T>(content: snoowrap.VoteableContent<T>): string {
		return `${content.subreddit_id}/${content.author.name}`;
	}

	async dbCreateOrUpdate(table: string, data: any) {
		let existing = await this.database.find(table, { key: data.key });
		if (existing && existing.length >= 1) {
			await this.database.update(table, existing[0].id, data);
		} else {
			data.id = server.uuid();
			await this.database.create(table, data);
		}
	}

	generateFlair(name: string, salt: string): any {

		let hash = this.hash(`${name}${salt}`);

		const categories = [
			'Tinkie-Winkie',
			'Dipsy',
			'Laa-Laa',
			'Po'
		];

		let choice = hash % categories.length;
		let category = categories[choice];

		let letter = (((hash - 10) % 26) + 10).toString(36).toUpperCase();
		let number = (((hash - 10) % 10)).toString();

		let result = `${category}-${letter}${number}`;

		return {
			hash: hash,
			text: result,
			css_class: `${this.FLAIRED_CSS_CLASS}-${choice}`
		};
	}

	// based on DJB's 'times 33'
	hash(str: string) {
		let hash = 5381;
		let index = str.length;

		while (index) {
			hash = (hash * 33) ^ str.charCodeAt(--index);
		}

		return hash >>> 0;
	}
}
