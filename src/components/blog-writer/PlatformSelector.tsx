"use client";

import { useState } from "react";
import {
  GlobeAltIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface PlatformSelectorProps {
  onSelect: (platforms: string[]) => void;
  onCancel: () => void;
  initialPlatforms?: string[];
}

const PLATFORMS = [
  { id: "webflow", name: "Webflow", icon: GlobeAltIcon, color: "text-blue-600" },
  { id: "wordpress", name: "WordPress", icon: DocumentTextIcon, color: "text-blue-500" },
  { id: "shopify", name: "Shopify", icon: ShoppingBagIcon, color: "text-green-600" },
];

export default function PlatformSelector({
  onSelect,
  onCancel,
  initialPlatforms = [],
}: PlatformSelectorProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(initialPlatforms);
  const [scheduledAt, setScheduledAt] = useState<string>("");

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const handleSubmit = () => {
    if (selectedPlatforms.length === 0) {
      alert("Please select at least one platform");
      return;
    }
    onSelect(selectedPlatforms);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Select Publishing Platforms
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3 mb-4">
            {PLATFORMS.map((platform) => {
              const Icon = platform.icon;
              const isSelected = selectedPlatforms.includes(platform.id);
              return (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`w-full p-4 border-2 rounded-lg transition-colors ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? "border-indigo-500 bg-indigo-500"
                          : "border-gray-300 dark:border-gray-600"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <Icon className={`w-6 h-6 ${platform.color}`} />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {platform.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Schedule Publishing (Optional)
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={selectedPlatforms.length === 0}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Publish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

