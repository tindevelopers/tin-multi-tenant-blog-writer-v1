"use client";

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function RoleBadge({ role, size = 'sm', className = '' }: RoleBadgeProps) {
  const getRoleConfig = (role: string) => {
    switch (role) {
      case 'system_admin':
        return {
          label: 'System Admin',
          bgColor: 'bg-red-100 dark:bg-red-900/20',
          textColor: 'text-red-800 dark:text-red-200',
          borderColor: 'border-red-200 dark:border-red-800',
          icon: '👑'
        };
      case 'super_admin':
        return {
          label: 'Super Admin',
          bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          textColor: 'text-purple-800 dark:text-purple-200',
          borderColor: 'border-purple-200 dark:border-purple-800',
          icon: '⭐'
        };
      case 'admin':
        return {
          label: 'Admin',
          bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          textColor: 'text-blue-800 dark:text-blue-200',
          borderColor: 'border-blue-200 dark:border-blue-800',
          icon: '🛡️'
        };
      case 'manager':
        return {
          label: 'Manager',
          bgColor: 'bg-green-100 dark:bg-green-900/20',
          textColor: 'text-green-800 dark:text-green-200',
          borderColor: 'border-green-200 dark:border-green-800',
          icon: '👔'
        };
      case 'editor':
        return {
          label: 'Editor',
          bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
          textColor: 'text-yellow-800 dark:text-yellow-200',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          icon: '✏️'
        };
      case 'writer':
        return {
          label: 'Writer',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-800 dark:text-gray-200',
          borderColor: 'border-gray-200 dark:border-gray-600',
          icon: '✍️'
        };
      default:
        return {
          label: 'User',
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          textColor: 'text-gray-800 dark:text-gray-200',
          borderColor: 'border-gray-200 dark:border-gray-600',
          icon: '👤'
        };
    }
  };

  const config = getRoleConfig(role);
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeClasses[size]} ${className}`}
    >
      <span className="text-xs">{config.icon}</span>
      {config.label}
    </span>
  );
}

