'use client';

import React from 'react';
import { 
  Download, Shield, Settings, Gamepad2, ArrowRight, Star, CheckCircle,
  Users, Clock, Zap, Server, Cpu, HardDrive
} from 'lucide-react';

const DownloadTab: React.FC = () => {
  const serverName = process.env.NEXT_PUBLIC_SERVER_NAME || 'MapleStory';
  const downloadUrl = process.env.NEXT_PUBLIC_DOWNLOAD_URL || '#';

  const downloadSteps = [
    { step: 1, title: 'Download Client', description: `Download the ${serverName} game client`, icon: Download },
    { step: 2, title: 'Extract Files', description: 'Extract to your desired location', icon: Shield },
    { step: 3, title: 'Run Setup', description: `Run ${serverName}.exe as administrator`, icon: Settings },
    { step: 4, title: 'Start Playing!', description: 'Launch and login with your account', icon: Gamepad2 }
  ];

  return (
    <div className="space-y-8">
      {/* Main Download Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 rounded-3xl p-12 shadow-2xl">
        {/* Animated Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl animate-pulse delay-500" />
        </div>
        
        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-3xl mb-6 animate-bounce">
            <Download className="w-12 h-12 text-white" />
          </div>
          
          <h1 className="text-5xl font-black text-white mb-4">
            {serverName} Client v83
          </h1>
          
          <div className="flex items-center justify-center gap-8 mb-8 text-white/90">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5" />
              <span className="font-semibold">1.2GB</span>
            </div>
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              <span className="font-semibold">Windows 7+</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">Fast Download</span>
            </div>
          </div>
          
          <button 
            onClick={() => {
              if (downloadUrl && downloadUrl !== '#') {
                window.open(downloadUrl, '_blank');
              } else {
                alert('Download URL not configured. Please set NEXT_PUBLIC_DOWNLOAD_URL in your .env.local file.');
              }
            }}
            className="group relative px-12 py-5 bg-white text-orange-600 rounded-2xl font-black text-lg hover:bg-orange-50 transition-all transform hover:scale-105 shadow-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400/0 via-orange-400/30 to-orange-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <div className="relative flex items-center gap-3">
              <Download className="w-6 h-6 group-hover:animate-bounce" />
              DOWNLOAD NOW
              <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
            </div>
          </button>
          
          <p className="text-white/80 text-sm mt-4 font-medium">
            Free Forever • No Hidden Fees • Instant Access
          </p>
        </div>
      </div>

      {/* Quick Installation Steps */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {downloadSteps.map((step, index) => (
          <div key={step.step} className="group relative">
            {/* Connector Line */}
            {index < downloadSteps.length - 1 && (
              <div className="hidden md:block absolute top-12 left-[60%] w-full h-0.5 bg-gradient-to-r from-orange-300 to-transparent" />
            )}
            
            <div className="relative bg-white rounded-2xl p-6 border-2 border-orange-100 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {step.step}
                  </div>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* System Requirements Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Minimum Specs */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gray-500 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Minimum Requirements</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { icon: Server, label: 'OS', value: 'Windows 7 or higher' },
              { icon: Cpu, label: 'CPU', value: 'Intel Core 2 Duo' },
              { icon: HardDrive, label: 'RAM', value: '2GB' },
              { icon: HardDrive, label: 'Storage', value: '2GB free space' }
            ].map((spec, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-xl">
                <spec.icon className="w-5 h-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">{spec.label}:</span>
                <span className="text-sm text-gray-800">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommended Specs */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 border border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Star className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Recommended</h3>
          </div>
          
          <div className="space-y-3">
            {[
              { icon: Server, label: 'OS', value: 'Windows 10/11' },
              { icon: Cpu, label: 'CPU', value: 'Intel i3 or better' },
              { icon: HardDrive, label: 'RAM', value: '4GB or more' },
              { icon: HardDrive, label: 'Storage', value: '4GB free space' }
            ].map((spec, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-white/70 rounded-xl">
                <spec.icon className="w-5 h-5 text-orange-500" />
                <span className="text-sm font-medium text-gray-600">{spec.label}:</span>
                <span className="text-sm text-gray-800 font-semibold">{spec.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-400 rounded-2xl p-8">
        <div className="absolute inset-0 bg-black/5" />
        <div className="relative z-10 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Ready for Adventure?</h3>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span className="font-semibold">10,000+ Active Players</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              <span className="font-semibold">Anti-Cheat Protected</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className="font-semibold">24/7 Online</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">Low Latency</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadTab;