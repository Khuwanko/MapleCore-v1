'use client';

import React, { useState } from 'react';
import { 
  Bell, ArrowRight, Sparkles, Settings, Star, Filter,
  Calendar, Zap, Clock, X, User
} from 'lucide-react';

interface OverviewTabProps {
  onlineCount: number;
  announcements: any[];
  userRanking: any;
  userData: {
    username: string;
    level: number;
    job: string;
    guild: string;
    nx: number;
    votePoints: number;
  };
  onTabChange: (tab: string) => void;
  onShowVoteModal: () => void;
  refreshData: () => void;
}

const OverviewTab: React.FC<OverviewTabProps> = ({
  onlineCount,
  announcements,
  userRanking,
  userData,
  onTabChange,
  onShowVoteModal,
  refreshData
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'event' | 'update' | 'maintenance'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
  const itemsPerPage = 6;

  // Filter announcements based on active filter
  const filteredAnnouncements = activeFilter === 'all' 
    ? announcements 
    : announcements.filter(ann => ann.type === activeFilter);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAnnouncements.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAnnouncements = filteredAnnouncements.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

  // Get icon for announcement type
  const getAnnouncementIcon = (type: string) => {
    switch(type) {
      case 'event':
        return <Sparkles className="w-4 h-4 text-white" />;
      case 'maintenance':
        return <Settings className="w-4 h-4 text-white" />;
      case 'update':
        return <Star className="w-4 h-4 text-white" />;
      default:
        return <Bell className="w-4 h-4 text-white" />;
    }
  };

  // Get gradient for announcement type
  const getTypeGradient = (type: string) => {
    switch(type) {
      case 'event':
        return 'from-purple-500 to-purple-600';
      case 'maintenance':
        return 'from-orange-500 to-orange-600';
      case 'update':
        return 'from-blue-500 to-blue-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* News & Events Section */}
      <div>
        {/* Header with Filters */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Latest News & Events</h2>
                <p className="text-sm text-gray-600">Stay updated with the latest happenings</p>
              </div>
            </div>
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <div className="flex gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeFilter === 'all'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                All ({announcements.length})
              </button>
              <button
                onClick={() => setActiveFilter('event')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeFilter === 'event'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Events ({announcements.filter(a => a.type === 'event').length})
              </button>
              <button
                onClick={() => setActiveFilter('update')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeFilter === 'update'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                Updates ({announcements.filter(a => a.type === 'update').length})
              </button>
              <button
                onClick={() => setActiveFilter('maintenance')}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                  activeFilter === 'maintenance'
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                }`}
              >
                Maintenance ({announcements.filter(a => a.type === 'maintenance').length})
              </button>
            </div>
          </div>
        </div>

        {/* Announcements List - Compact Design */}
        <div className="space-y-3">
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-400 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-700 mb-2">
                {activeFilter === 'all' 
                  ? 'No announcements at the moment' 
                  : `No ${activeFilter} announcements`}
              </h3>
              <p className="text-gray-500 text-sm">Check back later for exciting updates!</p>
            </div>
          ) : (
            <>
              {/* Announcement Items */}
              {currentAnnouncements.map((item) => (
                <div key={item.id} className="group bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-lg transition-all duration-300 p-4">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${getTypeGradient(item.type)} group-hover:scale-110 transition-transform`}>
                      {getAnnouncementIcon(item.type)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200`}>
                          {item.type.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">{item.date}</span>
                        {item.time && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-600">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </span>
                        )}
                      </div>
                      
                      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                    </div>
                    
                    {/* Action */}
                    <button 
                      onClick={() => setSelectedAnnouncement(item)}
                      className="flex-shrink-0 p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredAnnouncements.length)} of {filteredAnnouncements.length} announcements
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 rounded-lg font-medium text-sm transition-all ${
                            currentPage === page
                              ? 'bg-orange-500 text-white'
                              : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    
                    {/* Next Button */}
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1.5 rounded-lg font-medium text-sm transition-all ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedAnnouncement(null)}
          />
          
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className={`p-6 bg-gradient-to-r ${
              selectedAnnouncement.type === 'event' ? 'from-purple-500 to-purple-600' :
              selectedAnnouncement.type === 'update' ? 'from-blue-500 to-blue-600' :
              'from-orange-500 to-orange-600'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                    {getAnnouncementIcon(selectedAnnouncement.type)}
                  </div>
                  <div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white mb-2">
                      {selectedAnnouncement.type.toUpperCase()}
                    </span>
                    <h2 className="text-2xl font-bold text-white">{selectedAnnouncement.title}</h2>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              {/* Meta Information */}
              <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{selectedAnnouncement.date}</span>
                </div>
                {selectedAnnouncement.time && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{selectedAnnouncement.time}</span>
                  </div>
                )}
                {selectedAnnouncement.createdBy && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>Posted by {selectedAnnouncement.createdBy}</span>
                  </div>
                )}
              </div>
              
              {/* Description */}
              <div className="prose prose-gray max-w-none">
                <p className="text-gray-700 leading-relaxed break-words overflow-wrap-anywhere">
                  {selectedAnnouncement.description}
                </p>
              </div>
              
              {/* Additional Details (if any) */}
              {selectedAnnouncement.priority > 0 && (
                <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-700">
                    <Star className="w-5 h-5" />
                    <span className="font-semibold">Priority Level: {selectedAnnouncement.priority}</span>
                  </div>
                </div>
              )}
              
              {/* Actions */}
              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;