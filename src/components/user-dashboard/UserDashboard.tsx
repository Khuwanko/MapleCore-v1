// src/components/UserDashboard.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { dashboardAPI, voteAPI, announcementsAPI, adminAPI } from '@/services/api';
import { 
  RankingFilters, 
  RankingsResponse, 
  PaginationInfo, 
  JobCategory 
} from '@/types/api';
import { 
  Home, Users, Trophy, LogOut, ChevronRight, Settings, Star, 
  User, Download, ArrowRight
} from 'lucide-react';

// Import the split components
import { 
  OverviewTab, 
  CharactersTab, 
  RankingsTab, 
  DownloadTab, 
  HeroSections, 
  VoteModal 
} from '@/components/user-dashboard';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rankingFilters, setRankingFilters] = useState<RankingFilters>({
    job: 'all',
    search: '',
    page: 1,
    limit: 15
  });
  const [rankingPagination, setRankingPagination] = useState<PaginationInfo | null>(null);
  const [availableJobs, setAvailableJobs] = useState<JobCategory[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  
  // Updated vote state structure
  const [voteData, setVoteData] = useState<{
    sites: any[];
    voteStatus: any;
    todayRewards: number;
    username: string;
    currentNX: number;
    totalVotes: number;
  }>({
    sites: [],
    voteStatus: {},
    todayRewards: 0,
    username: '',
    currentNX: 0,
    totalVotes: 0
  });

  const [userData, setUserData] = useState({
    username: "Loading...",
    level: 0,
    job: "Loading...",
    guild: "Legends",
    nx: 0,
    votePoints: 0
  });
  const [onlineCount, setOnlineCount] = useState(0);
  const [characters, setCharacters] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [userRanking, setUserRanking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch stats (user info + online count)
      const statsResponse = await dashboardAPI.getStats();
      if (statsResponse.ok) {
        const statsData = statsResponse.data;
        setUserData({
          username: statsData.user.username,
          level: statsData.mainCharacter?.level || 1,
          job: statsData.mainCharacter?.job || "Beginner",
          guild: "Legends",
          nx: (statsData.user.nx || 0),
          votePoints: statsData.user.votePoints || 0
        });
        setOnlineCount(statsData.onlineCount);
      }

      // Check if user is admin
      const adminResponse = await adminAPI.checkAccess();
      if (adminResponse.ok) {
        setIsAdmin(adminResponse.data.isAdmin);
      }

      // Fetch characters
      const charactersResponse = await dashboardAPI.getCharacters();
      if (charactersResponse.ok) {
        setCharacters(charactersResponse.data.characters || []);
      }

      // Only fetch rankings if we're on the rankings tab or if rankings are empty
      if (activeTab === 'rankings' || rankings.length === 0) {
        await fetchRankings();
      }

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Replace the fetchRankings function in UserDashboard.tsx with this debug version

  const fetchRankings = async () => {
    try {
      setIsLoadingRankings(true);
      
      console.log('Fetching rankings with filters:', rankingFilters);
      
      // Use the API service instead of direct fetch
      const response = await dashboardAPI.getRankings({
        page: rankingFilters.page,
        limit: rankingFilters.limit,
        job: rankingFilters.job,
        search: rankingFilters.search
      });

      console.log('Rankings API response:', response);

      if (response.ok && response.data) {
        console.log('Rankings data:', response.data);
        setRankings(response.data.rankings || []);
        setUserRanking(response.data.userRanking || null);
        setRankingPagination(response.data.pagination || null);
        setAvailableJobs(response.data.availableJobs || []);
      } else {
        console.error('Failed to fetch rankings:', response.data);
        console.error('Response status:', response.status);
        // Set empty states on error
        setRankings([]);
        setUserRanking(null);
        setRankingPagination(null);
        setAvailableJobs([{ value: 'all', label: 'All Jobs', icon: 'all' }]);
      }
    } catch (error) {
      console.error('Failed to fetch rankings - Exception:', error);
      // Set empty states on error
      setRankings([]);
      setUserRanking(null);
      setRankingPagination(null);
      setAvailableJobs([{ value: 'all', label: 'All Jobs', icon: 'all' }]);
    } finally {
      setIsLoadingRankings(false);
    }
  };

  // Fetch vote status
  const fetchVoteStatus = async () => {
    try {
      const response = await voteAPI.getStatus();
      if (response.ok) {
        setVoteData(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch vote status:', error);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const response = await announcementsAPI.getAll();
      if (response.ok) {
        setAnnouncements(response.data.announcements || []);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  // Manual refresh function
  const refreshData = () => {
    fetchDashboardData();
    fetchVoteStatus();
    fetchAnnouncements();
  };

  const updateRankingFilters = (newFilters: Partial<RankingFilters>) => {
    setRankingFilters(prev => ({
      ...prev,
      ...newFilters,
      page: newFilters.page ?? 1 // Reset to page 1 when filters change (except explicit page changes)
    }));
  };

  useEffect(() => {
    if (activeTab === 'rankings') {
      fetchRankings();
    }
  }, [rankingFilters, activeTab]);

  // Check if user can vote for a specific site
  const canVote = (siteName: string) => {
    const siteKey = siteName.toLowerCase().replace(/\s+/g, '');
    const status = voteData.voteStatus[siteKey];
    if (!status) return true;
    
    if (status.canVoteAt) {
      return Date.now() >= status.canVoteAt;
    }
    
    return !status.voted;
  };

  // Get remaining cooldown time for a site
  const getRemainingCooldown = (siteName: string) => {
    const siteKey = siteName.toLowerCase().replace(/\s+/g, '');
    const status = voteData.voteStatus[siteKey];
    if (!status || !status.canVoteAt) return 0;
    
    return Math.max(0, status.canVoteAt - Date.now());
  };

  // Handle vote click - opens site with proper pingUsername format
  const handleVote = async (site: any) => {
    const siteKey = site.name.toLowerCase().replace(/\s+/g, '');
    
    if (!canVote(site.name)) return;

    // Set pending status
    setVoteData(prev => ({
      ...prev,
      voteStatus: {
        ...prev.voteStatus,
        [siteKey]: { ...prev.voteStatus[siteKey], pending: true }
      }
    }));

    // Construct vote URL with pingUsername for Gtop100
    let voteUrl = site.url;
    if (site.name === 'Gtop100') {
      // For Gtop100, append the username to the pingUsername parameter
      voteUrl = `${site.url}${voteData.username}`;
    } else {
      // For other sites, use the old format
      voteUrl = `${site.url}?username=${voteData.username}&ref=dashboard`;
    }
    
    // Open vote site in new tab
    const voteWindow = window.open(voteUrl, '_blank');
    
    // Optional: Check if vote window is closed (user completed vote)
    const checkClosed = setInterval(() => {
      if (voteWindow?.closed) {
        clearInterval(checkClosed);
        // Refresh vote status after user closes vote window
        setTimeout(() => {
          fetchVoteStatus();
          fetchDashboardData(); // Refresh NX balance too
        }, 3000); // Wait 3 seconds for webhook to process
      }
    }, 1000);

    // Remove pending status after 30 seconds regardless
    setTimeout(() => {
      setVoteData(prev => ({
        ...prev,
        voteStatus: {
          ...prev.voteStatus,
          [siteKey]: { ...prev.voteStatus[siteKey], pending: false }
        }
      }));
      // Also refresh status in case webhook already processed
      fetchVoteStatus();
      fetchDashboardData();
    }, 30000);
  };

  // Format time remaining
  const formatTimeRemaining = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Check if user is logged in and get username
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      if (user.isLoggedIn) {
        // Fetch real data from database
        fetchDashboardData();
        fetchAnnouncements();
      } else {
        window.location.href = '/auth';
      }
    } else {
      window.location.href = '/auth';
    }
  }, []);

  // Fetch vote status when userData changes
  useEffect(() => {
    if (userData.username !== "Loading...") {
      fetchVoteStatus();
    }
  }, [userData.username]);

  // Refresh data when tab changes to characters or rankings (if no data)
  useEffect(() => {
    if ((activeTab === 'characters' && characters.length === 0) || 
        (activeTab === 'rankings' && rankings.length === 0)) {
      if (activeTab === 'rankings') {
        fetchRankings();
      } else {
        fetchDashboardData();
      }
    }
  }, [activeTab]);

  // Auto-refresh navigation stats every 30 seconds
  useEffect(() => {
    let navigationStatsInterval: NodeJS.Timeout;

    if (userData.username !== "Loading...") {
      navigationStatsInterval = setInterval(async () => {
        // Just update navigation stats without loading states
        const response = await dashboardAPI.getStats();
        if (response.ok) {
          const data = response.data;
          setUserData(prev => ({
            ...prev,
            nx: data.user.nx,
            votePoints: data.user.votePoints,
            level: data.mainCharacter?.level || prev.level,
            job: data.mainCharacter?.job || prev.job
          }));
          setOnlineCount(data.onlineCount);
        }
      }, 30000); // 30 seconds
    }

    return () => {
      if (navigationStatsInterval) {
        clearInterval(navigationStatsInterval);
      }
    };
  }, [userData.username]);

  // Auto-refresh data when window becomes visible (user comes back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && userData.username !== "Loading...") {
        fetchDashboardData();
        fetchVoteStatus();
        fetchAnnouncements();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userData.username]);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'characters', label: 'My Characters', icon: User },
    { id: 'rankings', label: 'Rankings', icon: Trophy },
    { id: 'download', label: 'Download', icon: Download }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 fixed top-0 w-full z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Side - Logo */}
            <div className="flex items-center flex-shrink-0">
              <div className="group relative flex items-center gap-3 cursor-pointer">
                {/* Logo Icon */}
                <div className="relative">
                  <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-orange-500 font-black text-sm">
                        {(process.env.NEXT_PUBLIC_SERVER_NAME || 'MapleKaede')[0].toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-orange-400/30 rounded-xl blur-lg -z-10 group-hover:blur-xl transition-all duration-300" />
                </div>
                
                {/* Server Name */}
                <div className="relative">
                  <h1 className="text-xl font-black tracking-tight group-hover:scale-105 transition-transform duration-300">
                    {(() => {
                      const serverName = process.env.NEXT_PUBLIC_SERVER_NAME || 'MapleKaede';
                      if (serverName.toLowerCase().startsWith('maple')) {
                        const maple = serverName.slice(0, 5);
                        const rest = serverName.slice(5);
                        return (
                          <>
                            <span className="text-gray-800">{maple}</span>
                            <span className="text-orange-500">{rest}</span>
                          </>
                        );
                      }
                      return (
                        <span className="text-orange-500">{serverName}</span>
                      );
                    })()}
                  </h1>
                  <div className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-orange-500 group-hover:w-full transition-all duration-500" />
                </div>
              </div>
            </div>
            
            {/* Center Navigation - Orange Only */}
            <div className="flex-1 flex justify-center">
              <nav className="hidden md:flex items-center bg-gray-50 rounded-2xl p-1.5 shadow-lg border border-gray-200/50 backdrop-blur-sm">
                {menuItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${
                      activeTab === item.id
                        ? 'bg-orange-500 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-orange-50 hover:scale-102'
                    } ${index !== menuItems.length - 1 ? 'mr-1' : ''}`}
                  >
                    {/* Background glow effect for active tab */}
                    {activeTab === item.id && (
                      <div className="absolute inset-0 bg-orange-400/20 blur-xl -z-10" />
                    )}
                    
                    {/* Hover shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <item.icon className={`relative z-10 w-4 h-4 transition-all duration-300 ${
                      activeTab === item.id 
                        ? 'text-white group-hover:scale-110 group-hover:rotate-12' 
                        : 'text-gray-500 group-hover:text-orange-500 group-hover:scale-110'
                    }`} />
                    <span className="relative z-10">{item.label}</span>
                    
                    {/* Active indicator dot */}
                    {activeTab === item.id && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full shadow-md animate-pulse" />
                    )}
                  </button>
                ))}
              </nav>
            </div>
            
            {/* Right Side - Stats & Profile - Orange Theme */}
            <div className="flex items-center gap-3 flex-shrink-0">
              
              {/* Online Count */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200/50 shadow-sm">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-green-700 text-sm font-bold">{onlineCount}</span>
                <span className="text-green-600 text-xs font-medium">online</span>
              </div>
              
              {/* NX Balance */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-orange-50 rounded-xl border border-orange-200/50 shadow-sm">
                <Star className="w-4 h-4 text-orange-500" />
                <span className="text-orange-700 text-sm font-bold">
                  {userData.nx >= 1000000 
                    ? `${Math.floor(userData.nx / 1000000)}M` 
                    : userData.nx >= 1000 
                    ? `${Math.floor(userData.nx / 1000)}K`
                    : userData.nx.toLocaleString()
                  }
                </span>
                <span className="text-orange-600 text-xs font-medium">NX</span>
              </div>
              
              {/* Profile Button - Orange Theme */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="group flex items-center gap-3 p-1.5 rounded-2xl hover:bg-orange-50 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-orange-200/50"
                >
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{userData.username}</div>
                    <div className="text-xs text-gray-500 group-hover:text-orange-500 transition-colors">Lv.{userData.level} • {userData.job}</div>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      {userData.username[0]?.toUpperCase()}
                    </div>
                    {/* Profile glow effect */}
                    <div className="absolute inset-0 bg-orange-400/30 rounded-xl blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                  </div>
                </button>

                {/* Profile Dropdown - Orange Theme */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden transform transition-all duration-300">
                    {/* Header with orange background */}
                    <div className="relative p-4 bg-orange-500 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-pulse" />
                      <div className="relative z-10">
                        <p className="font-bold text-white text-lg">{userData.username}</p>
                        <p className="text-white/90 text-sm">{userData.job} • Level {userData.level}</p>
                        <div className="flex items-center gap-4 mt-2 text-white/80 text-xs">
                          <span>Guild: {userData.guild}</span>
                          <span>NX: {userData.nx.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu items */}
                    <div className="p-2">
                      {isAdmin && (
                        <button 
                          onClick={() => window.location.href = '/admin'}
                          className="w-full flex items-center gap-3 px-3 py-3 text-gray-700 hover:bg-orange-50 hover:text-orange-600 rounded-xl transition-all duration-300 group"
                        >
                          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                          <span className="font-medium">Admin Panel</span>
                          <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          localStorage.removeItem('user');
                          window.location.href = '/auth';
                        }}
                        className="w-full flex items-center gap-3 px-3 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 group"
                      >
                        <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">Logout</span>
                        <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Mobile Menu Button - Orange Theme */}
              <button className="md:hidden p-2.5 rounded-xl hover:bg-orange-50 transition-all duration-300 group border border-transparent hover:border-orange-200/50">
                <svg className="w-5 h-5 text-gray-600 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Mobile Navigation - Orange Only */}
        <div className="md:hidden border-t border-gray-100 bg-gray-50">
          <div className="px-4 py-3">
            <div className="flex justify-around">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex flex-col items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all duration-300 ${
                    activeTab === item.id
                      ? 'text-white bg-orange-500 shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  {/* Background glow for active mobile tab */}
                  {activeTab === item.id && (
                    <div className="absolute inset-0 bg-orange-400/30 blur-lg -z-10 rounded-xl" />
                  )}
                  
                  <item.icon className={`w-5 h-5 transition-all duration-300 ${
                    activeTab === item.id 
                      ? 'text-white group-hover:scale-110' 
                      : 'text-gray-400 group-hover:text-orange-500 group-hover:scale-110'
                  }`} />
                  <span className={`text-xs font-bold transition-colors ${
                    activeTab === item.id ? 'text-white' : 'text-gray-600 group-hover:text-orange-600'
                  }`}>
                    {item.label}
                  </span>
                  
                  {/* Active indicator for mobile */}
                  {activeTab === item.id && (
                    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Sections */}
        <HeroSections 
          activeTab={activeTab}
          userData={userData}
          characters={characters}
          rankings={rankings}
          userRanking={userRanking}
          onTabChange={setActiveTab}
          onShowVoteModal={() => setShowVoteModal(true)}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview Content */}
          {activeTab === 'overview' && (
            <OverviewTab 
              onlineCount={onlineCount}
              announcements={announcements}
              userRanking={userRanking}
              userData={userData}
              onTabChange={setActiveTab}
              onShowVoteModal={() => setShowVoteModal(true)}
              refreshData={refreshData}
            />
          )}

          {/* Characters Tab */}
          {activeTab === 'characters' && (
            <CharactersTab 
              characters={characters}
              isLoading={isLoading}
              refreshData={refreshData}
            />
          )}

          {/* Rankings Tab */}
          {activeTab === 'rankings' && (
            <RankingsTab 
              rankings={rankings}
              userRanking={userRanking}
              isLoadingRankings={isLoadingRankings}
              rankingFilters={rankingFilters}
              rankingPagination={rankingPagination}
              availableJobs={availableJobs}
              updateRankingFilters={updateRankingFilters}
              fetchRankings={fetchRankings}
            />
          )}

          {/* Download Tab */}
          {activeTab === 'download' && (
            <DownloadTab />
          )}
        </div>
      </main>

      {/* Vote Modal */}
      <VoteModal 
        isOpen={showVoteModal}
        onClose={() => setShowVoteModal(false)}
        voteData={voteData}
        handleVote={handleVote}
        canVote={canVote}
        getRemainingCooldown={getRemainingCooldown}
        formatTimeRemaining={formatTimeRemaining}
      />

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
        .animate-blob { animation: blob 7s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
      `}</style>
    </div>
  );
};

export default UserDashboard;