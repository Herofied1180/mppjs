# mpp.js 2.0

# How to install:

- First create your Node.js folder

- Run npm init

- Run npm i mpp.js

- Require it and your done!


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

- Coming Soon...


# New Features:

## - Toggle Functions
- ### Ever feel tired of having to use ```if``` statements to toggle piano keys, piano sustain, public room setting, etc.?
   ### No? Get off my lawn!
   ### Yeah? Here's an example:
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
   ### NOTE:
   #### These functions are not availible on the website. These are simply just bonus functions that can be used in mpp.js. Do ```NOT``` tell me I shouldn't add new functions. Node.js is a different language than JavaScript. So is mpp.js. mpp.js uses similar syntax to the website's scripts which enables you to copy and paste code used in the console into Node.js without many compatibility issues and hours of porting to Node.js. Node.js is also similar to Javascript because they use ECMAScript. mpp.js uses similar code that the website uses, but enhanced for use with Node.js.

- ### Improved Code
   ### I have improved the code and syntax. A year ago, I was ```TERRIBLE``` at Node.js. Now, I have improved the code and syntax a lot so it is easier to read and use.
   ### NOTE:
   #### Some of the features that are availible on the website are not availible on mpp.js 2.0. These features will be implemented in either 2.1 or 3.0. Don't worry, these features will be added soon(1 to 3 months from 2.0's release)
