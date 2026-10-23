'use client';

import { BRAND, type PreferencesDTO } from '@forja/core';

/**
 * Aplica tema e cor de destaque no documento e guarda uma cópia local, usada
 * só para evitar "piscar" antes de a API responder. A fonte da verdade é o
 * servidor (mesmas preferências do app móvel).
 */
export function applyPreferences(p: Pick<PreferencesDTO, 'theme' | 'accentColor'>) {
  const root = document.documentElement;
  if (p.theme === 'light') root.dataset.theme = 'light';
  else delete root.dataset.theme;
  root.style.setProperty('--accent', p.accentColor ?? BRAND.accentColor);
  try {
    localStorage.setItem('forja:theme', p.theme);
    if (p.accentColor) localStorage.setItem('forja:accent', p.accentColor);
    else localStorage.removeItem('forja:accent');
    localStorage.setItem('forja:restAlerts', String('restAlerts' in p ? (p as PreferencesDTO).restAlerts : true));
  } catch {}
}

export function restAlertsEnabled(): boolean {
  try {
    return localStorage.getItem('forja:restAlerts') !== 'false';
  } catch {
    return true;
  }
}
