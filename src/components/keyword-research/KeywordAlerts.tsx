"use client";

import React, { useState } from 'react';
import { Bell, BellOff, Plus, X, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface KeywordAlert {
  id: string;
  keyword: string;
  type: 'volume_spike' | 'difficulty_change' | 'new_competitor' | 'trend_reversal';
  threshold: number;
  enabled: boolean;
  last_triggered?: string;
}

interface KeywordAlertsProps {
  keywords?: Array<{ keyword: string; search_volume?: number; difficulty?: string }>;
}

export function KeywordAlerts({ keywords = [] }: KeywordAlertsProps) {
  const [alerts, setAlerts] = useState<KeywordAlert[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newAlert, setNewAlert] = useState<Partial<KeywordAlert>>({
    keyword: '',
    type: 'volume_spike',
    threshold: 50,
    enabled: true,
  });

  const addAlert = () => {
    if (!newAlert.keyword || !newAlert.type || !newAlert.threshold) {
      return;
    }

    const alert: KeywordAlert = {
      id: Date.now().toString(),
      keyword: newAlert.keyword,
      type: newAlert.type as KeywordAlert['type'],
      threshold: newAlert.threshold,
      enabled: true,
    };

    setAlerts([...alerts, alert]);
    setNewAlert({ keyword: '', type: 'volume_spike', threshold: 50, enabled: true });
  };

  const toggleAlert = (id: string) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
      )
    );
  };

  const removeAlert = (id: string) => {
    setAlerts(alerts.filter((alert) => alert.id !== id));
  };

  const getAlertIcon = (type: KeywordAlert['type']) => {
    switch (type) {
      case 'volume_spike':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'trend_reversal':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getAlertLabel = (type: KeywordAlert['type']) => {
    switch (type) {
      case 'volume_spike':
        return 'Volume Spike';
      case 'difficulty_change':
        return 'Difficulty Change';
      case 'new_competitor':
        return 'New Competitor';
      case 'trend_reversal':
        return 'Trend Reversal';
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
      >
        {alerts.filter((a) => a.enabled).length > 0 ? (
          <Bell className="h-4 w-4" />
        ) : (
          <BellOff className="h-4 w-4" />
        )}
        <span>Alerts</span>
        {alerts.filter((a) => a.enabled).length > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
            {alerts.filter((a) => a.enabled).length}
          </span>
        )}
      </button>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Keyword Alerts</h2>
          {/* Add New Alert */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/50">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Create New Alert
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Keyword
                </label>
                <select
                  value={newAlert.keyword}
                  onChange={(e) => setNewAlert({ ...newAlert, keyword: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select keyword...</option>
                  {keywords.map((kw, idx) => (
                    <option key={idx} value={kw.keyword}>
                      {kw.keyword}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Alert Type
                </label>
                <select
                  value={newAlert.type}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, type: e.target.value as KeywordAlert['type'] })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="volume_spike">Volume Spike</option>
                  <option value="difficulty_change">Difficulty Change</option>
                  <option value="new_competitor">New Competitor</option>
                  <option value="trend_reversal">Trend Reversal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Threshold ({newAlert.type === 'volume_spike' ? '% increase' : 'value'})
                </label>
                <input
                  type="number"
                  value={newAlert.threshold}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, threshold: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="50"
                />
              </div>

              <button
                onClick={addAlert}
                disabled={!newAlert.keyword}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 inline mr-2" />
                Add Alert
              </button>
            </div>
          </div>

          {/* Active Alerts */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Active Alerts ({alerts.length})
            </h3>
            {alerts.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No alerts configured</p>
                <p className="text-xs mt-1">Create alerts to monitor keyword changes</p>
              </div>
            ) : (
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getAlertIcon(alert.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {alert.keyword}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {getAlertLabel(alert.type)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Threshold: {alert.threshold}
                          {alert.type === 'volume_spike' && '%'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAlert(alert.id)}
                        className={`p-2 rounded ${
                          alert.enabled
                            ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                        title={alert.enabled ? 'Disable' : 'Enable'}
                      >
                        {alert.enabled ? (
                          <Bell className="h-4 w-4" />
                        ) : (
                          <BellOff className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        onClick={() => removeAlert(alert.id)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

