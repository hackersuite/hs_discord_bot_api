import { APITeam } from '../controllers/TeamController';
import { CreateMessageData } from '../utils/DiscordConstants';

export function teamWelcome(team: APITeam): CreateMessageData {
	return {
		embed: {
			title: `Welcome "${team.name}"! ✨`,
			description: 'This is your private team chat, only members of your team and organisers can access it. ' +
			'The same goes for your voice channel!\n\n' +
			'If members of your team are missing, make sure that they have signed up on the ' +
			'[GreatUniHack website](https://auth.greatunihack.com/) and have then joined the Discord server. ' +
			'If they joined the server and _then_ joined the team, they may need to click the "Join Discord" button again.\n\n' +
			'If you need any further assistance, feel free to message in the Hackathon channels above.\n\n' +
			'Have fun and good luck!',
			color: 0xfa66c1
		}
	};
}
