"""
SOMAKID AI Engine - Health Prompts
AI prompts for generating structured health lessons, exercises, and unit tests.
All prompts support full multilingual output: French, English, Lingala, Swahili.
Content is strictly prevention/hygiene/nutrition/wellbeing education for children —
never diagnosis, never treatment or medication guidance.
"""

from typing import Optional, List, Dict, Any


# =============================================================================
# Category metadata — 14 health categories from the cahier des taches.
# Each has a fixed emoji/color plus fr/en/ln/sw name, description and 3 units.
# =============================================================================

HEALTH_CATEGORY_META: Dict[str, Dict[str, str]] = {
    "hygiene_corporelle":          {"emoji": "🧼", "color": "#2AA9B8"},
    "hygiene_bucco_dentaire":      {"emoji": "🦷", "color": "#3FB8A0"},
    "lavage_mains":                {"emoji": "🖐️", "color": "#2AA9B8"},
    "nutrition":                   {"emoji": "🍎", "color": "#E4A62B"},
    "sante_reproductive_ado":      {"emoji": "🌱", "color": "#3FB8A0"},
    "hygiene_menstruelle":         {"emoji": "🌸", "color": "#D46FB0"},
    "prevention_infections":       {"emoji": "🦠", "color": "#5B7FDB"},
    "vaccination":                 {"emoji": "💉", "color": "#5B7FDB"},
    "premiers_secours":            {"emoji": "🩹", "color": "#D9534F"},
    "sante_mentale":               {"emoji": "🧠", "color": "#8B5CF6"},
    "eau_potable":                 {"emoji": "💧", "color": "#1B9AA0"},
    "prevention_maladies":         {"emoji": "🛡️", "color": "#D9534F"},
    "sante_maternelle_infantile":  {"emoji": "👶", "color": "#E4A62B"},
    "activite_physique":           {"emoji": "🏃", "color": "#E4A62B"},
}

HEALTH_CATEGORY_ORDER: List[str] = list(HEALTH_CATEGORY_META.keys())

_HEALTH_PATH_CONTEXT: Dict[str, Dict[str, Dict[str, Any]]] = {
    "hygiene_corporelle": {
        "fr": {"name": "Hygiene Corporelle", "description": "Prendre soin de son corps chaque jour", "units": {1: "Se laver tous les jours", 2: "Prendre soin de sa peau et ses cheveux", 3: "Des habitudes propres pour la vie"}},
        "en": {"name": "Body Hygiene", "description": "Taking care of your body every day", "units": {1: "Washing every day", 2: "Caring for skin and hair", 3: "Clean habits for life"}},
        "ln": {"name": "Hygiene ya Nzoto", "description": "Kobatela nzoto na yo mokolo na mokolo", "units": {1: "Komisukola mokolo na mokolo", 2: "Kobatela loposo mpe nsuki", 3: "Ba habitudes ya peto po na bomoi"}},
        "sw": {"name": "Usafi wa Mwili", "description": "Kutunza mwili wako kila siku", "units": {1: "Kuoga kila siku", 2: "Kutunza ngozi na nywele", 3: "Tabia safi kwa maisha"}},
    },
    "hygiene_bucco_dentaire": {
        "fr": {"name": "Hygiene Bucco-Dentaire", "description": "Prendre soin de ses dents et de sa bouche", "units": {1: "Pourquoi se brosser les dents", 2: "Bien se brosser matin et soir", 3: "Une bouche en bonne sante"}},
        "en": {"name": "Dental Hygiene", "description": "Caring for your teeth and mouth", "units": {1: "Why brush your teeth", 2: "Brushing well morning and night", 3: "A healthy mouth"}},
        "ln": {"name": "Hygiene ya Minu", "description": "Kobatela minu na monoko na yo", "units": {1: "Mpo na nini kosukola minu", 2: "Kosukola minu malamu tongo na pokwa", 3: "Monoko ya sante malamu"}},
        "sw": {"name": "Usafi wa Meno", "description": "Kutunza meno na kinywa chako", "units": {1: "Kwa nini kupiga mswaki", 2: "Kupiga mswaki vizuri asubuhi na jioni", 3: "Kinywa chenye afya njema"}},
    },
    "lavage_mains": {
        "fr": {"name": "Lavage des Mains", "description": "Se laver les mains pour rester en bonne sante", "units": {1: "Pourquoi se laver les mains", 2: "Les bons moments pour se laver les mains", 3: "Bien se laver les mains avec du savon"}},
        "en": {"name": "Handwashing", "description": "Washing your hands to stay healthy", "units": {1: "Why wash your hands", 2: "The right moments to wash hands", 3: "Washing hands well with soap"}},
        "ln": {"name": "Kosukola Maboko", "description": "Kosukola maboko po na kozala malamu", "units": {1: "Mpo na nini kosukola maboko", 2: "Ba tango ya malamu ya kosukola maboko", 3: "Kosukola maboko malamu na savon"}},
        "sw": {"name": "Kunawa Mikono", "description": "Kunawa mikono ili kukaa na afya njema", "units": {1: "Kwa nini kunawa mikono", 2: "Nyakati sahihi za kunawa mikono", 3: "Kunawa mikono vizuri kwa sabuni"}},
    },
    "nutrition": {
        "fr": {"name": "Nutrition et Alimentation Equilibree", "description": "Bien manger pour grandir en bonne sante", "units": {1: "Les groupes d'aliments", 2: "Composer une assiette equilibree", 3: "Bien manger tous les jours"}},
        "en": {"name": "Nutrition & Balanced Diet", "description": "Eating well to grow up healthy", "units": {1: "Food groups", 2: "Building a balanced plate", 3: "Eating well every day"}},
        "ln": {"name": "Nutrition ya Malamu", "description": "Kolia malamu po na kokola na sante", "units": {1: "Ba groupes ya bilei", 2: "Kotonga plat ya balance", 3: "Kolia malamu mokolo na mokolo"}},
        "sw": {"name": "Lishe Bora", "description": "Kula vizuri ili kukua na afya njema", "units": {1: "Makundi ya chakula", 2: "Kuandaa sahani yenye lishe kamili", 3: "Kula vizuri kila siku"}},
    },
    "sante_reproductive_ado": {
        "fr": {"name": "Sante Reproductive Adaptee aux Adolescents", "description": "Comprendre les changements de son corps en grandissant", "units": {1: "Les changements du corps en grandissant", 2: "Respect de soi et des autres", 3: "A qui en parler en confiance"}},
        "en": {"name": "Teen Reproductive Health", "description": "Understanding the body's changes while growing up", "units": {1: "Body changes as you grow", 2: "Respect for yourself and others", 3: "Who to talk to in confidence"}},
        "ln": {"name": "Sante Reproductive ya Elenge", "description": "Kososola mbongwana ya nzoto tango ozali kokola", "units": {1: "Mbongwana ya nzoto tango okokola", 2: "Respect ya nzoto na yo mpe ya bamosusu", 3: "Nani okoki koloba na ye na confiance"}},
        "sw": {"name": "Afya ya Uzazi kwa Vijana", "description": "Kuelewa mabadiliko ya mwili unapokua", "units": {1: "Mabadiliko ya mwili unapokua", 2: "Heshima kwa nafsi na wengine", 3: "Nani wa kuzungumza naye kwa uaminifu"}},
    },
    "hygiene_menstruelle": {
        "fr": {"name": "Hygiene Menstruelle", "description": "Comprendre et bien vivre les regles", "units": {1: "Que sont les regles", 2: "Bien gerer son hygiene pendant les regles", 3: "Aucune honte, juste des questions"}},
        "en": {"name": "Menstrual Hygiene", "description": "Understanding and managing periods well", "units": {1: "What periods are", 2: "Managing hygiene during periods", 3: "No shame, just questions"}},
        "ln": {"name": "Hygiene ya Sanza", "description": "Kososola mpe kobatela hygiene na tango ya sanza", "units": {1: "Sanza ezali nini", 2: "Kobatela hygiene na tango ya sanza", 3: "Soni te, mituna kaka"}},
        "sw": {"name": "Usafi wa Hedhi", "description": "Kuelewa na kudhibiti hedhi vizuri", "units": {1: "Hedhi ni nini", 2: "Kudhibiti usafi wakati wa hedhi", 3: "Hakuna aibu, maswali tu"}},
    },
    "prevention_infections": {
        "fr": {"name": "Prevention des Infections", "description": "Se proteger des microbes et des infections", "units": {1: "Comment les microbes se transmettent", 2: "Les bons gestes de protection", 3: "Rester en bonne sante tous les jours"}},
        "en": {"name": "Infection Prevention", "description": "Protecting yourself from germs and infections", "units": {1: "How germs spread", 2: "The right protective habits", 3: "Staying healthy every day"}},
        "ln": {"name": "Prevention ya Infections", "description": "Komibatela na microbes mpe infections", "units": {1: "Ndenge microbes epalanganaka", 2: "Ba gestes ya malamu ya protection", 3: "Kozala malamu mokolo na mokolo"}},
        "sw": {"name": "Kinga ya Maambukizi", "description": "Kujikinga na vijidudu na maambukizi", "units": {1: "Jinsi vijidudu vinavyoenea", 2: "Tabia sahihi za kujikinga", 3: "Kukaa na afya njema kila siku"}},
    },
    "vaccination": {
        "fr": {"name": "Vaccination", "description": "Comprendre pourquoi les vaccins protegent", "units": {1: "Qu'est-ce qu'un vaccin", 2: "Pourquoi se faire vacciner", 3: "Le carnet de vaccination"}},
        "en": {"name": "Vaccination", "description": "Understanding why vaccines protect us", "units": {1: "What is a vaccine", 2: "Why get vaccinated", 3: "The vaccination record"}},
        "ln": {"name": "Vaccination", "description": "Kososola mpo na nini vaccin ebatelaka", "units": {1: "Vaccin ezali nini", 2: "Mpo na nini kozwa vaccin", 3: "Mukanda ya vaccination"}},
        "sw": {"name": "Chanjo", "description": "Kuelewa kwa nini chanjo hulinda", "units": {1: "Chanjo ni nini", 2: "Kwa nini kupata chanjo", 3: "Kadi ya chanjo"}},
    },
    "premiers_secours": {
        "fr": {"name": "Premiers Secours", "description": "Savoir reagir face a un petit bobo", "units": {1: "Rester calme et demander de l'aide", 2: "Soigner une petite blessure", 3: "Le materiel de premiers secours"}},
        "en": {"name": "First Aid", "description": "Knowing how to react to a small injury", "units": {1: "Staying calm and asking for help", 2: "Treating a small wound", 3: "First-aid supplies"}},
        "ln": {"name": "Premiers Secours", "description": "Koyeba kosala soki mpota ekomi", "units": {1: "Kozala calme mpe koluka lisungi", 2: "Kobatela mpota ya moke", 3: "Biloko ya premiers secours"}},
        "sw": {"name": "Huduma ya Kwanza", "description": "Kujua la kufanya ukipata jeraha dogo", "units": {1: "Kutulia na kuomba msaada", 2: "Kutibu jeraha dogo", 3: "Vifaa vya huduma ya kwanza"}},
    },
    "sante_mentale": {
        "fr": {"name": "Sante Mentale et Bien-etre", "description": "Prendre soin de ses emotions et de son esprit", "units": {1: "Reconnaitre ses emotions", 2: "Se calmer et se sentir mieux", 3: "Parler a un adulte de confiance"}},
        "en": {"name": "Mental Health & Well-being", "description": "Taking care of your emotions and mind", "units": {1: "Recognising your emotions", 2: "Calming down and feeling better", 3: "Talking to a trusted adult"}},
        "ln": {"name": "Sante ya Makanisi", "description": "Kobatela mayoki mpe makanisi na yo", "units": {1: "Koyeba mayoki na yo", 2: "Komikitisa mpe koyoka malamu", 3: "Koloba na moto ya confiance"}},
        "sw": {"name": "Afya ya Akili na Ustawi", "description": "Kutunza hisia na akili yako", "units": {1: "Kutambua hisia zako", 2: "Kutulia na kujisikia vizuri", 3: "Kuzungumza na mtu mzima wa kuaminika"}},
    },
    "eau_potable": {
        "fr": {"name": "Eau Potable et Assainissement", "description": "Comprendre l'importance de l'eau propre", "units": {1: "Pourquoi boire de l'eau potable", 2: "Rendre l'eau plus sure", 3: "Un environnement propre"}},
        "en": {"name": "Safe Water & Sanitation", "description": "Understanding the importance of clean water", "units": {1: "Why drink safe water", 2: "Making water safer", 3: "A clean environment"}},
        "ln": {"name": "Mai ya Peto", "description": "Kososola ntina ya mai ya peto", "units": {1: "Mpo na nini komela mai ya peto", 2: "Kokomisa mai ya sure", 3: "Environnement ya peto"}},
        "sw": {"name": "Maji Safi na Usafi wa Mazingira", "description": "Kuelewa umuhimu wa maji safi", "units": {1: "Kwa nini kunywa maji safi", 2: "Kufanya maji kuwa salama zaidi", 3: "Mazingira safi"}},
    },
    "prevention_maladies": {
        "fr": {"name": "Prevention des Maladies Courantes", "description": "Se proteger des maladies frequentes comme le paludisme", "units": {1: "Comment se transmettent les maladies courantes", 2: "Se proteger du paludisme", 3: "Adopter les bons reflexes de prevention"}},
        "en": {"name": "Common Disease Prevention", "description": "Protecting yourself from common illnesses like malaria", "units": {1: "How common illnesses spread", 2: "Protecting against malaria", 3: "Good prevention habits"}},
        "ln": {"name": "Prevention ya Maladies", "description": "Komibatela na maladies lokola paludisme", "units": {1: "Ndenge maladies ya mingi epalanganaka", 2: "Komibatela na paludisme", 3: "Kozwa ba reflexes ya malamu ya prevention"}},
        "sw": {"name": "Kinga ya Magonjwa ya Kawaida", "description": "Kujikinga na magonjwa ya kawaida kama malaria", "units": {1: "Jinsi magonjwa ya kawaida yanavyoenea", 2: "Kujikinga na malaria", 3: "Kuchukua tabia nzuri za kinga"}},
    },
    "sante_maternelle_infantile": {
        "fr": {"name": "Sante Maternelle et Infantile", "description": "Comprendre comment on prend soin des bebes et des mamans", "units": {1: "Prendre soin d'un tout-petit", 2: "L'importance des visites de sante", 3: "Aider petits freres et petites soeurs"}},
        "en": {"name": "Maternal & Child Health", "description": "Understanding how babies and mothers are cared for", "units": {1: "Caring for a little one", 2: "The importance of health check-ups", 3: "Helping younger siblings"}},
        "ln": {"name": "Sante ya Mama na Mwana", "description": "Kososola ndenge babatelaka bebe na mama", "units": {1: "Kobatela mwana ya moke", 2: "Ntina ya ba visites ya sante", 3: "Kosunga bandeko ya mike"}},
        "sw": {"name": "Afya ya Mama na Mtoto", "description": "Kuelewa jinsi watoto wachanga na mama wanavyotunzwa", "units": {1: "Kutunza mtoto mchanga", 2: "Umuhimu wa vipimo vya afya", 3: "Kusaidia ndugu wadogo"}},
    },
    "activite_physique": {
        "fr": {"name": "Activite Physique", "description": "Bouger chaque jour pour rester en forme", "units": {1: "Pourquoi bouger tous les jours", 2: "Des jeux et sports pour tous", 3: "Bouger en toute securite"}},
        "en": {"name": "Physical Activity", "description": "Moving every day to stay fit", "units": {1: "Why move every day", 2: "Games and sports for everyone", 3: "Staying active safely"}},
        "ln": {"name": "Sport na Nzoto", "description": "Kosala mouvement mokolo na mokolo po na kozala fort", "units": {1: "Mpo na nini kosala mouvement mokolo na mokolo", 2: "Ba jeux na sports po na bango nyonso", 3: "Kosala sport na securite"}},
        "sw": {"name": "Mazoezi ya Mwili", "description": "Kusonga kila siku ili kukaa na afya", "units": {1: "Kwa nini kusonga kila siku", 2: "Michezo kwa kila mtu", 3: "Kufanya mazoezi kwa usalama"}},
    },
}


def get_health_category_meta(slug: str) -> Dict[str, str]:
    return HEALTH_CATEGORY_META.get(slug, {"emoji": "🩺", "color": "#2AA9B8"})


def get_health_path_context(slug: str, language: str = "fr") -> Dict[str, Any]:
    path = _HEALTH_PATH_CONTEXT.get(slug, _HEALTH_PATH_CONTEXT["hygiene_corporelle"])
    return path.get(language, path["fr"])


_HEALTH_LESSON_LANG_INSTRUCTIONS = {
    "fr": "Genere TOUT le contenu UNIQUEMENT en francais. Utilise des termes simples et justes lies a l'hygiene, la nutrition, la prevention et le bien-etre. Ne pose jamais de diagnostic medical, ne recommande jamais de medicament precis.",
    "en": "Generate ALL content ONLY in English. Use simple, accurate terms related to hygiene, nutrition, prevention and well-being. Never give a medical diagnosis, never recommend a specific medication.",
    "ln": "Sala contenu NYONSO na Lingala KAKA. Salela maloba ya pete mpe ya solo lies na hygiene, nutrition, prevention mpe bien-etre. Opesaka jamais diagnostic medical, otindaka jamais nkisi ya sikisiki.",
    "sw": "Tengeneza maudhui YOTE KWA Kiswahili TU. Tumia maneno rahisi na sahihi kuhusu usafi, lishe, kinga na ustawi. Kamwe usitoe utambuzi wa kitabibu, kamwe usipendekeze dawa maalum.",
}

_HEALTH_LESSON_STRUCTURE_INSTRUCTIONS = {
    "fr": """STRUCTURE DE LA LEÇON :
1. Titre accrocheur avec emoji (lie a la sante/hygiene)
2. Introduction (2-3 phrases simples sur le sujet)
3. Contenu principal (4-6 phrases structurees, prevention et bonnes pratiques)
4. Vocabulaire cle (3-5 termes simples avec definitions claires)
5. Points importants a retenir (3 points factuels)
6. Fait interessant (1 fait surprenant lie a la sante)
7. Conseil pratique (1 geste concret et sur a adopter au quotidien)
8. 4 exercices varies pour tester la comprehension""",
    "en": """LESSON STRUCTURE:
1. Catchy title with emoji (health/hygiene related)
2. Introduction (2-3 simple sentences on the topic)
3. Main content (4-6 structured sentences, prevention and good practices)
4. Key vocabulary (3-5 simple terms with clear definitions)
5. Key takeaways (3 factual points)
6. Interesting fact (1 surprising health-related fact)
7. Practical tip (1 concrete, safe daily habit)
8. 4 varied exercises to test understanding""",
    "ln": """STRUCTURE YA LEÇON :
1. Titre ya kitoko na emoji (oyo ezali na rapport na sante/hygiene)
2. Introduction (2-3 phrases ya pete na sujet)
3. Contenu principal (4-6 phrases structurees, prevention na ba bonnes pratiques)
4. Vocabulaire ya ntina (3-5 termes ya pete na ba definitions ya polele)
5. Points ya ntina ya kokanga (3 points factuels)
6. Likambo ya kosepelisa (1 likambo ya kokamwa lie na sante)
7. Conseil pratique (1 geste ya concret mpe ya sure ya kosala mokolo na mokolo)
8. 4 exercices varies po na komeka comprehension""",
    "sw": """MUUNDO WA SOMO:
1. Kichwa cha kuvutia na emoji (kinachohusiana na afya/usafi)
2. Utangulizi (sentensi 2-3 rahisi juu ya mada)
3. Maudhui kuu (sentensi 4-6 zilizopangwa, kinga na mazoea mazuri)
4. Msamiati muhimu (istilahi 3-5 rahisi na ufafanuzi wazi)
5. Mambo muhimu ya kukumbuka (mambo 3 ya kweli)
6. Ukweli wa kuvutia (ukweli 1 wa kushangaza kuhusu afya)
7. Ushauri wa vitendo (tabia 1 halisi na salama ya kila siku)
8. Mazoezi 4 tofauti kupima uelewa""",
}

_UNIQUE_HEALTH_CONTENT_INSTRUCTION = {
    "fr": "INSTRUCTION IMPORTANTE : Genere un contenu NOUVEAU et DIFFERENT a chaque fois. Ne repete JAMAIS les memes exemples, questions ou exercices d'une lecon a l'autre. Varie les angles (routine quotidienne, situations concretes, questions d'enfants). Sois creatif, rassurant et jamais alarmiste. Chaque lecon doit etre UNIQUE.",
    "en": "IMPORTANT INSTRUCTION: Generate NEW and DIFFERENT content every time. NEVER repeat the same examples, questions or exercises across lessons. Vary the angle (daily routine, concrete situations, children's questions). Be creative, reassuring and never alarmist. Each lesson must be UNIQUE.",
    "ln": "TOLI YA NTINA: Sala contenu YA SIKA mpe DIFFERENT mbala na mbala. Kozongisa jamais ba exemples, mituna to exercices ya leçon mosusu. Varier ba angles (routine ya mokolo, ba situations concretes, mituna ya bana). Zala creatif, oyo ekitisaka motema, alarmiste te.",
    "sw": "MAELEKEZO MUHIMU: Tengeneza maudhui MAPYA na TOFAUTI kila wakati. USIRUDIE mifano, maswali au mazoezi yale yale. Badilisha mtazamo (utaratibu wa kila siku, hali halisi, maswali ya watoto). Kuwa mbunifu, wa kutuliza, na kamwe usiogofye.",
}


def get_health_lesson_generation_prompt(path_id: str = "hygiene_corporelle", unit_number: int = 1, lesson_number: int = 1, language: str = "fr", child_age: int = 8, child_level: int = 1) -> str:
    from .prompts import _identity, _rules

    lang_context = get_health_path_context(path_id, language)
    path_name = lang_context["name"]; path_description = lang_context["description"]
    unit_name = lang_context["units"].get(unit_number, f"Unite {unit_number}")
    lang_instruction = _HEALTH_LESSON_LANG_INSTRUCTIONS.get(language, _HEALTH_LESSON_LANG_INSTRUCTIONS["fr"])
    structure = _HEALTH_LESSON_STRUCTURE_INSTRUCTIONS.get(language, _HEALTH_LESSON_STRUCTURE_INSTRUCTIONS["fr"])
    unique_instruction = _UNIQUE_HEALTH_CONTENT_INSTRUCTION.get(language, _UNIQUE_HEALTH_CONTENT_INSTRUCTION["fr"])
    lesson_themes = {1: {"fr": "Decouverte et notions de base", "en": "Discovery and basic concepts", "ln": "Découverte mpe ba notions ya base", "sw": "Ugunduzi na dhana za msingi"}, 2: {"fr": "Bonnes pratiques au quotidien", "en": "Good daily practices", "ln": "Ba bonnes pratiques ya mokolo na mokolo", "sw": "Mazoea mazuri ya kila siku"}, 3: {"fr": "Mise en application concrete", "en": "Putting it into practice", "ln": "Application concrete", "sw": "Kutumia kwa vitendo"}}
    theme = lesson_themes.get(lesson_number, lesson_themes[1]).get(language, lesson_themes[1]["fr"])
    level_adaptation = {"fr": f"Niveau {child_level}/5. Adapte pour un enfant de {child_age} ans.", "en": f"Level {child_level}/5. Adapt for a {child_age}-year-old child.", "ln": f"Niveau {child_level}/5. Adapter po na mwana ya mbula {child_age}.", "sw": f"Kiwango {child_level}/5. Rekebisha kwa mtoto wa miaka {child_age}."}
    level_text = level_adaptation.get(language, level_adaptation["fr"])
    return f"""{_identity(language, "health")}
{_rules(language, "health")}

CONTEXTE :
- Parcours : {path_name} — {path_description}
- Unite {unit_number} : {unit_name}
- Lecon {lesson_number} : {theme}
- {level_text}

{lang_instruction}

{structure}

{unique_instruction}

FORMAT JSON ATTENDU (aucun texte avant ou apres) :
{{
  "title": "Titre de la lecon",
  "content": "Contenu principal structure en paragraphes",
  "summary": "Resume en 2-3 phrases",
  "key_points": ["Point cle 1", "Point cle 2", "Point cle 3"],
  "vocabulary": [{{"word": "Terme simple", "definition": "Definition claire"}}, {{"word": "Terme simple", "definition": "Definition claire"}}],
  "exercises": [
    {{"exercise_type": "multiple_choice", "question": "Question claire sur l'hygiene/la sante", "options": ["Option A", "Option B", "Option C", "Option D"], "correct_answer": 0, "explanation": "Explication complete"}},
    {{"exercise_type": "true_false", "question": "Affirmation a verifier sur la sante", "options": ["Vrai", "Faux"], "correct_answer": "Vrai", "explanation": "Explication complete"}},
    {{"exercise_type": "fill_blank", "question": "Phrase avec _____ a completer (terme simple)", "correct_answer": "terme manquant", "explanation": "Explication complete"}},
    {{"exercise_type": "open_question", "question": "Question ouverte de reflexion sur la sante", "keywords": ["mot cle 1", "mot cle 2"], "explanation": "Elements de reponse attendus"}}
  ],
  "fun_fact": "Un fait interessant et rassurant sur la sante",
  "practical_tip": "Un conseil concret et sur pour la vie de tous les jours",
  "emoji": "{get_health_category_meta(path_id)['emoji']}",
  "estimated_minutes": 5
}}
"""


# =============================================================================
# Health challenges catalog (défis) — item 7 of the cahier des taches.
# =============================================================================

HEALTH_CHALLENGES: List[Dict[str, Any]] = [
    {
        "id": "handwashing_7_days",
        "target_metric": "handwashing_days",
        "target_value": 7,
        "points": 50,
        "emoji": "🖐️",
        "title": {"fr": "Se laver les mains correctement pendant 7 jours", "en": "Wash your hands properly for 7 days", "ln": "Kosukola maboko malamu mikolo 7", "sw": "Nawa mikono vizuri kwa siku 7"},
        "description": {"fr": "Marque chaque jour ou tu te laves bien les mains avec du savon.", "en": "Mark each day you wash your hands well with soap.", "ln": "Komela mokolo na mokolo soki osukoli maboko malamu na savon.", "sw": "Weka alama kila siku unaponawa mikono vizuri kwa sabuni."},
    },
    {
        "id": "brushing_am_pm",
        "target_metric": "brushing_sessions",
        "target_value": 14,
        "points": 40,
        "emoji": "🦷",
        "title": {"fr": "Brosser ses dents matin et soir", "en": "Brush your teeth morning and evening", "ln": "Kosukola minu tongo na pokwa", "sw": "Piga mswaki asubuhi na jioni"},
        "description": {"fr": "Brosse tes dents 2 fois par jour pendant une semaine.", "en": "Brush your teeth twice a day for a week.", "ln": "Sukola minu mbala mibale na mokolo pona wiki mobimba.", "sw": "Piga mswaki mara mbili kwa siku kwa wiki nzima."},
    },
    {
        "id": "sort_healthy_foods",
        "target_metric": "activity_completed",
        "target_value": 1,
        "points": 20,
        "emoji": "🥗",
        "title": {"fr": "Trier les aliments sains", "en": "Sort the healthy foods", "ln": "Kokabola bilei ya malamu", "sw": "Panga vyakula vyenye afya"},
        "description": {"fr": "Termine l'activite de tri des aliments sains.", "en": "Complete the healthy foods sorting activity.", "ln": "Silisa activite ya kokabola bilei ya malamu.", "sw": "Maliza shughuli ya kupanga vyakula vyenye afya."},
    },
    {
        "id": "spot_vitamin_foods",
        "target_metric": "activity_completed",
        "target_value": 1,
        "points": 20,
        "emoji": "🍊",
        "title": {"fr": "Identifier les aliments riches en vitamines", "en": "Spot the vitamin-rich foods", "ln": "Koyeba bilei ya vitamines mingi", "sw": "Tambua vyakula vyenye vitamini nyingi"},
        "description": {"fr": "Trouve les aliments les plus riches en vitamines.", "en": "Find the foods richest in vitamins.", "ln": "Luka bilei oyo ezali na vitamines mingi.", "sw": "Tafuta vyakula vyenye vitamini nyingi zaidi."},
    },
    {
        "id": "prevention_quiz",
        "target_metric": "health_quiz_completed",
        "target_value": 1,
        "points": 25,
        "emoji": "🛡️",
        "title": {"fr": "Repondre a un quiz prevention", "en": "Answer a prevention quiz", "ln": "Kozongisa quiz ya prevention", "sw": "Jibu maswali ya kinga"},
        "description": {"fr": "Termine un quiz sur la prevention des maladies.", "en": "Complete a quiz on disease prevention.", "ln": "Silisa quiz moko na prevention ya maladies.", "sw": "Maliza jaribio kuhusu kinga ya magonjwa."},
    },
]


def get_health_challenges(language: str = "fr") -> List[Dict[str, Any]]:
    result = []
    for ch in HEALTH_CHALLENGES:
        result.append({
            "id": ch["id"],
            "target_metric": ch["target_metric"],
            "target_value": ch["target_value"],
            "points": ch["points"],
            "emoji": ch["emoji"],
            "title": ch["title"].get(language, ch["title"]["fr"]),
            "description": ch["description"].get(language, ch["description"]["fr"]),
        })
    return result
