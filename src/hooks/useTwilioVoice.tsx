import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// Web Audio API helper for synthesizer-based tones (avoiding CORS or missing file issues)
class AudioSynth {
  private ctx: AudioContext | null = null;
  private oscillators: OscillatorNode[] = [];
  private gainNode: GainNode | null = null;
  private ringtoneInterval: any = null;

  init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
  }

  playDtmf(key: string) {
    this.init();
    if (!this.ctx) return;
    this.stop();

    const rowFreqs: Record<string, number> = { '1': 697, '2': 697, '3': 697, 'A': 697, '4': 770, '5': 770, '6': 770, 'B': 770, '7': 852, '8': 852, '9': 852, 'C': 852, '*': 941, '0': 941, '#': 941, 'D': 941 };
    const colFreqs: Record<string, number> = { '1': 1209, '2': 1336, '3': 1477, 'A': 1633, '4': 1209, '5': 1336, '6': 1477, 'B': 1633, '7': 1209, '8': 1336, '9': 1477, 'C': 1633, '*': 1209, '0': 1336, '#': 1477, 'D': 1633 };

    const f1 = rowFreqs[key];
    const f2 = colFreqs[key];
    if (!f1 || !f2) return;

    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.frequency.value = f1;
      osc2.frequency.value = f2;
      osc1.type = 'sine';
      osc2.type = 'sine';

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();

      osc1.stop(this.ctx.currentTime + 0.15);
      osc2.stop(this.ctx.currentTime + 0.15);
    } catch (e) {
      console.warn('Web Audio playback error:', e);
    }
  }

  playRingback() {
    this.init();
    if (!this.ctx) return;
    this.stop();

    const playPulse = () => {
      if (!this.ctx || this.ctx.state === 'suspended') return;
      try {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;
        osc1.type = 'sine';
        osc2.type = 'sine';

        gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        
        osc1.stop(this.ctx.currentTime + 2.0);
        osc2.stop(this.ctx.currentTime + 2.0);
      } catch (e) {
        console.warn('Web Audio playback error:', e);
      }
    };

    playPulse();
    this.ringtoneInterval = setInterval(playPulse, 4000);
  }

  playRingtone() {
    this.init();
    if (!this.ctx) return;
    this.stop();

    const playRing = () => {
      if (!this.ctx || this.ctx.state === 'suspended') return;
      try {
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.frequency.value = 453;
        osc2.frequency.value = 440;
        gain.gain.setValueAtTime(0.0, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 0.1);
        gain.gain.linearRampToValueAtTime(0.04, this.ctx.currentTime + 0.8);
        gain.gain.linearRampToValueAtTime(0.0, this.ctx.currentTime + 1.0);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        
        osc1.stop(this.ctx.currentTime + 1.0);
        osc2.stop(this.ctx.currentTime + 1.0);
      } catch (e) {
        console.warn('Web Audio playback error:', e);
      }
    };

    playRing();
    this.ringtoneInterval = setInterval(playRing, 2000);
  }

  stop() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

export interface TwilioConfig {
  isEnabled: boolean;
  isDemoMode: boolean;
  accountSid: string;
  authToken: string;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
  callerId: string;
}

export type CallState = 'idle' | 'ringing' | 'connecting' | 'active' | 'held' | 'ended';

interface TwilioVoiceContextType {
  twilioConfig: TwilioConfig;
  setTwilioConfig: (config: TwilioConfig) => void;
  isDemoMode: boolean;
  registrationState: 'registered' | 'unregistered' | 'connecting' | 'error';
  callState: CallState;
  callDuration: number;
  isMuted: boolean;
  isHeld: boolean;
  phoneNumber: string;
  callerName: string;
  direction: 'incoming' | 'outgoing' | null;
  makeCall: (number: string) => void;
  answerCall: () => void;
  declineCall: () => void;
  hangUp: () => void;
  toggleMute: () => void;
  toggleHold: () => void;
  playDtmfTone: (key: string) => void;
  simulateIncomingCall: (number?: string, name?: string) => void;
}

const TwilioVoiceContext = createContext<TwilioVoiceContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'letschat_twilio_config';

const defaultTwilioConfig: TwilioConfig = {
  isEnabled: true,
  isDemoMode: true,
  accountSid: '',
  authToken: '',
  apiKeySid: '',
  apiKeySecret: '',
  twimlAppSid: '',
  callerId: '',
};

export const TwilioVoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [twilioConfig, setTwilioConfigState] = useState<TwilioConfig>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultTwilioConfig;
  });

  const [registrationState, setRegistrationState] = useState<'registered' | 'unregistered' | 'connecting' | 'error'>('unregistered');
  const [callState, setCallState] = useState<CallState>('idle');
  const [callDuration, setCallDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callerName, setCallerName] = useState('');
  const [direction, setDirection] = useState<'incoming' | 'outgoing' | null>(null);

  const audioSynthRef = useRef<AudioSynth | null>(null);
  const durationIntervalRef = useRef<any>(null);
  const simCallTimeoutRef = useRef<any>(null);

  // Twilio SDK references
  const deviceRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);

  useEffect(() => {
    audioSynthRef.current = new AudioSynth();
    return () => {
      if (audioSynthRef.current) {
        audioSynthRef.current.stop();
      }
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (simCallTimeoutRef.current) clearTimeout(simCallTimeoutRef.current);
      cleanupDevice();
    };
  }, []);

  const saveTwilioConfig = (newConfig: TwilioConfig) => {
    setTwilioConfigState(newConfig);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newConfig));
  };

  const cleanupDevice = () => {
    if (deviceRef.current) {
      try {
        deviceRef.current.destroy();
      } catch (e) {
        console.warn('Error destroying Twilio Device:', e);
      }
      deviceRef.current = null;
    }
    activeCallRef.current = null;
  };

  const handleCallEnded = () => {
    setCallState('idle');
    setDirection(null);
    setPhoneNumber('');
    setCallerName('');
    setIsMuted(false);
    setIsHeld(false);
    setCallDuration(0);
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
    if (audioSynthRef.current) {
      audioSynthRef.current.stop();
    }
    activeCallRef.current = null;
  };

  const startDurationTimer = () => {
    if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    setCallDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const playDtmfTone = (key: string) => {
    if (audioSynthRef.current) {
      audioSynthRef.current.playDtmf(key);
    }
    // If live call, send DTMF via Twilio Connection
    if (!twilioConfig.isDemoMode && activeCallRef.current && callState === 'active') {
      try {
        activeCallRef.current.sendDigits(key);
      } catch (e) {
        console.warn('Failed to send DTMF digits via Twilio Call:', e);
      }
    }
  };

  // Live Twilio Device Setup
  useEffect(() => {
    if (!twilioConfig.isEnabled) {
      setRegistrationState('unregistered');
      cleanupDevice();
      return;
    }

    if (twilioConfig.isDemoMode) {
      setRegistrationState('registered');
      cleanupDevice();
      return;
    }

    setRegistrationState('connecting');

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    // Dynamic import of Twilio Voice SDK
    import('@twilio/voice-sdk').then(async ({ Device }) => {
      try {
        cleanupDevice();

        // 1. Get access token from Express backend
        const tokenRes = await fetch(`${apiUrl}/api/voice/token?identity=priya`);
        const { token } = await tokenRes.json();

        if (!token) {
          throw new Error('No Twilio token received from server');
        }

        // 2. Initialize device
        const device = new Device(token, {
          codecPreferences: ['opus', 'pcmu'],
          fakeLocalAudio: false,
        });

        deviceRef.current = device;

        // Listen for device registration state changes
        device.on('registered', () => {
          setRegistrationState('registered');
        });

        device.on('error', (err: any) => {
          console.error('Twilio Device Error:', err);
          setRegistrationState('error');
        });

        device.on('unregistered', () => {
          setRegistrationState('unregistered');
        });

        // Listen for incoming calls
        device.on('incoming', (call: any) => {
          if (callState !== 'idle') {
            call.reject();
            return;
          }

          activeCallRef.current = call;
          setDirection('incoming');
          setPhoneNumber(call.parameters.From || 'Unknown Caller');
          setCallerName(call.parameters.FromDisplayName || 'Incoming Call');
          setCallState('ringing');

          if (audioSynthRef.current) {
            audioSynthRef.current.playRingtone();
          }

          call.on('disconnect', () => {
            handleCallEnded();
          });

          call.on('cancel', () => {
            handleCallEnded();
          });
        });

        // Register the device
        await device.register();

      } catch (err) {
        console.error('Twilio Voice Device Setup Failed:', err);
        setRegistrationState('error');
      }
    }).catch(err => {
      console.error('Failed to dynamically load @twilio/voice-sdk:', err);
      setRegistrationState('error');
    });

    return () => {
      cleanupDevice();
    };
  }, [twilioConfig.isEnabled, twilioConfig.isDemoMode, twilioConfig.accountSid, twilioConfig.apiKeySid]);

  // Actions
  const makeCall = (target: string) => {
    if (callState !== 'idle') return;

    const cleanTarget = target.trim();
    setPhoneNumber(cleanTarget);
    setCallerName(cleanTarget);
    setDirection('outgoing');
    setCallState('connecting');

    if (twilioConfig.isDemoMode) {
      if (audioSynthRef.current) {
        audioSynthRef.current.playRingback();
      }

      simCallTimeoutRef.current = setTimeout(() => {
        setCallState('ringing');
        
        simCallTimeoutRef.current = setTimeout(() => {
          if (audioSynthRef.current) audioSynthRef.current.stop();
          setCallState('active');
          startDurationTimer();
        }, 2000);

      }, 1500);
    } else {
      // Real Twilio outgoing call
      if (!deviceRef.current) {
        console.error('Twilio Voice Device is not initialized');
        setCallState('idle');
        return;
      }

      try {
        deviceRef.current.connect({ params: { To: cleanTarget } }).then((call: any) => {
          activeCallRef.current = call;

          call.on('accept', () => {
            setCallState('active');
            startDurationTimer();
          });

          call.on('disconnect', () => {
            handleCallEnded();
          });

          call.on('error', (err: any) => {
            console.error('Twilio Outbound Call Error:', err);
            handleCallEnded();
          });
        }).catch((err: any) => {
          console.error('Failed to initiate Twilio connection:', err);
          handleCallEnded();
        });
      } catch (err) {
        console.error('Twilio dial exception:', err);
        handleCallEnded();
      }
    }
  };

  const answerCall = () => {
    if (callState !== 'ringing' || !direction) return;

    if (audioSynthRef.current) {
      audioSynthRef.current.stop();
    }

    if (twilioConfig.isDemoMode) {
      setCallState('active');
      startDurationTimer();
    } else {
      if (activeCallRef.current) {
        activeCallRef.current.accept();
        setCallState('active');
        startDurationTimer();
      }
    }
  };

  const declineCall = () => {
    if (callState !== 'ringing') return;

    if (twilioConfig.isDemoMode) {
      handleCallEnded();
    } else {
      if (activeCallRef.current) {
        try {
          activeCallRef.current.reject();
        } catch (e) {}
      }
      handleCallEnded();
    }
  };

  const hangUp = () => {
    if (callState === 'idle') return;

    if (twilioConfig.isDemoMode) {
      handleCallEnded();
    } else {
      if (activeCallRef.current) {
        try {
          activeCallRef.current.disconnect();
        } catch (e) {}
      }
      handleCallEnded();
    }
  };

  const toggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);

    if (!twilioConfig.isDemoMode && activeCallRef.current) {
      try {
        activeCallRef.current.mute(nextState);
      } catch (e) {
        console.warn('Failed to mute Twilio Call:', e);
      }
    }
  };

  const toggleHold = () => {
    const nextState = !isHeld;
    setIsHeld(nextState);
    setCallState(nextState ? 'held' : 'active');

    // Note: Twilio voice-sdk doesn't have a direct .hold() method on Connection/Call object.
    // It requires sending a request to Twilio API to update the call session.
    // For local client experience, we toggle local state.
  };

  const simulateIncomingCall = (num?: string, name?: string) => {
    if (callState !== 'idle') return;

    if (simCallTimeoutRef.current) clearTimeout(simCallTimeoutRef.current);

    const mockNum = num || `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`;
    const mockName = name || ['Ananya Iyer', 'Rahul Sharma', 'Vikram Patel', 'Sneha Gupta', 'Siddharth Roy'][Math.floor(Math.random() * 5)];

    setPhoneNumber(mockNum);
    setCallerName(mockName);
    setDirection('incoming');
    setCallState('ringing');

    if (audioSynthRef.current) {
      audioSynthRef.current.playRingtone();
    }
  };

  return (
    <TwilioVoiceContext.Provider value={{
      twilioConfig,
      setTwilioConfig: saveTwilioConfig,
      isDemoMode: twilioConfig.isDemoMode,
      registrationState,
      callState,
      callDuration,
      isMuted,
      isHeld,
      phoneNumber,
      callerName,
      direction,
      makeCall,
      answerCall,
      declineCall,
      hangUp,
      toggleMute,
      toggleHold,
      playDtmfTone,
      simulateIncomingCall
    }}>
      {children}
    </TwilioVoiceContext.Provider>
  );
};

export const useTwilioVoice = () => {
  const context = useContext(TwilioVoiceContext);
  if (context === undefined) {
    throw new Error('useTwilioVoice must be used within a TwilioVoiceProvider');
  }
  return context;
};
