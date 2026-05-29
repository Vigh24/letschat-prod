import { useState, useEffect } from 'react';
import { Phone, PhoneOff, PhoneCall, VolumeX, Play, Pause, Delete, Grid, ChevronDown, RefreshCw } from 'lucide-react';
import { useTwilioVoice } from '../hooks/useTwilioVoice';

export function Softphone({ activeView }: { activeView?: string }) {
  const {
    twilioConfig,
    isDemoMode,
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
    simulateIncomingCall,
  } = useTwilioVoice();

  const [isOpen, setIsOpen] = useState(false);
  const [dialInput, setDialInput] = useState('');
  const [showDtmfOverlay, setShowDtmfOverlay] = useState(false);

  // Automatically open the dialer on incoming calls
  useEffect(() => {
    if (callState === 'ringing' && direction === 'incoming') {
      setIsOpen(true);
    }
  }, [callState, direction]);

  // Close the dialer if the user navigates away from workspace pages while idle
  useEffect(() => {
    if (callState === 'idle' && activeView && activeView !== 'inbox' && activeView !== 'tickets') {
      setIsOpen(false);
    }
  }, [activeView, callState]);

  if (!twilioConfig.isEnabled) {
    return null;
  }

  const handleDialClick = (val: string) => {
    if (callState === 'active') {
      playDtmfTone(val);
    } else {
      setDialInput(prev => prev + val);
      playDtmfTone(val);
    }
  };

  const handleBackspace = () => {
    setDialInput(prev => prev.slice(0, -1));
  };

  const handleCall = () => {
    if (!dialInput.trim()) return;
    makeCall(dialInput);
  };

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper for registration state indicators
  const getRegStatusDetails = () => {
    switch (registrationState) {
      case 'registered':
        return { label: 'Online', color: 'bg-emerald-500 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' };
      case 'connecting':
        return { label: 'Connecting', color: 'bg-amber-500 border-amber-500/20 text-amber-700 dark:text-amber-400 animate-pulse' };
      case 'error':
        return { label: 'Error', color: 'bg-rose-500 border-rose-500/20 text-red-650 dark:text-red-400' };
      default:
        return { label: 'Offline', color: 'bg-zinc-400 dark:bg-zinc-650 border-white/[0.04] text-zinc-500 dark:text-zinc-450' };
    }
  };

  const regStatus = getRegStatusDetails();

  const shouldShow = callState !== 'idle' || !activeView || activeView === 'inbox' || activeView === 'tickets';
  if (!shouldShow && !isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end select-none">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer ${
            callState === 'ringing' 
              ? 'bg-rose-600 animate-bounce shadow-rose-600/20' 
              : callState === 'active' 
                ? 'bg-emerald-600 animate-pulse shadow-emerald-600/20' 
                : 'gradient-accent shadow-emerald-500/20 border border-emerald-500/10'
          }`}
        >
          <Phone className={`h-6 w-6 ${callState === 'ringing' ? 'animate-wiggle' : ''}`} />
          {callState !== 'idle' && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 border-2 border-white dark:border-zinc-900 text-[9px] font-black uppercase text-white tracking-widest">
              !
            </span>
          )}
        </button>
      )}

      {/* Main Softphone Panel */}
      {isOpen && (
        <div className="theme-bg-secondary border theme-border rounded-2xl w-80 shadow-2xl p-5 overflow-hidden transition-all duration-300 animate-fade-in flex flex-col gap-4 theme-text-main">
          {/* Header */}
          <div className="flex items-center justify-between border-b theme-border pb-3">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${regStatus.color.split(' ')[0]}`} />
              <span className="text-[9px] font-black uppercase tracking-wider theme-text-muted">
                {isDemoMode ? 'SIMULATOR MODE' : `TWILIO: ${regStatus.label}`}
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 theme-text-muted hover:theme-text-secondary theme-bg-hover transition-all cursor-pointer"
                title="Minimize phone"
              >
                <ChevronDown className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Active Call UI */}
          {callState !== 'idle' ? (
            <div className="flex flex-col items-center py-4 gap-5 animate-slide-up">
              {/* Call Details */}
              <div className="flex flex-col items-center gap-2 text-center w-full">
                {/* Caller Avatar */}
                <div className={`h-16 w-16 rounded-full flex items-center justify-center font-bold text-xl uppercase border-2 shadow-inner transition-all duration-500 ${
                  callState === 'ringing' 
                    ? 'bg-rose-500/10 border-rose-500/20 text-red-650 dark:text-red-400 animate-pulse scale-105' 
                    : callState === 'held'
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-650 dark:text-emerald-400'
                }`}>
                  {callerName.charAt(0) || 'C'}
                </div>

                <div className="min-w-0 px-2 w-full">
                  <h4 className="text-sm font-bold truncate theme-text-main">{callerName}</h4>
                  <p className="text-[10px] theme-text-muted mt-0.5 font-mono">{phoneNumber}</p>
                </div>

                {/* Call Status / Duration */}
                <div className="mt-1 flex items-center gap-1.5">
                  <span className={`text-[9px] font-bold tracking-widest uppercase ${
                    callState === 'ringing' ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {callState === 'ringing' ? `${direction === 'incoming' ? 'Incoming Call' : 'Ringing'}` : callState.toUpperCase()}
                  </span>
                  {callState === 'active' && (
                    <span className="text-[9px] theme-text-secondary font-bold font-mono bg-zinc-100 dark:bg-white/[0.04] px-1.5 py-0.5 rounded border theme-border">
                      {formatDuration(callDuration)}
                    </span>
                  )}
                </div>
              </div>

              {/* Dynamic Audio Waves Visualizer (Active Call) */}
              {callState === 'active' && !isHeld && (
                <div className="flex items-center gap-1.5 h-6">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="w-1 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-wave-bar"
                      style={{
                        height: '100%',
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: `${0.6 + Math.random() * 0.4}s`
                      }}
                    />
                  ))}
                </div>
              )}

              {/* DTMF Keypad Overlay during Call */}
              {showDtmfOverlay && callState === 'active' && (
                <div className="grid grid-cols-3 gap-x-6 gap-y-3 p-3 border rounded-2xl animate-fade-in w-full max-w-[200px] dialer-input">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(val => (
                    <button
                      key={val}
                      onClick={() => handleDialClick(val)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl active:scale-95 transition-all text-xs font-bold font-mono cursor-pointer dialer-btn border"
                    >
                      {val}
                    </button>
                  ))}
                </div>
              )}

              {/* Calling Controls */}
              <div className="flex flex-col gap-4 w-full">
                {/* Actions Grid */}
                {callState === 'active' && (
                  <div className="flex justify-center items-center gap-6">
                    {/* Mute Button */}
                    <button
                      onClick={toggleMute}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isMuted 
                          ? 'bg-rose-500/10 border-rose-500/20 text-red-650 dark:text-red-400' 
                          : 'bg-zinc-50 dark:bg-white/[0.01] border theme-border theme-text-secondary hover:bg-zinc-100 dark:hover:bg-white/[0.04]'
                      }`}
                      title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                    >
                      <VolumeX className="h-4.5 w-4.5" />
                    </button>

                    {/* Hold Button */}
                    <button
                      onClick={toggleHold}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 cursor-pointer ${
                        isHeld 
                          ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-400' 
                          : 'bg-zinc-50 dark:bg-white/[0.01] border theme-border theme-text-secondary hover:bg-zinc-100 dark:hover:bg-white/[0.04]'
                      }`}
                      title={isHeld ? 'Resume call' : 'Hold call'}
                    >
                      {isHeld ? <Play className="h-4.5 w-4.5 fill-current" /> : <Pause className="h-4.5 w-4.5" />}
                    </button>

                    {/* DTMF Toggle */}
                    <button
                      onClick={() => setShowDtmfOverlay(!showDtmfOverlay)}
                      className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all duration-300 cursor-pointer ${
                        showDtmfOverlay 
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-zinc-50 dark:bg-white/[0.01] border theme-border theme-text-secondary hover:bg-zinc-100 dark:hover:bg-white/[0.04]'
                      }`}
                      title="Keypad"
                    >
                      <Grid className="h-4.5 w-4.5" />
                    </button>
                  </div>
                )}

                {/* Primary End / Answer Buttons */}
                <div className="flex gap-4 justify-center w-full">
                  {callState === 'ringing' && direction === 'incoming' ? (
                    <>
                      {/* Decline */}
                      <button
                        onClick={declineCall}
                        className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/15 border border-rose-500/10 cursor-pointer"
                      >
                        <PhoneOff className="h-4 w-4" /> Decline
                      </button>

                      {/* Answer */}
                      <button
                        onClick={answerCall}
                        className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/15 border border-emerald-500/10 cursor-pointer"
                      >
                        <PhoneCall className="h-4 w-4 animate-wiggle" /> Answer
                      </button>
                    </>
                  ) : (
                    /* Hang Up */
                    <button
                      onClick={hangUp}
                      className="w-full flex h-11 items-center justify-center gap-1.5 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/15 border border-rose-500/10 cursor-pointer"
                    >
                      <PhoneOff className="h-4 w-4" /> Hang Up
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Dialer View */
            <div className="flex flex-col gap-4 animate-slide-in">
              {/* Dial Input Field */}
              <div className="relative flex items-center border rounded-2xl px-4 py-2 dialer-input">
                <input
                  type="text"
                  value={dialInput}
                  onChange={e => setDialInput(e.target.value)}
                  placeholder="Enter customer number..."
                  className="w-full bg-transparent text-sm placeholder:theme-text-muted font-mono focus:outline-none pr-8 select-text"
                  autoFocus
                />
                {dialInput && (
                  <button
                    onClick={handleBackspace}
                    className="absolute right-3.5 p-1 theme-text-muted hover:theme-text-secondary transition-all cursor-pointer"
                    title="Backspace"
                  >
                    <Delete className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Dialer Grid */}
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => handleDialClick(val)}
                    className="h-12 flex flex-col items-center justify-center rounded-2xl active:scale-95 transition-all border cursor-pointer dialer-btn"
                  >
                    <span className="text-sm font-bold font-mono">{val}</span>
                    <span className="text-[7px] uppercase tracking-wider mt-0.5 font-semibold dialer-btn-letters">
                      {val === '2' ? 'abc' : val === '3' ? 'def' : val === '4' ? 'ghi' : val === '5' ? 'jkl' : val === '6' ? 'mno' : val === '7' ? 'pqrs' : val === '8' ? 'tuv' : val === '9' ? 'wxyz' : val === '0' ? '+' : '\u00A0'}
                    </span>
                  </button>
                ))}
              </div>

              {/* Call Initiation Action */}
              <button
                onClick={handleCall}
                disabled={!dialInput.trim()}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-2xl text-white font-bold transition-all shadow-lg border border-emerald-500/10 cursor-pointer gradient-accent hover:opacity-95 shadow-emerald-500/15 disabled:opacity-30 disabled:cursor-not-allowed shadow-none"
              >
                <Phone className="h-4.5 w-4.5" /> Call Customer
              </button>

              {/* Quick Demo Simulator trigger */}
              {isDemoMode && (
                <div className="border-t theme-border pt-3.5 flex flex-col gap-2">
                  <p className="text-[9px] theme-text-muted text-center uppercase tracking-wider font-bold">Simulator Controls</p>
                  <button
                    type="button"
                    onClick={() => simulateIncomingCall()}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/15 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-650 dark:text-rose-450 hover:bg-rose-500/10 transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> Trigger Simulated Customer Call
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
