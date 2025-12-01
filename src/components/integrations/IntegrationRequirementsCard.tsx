/**
 * Integration Requirements Card Component
 * 
 * Displays the credential requirements and configuration status for a publishing system integration.
 * Shows what's needed, what's missing, and provides guidance on obtaining credentials.
 */

'use client';

import { useState } from 'react';
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import IntegrationRequirementsAnalyzer, { type ProviderRequirements } from '@/lib/integrations/requirements-analyzer';
import type { IntegrationType, ConnectionConfig } from '@/lib/integrations/types';

interface IntegrationRequirementsCardProps {
  provider: IntegrationType;
  config?: ConnectionConfig;
  onConfigure?: () => void;
}

export function IntegrationRequirementsCard({ 
  provider, 
  config = {}, 
  onConfigure 
}: IntegrationRequirementsCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  let requirements: ProviderRequirements;
  try {
    requirements = IntegrationRequirementsAnalyzer.getRequirements(provider);
  } catch (error) {
    return null;
  }

  const analysis = IntegrationRequirementsAnalyzer.analyzeConfiguration(provider, config);
  const isReady = analysis.valid && analysis.missingFields.length === 0;
  const hasWarnings = analysis.warnings.length > 0;

  return (
    <div className={`border rounded-lg p-4 transition-all ${
      isReady 
        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
        : hasWarnings
        ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`p-2 rounded-lg ${
            isReady 
              ? 'bg-green-100 dark:bg-green-900/30'
              : hasWarnings
              ? 'bg-yellow-100 dark:bg-yellow-900/30'
              : 'bg-gray-100 dark:bg-gray-700'
          }`}>
            {isReady ? (
              <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : hasWarnings ? (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            ) : (
              <KeyIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {requirements.displayName} Requirements
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {requirements.description}
            </p>
            
            {/* Status Badge */}
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-xs px-2 py-1 rounded ${
                isReady
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              }`}>
                {isReady ? 'Ready to Publish' : `${analysis.missingFields.length} Missing Field${analysis.missingFields.length !== 1 ? 's' : ''}`}
              </span>
              
              {hasWarnings && (
                <span className="text-xs px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                  {analysis.warnings.length} Warning{analysis.warnings.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onConfigure && (
            <button
              onClick={onConfigure}
              className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              Configure
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {expanded ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {/* Required Fields */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Required Credentials
            </h4>
            <div className="space-y-2">
              {requirements.requiredFields.map((field) => {
                const value = config[field.key as keyof ConnectionConfig];
                const isPresent = value !== undefined && value !== null && value !== '';
                const fieldError = analysis.errors?.[field.key];
                
                return (
                  <div
                    key={field.key}
                    className={`p-3 rounded-lg border ${
                      isPresent && !fieldError
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                        : fieldError
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                        : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isPresent && !fieldError ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                          ) : (
                            <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                          )}
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {field.label}
                          </span>
                          {field.required && (
                            <span className="text-xs text-red-600 dark:text-red-400">*</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
                          {field.description}
                        </p>
                        {fieldError && (
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1 ml-6">
                            {fieldError}
                          </p>
                        )}
                        {field.placeholder && !isPresent && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 ml-6 italic">
                            Example: {field.placeholder}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Publishing Requirements */}
          {requirements.publishingRequirements.requiredFields.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Publishing Requirements
              </h4>
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  <strong>Required Fields:</strong>{' '}
                  {requirements.publishingRequirements.requiredFields.join(', ')}
                </p>
                <p>
                  <strong>Content Format:</strong>{' '}
                  {requirements.publishingRequirements.contentFormats.join(', ')}
                </p>
                {requirements.publishingRequirements.specialRequirements && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">Special Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {requirements.publishingRequirements.specialRequirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                    Warnings
                  </h4>
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
                    {analysis.warnings.map((warning, idx) => (
                      <li key={idx}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Field Mapping Info */}
          {requirements.fieldMappingRequirements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Field Mapping
                </h4>
                {(() => {
                  // Check if field mappings exist in config
                  const fieldMappings = (config.field_mappings as Array<{ blogField: string; targetField: string }>) || [];
                  const hasMappings = Array.isArray(fieldMappings) && fieldMappings.length > 0;
                  
                  return hasMappings ? (
                    <span className="text-xs px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                      {fieldMappings.length} mapped
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                      Not configured
                    </span>
                  );
                })()}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>
                  This integration requires mapping blog post fields to {requirements.displayName} fields.
                  {(() => {
                    const fieldMappings = (config.field_mappings as Array<{ blogField: string; targetField: string }>) || [];
                    const hasMappings = Array.isArray(fieldMappings) && fieldMappings.length > 0;
                    
                    if (hasMappings) {
                      return (
                        <span className="text-green-600 dark:text-green-400 font-medium ml-1">
                          Configured mappings will be used when publishing.
                        </span>
                      );
                    }
                    return (
                      <span className="text-amber-600 dark:text-amber-400 font-medium ml-1">
                        Configure field mappings in the integration settings.
                      </span>
                    );
                  })()}
                </p>
                {(() => {
                  const fieldMappings = (config.field_mappings as Array<{ blogField: string; targetField: string }>) || [];
                  const hasMappings = Array.isArray(fieldMappings) && fieldMappings.length > 0;
                  
                  if (hasMappings) {
                    return (
                      <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/10 rounded border border-green-200 dark:border-green-800">
                        <p className="font-medium text-green-800 dark:text-green-200 mb-1">Current Mappings:</p>
                        <ul className="space-y-0.5">
                          {fieldMappings.slice(0, 5).map((mapping, idx) => (
                            <li key={idx} className="text-green-700 dark:text-green-300">
                              <strong>{mapping.blogField}</strong> → {mapping.targetField}
                            </li>
                          ))}
                          {fieldMappings.length > 5 && (
                            <li className="text-green-600 dark:text-green-400 text-xs">
                              +{fieldMappings.length - 5} more mappings
                            </li>
                          )}
                        </ul>
                      </div>
                    );
                  }
                  
                  return (
                    <ul className="list-disc list-inside ml-2 space-y-1 mt-2">
                      {requirements.fieldMappingRequirements.slice(0, 3).map((mapping, idx) => (
                        <li key={idx}>
                          <strong>{mapping.blogField}</strong> → {mapping.targetField}
                          {mapping.required && <span className="text-red-600 dark:text-red-400"> *</span>}
                        </li>
                      ))}
                      {requirements.fieldMappingRequirements.length > 3 && (
                        <li className="text-gray-500 dark:text-gray-500">
                          +{requirements.fieldMappingRequirements.length - 3} more fields
                        </li>
                      )}
                    </ul>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

