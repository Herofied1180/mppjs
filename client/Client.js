/*

All credit goes to multiplayerpiano.com for creating the Client.js script, and some credit to Tehc
								for porting it to Node.js.

*/


//if(typeof module !== "undefined") { // We have module in Node.js
	module.exports = Client;
	WebSocket = require("ws");
	EventEmitter = require("events").EventEmitter;
	// Proxy librariess
	var HttpsProxyAgent = require("https-proxy-agent");
	var SocksProxyAgent = require("socks-proxy-agent");
	// (mpp.js Variable)
	const colorMap = new Map();
/*} else {
	this.Client = Client; // This is unneeded as we are in Node.js
}*/


function mixin(obj1, obj2) {
	for(var i in obj2) {
		if(obj2.hasOwnProperty(i)) {
			obj1[i] = obj2[i];
		}
	}
};


function Client(uri, proxy) {
	EventEmitter.call(this);
	this.uri = uri || "ws://www.multiplayerpiano.com:443";
	this.proxy = proxy || undefined;
	this.ws = undefined;
	this.serverTimeOffset = 0;
	this.user = undefined;
	this.participantId = undefined;
	this.channel = undefined;
	this.ppl = {};
	this.connectionTime = undefined;
	this.connectionAttempts = 0;
	this.desiredChannelId = undefined;
	this.desiredChannelSettings = undefined;
	this.pingInterval = undefined;
	this.canConnect = false;
	this.noteBuffer = [];
	this.noteBufferTime = 0;
	this.noteFlushInterval = undefined;

	this.bindEventListeners();

	this.emit("status", "(Offline mode)");
};

mixin(Client.prototype, EventEmitter.prototype);

Client.prototype.constructor = Client;

Client.prototype.isSupported = function() {
	return typeof WebSocket === "function";
};

Client.prototype.isConnected = function() {
	return this.isSupported() && this.ws && this.ws.readyState === WebSocket.OPEN;
};

Client.prototype.isConnecting = function() {
	return this.isSupported() && this.ws && this.ws.readyState === WebSocket.CONNECTING;
};

Client.prototype.start = function() {
	this.canConnect = true;
	this.connect();
};

Client.prototype.stop = function() {
	this.canConnect = false;
	this.ws.close();
};

Client.prototype.connect = function() {
	if(!this.canConnect || !this.isSupported() || this.isConnected() || this.isConnecting())
		return;
	this.emit("status", "Connecting...");
	if(typeof module !== "undefined") {
		// nodejsicle
		this.ws = new WebSocket(this.uri, {
			origin: "http://www.multiplayerpiano.com",
			agent: this.proxy ? this.proxy.startsWith("socks") ? new SocksProxyAgent(this.proxy) : new HttpsProxyAgent(this.proxy) : undefined
		});
	} else {
		// browseroni
		this.ws = new WebSocket(this.uri);
	}
	this.ws.binaryType = "arraybuffer";
	var self = this;
	this.ws.addEventListener("close", function(evt) {
		self.user = undefined;
		self.participantId = undefined;
		self.channel = undefined;
		self.setParticipants([]);
		clearInterval(self.pingInterval);
		clearInterval(self.noteFlushInterval);

		self.emit("disconnect");
		self.emit("status", "Offline mode");

		// reconnect!
		if(self.connectionTime) {
			self.connectionTime = undefined;
			self.connectionAttempts = 0;
		} else {
			++self.connectionAttempts;
		}
		var ms_lut = [50, 2950, 7000, 10000];
		var idx = self.connectionAttempts;
		if(idx >= ms_lut.length) idx = ms_lut.length - 1;
		var ms = ms_lut[idx];
		setTimeout(self.connect.bind(self), ms);
	});
	this.ws.addEventListener("error", function() {
		console.trace(arguments);
		self.ws.close();
		self.ws.open();
	});
	this.ws.addEventListener("open", function(evt) {
		self.connectionTime = Date.now();
		self.sendArray([{m: "hi"}]);
		self.pingInterval = setInterval(function() {
			self.sendArray([{m: "t", e: Date.now()}]);
		}, 20000);
		//self.sendArray([{m: "t", e: Date.now()}]);
		self.noteBuffer = [];
		self.noteBufferTime = 0;
		self.noteFlushInterval = setInterval(function() {
			if(self.noteBufferTime && self.noteBuffer.length > 0) {
				self.sendArray([{m: "n", t: self.noteBufferTime + self.serverTimeOffset, n: self.noteBuffer}]);
				self.noteBufferTime = 0;
				self.noteBuffer = [];
			}
		}, 200);

		self.emit("connect");
		self.emit("status", "Joining channel...");
	});
	this.ws.addEventListener("message", function(evt) {
		var transmission = JSON.parse(evt.data);
		for(var i = 0; i < transmission.length; i++) {
			var msg = transmission[i];
			self.emit(msg.m, msg);
		}
	});
};

Client.prototype.bindEventListeners = function() {
	var self = this;
	this.on("hi", function(msg) {
		self.user = msg.u;
		self.receiveServerTime(msg.t, msg.e || undefined);
		if(self.desiredChannelId) {
			self.setChannel();
		}
	});
	this.on("t", function(msg) {
		self.receiveServerTime(msg.t, msg.e || undefined);
	});
	this.on("ch", function(msg) {
		self.desiredChannelId = msg.ch._id;
		self.channel = msg.ch;
		if(msg.p) self.participantId = msg.p;
		self.setParticipants(msg.ppl);
	});
	this.on("p", function(msg) {
		self.participantUpdate(msg);
		self.emit("participant update", self.findParticipantById(msg.id));
	});
	this.on("m", function(msg) {
		if(self.ppl.hasOwnProperty(msg.id)) {
			self.participantUpdate(msg);
		}
	});
	this.on("bye", function(msg) {
		self.removeParticipant(msg.p);
	});
};

Client.prototype.send = function(raw) {
	if(this.isConnected()) this.ws.send(raw);
};

Client.prototype.sendArray = function(arr) {
	this.send(JSON.stringify(arr));
};

Client.prototype.setChannel = function(id, set) {
	this.desiredChannelId = id || this.desiredChannelId || "lobby";
	this.desiredChannelSettings = set || this.desiredChannelSettings || undefined;
	this.sendArray([{m: "ch", _id: this.desiredChannelId, set: this.desiredChannelSettings}]);
};

Client.prototype.setName = function(name) {
	this.sendArray([{m: "userset", set: {name: name}}]);
};

Client.prototype.kickban = function(id, ms) {
    MPP.client.sendArray([{m: "kickban", _id: id, ms: ms}]);
};

Client.prototype.offlineChannelSettings = {
	lobby: true,
	visible: false,
	chat: false,
	crownsolo: false,
	color:"#ecfaed"
};

Client.prototype.getChannelSetting = function(key) {
	if(!this.isConnected() || !this.channel || !this.channel.settings) {
		return this.offlineChannelSettings[key];
	} 
	return this.channel.settings[key];
};

Client.prototype.offlineParticipant = {
	_id: "",
	name: "",
	color: "#777"
};

Client.prototype.getOwnParticipant = function() {
	return this.findParticipantById(this.participantId);
};

Client.prototype.setParticipants = function(ppl) {
	// remove participants who left
	for(var id in this.ppl) {
		if(!this.ppl.hasOwnProperty(id)) continue;
		var found = false;
		for(var j = 0; j < ppl.length; j++) {
			if(ppl[j].id === id) {
				found = true;
				break;
			}
		}
		if(!found) {
			this.removeParticipant(id);
		}
	}
	// update all
	for(var i = 0; i < ppl.length; i++) {
		this.participantUpdate(ppl[i]);
	}
};

Client.prototype.countParticipants = function() {
	var count = 0;
	for(var i in this.ppl) {
		if(this.ppl.hasOwnProperty(i)) ++count;
	}
	return count;
};

Client.prototype.participantUpdate = function(update) {
	var part = this.ppl[update.id] || null;
	if(part === null) {
		part = update;
		this.ppl[part.id] = part;
		this.emit("participant added", part);
		this.emit("count", this.countParticipants());
	} else {
		if(update.x) part.x = update.x;
		if(update.y) part.y = update.y;
		if(update.color) part.color = update.color;
		if(update.name) part.name = update.name;
	}
};

Client.prototype.removeParticipant = function(id) {
	if(this.ppl.hasOwnProperty(id)) {
		var part = this.ppl[id];
		delete this.ppl[id];
		this.emit("participant removed", part);
		this.emit("count", this.countParticipants());
	}
};

Client.prototype.findParticipantById = function(id) {
	return this.ppl[id] || this.offlineParticipant;
};

Client.prototype.isOwner = function() {
	return this.channel && this.channel.crown && this.channel.crown.participantId === this.participantId;
};

Client.prototype.preventsPlaying = function() {
	return this.isConnected() && !this.isOwner() && this.getChannelSetting("crownsolo") === true;
};

Client.prototype.receiveServerTime = function(time, echo) {
	var self = this;
	var now = Date.now();
	var target = time - now;
	//console.log("Target serverTimeOffset: " + target);
	var duration = 1000;
	var step = 0;
	var steps = 50;
	var step_ms = duration / steps;
	var difference = target - this.serverTimeOffset;
	var inc = difference / steps;
	var iv;
	iv = setInterval(function() {
		self.serverTimeOffset += inc;
		if(++step >= steps) {
			clearInterval(iv);
			//console.log("serverTimeOffset reached: " + self.serverTimeOffset);
			self.serverTimeOffset=target;
		}
	}, step_ms);
	// smoothen

	//this.serverTimeOffset = time - now;			// mostly time zone offset ... also the lags so todo smoothen this
								// not smooth:
	//if(echo) this.serverTimeOffset += echo - now;	// mostly round trip time offset
};

Client.prototype.startNote = function(note, vel) {
	if(this.isConnected()) {
		var vel = typeof vel === "undefined" ? undefined : +vel.toFixed(3);
		if(!this.noteBufferTime) {
			this.noteBufferTime = Date.now();
			this.noteBuffer.push({n: note, v: vel});
		} else {
			this.noteBuffer.push({d: Date.now() - this.noteBufferTime, n: note, v: vel});
		}
	} else {
		console.error(`Error(Code 400 Disconnected):\nCould not start note ${note} with vel ${vel}.\nClient not connected.`);
	}
};

Client.prototype.stopNote = function(note) {
	if(this.isConnected()) {
		if(!this.noteBufferTime) {
			this.noteBufferTime = Date.now();
			this.noteBuffer.push({n: note, s: 1});
		} else {
			this.noteBuffer.push({d: Date.now() - this.noteBufferTime, n: note, s: 1});
		}
	} else {
		console.error(`Error(Code 400 Disconnected):\nCould not stop note ${note} with vel ${vel}.\nClient not connected.`);
	}
};

// (mpp.js Function)
Client.prototype.getColorName = (color) => {
	return colorMap.get(color.toUpperCase());
};

// (mpp.js Code)
//  Add all color names to the color map
colorMap.set("#7CB9E8", "Aero");
colorMap.set("#C9FFE5", "Aero blue");
colorMap.set("#B284BE", "African purple");
colorMap.set("#5D8AA8", "Air Force blue (RAF)");
colorMap.set("#00308F", "Air Force blue (USAF)");
colorMap.set("#72A0C1", "Air superiority blue");
colorMap.set("#AF002A", "Alabama Crimson");
colorMap.set("#F0F8FF", "Alice blue");
colorMap.set("#E32636", "Alizarin crimson");
colorMap.set("#C46210", "Alloy orange");
colorMap.set("#EFDECD", "Almond");
colorMap.set("#E52B50", "Amaranth");
colorMap.set("#F19CBB", "Amaranth pink");
colorMap.set("#AB274F", "Dark amaranth");
colorMap.set("#3B7A57", "Amazon");
colorMap.set("#FF7E00", "Amber");
colorMap.set("#FF033E", "American rose");
colorMap.set("#9966CC", "Amethyst");
colorMap.set("#A4C639", "Android green");
colorMap.set("#F2F3F4", "Anti-flash white");
colorMap.set("#CD9575", "Antique brass");
colorMap.set("#665D1E", "Antique bronze");
colorMap.set("#915C83", "Antique fuchsia");
colorMap.set("#841B2D", "Antique ruby");
colorMap.set("#FAEBD7", "Antique white");
colorMap.set("#8DB600", "Apple green");
colorMap.set("#FBCEB1", "Apricot");
colorMap.set("#00FFFF", "Aqua");
colorMap.set("#7FFFD4", "Aquamarine");
colorMap.set("#4B5320", "Army green");
colorMap.set("#3B444B", "Arsenic");
colorMap.set("#8F9779", "Artichoke");
colorMap.set("#B2BEB5", "Ash grey");
colorMap.set("#87A96B", "Asparagus");
colorMap.set("#FDEE00", "Aureolin");
colorMap.set("#6E7F80", "AuroMetalSaurus");
colorMap.set("#568203", "Avocado");
colorMap.set("#007FFF", "Azure");
colorMap.set("#F0FFFF", "Azure mist/web");
colorMap.set("#89CFF0", "Baby blue");
colorMap.set("#A1CAF1", "Baby blue eyes");
colorMap.set("#FEFEFA", "Baby powder");
colorMap.set("#FF91AF", "Baker-Miller pink");
colorMap.set("#21ABCD", "Ball blue");
colorMap.set("#FAE7B5", "Banana Mania");
colorMap.set("#FFE135", "Banana yellow");
colorMap.set("#E0218A", "Barbie pink");
colorMap.set("#7C0A02", "Barn red");
colorMap.set("#848482", "Battleship grey");
colorMap.set("#98777B", "Bazaar");
colorMap.set("#9F8170", "Beaver");
colorMap.set("#F5F5DC", "Beige");
colorMap.set("#2E5894", "B'dazzled blue");
colorMap.set("#9C2542", "Big dip o’ruby");
colorMap.set("#FFE4C4", "Bisque");
colorMap.set("#3D2B1F", "Bistre");
colorMap.set("#967117", "Bistre brown");
colorMap.set("#CAE00D", "Bitter lemon");
colorMap.set("#648C11", "Bitter lime");
colorMap.set("#FE6F5E", "Bittersweet");
colorMap.set("#BF4F51", "Bittersweet shimmer");
colorMap.set("#000000", "Black");
colorMap.set("#3D0C02", "Black bean");
colorMap.set("#253529", "Black leather jacket");
colorMap.set("#3B3C36", "Black olive");
colorMap.set("#FFEBCD", "Blanched almond");
colorMap.set("#A57164", "Blast-off bronze");
colorMap.set("#318CE7", "Bleu de France");
colorMap.set("#ACE5EE", "Blizzard Blue");
colorMap.set("#FAF0BE", "Blond");
colorMap.set("#0000FF", "Blue");
colorMap.set("#1F75FE", "Blue (Crayola)");
colorMap.set("#0093AF", "Blue (Munsell)");
colorMap.set("#0087BD", "Blue (NCS)");
colorMap.set("#333399", "Blue (pigment)");
colorMap.set("#0247FE", "Blue (RYB)");
colorMap.set("#A2A2D0", "Blue Bell");
colorMap.set("#6699CC", "Blue-gray");
colorMap.set("#0D98BA", "Blue-green");
colorMap.set("#126180", "Blue sapphire");
colorMap.set("#8A2BE2", "Blue-violet");
colorMap.set("#5072A7", "Blue yonder");
colorMap.set("#4F86F7", "Blueberry");
colorMap.set("#1C1CF0", "Bluebonnet");
colorMap.set("#DE5D83", "Blush");
colorMap.set("#79443B", "Bole Brown");
colorMap.set("#0095B6", "Bondi blue");
colorMap.set("#E3DAC9", "Bone");
colorMap.set("#CC0000", "Boston University Red");
colorMap.set("#006A4E", "Bottle green");
colorMap.set("#873260", "Boysenberry");
colorMap.set("#0070FF", "Brandeis blue");
colorMap.set("#B5A642", "Brass");
colorMap.set("#CB4154", "Brick red");
colorMap.set("#1DACD6", "Bright cerulean");
colorMap.set("#66FF00", "Bright green");
colorMap.set("#BF94E4", "Bright lavender");
colorMap.set("#D891EF", "Bright lilac");
colorMap.set("#C32148", "Bright maroon");
colorMap.set("#1974D2", "Bright navy blue");
colorMap.set("#FF007F", "Bright pink");
colorMap.set("#08E8DE", "Bright turquoise");
colorMap.set("#D19FE8", "Bright ube");
colorMap.set("#F4BBFF", "Brilliant lavender");
colorMap.set("#FF55A3", "Brilliant rose");
colorMap.set("#FB607F", "Brink pink");
colorMap.set("#004225", "British racing green");
colorMap.set("#CD7F32", "Bronze");
colorMap.set("#737000", "Bronze Yellow");
colorMap.set("#964B00", "Brown");
colorMap.set("#6B4423", "Brown-nose");
colorMap.set("#FFC1CC", "Bubble gum");
colorMap.set("#E7FEFF", "Bubbles");
colorMap.set("#F0DC82", "Buff");
colorMap.set("#7BB661", "Bud green");
colorMap.set("#480607", "Bulgarian rose");
colorMap.set("#800020", "Burgundy");
colorMap.set("#DEB887", "Burlywood");
colorMap.set("#CC5500", "Burnt orange");
colorMap.set("#8A3324", "Burnt umber");
colorMap.set("#BD33A4", "Byzantine");
colorMap.set("#702963", "Byzantium");
colorMap.set("#536872", "Cadet");
colorMap.set("#5F9EA0", "Cadet blue");
colorMap.set("#91A3B0", "Cadet grey");
colorMap.set("#006B3C", "Cadmium green");
colorMap.set("#ED872D", "Cadmium orange");
colorMap.set("#E30022", "Cadmium red");
colorMap.set("#FFF600", "Cadmium yellow");
colorMap.set("#A67B5B", "Cafe au lait");
colorMap.set("#4B3621", "Cafe noir");
colorMap.set("#1E4D2B", "Cal Poly green");
colorMap.set("#A3C1AD", "Cambridge Blue");
colorMap.set("#EFBBCC", "Cameo pink");
colorMap.set("#78866B", "Camouflage green");
colorMap.set("#FFEF00", "Canary yellow");
colorMap.set("#FF0800", "Candy apple red");
colorMap.set("#E4717A", "Candy pink");
colorMap.set("#592720", "Caput mortuum");
colorMap.set("#C41E3A", "Cardinal");
colorMap.set("#00CC99", "Caribbean green");
colorMap.set("#960018", "Carmine");
colorMap.set("#EB4C42", "Carmine pink");
colorMap.set("#FF0038", "Carmine red");
colorMap.set("#FFA6C9", "Carnation pink");
colorMap.set("#99BADD", "Carolina blue");
colorMap.set("#ED9121", "Carrot orange");
colorMap.set("#00563F", "Castleton green");
colorMap.set("#062A78", "Catalina blue");
colorMap.set("#703642", "Catawba");
colorMap.set("#C95A49", "Cedar Chest");
colorMap.set("#92A1CF", "Ceil");
colorMap.set("#ACE1AF", "Celadon");
colorMap.set("#007BA7", "Celadon blue");
colorMap.set("#2F847C", "Celadon green");
colorMap.set("#4997D0", "Celestial blue");
colorMap.set("#EC3B83", "Cerise pink");
colorMap.set("#2A52BE", "Cerulean blue");
colorMap.set("#6D9BC3", "Cerulean frost");
colorMap.set("#007AA5", "CG Blue");
colorMap.set("#E03C31", "CG Red");
colorMap.set("#A0785A", "Chamoisee");
colorMap.set("#F7E7CE", "Champagne");
colorMap.set("#36454F", "Charcoal");
colorMap.set("#232B2B", "Charleston green");
colorMap.set("#E68FAC", "Charm pink");
colorMap.set("#DFFF00", "Chartreuse");
colorMap.set("#7FFF00", "Chartreuse (web)");
colorMap.set("#DE3163", "Cherry");
colorMap.set("#FFB7C5", "Cherry blossom pink");
colorMap.set("#954535", "Chestnut");
colorMap.set("#A8516E", "China rose");
colorMap.set("#AA381E", "Chinese red");
colorMap.set("#856088", "Chinese violet");
colorMap.set("#7B3F00", "Chocolate");
colorMap.set("#FFA700", "Chrome yellow");
colorMap.set("#98817B", "Cinereous");
colorMap.set("#E4D00A", "Citrine");
colorMap.set("#9FA91F", "Citron");
colorMap.set("#7F1734", "Claret");
colorMap.set("#FBCCE7", "Classic rose");
colorMap.set("#0047AB", "Cobalt");
colorMap.set("#D2691E", "Cocoa brown");
colorMap.set("#965A3E", "Coconut");
colorMap.set("#6F4E37", "Coffee Brown");
colorMap.set("#9BDDFF", "Columbia blue");
colorMap.set("#002E63", "Cool black");
colorMap.set("#8C92AC", "Cool grey");
colorMap.set("#B87333", "Copper");
colorMap.set("#AD6F69", "Copper penny");
colorMap.set("#CB6D51", "Copper red");
colorMap.set("#996666", "Copper rose");
colorMap.set("#FF3800", "Coquelicot");
colorMap.set("#FF7F50", "Coral");
colorMap.set("#F88379", "Coral pink");
colorMap.set("#FF4040", "Coral red");
colorMap.set("#893F45", "Cordovan");
colorMap.set("#FBEC5D", "Corn Yellow");
colorMap.set("#B31B1B", "Cornell Red");
colorMap.set("#6495ED", "Cornflower blue");
colorMap.set("#FFF8DC", "Cornsilk");
colorMap.set("#FFF8E7", "Cosmic latte");
colorMap.set("#FFBCD9", "Cotton candy");
colorMap.set("#FFFDD0", "Cream");
colorMap.set("#DC143C", "Crimson");
colorMap.set("#BE0032", "Crimson glory");
colorMap.set("#00B7EB", "Cyan");
colorMap.set("#58427C", "Cyber grape");
colorMap.set("#FFD300", "Cyber yellow");
colorMap.set("#FFFF31", "Daffodil");
colorMap.set("#F0E130", "Dandelion");
colorMap.set("#00008B", "Dark blue");
colorMap.set("#666699", "Dark blue-gray");
colorMap.set("#654321", "Dark brown");
colorMap.set("#5D3954", "Dark byzantium");
colorMap.set("#A40000", "Dark candy apple red");
colorMap.set("#08457E", "Dark cerulean");
colorMap.set("#986960", "Dark chestnut");
colorMap.set("#CD5B45", "Dark coral");
colorMap.set("#008B8B", "Dark cyan");
colorMap.set("#536878", "Dark electric blue");
colorMap.set("#B8860B", "Dark goldenrod");
colorMap.set("#A9A9A9", "Dark gray");
colorMap.set("#013220", "Dark green");
colorMap.set("#00416A", "Dark imperial blue");
colorMap.set("#1A2421", "Dark jungle green");
colorMap.set("#BDB76B", "Dark khaki");
colorMap.set("#734F96", "Dark lavender");
colorMap.set("#534B4F", "Dark liver");
colorMap.set("#543D37", "Dark liver (horses)");
colorMap.set("#8B008B", "Dark magenta");
colorMap.set("#003366", "Dark midnight blue");
colorMap.set("#4A5D23", "Dark moss green");
colorMap.set("#556B2F", "Dark olive green");
colorMap.set("#FF8C00", "Dark orange");
colorMap.set("#9932CC", "Dark orchid");
colorMap.set("#779ECB", "Dark pastel blue");
colorMap.set("#03C03C", "Dark pastel green");
colorMap.set("#966FD6", "Dark pastel purple");
colorMap.set("#C23B22", "Dark pastel red");
colorMap.set("#E75480", "Dark pink");
colorMap.set("#003399", "Dark powder blue");
colorMap.set("#4F3A3C", "Dark puce");
colorMap.set("#872657", "Dark raspberry");
colorMap.set("#8B0000", "Dark red");
colorMap.set("#E9967A", "Dark salmon");
colorMap.set("#560319", "Dark scarlet");
colorMap.set("#8FBC8F", "Dark sea green");
colorMap.set("#3C1414", "Dark sienna");
colorMap.set("#8CBED6", "Dark sky blue");
colorMap.set("#483D8B", "Dark slate blue");
colorMap.set("#2F4F4F", "Dark slate gray");
colorMap.set("#177245", "Dark spring green");
colorMap.set("#918151", "Dark tan");
colorMap.set("#FFA812", "Dark tangerine");
colorMap.set("#CC4E5C", "Dark terra cotta");
colorMap.set("#00CED1", "Dark turquoise");
colorMap.set("#D1BEA8", "Dark vanilla");
colorMap.set("#9400D3", "Dark violet");
colorMap.set("#9B870C", "Dark yellow");
colorMap.set("#00703C", "Dartmouth green");
colorMap.set("#555555", "Davy's grey");
colorMap.set("#D70A53", "Debian red");
colorMap.set("#A9203E", "Deep carmine");
colorMap.set("#EF3038", "Deep carmine pink");
colorMap.set("#E9692C", "Deep carrot orange");
colorMap.set("#DA3287", "Deep cerise");
colorMap.set("#B94E48", "Deep chestnut");
colorMap.set("#C154C1", "Deep fuchsia");
colorMap.set("#004B49", "Deep jungle green");
colorMap.set("#F5C71A", "Deep lemon");
colorMap.set("#9955BB", "Deep lilac");
colorMap.set("#CC00CC", "Deep magenta");
colorMap.set("#D473D4", "Deep mauve");
colorMap.set("#355E3B", "Deep moss green");
colorMap.set("#FFCBA4", "Deep peach");
colorMap.set("#A95C68", "Deep puce");
colorMap.set("#843F5B", "Deep ruby");
colorMap.set("#FF9933", "Deep saffron");
colorMap.set("#00BFFF", "Deep sky blue");
colorMap.set("#4A646C", "Deep Space Sparkle");
colorMap.set("#7E5E60", "Deep Taupe");
colorMap.set("#66424D", "Deep Tuscan red");
colorMap.set("#BA8759", "Deer");
colorMap.set("#1560BD", "Denim");
colorMap.set("#EDC9AF", "Desert sand");
colorMap.set("#EA3C53", "Desire");
colorMap.set("#B9F2FF", "Diamond");
colorMap.set("#696969", "Dim gray");
colorMap.set("#9B7653", "Dirt");
colorMap.set("#1E90FF", "Dodger blue");
colorMap.set("#D71868", "Dogwood rose");
colorMap.set("#85BB65", "Dollar bill");
colorMap.set("#664C28", "Donkey Brown");
colorMap.set("#00009C", "Duke blue");
colorMap.set("#E5CCC9", "Dust storm");
colorMap.set("#EFDFBB", "Dutch white");
colorMap.set("#E1A95F", "Earth yellow");
colorMap.set("#555D50", "Ebony");
colorMap.set("#1B1B1B", "Eerie black");
colorMap.set("#614051", "Eggplant");
colorMap.set("#F0EAD6", "Eggshell");
colorMap.set("#1034A6", "Egyptian blue");
colorMap.set("#7DF9FF", "Electric blue");
colorMap.set("#FF003F", "Electric crimson");
colorMap.set("#00FF00", "Electric green");
colorMap.set("#6F00FF", "Electric indigo");
colorMap.set("#CCFF00", "Electric lime");
colorMap.set("#BF00FF", "Electric purple");
colorMap.set("#3F00FF", "Electric ultramarine");
colorMap.set("#FFFF00", "Electric yellow");
colorMap.set("#50C878", "Emerald");
colorMap.set("#6C3082", "Eminence");
colorMap.set("#1B4D3E", "English green");
colorMap.set("#B48395", "English lavender");
colorMap.set("#AB4B52", "English red");
colorMap.set("#563C5C", "English violet");
colorMap.set("#96C8A2", "Eton blue");
colorMap.set("#44D7A8", "Eucalyptus");
colorMap.set("#801818", "Falu red");
colorMap.set("#B53389", "Fandango");
colorMap.set("#DE5285", "Fandango pink");
colorMap.set("#F400A1", "Fashion fuchsia");
colorMap.set("#E5AA70", "Fawn");
colorMap.set("#4D5D53", "Feldgrau");
colorMap.set("#4F7942", "Fern green");
colorMap.set("#FF2800", "Ferrari Red");
colorMap.set("#6C541E", "Field drab");
colorMap.set("#B22222", "Firebrick");
colorMap.set("#CE2029", "Fire engine red");
colorMap.set("#E25822", "Flame");
colorMap.set("#FC8EAC", "Flamingo pink");
colorMap.set("#F7E98E", "Flavescent");
colorMap.set("#EEDC82", "Flax");
colorMap.set("#A2006D", "Flirt");
colorMap.set("#FFFAF0", "Floral white");
colorMap.set("#FFBF00", "Fluorescent orange");
colorMap.set("#FF1493", "Fluorescent pink");
colorMap.set("#FF004F", "Folly");
colorMap.set("#014421", "Forest green");
colorMap.set("#228B22", "Forest green (web)");
colorMap.set("#856D4D", "French bistre");
colorMap.set("#0072BB", "French blue");
colorMap.set("#FD3F92", "French fuchsia");
colorMap.set("#86608E", "French lilac");
colorMap.set("#9EFD38", "French lime");
colorMap.set("#FD6C9E", "French pink");
colorMap.set("#4E1609", "French puce");
colorMap.set("#C72C48", "French raspberry");
colorMap.set("#F64A8A", "French rose");
colorMap.set("#77B5FE", "French sky blue");
colorMap.set("#8806CE", "French violet");
colorMap.set("#AC1E44", "French wine");
colorMap.set("#A6E7FF", "Fresh Air");
colorMap.set("#FF77FF", "Fuchsia pink");
colorMap.set("#CC397B", "Fuchsia purple");
colorMap.set("#C74375", "Fuchsia rose");
colorMap.set("#E48400", "Fulvous");
colorMap.set("#CC6666", "Fuzzy Wuzzy");
colorMap.set("#DCDCDC", "Gainsboro");
colorMap.set("#E49B0F", "Gamboge");
colorMap.set("#007F66", "Generic viridian");
colorMap.set("#F8F8FF", "Ghost white");
colorMap.set("#FE5A1D", "Giants orange");
colorMap.set("#B06500", "Ginger");
colorMap.set("#6082B6", "Glaucous");
colorMap.set("#E6E8FA", "Glitter");
colorMap.set("#00AB66", "GO green");
colorMap.set("#D4AF37", "Gold (metallic)");
colorMap.set("#FFD700", "Gold (web) (Golden)");
colorMap.set("#85754E", "Gold Fusion");
colorMap.set("#996515", "Golden brown");
colorMap.set("#FCC200", "Golden poppy");
colorMap.set("#FFDF00", "Golden yellow");
colorMap.set("#DAA520", "Goldenrod");
colorMap.set("#A8E4A0", "Granny Smith Apple");
colorMap.set("#6F2DA8", "Grape");
colorMap.set("#808080", "Gray");
colorMap.set("#BEBEBE", "Gray (X11 gray)");
colorMap.set("#465945", "Gray-asparagus");
colorMap.set("#1CAC78", "Green (Crayola)");
colorMap.set("#008000", "Green");
colorMap.set("#00A877", "Green (Munsell)");
colorMap.set("#009F6B", "Green (NCS)");
colorMap.set("#00A550", "Green (pigment)");
colorMap.set("#66B032", "Green (RYB)");
colorMap.set("#ADFF2F", "Green-yellow");
colorMap.set("#A99A86", "Grullo");
colorMap.set("#663854", "Halaya ube");
colorMap.set("#446CCF", "Han blue");
colorMap.set("#5218FA", "Han purple");
colorMap.set("#E9D66B", "Hansa yellow");
colorMap.set("#3FFF00", "Harlequin");
colorMap.set("#C90016", "Harvard crimson");
colorMap.set("#DA9100", "Harvest gold");
colorMap.set("#DF73FF", "Heliotrope");
colorMap.set("#AA98A9", "Heliotrope gray");
colorMap.set("#F0FFF0", "Honeydew");
colorMap.set("#006DB0", "Honolulu blue");
colorMap.set("#49796B", "Hooker's green");
colorMap.set("#FF1DCE", "Hot magenta");
colorMap.set("#FF69B4", "Hot pink");
colorMap.set("#71A6D2", "Iceberg");
colorMap.set("#FCF75E", "Icterine");
colorMap.set("#319177", "Illuminating Emerald");
colorMap.set("#602F6B", "Imperial");
colorMap.set("#002395", "Imperial blue");
colorMap.set("#66023C", "Imperial purple");
colorMap.set("#ED2939", "Imperial red");
colorMap.set("#B2EC5D", "Inchworm");
colorMap.set("#4C516D", "Independence");
colorMap.set("#138808", "India green");
colorMap.set("#CD5C5C", "Indian red");
colorMap.set("#E3A857", "Indian yellow");
colorMap.set("#4B0082", "Indigo");
colorMap.set("#002FA7", "International Klein Blue");
colorMap.set("#FF4F00", "International orange (aerospace)");
colorMap.set("#BA160C", "International orange (engineering)");
colorMap.set("#C0362C", "International orange (Golden Gate Bridge)");
colorMap.set("#5A4FCF", "Iris");
colorMap.set("#F4F0EC", "Isabelline");
colorMap.set("#009000", "Islamic green");
colorMap.set("#B2FFFF", "Italian sky blue");
colorMap.set("#FFFFF0", "Ivory");
colorMap.set("#00A86B", "Jade");
colorMap.set("#9D2933", "Japanese carmine");
colorMap.set("#264348", "Japanese indigo");
colorMap.set("#5B3256", "Japanese violet");
colorMap.set("#D73B3E", "Jasper");
colorMap.set("#A50B5E", "Jazzberry jam");
colorMap.set("#DA614E", "Jelly Bean");
colorMap.set("#343434", "Jet");
colorMap.set("#F4CA16", "Jonquil");
colorMap.set("#8AB9F1", "Jordy blue");
colorMap.set("#BDDA57", "June bud");
colorMap.set("#29AB87", "Jungle green");
colorMap.set("#4CBB17", "Kelly green");
colorMap.set("#7C1C05", "Kenyan copper");
colorMap.set("#3AB09E", "Keppel");
colorMap.set("#C3B091", "Khaki");
colorMap.set("#E79FC4", "Kobi");
colorMap.set("#354230", "Kombu green");
colorMap.set("#E8000D", "KU Crimson");
colorMap.set("#087830", "La Salle Green");
colorMap.set("#D6CADD", "Languid lavender");
colorMap.set("#26619C", "Lapis lazuli");
colorMap.set("#A9BA9D", "Laurel green");
colorMap.set("#CF1020", "Lava");
colorMap.set("#B57EDC", "Lavender (floral)");
colorMap.set("#CCCCFF", "Lavender blue");
colorMap.set("#FFF0F5", "Lavender blush");
colorMap.set("#C4C3D0", "Lavender gray");
colorMap.set("#9457EB", "Lavender indigo");
colorMap.set("#EE82EE", "Lavender magenta");
colorMap.set("#E6E6FA", "Lavender mist");
colorMap.set("#FBAED2", "Lavender pink");
colorMap.set("#967BB6", "Lavender purple");
colorMap.set("#FBA0E3", "Lavender rose");
colorMap.set("#7CFC00", "Lawn green");
colorMap.set("#FFF700", "Lemon");
colorMap.set("#FFFACD", "Lemon chiffon");
colorMap.set("#CCA01D", "Lemon curry");
colorMap.set("#FDFF00", "Lemon glacier");
colorMap.set("#E3FF00", "Lemon lime");
colorMap.set("#F6EABE", "Lemon meringue");
colorMap.set("#FFF44F", "Lemon yellow");
colorMap.set("#1A1110", "Licorice");
colorMap.set("#545AA7", "Liberty");
colorMap.set("#FDD5B1", "Light apricot");
colorMap.set("#ADD8E6", "Light blue");
colorMap.set("#B5651D", "Light brown");
colorMap.set("#E66771", "Light carmine pink");
colorMap.set("#F08080", "Light coral");
colorMap.set("#93CCEA", "Light cornflower blue");
colorMap.set("#F56991", "Light crimson");
colorMap.set("#E0FFFF", "Light cyan");
colorMap.set("#FF5CCD", "Light deep pink");
colorMap.set("#C8AD7F", "Light French beige");
colorMap.set("#F984EF", "Light fuchsia pink");
colorMap.set("#FAFAD2", "Light goldenrod yellow");
colorMap.set("#D3D3D3", "Light gray");
colorMap.set("#90EE90", "Light green");
colorMap.set("#FFB3DE", "Light hot pink");
colorMap.set("#F0E68C", "Light khaki");
colorMap.set("#D39BCB", "Light medium orchid");
colorMap.set("#ADDFAD", "Light moss green");
colorMap.set("#E6A8D7", "Light orchid");
colorMap.set("#B19CD9", "Light pastel purple");
colorMap.set("#FFB6C1", "Light pink");
colorMap.set("#E97451", "Light red ochre");
colorMap.set("#FFA07A", "Light salmon");
colorMap.set("#FF9999", "Light salmon pink");
colorMap.set("#20B2AA", "Light sea green");
colorMap.set("#87CEFA", "Light sky blue");
colorMap.set("#778899", "Light slate gray");
colorMap.set("#B0C4DE", "Light steel blue");
colorMap.set("#B38B6D", "Light taupe");
colorMap.set("#FFFFE0", "Light yellow");
colorMap.set("#C8A2C8", "Lilac");
colorMap.set("#BFFF00", "Lime");
colorMap.set("#32CD32", "Lime green");
colorMap.set("#9DC209", "Limerick");
colorMap.set("#195905", "Lincoln green");
colorMap.set("#FAF0E6", "Linen");
colorMap.set("#6CA0DC", "Little boy blue");
colorMap.set("#B86D29", "Liver (dogs)");
colorMap.set("#6C2E1F", "Liver");
colorMap.set("#987456", "Liver chestnut");
colorMap.set("#FFE4CD", "Lumber");
colorMap.set("#E62020", "Lust");
colorMap.set("#FF00FF", "Magenta");
colorMap.set("#CA1F7B", "Magenta (dye)");
colorMap.set("#D0417E", "Magenta (Pantone)");
colorMap.set("#FF0090", "Magenta (process)");
colorMap.set("#9F4576", "Magenta haze");
colorMap.set("#AAF0D1", "Magic mint");
colorMap.set("#F8F4FF", "Magnolia");
colorMap.set("#C04000", "Mahogany");
colorMap.set("#6050DC", "Majorelle Blue");
colorMap.set("#0BDA51", "Malachite");
colorMap.set("#979AAA", "Manatee");
colorMap.set("#FF8243", "Mango Tango");
colorMap.set("#74C365", "Mantis");
colorMap.set("#880085", "Mardi Gras");
colorMap.set("#800000", "Maroon");
colorMap.set("#E0B0FF", "Mauve");
colorMap.set("#915F6D", "Mauve taupe");
colorMap.set("#EF98AA", "Mauvelous");
colorMap.set("#4C9141", "May green");
colorMap.set("#73C2FB", "Maya blue");
colorMap.set("#E5B73B", "Meat brown");
colorMap.set("#66DDAA", "Medium aquamarine");
colorMap.set("#0000CD", "Medium blue");
colorMap.set("#E2062C", "Medium candy apple red");
colorMap.set("#AF4035", "Medium carmine");
colorMap.set("#035096", "Medium electric blue");
colorMap.set("#1C352D", "Medium jungle green");
colorMap.set("#BA55D3", "Medium orchid");
colorMap.set("#9370DB", "Medium purple");
colorMap.set("#BB3385", "Medium red-violet");
colorMap.set("#AA4069", "Medium ruby");
colorMap.set("#3CB371", "Medium sea green");
colorMap.set("#80DAEB", "Medium sky blue");
colorMap.set("#7B68EE", "Medium slate blue");
colorMap.set("#C9DC87", "Medium spring bud");
colorMap.set("#00FA9A", "Medium spring green");
colorMap.set("#674C47", "Medium taupe");
colorMap.set("#48D1CC", "Medium turquoise");
colorMap.set("#D9603B", "Pale vermilion");
colorMap.set("#F8B878", "Mellow apricot");
colorMap.set("#F8DE7E", "Mellow yellow");
colorMap.set("#FDBCB4", "Melon");
colorMap.set("#0A7E8C", "Metallic Seaweed");
colorMap.set("#9C7C38", "Metallic Sunburst");
colorMap.set("#E4007C", "Mexican pink");
colorMap.set("#191970", "Midnight blue");
colorMap.set("#004953", "Midnight green (eagle green)");
colorMap.set("#FFC40C", "Mikado yellow");
colorMap.set("#E3F988", "Mindaro");
colorMap.set("#3EB489", "Mint");
colorMap.set("#F5FFFA", "Mint cream");
colorMap.set("#98FF98", "Mint green");
colorMap.set("#FFE4E1", "Misty rose");
colorMap.set("#73A9C2", "Moonstone blue");
colorMap.set("#AE0C00", "Mordant red 19");
colorMap.set("#8A9A5B", "Moss green");
colorMap.set("#30BA8F", "Mountain Meadow");
colorMap.set("#997A8D", "Mountbatten pink");
colorMap.set("#18453B", "MSU Green");
colorMap.set("#306030", "Mughal green");
colorMap.set("#C54B8C", "Mulberry");
colorMap.set("#FFDB58", "Mustard");
colorMap.set("#317873", "Myrtle green");
colorMap.set("#F6ADC6", "Nadeshiko pink");
colorMap.set("#2A8000", "Napier green");
colorMap.set("#FFDEAD", "Navajo white");
colorMap.set("#000080", "Navy");
colorMap.set("#FFA343", "Neon Carrot");
colorMap.set("#FE4164", "Neon fuchsia");
colorMap.set("#39FF14", "Neon green");
colorMap.set("#214FC6", "New Car");
colorMap.set("#D7837F", "New York pink");
colorMap.set("#A4DDED", "Non-photo blue");
colorMap.set("#059033", "North Texas Green");
colorMap.set("#E9FFDB", "Nyanza");
colorMap.set("#0077BE", "Ocean Boat Blue");
colorMap.set("#CC7722", "Ochre");
colorMap.set("#43302E", "Old burgundy");
colorMap.set("#CFB53B", "Old gold");
colorMap.set("#FDF5E6", "Old lace");
colorMap.set("#796878", "Old lavender");
colorMap.set("#673147", "Old mauve");
colorMap.set("#867E36", "Old moss green");
colorMap.set("#C08081", "Old rose");
colorMap.set("#808000", "Olive");
colorMap.set("#6B8E23", "Olive Drab #3");
colorMap.set("#3C341F", "Olive Drab #7");
colorMap.set("#9AB973", "Olivine");
colorMap.set("#353839", "Onyx");
colorMap.set("#B784A7", "Opera mauve");
colorMap.set("#FF7F00", "Orange");
colorMap.set("#FF7538", "Orange (Crayola)");
colorMap.set("#FF5800", "Orange (Pantone)");
colorMap.set("#FB9902", "Orange (RYB)");
colorMap.set("#FFA500", "Orange (web)");
colorMap.set("#FF9F00", "Orange peel");
colorMap.set("#FF4500", "Orange-red");
colorMap.set("#DA70D6", "Orchid");
colorMap.set("#F2BDCD", "Orchid pink");
colorMap.set("#FB4F14", "Orioles orange");
colorMap.set("#414A4C", "Outer Space");
colorMap.set("#FF6E4A", "Outrageous Orange");
colorMap.set("#002147", "Oxford Blue");
colorMap.set("#990000", "Crimson Red");
colorMap.set("#006600", "Pakistan green");
colorMap.set("#273BE2", "Palatinate blue");
colorMap.set("#682860", "Palatinate purple");
colorMap.set("#BCD4E6", "Pale aqua");
colorMap.set("#AFEEEE", "Pale blue");
colorMap.set("#987654", "Pale brown");
colorMap.set("#9BC4E2", "Pale cerulean");
colorMap.set("#DDADAF", "Pale chestnut");
colorMap.set("#DA8A67", "Pale copper");
colorMap.set("#ABCDEF", "Pale cornflower blue");
colorMap.set("#E6BE8A", "Pale gold");
colorMap.set("#EEE8AA", "Pale goldenrod");
colorMap.set("#98FB98", "Pale green");
colorMap.set("#DCD0FF", "Pale lavender");
colorMap.set("#F984E5", "Pale magenta");
colorMap.set("#FADADD", "Pale pink");
colorMap.set("#DDA0DD", "Pale plum");
colorMap.set("#DB7093", "Pale red-violet");
colorMap.set("#96DED1", "Pale robin egg blue");
colorMap.set("#C9C0BB", "Pale silver");
colorMap.set("#ECEBBD", "Pale spring bud");
colorMap.set("#BC987E", "Pale taupe");
colorMap.set("#78184A", "Pansy purple");
colorMap.set("#009B7D", "Paolo Veronese green");
colorMap.set("#FFEFD5", "Papaya whip");
colorMap.set("#E63E62", "Paradise pink");
colorMap.set("#AEC6CF", "Pastel blue");
colorMap.set("#836953", "Pastel brown");
colorMap.set("#CFCFC4", "Pastel gray");
colorMap.set("#77DD77", "Pastel green");
colorMap.set("#F49AC2", "Pastel magenta");
colorMap.set("#FFB347", "Pastel orange");
colorMap.set("#DEA5A4", "Pastel pink");
colorMap.set("#B39EB5", "Pastel purple");
colorMap.set("#FF6961", "Pastel red");
colorMap.set("#CB99C9", "Pastel violet");
colorMap.set("#FDFD96", "Pastel yellow");
colorMap.set("#FFE5B4", "Peach");
colorMap.set("#FFCC99", "Peach-orange");
colorMap.set("#FFDAB9", "Peach puff");
colorMap.set("#FADFAD", "Peach-yellow");
colorMap.set("#D1E231", "Pear");
colorMap.set("#EAE0C8", "Pearl");
colorMap.set("#88D8C0", "Pearl Aqua");
colorMap.set("#B768A2", "Pearly purple");
colorMap.set("#E6E200", "Peridot");
colorMap.set("#1C39BB", "Persian blue");
colorMap.set("#00A693", "Persian green");
colorMap.set("#32127A", "Persian indigo");
colorMap.set("#D99058", "Persian orange");
colorMap.set("#F77FBE", "Persian pink");
colorMap.set("#701C1C", "Persian plum");
colorMap.set("#CC3333", "Persian red");
colorMap.set("#FE28A2", "Persian rose");
colorMap.set("#EC5800", "Persimmon");
colorMap.set("#CD853F", "Peru");
colorMap.set("#000F89", "Phthalo blue");
colorMap.set("#123524", "Phthalo green");
colorMap.set("#45B1E8", "Picton blue");
colorMap.set("#C30B4E", "Pictorial carmine");
colorMap.set("#FDDDE6", "Piggy pink");
colorMap.set("#01796F", "Pine green");
colorMap.set("#FFC0CB", "Pink");
colorMap.set("#D74894", "Pink (Pantone)");
colorMap.set("#FFDDF4", "Pink lace");
colorMap.set("#D8B2D1", "Pink lavender");
colorMap.set("#FF9966", "Pink-orange");
colorMap.set("#E7ACCF", "Pink pearl");
colorMap.set("#F78FA7", "Pink Sherbet");
colorMap.set("#93C572", "Pistachio");
colorMap.set("#E5E4E2", "Platinum");
colorMap.set("#8E4585", "Plum");
colorMap.set("#BE4F62", "Popstar");
colorMap.set("#FF5A36", "Portland Orange");
colorMap.set("#B0E0E6", "Powder blue");
colorMap.set("#FF8F00", "Princeton orange");
colorMap.set("#003153", "Prussian blue");
colorMap.set("#DF00FF", "Psychedelic purple");
colorMap.set("#CC8899", "Puce");
colorMap.set("#644117", "Pullman Brown (UPS Brown)");
colorMap.set("#FF7518", "Pumpkin");
colorMap.set("#800080", "Deep purple");
colorMap.set("#9F00C5", "Purple (Munsell)");
colorMap.set("#A020F0", "Purple");
colorMap.set("#69359C", "Purple Heart");
colorMap.set("#9678B6", "Purple mountain majesty");
colorMap.set("#4E5180", "Purple navy");
colorMap.set("#FE4EDA", "Purple pizzazz");
colorMap.set("#50404D", "Purple taupe");
colorMap.set("#9A4EAE", "Purpureus");
colorMap.set("#51484F", "Quartz");
colorMap.set("#436B95", "Queen blue");
colorMap.set("#E8CCD7", "Queen pink");
colorMap.set("#8E3A59", "Quinacridone magenta");
colorMap.set("#FF355E", "Radical Red");
colorMap.set("#FBAB60", "Rajah");
colorMap.set("#E30B5D", "Raspberry");
colorMap.set("#E25098", "Raspberry pink");
colorMap.set("#B3446C", "Raspberry rose");
colorMap.set("#826644", "Raw umber");
colorMap.set("#FF33CC", "Razzle dazzle rose");
colorMap.set("#E3256B", "Razzmatazz");
colorMap.set("#8D4E85", "Razzmic Berry");
colorMap.set("#FF0000", "Red");
colorMap.set("#EE204D", "Red (Crayola)");
colorMap.set("#F2003C", "Red (Munsell)");
colorMap.set("#C40233", "Red (NCS)");
colorMap.set("#ED1C24", "Red (pigment)");
colorMap.set("#FE2712", "Red (RYB)");
colorMap.set("#A52A2A", "Red-brown");
colorMap.set("#860111", "Red devil");
colorMap.set("#FF5349", "Red-orange");
colorMap.set("#E40078", "Red-purple");
colorMap.set("#C71585", "Red-violet");
colorMap.set("#A45A52", "Redwood");
colorMap.set("#522D80", "Regalia");
colorMap.set("#002387", "Resolution blue");
colorMap.set("#777696", "Rhythm");
colorMap.set("#004040", "Rich black");
colorMap.set("#F1A7FE", "Rich brilliant lavender");
colorMap.set("#D70040", "Rich carmine");
colorMap.set("#0892D0", "Rich electric blue");
colorMap.set("#A76BCF", "Rich lavender");
colorMap.set("#B666D2", "Rich lilac");
colorMap.set("#B03060", "Rich maroon");
colorMap.set("#444C38", "Rifle green");
colorMap.set("#704241", "Deep Roast coffee");
colorMap.set("#00CCCC", "Robin egg blue");
colorMap.set("#8A7F80", "Rocket metallic");
colorMap.set("#838996", "Roman silver");
colorMap.set("#F9429E", "Rose bonbon");
colorMap.set("#674846", "Rose ebony");
colorMap.set("#B76E79", "Rose gold");
colorMap.set("#FF66CC", "Rose pink");
colorMap.set("#C21E56", "Rose red");
colorMap.set("#905D5D", "Rose taupe");
colorMap.set("#AB4E52", "Rose vale");
colorMap.set("#65000B", "Rosewood");
colorMap.set("#D40000", "Rosso corsa");
colorMap.set("#BC8F8F", "Rosy brown");
colorMap.set("#0038A8", "Royal azure");
colorMap.set("#002366", "Royal blue");
colorMap.set("#4169E1", "Royal light blue");
colorMap.set("#CA2C92", "Royal fuchsia");
colorMap.set("#7851A9", "Royal purple");
colorMap.set("#FADA5E", "Royal yellow");
colorMap.set("#CE4676", "Ruber");
colorMap.set("#D10056", "Rubine red");
colorMap.set("#E0115F", "Ruby");
colorMap.set("#9B111E", "Ruby red");
colorMap.set("#FF0028", "Ruddy");
colorMap.set("#BB6528", "Ruddy brown");
colorMap.set("#E18E96", "Ruddy pink");
colorMap.set("#A81C07", "Rufous");
colorMap.set("#80461B", "Russet");
colorMap.set("#679267", "Russian green");
colorMap.set("#32174D", "Russian violet");
colorMap.set("#B7410E", "Rust");
colorMap.set("#DA2C43", "Rusty red");
colorMap.set("#8B4513", "Saddle brown");
colorMap.set("#FF6700", "Safety orange (blaze orange)");
colorMap.set("#EED202", "Safety yellow");
colorMap.set("#F4C430", "Saffron");
colorMap.set("#BCB88A", "Sage");
colorMap.set("#23297A", "St. Patrick's blue");
colorMap.set("#FA8072", "Salmon");
colorMap.set("#FF91A4", "Salmon pink");
colorMap.set("#C2B280", "Sand");
colorMap.set("#ECD540", "Sandstorm");
colorMap.set("#F4A460", "Sandy brown");
colorMap.set("#92000A", "Sangria");
colorMap.set("#507D2A", "Sap green");
colorMap.set("#0F52BA", "Sapphire");
colorMap.set("#0067A5", "Sapphire blue");
colorMap.set("#CBA135", "Satin sheen gold");
colorMap.set("#FF2400", "Scarlet");
colorMap.set("#FFD800", "School bus yellow");
colorMap.set("#76FF7A", "Screamin' Green");
colorMap.set("#006994", "Sea blue");
colorMap.set("#2E8B57", "Sea green");
colorMap.set("#321414", "Seal brown");
colorMap.set("#FFF5EE", "Seashell");
colorMap.set("#FFBA00", "Selective yellow");
colorMap.set("#704214", "Sepia");
colorMap.set("#8A795D", "Shadow");
colorMap.set("#778BA5", "Shadow blue");
colorMap.set("#FFCFF1", "Shampoo");
colorMap.set("#009E60", "Shamrock green");
colorMap.set("#8FD400", "Sheen Green");
colorMap.set("#D98695", "Shimmering Blush");
colorMap.set("#FC0FC0", "Shocking pink");
colorMap.set("#882D17", "Sienna");
colorMap.set("#C0C0C0", "Silver");
colorMap.set("#ACACAC", "Silver chalice");
colorMap.set("#5D89BA", "Silver Lake blue");
colorMap.set("#C4AEAD", "Silver pink");
colorMap.set("#BFC1C2", "Silver sand");
colorMap.set("#CB410B", "Sinopia");
colorMap.set("#007474", "Skobeloff");
colorMap.set("#87CEEB", "Sky blue");
colorMap.set("#CF71AF", "Sky magenta");
colorMap.set("#6A5ACD", "Slate blue");
colorMap.set("#708090", "Slate gray");
colorMap.set("#C84186", "Smitten");
colorMap.set("#738276", "Smoke");
colorMap.set("#933D41", "Smokey topaz");
colorMap.set("#100C08", "Smoky black");
colorMap.set("#FFFAFA", "Snow");
colorMap.set("#CEC8EF", "Soap");
colorMap.set("#893843", "Solid pink");
colorMap.set("#757575", "Sonic silver");
colorMap.set("#9E1316", "Spartan Crimson");
colorMap.set("#1D2951", "Space cadet");
colorMap.set("#807532", "Spanish bistre");
colorMap.set("#0070B8", "Spanish blue");
colorMap.set("#D10047", "Spanish carmine");
colorMap.set("#E51A4C", "Spanish crimson");
colorMap.set("#989898", "Spanish gray");
colorMap.set("#009150", "Spanish green");
colorMap.set("#E86100", "Spanish orange");
colorMap.set("#F7BFBE", "Spanish pink");
colorMap.set("#E60026", "Spanish red");
colorMap.set("#4C2882", "Spanish violet");
colorMap.set("#007F5C", "Spanish viridian");
colorMap.set("#0FC0FC", "Spiro Disco Ball");
colorMap.set("#A7FC00", "Spring bud");
colorMap.set("#00FF7F", "Spring green");
colorMap.set("#007BB8", "Star command blue");
colorMap.set("#4682B4", "Steel blue");
colorMap.set("#CC33CC", "Steel pink");
colorMap.set("#4F666A", "Stormcloud");
colorMap.set("#E4D96F", "Straw");
colorMap.set("#FC5A8D", "Strawberry");
colorMap.set("#FFCC33", "Sunglow");
colorMap.set("#E3AB57", "Sunray");
colorMap.set("#FAD6A5", "Sunset");
colorMap.set("#FD5E53", "Sunset orange");
colorMap.set("#CF6BA9", "Super pink");
colorMap.set("#D2B48C", "Tan");
colorMap.set("#F94D00", "Tangelo");
colorMap.set("#F28500", "Tangerine");
colorMap.set("#FFCC00", "Tangerine yellow");
colorMap.set("#483C32", "Dark Grayish Brown");
colorMap.set("#8B8589", "Taupe gray");
colorMap.set("#D0F0C0", "Tea green");
colorMap.set("#F4C2C2", "Tea rose");
colorMap.set("#008080", "Teal");
colorMap.set("#367588", "Teal blue");
colorMap.set("#99E6B3", "Teal deer");
colorMap.set("#00827F", "Teal green");
colorMap.set("#CF3476", "Telemagenta");
colorMap.set("#CD5700", "Tenne");
colorMap.set("#E2725B", "Terra cotta");
colorMap.set("#D8BFD8", "Thistle");
colorMap.set("#DE6FA1", "Thulian pink");
colorMap.set("#FC89AC", "Tickle Me Pink");
colorMap.set("#0ABAB5", "Tiffany Blue");
colorMap.set("#E08D3C", "Tiger's eye");
colorMap.set("#DBD7D2", "Timberwolf");
colorMap.set("#EEE600", "Titanium yellow");
colorMap.set("#FF6347", "Tomato");
colorMap.set("#746CC0", "Toolbox");
colorMap.set("#42B72A", "Toothpaste advert green");
colorMap.set("#FFC87C", "Topaz");
colorMap.set("#FD0E35", "Tractor red");
colorMap.set("#00755E", "Tropical rain forest");
colorMap.set("#0073CF", "True Blue");
colorMap.set("#417DC1", "Tufts Blue");
colorMap.set("#FF878D", "Tulip");
colorMap.set("#DEAA88", "Tumbleweed");
colorMap.set("#B57281", "Turkish rose");
colorMap.set("#40E0D0", "Turquoise");
colorMap.set("#00FFEF", "Turquoise blue");
colorMap.set("#A0D6B4", "Turquoise green");
colorMap.set("#7C4848", "Tuscan red");
colorMap.set("#C09999", "Tuscany");
colorMap.set("#8A496B", "Twilight lavender");
colorMap.set("#0033AA", "UA blue");
colorMap.set("#D9004C", "UA red");
colorMap.set("#8878C3", "Ube");
colorMap.set("#536895", "UCLA Blue");
colorMap.set("#FFB300", "UCLA Gold");
colorMap.set("#3CD070", "UFO Green");
colorMap.set("#120A8F", "Ultramarine");
colorMap.set("#4166F5", "Ultramarine blue");
colorMap.set("#FF6FFF", "Ultra pink");
colorMap.set("#635147", "Umber");
colorMap.set("#FFDDCA", "Unbleached silk");
colorMap.set("#5B92E5", "United Nations blue");
colorMap.set("#B78727", "University of California Gold");
colorMap.set("#FFFF66", "Unmellow yellow");
colorMap.set("#7B1113", "UP Maroon");
colorMap.set("#AE2029", "Upsdell red");
colorMap.set("#E1AD21", "Urobilin");
colorMap.set("#004F98", "USAFA blue");
colorMap.set("#F77F00", "University of Tennessee Orange");
colorMap.set("#D3003F", "Utah Crimson");
colorMap.set("#F3E5AB", "Vanilla");
colorMap.set("#F38FA9", "Vanilla ice");
colorMap.set("#C5B358", "Vegas gold");
colorMap.set("#C80815", "Venetian red");
colorMap.set("#43B3AE", "Verdigris");
colorMap.set("#E34234", "Medium vermilion");
colorMap.set("#D9381E", "Vermilion");
colorMap.set("#8F00FF", "Violet");
colorMap.set("#7F00FF", "Violet (color wheel)");
colorMap.set("#8601AF", "Violet (RYB)");
colorMap.set("#324AB2", "Violet-blue");
colorMap.set("#F75394", "Violet-red");
colorMap.set("#40826D", "Viridian");
colorMap.set("#009698", "Viridian green");
colorMap.set("#922724", "Vivid auburn");
colorMap.set("#9F1D35", "Vivid burgundy");
colorMap.set("#DA1D81", "Vivid cerise");
colorMap.set("#CC00FF", "Vivid orchid");
colorMap.set("#00CCFF", "Vivid sky blue");
colorMap.set("#FFA089", "Vivid tangerine");
colorMap.set("#9F00FF", "Vivid violet");
colorMap.set("#004242", "Warm black");
colorMap.set("#A4F4F9", "Waterspout");
colorMap.set("#645452", "Wenge");
colorMap.set("#F5DEB3", "Wheat");
colorMap.set("#FFFFFF", "White");
colorMap.set("#F5F5F5", "White smoke");
colorMap.set("#A2ADD0", "Wild blue yonder");
colorMap.set("#D470A2", "Wild orchid");
colorMap.set("#FF43A4", "Wild Strawberry");
colorMap.set("#FC6C85", "Wild watermelon");
colorMap.set("#FD5800", "Willpower orange");
colorMap.set("#A75502", "Windsor tan");
colorMap.set("#722F37", "Wine");
colorMap.set("#C9A0DC", "Wisteria");
colorMap.set("#C19A6B", "Wood brown");
colorMap.set("#738678", "Xanadu");
colorMap.set("#0F4D92", "Yale Blue");
colorMap.set("#1C2841", "Yankees blue");
colorMap.set("#FCE883", "Yellow (Crayola)");
colorMap.set("#EFCC00", "Yellow (Munsell)");
colorMap.set("#FEDF00", "Yellow (Pantone)");
colorMap.set("#FEFE33", "Yellow");
colorMap.set("#9ACD32", "Yellow Green");
colorMap.set("#FFAE42", "Yellow Orange");
colorMap.set("#FFF000", "Yellow rose");
colorMap.set("#0014A8", "Zaffre");
colorMap.set("#2C1608", "Zinnwaldite brown");
colorMap.set("#39A78E", "Zomp");
