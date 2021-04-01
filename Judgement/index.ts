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

			if (!this.latest_seen[target]) {
				this.latest_seen[target] = 0;
			}

			await this.getMods(target);

			let judgements_made = 0;

			console.log(`Checking to judge /r/${target}`);
			console.log(`Latest comment seen: ${this.latest_seen[target]}`);

			this.reddit.getNewComments(target).then(async comments => {
				for (let scan = comments.length - 1; scan >= 0; --scan) {
					let comment = comments[scan];

					if (comment.created_utc <= this.latest_seen[target]) {
						continue;
					}

					if (await this.issueDivineJudgement(comment)) {
						judgements_made++;
					}

					if (comment.created_utc > this.latest_seen[target]) {
						this.latest_seen[target] = comment.created_utc;
					}
				}
			}).then(() => {
				if (judgements_made > 0) {
					console.log(`Judgements issued: ${judgements_made}`)
				} else {
					console.log(`Done checking, no new judgements.`);
				}
			});
		} catch (e) {
			console.log(e.message);
			console.log(`Failed.`);
		}
	}

	async issueDivineJudgement(comment: snoowrap.Comment): Promise<boolean> {
		let user = comment.author;
		let sub = comment.subreddit;
		let sub_id = sub.id;
		let sub_name_raw = comment.subreddit.display_name;
		let sub_name = comment.subreddit_name_prefixed;
		let new_flair = this.generateFlair(user.name, this.settings.hash_salt);
		let key = this.getUserKey(comment);
		let mods = await this.getMods(sub_name);

		if (mods.includes(user.name)) {
			console.log(`Skipping judgement for ${user.name}. They're a mod, after all.`);
			return false;
		}

		let current_flair = await sub.getUserFlair(user.name);
		let user_data = await this.database.findOne('users/flair', { key: key });

		if (current_flair.flair_css_class === new_flair.css_class) {
			console.log(`${user.name} judgement already rendered.`);
			return false;
		}

		if (user_data) {
			console.log(`${user.name} is judged, but they've modified their flair! Resetting.`);
		}

		if (this.settings.dry_run) {
			console.log(`**DRY_RUN** JUDGING: ${sub_name}/${user.name} flair: ${new_flair.text}`);
			return true;
		} else {
			console.log(`JUDGING: ${sub_name}/${user.name} flair: ${new_flair.text}`);
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

	getUserKey(comment: snoowrap.Comment): string {
		return `${comment.subreddit_id}/${comment.author.name}`;
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
