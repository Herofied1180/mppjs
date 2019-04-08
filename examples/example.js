const MPP = require('mpp.js');

MPP.client.on('count', function(count) {
	console.log(`${count} people are in the room.`);
});

MPP.client.on('a', function(msg){
	if (msg.a == '@info@') {
		MPP.chat.send('MPP.js made by: Tehc(Tehcjs)');
	} else if (msg.a == '@help@') {
		MPP.chat.send('Core Commands: @info@, @help@, @invite@, @discord@, @git@, @github@');
	} else if (msg.a == '@invite@' || msg.a == '@discord@') {
		MPP.chat.send(/*'Discord Invite: (none)'*/'There is currently no discord. I\'ll be making one soon.');
	} else if (msg.a == '@git@' || msg.a == '@github@') {
		MPP.chat.send('MPP.js Github: https://github.com/Herofied1180/mppjs');
	}
});