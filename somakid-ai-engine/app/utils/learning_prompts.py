"""
SOMAKID AI Engine - Learning Prompts
AI prompts for generating structured lessons, exercises, and unit tests.
All prompts support full multilingual output: French, English, Lingala, Swahili.
"""

from typing import Optional, List, Dict, Any


# =============================================================================
# LESSON GENERATION PROMPT
# =============================================================================

_LESSON_PATH_CONTEXT = {
    "biodiversity": {
        "fr": {
            "name": "Biodiversité",
            "description": "La richesse de la faune et la flore africaine",
            "units": {
                1: "Introduction à la Biodiversité",
                2: "Les Animaux d'Afrique",
                3: "Les Plantes et Arbres",
                4: "Les Insectes et Petites Bêtes",
                5: "Les Écosystèmes Africains",
            },
        },
        "en": {
            "name": "Biodiversity",
            "description": "The richness of African wildlife and flora",
            "units": {
                1: "Introduction to Biodiversity",
                2: "African Animals",
                3: "Plants and Trees",
                4: "Insects and Small Creatures",
                5: "African Ecosystems",
            },
        },
        "ln": {
            "name": "Biodiversite",
            "description": "Richesse ya bikelamu mpe banzete ya Afrique",
            "units": {
                1: "Introduction na Biodiversite",
                2: "Banyama ya Afrique",
                3: "Banzete mpe Matiti",
                4: "Ba Insectes mpe Bikelamu ya Mike",
                5: "Ba Ecosystemes ya Afrique",
            },
        },
        "sw": {
            "name": "Bioanuwai",
            "description": "Utajiri wa wanyama na mimea ya Afrika",
            "units": {
                1: "Utangulizi wa Bioanuwai",
                2: "Wanyama wa Afrika",
                3: "Mimea na Miti",
                4: "Wadudu na Viumbe Wadogo",
                5: "Mifumo ya Ikolojia ya Afrika",
            },
        },
    },
    "climate": {
        "fr": {
            "name": "Climat",
            "description": "Comprendre le changement climatique",
            "units": {
                1: "Le Climat, c'est quoi ?",
                2: "Le Réchauffement Climatique",
                3: "Les Conséquences",
                4: "Les Solutions",
                5: "Agir Ensemble",
            },
        },
        "en": {
            "name": "Climate",
            "description": "Understanding climate change",
            "units": {
                1: "What is Climate?",
                2: "Global Warming",
                3: "The Consequences",
                4: "Solutions",
                5: "Acting Together",
            },
        },
        "ln": {
            "name": "Climat",
            "description": "Comprendre changement climatique",
            "units": {
                1: "Climat ezali nini ?",
                2: "Kozala na Moto ya Mokili",
                3: "Ba Conséquences",
                4: "Ba Solutions",
                5: "Kosala Elongo",
            },
        },
        "sw": {
            "name": "Hali ya Hewa",
            "description": "Kuelewa mabadiliko ya hali ya hewa",
            "units": {
                1: "Hali ya Hewa ni nini?",
                2: "Joto la Dunia",
                3: "Athari",
                4: "Ufumbuzi",
                5: "Kutenda Pamoja",
            },
        },
    },
    "disasters": {
        "fr": {
            "name": "Catastrophes Naturelles",
            "description": "Reconnaître et se protéger",
            "units": {
                1: "Les Types de Catastrophes",
                2: "Les Inondations",
                3: "Les Sécheresses",
                4: "Les Tempêtes",
                5: "Prévention et Protection",
            },
        },
        "en": {
            "name": "Natural Disasters",
            "description": "Recognize and protect yourself",
            "units": {
                1: "Types of Disasters",
                2: "Floods",
                3: "Droughts",
                4: "Storms",
                5: "Prevention and Protection",
            },
        },
        "ln": {
            "name": "Ba Likama ya Mbula",
            "description": "Koyeba mpe komibatela",
            "units": {
                1: "Ba Types ya Likama",
                2: "Ba Inondations",
                3: "Ba Sécheresses",
                4: "Ba Tempêtes",
                5: "Prévention mpe Protection",
            },
        },
        "sw": {
            "name": "Majanga ya Asili",
            "description": "Kutambua na kujikinga",
            "units": {
                1: "Aina za Majanga",
                2: "Mafuriko",
                3: "Ukame",
                4: "Dhoruba",
                5: "Kinga na Ulinzi",
            },
        },
    },
    "behaviors": {
        "fr": {
            "name": "Éco-Gestes",
            "description": "Adopter les bons gestes écologiques",
            "units": {
                1: "Économiser l'Eau",
                2: "Réduire les Déchets",
                3: "Protéger la Nature",
                4: "Économiser l'Énergie",
                5: "Devenir un Éco-Ambassadeur",
            },
        },
        "en": {
            "name": "Eco-Behaviors",
            "description": "Adopting good ecological habits",
            "units": {
                1: "Saving Water",
                2: "Reducing Waste",
                3: "Protecting Nature",
                4: "Saving Energy",
                5: "Becoming an Eco-Ambassador",
            },
        },
        "ln": {
            "name": "Bizaleli ya Malamu",
            "description": "Kozwa bizaleli ya malamu écologiques",
            "units": {
                1: "Kobatela Mai",
                2: "Kokitisa Ba Déchets",
                3: "Kobatela Nature",
                4: "Kobatela Énergie",
                5: "Kokoma Eco-Ambassadeur",
            },
        },
        "sw": {
            "name": "Tabia za Kiikolojia",
            "description": "Kuchukua tabia nzuri za kiikolojia",
            "units": {
                1: "Kuokoa Maji",
                2: "Kupunguza Taka",
                3: "Kulinda Asili",
                4: "Kuokoa Nishati",
                5: "Kuwa Balozi wa Mazingira",
            },
        },
    },
}

_LESSON_LANG_INSTRUCTIONS = {
    "fr": "Génère TOUT le contenu UNIQUEMENT en français. La question, le contenu, les exercices, tout.",
    "en": "Generate ALL content ONLY in English. The question, content, exercises, everything.",
    "ln": "Sala contenu NYONSO na Lingala KAKA. Pertise, contenu, exercices, nionso.",
    "sw": "Tengeneza maudhui YOTE KWA Kiswahili TU. Swali, maudhui, mazoezi, kila kitu.",
}

_LESSON_STRUCTURE_INSTRUCTIONS = {
    "fr": """
STRUCTURE DE LA LEÇON :
1. Titre accrocheur avec emoji
2. Introduction (2-3 phrases simples)
3. Contenu principal (4-6 phrases structurées)
4. Vocabulaire clé (3-5 mots avec définitions simples)
5. Points importants à retenir (3 points)
6. Fait amusant (1 fait surprenant)
7. Conseil pratique (1 action concrète)
8. 4 exercices variés pour tester la compréhension
""",
    "en": """
LESSON STRUCTURE:
1. Catchy title with emoji
2. Introduction (2-3 simple sentences)
3. Main content (4-6 structured sentences)
4. Key vocabulary (3-5 words with simple definitions)
5. Key takeaways (3 points)
6. Fun fact (1 surprising fact)
7. Practical tip (1 concrete action)
8. 4 varied exercises to test understanding
""",
    "ln": """
STRUCTURE YA LEÇON :
1. Titre ya kitoko na emoji
2. Introduction (2-3 phrases ya pete)
3. Contenu principal (4-6 phrases structurées)
4. Vocabulaire ya ntina (3-5 maloba na définitions ya pete)
5. Points ya ntina ya kokanga (3 points)
6. Likambo ya kokamwa (1 fait surprenant)
7. Conseil pratique (1 action concrète)
8. 4 exercices variés po na komeka compréhension
""",
    "sw": """
MUUNDO WA SOMO:
1. Kichwa cha kuvutia na emoji
2. Utangulizi (sentensi 2-3 rahisi)
3. Maudhui kuu (sentensi 4-6 zilizopangwa)
4. Msamiati muhimu (maneno 3-5 na ufafanuzi rahisi)
5. Mambo muhimu ya kukumbuka (mambo 3)
6. Ukweli wa kufurahisha (ukweli 1 wa kushangaza)
7. Ushauri wa vitendo (hatua 1 halisi)
8. Mazoezi 4 tofauti kupima uelewa
""",
}


def get_lesson_generation_prompt(
    path_id: str = "biodiversity",
    unit_number: int = 1,
    lesson_number: int = 1,
    language: str = "fr",
    child_age: int = 8,
    child_level: int = 1,
) -> str:
    """
    Generate a prompt for creating a complete lesson.

    Args:
        path_id: Learning path identifier
        unit_number: Unit number (1-5)
        lesson_number: Lesson number within unit (1-4)
        language: Language code
        child_age: Child's age for content adaptation
        child_level: Child's current level

    Returns:
        Complete prompt string for AI lesson generation
    """
    path_context = _LESSON_PATH_CONTEXT.get(path_id, _LESSON_PATH_CONTEXT["biodiversity"])
    lang_context = path_context.get(language, path_context["fr"])
    path_name = lang_context["name"]
    path_description = lang_context["description"]
    unit_name = lang_context["units"].get(unit_number, f"Unité {unit_number}")

    lang_instruction = _LESSON_LANG_INSTRUCTIONS.get(language, _LESSON_LANG_INSTRUCTIONS["fr"])
    structure = _LESSON_STRUCTURE_INSTRUCTIONS.get(language, _LESSON_STRUCTURE_INSTRUCTIONS["fr"])

    lesson_themes = {
        1: {
            "fr": "Découverte et concepts de base",
            "en": "Discovery and basic concepts",
            "ln": "Découverte mpe concepts ya base",
            "sw": "Ugunduzi na dhana za msingi",
        },
        2: {
            "fr": "Approfondissement et exemples concrets",
            "en": "Deepening and concrete examples",
            "ln": "Approfondissement mpe exemples concrets",
            "sw": "Kina na mifano halisi",
        },
        3: {
            "fr": "Application et cas pratiques",
            "en": "Application and practical cases",
            "ln": "Application mpe cas pratiques",
            "sw": "Matumizi na kesi za vitendo",
        },
        4: {
            "fr": "Révision et synthèse",
            "en": "Review and synthesis",
            "ln": "Révision mpe synthèse",
            "sw": "Mapitio na muhtasari",
        },
    }

    theme = lesson_themes.get(lesson_number, lesson_themes[1]).get(language, lesson_themes[1]["fr"])

    level_adaptation = {
        "fr": f"Niveau {child_level}/5. Adapte pour un enfant de {child_age} ans.",
        "en": f"Level {child_level}/5. Adapt for a {child_age}-year-old child.",
        "ln": f"Niveau {child_level}/5. Adapter po na mwana ya mbula {child_age}.",
        "sw": f"Kiwango {child_level}/5. Rekebisha kwa mtoto wa miaka {child_age}.",
    }

    level_text = level_adaptation.get(language, level_adaptation["fr"])

    return f"""
Tu es SOMAKID, un enseignant africain expert. 
You are SOMAKID, an expert African teacher.

{lang_instruction}

CONTEXTE :
- Parcours : {path_name} — {path_description}
- Unité {unit_number} : {unit_name}
- Leçon {lesson_number} : {theme}
- {level_text}

{structure}

FORMAT JSON ATTENDU (aucun texte avant ou après) :
{{
  "title": "Titre de la leçon",
  "content": "Contenu principal structuré en paragraphes",
  "summary": "Résumé en 2-3 phrases",
  "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"],
  "vocabulary": [
    {{"word": "Mot", "definition": "Définition simple"}},
    {{"word": "Mot", "definition": "Définition simple"}}
  ],
  "exercises": [
    {{
      "exercise_type": "multiple_choice",
      "question": "Question claire",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explication complète"
    }},
    {{
      "exercise_type": "true_false",
      "question": "Affirmation à vérifier",
      "options": ["Vrai", "Faux"],
      "correct_answer": "Vrai",
      "explanation": "Explication complète"
    }},
    {{
      "exercise_type": "fill_blank",
      "question": "Phrase avec _____ à compléter",
      "correct_answer": "mot manquant",
      "explanation": "Explication complète"
    }},
    {{
      "exercise_type": "open_question",
      "question": "Question ouverte de réflexion",
      "keywords": ["mot clé 1", "mot clé 2"],
      "explanation": "Éléments de réponse attendus"
    }}
  ],
  "fun_fact": "Un fait amusant et surprenant",
  "practical_tip": "Un conseil concret et réalisable",
  "emoji": "📚",
  "estimated_minutes": 5
}}
"""


# =============================================================================
# EXERCISE GENERATION PROMPT
# =============================================================================

_EXERCISE_TYPE_INSTRUCTIONS = {
    "multiple_choice": {
        "fr": "Génère des QCM avec 4 options dont une seule correcte.",
        "en": "Generate multiple choice questions with 4 options, only one correct.",
        "ln": "Sala ba QCM na 4 options, kaka moko ya solo.",
        "sw": "Tengeneza maswali ya chaguo nyingi na chaguzi 4, moja tu sahihi.",
    },
    "true_false": {
        "fr": "Génère des affirmations Vrai ou Faux avec explication.",
        "en": "Generate True or False statements with explanation.",
        "ln": "Sala ba affirmations Vrai to Faux na explication.",
        "sw": "Tengeneza kauli za Kweli au Uongo na maelezo.",
    },
    "fill_blank": {
        "fr": "Génère des phrases à trous avec un mot manquant.",
        "en": "Generate fill-in-the-blank sentences with one missing word.",
        "ln": "Sala ba phrases na trous na mot moko ya kozanga.",
        "sw": "Tengeneza sentensi za kujaza nafasi na neno moja linalokosekana.",
    },
    "open_question": {
        "fr": "Génère des questions ouvertes avec mots-clés attendus.",
        "en": "Generate open questions with expected keywords.",
        "ln": "Sala ba mituna ya polele na ba mots-clés attendus.",
        "sw": "Tengeneza maswali wazi na maneno muhimu yanayotarajiwa.",
    },
    "matching": {
        "fr": "Génère des exercices d'association avec paires.",
        "en": "Generate matching exercises with pairs.",
        "ln": "Sala ba exercices ya kosangisa na ba paires.",
        "sw": "Tengeneza mazoezi ya kulinganisha na jozi.",
    },
    "image_identification": {
        "fr": "Génère des questions d'identification avec description d'image.",
        "en": "Generate identification questions with image description.",
        "ln": "Sala ba mituna ya koyeba elilingi na description ya foto.",
        "sw": "Tengeneza maswali ya kutambua kwa maelezo ya picha.",
    },
}


def get_exercise_generation_prompt(
    topic: str = "",
    exercise_type: str = "multiple_choice",
    count: int = 4,
    language: str = "fr",
    difficulty: int = 1,
) -> str:
    """
    Generate a prompt for creating exercises on a specific topic.

    Args:
        topic: Topic name or description
        exercise_type: Type of exercise to generate
        count: Number of exercises
        language: Language code
        difficulty: Difficulty level (1-5)

    Returns:
        Complete prompt string for AI exercise generation
    """
    type_instructions = _EXERCISE_TYPE_INSTRUCTIONS.get(
        exercise_type,
        _EXERCISE_TYPE_INSTRUCTIONS["multiple_choice"],
    )
    type_instruction = type_instructions.get(language, type_instructions["fr"])

    lang_instruction = _LESSON_LANG_INSTRUCTIONS.get(language, _LESSON_LANG_INSTRUCTIONS["fr"])

    difficulty_labels = {
        "fr": {1: "très facile", 2: "facile", 3: "moyen", 4: "difficile", 5: "expert"},
        "en": {1: "very easy", 2: "easy", 3: "medium", 4: "hard", 5: "expert"},
        "ln": {1: "facile mingi", 2: "facile", 3: "moyen", 4: "difficile", 5: "expert"},
        "sw": {1: "rahisi sana", 2: "rahisi", 3: "wastani", 4: "ngumu", 5: "mtaalamu"},
    }

    diff_label = difficulty_labels.get(language, difficulty_labels["fr"]).get(difficulty, "moyen")

    json_format = ""
    if exercise_type == "multiple_choice":
        json_format = """
{{
  "exercises": [
    {{
      "exercise_type": "multiple_choice",
      "question": "Question claire",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explication de la bonne réponse",
      "points": 5
    }}
  ]
}}
"""
    elif exercise_type == "true_false":
        json_format = """
{{
  "exercises": [
    {{
      "exercise_type": "true_false",
      "question": "Affirmation à vérifier",
      "options": ["Vrai", "Faux"],
      "correct_answer": "Vrai",
      "explanation": "Explication",
      "points": 5
    }}
  ]
}}
"""
    elif exercise_type == "fill_blank":
        json_format = """
{{
  "exercises": [
    {{
      "exercise_type": "fill_blank",
      "question": "Phrase avec _____ à compléter",
      "correct_answer": "mot manquant",
      "explanation": "Explication",
      "points": 5
    }}
  ]
}}
"""
    elif exercise_type == "open_question":
        json_format = """
{{
  "exercises": [
    {{
      "exercise_type": "open_question",
      "question": "Question ouverte de réflexion",
      "keywords": ["mot clé 1", "mot clé 2", "mot clé 3"],
      "explanation": "Éléments de réponse attendus",
      "points": 5
    }}
  ]
}}
"""
    else:
        json_format = """
{{
  "exercises": [
    {{
      "exercise_type": "multiple_choice",
      "question": "Question",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 0,
      "explanation": "Explication",
      "points": 5
    }}
  ]
}}
"""

    return f"""
Tu es SOMAKID, un enseignant africain expert.
You are SOMAKID, an expert African teacher.

{lang_instruction}

SUJET : {topic}
TYPE D'EXERCICE : {exercise_type}
NOMBRE : {count}
DIFFICULTÉ : {diff_label} ({difficulty}/5)

{type_instruction}

INSTRUCTIONS :
- Génère {count} exercices sur le sujet "{topic}"
- Niveau de difficulté : {diff_label}
- Les exercices doivent être variés et progressifs
- Chaque exercice doit avoir une explication pédagogique

RÉPONDS UNIQUEMENT EN JSON VALIDE :
{json_format}
"""


# =============================================================================
# UNIT TEST PROMPT
# =============================================================================

_UNIT_TEST_LANG_INSTRUCTIONS = {
    "fr": "Génère le test de validation UNIQUEMENT en français.",
    "en": "Generate the validation test ONLY in English.",
    "ln": "Sala test ya validation na Lingala KAKA.",
    "sw": "Tengeneza mtihani wa uthibitisho KWA Kiswahili TU.",
}


def get_unit_test_prompt(
    path_id: str = "biodiversity",
    unit_number: int = 1,
    language: str = "fr",
    question_count: int = 10,
) -> str:
    """
    Generate a prompt for creating a unit validation test.

    Args:
        path_id: Learning path identifier
        unit_number: Unit number
        language: Language code
        question_count: Number of questions in the test

    Returns:
        Complete prompt string for AI test generation
    """
    path_context = _LESSON_PATH_CONTEXT.get(path_id, _LESSON_PATH_CONTEXT["biodiversity"])
    lang_context = path_context.get(language, path_context["fr"])
    path_name = lang_context["name"]
    unit_name = lang_context["units"].get(unit_number, f"Unit {unit_number}")

    lang_instruction = _UNIT_TEST_LANG_INSTRUCTIONS.get(
        language, _UNIT_TEST_LANG_INSTRUCTIONS["fr"]
    )

    return f"""
Tu es SOMAKID, un enseignant africain expert.
You are SOMAKID, an expert African teacher.

{lang_instruction}

CONTEXTE :
- Parcours : {path_name}
- Unité {unit_number} : {unit_name}
- Type : Test de validation (quiz de fin d'unité)

INSTRUCTIONS :
- Génère {question_count} questions pour valider les connaissances de l'unité
- Questions variées : QCM, Vrai/Faux, texte à trous
- Couvre tous les concepts importants de l'unité
- Score de passage : 70% (7 bonnes réponses sur {question_count})
- Les questions doivent être progressives (facile → difficile)

RÉPONDS UNIQUEMENT EN JSON VALIDE :
{{
  "unit_name": "{unit_name}",
  "path_name": "{path_name}",
  "passing_score": 70,
  "total_questions": {question_count},
  "questions": [
    {{
      "exercise_type": "multiple_choice",
      "question": "Question claire sur le contenu de l'unité",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explication pédagogique complète"
    }}
  ]
}}
"""