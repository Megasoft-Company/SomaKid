"""
SOMAKID AI Engine - Learning Prompts
AI prompts for generating structured lessons, exercises, and unit tests.
All prompts support full multilingual output: French, English, Lingala, Swahili.
All content is strictly focused on climate, biodiversity, environment, and African ecosystems.
"""

from typing import Optional, List, Dict, Any

from .health_prompts import get_health_path_context

_HEALTH_IDENTITY_LINE = {
    "fr": "Tu es SOMAKID, un educateur africain de sante expert en hygiene, nutrition et prevention pour enfants. Tu ne poses jamais de diagnostic medical et ne prescris jamais de traitement.",
    "en": "You are SOMAKID, an African health educator expert in hygiene, nutrition and prevention for children. You never give a medical diagnosis or prescribe treatment.",
}

_LESSON_PATH_CONTEXT = {
    "biodiversity": {
        "fr": {"name": "Biodiversité", "description": "La richesse de la faune et la flore africaine", "units": {1: "Introduction à la Biodiversité", 2: "Les Animaux d'Afrique", 3: "Les Plantes et Arbres", 4: "Les Insectes et Petites Bêtes", 5: "Les Écosystèmes Africains"}},
        "en": {"name": "Biodiversity", "description": "The richness of African wildlife and flora", "units": {1: "Introduction to Biodiversity", 2: "African Animals", 3: "Plants and Trees", 4: "Insects and Small Creatures", 5: "African Ecosystems"}},
        "ln": {"name": "Biodiversite", "description": "Richesse ya bikelamu mpe banzete ya Afrique", "units": {1: "Introduction na Biodiversite", 2: "Banyama ya Afrique", 3: "Banzete mpe Matiti", 4: "Ba Insectes mpe Bikelamu ya Mike", 5: "Ba Ecosystemes ya Afrique"}},
        "sw": {"name": "Bioanuwai", "description": "Utajiri wa wanyama na mimea ya Afrika", "units": {1: "Utangulizi wa Bioanuwai", 2: "Wanyama wa Afrika", 3: "Mimea na Miti", 4: "Wadudu na Viumbe Wadogo", 5: "Mifumo ya Ikolojia ya Afrika"}},
    },
    "climate": {
        "fr": {"name": "Climat", "description": "Comprendre le changement climatique", "units": {1: "Le Climat, c'est quoi ?", 2: "Le Réchauffement Climatique", 3: "Les Conséquences", 4: "Les Solutions", 5: "Agir Ensemble"}},
        "en": {"name": "Climate", "description": "Understanding climate change", "units": {1: "What is Climate?", 2: "Global Warming", 3: "The Consequences", 4: "Solutions", 5: "Acting Together"}},
        "ln": {"name": "Climat", "description": "Comprendre changement climatique", "units": {1: "Climat ezali nini ?", 2: "Kozala na Moto ya Mokili", 3: "Ba Conséquences", 4: "Ba Solutions", 5: "Kosala Elongo"}},
        "sw": {"name": "Hali ya Hewa", "description": "Kuelewa mabadiliko ya hali ya hewa", "units": {1: "Hali ya Hewa ni nini?", 2: "Joto la Dunia", 3: "Athari", 4: "Ufumbuzi", 5: "Kutenda Pamoja"}},
    },
    "disasters": {
        "fr": {"name": "Catastrophes Naturelles", "description": "Reconnaître et se protéger", "units": {1: "Les Types de Catastrophes", 2: "Les Inondations", 3: "Les Sécheresses", 4: "Les Tempêtes", 5: "Prévention et Protection"}},
        "en": {"name": "Natural Disasters", "description": "Recognize and protect yourself", "units": {1: "Types of Disasters", 2: "Floods", 3: "Droughts", 4: "Storms", 5: "Prevention and Protection"}},
        "ln": {"name": "Ba Likama ya Mbula", "description": "Koyeba mpe komibatela", "units": {1: "Ba Types ya Likama", 2: "Ba Inondations", 3: "Ba Sécheresses", 4: "Ba Tempêtes", 5: "Prévention mpe Protection"}},
        "sw": {"name": "Majanga ya Asili", "description": "Kutambua na kujikinga", "units": {1: "Aina za Majanga", 2: "Mafuriko", 3: "Ukame", 4: "Dhoruba", 5: "Kinga na Ulinzi"}},
    },
    "behaviors": {
        "fr": {"name": "Éco-Gestes", "description": "Adopter les bons gestes écologiques", "units": {1: "Économiser l'Eau", 2: "Réduire les Déchets", 3: "Protéger la Nature", 4: "Économiser l'Énergie", 5: "Devenir un Éco-Ambassadeur"}},
        "en": {"name": "Eco-Behaviors", "description": "Adopting good ecological habits", "units": {1: "Saving Water", 2: "Reducing Waste", 3: "Protecting Nature", 4: "Saving Energy", 5: "Becoming an Eco-Ambassador"}},
        "ln": {"name": "Bizaleli ya Malamu", "description": "Kozwa bizaleli ya malamu écologiques", "units": {1: "Kobatela Mai", 2: "Kokitisa Ba Déchets", 3: "Kobatela Nature", 4: "Kobatela Énergie", 5: "Kokoma Eco-Ambassadeur"}},
        "sw": {"name": "Tabia za Kiikolojia", "description": "Kuchukua tabia nzuri za kiikolojia", "units": {1: "Kuokoa Maji", 2: "Kupunguza Taka", 3: "Kulinda Asili", 4: "Kuokoa Nishati", 5: "Kuwa Balozi wa Mazingira"}},
    },
}

_LESSON_LANG_INSTRUCTIONS = {
    "fr": "Génère TOUT le contenu UNIQUEMENT en français. Utilise exclusivement des termes techniques liés au climat, à la biodiversité, aux écosystèmes et à l'environnement africain. Tous les exemples doivent être dans ce contexte.",
    "en": "Generate ALL content ONLY in English. Use exclusively technical terms related to climate, biodiversity, ecosystems, and African environment. All examples must be in this context.",
    "ln": "Sala contenu NYONSO na Lingala KAKA. Salela kaka ba termes techniques ya climat, biodiversité, écosystèmes mpe environnement africain. Ba exemples nyonso esengeli kozala na contexte oyo.",
    "sw": "Tengeneza maudhui YOTE KWA Kiswahili TU. Tumia istilahi za kiufundi za hali ya hewa, bioanuwai, mifumo ya ikolojia na mazingira ya Afrika. Mifano yote lazima iwe katika muktadha huu.",
}

_LESSON_STRUCTURE_INSTRUCTIONS = {
    "fr": """STRUCTURE DE LA LEÇON :
1. Titre accrocheur avec emoji (lié au climat/environnement)
2. Introduction (2-3 phrases simples sur le sujet)
3. Contenu principal (4-6 phrases structurées avec vocabulaire technique)
4. Vocabulaire clé (3-5 termes techniques avec définitions simples)
5. Points importants à retenir (3 points factuels)
6. Fait scientifique (1 fait surprenant lié au climat/biodiversité)
7. Conseil pratique (1 action concrète pour l'environnement)
8. 4 exercices variés pour tester la compréhension""",
    "en": """LESSON STRUCTURE:
1. Catchy title with emoji (climate/environment related)
2. Introduction (2-3 simple sentences on the topic)
3. Main content (4-6 structured sentences with technical vocabulary)
4. Key vocabulary (3-5 technical terms with simple definitions)
5. Key takeaways (3 factual points)
6. Scientific fact (1 surprising fact related to climate/biodiversity)
7. Practical tip (1 concrete action for the environment)
8. 4 varied exercises to test understanding""",
    "ln": """STRUCTURE YA LEÇON :
1. Titre ya kitoko na emoji (oyo ezali na rapport na climat/environnement)
2. Introduction (2-3 phrases ya pete na sujet)
3. Contenu principal (4-6 phrases structurées na vocabulaire technique)
4. Vocabulaire ya ntina (3-5 termes techniques na définitions ya pete)
5. Points ya ntina ya kokanga (3 points factuels)
6. Fait scientifique (1 likambo ya kokamwa lié na climat/biodiversité)
7. Conseil pratique (1 action concrète pour l'environnement)
8. 4 exercices variés po na komeka compréhension""",
    "sw": """MUUNDO WA SOMO:
1. Kichwa cha kuvutia na emoji (kinachohusiana na hali ya hewa/mazingira)
2. Utangulizi (sentensi 2-3 rahisi juu ya mada)
3. Maudhui kuu (sentensi 4-6 zilizopangwa na istilahi za kiufundi)
4. Msamiati muhimu (istilahi 3-5 za kiufundi na ufafanuzi rahisi)
5. Mambo muhimu ya kukumbuka (mambo 3 ya kweli)
6. Ukweli wa kisayansi (ukweli 1 wa kushangaza kuhusu hali ya hewa/bioanuwai)
7. Ushauri wa vitendo (hatua 1 halisi kwa mazingira)
8. Mazoezi 4 tofauti kupima uelewa""",
}

_UNIQUE_CONTENT_INSTRUCTION = {
    "fr": "INSTRUCTION IMPORTANTE : Génère un contenu NOUVEAU et DIFFÉRENT à chaque fois. Ne répète JAMAIS les mêmes exemples, questions ou exercices d'une leçon à l'autre. Varie les espèces animales, les plantes, les phénomènes climatiques, les écosystèmes abordés. Sois créatif et original. Chaque leçon doit être UNIQUE. Utilise des termes techniques précis : écosystème, biodiversité, biomasse, photosynthèse, cycle de l'eau, effet de serre, espèces endémiques, déforestation, etc.",
    "en": "IMPORTANT INSTRUCTION: Generate NEW and DIFFERENT content every time. NEVER repeat the same examples, questions or exercises across lessons. Vary animal species, plants, climate phenomena, ecosystems. Be creative and original. Each lesson must be UNIQUE. Use precise technical terms: ecosystem, biodiversity, biomass, photosynthesis, water cycle, greenhouse effect, endemic species, deforestation, etc.",
    "ln": "TOLI YA NTINA: Sala contenu YA SIKA mpe DIFFÉRENT mbala na mbala. Kozongisa jamais ba exemples, mituna to exercices ya leçon mosusu. Varier ba espèces ya banyama, banzete, ba phénomènes climatiques, ba écosystèmes. Zala créatif mpe original. Leçon moko moko esengeli kozala UNIQUE. Salela ba termes techniques précis: écosystème, biodiversité, biomasse, photosynthèse, cycle ya mai, effet de serre, espèces endémiques, déforestation, etc.",
    "sw": "MAELEKEZO MUHIMU: Tengeneza maudhui MAPYA na TOFAUTI kila wakati. USIRUDIE mifano, maswali au mazoezi yale yale. Badilisha spishi za wanyama, mimea, matukio ya hali ya hewa, mifumo ya ikolojia. Kuwa mbunifu na wa asili. Kila somo lazima liwe la KIPEKEE. Tumia istilahi sahihi za kiufundi: mfumo wa ikolojia, bioanuwai, biomasi, usanisinuru, mzunguko wa maji, athari ya chafu, spishi za kiasili, ukataji miti, n.k.",
}


def get_lesson_generation_prompt(path_id: str = "biodiversity", unit_number: int = 1, lesson_number: int = 1, language: str = "fr", child_age: int = 8, child_level: int = 1) -> str:
    path_context = _LESSON_PATH_CONTEXT.get(path_id, _LESSON_PATH_CONTEXT["biodiversity"])
    lang_context = path_context.get(language, path_context["fr"])
    path_name = lang_context["name"]; path_description = lang_context["description"]
    unit_name = lang_context["units"].get(unit_number, f"Unité {unit_number}")
    lang_instruction = _LESSON_LANG_INSTRUCTIONS.get(language, _LESSON_LANG_INSTRUCTIONS["fr"])
    structure = _LESSON_STRUCTURE_INSTRUCTIONS.get(language, _LESSON_STRUCTURE_INSTRUCTIONS["fr"])
    unique_instruction = _UNIQUE_CONTENT_INSTRUCTION.get(language, _UNIQUE_CONTENT_INSTRUCTION["fr"])
    lesson_themes = {1: {"fr": "Découverte et concepts de base", "en": "Discovery and basic concepts", "ln": "Découverte mpe concepts ya base", "sw": "Ugunduzi na dhana za msingi"}, 2: {"fr": "Approfondissement et exemples concrets", "en": "Deepening and concrete examples", "ln": "Approfondissement mpe exemples concrets", "sw": "Kina na mifano halisi"}, 3: {"fr": "Application et cas pratiques", "en": "Application and practical cases", "ln": "Application mpe cas pratiques", "sw": "Matumizi na kesi za vitendo"}, 4: {"fr": "Révision et synthèse", "en": "Review and synthesis", "ln": "Révision mpe synthèse", "sw": "Mapitio na muhtasari"}}
    theme = lesson_themes.get(lesson_number, lesson_themes[1]).get(language, lesson_themes[1]["fr"])
    level_adaptation = {"fr": f"Niveau {child_level}/5. Adapte pour un enfant de {child_age} ans.", "en": f"Level {child_level}/5. Adapt for a {child_age}-year-old child.", "ln": f"Niveau {child_level}/5. Adapter po na mwana ya mbula {child_age}.", "sw": f"Kiwango {child_level}/5. Rekebisha kwa mtoto wa miaka {child_age}."}
    level_text = level_adaptation.get(language, level_adaptation["fr"])
    return f"""
Tu es SOMAKID, un enseignant africain expert en climat, biodiversité et environnement.
You are SOMAKID, an expert African teacher in climate, biodiversity and environment.

{lang_instruction}

CONTEXTE :
- Parcours : {path_name} — {path_description}
- Unité {unit_number} : {unit_name}
- Leçon {lesson_number} : {theme}
- {level_text}

{structure}

{unique_instruction}

FORMAT JSON ATTENDU (aucun texte avant ou après) :
{{
  "title": "Titre de la leçon",
  "content": "Contenu principal structuré en paragraphes",
  "summary": "Résumé en 2-3 phrases",
  "key_points": ["Point clé 1", "Point clé 2", "Point clé 3"],
  "vocabulary": [{{"word": "Terme technique", "definition": "Définition simple"}}, {{"word": "Terme technique", "definition": "Définition simple"}}],
  "exercises": [
    {{"exercise_type": "multiple_choice", "question": "Question claire sur le climat/biodiversité", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": 0, "explanation": "Explication complète"}},
    {{"exercise_type": "true_false", "question": "Affirmation scientifique à vérifier", "options": ["Vrai", "Faux"], "correct_answer": "Vrai", "explanation": "Explication complète"}},
    {{"exercise_type": "fill_blank", "question": "Phrase avec _____ à compléter (terme technique)", "correct_answer": "terme manquant", "explanation": "Explication complète"}},
    {{"exercise_type": "open_question", "question": "Question ouverte de réflexion sur l'environnement", "keywords": ["mot clé 1", "mot clé 2"], "explanation": "Éléments de réponse attendus"}}
  ],
  "fun_fact": "Un fait scientifique surprenant sur le climat ou la biodiversité",
  "practical_tip": "Un conseil concret pour protéger l'environnement",
  "emoji": "🌿",
  "estimated_minutes": 5
}}
"""


_EXERCISE_TYPE_INSTRUCTIONS = {
    "multiple_choice": {"fr": "Génère des QCM avec 4 options dont une seule correcte. Questions strictement sur le climat, la biodiversité et l'environnement.", "en": "Generate multiple choice questions with 4 options, only one correct. Questions strictly on climate, biodiversity and environment.", "ln": "Sala ba QCM na 4 options, kaka moko ya solo. Ba questions strictement na climat, biodiversité mpe environnement.", "sw": "Tengeneza maswali ya chaguo nyingi na chaguzi 4, moja tu sahihi. Maswali juu ya hali ya hewa, bioanuwai na mazingira."},
    "true_false": {"fr": "Génère des affirmations scientifiques Vrai ou Faux avec explication. Uniquement sur le climat et l'environnement.", "en": "Generate scientific True or False statements with explanation. Only on climate and environment.", "ln": "Sala ba affirmations scientifiques Vrai to Faux na explication. Kaka na climat mpe environnement.", "sw": "Tengeneza kauli za kisayansi za Kweli au Uongo na maelezo. Kuhusu hali ya hewa na mazingira tu."},
    "fill_blank": {"fr": "Génère des phrases à trous avec un terme technique manquant lié au climat/environnement.", "en": "Generate fill-in-the-blank sentences with a missing technical term related to climate/environment.", "ln": "Sala ba phrases na trous na terme technique moko ya kozanga lié na climat/environnement.", "sw": "Tengeneza sentensi za kujaza nafasi na istilahi ya kiufundi inayohusiana na hali ya hewa/mazingira."},
    "open_question": {"fr": "Génère des questions ouvertes de réflexion sur le climat, la biodiversité et l'environnement.", "en": "Generate open reflection questions on climate, biodiversity and environment.", "ln": "Sala ba mituna ya polele ya réflexion na climat, biodiversité mpe environnement.", "sw": "Tengeneza maswali wazi ya kutafakari juu ya hali ya hewa, bioanuwai na mazingira."},
    "matching": {"fr": "Génère des exercices d'association avec paires liées au climat/environnement.", "en": "Generate matching exercises with pairs related to climate/environment.", "ln": "Sala ba exercices ya kosangisa na ba paires liées na climat/environnement.", "sw": "Tengeneza mazoezi ya kulinganisha na jozi zinazohusiana na hali ya hewa/mazingira."},
    "image_identification": {"fr": "Génère des questions d'identification d'espèces animales ou végétales africaines.", "en": "Generate identification questions for African animal or plant species.", "ln": "Sala ba mituna ya koyeba ba espèces ya banyama to banzete africaines.", "sw": "Tengeneza maswali ya kutambua spishi za wanyama au mimea ya Afrika."},
}

_UNIQUE_EXERCISE_INSTRUCTION = {
    "fr": "IMPORTANT : Ne génère JAMAIS les mêmes questions qu'avant. Sois créatif et varie les thèmes : espèces animales, plantes, phénomènes climatiques, écosystèmes, gestes écologiques. Utilise des termes techniques précis.",
    "en": "IMPORTANT: NEVER generate the same questions as before. Be creative and vary themes: animal species, plants, climate phenomena, ecosystems, eco-friendly actions. Use precise technical terms.",
    "ln": "NTINA: Kosala jamais ba mituna ya kozonga. Zala créatif mpe varier ba thèmes: espèces ya banyama, banzete, ba phénomènes climatiques, ba écosystèmes, ba gestes écologiques. Salela ba termes techniques précis.",
    "sw": "MUHIMU: Kamwe usitengeneze maswali yale yale. Kuwa mbunifu na badilisha mada: spishi za wanyama, mimea, matukio ya hali ya hewa, mifumo ya ikolojia, vitendo vya kiikolojia. Tumia istilahi sahihi za kiufundi.",
}


def get_exercise_generation_prompt(topic: str = "", exercise_type: str = "multiple_choice", count: int = 4, language: str = "fr", difficulty: int = 1, domain: str = "environment") -> str:
    type_instructions = _EXERCISE_TYPE_INSTRUCTIONS.get(exercise_type, _EXERCISE_TYPE_INSTRUCTIONS["multiple_choice"])
    type_instruction = type_instructions.get(language, type_instructions["fr"])
    lang_instruction = _LESSON_LANG_INSTRUCTIONS.get(language, _LESSON_LANG_INSTRUCTIONS["fr"])
    unique_instruction = _UNIQUE_EXERCISE_INSTRUCTION.get(language, _UNIQUE_EXERCISE_INSTRUCTION["fr"])
    difficulty_labels = {"fr": {1: "très facile", 2: "facile", 3: "moyen", 4: "difficile", 5: "expert"}, "en": {1: "very easy", 2: "easy", 3: "medium", 4: "hard", 5: "expert"}, "ln": {1: "facile mingi", 2: "facile", 3: "moyen", 4: "difficile", 5: "expert"}, "sw": {1: "rahisi sana", 2: "rahisi", 3: "wastani", 4: "ngumu", 5: "mtaalamu"}}
    diff_label = difficulty_labels.get(language, difficulty_labels["fr"]).get(difficulty, "moyen")
    identity_block = (
        f"{_HEALTH_IDENTITY_LINE['fr']}\n{_HEALTH_IDENTITY_LINE['en']}"
        if domain == "health" else
        "Tu es SOMAKID, un enseignant africain expert en climat, biodiversité et environnement.\nYou are SOMAKID, an expert African teacher in climate, biodiversity and environment."
    )
    return f"""
{identity_block}

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
- {unique_instruction}

RÉPONDS UNIQUEMENT EN JSON VALIDE :
{{
  "exercises": [
    {{
      "exercise_type": "{exercise_type}",
      "question": "Question claire sur le climat ou la biodiversité",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explication de la bonne réponse",
      "points": 5
    }}
  ]
}}
"""


_UNIT_TEST_LANG_INSTRUCTIONS = {
    "fr": "Génère le test de validation UNIQUEMENT en français. Questions strictement sur le climat, la biodiversité et l'environnement.",
    "en": "Generate the validation test ONLY in English. Questions strictly on climate, biodiversity and environment.",
    "ln": "Sala test ya validation na Lingala KAKA. Ba questions strictement na climat, biodiversité mpe environnement.",
    "sw": "Tengeneza mtihani wa uthibitisho KWA Kiswahili TU. Maswali juu ya hali ya hewa, bioanuwai na mazingira.",
}

_UNIQUE_TEST_INSTRUCTION = {
    "fr": "IMPORTANT : Varie les questions à chaque génération. Couvre différents aspects : écosystèmes, espèces menacées, phénomènes climatiques, gestes écologiques, cycle de l'eau, déforestation, énergies renouvelables. Utilise des termes techniques.",
    "en": "IMPORTANT: Vary questions each generation. Cover different aspects: ecosystems, endangered species, climate phenomena, eco-friendly actions, water cycle, deforestation, renewable energies. Use technical terms.",
    "ln": "NTINA: Varier ba mituna na génération nionso. Couvrir ba aspects différents: ba écosystèmes, ba espèces menacées, ba phénomènes climatiques, ba gestes écologiques, cycle ya mai, déforestation, énergies renouvelables. Salela ba termes techniques.",
    "sw": "MUHIMU: Badilisha maswali kila wakati. Funika vipengele tofauti: mifumo ya ikolojia, spishi zilizo hatarini, matukio ya hali ya hewa, vitendo vya kiikolojia, mzunguko wa maji, ukataji miti, nishati mbadala. Tumia istilahi za kiufundi.",
}


def get_unit_test_prompt(path_id: str = "biodiversity", unit_number: int = 1, language: str = "fr", question_count: int = 10, domain: str = "environment") -> str:
    if domain == "health":
        lang_context = get_health_path_context(path_id, language)
        path_name = lang_context["name"]; unit_name = lang_context["units"].get(unit_number, f"Unit {unit_number}")
    else:
        path_context = _LESSON_PATH_CONTEXT.get(path_id, _LESSON_PATH_CONTEXT["biodiversity"])
        lang_context = path_context.get(language, path_context["fr"])
        path_name = lang_context["name"]; unit_name = lang_context["units"].get(unit_number, f"Unit {unit_number}")
    lang_instruction = _UNIT_TEST_LANG_INSTRUCTIONS.get(language, _UNIT_TEST_LANG_INSTRUCTIONS["fr"])
    unique_instruction = _UNIQUE_TEST_INSTRUCTION.get(language, _UNIQUE_TEST_INSTRUCTION["fr"])
    identity_block = (
        f"{_HEALTH_IDENTITY_LINE['fr']}\n{_HEALTH_IDENTITY_LINE['en']}"
        if domain == "health" else
        "Tu es SOMAKID, un enseignant africain expert en climat, biodiversité et environnement.\nYou are SOMAKID, an expert African teacher in climate, biodiversity and environment."
    )
    return f"""
{identity_block}

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
- {unique_instruction}

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