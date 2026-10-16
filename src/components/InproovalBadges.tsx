'use client';

import React from 'react';
import { Globe, MessageCircle, Phone, Store, Flame, Layers, Truck } from 'lucide-react';

interface OriginBadgeProps {
  origem: 'site_online' | 'whatsapp' | 'telefone' | 'presencial' | string;
  className?: string;
  compact?: boolean;
}

export const OriginBadge: React.FC<OriginBadgeProps> = ({ origem, className = '', compact = false }) => {
  const o = origem.toLowerCase();

  if (o === 'site_online' || o.includes('site') || o.includes('online')) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full ${className}`}>
        <Globe className="w-3 h-3 text-slate-500 shrink-0" />
        <span>{compact ? 'Site' : 'App Cliente (Site)'}</span>
      </span>
    );
  }

  if (o === 'whatsapp') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full ${className}`}>
        <MessageCircle className="w-3 h-3 text-emerald-600 shrink-0" />
        <span>WhatsApp</span>
      </span>
    );
  }

  if (o === 'telefone') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full ${className}`}>
        <Phone className="w-3 h-3 text-sky-600 shrink-0" />
        <span>Telefone</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full ${className}`}>
      <Store className="w-3 h-3 text-amber-600 shrink-0" />
      <span>{compact ? 'Balcão' : 'Presencial (Balcão)'}</span>
    </span>
  );
};

interface SectorBadgeProps {
  setor: 'padaria' | 'pastelaria' | string;
  className?: string;
}

export const SectorBadge: React.FC<SectorBadgeProps> = ({ setor, className = '' }) => {
  const isPadaria = setor.toLowerCase() === 'padaria';

  if (isPadaria) {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md ${className}`}>
        <Flame className="w-3 h-3 text-amber-600 shrink-0" />
        <span>Padaria</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md ${className}`}>
      <Layers className="w-3 h-3 text-purple-600 shrink-0" />
      <span>Pastelaria</span>
    </span>
  );
};

interface SkuTagProps {
  sku: string;
  className?: string;
}

export const SkuTag: React.FC<SkuTagProps> = ({ sku, className = '' }) => (
  <span className={`font-mono text-[11px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded ${className}`}>
    {sku}
  </span>
);
