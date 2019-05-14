# mpp.js 3.0

# How to install:

- First create your project folder

- Run ```npm init```

- Run ```npm i mpp.js```

- Require it and your done!

## Example:
```js
// We have to require the library(of course)
const mppjs = require('mpp.js');

// MPP's URI(optional)
var mppuri = 'ws://multiplayerpiano.com:443';
// The proxy you want to use(optional)
var proxy = 'https://proxy.example.com';
// mppuri and proxy are optional.
const MPP = new mppjs(mppuri, proxy);

// Example:
// You can set the room to whatever room you want
MPP.client.setChannel('lobby');
// This connects to MPP so make sure to not forget this!
MPP.client.start();
// You can use this to set your bot's name to anything(e.g. "Awesome Bot")
MPP.setName('MPP Bot');
// This sends a message to your room's chat(e.g. "MPP Bot: Testing 123...")
MPP.client.chat('Testing 123...');

// This event is fired when a user joins or leaves the room
MPP.client.on('count', (count) => {
  console.log(`${count} people are in the room.`);
});

// This event is fired when a user sends a message in chat
MPP.client.on('a', (msg) => {
    //Quick msg Explanation:
      // msg.a is the message that the user sent
      // msg.p is an object that contains data about the user that sent the message
      //  msg.p.name is their name
      //  msg.p.color is the hex representation of their color
    
    // Prints the spoken message to the console
      console.log(`${msg.p.name}: ${msg.a}`);
    
      // Check if the participant said "!hello" then send a message back
      if (msg.a.split(' ')[0].toLowerCase().startsWith('!hello')) {
          // Send a message that says: "Hi <Username>!"
          MPP.chat.send(`Hi ${msg.p.name}!`);
      }
});
```


# How to create an MPP bot:

- First install the library

- Insert this code into your index.js:
```js
// This is needed for the library
const mppjs = require('mpp.js');

// This sets up the bot
const MPP = new mppjs(mppuri, proxy);
```

- Use this example code to help

```js
// This is needed for the library
const mppjs = require('mpp.js');

// MPP's URI(optional)
var mppuri = 'ws://multiplayerpiano.com:443';
// The proxy you want to use(optional)
var proxy = 'https://proxy.example.com';

// This sets up the bot
//  Note: mppuri and proxy are optional.
const MPP = new mppjs(mppuri, proxy);


MPP.client.on("a", function(msg){
    //Quick msg Explanation:
        // msg.a is the message that the user sent
        // msg.p is an object that contains data about the user that sent the message
        //  msg.p.name is their name
		//  msg.p.color is the hex representation of their color
    
	// Prefix
	var p = "!";
	// Gets the arguments by finding the letters after the prefix and command then splitting it by spaces
	var args = msg.a.split(" ");
	var cmd = args[0].toLowerCase();
	args = args.slice(1);
	
	// Commands
	//  This checks if the command that was sent was "<prefix>test"
	if (cmd == p+"test"){
		MPP.chat.send("This bot was made using mpp.js 3.0.");
	}
}
```
The above code will say "This bot was made using mpp.js 3.0." in chat whenever you run the command !test.


# Complete Docs:

- Coming in 3.0...


# New Features:

# - 3.0
***
## - Proxies
### Proxies have been added(finally)! :D
### Here's an example of a bot using a proxy:
```js
const mppjs = require('mpp.js');

// MPP's URI(optional)
var mppuri = 'ws://multiplayerpiano.com:443';
// The proxy you want to use(optional)
var proxy = 'https://proxy.example.com';
// mppuri and proxy are optional.
const MPP = new mppjs(mppuri, 'https://proxy.example.com');


MPP.client.start();

MPP.chat.send('Hello. I'm a proxy bot. Bleep bloop.');
```
## - Auto-Reconnect
### If the MPP servers go down or the connection is lost, the bot will try to reconnect to MPP.
## - MPP.client.kickban(id, ms) function.
### 
## - To create a bot, you must require mpp.js then create a new variable and call it MPP. MPP = new mppjs(mppuri, proxy)
### Example:
```js
// We have to require the library(of course)
const mppjs = require('mpp.js');

// MPP's URI(optional)
var mppuri = 'ws://multiplayerpiano.com:443';
// The proxy you want to use(optional)
var proxy = 'https://proxy.example.com';
// mppuri and proxy are optional.
const MPP = new mppjs(mppuri, proxy);

// Example:
// You can set the room to whatever room you want
MPP.client.setChannel('lobby');
// This connects to MPP so make sure to not forget this!
MPP.client.start();
// You can use this to set your bot's name to anything(e.g. "Awesome Bot")
MPP.setName('MPP Bot');
// This sends a message to the chat(e.g. "MPP Bot: Testing 123...")
MPP.client.chat('Testing 123...');
```
***
# - 2.1
***
## - MPP.client.setName Added
 - ### Added a new function called setName.<br>Example:
  ```js
    const MPP = require('mpp.js');

    // Set the name of the bot to "A Very Awesome Bot"
    MPP.client.setName('A Very Awesome Bot');
  ```


## - Major Bug Fixes
 - ### Fixed a bug that wouldn't allow you to create a bot. It would print this to the console: "Error: Could not find directory E:\\[Directory Name]\midi". I'm so sorry I didn't catch that bug. I'll make sure that doesn't happen again.
***

# - 2.0
***
## - Toggle Functions
 - ### Ever feel tired of having to use ```if``` statements to toggle piano keys, piano sustain, public room setting, etc.? No? I get it this is so useless and unintuitive. Yeah? Here's an example:
   ```js
   const MPP = require('mpp.js');
   
   // This toggles the piano sustain
   MPP.toggle.sustain();
   
   // This toggles the public piano setting
   MPP.toggle.publicPiano();
   
   // This toggles the public room setting
   MPP.toggle.publicRoom();
   
   // This toggles the connection to the current room
   MPP.toggle.connection();
   ```
 -  ### NOTE:
   #### These functions are not availible on the website. These are simply just bonus functions that are bundled mpp.js. You don't have to use them though.

## - Improved Code
   ### I have improved the code and syntax. A year ago, I was ```TERRIBLE``` at Node.js. Now, I have improved the code and syntax a lot so it is easier to read and use.
   ### NOTE:
   #### Some of the features that are availible on the website(like ``` MPP.chat.blur() ```) are not availible on mpp.js 2.0. These features will be implemented in either 3.0 or 3.1. Don't worry, these features will be added soon(1 to 3 months from 2.0's release)
***
