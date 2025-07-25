// src/components/AdminPage.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { adminAPI, announcementsAPI } from '@/services/api';
import { 
  ArrowLeft, AlertCircle, Home, Users, Trophy, Download, 
  LogOut, Star, Shield, Settings, Bell, ArrowRight
} from 'lucide-react';

// Import the split components
import { 
  OverviewTab, 
  AnnouncementsTab, 
  UsersTab, 
  HeroSections, 
  CreateAnnouncementModal,
  PasswordUpdateModal,
  InventoryModal,
  EquipmentModal
} from '@/components/admin-dashboard';

interface Announcement {
  id: number;
  type: 'event' | 'update' | 'maintenance';
  title: string;
  description: string;
  date: string;
  createdBy: string;
  gradient: string;
}

const AdminPage = () => {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedInventoryUser, setSelectedInventoryUser] = useState<{ userId: number; username: string } | null>(null);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [selectedEquipmentUser, setSelectedEquipmentUser] = useState<{ userId: number; username: string } | null>(null);
  
  // User management states
  const [users, setUsers] = useState<any[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);
  
  // User data
  const [userData, setUserData] = useState({
    username: "Admin",
    level: 200,
    job: "Game Master",
    nx: 999999,
    votePoints: 0
  });
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'event' as 'event' | 'update' | 'maintenance',
    title: '',
    description: '',
    priority: 0
  });

  // Menu items - Updated to match UserDashboard style
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'announcements', label: 'Announcements', icon: Bell },
    { id: 'users', label: 'User Management', icon: Users },
  ];

  const viewUserEquipment = (userId: number, username: string) => {
    setSelectedEquipmentUser({ userId, username });
    setShowEquipmentModal(true);
  };

  // Toggle ban status
  const toggleUserBan = async (userId: number, currentBanStatus: number) => {
    const newBanStatus = currentBanStatus === 0 ? 1 : 0;
    const action = newBanStatus === 1 ? 'ban' : 'unban';
    
    if (!confirm(`Are you sure you want to ${action} this user?`)) {
      return;
    }

    try {
      const response = await adminAPI.toggleBan(userId, newBanStatus);

      if (response.ok) {
        alert(`User ${action}ned successfully!`);
        fetchUsers(); // Refresh the list
      } else {
        alert(`Error: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Toggle ban error:', error);
      alert(`Failed to ${action} user`);
    }
  };

  // Update NX Credits
  const updateNXCredits = async (userId: number, amount: number) => {
    try {
      const response = await adminAPI.updateNXCredits(userId, amount);

      if (response.ok) {
        fetchUsers(); // Refresh the list
        // Optional: Show success toast instead of alert
      } else {
        alert(`Error: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Update NX error:', error);
      alert('Failed to update NX Credits');
    }
  };

  // Update Character Meso
  const updateCharacterMeso = async (characterId: number, amount: number) => {
    try {
      const response = await adminAPI.updateMeso(characterId, amount);

      if (response.ok) {
        fetchUsers(); // Refresh the list
        // Optional: Show success toast instead of alert
      } else {
        alert(`Error: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Update meso error:', error);
      alert('Failed to update Meso');
    }
  };

  // View user inventory
  const viewUserInventory = (userId: number, username: string) => {
    setSelectedInventoryUser({ userId, username });
    setShowInventoryModal(true);
  };

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getUsers();
      if (response.ok) {
        const data = response.data;
        setUsers(data.users);
        setTotalUsers(data.total);
        // Calculate online users (loggedin === 2)
        const onlineCount = data.users.filter((user: any) => user.loggedin === 2).length;
        setOnlineUsers(onlineCount);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  // Update user password
  const updateUserPassword = async (newPassword: string) => {
    if (!newPassword || newPassword.length < 6 || !editingUser) {
      alert('Password must be at least 6 characters long');
      return;
    }

    setIsUpdatingUser(true);
    try {
      const response = await adminAPI.updateUserPassword(editingUser.id, newPassword);

      if (response.ok) {
        alert('Password updated successfully!');
        setShowPasswordModal(false);
        setEditingUser(null);
      } else {
        alert(`Error: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Update password error:', error);
      alert('Failed to update password');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  // Delete user account
  const deleteUser = async (userId: number, username: string) => {
    if (!confirm(`Are you sure you want to delete the account "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await adminAPI.deleteUser(userId);

      if (response.ok) {
        alert('Account deleted successfully!');
        fetchUsers(); // Refresh the list
      } else {
        alert(`Error: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Delete user error:', error);
      alert('Failed to delete account');
    }
  };

  // Check admin access
  const checkAdminAccess = async () => {
    try {
      const response = await adminAPI.checkAccess();
      if (response.ok) {
        const data = response.data;
        setIsAdmin(data.isAdmin);
        if (data.isAdmin) {
          setUserData(prev => ({
            ...prev,
            username: data.username
          }));
        } else {
          // Redirect to dashboard if not admin
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);
        }
      } else {
        setIsAdmin(false);
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('Admin check error:', error);
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch announcements
  const fetchAnnouncements = async () => {
    try {
      const response = await announcementsAPI.getAll();
      if (response.ok) {
        setAnnouncements(response.data.announcements);
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    }
  };

  // Create announcement
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description) {
      alert('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await announcementsAPI.create(formData);

      if (response.ok) {
        // Reset form
        setFormData({
          type: 'event',
          title: '',
          description: '',
          priority: 0
        });
        setShowCreateForm(false);
        
        // Refresh announcements
        fetchAnnouncements();
        
        // Show success message
        alert('Announcement created successfully!');
      } else {
        alert(`Error: ${response.data.error}`);
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to create announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete announcement
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      const response = await announcementsAPI.delete(id);

      if (response.ok) {
        fetchAnnouncements();
        alert('Announcement deleted successfully!');
      } else {
        alert('Failed to delete announcement');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete announcement');
    }
  };

  // Handle update password button click
  const handleUpdatePasswordClick = (userId: number, username: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setEditingUser(user);
      setShowPasswordModal(true);
    }
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchAnnouncements();
      if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'overview') {
        fetchUsers(); // Add this to load user count for overview
      }
    }
  }, [isAdmin, activeTab]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Checking admin access...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">You need admin privileges to access this page.</p>
          <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Matching UserDashboard Style */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100 fixed top-0 w-full z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* Left Side - Logo with Admin Badge */}
            <div className="flex items-center flex-shrink-0">
              <div className="group relative flex items-center gap-3 cursor-pointer">
                {/* Logo Icon */}
                <div className="relative">
                  <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-all duration-300">
                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center">
                      <span className="text-red-500 font-black text-sm">
                        {(process.env.NEXT_PUBLIC_SERVER_NAME || 'MapleKaede')[0].toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-red-400/30 rounded-xl blur-lg -z-10 group-hover:blur-xl transition-all duration-300" />
                </div>
                
                {/* Server Name with Admin Badge */}
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
                            <span className="text-red-500">{rest}</span>
                            <span className="ml-2 text-xs text-red-600 font-normal bg-red-100 px-2 py-1 rounded-full">Admin</span>
                          </>
                        );
                      }
                      return (
                        <>
                          <span className="text-red-500">{serverName}</span>
                          <span className="ml-2 text-xs text-red-600 font-normal bg-red-100 px-2 py-1 rounded-full">Admin</span>
                        </>
                      );
                    })()}
                  </h1>
                  <div className="absolute -bottom-0.5 left-0 w-0 h-0.5 bg-red-500 group-hover:w-full transition-all duration-500" />
                </div>
              </div>
            </div>
            
            {/* Center Navigation - Red Theme */}
            <div className="flex-1 flex justify-center">
              <nav className="hidden md:flex items-center bg-gray-50 rounded-2xl p-1.5 shadow-lg border border-gray-200/50 backdrop-blur-sm">
                {menuItems.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 overflow-hidden ${
                      activeTab === item.id
                        ? 'bg-red-500 text-white shadow-lg transform scale-105'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-red-50 hover:scale-102'
                    } ${index !== menuItems.length - 1 ? 'mr-1' : ''}`}
                  >
                    {/* Background glow effect for active tab */}
                    {activeTab === item.id && (
                      <div className="absolute inset-0 bg-red-400/20 blur-xl -z-10" />
                    )}
                    
                    {/* Hover shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    
                    <item.icon className={`relative z-10 w-4 h-4 transition-all duration-300 ${
                      activeTab === item.id 
                        ? 'text-white group-hover:scale-110 group-hover:rotate-12' 
                        : 'text-gray-500 group-hover:text-red-500 group-hover:scale-110'
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
            
            {/* Right Side - Stats & Profile - Red Theme */}
            <div className="flex items-center gap-3 flex-shrink-0">
              
              {/* Online Count */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-green-50 rounded-xl border border-green-200/50 shadow-sm">
                <div className="relative">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                </div>
                <span className="text-green-700 text-sm font-bold">{onlineUsers}</span>
                <span className="text-green-600 text-xs font-medium">online</span>
              </div>
              
              {/* Total Users */}
              <div className="hidden lg:flex items-center gap-2 px-3 py-2 bg-red-50 rounded-xl border border-red-200/50 shadow-sm">
                <Users className="w-4 h-4 text-red-500" />
                <span className="text-red-700 text-sm font-bold">{totalUsers}</span>
                <span className="text-red-600 text-xs font-medium">users</span>
              </div>
              
              {/* Profile Button - Red Theme */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="group flex items-center gap-3 p-1.5 rounded-2xl hover:bg-red-50 transition-all duration-300 hover:shadow-lg border border-transparent hover:border-red-200/50"
                >
                  <div className="text-right hidden sm:block">
                    <div className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">{userData.username}</div>
                    <div className="text-xs text-gray-500 group-hover:text-red-500 transition-colors">Administrator</div>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center text-white font-bold shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      {userData.username[0]?.toUpperCase()}
                    </div>
                    {/* Profile glow effect */}
                    <div className="absolute inset-0 bg-red-400/30 rounded-xl blur-lg -z-10 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                    {/* Admin indicator */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                      <Shield className="w-2 h-2 text-white" />
                    </div>
                  </div>
                </button>

                {/* Profile Dropdown - Red Theme */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 overflow-hidden transform transition-all duration-300">
                    {/* Header with red background */}
                    <div className="relative p-4 bg-red-500 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] animate-pulse" />
                      <div className="relative z-10">
                        <p className="font-bold text-white text-lg">{userData.username}</p>
                        <p className="text-white/90 text-sm">Administrator • Game Master</p>
                        <div className="flex items-center gap-4 mt-2 text-white/80 text-xs">
                          <span>Total Users: {totalUsers}</span>
                          <span>Online: {onlineUsers}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu items */}
                    <div className="p-2">
                      <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="w-full flex items-center gap-3 px-3 py-3 text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-300 group"
                      >
                        <Home className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">User Dashboard</span>
                        <ArrowRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                      </button>
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
              
              {/* Mobile Menu Button - Red Theme */}
              <button className="md:hidden p-2.5 rounded-xl hover:bg-red-50 transition-all duration-300 group border border-transparent hover:border-red-200/50">
                <svg className="w-5 h-5 text-gray-600 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Enhanced Mobile Navigation - Red Theme */}
        <div className="md:hidden border-t border-gray-100 bg-gray-50">
          <div className="px-4 py-3">
            <div className="flex justify-around">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`group relative flex flex-col items-center gap-1.5 py-2.5 px-3 rounded-xl transition-all duration-300 ${
                    activeTab === item.id
                      ? 'text-white bg-red-500 shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  {/* Background glow for active mobile tab */}
                  {activeTab === item.id && (
                    <div className="absolute inset-0 bg-red-400/30 blur-lg -z-10 rounded-xl" />
                  )}
                  
                  <item.icon className={`w-5 h-5 transition-all duration-300 ${
                    activeTab === item.id 
                      ? 'text-white group-hover:scale-110' 
                      : 'text-gray-400 group-hover:text-red-500 group-hover:scale-110'
                  }`} />
                  <span className={`text-xs font-bold transition-colors ${
                    activeTab === item.id ? 'text-white' : 'text-gray-600 group-hover:text-red-600'
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

      {/* Hero Sections */}
      <HeroSections 
        activeTab={activeTab}
        totalUsers={totalUsers}
        onlineUsers={onlineUsers}
        announcements={announcements}
        onShowCreateForm={() => setShowCreateForm(true)}
      />

      {/* Main Content */}
      <main className="pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <OverviewTab 
              totalUsers={totalUsers}
              onlineUsers={onlineUsers}
              announcements={announcements}
              onTabChange={setActiveTab}
              onShowCreateForm={() => setShowCreateForm(true)}
            />
          )}

          {/* Announcements Tab */}
          {activeTab === 'announcements' && (
            <AnnouncementsTab 
              announcements={announcements}
              onShowCreateForm={() => setShowCreateForm(true)}
              onDelete={handleDelete}
            />
          )}

          {/* User Management Tab */}
          {activeTab === 'users' && (
            <UsersTab 
              users={users}
              totalUsers={totalUsers}
              onlineUsers={onlineUsers}
              onUpdatePassword={handleUpdatePasswordClick}
              onDeleteUser={deleteUser}
              onToggleBan={toggleUserBan}
              onUpdateNX={updateNXCredits}
              onUpdateMeso={updateCharacterMeso}
              onViewInventory={viewUserInventory}
              onViewEquipment={viewUserEquipment} // Add this line
            />
          )}
        </div>
      </main>

      {/* Create Announcement Modal */}
      <CreateAnnouncementModal 
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />

      {/* Password Update Modal */}
      <PasswordUpdateModal 
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setEditingUser(null);
        }}
        editingUser={editingUser}
        onUpdatePassword={updateUserPassword}
        isUpdating={isUpdatingUser}
      />

      {/* Inventory Modal */}
      {showInventoryModal && selectedInventoryUser && (
        <InventoryModal 
          isOpen={showInventoryModal}
          onClose={() => {
            setShowInventoryModal(false);
            setSelectedInventoryUser(null);
          }}
          userId={selectedInventoryUser.userId}
          username={selectedInventoryUser.username}
        />
      )}

      {/* Equipment Modal */}
      {showEquipmentModal && selectedEquipmentUser && (
        <EquipmentModal 
          isOpen={showEquipmentModal}
          onClose={() => {
            setShowEquipmentModal(false);
            setSelectedEquipmentUser(null);
          }}
          userId={selectedEquipmentUser.userId}
          username={selectedEquipmentUser.username}
        />
      )}

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
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-fadeInUp { animation: fadeInUp 0.6s ease-out; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animation-delay-500 { animation-delay: 0.5s; }
        .animation-delay-1000 { animation-delay: 1s; }
        .animation-delay-1500 { animation-delay: 1.5s; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-3500 { animation-delay: 3.5s; }
      `}</style>
    </div>
  );
};

export default AdminPage;