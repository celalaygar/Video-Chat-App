

import { useEffect, useRef, useState } from 'react';
import './App.css';
import io from "socket.io-client"


import Peer from "simple-peer"



const App = () => {




  const [myStream, setMyStream] = useState();
  const [videoTrack, setVideoTrack] = useState({});
  const [audioTrack, setAudioTrack] = useState({});
  const [videoStatus, setVideoStatus] = useState(true);
  const [audioStatus, setAudioStatus] = useState(true);
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const myVideo = useRef()
  let durationInSeconds = 0;
  let videoBlob = null;

  const handleStartStream = async () => {
    let startTime = 0;
    let chunks = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      // navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      //   setStream(stream)
      //   if (myVideo.current) {
      //     myVideo.current.srcObject = stream
      //   }
      // })




      if (myVideo.current) {
        myVideo.current.srcObject = stream

        myVideo.current.addEventListener("loadedmetadata", () => {
          myVideo.current.play()
        })
      }

      const mediaRecorder = new MediaRecorder(stream);
      setMediaRecorder(mediaRecorder);
      setMyStream(stream);
      setVideoTrack(stream.getTracks().find(track => track.kind === 'video'))
      setAudioTrack(stream.getTracks().find(track => track.kind === 'audio'))

      mediaRecorder.onstart = () => {
        console.log('Record Start!');
        startTime = Date.now();
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Record Stop!');
        videoBlob = new Blob(chunks, { type: 'video/webm' });
        const endTime = Date.now()
        if (startTime !== null) {
          durationInSeconds = endTime - startTime;
          console.log('Record Time:', durationInSeconds, 'second')
        }
        //sendVideo()
      };

      mediaRecorder.start();

    } catch (error) {
      console.error('getUserMedia veya MediaRecorder hatası:', error);
    }
  };

  const HandleStopStream = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      myStream.getTracks().forEach(track => track.stop());
      setMyStream();
      setVideoTrack();
      console.log('Kayıt durduruldu');
    } else {
      console.log('Kayıt durdurulamadı: mediaRecorder null veya durumu inactive');
    }
  }

  const handleCamera = () => {
    if (videoTrack.enabled) {
      videoTrack.enabled = false
      setVideoStatus(false)
    } else {
      videoTrack.enabled = true
      setVideoStatus(true)
    }
  }

  const handleMic = () => {
    if (audioTrack.enabled) {
      audioTrack.enabled = false
      setAudioStatus(false)
    } else {
      audioTrack.enabled = true
      setAudioStatus(true)
    }
  }

  const sendVideo = async () => {
    const data = { fileDuration: durationInSeconds }

    const fd = new FormData()
    fd.append('file', videoBlob, 'video.mp4')
    fd.append('candidateAnswerDTO', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    setVideoUrl(URL.createObjectURL(videoBlob));
    /*await axios
        .post('http://localhost:8000/start-job/VIDEO', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        })
        .catch(reason => console.log(reason))*/
  }


  return (
    <>
      <h1 >Zoom</h1>
      <div className="container">
        <div className="video-container">
          <div className="video  " >
            <video ref={myVideo} autoplay muted playsinline style={{ border: "2px solid #ccc", width: "200px", height: "300px" }} />
          </div>
        </div>

        <div>
          <div onClick={() => handleCamera()} >
            <button onClick={() => handleCamera()}>{videoStatus ? "Camera On" : "Camera Off"}</button>
          </div>
          <div onClick={() => handleMic()} >
            <button onClick={() => handleMic()}>{audioStatus ? "Mic On" : "Mic Off"}</button>
          </div>
          <button onClick={() => handleStartStream()}>Start Record</button>
          <button onClick={() => HandleStopStream()}>Stop Record</button>
        </div>
      </div >
    </>
  );
}

export default App;









/*

import { useEffect, useRef, useState } from 'react';
import './App.css';
import io from "socket.io-client"


import Peer from "simple-peer"



const socket = io.connect('http://localhost:5000')

const App = () => {

  const [me, setMe] = useState("")
  const [stream, setStream] = useState()
  const [receivingCall, setReceivingCall] = useState(false)
  const [caller, setCaller] = useState("")
  const [callerSignal, setCallerSignal] = useState()
  const [callAccepted, setCallAccepted] = useState(false)
  const [idToCall, setIdToCall] = useState("")
  const [callEnded, setCallEnded] = useState(false)
  const [name, setName] = useState("")
  const myVideo = useRef()
  const userVideo = useRef()
  const connectionRef = useRef()

  useEffect(() => {
    let response = null;
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream)
      if (myVideo.current) {
        myVideo.current.srcObject = stream
      }
    })

    socket.on("me", (id) => {
      setMe(id)
    })

    socket.on("callUser", (data) => {
      setReceivingCall(true)
      setCaller(data.from)
      setName(data.name)
      setCallerSignal(data.signal)
    })
  }, [])

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    })
    peer.on("signal", (data) => {
      socket.emit("callUser", {
        userToCall: id,
        signalData: data,
        from: me,
        name: name
      })
    })
    peer.on("stream", (stream) => {

      userVideo.current.srcObject = stream

    })
    socket.on("callAccepted", (signal) => {
      setCallAccepted(true)
      peer.signal(signal)
    })

    connectionRef.current = peer
  }

  const answerCall = () => {
    setCallAccepted(true)
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream
    })
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: caller })
    })
    peer.on("stream", (stream) => {
      userVideo.current.srcObject = stream
    })

    peer.signal(callerSignal)
    connectionRef.current = peer
  }

  const leaveCall = () => {
    setCallEnded(true)
    connectionRef.current.destroy()
  }



  return (
    <>
      <h1 style={{ textAlign: "center", color: '#fff' }}>Zoomish</h1>
      <div className="container">
        <div className="video-container">
          <div className="video">
            {stream && <video playsInline muted ref={myVideo} autoPlay style={{ width: "300px" }} />}
          </div>
          <div className="video">
            {callAccepted && !callEnded ?
              <video playsInline ref={userVideo} autoPlay style={{ width: "300px" }} /> :
              null}
          </div>
        </div>
        <div className="myId">
          <input
            type="text"
            id="filled-basic"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <div text={me} style={{ marginBottom: "2rem" }}>
            <button className='btn btn-sm btn-primary' >
              Copy ID
            </button>
          </div>

          <input
            type="text"
            id="filled-basic"
            placeholder="ID to call"
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div className="call-button">
            {callAccepted && !callEnded ? (
              <button className='btn btn-sm btn-secondary' onClick={leaveCall}>
                End Call
              </button>
            ) : (
              <button color="primary" aria-label="call" onClick={() => callUser(idToCall)}>
                PHONE
              </button>
            )}
            {idToCall}
          </div>
        </div>
        <div>
          {receivingCall && !callAccepted ? (
            <div className="caller">
              <h1 >{name} is calling...</h1>
              <button className='btn btn-sm btn-primary' onClick={answerCall}>
                Answer
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default App;
*/