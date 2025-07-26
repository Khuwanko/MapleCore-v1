// src/components/MapleCoreLanding.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { serverAPI, discordAPI } from '@/services/api';
import { ChevronLeft, Sparkles, Users, Trophy, Target, Download, Menu, X, Ghost, Sword, Shield, Crown, Zap, Gift, ChevronRight, Globe, MessageCircle, Youtube, ArrowRight, TrendingUp, Swords, Activity, Volume2, VolumeX, Play, Pause } from 'lucide-react';

const MapleCoreLanding = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentStat, setCurrentStat] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [discordData, setDiscordData] = useState({
    online: 0,
    members: 0,
    loading: true,
    fallback: false
  });
  const [mouseTrail, setMouseTrail] = useState<Array<{x: number, y: number, id: number}>>([]);
  const trailIdRef = useRef(0);
  
  // Music controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.25); // Default 25% volume
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Get server name from environment variable
  const serverName = process.env.NEXT_PUBLIC_SERVER_NAME || 'MapleServer';
  const isMaplePrefix = serverName.toLowerCase().startsWith('maple');
  const mapleText = isMaplePrefix ? serverName.slice(0, 5) : '';
  const restText = isMaplePrefix ? serverName.slice(5) : serverName;

  // Generate particle data once
  const [particles] = useState(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 20 + 20,
      delay: Math.random() * 20
    }))
  );

  // Generate leaf data once to avoid hydration mismatch
  const [leafData] = useState(() => 
    Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: 0, // No delay - start immediately
      duration: 20 + Math.random() * 15,
      scale: 0.3 + Math.random() * 0.5,
      swayDuration: 3 + Math.random() * 2,
      leafType: (i % 4) + 1,
      startOffset: Math.random() * 100 // Random starting position in animation
    }))
  );

  // Music control functions
  const initializeAudio = () => {
    if (typeof window !== 'undefined' && !audioRef.current) {
      audioRef.current = new Audio('/assets/bgm.mp3');
      audioRef.current.loop = true;
      audioRef.current.volume = volume;
      
      // Try to auto-play immediately
      audioRef.current.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        // If autoplay fails, wait for user interaction
        const startMusic = () => {
          if (audioRef.current && !isPlaying) {
            audioRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(console.error);
          }
          document.removeEventListener('click', startMusic);
          document.removeEventListener('keydown', startMusic);
          document.removeEventListener('touchstart', startMusic);
        };
        
        document.addEventListener('click', startMusic);
        document.addEventListener('keydown', startMusic);
        document.addEventListener('touchstart', startMusic);
      });
    }
  };

  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // Mouse trail effect
  useEffect(() => {
    if (!mounted) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newTrailPoint = {
        x: e.clientX,
        y: e.clientY,
        id: trailIdRef.current++
      };

      setMouseTrail(prev => {
        const newTrail = [...prev, newTrailPoint];
        // Keep only last 5 trail points
        if (newTrail.length > 5) {
          return newTrail.slice(-5);
        }
        return newTrail;
      });

      // Remove trail point after animation
      setTimeout(() => {
        setMouseTrail(prev => prev.filter(point => point.id !== newTrailPoint.id));
      }, 1000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mounted]);

  useEffect(() => {
    setMounted(true);
    initializeAudio();
    
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    const statInterval = setInterval(() => {
      setCurrentStat((prev) => (prev + 1) % 2); // Changed to 2 since we removed one stat
    }, 3000);
    
    // Fetch Discord data
    const fetchDiscordData = async () => {
      try {
        const response = await discordAPI.getServerInfo();
        if (response.ok && response.data) {
          setDiscordData({
            online: response.data.online || 0,
            members: response.data.members || 0,
            loading: false,
            fallback: response.data.fallback || false
          });
        } else {
          // Fallback data if API fails
          setDiscordData({
            online: 127,
            members: 2847,
            loading: false,
            fallback: true
          });
        }
      } catch (error) {
        console.error('Failed to fetch Discord data:', error);
        // Set fallback data on error
        setDiscordData({
          online: 127,
          members: 2847,
          loading: false,
          fallback: true
        });
      }
    };

    fetchDiscordData();

    // Refresh data periodically
    const discordInterval = setInterval(fetchDiscordData, 60000); // Every minute

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(statInterval);
      clearInterval(discordInterval);
      
      // Cleanup audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

    // Auto-slide images
    useEffect(() => {
      const slideInterval = setInterval(() => {
        setCurrentImage((prev) => (prev + 1) % 5);
      }, 5000); // Change image every 5 seconds
        
      return () => clearInterval(slideInterval);
    }, []);

  // Updated stats without "Active Players"
  const stats = [
    { label: "Daily Events", value: "12+", icon: Trophy },
    { label: "Server Uptime", value: "99.9%", icon: TrendingUp }
  ];

  const features = [
    {
      icon: Swords,
      title: "Classic v83",
      description: "Pure nostalgic MapleStory experience",
      gradient: "from-orange-600 to-amber-600",
      image: "/features/classic.png"
    },
    {
      icon: Zap,
      title: "Zero Lag",
      description: "Premium servers with 10Gbps connection",
      gradient: "from-orange-500 to-amber-500",
      image: "/features/speed.png"
    },
    {
      icon: Gift,
      title: "Daily Events",
      description: "Original events and login rewards",
      gradient: "from-amber-600 to-orange-600",
      image: "/features/events.png"
    },
    {
      icon: Shield,
      title: "Secure & Fair",
      description: "Advanced anti-cheat protection",
      gradient: "from-amber-500 to-orange-500",
      image: "/features/secure.png"
    }
  ];

  const classes = [
    { 
      name: "Warrior", 
      image: "/classes/warrior.png", 
      color: "from-red-500 to-red-600",
      bgGradient: "from-red-100 to-red-50",
      description: "Master of close combat",
      stats: { HP: "High", MP: "Low", Damage: "High" }
    },
    { 
      name: "Magician", 
      image: "/classes/magician.png", 
      color: "from-purple-500 to-purple-600",
      bgGradient: "from-purple-100 to-purple-50",
      description: "Wielder of magical powers",
      stats: { HP: "Low", MP: "High", Damage: "High" }
    },
    { 
      name: "Archer", 
      image: "/classes/archer.png", 
      color: "from-green-500 to-green-600",
      bgGradient: "from-green-100 to-green-50",
      description: "Long-range precision",
      stats: { HP: "Medium", MP: "Medium", Damage: "Medium" }
    },
    { 
      name: "Thief", 
      image: "/classes/thief.png", 
      color: "from-gray-600 to-gray-700",
      bgGradient: "from-gray-100 to-gray-50",
      description: "Swift and deadly",
      stats: { HP: "Low", MP: "Low", Damage: "Very High" }
    }
  ];

    const [classParticles] = useState(() => 
    classes.map(() => 
      Array.from({ length: 6 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        delay: i * 0.5,
        duration: 3 + Math.random() * 2
      }))
    )
  )
  
  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Music Controls - Fixed Position Bottom Left with Volume Control */}
      {mounted && (
        <div className="fixed bottom-6 left-6 z-50 flex gap-2">
          <div className="relative">
            <button
              onClick={togglePlayPause}
              className="group w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 flex items-center justify-center hover:bg-white hover:shadow-xl transition-all duration-300"
              title={isPlaying ? 'Pause Music' : 'Play Music'}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
              ) : (
                <Play className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
              )}
            </button>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              onMouseEnter={() => setShowVolumeSlider(true)}
              className="group w-12 h-12 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 flex items-center justify-center hover:bg-white hover:shadow-xl transition-all duration-300"
              title={isMuted ? 'Unmute' : `Volume: ${Math.round(volume * 100)}%`}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-red-500 group-hover:scale-110 transition-transform" />
              ) : (
                <Volume2 className="w-5 h-5 text-orange-600 group-hover:scale-110 transition-transform" />
              )}
            </button>
            
            {/* Volume Slider */}
            {showVolumeSlider && (
              <div 
                className="absolute bottom-full mb-2 left-0 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200/50 p-4"
                onMouseLeave={() => setShowVolumeSlider(false)}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-gray-600">Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-24 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    style={{
                      background: `linear-gradient(to right, rgb(251 146 60) 0%, rgb(251 146 60) ${volume * 100}%, rgb(229 231 235) ${volume * 100}%, rgb(229 231 235) 100%)`
                    }}
                  />
                  <span className="text-xs font-bold text-orange-600">{Math.round(volume * 100)}%</span>
                  
                  {/* Mute Button */}
                  <button
                    onClick={toggleMute}
                    className="mt-2 px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-medium text-gray-700 transition-colors"
                  >
                    {isMuted ? 'Unmute' : 'Mute'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mouse Trail Effect */}
      {mounted && mouseTrail.map((point) => (
        <div
          key={point.id}
          className="fixed pointer-events-none z-50 animate-trail-fade"
          style={{
            left: point.x - 10,
            top: point.y - 10,
            transform: 'translate(-50%, -50%)'
          }}
        >
          <Image
            src="/leafs/1.png"
            alt=""
            width={20}
            height={20}
            className="opacity-60"
            unoptimized={true}
          />
        </div>
      ))}

      {/* Enhanced Animated Background Particles */}
      {mounted && (
        <div className="fixed inset-0 pointer-events-none">
          {particles.map((particle) => (
            <div
              key={particle.id}
              className="absolute animate-float-particle"
              style={{
                left: `${particle.left}%`,
                top: `${particle.top}%`,
                width: `${particle.size}px`,
                height: `${particle.size}px`,
                animationDuration: `${particle.duration}s`,
                animationDelay: `${particle.delay}s`
              }}
            >
              <div className="w-full h-full bg-orange-400/30 rounded-full shadow-lg" />
            </div>
          ))}
        </div>
      )}

      {/* Enhanced Discord Widget */}
      <div className="fixed bottom-6 right-6 z-40 group">
        <a 
          href="https://discord.gg/XRTeuK9kwm" 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-5 transition-all duration-500 hover:scale-105 cursor-pointer border border-gray-100 hover:border-orange-200">
            <div className="flex items-center gap-4">
              <div className="relative">
                <svg className="w-10 h-10 text-orange-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
                </svg>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
              <div>
                <div className="font-bold text-lg text-gray-900 group-hover:text-orange-600 transition-colors">Join Discord</div>
                {discordData.loading ? (
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-300 rounded-full animate-pulse" />
                    Loading...
                  </div>
                ) : (
                  <div className="text-sm text-gray-600 font-medium">
                    <span className="text-green-500 font-bold">●</span> {discordData.online} online • {discordData.members.toLocaleString()} members
                  </div>
                )}
              </div>
            </div>
            
            {/* Enhanced glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/10 to-orange-300/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </div>
        </a>
        
        {/* Enhanced hover tooltip */}
        <div className="absolute bottom-full right-0 mb-3 w-72 bg-gray-900/95 backdrop-blur-md text-white text-sm rounded-xl p-4 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-2xl border border-gray-700">
          <div className="font-bold mb-2 text-orange-400">{serverName} Community</div>
          <div className="text-gray-300 leading-relaxed">Click to join our Discord server for events, updates, support, and connect with fellow Maplers!</div>
          <div className="absolute bottom-0 right-8 transform translate-y-1/2 rotate-45 w-3 h-3 bg-gray-900 border-r border-b border-gray-700"></div>
        </div>
      </div>

      {/* Enhanced Modern Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-2xl shadow-2xl border-b border-gray-100' 
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            {/* Enhanced Left Side - Logo/Brand (Same as UserDashboard) */}
            <div className="flex items-center">
              <a href="/" className="group relative flex items-center gap-3 cursor-pointer">
                {/* Logo Icon */}
                <div className="relative">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-orange-500 font-black text-sm">
                        {serverName[0].toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-orange-400/30 rounded-xl blur-lg -z-10 group-hover:blur-xl transition-all duration-300" />
                </div>
                
                {/* Server Name */}
                <div className="relative">
                  <h1 className="text-xl font-black tracking-tight group-hover:scale-105 transition-transform duration-300">
                    {isMaplePrefix ? (
                      <>
                        <span className="text-gray-800">{mapleText}</span>
                        <span className="text-orange-500">{restText}</span>
                      </>
                    ) : (
                      <span className="text-orange-500">{serverName}</span>
                    )}
                  </h1>
                  <div className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-500" />
                </div>
              </a>
            </div>
            
            {/* Enhanced Center - Navigation Links */}
            <div className="hidden md:flex items-center space-x-1">
              {[
                { name: 'Home', href: '#home' },
                { name: 'Features', href: '#features' },
                { name: 'Classes', href: '#classes' },
                { name: 'Gallery', href: '#gallery' },
                { name: 'Community', href: '#community' }
              ].map((link) => (
                <a 
                  key={link.name}
                  href={link.href} 
                  className="group px-4 py-2 text-gray-700 hover:text-orange-500 font-bold transition-all duration-300 relative rounded-xl hover:bg-orange-50"
                >
                  {link.name}
                  <span className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-orange-500 group-hover:w-8 transition-all duration-300 rounded-full" />
                </a>
              ))}
            </div>
            
            {/* Enhanced Right Side - CTA Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <a 
                href="/auth" 
                className="group px-8 py-3 bg-orange-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 hover:bg-orange-600 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="relative z-10">Play Now</span>
              </a>
            </div>

            {/* Enhanced Mobile Menu Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="md:hidden p-3 rounded-xl hover:bg-gray-100 transition-all duration-300 border border-gray-200 hover:border-orange-300"
            >
              {isMenuOpen ? <X className="w-6 h-6 text-orange-500" /> : <Menu className="w-6 h-6 text-gray-700" />}
            </button>
          </div>
          
          {/* Enhanced Mobile Menu */}
          <div className={`md:hidden transition-all duration-500 overflow-hidden ${
            isMenuOpen ? 'max-h-96 opacity-100 pb-6' : 'max-h-0 opacity-0'
          }`}>
            <div className="py-4 space-y-2 bg-white/95 backdrop-blur-md rounded-2xl mt-4 shadow-xl border border-gray-100">
              {[
                { name: 'Home', href: '#home' },
                { name: 'Features', href: '#features' },
                { name: 'Classes', href: '#classes' },
                { name: 'Gallery', href: '#gallery' },
                { name: 'Community', href: '#community' }
              ].map((link) => (
                <a 
                  key={link.name}
                  href={link.href} 
                  className="block mx-4 px-4 py-3 text-gray-700 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-all font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.name}
                </a>
              ))}
              <div className="pt-4 border-t border-gray-200 mx-4">
                <a 
                  href="/auth" 
                  className="block py-3 bg-orange-500 text-white rounded-xl text-center font-bold shadow-lg hover:bg-orange-600 transition-all"
                >
                  Play Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section with Image Background */}
      <section id="home" className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden">
        {/* Enhanced Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/assets/test.jpg"
            alt="Background"
            fill
            className="object-cover object-center"
            priority
            quality={100}
            sizes="100vw"
          />
        </div>
        
        {/* Enhanced Overlays - Full Coverage */}
        <div className="absolute inset-0 z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-orange-600/70 via-orange-500/40 to-orange-500/40" />
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute inset-0 backdrop-blur-[2px]" />
        </div>

        {/* Enhanced Gradient Mesh Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute top-40 left-40 w-96 h-96 bg-yellow-300/20 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>

        {/* Enhanced Falling Maple Leaves Animation - Now in front */}
        {mounted && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-30">
            {leafData.map((leaf) => (
              <div
                key={leaf.id}
                className="absolute w-full h-full"
              >
                <div
                  className="absolute animate-fall"
                  style={{
                    left: `${leaf.left}%`,
                    animationDelay: `-${leaf.startOffset}s`,
                    animationDuration: `${leaf.duration}s`,
                  }}
                >
                  <div 
                    className="animate-sway"
                    style={{
                      transform: `scale(${leaf.scale})`,
                      animationDuration: `${leaf.swayDuration}s`
                    }}
                  >
                    <img
                      src={`/leafs/${leaf.leafType}.png`}
                      alt="Maple Leaf"
                      width={60}
                      height={60}
                      className="opacity-90 drop-shadow-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="max-w-7xl mx-auto text-center z-40 relative py-20">
          {/* Enhanced Logo Image */}
          <div className="mb-12 inline-block group">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-3xl blur-2xl transform group-hover:scale-110 transition-transform duration-500" />
              <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl max-w-md mx-auto">
                <Image 
                  src={`/assets/${serverName}.png`}
                  alt={serverName} 
                  width={300} 
                  height={150} 
                  className="object-contain drop-shadow-2xl transform group-hover:scale-105 transition-transform duration-500 w-full h-auto"
                  priority
                />
              </div>
            </div>
          </div>
          
          <p className="text-xl md:text-2xl lg:text-3xl text-white mb-12 max-w-3xl mx-auto font-bold drop-shadow-2xl leading-relaxed px-4">
            Experience the authentic MapleStory v83 classic server with 
            original gameplay, nostalgic features, and an amazing community.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20 px-4">
            <button className="group px-8 md:px-10 py-4 md:py-5 bg-white/95 backdrop-blur-sm text-orange-600 rounded-2xl font-bold hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 shadow-xl border-2 border-white/50 hover:bg-white">
              <Download className="w-5 h-5 md:w-6 md:h-6 group-hover:animate-bounce" />
              Download Client
              <ArrowRight className="w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button className="group px-8 md:px-10 py-4 md:py-5 bg-orange-500/90 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-bold hover:bg-orange-600 hover:border-white/50 transition-all duration-300 flex items-center justify-center gap-3 shadow-xl transform hover:scale-105">
              <MessageCircle className="w-5 h-5 md:w-6 md:h-6 group-hover:animate-pulse" />
              Join Community
            </button>
          </div>

          {/* Enhanced Live Stats Carousel */}
          <div className="relative h-28 overflow-hidden px-4">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
                  currentStat === index ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
              >
                <div className="flex items-center gap-4 md:gap-6 bg-white/90 backdrop-blur-xl rounded-3xl px-6 md:px-10 py-4 md:py-6 shadow-2xl border border-white/50 transform hover:scale-105 transition-all duration-300">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="text-3xl md:text-4xl font-black text-gray-900 mb-1">{stat.value}</div>
                    <div className="text-gray-600 font-bold text-sm md:text-base">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section - Enhanced */}
      <section id="features" className="py-32 px-6 bg-gradient-to-b from-white via-orange-50/50 to-white overflow-visible">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-6xl md:text-7xl font-black text-gray-900 mb-6 drop-shadow-sm">
              Why Choose {serverName}
            </h2>
            <p className="text-2xl text-gray-600 max-w-3xl mx-auto font-medium">
              Experience the authentic classic v83 MapleStory server
            </p>
          </div>
          
          {/* Enhanced Features with Breaking Boundaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="group relative"
                style={{
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {/* Enhanced Feature Icon/Image - Breaking out */}
                <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20">
                  <div className={`w-28 h-28 bg-gradient-to-br ${feature.gradient} rounded-3xl flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl border-4 border-white`}>
                    <feature.icon className="w-14 h-14 text-white" />
                  </div>
                  {/* Enhanced glow effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-70 blur-3xl transition-opacity duration-500 scale-150`} />
                </div>
                
                {/* Enhanced Card */}
                <div className="relative mt-16 h-full">
                  <div className="relative h-full bg-white rounded-3xl shadow-xl overflow-hidden transition-all duration-500 group-hover:shadow-3xl group-hover:scale-[1.03] border border-gray-100">
                    {/* Enhanced Animated Background Glow */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-700`} />
                    
                    {/* Enhanced Main Content */}
                    <div className="relative p-8 pt-20 text-center">
                      {/* Enhanced Title */}
                      <h3 className="text-3xl font-black text-gray-900 mb-4 group-hover:text-orange-600 transition-colors">
                        {feature.title}
                      </h3>
                      
                      {/* Enhanced Description */}
                      <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                        {feature.description}
                      </p>
                      
                      {/* Enhanced Stats */}
                      <div className="mt-auto">
                        <div className={`text-4xl font-black bg-gradient-to-r ${feature.gradient} text-transparent bg-clip-text`}>
                          <span className="inline-block group-hover:animate-count-up">
                            {index === 0 ? '100%' : index === 1 ? '0ms' : index === 2 ? '10+' : '99.9%'}
                          </span>
                        </div>
                        <div className="text-gray-500 font-bold mt-1">
                          {index === 0 ? 'Classic Experience' : index === 1 ? 'Latency' : index === 2 ? 'Daily Events' : 'Uptime'}
                        </div>
                      </div>
                      
                      {/* Enhanced Learn more link */}
                      <div className="mt-8 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                        <button className={`px-6 py-3 bg-gradient-to-r ${feature.gradient} text-white rounded-2xl font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105`}>
                          Learn More →
                        </button>
                      </div>
                    </div>
                    
                    {/* Enhanced hover gradient at bottom */}
                    <div className={`absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
                  </div>
                  
                  {/* Enhanced Shadow */}
                  <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 w-3/4 h-12 bg-black/10 rounded-full blur-2xl group-hover:w-full group-hover:bg-black/20 transition-all duration-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Class Showcase - Ultra Enhanced */}
      <section id="classes" className="py-32 px-6 bg-gradient-to-b from-white to-orange-50/50 overflow-visible relative">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-300/20 rounded-full blur-3xl animate-pulse animation-delay-2000" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-24">
            <h2 className="text-6xl md:text-7xl font-black text-gray-900 mb-6 drop-shadow-sm">
              <span className="bg-gradient-to-r from-orange-600 to-purple-600 text-transparent bg-clip-text">
                Choose Your Destiny
              </span>
            </h2>
            <p className="text-2xl text-gray-600 font-medium">Forge your legend with unique powers and abilities</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {classes.map((job, index) => (
              <div 
                key={job.name} 
                className="group relative"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Floating Card Design */}
                <div className="relative h-[600px]">
                  <div className="relative h-full transform transition-all duration-700 group-hover:scale-105">
                    
                    {/* Card Background with Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${job.color} rounded-3xl opacity-10 group-hover:opacity-20 transition-opacity duration-500`} />
                    
                    {/* Main Card */}
                    <div className="relative h-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-gray-100 group-hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all duration-500">
                      
                      {/* Animated Background Pattern */}
                      <div className="absolute inset-0 opacity-5">
                        <div className={`absolute inset-0 bg-gradient-to-br ${job.color} transform rotate-45 scale-150`} />
                      </div>
                      
                      {/* Character Display Area */}
                      <div className="relative h-72 overflow-hidden">
                        {/* Dynamic Background for Character */}
                        <div className={`absolute inset-0 bg-gradient-to-b ${job.bgGradient}`} />
                        
                        {/* Animated Particles - Using pre-generated data */}
                        {mounted && (
                          <div className="absolute inset-0">
                            {classParticles[index].map((particle) => (
                              <div
                                key={particle.id}
                                className={`absolute w-2 h-2 bg-gradient-to-br ${job.color} rounded-full animate-float opacity-60`}
                                style={{
                                  left: `${particle.left}%`,
                                  top: `${particle.top}%`,
                                  animationDelay: `${particle.delay}s`,
                                  animationDuration: `${particle.duration}s`
                                }}
                              />
                            ))}
                          </div>
                        )}
                        
                        {/* Character Image with Effects */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="relative">
                            {/* Glow Effect Behind Character */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${job.color} blur-3xl opacity-0 group-hover:opacity-40 transition-opacity duration-700 scale-150`} />
                            
                            {/* Character */}
                            <Image
                              src={job.image}
                              alt={job.name}
                              width={220}
                              height={260}
                              className="relative z-10 object-contain transition-all duration-700 group-hover:scale-125 group-hover:-translate-y-4 drop-shadow-2xl"
                            />
                          </div>
                        </div>
                        
                        {/* Class Icon Badge */}
                        <div className="absolute top-4 right-4">
                          <div className={`w-16 h-16 bg-gradient-to-br ${job.color} rounded-2xl flex items-center justify-center shadow-xl transform rotate-12 group-hover:rotate-0 transition-all duration-500`}>
                            {job.name === 'Warrior' && <Sword className="w-8 h-8 text-white" />}
                            {job.name === 'Magician' && <Zap className="w-8 h-8 text-white" />}
                            {job.name === 'Archer' && <Shield className="w-8 h-8 text-white" />}
                            {job.name === 'Thief' && <Swords className="w-8 h-8 text-white" />}
                          </div>
                        </div>
                      </div>
                      
                      {/* Content Area */}
                      <div className="relative p-8">
                        {/* Class Name with Gradient */}
                        <h3 className={`font-black text-4xl mb-3 bg-gradient-to-r ${job.color} text-transparent bg-clip-text`}>
                          {job.name}
                        </h3>
                        
                        {/* Description */}
                        <p className="text-gray-600 mb-6 text-lg font-medium">
                          {job.description}
                        </p>
                        
                        {/* Stats with Progress Bars */}
                        <div className="space-y-4 mb-8">
                          {Object.entries(job.stats).map(([stat, value]) => {
                            const percentage = 
                              value === 'Very High' ? 95 :
                              value === 'High' ? 80 :
                              value === 'Medium' ? 50 :
                              20;
                            
                            return (
                              <div key={stat} className="relative">
                                <div className="flex justify-between mb-2">
                                  <span className="text-sm font-bold text-gray-700">{stat}</span>
                                  <span className={`text-sm font-black bg-gradient-to-r ${job.color} text-transparent bg-clip-text`}>
                                    {value}
                                  </span>
                                </div>
                                <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`absolute inset-y-0 left-0 bg-gradient-to-r ${job.color} rounded-full transition-all duration-1000 group-hover:animate-pulse`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Select Button */}
                        <button className={`w-full py-4 bg-gradient-to-r ${job.color} text-white rounded-2xl font-black text-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-2xl relative overflow-hidden group/btn`}>
                          <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                          <span className="relative z-10 flex items-center justify-center gap-3">
                            Choose {job.name}
                            <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-2 transition-transform" />
                          </span>
                        </button>
                      </div>
                      
                      {/* Bottom Accent Line */}
                      <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${job.color} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
                    </div>
                  </div>
                </div>
                
                {/* 3D Shadow Effect */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-4/5 h-16 bg-black/10 rounded-full blur-2xl group-hover:w-full group-hover:bg-black/20 transition-all duration-500" />
              </div>
            ))}
          </div>
          
          {/* Bottom Info */}
          <div className="text-center mt-20">
            <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-100 to-orange-100 rounded-full">
              <Sparkles className="w-5 h-5 text-orange-600" />
              <p className="text-gray-700 text-lg font-bold">
                Each class unlocks unique skills and playstyles at level 10, 30, 70, and 120!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section - Clean Slider */}
      <section id="gallery" className="py-32 px-6 bg-gradient-to-b from-white to-orange-50/50">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-4">
              In-Game Screenshots
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explore the beautiful world of {serverName}
            </p>
          </div>
          
          {/* Image Slider */}
          <div className="relative">
            {/* Main Slider Container */}
            <div className="relative h-[500px] rounded-3xl overflow-hidden shadow-2xl">
              {/* Images */}
              {[
                { id: 1, image: "/gallery/screenshot1.jpg", title: "Henesys Town" },
                { id: 2, image: "/gallery/screenshot2.jpg", title: "Boss Battle" },
                { id: 3, image: "/gallery/screenshot3.jpg", title: "Party Quest" },
                { id: 4, image: "/gallery/screenshot4.jpg", title: "Free Market" },
                { id: 5, image: "/gallery/screenshot5.jpg", title: "Guild Event" }
              ].map((item, index) => (
                <div
                  key={item.id}
                  className={`absolute inset-0 transition-opacity duration-1000 ${
                    currentImage === index ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover"
                    quality={95}
                  />
                  {/* Title Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-8">
                    <h3 className="text-3xl font-bold text-white">{item.title}</h3>
                  </div>
                </div>
              ))}
              
              {/* Navigation Arrows */}
              <button
                onClick={() => setCurrentImage((prev) => (prev - 1 + 5) % 5)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <button
                onClick={() => setCurrentImage((prev) => (prev + 1) % 5)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-all shadow-lg"
              >
                <ChevronRight className="w-6 h-6 text-gray-800" />
              </button>
            </div>
            
            {/* Thumbnail Navigation */}
            <div className="flex justify-center gap-4 mt-8">
              {[0, 1, 2, 3, 4].map((index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`relative w-24 h-16 rounded-lg overflow-hidden transition-all ${
                    currentImage === index 
                      ? 'ring-4 ring-orange-500 scale-110' 
                      : 'opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={`/gallery/screenshot${index + 1}.jpg`}
                    alt={`Thumbnail ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
            
            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {[0, 1, 2, 3, 4].map((index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentImage === index 
                      ? 'w-8 bg-orange-500' 
                      : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Enhanced CTA Section */}
      <section id="community" className="py-32 px-6 overflow-visible bg-gradient-to-b from-orange-50/50 to-white">
        <div className="max-w-5xl mx-auto text-center">
          {/* Enhanced floating decorative elements */}
          <div className="relative">
            <div className="absolute -top-24 left-1/2 transform -translate-x-1/2 z-10">
              <div className="w-40 h-40 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-full blur-3xl animate-pulse" />
            </div>
            
            <h2 className="text-6xl md:text-7xl font-black text-gray-900 mb-8 relative z-20 drop-shadow-sm">
              Ready to Start Your Journey?
            </h2>
            <p className="text-2xl text-gray-600 mb-20 relative z-20 font-medium max-w-3xl mx-auto leading-relaxed">
              Join thousands of players in the authentic MapleStory v83 classic experience.
            </p>
          </div>
          
          {/* Enhanced CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-10 justify-center items-center mb-24">
            {/* Enhanced Download Button */}
            <div className="relative group">
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-20">
                <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Download className="w-8 h-8 text-white" />
                </div>
              </div>
              
              <button className="mt-8 px-16 py-6 bg-orange-500 text-white rounded-3xl font-black shadow-2xl transform hover:scale-105 transition-all duration-300 text-xl flex items-center justify-center gap-4 hover:bg-orange-600 relative z-10 group">
                <span>Download Now</span>
                <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </button>
              
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-3/4 h-8 bg-orange-500/20 rounded-full blur-2xl group-hover:w-full transition-all duration-500" />
            </div>
            
            {/* Enhanced Setup Guide Button */}
            <div className="relative group">
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 z-20">
                <div className="w-16 h-16 bg-white border-4 border-orange-400 rounded-2xl flex items-center justify-center shadow-xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Globe className="w-8 h-8 text-orange-600" />
                </div>
              </div>
              
              <button className="mt-8 px-16 py-6 bg-white text-orange-600 border-4 border-orange-400 rounded-3xl font-black shadow-xl hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all duration-300 text-xl transform hover:scale-105 relative z-10">
                View Setup Guide
              </button>
              
              <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-3/4 h-8 bg-black/10 rounded-full blur-2xl group-hover:w-full group-hover:bg-orange-500/20 transition-all duration-500" />
            </div>
          </div>
          
          {/* Enhanced stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { value: "15K+", label: "Total Players", icon: Users },
              { value: "24/7", label: "Support", icon: MessageCircle },
              { value: "99.9%", label: "Uptime", icon: Activity },
              { value: "2025", label: "Established", icon: Crown }
            ].map((stat, index) => (
              <div key={index} className="relative group">
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-all duration-300 border-2 border-orange-200">
                    <stat.icon className="w-8 h-8 text-orange-600" />
                  </div>
                </div>
                
                <div className="pt-12 text-center">
                  <div className="text-4xl font-black text-gray-900 mb-2">{stat.value}</div>
                  <div className="text-gray-600 font-bold">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="bg-gray-900 text-white py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-16 mb-16">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                  <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-orange-500 font-black text-base">
                      {serverName[0].toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-2xl font-black">
                  {isMaplePrefix ? (
                    <>
                      <span className="text-white">{mapleText}</span>
                      <span className="text-orange-400">{restText}</span>
                    </>
                  ) : (
                    <span className="text-orange-400">{serverName}</span>
                  )}
                </div>
              </div>
              <p className="text-gray-400 text-lg leading-relaxed">
                The authentic MapleStory v83 classic experience with original gameplay and nostalgic features.
              </p>
            </div>
            
            <div>
              <h4 className="font-black text-xl mb-6 text-orange-400">Quick Links</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors font-medium text-lg">Features</a></li>
                <li><a href="#classes" className="hover:text-white transition-colors font-medium text-lg">Classes</a></li>
                <li><a href="#gallery" className="hover:text-white transition-colors font-medium text-lg">Gallery</a></li>
                <li><a href="#community" className="hover:text-white transition-colors font-medium text-lg">Community</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-black text-xl mb-6 text-orange-400">Community</h4>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors font-medium text-lg">Discord</a></li>
                <li><a href="#" className="hover:text-white transition-colors font-medium text-lg">Forum</a></li>
                <li><a href="#" className="hover:text-white transition-colors font-medium text-lg">Wiki</a></li>
                <li><a href="#" className="hover:text-white transition-colors font-medium text-lg">FAQ</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-black text-xl mb-6 text-orange-400">Connect</h4>
              <div className="flex gap-4 mb-6">
                <a href="#" className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-orange-500 transition-all duration-300 transform hover:scale-110">
                  <MessageCircle className="w-6 h-6" />
                </a>
                <a href="#" className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-orange-500 transition-all duration-300 transform hover:scale-110">
                  <Youtube className="w-6 h-6" />
                </a>
                <a href="#" className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-orange-500 transition-all duration-300 transform hover:scale-110">
                  <Globe className="w-6 h-6" />
                </a>
              </div>
              <p className="text-gray-400 text-sm">Follow us for updates and community events!</p>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p className="text-lg">© 2025 {serverName}. All rights reserved. | MapleStory is a trademark of Nexon.</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        @keyframes float-particle {
          0% { transform: translateY(0px) translateX(0px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-40px) translateX(20px); opacity: 0; }
        }
        @keyframes count-up {
          0% { transform: translateY(10px); opacity: 0; }
          50% { transform: translateY(-5px); }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes fall {
          from {
            transform: translateY(-150px) rotate(0deg);
          }
          to {
            transform: translateY(calc(100vh + 150px)) rotate(720deg);
          }
        }
        @keyframes sway {
          0%, 100% {
            transform: translateX(0px);
          }
          25% {
            transform: translateX(-50px);
          }
          75% {
            transform: translateX(50px);
          }
        }
        @keyframes trail-fade {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(0deg);
          }
          50% {
            opacity: 0.8;
            transform: scale(1) rotate(180deg);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) rotate(360deg);
          }
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-float-particle { animation: float-particle linear infinite; }
        .animate-count-up { animation: count-up 0.5s ease-out; }
        .animate-trail-fade { animation: trail-fade 1s ease-out forwards; }
        .animate-slide-in-right { animation: slide-in-right 0.5s ease-out; }
        .animate-fall { 
          animation: fall linear infinite;
          opacity: 0.8;
        }
        .animate-sway { 
          animation: sway ease-in-out infinite;
        }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-400 { animation-delay: 0.4s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        /* Custom range slider styles */
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: rgb(251 146 60);
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.2s;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        }
        
        input[type="range"]::-moz-range-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: rgb(251 146 60);
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          transition: all 0.2s;
          border: none;
        }
        
        input[type="range"]::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 3px 6px rgba(0,0,0,0.3);
        }
        
        input[type="range"]::-webkit-slider-runnable-track {
          appearance: none;
          height: 8px;
          border-radius: 4px;
          background: transparent;
        }
        
        input[type="range"]::-moz-range-track {
          appearance: none;
          height: 8px;
          border-radius: 4px;
          background: transparent;
        }
      `}</style>
    </div>
  );
};

export default MapleCoreLanding;