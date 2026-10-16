'use client';

import React from 'react';

export type StatusVariant =
  | 'concluido'
  | 'em_curso'
  | 'aguardar'
  | 'alerta'
  | 'inativo';

interface StatusBadgeProps {
  variant?: StatusVariant;
  status?: string; // Automatically maps common status strings if variant is not provided
  label?: string;
  pulse?: boolean;
  className?: string;
  mono?: boolean;
  icon?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant,
  status,
  label,
  pulse,
  className = '',
  mono = false,
  icon,
}) => {
  // Determine variant from status string if not explicitly given
  let resolvedVariant: StatusVariant = variant || 'inativo';
  let defaultLabel = label || status || '';

  if (!variant && status) {
    const s = status.toLowerCase();
    if (
      s === 'concluido' ||
      s === 'entregue' ||
      s === 'aceite' ||
      s === 'ativo' ||
      s === 'pronta' ||
      s === 'pago' ||
      s.includes('conclu') ||
      s.includes('entregue')
    ) {
      resolvedVariant = 'concluido';
      if (!label) {
        if (s === 'entregue') defaultLabel = 'Entregue';
        else if (s === 'aceite') defaultLabel = 'Aceite';
        else if (s === 'pronta') defaultLabel = 'Pronta';
        else if (s === 'ativo') defaultLabel = 'Ativo';
        else defaultLabel = 'Concluído';
      }
    } else if (
      s === 'em_curso' ||
      s === 'em_producao' ||
      s === 'em_distribuicao' ||
      s === 'ligado' ||
      s.includes('fabrico') ||
      s.includes('distribui')
    ) {
      resolvedVariant = 'em_curso';
      if (!label) {
        if (s === 'em_producao') defaultLabel = 'Em Fabrico';
        else if (s === 'em_distribuicao') defaultLabel = 'Em Distribuição';
        else defaultLabel = 'Em Curso';
      }
    } else if (
      s === 'pendente' ||
      s === 'aguardar' ||
      s === 'planeado' ||
      s === 'em_espera' ||
      s.includes('aguard')
    ) {
      resolvedVariant = 'aguardar';
      if (!label) defaultLabel = 'A Aguardar';
    } else if (
      s === 'urgente' ||
      s === 'alerta' ||
      s === 'recusado' ||
      s === 'cancelada' ||
      s === 'cancelado' ||
      s === 'parcial' ||
      s.includes('recus') ||
      s.includes('cancel')
    ) {
      resolvedVariant = 'alerta';
      if (!label) {
        if (s === 'recusado') defaultLabel = 'Recusado';
        else if (s === 'cancelada' || s === 'cancelado') defaultLabel = 'Cancelado';
        else if (s === 'parcial') defaultLabel = 'Produção Parcial';
        else defaultLabel = 'Prioridade';
      }
    } else {
      resolvedVariant = 'inativo';
      if (!label) {
        if (s === 'inativo') defaultLabel = 'Inativo';
        else defaultLabel = 'Rascunho';
      }
    }
  }

  const styles = {
    concluido: {
      pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    em_curso: {
      pill: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      dot: 'bg-sky-500',
    },
    aguardar: {
      pill: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
    },
    alerta: {
      pill: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-600',
    },
    inativo: {
      pill: 'bg-slate-100 text-slate-600 border-slate-200',
      dot: 'bg-slate-400',
    },
  }[resolvedVariant];

  const shouldPulse = pulse ?? resolvedVariant === 'em_curso';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        styles.pill
      } ${mono ? 'font-mono' : ''} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot} ${
          shouldPulse ? 'animate-pulse' : ''
        }`}
      />
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label || defaultLabel}</span>
    </span>
  );
};
