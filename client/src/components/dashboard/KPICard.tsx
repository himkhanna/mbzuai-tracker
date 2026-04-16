import React from 'react';
import type { LucideIcon } from 'lucide-react';

type ColorVariant = 'blue' | 'red' | 'yellow' | 'green' | 'gray';

interface KPICardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: ColorVariant;
  subtitle?: string;
}

const colorMap: Record<ColorVariant, { bg: string; iconBg: string; iconColor: string; text: string }> = {
  blue: {
    bg: 'bg-white',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    text: 'text-blue-600',
  },
  red: {
    bg: 'bg-white',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    text: 'text-red-600',
  },
  yellow: {
    bg: 'bg-white',
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    text: 'text-yellow-600',
  },
  green: {
    bg: 'bg-white',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    text: 'text-green-600',
  },
  gray: {
    bg: 'bg-white',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    text: 'text-gray-600',
  },
};

const KPICard: React.FC<KPICardProps> = ({ title, value, icon: Icon, color, subtitle }) => {
  const colors = colorMap[color];

  return (
    <div className={`${colors.bg} rounded-lg shadow-sm border border-gray-200 p-5 flex items-start gap-4`}>
      <div className={`flex-shrink-0 w-12 h-12 rounded-lg ${colors.iconBg} flex items-center justify-center`}>
        <Icon className={`w-6 h-6 ${colors.iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className={`text-3xl font-bold mt-0.5 ${colors.text}`}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default KPICard;
