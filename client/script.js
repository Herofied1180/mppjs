/*
 *	All credit goes to multiplayerpiano.com for creating script.js, and Tehc for
 *						recreating script.js in Node.js.
 *
 *			  Recreated and ported to Node.js in ES6/ES5 by Tehc.
**/

// TODO - Add midi keyboard support so the bot owner can play while hosting

//Files
// Client.js
const Client = require('./Client.js');
// Config.json
const Config = require('../config.json');
//Libraries
const MidiPlayer = require('midi-player-js');
const fs = require('fs');

// TODO - Implement a GUI using Electron

//Initialize the midi player and register event handler (This is a little glitched, but I'll keep it so it doesn't break people's projects)
const gMidiPlayer = new MidiPlayer.Player((event) => {
	if (event.name == 'Note on') {
		press(piano.keys[event.noteName], event.velocity/100);
	} else if (event.name == 'Note off') {
		release(piano.keys[event.noteName]);
	}
});

class MPP {
	constructor(uri = undefined, proxy = undefined) {
		this.chat = {
			send: (msg) => {
				this.client.sendArray([{m: 'a', message: msg}]);
			},
			clear: () => {
				console.warn('Error(Code 100 Not Implemented):\nMPP.chat.clear() is not yet implemented.');
			},
			blur: () => {
				console.warn('Error(Code 100 Not Implemented):\nMPP.chat.blur() is not yet implemented.');
			},
			hide: () => {
				console.warn('Error(Code 100 Not Implemented):\nMPP.chat.hide() is not yet implemented.');
			},
			show: () => {
				console.warn('Error(Code 100 Not Implemented):\nMPP.chat.show() is not yet implemented.');
			},
			scrollToBottom: () => {
				console.warn('Error(Code 100 Not Implemented):\nMPP.chat.scrollToBottom() is not yet implemented.');
			},
			receive: (msg) => {
				console.warn('Error(Code 100 Not Implemented):\nMPP.chat.receive() is not yet implemented.');
			}
		};
		// TODO - Implement support for gSoundSelector
		this.soundSelector = undefined;
		// TODO - Implement support for gNoteQuota
		this.noteQuota = undefined;
		this.sustain = false;
		this.piano = {
			keys: require('./keyMap.json')
		};
		this.midis = [];
		this.client = new Client(uri, proxy);
	};
	press(id, vol) {
		this.client.startNote(id, vol);
	};
	release(id) {
		this.client.stopNote(id);
	};
	// TODO - Add a piano to the GUI and add support for MPP.press
	pressSustain() {
		this.sustain = true;
	};
	// TODO - Add a piano to the GUI and add support for MPP.release
	releaseSustain() {
		this.sustain = false;
	}
}

/*const gNoteQuota = (() => {
	var last_rat = 0;
	var nqjq = 0;
	setInterval(() => {
		gNoteQuota.tick();
	}, 2000);
	return new NoteQuota((points) => {
		// update UI(There is no ui in Node.js)
		/*var rat = (points / this.max) * 100;
		last_rat = rat;*
	});
});*/

//Add midis to the midi list (Bugged)
/*fs.readdir('@mpp.js/midi', (err, files) => {
	if (err) throw err;

	files.forEach((file, index) => {
		console.log(`Found ${file} in midis folder.`);
		fs.stat(`@mpp.js/midi/${file}`, (error, stat) => {
			if (error) throw error;
			if (stat.isFile()) {
				midis.push(file);
				console.log(`${file} is a file.`);
			}
			/*let content = fs.readFileSync('./names.txt', 'utf8');
			if (content.split('\n').length < midis) {
				fs.writeFile('./names.txt', content + midis[midis.length - 1]);
				console.log(`${file} added names.txt.`);
			}*
		});
	});
});*/

// (Default Bot Code)
if (Config.core.showPplCount) {
	gClient.on('count', (count) => {
		console.log(`${count} people are in the room.`);
	});
}
if (Config.core.defaultCommands) {
	gClient.on('a', (msg) => {
		if (msg.a == '@info@') {
			chat.send('MPP.js made by: Tehc(Tehcjs)');
		} else if (msg.a == '@help@') {
			chat.send('Core Commands: @info@, @help@, @invite@, @discord@, @git@, @github@');
		} else if (msg.a == '@invite@' || msg.a == '@discord@') {
			chat.send(/*'Discord Invite: (none)'*/'There is currently no discord. I\'ll be making one soon.');
		} else if (msg.a == '@git@' || msg.a == '@github@') {
			chat.send('MPP.js Github: https://github.com/TehcJS/mppjs');
		} /*else if (msg.a.startsWith('@play@')) { Also glitched...
			if (!gMidiPlayer.isPlaying) {
				let args = msg.a.split(' ');
				gMidiPlayer.loadFile(`./midi/${args[1]}`);
				gMidiPlayer.play();
				chat.send(`Now playing ${args[1]}.`);
			} else {
				chat.send('Song already playing.');
			}
		} else if (msg.a.startsWith('@pause@')) {
			gMidiPlayer.pause();
			chat.send('Song paused.');
		} else if (msg.a.startsWith('@stop@')) {
			gMidiPlayer.stop();
			chat.send('Song stopped.');
		} else if (msg.a.startsWith('@tempo@')) {
			let args = msg.a.split(' ');
			if (Number(args[1]) != NaN) {
				gMidiPlayer.setTempo(Number(args[1]));
			}
		} else if (msg.a.startsWith('@unpause@')) {
			gMidiPlayer.play();
			chat.send('Song unpaused.');
		}*/
	});
}
if (Config.core.welcomePpl) {
	gClient.on('p', (msg) => {
		console.log(`${msg.name} (${gClient.getColorName(msg.p.color)}) has joined the room.`);
		if (Config.core.defaultCommands) {
			chat.send(`Welcome, ${msg.p.name} (${gClient.getColorName(msg.p.color)}). Type @help@ for a list of core commands.`);
		} else {
			chat.send(`Welcome, ${msg.p.name} (${gClient.getColorName(msg.p.color)}).`);
		}
	});
}
if (Config.core.updateChatInConsole) {
	gClient.on('a', (msg) => {
		console.log(`${msg.p.name}: ${msg.a}`);
	});
}

//Export everything
/*module.exports.client = gClient;
module.exports.chat = chat;
module.exports.piano = piano;
module.exports.press = press;
module.exports.release = release;
module.exports.pressSustain = pressSustain;
module.exports.releaseSustain = releaseSustain;
module.exports.toggle = toggle;
module.exports.noteQuota = gNoteQuota;
module.exports.soundSelector = gSoundSelector;*/
// (mpp.js Midi Player)
/*module.exports.midi = gMidiPlayer;
module.exports.midis = midis;*/

//Export the MPP class
module.exports = MPP;
