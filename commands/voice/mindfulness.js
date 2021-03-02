const Command = require('../../structures/Command');
const request = require('node-superfetch');
const { Readable } = require('stream');
const { reactIfAble } = require('../../util/Util');
const { LOADING_EMOJI_ID } = process.env;

module.exports = class MindfulnessCommand extends Command {
	constructor(client) {
		super(client, {
			name: 'mindfulness',
			aliases: ['mindful'],
			group: 'voice',
			memberName: 'mindful',
			description: 'Immerse yourself in some mindful quotes.',
			guildOnly: true,
			throttling: {
				usages: 1,
				duration: 10
			},
			userPermissions: ['CONNECT', 'SPEAK'],
			credit: [
				{
					name: 'InspiroBot',
					url: 'https://inspirobot.me/',
					reason: 'API'
				}
			]
		});
	}

	async run(msg) {
		const connection = this.client.voice.connections.get(msg.guild.id);
		if (!connection) {
			const usage = this.client.registry.commands.get('join').usage();
			return msg.reply(`I am not in a voice channel. Use ${usage} to fix that!`);
		}
		if (this.client.dispatchers.has(msg.guild.id)) return msg.reply('I am already playing audio in this server.');
		try {
			await reactIfAble(msg, this.client.user, LOADING_EMOJI_ID, '💬');
			const flow = await this.fetchFlow();
			const { body } = await request.get(flow.mp3);
			const dispatcher = connection.play(Readable.from([body]));
			this.client.dispatchers.set(msg.guild.id, dispatcher);
			dispatcher.once('finish', () => this.client.dispatchers.delete(msg.guild.id));
			dispatcher.once('error', () => this.client.dispatchers.delete(msg.guild.id));
			await reactIfAble(msg, this.client.user, '🔉');
			for (const item of body.data) {
				if (item.type !== 'text') continue;
				setTimeout(() => msg.say(item.text).catch(() => null), item.time * 1000);
			}
			return null;
		} catch (err) {
			await reactIfAble(msg, this.client.user, '⚠️');
			return msg.reply(`Oh no, an error occurred: \`${err.message}\`. Try again later!`);
		}
	}

	async fetchFlow() {
		const { body } = await request
			.get('https://inspirobot.me/api')
			.query({ generateFlow: 1 });
		return body;
	}
};
