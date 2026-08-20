/**
 * SOMAKID AI - Mock Institutions Data
 * Placeholder partner institutions until real institution accounts exist.
 */

import type { Institution } from '../../types/education.types';

export const INSTITUTIONS: Institution[] = [
  {
    id: 'inst_unikin',
    name: 'Université de Kinshasa',
    logoEmoji: '🎓',
    color: '#1B6CA8',
    type: 'university',
    country: 'RD Congo',
    city: 'Kinshasa',
    description:
      "L'une des plus grandes universités d'Afrique centrale, partenaire de SOMAKID-AI pour des initiations aux sciences de l'environnement.",
  },
  {
    id: 'inst_iccn',
    name: 'Institut Congolais pour la Conservation de la Nature',
    logoEmoji: '🌳',
    color: '#2D9B6E',
    type: 'ngo',
    country: 'RD Congo',
    city: 'Kinshasa',
    description:
      "Organisme public en charge des parcs et réserves de la RDC, engagé dans la sensibilisation des jeunes à la biodiversité.",
  },
  {
    id: 'inst_lycee_bonsomi',
    name: 'Lycée Bonsomi',
    logoEmoji: '🏫',
    color: '#C0392B',
    type: 'school',
    country: 'RD Congo',
    city: 'Kinshasa',
    description:
      "Établissement secondaire proposant des programmes complémentaires en sciences pour ses élèves via SOMAKID-AI.",
  },
  {
    id: 'inst_green_schools',
    name: 'Global Green Schools Network',
    logoEmoji: '🌍',
    color: '#8B5CF6',
    type: 'ngo',
    country: 'International',
    city: 'Réseau panafricain',
    description:
      "Réseau international d'écoles engagées pour l'éducation climatique, proposant des programmes de sensibilisation en Afrique.",
  },
];
