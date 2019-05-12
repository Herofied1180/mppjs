# mpp.js 2.1

# How to install:

- First create your project folder

- Run ```npm init```

- Run ```npm i mpp.js```

- Require it and your done!

## Example:
```js
const MPP = require('mpp.js');

MPP.chat.send('Hello World!');

MPP.client.on('count', (count) => {
  console.log(`${count} people are in the room.`);
});

MPP.client.on('a', (msg) => {
  // Prints the spoken message to the console
  console.log(`${msg.p.name}: ${msg.a}`);
  
  // Checks if the participant said "!hello" then sends a message back
  if (msg.a.split(' ')[0].toLowerCase().startsWith('!hello')) {
    // Sends a message that says: "Hi [Username]!"
    MPP.chat.send(`Hi ${msg.p.name}!`);
  }
});
```


# How to create an MPP bot:

- First install the library

- Insert this code into your index.js:
```js
const MPP = require("mpp.js");
```

- Use this example code to help

```js
const MPP = require("mpp.js");

MPP.client.on("a", function(msg){
  // Prefix
  var p = "!";
  var args = msg.a.split(" ");
  var cmd = args[0].toLowerCase();
  args = args.slice(1);
  
  // Commands
  if (cmd == p+"test"){
    MPP.chat.send("mpp.js 2.0 is amazing!");
  }
}
```
The above code will say "mpp.js 2.0 is amazing!" in chat whenever you run the command !test.


# Complete Docs:

- Coming in 2.2...


# New Features:

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
 - ### Fixed a bug that wouldn't allow you to create a bot. It would print this to the console: "Error: Could not find directory E:\\[Directory Name]\midi". I'm so sorry I didn't catch that bug. I'll make sure this doesn't happen again.
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
   #### Some of the features that are availible on the website(like ```js MPP.clear() ```) are not availible on mpp.js 2.0. These features will be implemented in either 2.2 or 3.0. Don't worry, these features will be added soon(1 to 3 months from 2.0's release)
***