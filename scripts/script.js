/**
 * @name handleFail
 * @param err - error thrown by any function
 * @description Helper function to handle errors
 */
let handleFail = function(err){
    console.log("Error : ", err);
};

// Queries the container in which the remote feeds belong
let remoteContainer= document.getElementById("remote-container");

/**
 * @name addVideoStream
 * @param streamId
 * @description Helper function to add the video stream to "remote-container"
 */
function addVideoStream(streamId){
    let streamDiv=document.createElement("div"); // Create a new div for every stream
    streamDiv.id=streamId;                       // Assigning id to div
    streamDiv.style.transform="rotateY(180deg)"; // Takes care of lateral inversion (mirror image)
    remoteContainer.appendChild(streamDiv);      // Add new div to container
}
/**
 * @name removeVideoStream
 * @param evt - Remove event
 * @description Helper function to remove the video stream from "remote-container"
 */
function removeVideoStream (evt) {
    let stream = evt.stream;
    stream.stop();
    let remDiv=document.getElementById(stream.getId());
    remDiv.parentNode.removeChild(remDiv);

    console.log("Remote stream is removed " + stream.getId());
}



document.getElementById("start").onclick = function () {

// Client Setup
// Defines a client for RTC
    let client = AgoraRTC.createClient({
        mode: 'live',
        codec: "h264"
    });

// Client Setup
let appid = document.getElementById("app-id").value;
let channelid="any-channel";
let userid;


// Defines a client for Real Time Communication
    client.init(appid,() => console.log("AgoraRTC client initialized") ,handleFail);

// The client joins the channel
    client.join(null,channelid,null, (uid)=>{
        
        var localStream = AgoraRTC.createStream({
            video: true,
            audio: false,
        });
        localStream.init(function(){
            localStream.play('me');
            client.publish(localStream); // Publish it to the channel
        });
        console.log(`App id : ${appid}\nChannel id : ${channelid}\nUser id : ${uid}`);

    },handleFail);
//When a stream is added to a channel
    client.on('stream-added', function (evt) {
        client.subscribe(evt.stream, handleFail);
    });
//When you subscribe to a stream
    client.on('stream-subscribed', function (evt) {
        let stream = evt.stream;
        addVideoStream(stream.getId());
        stream.play(stream.getId());
    });
//When a person is removed from the stream
    client.on('stream-removed',removeVideoStream);
    client.on('peer-leave',removeVideoStream);
};