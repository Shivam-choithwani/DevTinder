import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { connectionService, chatService, isBackendReachable } from '../services/api';
import { Users, MessageSquare, ExternalLink, Calendar, Mail, X, Send, Wifi, WifiOff, Video, VideoOff, Phone, PhoneOff, Mic, MicOff, Monitor, MonitorOff, UserMinus } from 'lucide-react';

const Github = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={props.className}
    {...props}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

export default function Connections() {
  const { user } = useAuth();
  const { showNotification } = useNotifications();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeChat, setActiveChat] = useState(null);

  // Centralized WebSocket Connection State
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const chatMessageCallbackRef = useRef(null);

  // WebRTC Video Call State
  const [callState, setCallState] = useState('idle'); // 'idle' | 'calling' | 'ringing' | 'connected'
  const [callUser, setCallUser] = useState(null); // The other developer in the call
  const [isSimulated, setIsSimulated] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const pcRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);

  // Synthesize call ringtone/ringing sounds using Web Audio API
  const ringtoneIntervalRef = useRef(null);
  const playRingtone = (isOutgoing) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const playTone = () => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc1.type = 'sine';
        osc2.type = 'sine';
        
        if (isOutgoing) {
          // Outgoing: US standard ringback tone (440Hz + 480Hz)
          osc1.frequency.setValueAtTime(440, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(480, audioCtx.currentTime);
        } else {
          // Incoming: UK standard double ring tone (400Hz + 450Hz)
          osc1.frequency.setValueAtTime(400, audioCtx.currentTime);
          osc2.frequency.setValueAtTime(450, audioCtx.currentTime);
        }
        
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
        
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 1.5);
        osc2.stop(audioCtx.currentTime + 1.5);
      };
      
      playTone();
      ringtoneIntervalRef.current = setInterval(playTone, 3000);
    } catch (err) {
      console.warn("Failed to play synthesized ringtone:", err);
    }
  };

  const stopRingtone = () => {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current);
      ringtoneIntervalRef.current = null;
    }
  };

  // Connect to WebSocket on mount (if backend is up)
  useEffect(() => {
    let active = true;
    let ws = null;

    const connectWS = async () => {
      try {
        const isUp = await isBackendReachable();
        if (!isUp) {
          console.log('[Connections] Backend down, WebSocket disabled.');
          return;
        }

        const token = localStorage.getItem('dt_token');
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//localhost:8081/ws/chat?token=${token}`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (active) {
            setConnected(true);
            console.log('[Connections WS] Connected successfully.');
          }
        };

        ws.onmessage = async (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (active) {
              if (msg.type) {
                // Handle WebRTC signaling
                handleSignalingMessage(msg);
              } else {
                // Forward standard chat messages to active drawer
                if (chatMessageCallbackRef.current) {
                  chatMessageCallbackRef.current(msg);
                }

                // Show in-app notification if message is incoming and drawer is closed/inactive
                const isIncoming = msg.senderId !== user?.id;
                const isChatOpenForSender = activeChat && activeChat.userId === msg.senderId;
                
                if (isIncoming && !isChatOpenForSender) {
                  const sender = connections.find(c => c.userId === msg.senderId) || {
                    fullName: msg.senderName || 'Developer Match',
                    photoUrl: msg.photoUrl
                  };
                  showNotification({
                    type: 'message',
                    title: `Message from ${sender.fullName} 💬`,
                    message: msg.text,
                    photoUrl: sender.photoUrl,
                    actionText: 'Open Chat',
                    onActionClick: () => {
                      setActiveChat(sender);
                    }
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error parsing WS message:', err);
          }
        };

        ws.onclose = () => {
          if (active) {
            setConnected(false);
            console.log('[Connections WS] Connection closed.');
          }
        };

        ws.onerror = (err) => {
          console.error('[Connections WS] Error:', err);
          if (active) {
            setConnected(false);
          }
        };

        socketRef.current = ws;
      } catch (err) {
        console.error('Error establishing WS:', err);
      }
    };

    connectWS();

    return () => {
      active = false;
      stopRingtone();
      if (ws) {
        ws.close();
      }
    };
  }, [connections]); // Re-connect when connections list refreshes, to update signaling handler closure

  const handleSignalingMessage = async (msg) => {
    console.log('[Connections WebRTC] Received signaling:', msg.type);
    
    switch (msg.type) {
      case 'call-request':
        if (callState !== 'idle') {
          sendSignalingMessage('call-response', msg.senderId, { accepted: false, reason: 'busy' });
          return;
        }
        
        const callerConn = connections.find(c => c.userId === msg.senderId) || {
          userId: msg.senderId,
          fullName: msg.senderName || 'Developer Match',
          photoUrl: msg.senderPhoto
        };
        
        setCallUser(callerConn);
        setCallState('ringing');
        setIsSimulated(false);
        playRingtone(false);
        break;

      case 'call-response':
        if (callState === 'calling' && msg.senderId === callUser?.userId) {
          stopRingtone();
          if (msg.accepted) {
            setCallState('connected');
            await setupWebRTCPeer(true);
          } else {
            alert(`${callUser.fullName} declined your call.`);
            cleanupCall();
          }
        }
        break;

      case 'webrtc-offer':
        if (callState === 'connected' && msg.senderId === callUser?.userId) {
          await setupWebRTCPeer(false, msg.sdp);
        }
        break;

      case 'webrtc-answer':
        if (callState === 'connected' && msg.senderId === callUser?.userId && pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.sdp }));
        }
        break;

      case 'webrtc-ice':
        if (callState === 'connected' && msg.senderId === callUser?.userId && pcRef.current) {
          try {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(msg.candidate));
          } catch (e) {
            console.error('Error adding ICE candidate:', e);
          }
        }
        break;

      case 'call-ended':
        if (msg.senderId === callUser?.userId) {
          cleanupCall();
        }
        break;

      default:
        break;
    }
  };

  const setupWebRTCPeer = async (isInitiator, remoteOfferSdp = null) => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        console.log('[WebRTC] Track received');
        setRemoteStream(event.streams[0]);
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalingMessage('webrtc-ice', callUser.userId, { candidate: event.candidate });
        }
      };

      if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
      }

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignalingMessage('webrtc-offer', callUser.userId, { sdp: offer.sdp });
      } else {
        await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: remoteOfferSdp }));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignalingMessage('webrtc-answer', callUser.userId, { sdp: answer.sdp });
      }
    } catch (err) {
      console.error('Failed to setup WebRTC Peer Connection:', err);
    }
  };

  const sendSignalingMessage = (type, recipientId, extraData = {}) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type,
        recipientId,
        ...extraData
      }));
    }
  };

  const startCall = async (conn) => {
    setCallUser(conn);
    
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
    } catch (err) {
      console.warn("Failed to get local camera stream:", err);
    }

    setCallState('calling');
    playRingtone(true);

    const isMockUser = conn.userId && String(conn.userId).startsWith('user-');

    if (connected && !isMockUser) {
      setIsSimulated(false);
      sendSignalingMessage('call-request', conn.userId, {
        senderName: user?.username || 'Developer',
        senderPhoto: user?.photoUrl || ''
      });
    } else {
      console.log('[Call] Offline/Mock mode or calling mock user. Simulating call pickup in 3.5s.');
      setIsSimulated(true);
      setTimeout(() => {
        setCallState((prev) => {
          if (prev === 'calling') {
            stopRingtone();
            return 'connected';
          }
          return prev;
        });
      }, 3500);
    }
  };

  const acceptCall = async () => {
    stopRingtone();
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
    } catch (err) {
      console.warn("Failed to get local camera stream on accept:", err);
    }

    sendSignalingMessage('call-response', callUser.userId, { accepted: true });
    setCallState('connected');
  };

  const declineCall = () => {
    stopRingtone();
    sendSignalingMessage('call-response', callUser.userId, { accepted: false });
    cleanupCall();
  };

  const endCall = () => {
    sendSignalingMessage('call-ended', callUser.userId);
    cleanupCall();
  };

  const cleanupCall = () => {
    stopRingtone();
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    setRemoteStream(null);

    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setCallState('idle');
    setCallUser(null);
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const stopScreenShare = async () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setIsScreenSharing(false);

    // Restore camera video track in peer connection
    if (localStream) {
      const cameraTrack = localStream.getVideoTracks()[0];
      if (cameraTrack && pcRef.current) {
        const videoSender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
        if (videoSender) {
          try {
            await videoSender.replaceTrack(cameraTrack);
          } catch (e) {
            console.error('Error replacing track on stop screen share:', e);
          }
        }
      }
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        setScreenStream(stream);
        setIsScreenSharing(true);

        stream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };

        if (pcRef.current) {
          const videoSender = pcRef.current.getSenders().find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(stream.getVideoTracks()[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to get display media:", err);
      }
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  // Bind screen stream
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream, callState]);

  const loadConnections = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await connectionService.getConnections(user.id);
      setConnections(data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch connections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, [user]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-400 text-sm">Loading matches...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-violet-600/10 border border-violet-500/20">
          <Users className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Your Connections</h1>
          <p className="text-slate-400 text-xs sm:text-sm">You and these developers liked each other's developer stack.</p>
        </div>
      </div>

      {connections.length === 0 ? (
        /* Empty State Panel */
        <div className="max-w-md mx-auto p-8 text-center glass-panel border border-slate-800 rounded-2xl space-y-5 shadow-xl mt-12 animate-fade-in">
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl inline-block text-slate-500">
            <Users className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-white">No Matches Yet</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Connections are established when you swipe right on a developer, and they swipe right on you back!
            </p>
          </div>
          <div className="pt-2">
            <a
              href="/"
              className="inline-flex py-2 px-5 rounded-xl font-semibold bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white text-sm transition-all"
            >
              Start Swiping
            </a>
          </div>
        </div>
      ) : (
        /* Matches Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {connections.map((conn) => (
            <div
              key={conn.id || conn.userId}
              className="glass-panel border border-slate-800 rounded-2xl overflow-hidden hover:border-violet-500/30 transition-all duration-300 flex flex-col group hover:shadow-xl"
            >
              {/* Profile Card Header Photo */}
              <div className="relative h-48 w-full overflow-hidden">
                <img
                  src={conn.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=300&h=300'}
                  alt={conn.fullName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent"></div>
                
                {/* Years Experience Badge */}
                <span className="absolute bottom-3 left-4 bg-slate-950/70 border border-slate-800 px-2 py-0.5 rounded-full text-[10px] text-slate-300 font-semibold tracking-wider uppercase">
                  {conn.yearsOfExperience} YOE
                </span>
              </div>

              {/* Profile details */}
              <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-violet-400 transition-colors">
                      {conn.fullName}
                    </h3>
                    {conn.age && (
                      <span className="text-sm font-semibold text-slate-400 shrink-0">
                        {conn.age} y/o
                      </span>
                    )}
                  </div>

                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed h-8">
                    {conn.bio || 'No bio description provided.'}
                  </p>

                  {/* Skills Grid */}
                  <div className="flex flex-wrap gap-1 pt-1.5 h-[54px] overflow-hidden">
                    {conn.skills?.slice(0, 4).map((skill, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-900 text-violet-300 border border-violet-500/10"
                      >
                        {skill}
                      </span>
                    ))}
                    {conn.skills?.length > 4 && (
                      <span className="px-2 py-0.5 text-[9px] font-medium rounded-full bg-slate-900 text-slate-500 border border-slate-800">
                        +{conn.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Match actions footer */}
                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/80">
                  {/* Chat button */}
                  <button
                    onClick={() => setActiveChat(conn)}
                    className="flex-1 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>

                  {/* External links */}
                  {conn.githubUrl && (
                    <a
                      href={conn.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
                      title="Visit GitHub Portfolio"
                    >
                      <Github className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeChat && (
        <ChatDrawer
          connection={activeChat}
          onClose={() => setActiveChat(null)}
          currentUser={user}
          connected={connected}
          socket={socketRef.current}
          chatMessageCallbackRef={chatMessageCallbackRef}
          onStartCall={(conn) => {
            setActiveChat(null);
            startCall(conn);
          }}
          onUnmatched={() => {
            setActiveChat(null);
            loadConnections();
          }}
        />
      )}

      {/* Video Call UI Overlay Modal */}
      {callState !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col justify-between overflow-hidden font-sans text-white">
          {/* Ringing / Calling Status Interface */}
          {(callState === 'ringing' || callState === 'calling') && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 p-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-violet-600/30 blur-[40px] animate-pulse"></div>
                <img
                  src={callUser?.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150'}
                  alt={callUser?.fullName}
                  className="w-32 h-32 rounded-full object-cover border-2 border-violet-500 relative"
                />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">{callUser?.fullName}</h3>
                <p className="text-slate-400 text-sm animate-pulse tracking-wide font-medium">
                  {callState === 'ringing' ? 'Incoming Video Call...' : `Waiting for ${callUser?.fullName} to pick up...`}
                </p>
              </div>

              {/* Call Buttons for Ringing/Calling */}
              <div className="flex items-center gap-6 pt-4">
                {callState === 'ringing' ? (
                  <>
                    <button
                      onClick={declineCall}
                      className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 active:scale-95 transition-all cursor-pointer"
                      title="Decline Call"
                    >
                      <PhoneOff className="w-6 h-6" />
                    </button>
                    <button
                      onClick={acceptCall}
                      className="p-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer animate-bounce"
                      title="Accept Call"
                    >
                      <Phone className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={endCall}
                    className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/25 active:scale-95 transition-all cursor-pointer"
                    title="Cancel Call"
                  >
                    <PhoneOff className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Connected WebRTC Video Stream View */}
          {callState === 'connected' && (
            <div className="relative flex-1 bg-slate-900 w-full h-full">
              {isScreenSharing && screenStream ? (
                /* Primary Screen Share View */
                <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 left-4 py-1.5 px-3 rounded-full bg-violet-600/90 backdrop-blur border border-violet-500 text-[10px] sm:text-xs text-white flex items-center gap-2 shadow-lg animate-pulse z-20">
                    <span className="w-2 h-2 rounded-full bg-white"></span>
                    <span>You are sharing your screen</span>
                  </div>
                </div>
              ) : isSimulated ? (
                /* Simulated Stream View in Mock Mode */
                <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-6 bg-gradient-to-b from-slate-900 to-slate-950">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-violet-600/30 blur-[40px] animate-pulse"></div>
                    <img
                      src={callUser?.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150'}
                      alt={callUser?.fullName}
                      className="w-32 h-32 rounded-full object-cover border-2 border-violet-500 relative"
                    />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold text-white tracking-wide">{callUser?.fullName}</h3>
                    <p className="text-xs text-emerald-400 font-semibold tracking-wide flex items-center justify-center gap-1.5 animate-pulse">
                      <Wifi className="w-3.5 h-3.5" />
                      <span>P2P Mock Stream Connected</span>
                    </p>
                  </div>
                </div>
              ) : (
                /* Real WebRTC Streams */
                <>
                  {remoteStream ? (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl inline-block text-violet-400 animate-pulse">
                        <Video className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-white">Connecting Peer Stream</h4>
                        <p className="text-xs text-slate-400">Waiting for remote audio/video data...</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Floating Local Stream Preview */}
              {localStream && !isCameraOff && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute top-4 right-4 w-28 sm:w-36 h-40 sm:h-48 rounded-2xl object-cover border border-slate-700/80 shadow-2xl bg-slate-950/40 backdrop-blur-md z-10"
                />
              )}

              {/* Floating Remote Stream/Avatar Preview when Screen Sharing */}
              {isScreenSharing && (
                <div className="absolute top-4 right-36 sm:right-44 w-28 sm:w-36 h-40 sm:h-48 rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl bg-slate-950/40 backdrop-blur-md flex flex-col items-center justify-center p-2 text-center space-y-2 z-10">
                  {isSimulated ? (
                    <>
                      <img
                        src={callUser?.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150&h=150'}
                        alt={callUser?.fullName}
                        className="w-16 h-16 rounded-full object-cover border border-violet-500/50"
                      />
                      <span className="text-[10px] text-slate-300 font-semibold truncate max-w-full">
                        {callUser?.fullName}
                      </span>
                    </>
                  ) : (
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* Top Bar (Call Info / Duration) */}
              <div className="absolute top-4 left-4 py-1.5 px-3 rounded-full bg-slate-950/60 backdrop-blur border border-slate-800 text-[10px] sm:text-xs text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Active Call with {callUser?.fullName}</span>
              </div>
            </div>
          )}

          {/* Connected controls footer bar */}
          {callState === 'connected' && (
            <div className="p-6 bg-slate-950 border-t border-slate-900 flex items-center justify-center gap-6">
              <button
                onClick={toggleMute}
                className={`p-3.5 rounded-full border border-slate-800 hover:border-slate-700 active:scale-95 transition-all cursor-pointer ${
                  isMuted ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-slate-900 text-slate-300'
                }`}
                title={isMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleCamera}
                className={`p-3.5 rounded-full border border-slate-800 hover:border-slate-700 active:scale-95 transition-all cursor-pointer ${
                  isCameraOff ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-slate-900 text-slate-300'
                }`}
                title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
              >
                {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
              </button>
              <button
                onClick={toggleScreenShare}
                className={`p-3.5 rounded-full border border-slate-800 hover:border-slate-700 active:scale-95 transition-all cursor-pointer ${
                  isScreenSharing ? 'bg-violet-600 text-white border-violet-500' : 'bg-slate-900 text-slate-300'
                }`}
                title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
              >
                {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
              </button>
              <button
                onClick={endCall}
                className="p-4 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
                title="End Call"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
function ChatDrawer({ connection, onClose, currentUser, connected, socket, chatMessageCallbackRef, onStartCall, onUnmatched }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newMessageText, setNewMessageText] = useState('');
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { showNotification } = useNotifications();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      setLoading(true);
      try {
        const history = await chatService.getChatHistory(connection.userId);
        if (active) {
          setMessages(history);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadHistory();

    // Register listener for standard chat message delivery
    chatMessageCallbackRef.current = (msg) => {
      if (msg.senderId === connection.userId || msg.recipientId === connection.userId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    return () => {
      active = false;
      chatMessageCallbackRef.current = null;
    };
  }, [connection.userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!newMessageText.trim()) return;

    const text = newMessageText.trim();
    setNewMessageText('');

    if (socket && socket.readyState === WebSocket.OPEN) {
      const payload = JSON.stringify({
        recipientId: connection.userId,
        text: text
      });
      socket.send(payload);
    } else {
      // Fallback for mock mode
      try {
        const savedMsg = await chatService.sendMockMessage(connection.userId, text);
        setMessages(prev => [...prev, savedMsg]);
      } catch (err) {
        console.error('Failed to send mock message:', err);
      }
    }
  };

  const handleUnmatch = async () => {
    try {
      await connectionService.unmatchConnection(currentUser.id, connection.userId);
      showNotification({
        type: 'info',
        title: 'Connection Removed 💔',
        message: `You have unmatched with ${connection.fullName}.`
      });
      if (onUnmatched) onUnmatched();
    } catch (err) {
      console.error('Failed to unmatch connection:', err);
      alert('Failed to remove connection.');
    }
  };

  const formatTime = (timeStr) => {
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 animate-fade-in animate-duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-slate-950/95 backdrop-blur-xl border-l border-slate-800/80 shadow-2xl flex flex-col z-50 animate-fade-in animate-duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={connection.photoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100&h=100'}
                alt={connection.fullName}
                className="w-10 h-10 rounded-full object-cover border border-slate-800"
              />
              <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                connected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">{connection.fullName}</h3>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                {connected ? (
                  <>
                    <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Real-time Chat Active</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                    <span>Mock/Offline Mode (Saving locally)</span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Call button */}
            <button
              onClick={() => onStartCall(connection)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              title="Start Video Call"
            >
              <Video className="w-4 h-4" />
            </button>
            {/* Unmatch button */}
            <button
              onClick={() => setShowUnmatchConfirm(true)}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
              title="Unmatch Developer"
            >
              <UserMinus className="w-4 h-4" />
            </button>
            {connection.githubUrl && (
              <a
                href={connection.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all"
                title="GitHub Profile"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message area */}
        <div className="flex-grow overflow-y-auto p-4 space-y-4 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-8 h-8 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
              <p className="mt-2 text-xs text-slate-400">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
              <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl inline-block text-violet-400">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Start the conversation!</h4>
                <p className="text-xs text-slate-400 max-w-xs leading-relaxed mt-1">
                  Say hello to {connection.fullName}. Ask about their stack or collaborate on a project!
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === currentUser?.id;
              console.log('[Chat debug] msg.senderId:', msg.senderId, 'currentUser.id:', currentUser?.id, 'isMe:', isMe);
              return (
                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? 'bg-gradient-to-r from-violet-600 to-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-900 border border-slate-800/80 text-slate-100 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 px-1">
                    {formatTime(msg.timestamp)}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800/80 bg-slate-950/80">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              placeholder={`Send message to ${connection.fullName}...`}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* Unmatch Confirmation Modal Overlay */}
      {showUnmatchConfirm && (
        <div className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="max-w-xs w-full p-6 text-center glass-panel border border-rose-500/20 rounded-2xl shadow-2xl space-y-5">
            <div className="w-12 h-12 bg-rose-600/10 rounded-xl flex items-center justify-center mx-auto text-rose-400 border border-rose-500/20">
              <UserMinus className="w-6 h-6" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Unmatch {connection.fullName}?</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                This will remove them from your connections and delete your chat history. You won't be able to undo this.
              </p>
            </div>
            
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleUnmatch}
                className="w-full py-2 px-4 rounded-xl font-semibold bg-rose-600 hover:bg-rose-500 text-white text-xs transition-all cursor-pointer active:scale-95"
              >
                Yes, Unmatch
              </button>
              <button
                onClick={() => setShowUnmatchConfirm(false)}
                className="w-full py-2 px-4 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
