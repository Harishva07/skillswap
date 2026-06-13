import React, { useState, useEffect, useRef } from 'react';
import { UserAvatar } from '../components/common/Utils';

export const WebRTCCallModal = ({ 
  socket, 
  currentUser, 
  callee, // if we are initiating the call
  incomingCall, // if we are receiving a call
  onEndCall 
}) => {
  const [status, setStatus] = useState(incomingCall ? 'ringing' : 'calling');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // Helper to safely get the target ID
  const targetId = callee ? callee.other_user_id : (incomingCall ? incomingCall.callerId : null);

  useEffect(() => {
    // Determine if we are initiating or receiving
    if (!incomingCall && callee) {
      initiateCall();
    }
    
    // Set up socket listeners for WebRTC
    const handleCallAnswered = async ({ signalData }) => {
      try {
        if (peerRef.current) {
          await peerRef.current.setRemoteDescription(new RTCSessionDescription(signalData));
          setStatus('connected');
        }
      } catch (err) {
        console.error('Error setting remote description:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }) => {
      try {
        if (peerRef.current && candidate) {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleCallEnded = () => {
      cleanupAndEnd('Call ended');
    };

    if (socket) {
      socket.on('call_answered', handleCallAnswered);
      socket.on('ice_candidate', handleIceCandidate);
      socket.on('call_ended', handleCallEnded);
    }

    return () => {
      if (socket) {
        socket.off('call_answered', handleCallAnswered);
        socket.off('ice_candidate', handleIceCandidate);
        socket.off('call_ended', handleCallEnded);
      }
      cleanupResources();
    };
  }, []);

  // Timer for connected state
  useEffect(() => {
    if (status !== 'connected') return;
    const iv = setInterval(() => setDuration(d => d + 1), 1000);
    return () => clearInterval(iv);
  }, [status]);

  const cleanupResources = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => t.stop());
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
  };

  const cleanupAndEnd = (reason = '') => {
    if (reason) console.log(reason);
    cleanupResources();
    onEndCall();
  };

  const getMediaStream = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error('Failed to get media stream:', err);
      setErrorMsg('Could not access camera/microphone');
      return null;
    }
  };

  const createPeerConnection = (targetUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:global.stun.twilio.com:3478' }
      ]
    });

    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice_candidate', {
          targetId: targetUserId,
          candidate: event.candidate
        });
      }
    };

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanupAndEnd('Connection lost');
      }
    };

    peerRef.current = pc;
    return pc;
  };

  const initiateCall = async () => {
    const stream = await getMediaStream();
    if (!stream) {
      setTimeout(() => onEndCall(), 2000);
      return;
    }

    const pc = createPeerConnection(targetId);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socket.emit('call_user', {
        receiverId: targetId,
        callerName: currentUser.name,
        callerAvatar: currentUser.profile_picture,
        signalData: offer,
        isAudioOnly: false
      });
    } catch (err) {
      console.error('Error creating offer:', err);
      cleanupAndEnd('Failed to initiate call');
    }
  };

  const handleAcceptCall = async () => {
    setStatus('connecting');
    const stream = await getMediaStream();
    if (!stream) {
      handleRejectCall();
      return;
    }

    const pc = createPeerConnection(targetId);
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signalData));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('answer_call', {
        callerId: targetId,
        signalData: answer
      });

      setStatus('connected');
    } catch (err) {
      console.error('Error accepting call:', err);
      cleanupAndEnd('Failed to connect');
    }
  };

  const handleRejectCall = () => {
    socket.emit('end_call', { targetId });
    cleanupAndEnd('Call rejected');
  };

  const handleHangUp = () => {
    socket.emit('end_call', { targetId });
    cleanupAndEnd('Hung up');
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current && !isScreenSharing) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!peerRef.current) return;
    
    if (isScreenSharing) {
      // Stop screen sharing and revert to webcam
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => t.stop());
        screenStreamRef.current = null;
      }
      
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        const sender = peerRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(videoTrack);
        }
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
      }
      setIsScreenSharing(false);
    } else {
      // Start screen sharing
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Listen for when user stops sharing via browser UI
        screenTrack.onended = () => {
          if (isScreenSharing) toggleScreenShare();
        };

        const sender = peerRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) {
          await sender.replaceTrack(screenTrack);
        }
        
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }
        
        setIsScreenSharing(true);
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    }
  };

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  const displayName = callee ? callee.other_user_name : (incomingCall ? incomingCall.callerName : 'Unknown');
  const displayAvatar = callee ? callee.other_user_avatar : (incomingCall ? incomingCall.callerAvatar : null);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#111827',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Remote Video Container */}
      {(status === 'connected' || status === 'connecting') ? (
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} 
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 10 }}>
          {status === 'calling' && [1,2,3].map(i => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              border: '2px solid rgba(79, 70, 229, 0.4)',
              width: 100 + i*70, height: 100 + i*70,
              top: '50%', left: '50%',
              transform: 'translate(-50%,-50%)',
              animation: `pring 2s ${i*0.4}s ease-out infinite`,
            }} />
          ))}
          <UserAvatar src={displayAvatar} name={displayName} size={120} style={{ border: '4px solid rgba(255,255,255,0.1)', marginBottom: 24 }} />
          <h2 style={{ color: 'white', fontSize: 28, fontWeight: 700, margin: '0 0 8px' }}>{displayName}</h2>
          <p style={{ color: '#9CA3AF', fontSize: 16 }}>
            {errorMsg ? <span style={{ color: '#F87171' }}>{errorMsg}</span> : 
             status === 'calling' ? 'Calling...' : 
             status === 'ringing' ? 'Incoming video call...' : 
             status === 'connecting' ? 'Connecting...' : ''}
          </p>
        </div>
      )}

      {/* Local Video Picture-in-Picture */}
      <div style={{
        position: 'absolute', bottom: 100, right: 24, width: 160, height: 213,
        background: '#1F2937', borderRadius: 12, overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.1)',
        zIndex: 20, display: (status === 'ringing' || errorMsg) ? 'none' : 'block'
      }}>
        <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isScreenSharing ? 'none' : 'scaleX(-1)' }} />
      </div>

      {/* Connected State Timer UI */}
      {status === 'connected' && (
        <div style={{ position: 'absolute', top: 24, right: 24, background: 'rgba(0,0,0,0.6)', padding: '6px 12px', borderRadius: 20, color: 'white', fontSize: 14, zIndex: 20, display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
          {fmt(duration)}
        </div>
      )}

      {/* Call Controls */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 16, zIndex: 30, background: 'rgba(17, 24, 39, 0.8)',
        padding: '12px 24px', borderRadius: 40, backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)'
      }}>
        {status === 'ringing' ? (
          <>
            <button onClick={handleAcceptCall} style={btnStyle('#10B981')}>📹 Answer</button>
            <button onClick={handleRejectCall} style={btnStyle('#EF4444')}>✕ Decline</button>
          </>
        ) : (
          <>
            <button onClick={toggleMute} style={iconBtnStyle(isMuted)}>
              {isMuted ? '🔇' : '🎤'}
            </button>
            <button onClick={toggleVideo} style={iconBtnStyle(isVideoOff)} disabled={isScreenSharing}>
              {isVideoOff ? '🚫' : '📹'}
            </button>
            <button onClick={toggleScreenShare} style={iconBtnStyle(isScreenSharing, true)}>
              {isScreenSharing ? '🛑' : '💻'}
            </button>
            <button onClick={handleHangUp} style={{ ...iconBtnStyle(false), background: '#EF4444', color: 'white', padding: '0 20px', borderRadius: 24, fontSize: 14, fontWeight: 600 }}>
              End Call
            </button>
          </>
        )}
      </div>

      <style>{`
        @keyframes pring{0%{transform:translate(-50%,-50%) scale(.8);opacity:.8}100%{transform:translate(-50%,-50%) scale(1.5);opacity:0}}
      `}</style>
    </div>
  );
};

const btnStyle = (bg) => ({
  background: bg, color: 'white', border: 'none', padding: '12px 24px',
  borderRadius: 24, fontSize: 15, fontWeight: 600, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 8, boxShadow: `0 4px 14px ${bg}66`
});

const iconBtnStyle = (isActive, isScreen = false) => ({
  width: 48, height: 48, borderRadius: '50%', border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
  background: isActive ? (isScreen ? '#10B981' : '#FEE2E2') : '#374151',
  color: isActive ? (isScreen ? 'white' : '#EF4444') : 'white',
  transition: 'all 0.2s'
});
