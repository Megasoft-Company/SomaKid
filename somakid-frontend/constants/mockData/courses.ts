/**
 * SOMAKID AI - Mock Courses Data
 * Placeholder tutor-led formations until the real Courses backend exists.
 */

import type { Course } from '../../types/education.types';

export const COURSES: Course[] = [
  {
    id: 'course_biodiversity_congo',
    title: 'Découverte de la Biodiversité du Congo',
    description:
      "Explore la richesse exceptionnelle de la forêt du bassin du Congo, ses espèces emblématiques et les gestes pour la protéger.",
    emoji: '🌿',
    color: '#2D9B6E',
    category: 'biodiversity',
    level: 'beginner',
    tutor: {
      id: 'tutor_mireille',
      name: 'Mireille Kanza',
      avatarEmoji: '👩🏾‍🔬',
      bio: 'Biologiste, spécialiste de la faune du bassin du Congo depuis 12 ans.',
    },
    durationWeeks: 4,
    priceUSD: 0,
    isFree: true,
    curriculum: [
      {
        id: 'mod_1',
        title: 'La forêt tropicale du Congo',
        lessonTitles: ['Un écosystème unique', "Les espèces emblématiques", 'Pourquoi la protéger'],
      },
      {
        id: 'mod_2',
        title: 'Faune et flore locales',
        lessonTitles: ['Reconnaître les plantes courantes', 'Les animaux en danger'],
      },
    ],
  },
  {
    id: 'course_conservation_iccn',
    title: 'Sciences de la Conservation',
    description:
      "Une initiation aux métiers et méthodes de la conservation, animée par des experts de l'ICCN.",
    emoji: '🦍',
    color: '#1B8B5E',
    category: 'biodiversity',
    level: 'intermediate',
    tutor: {
      id: 'tutor_iccn_expert',
      name: "Équipe pédagogique de l'ICCN",
      avatarEmoji: '🧑🏾‍🏫',
      bio: 'Gardes et scientifiques des parcs nationaux de la RDC.',
    },
    durationWeeks: 6,
    priceUSD: 12,
    isFree: false,
    institutionId: 'inst_iccn',
    curriculum: [
      {
        id: 'mod_1',
        title: 'Les parcs nationaux de la RDC',
        lessonTitles: ['Virunga et Salonga', 'Le métier de garde forestier'],
      },
      {
        id: 'mod_2',
        title: 'Protéger les espèces menacées',
        lessonTitles: ['Le gorille de montagne', "L'éléphant de forêt"],
      },
    ],
  },
  {
    id: 'course_climate_change',
    title: 'Changement Climatique : Comprendre et Agir',
    description:
      "Comprends les causes et impacts du changement climatique en Afrique centrale, et découvre des solutions concrètes.",
    emoji: '🌍',
    color: '#1B6CA8',
    category: 'climate',
    level: 'intermediate',
    tutor: {
      id: 'tutor_unikin',
      name: "Prof. Jonas Mputu",
      avatarEmoji: '👨🏾‍🏫',
      bio: "Enseignant en sciences environnementales à l'Université de Kinshasa.",
    },
    durationWeeks: 5,
    priceUSD: 10,
    isFree: false,
    institutionId: 'inst_unikin',
    curriculum: [
      {
        id: 'mod_1',
        title: 'Comprendre le climat',
        lessonTitles: ['Effet de serre et réchauffement', "Impacts en RDC"],
      },
      {
        id: 'mod_2',
        title: 'Agir localement',
        lessonTitles: ['Gestes quotidiens', 'Projets communautaires'],
      },
    ],
  },
  {
    id: 'course_recycling',
    title: 'Gestion des Déchets et Recyclage Créatif',
    description:
      "Apprends à trier, réduire et transformer les déchets en objets utiles grâce à des activités pratiques.",
    emoji: '♻️',
    color: '#8B5CF6',
    category: 'climate',
    level: 'beginner',
    tutor: {
      id: 'tutor_grace',
      name: 'Grace Ilunga',
      avatarEmoji: '👩🏾‍🎨',
      bio: "Animatrice en éducation environnementale et créatrice d'ateliers de recyclage.",
    },
    durationWeeks: 3,
    priceUSD: 0,
    isFree: true,
    curriculum: [
      {
        id: 'mod_1',
        title: 'Comprendre les déchets',
        lessonTitles: ['Trier ses déchets', 'Le compost à la maison'],
      },
      {
        id: 'mod_2',
        title: "Fabrique et réutilise",
        lessonTitles: ['Objets recyclés simples'],
      },
    ],
  },
  {
    id: 'course_family_hygiene',
    title: 'Hygiène et Santé pour les Familles',
    description:
      "Les bons gestes d'hygiène et de prévention pour rester en bonne santé, expliqués simplement pour toute la famille.",
    emoji: '🧼',
    color: '#38A169',
    category: 'health',
    level: 'beginner',
    tutor: {
      id: 'tutor_dr_beya',
      name: 'Dr Sarah Beya',
      avatarEmoji: '👩🏾‍⚕️',
      bio: 'Infirmière en santé communautaire, spécialiste de la prévention pour enfants.',
    },
    durationWeeks: 3,
    priceUSD: 8,
    isFree: false,
    curriculum: [
      {
        id: 'mod_1',
        title: "Les gestes essentiels",
        lessonTitles: ['Se laver les mains', "L'eau potable"],
      },
      {
        id: 'mod_2',
        title: 'Prévenir les maladies',
        lessonTitles: ['Reconnaître les signes', 'Quand consulter un professionnel'],
      },
    ],
  },
  {
    id: 'course_girls_health',
    title: 'Santé et Bien-être de la Jeune Fille',
    description:
      "Un accompagnement éducatif et bienveillant sur la santé et le bien-être des jeunes filles, animé par des professionnelles de santé.",
    emoji: '🌸',
    color: '#EC4899',
    category: 'health',
    level: 'beginner',
    tutor: {
      id: 'tutor_dr_beya',
      name: 'Dr Sarah Beya',
      avatarEmoji: '👩🏾‍⚕️',
      bio: 'Infirmière en santé communautaire, spécialiste de la prévention pour enfants.',
    },
    durationWeeks: 4,
    priceUSD: 8,
    isFree: false,
    curriculum: [
      {
        id: 'mod_1',
        title: 'Se comprendre et se respecter',
        lessonTitles: ['Le corps qui change', "Prendre soin de soi"],
      },
      {
        id: 'mod_2',
        title: 'Poser des questions en confiance',
        lessonTitles: ["Parler à un adulte de confiance"],
      },
    ],
  },
  {
    id: 'course_scratch_coding',
    title: 'Initiation à la Programmation avec Scratch',
    description:
      "Crée tes premières animations et jeux tout en apprenant les bases de la logique de programmation.",
    emoji: '💻',
    color: '#E8921A',
    category: 'coding',
    level: 'beginner',
    tutor: {
      id: 'tutor_patrick',
      name: 'Patrick Mwamba',
      avatarEmoji: '👨🏾‍💻',
      bio: 'Développeur et formateur en informatique pour jeunes.',
    },
    durationWeeks: 6,
    priceUSD: 15,
    isFree: false,
    curriculum: [
      {
        id: 'mod_1',
        title: 'Les bases de Scratch',
        lessonTitles: ["Découvrir l'interface", 'Créer un premier lutin'],
      },
      {
        id: 'mod_2',
        title: 'Logique et créativité',
        lessonTitles: ['Boucles et conditions', 'Mon premier petit jeu'],
      },
    ],
  },
];
