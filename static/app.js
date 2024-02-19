const APP_ID = "4f7f4342b01d4528a10947793459e78f";
const TOKEN = "007eJxTYFj8MTIqcrfo3bOreKd+LTxmNCVQYerym8emfjeZEN3yu2+FAoNJmnmaibGJUZKBYYqJqZFFoqGBpYm5uaWxiallqrlFWlPspdSGQEaGY9WprIwMEAjiszDkJmbmMTAAAOqtITo=";
const CHANNEL = "main";

const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

let localTracks = [];
let remoteUsers = {};

let joinAndDisplayLocalStream = async () => {
    client.on('user-published', handleUserJoined);
    client.on('user-left', handleUserLeft);

    let UID = await client.join(APP_ID, CHANNEL, TOKEN, null);

    localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

    let player = `<div class="video-container" id="user-container-${UID}">
                        <div class="video-player" id="user-${UID}"></div>
                  </div>`;
    document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

    localTracks.forEach(track => {
        if (track.kind === 'video') {
            track.play(`user-${UID}`);
        }
    });

    await client.publish(localTracks);
};

let joinStream = async () => {
    await joinAndDisplayLocalStream();
    document.getElementById('join-btn').style.display = 'none';
    document.getElementById('stream-controls').style.display = 'flex';
};

let handleUserJoined = async (user, mediaType) => {
    remoteUsers[user.uid] = user;
    await client.subscribe(user, mediaType);

    if (mediaType === 'video') {
        let player = document.getElementById(`user-container-${user.uid}`);
        if (player != null) {
            player.remove();
        }

        player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div> 
                 </div>`;
        //document.getElementById('video-streams').insertAdjacentHTML('beforeend', player);

        user.videoTrack.play(`user-${user.uid}`);
    }

    if (mediaType === 'audio') {
        user.audioTrack.play();
    }
};

let handleUserLeft = (user) => {
    delete remoteUsers[user.uid];
    document.getElementById(`user-container-${user.uid}`).remove();
};

let leaveAndRemoveLocalStream = async () => {
    localTracks.forEach(track => {
        track.stop();
        track.close();
    });

    await client.leave();
    document.getElementById('join-btn').style.display = 'block';
    document.getElementById('stream-controls').style.display = 'none';
    document.getElementById('video-streams').innerHTML = '';
};

let toggleMic = async (e) => {
    let audioTrack = localTracks.find(track => track.kind === 'audio');
    if (audioTrack && audioTrack.muted) {
        await audioTrack.setMuted(false);
        e.target.innerText = 'Mic on';
        e.target.style.backgroundColor = 'cadetblue';
    } else if (audioTrack) {
        await audioTrack.setMuted(true);
        e.target.innerText = 'Mic off';
        e.target.style.backgroundColor = '#EE4B2B';
    }
};

let toggleCamera = async (e) => {
    let videoTrack = localTracks.find(track => track.kind === 'video');
    if (videoTrack && videoTrack.muted) {
        await videoTrack.setMuted(false);
        e.target.innerText = 'Camera on';
        e.target.style.backgroundColor = 'cadetblue';
    } else if (videoTrack) {
        await videoTrack.setMuted(true);
        e.target.innerText = 'Camera off';
        e.target.style.backgroundColor = '#EE4B2B';
    }
};
let hideJoinButton = () => {
    document.getElementById('join-btn').style.display = 'none';
};

document.getElementById('join-btn').addEventListener('click', () => {
    joinStream();
    hideJoinButton();
});


document.getElementById('join-btn').addEventListener('click', joinStream);
document.getElementById('leave-btn').addEventListener('click', leaveAndRemoveLocalStream);
document.getElementById('mic-btn').addEventListener('click', toggleMic);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
