import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Circle, 
  Clock, 
  Users, 
  Vote, 
  Settings, 
  Trash2, 
  Filter,
  Mail,
  MailOpen,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  AlertCircle,
  Info
} from 'lucide-react';
import { notificationApi } from '../services/api';

const NotificationList = () => {
  const [notifications, setNotifications] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    is_read: null,
    type: null,
    priority: null,
    days_ago: null
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [availablePriorities, setAvailablePriorities] = useState([]);

  useEffect(() => {
    loadNotifications();
    loadSummary();
    loadFilterOptions();
  }, [filters]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await notificationApi.list({
        ...filters,
        limit: 50
      });
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError('Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const data = await notificationApi.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error loading notification summary:', err);
    }
  };

  const loadFilterOptions = async () => {
    try {
      const [types, priorities] = await Promise.all([
        notificationApi.getTypes(),
        notificationApi.getPriorities()
      ]);
      setAvailableTypes(types);
      setAvailablePriorities(priorities);
    } catch (err) {
      console.error('Error loading filter options:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await notificationApi.markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      loadSummary(); // Refresh summary
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAsUnread = async (notificationId) => {
    try {
      await notificationApi.markAsUnread(notificationId);
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, is_read: false, read_at: null }
            : n
        )
      );
      loadSummary(); // Refresh summary
    } catch (err) {
      console.error('Error marking notification as unread:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
      loadSummary();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await notificationApi.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      loadSummary();
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotificationIcon = (type, priority) => {
    const iconClass = `h-5 w-5 ${
      priority === 'urgent' ? 'text-red-500' :
      priority === 'high' ? 'text-orange-500' :
      priority === 'medium' ? 'text-blue-500' : 'text-gray-500'
    }`;

    switch (type) {
      case 'election_started':
      case 'election_ended':
      case 'election_created':
      case 'election_updated':
      case 'election_deleted':
        return <Vote className={iconClass} />;
      case 'candidate_added':
      case 'candidate_updated':
      case 'candidate_deleted':
        return <User className={iconClass} />;
      case 'vote_cast':
      case 'voting_threshold_reached':
        return <CheckCircle className={iconClass} />;
      case 'system_maintenance':
        return <Settings className={iconClass} />;
      case 'security_alert':
        return <AlertTriangle className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getPriorityBadge = (priority) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full";
    switch (priority) {
      case 'urgent':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800`;
      case 'medium':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'low':
        return `${baseClasses} bg-gray-100 text-gray-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const formatNotificationType = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading notifications...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total_notifications || 0}</p>
            </div>
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-orange-600">{summary.unread_count || 0}</p>
            </div>
            <Circle className="h-8 w-8 text-orange-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Urgent</p>
              <p className="text-2xl font-bold text-red-600">{summary.urgent_count || 0}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Today</p>
              <p className="text-2xl font-bold text-blue-600">{summary.today_count || 0}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            
            {summary.unread_count > 0 && (
                          <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors"
            >
              <MailOpen className="h-4 w-4" />
              Mark All Read
            </button>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            Showing {notifications.length} notifications
          </div>
        </div>

        {/* Filter Controls */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Read Status</label>
                <select
                  value={filters.is_read === null ? '' : filters.is_read.toString()}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    is_read: e.target.value === '' ? null : e.target.value === 'true'
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All</option>
                  <option value="false">Unread</option>
                  <option value="true">Read</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    type: e.target.value || null
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Types</option>
                  {availableTypes.map(type => (
                    <option key={type} value={type}>
                      {formatNotificationType(type)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select
                  value={filters.priority || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priority: e.target.value || null
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Priorities</option>
                  {availablePriorities.map(priority => (
                    <option key={priority} value={priority}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                <select
                  value={filters.days_ago || ''}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    days_ago: e.target.value ? parseInt(e.target.value) : null
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Time</option>
                  <option value="1">Last 24 hours</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
            <p className="text-gray-500">
              {Object.values(filters).some(f => f !== null) 
                ? "No notifications match your current filters."
                : "You don't have any notifications yet."
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(notification.type, notification.priority)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          <span className={getPriorityBadge(notification.priority)}>
                            {notification.priority}
                          </span>
                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-2">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(notification.created_at)}
                          </span>
                          <span>{formatNotificationType(notification.type)}</span>
                          {notification.election_title && (
                            <span className="flex items-center gap-1">
                              <Vote className="h-3 w-3" />
                              {notification.election_title}
                            </span>
                          )}
                          {notification.candidate_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {notification.candidate_name}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-4">
                        {notification.is_read ? (
                          <button
                            onClick={() => markAsUnread(notification.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Mark as unread"
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                            title="Mark as read"
                          >
                            <MailOpen className="h-4 w-4" />
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationList;
