# Add Video Calling in your Web App using [Agora.io](http://Agora.io) 🖥

  

**Note: Updated for usage with NG SDK (4.x).**

  

Integrating video streaming features within your application can be very tedious and time-consuming. Maintaining a low-latency video server, load balancing, listening to end-user events (screen off, reload, etc.) are some of the really painful hassles… not to mention having cross-platform compatibility.

Feeling dizzy already? Dread not! Agora’s Video SDK allows you to embed video calling features into your application, within a matter of minutes. In addition, all the video server details are abstracted away.

In this tutorial, we’ll write a bare-bones web application with video calling features using vanilla JavaScript and the Agora Web NG SDK.

  

You can test a live demo of this tutorial [here](https://agora-ng-sdk-demo.netlify.app/).

  

## Let’s start by signing up with Agora.

Go ahead to [https://sso.agora.io/en/v2/signup](https://sso.agora.io/en/v2/signup) to create an account and login into the dashboard.

Navigate to the project list tab under projects and create a new project by clicking the green button as shown in the below image.

  

Create a new project and retrieve the App ID. This will be to authenticate your requests while coding the application.

## Structure

This would be the structure of the application that we are developing

```plain
.
├── index.html
├── scripts
│ └── script.js
└── styles
  └── style.css
```

## index.html

The application’s structure is very straightforward.

You can download the latest version of the Web SDK from Agora’s [Downloads page](https://www.agora.io/en/download/) or use the CDN version instead as shown in the tutorial :
 

```html
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>Video Call Demo</title>
    <link rel="stylesheet" href="./styles/style.css">
</head>

<body>
    <h1>
        Video Call Demo<br><small style="font-size: 14pt">Powered by Agora.io</small>
    </h1>

    <p>App id : <input type="text" id="app-id" value=""></p>
    <p>Channel : <input type="text" id="channel" value=""></p>
    <p>Token : <input type="text" id="token" placeholder="(optional)" value=""></p>
    <button id="start">Start</button>
    <button id="stop" disabled>Stop</button>

    <h4>My Feed :</h4>
    <div id="me"></div>

    <h4>Remote Feeds :</h4>
    <div id="remote-container">

    </div>

    <script src="https://download.agora.io/sdk/release/AgoraRTC_N-4.3.0.js"></script>
    <script src="scripts/script.js"></script>
</body>

</html>
```

index.html

There is a container with an id `me` that is supposed to contain the video stream of the local user (you).

There is a container with an id `remote-container` to render the video feeds of the other remote users in the channel.

## Styling
Now, let’s add some basic styling to our app.

  

```css
*{
    font-family: sans-serif;
}
h1,h4,p{
    text-align: center;
}
button{
    display: block;
    margin: 5px auto;
}
#remote-container video{
    height: auto;
    position: relative !important;
}
#me{
    position: relative;
    width: 50%;
    margin: 0 auto;
    display: block;
}
#me video{
    position: relative !important;
}
#remote-container{
    display: flex;
}
```
styles.css

## Script.js

First, let’s spring up some helper functions to handle trivial DOM operations like adding / removing video containers.

```js
// JS reference to the container where the remote feeds belong
let remoteContainer= document.getElementById("remote-container");

/**
 * @name addVideoContainer
 * @param uid - uid of the user
 * @description Helper function to add the video stream to "remote-container"
 */
function addVideoContainer(uid){
    let streamDiv=document.createElement("div"); // Create a new div for every stream
    streamDiv.id=uid;                       // Assigning id to div
    streamDiv.style.transform="rotateY(180deg)"; // Takes care of lateral inversion (mirror image)
    remoteContainer.appendChild(streamDiv);      // Add new div to container
}
/**
 * @name removeVideoContainer
 * @param uid - uid of the user
 * @description Helper function to remove the video stream from "remote-container"
 */
function removeVideoContainer (uid) {
    let remDiv=document.getElementById(uid);
    remDiv && remDiv.parentNode.removeChild(remDiv);
}
```

  

### The architecture of an Agora Video Call via Web:

<!---Diagram here --->

So what’s the diagram all about? Let’s break it down a bit.

Channels are something similar to chat rooms and every App ID can spawn multiple channels.

Users are able to join and leave a channel at will.

We’ll be implementing the methods mentioned in the diagram inside `script.js`.

### Create a client
First, we need to create a client object by calling the `AgoraRTC.createClient` method. Pass in the parameters to set the video encoding and decoding format (vp8) and the channel mode (rtc).

```js
// Client Setup
// Defines a client for RTC
const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
```

### Creating local media tracks and intializing

Let's create audio and video track objects for the local user by calling the `AgoraRTC.createMicrophoneAndCameraTracks` method .(Although optional, You can also pass in the appropriate parameters as per docs to tweak your tracks).

```js
const [localAudioTrack, localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();
```

We can now initialize the stop button and play the local video feed back in the browser ('me' container) to provide feedback.

```js
// Initialize the stop button
initStop(client, localAudioTrack, localVideoTrack);

// Play the local track
localVideoTrack.play('me');
```

`initStop` is defined at the end of the code as a cleanup function.

```js
function initStop(client, localAudioTrack, localVideoTrack){
  const stopBtn = document.getElementById('stop');
  stopBtn.disabled = false; // Enable the stop button
  stopBtn.onclick = null; // Remove any previous event listener
  stopBtn.onclick = function () {
    client.unpublish(); // stops sending audio & video to agora
    localVideoTrack.stop(); // stops video track and removes the player from DOM
    localVideoTrack.close(); // Releases the resource
    localAudioTrack.stop();  // stops audio track
    localAudioTrack.close(); // Releases the resource
    client.remoteUsers.forEach(user => {
        if (user.hasVideo) {
            removeVideoContainer(user.uid) // Clean up DOM
        }
        client.unsubscribe(user); // unsubscribe from the user
    });
    client.removeAllListeners(); // Clean up the client object to avoid memory leaks
    stopBtn.disabled = true;
  }
}
```

### Adding event listeners


To display the remote users in the channel, and to handle the view appropriately if somebody enters/exits the video call, we'll set up event listeners and handlers.

```js
// Set up event listeners for remote users publishing or unpublishing tracks
client.on("user-published", async (user, mediaType) => {
  await client.subscribe(user, mediaType); // subscribe when a user publishes
  if (mediaType === "video") {
    addVideoContainer(String(user.uid)) // uses helper method to add a container for the videoTrack
    user.videoTrack.play(String(user.uid));
  }
  if (mediaType === "audio") {
    user.audioTrack.play(); // audio does not need a DOM element
  }
});
client.on("user-unpublished",  async (user, mediaType) => {
  if (mediaType === "video") {
      removeVideoContainer(user.uid) // removes the injected container
  }
});
```

### Joining a channel

Now we’re ready to join a channel by using the `client.join` method.

```js
const _uid = await client.join(appId, channelId, token, null); 
```
If you have app certificate enabled in your project, you have to generate a temporary token and pass it into the HTML form. If the app certificate is disabled, you can leave the token field blank.

For production environments read the below note:
> Note: This guide does not implement token authentication which is recommended for all RTE apps running in production environments. For more information about token based authentication within the Agora platform please refer to this guide: [https://bit.ly/3sNiFRs](https://bit.ly/3sNiFRs)

We will allow Agora to dynamically assign a user ID for each user that joins in this demo so pass in `null` for the UID parameter.

### Publishing local tracks into the channel

Finally, it’s time to publish our video feed into the channel.

```js
await client.publish([localAudioTrack, localVideoTrack]);
```

Shazam! Now, we can conduct a successful video call inside our application.

Note: When you try to deploy this web app (or any other which uses Agora SDK), make sure the server has an SSL certificate (HTTPS connection).

The codebase for this tutorial is available on [GitHub](https://github.com/technophilic/Agora-demo-web).