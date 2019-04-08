//Libraries
const MPP = require('./client/script.js');

//Variables
var prefix = ';';
var args = [];
var currentMidi;
var isAdmin = false;
var admins = ['88e387b947e7a52007ea553b'];
var isBanned = false;
var bannedPpl = ['00d139b3151560822267012a'];
var commands = [
	{
		name: 'help',
		run: () => {
			MPP.chat.send(`Commands:`);
			for (i = 0; i < commands.length; i++) {
				MPP.chat.send(`- ${prefix}${commands[i].name}`);
			}
		}
	},
	{
		name: 'play',
		run: () => {
			try {
				for (i = 0; i < MPP.midis.length; i++) {
					if (MPP.midis[i] != undefined && args.join(' ').includes(MPP.midis[i].toLowerCase())) {
						MPP.midi.loadFile(`./midi/${MPP.midis[i]}`);
						MPP.midi.play();
						MPP.chat.send(`Now playing ${MPP.midis[i]}.`);
					} else if (Number(args[0]) > -1) {
						MPP.chat.send(`Now playing midi #${args[0]}.`);
						MPP.midi.loadFile(`./midi/${MPP.midis[Number(args[0])]}`);
						MPP.midi.play();
					} else if (MPP.midi.getCurrentTick() > 0 && !MPP.midi.endOfFile()) {
						MPP.midi.play();
					} else if (!args.join(' ').includes(MPP.midis[i].toLowerCase())) {
						MPP.chat.send(`Could not find ${args.join(' ')}.`);
					}
				}
			} catch(err) {
				MPP.chat.send(`Error: ${err}`);
			}
		},
		permLvl: 1
	},
	{
		name: 'pause',
		run: () => {
			MPP.midi.pause();
		}
	},
	{
		name: 'stop',
		run: () => {
			MPP.midi.stop();
		}
	},
	{
		name: 'joinRoom',
		run: () => {
			MPP.chat.send(`Joining room ${args[0]}...`);
			MPP.client.setChannel(args[0]);
		}
	},
	{
		name: 'say',
		run: () => {
			let canRunCmd = true;
			for (i = 0; i < commands.length; i++) {
				if (args.join(' ').startsWith(prefix + commands[i].name)) {
					canRunCmd = false;
					MPP.chat.send(`Error: The bot cannot run commands using ${prefix}say.`);
				}
			}

			if (canRunCmd) {
				MPP.chat.send(args.join(' '));
			}
		}
	},
	{
		name: 'shutdown',
		run: () => {
			if (isAdmin) {
				MPP.chat.send('Shutting down...');
				MPP.client.stop();
				console.log('Shutting down...');
				process.abort();
			}
		},
		permLvl: 1
	},
	{
		name: 'js',
		run: () => {
			if (isAdmin) {
				try {
					MPP.chat.send('> ' + eval(args.join(' ')));
				} catch(err) {
					MPP.chat.send('> ' + err);
					console.error(err);
				}
			}
		},
		permLvl: 1
	},
	{
		name: 'list',
		run: () => {
			MPP.chat.send('Midis:');
			for (i = 0; i < MPP.midis.length; i++) {
				MPP.chat.send(`${i}. ${MPP.midis[i]}`);
			}
		}
	},
	{
		name: 'id',
		run: () => {
			Object.keys(MPP.client.ppl).forEach((_id) => {
				let p = MPP.client.findParticipantById(_id);
				if (p.name.toLowerCase().startsWith(args.join(' ').toLowerCase())) {
					MPP.chat.send(`${p.name}'s (${p.color}) _id is: ${_id}`);
				}
			});
		}
	}
];

//Code
//MPP.client.setChannel('Autoplayer (Tehc)', undefined);
MPP.client.setChannel('Autoplayer (Tehc)', undefined);
MPP.client.start();

MPP.client.on('p', (msg) => {
	MPP.chat.send(`Welcome, ${msg.name} (${/*MPP.client.getColorName(msg.color)*/msg.color}). Type ${prefix}help for a list of commands.`);
});

MPP.client.on('a', (msg) => {
	for (i = 0; i < commands.length; i++) {
		if (msg.a.startsWith(prefix + commands[i].name)) {
			args = msg.a.split(' ');
			args.shift();

			for (id = 0; id < admins.length; id++) {
				if (msg.p._id == admins[id]) {
					isAdmin = true;
				}
			}

			for (id = 0; id < bannedPpl.legnth; id++) {
				if (msg.p._id == bannedPpl[id]) {
					isBanned = true;
				}
			}

			if (!isAdmin && commands[i].permLvl > 0) {
				MPP.chat.send(`You do not have permission to use this command ${msg.p.name}!`);
			}

			if (isBanned) {
				MPP.chat.send(`You do not have permission to use this command because you have been banned ${msg.p.name}!`);
			}

			if (!isBanned) {
				commands[i].run();
			}
			
			isAdmin = false;
			isBanned = false;
		}
	}
});