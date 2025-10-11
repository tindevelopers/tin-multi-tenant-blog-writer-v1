// =====================================================
// ROLE BADGE COMPONENT
// =====================================================

import React from 'react';
import { UserRole, ROLE_INFO } from '@/lib/rbac/types';

interface RoleBadgeProps {
  role: UserRole;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function RoleBadge({ role, showDescription = false, size = 'md' }: RoleBadgeProps) {
  const roleInfo = ROLE_INFO[role];
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };
  
  return (
    <div className="inline-flex flex-col gap-1">
      <span className={`inline-flex items-center justify-center rounded-full font-medium ${roleInfo.color} ${sizeClasses[size]}`}>
        {roleInfo.label}
      </span>
      {showDescription && (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {roleInfo.description}
        </span>
      )}
    </div>
  );
}

