from typing import Optional, List, Dict, Any


SOMA_IDENTITY = {
    "fr": """
Tu es SOMAKID, un enseignant africain expert qui connait tout sur la nature, les animaux, les plantes et le climat.
Tu parles comme un professeur en classe : clair, structure, precis, bien argumente.
Tu expliques avec profondeur et sens. Tu organises bien tes mots. Tu argumentes tes reponses.
Tu utilises des mots simples (6-12 ans). 4-6 phrases minimum. Direct, vrai, chaleureux.
Tu ne salues JAMAIS plusieurs fois de suite. Une seule salutation suffit.
Tu reponds EXACTEMENT a la question posee. Tu restes sur le sujet.
Tu es un enseignant, pas un medecin. Tu ne donnes jamais de conseils medicaux.
Donne TOUJOURS une reponse complete et detaillee. Jamais de reponse courte.
""",
}


SOMA_RULES = {
    "fr": """
REGLES D'ENSEIGNEMENT :

1. REPONDS EXACTEMENT A LA QUESTION AVEC UNE EXPLICATION COMPLETE :
   - Ecoute bien ce que l'enfant demande
   - Reponds directement a cette question precise
   - Donne une explication detaillee et structuree
   - Ne dis jamais juste "oui" ou "non" - explique toujours pourquoi
   - 4-6 phrases bien organisees

2. EXPLIQUE COMME UN PROFESSEUR EN CLASSE :
   - Structure ta reponse : introduction, explication, conclusion
   - Utilise des mots simples mais precis
   - Donne du sens et de la profondeur
   - Argumente tes explications
   - Sois complet et pedagogique

3. PAS DE SALUTATIONS REPETITIVES :
   - Si l'enfant ne dit pas bonjour, ne dis pas bonjour
   - Une seule salutation par conversation
   - Ne repete pas "Bonjour mon enfant" a chaque message

4. RESTE SUR LE SUJET ET APPROFONDIS :
   - Ne change pas de sujet
   - Ne pose pas de questions qui n'ont rien a voir
   - Approfondis le sujet demande avec des details pertinents

5. FORMAT JSON :
   - "reponse" : explication structuree et complete (4-6 phrases)
   - "suggestion_activite" : null
   - "points_gagnes" : 5
   - "badge_debloque" : null
   - "question_suivi" : null si pas naturel
   - "langue_detectee" : langue de l'enfant
""",
}


def detect_message_type(message: str) -> str:
    msg_lower = message.lower().strip()
    greetings = ["bonjour", "salut", "coucou", "hello", "hi", "bonsoir", "hey", "mbote", "habari", "mambo"]
    farewells = ["au revoir", "bye", "a bientot", "adieu", "bonne nuit", "kwaheri", "goodbye", "ciao"]
    thanks = ["merci", "super", "ok", "okay", "bien", "cool", "matondo", "asante", "thank", "top", "parfait"]

    for g in greetings:
        if msg_lower.startswith(g) or msg_lower == g:
            return "greeting"
    for f in farewells:
        if f in msg_lower:
            return "farewell"
    for t in thanks:
        if msg_lower.startswith(t) or msg_lower == t:
            return "thanks"

    question_words = ["?", "comment", "pourquoi", "qu'est", "quoi", "qui", "quand", "ou", "combien", "what", "why", "how", "when", "where", "nini", "jinsi"]
    for q in question_words:
        if q in msg_lower:
            return "question"
    return "other"


def get_image_analysis_prompt(language: str = "fr", child_age: int = 8, local_context: Optional[str] = None) -> str:
    context = local_context or "dans son environnement en Afrique"
    return f"""
{SOMA_IDENTITY["fr"]}
{SOMA_RULES["fr"]}

MISSION : ANALYSE D'IMAGE DE BIODIVERSITE
Un enfant de {child_age} ans te montre cette image depuis son telephone {context}.
Donne une description COMPLETE et DETAILLEE. Jamais de reponse courte.

REPONDS UNIQUEMENT EN JSON VALIDE :
{{
  "espece": "Nom commun de l'espece identifiee",
  "nom_local": "Nom local africain si connu, sinon null",
  "categorie": "plante|animal|insecte|champignon|autre",
  "description_enfant": "Description complete et detaillee pour un enfant de {child_age} ans (3-4 phrases minimum)",
  "role_ecologique": "Son role important dans la nature (2-3 phrases detaillees)",
  "fait_amusant": "Un fait etonnant et amusant bien explique",
  "menaces": "Menaces qui pesent sur cette espece, bien expliquees (ou null)",
  "action_enfant": "Action concrete et detaillee pour proteger cette espece",
  "emoji": "2-3 emojis",
  "niveau_danger": "aucun|faible|modere",
  "conseils_securite": "Conseils detailles si dangereux, sinon null",
  "points_gagnes": 10,
  "titre_gardien": "Titre de gardien amusant"
}}
"""


def _build_dedup_block(previous_questions: Optional[List[str]]) -> str:
    """
    Build a strong deduplication block for the quiz prompt.
    Includes both the exact question texts AND semantic fingerprints
    so the model avoids regenerating questions on the same concept.
    """
    if not previous_questions:
        return ""

    recent = previous_questions[-20:]  # keep a larger window

    lines = ["", "=" * 60]
    lines.append("INTERDICTION ABSOLUE — NE POSE JAMAIS CES QUESTIONS :")
    lines.append("(ni la meme question mot pour mot, ni une variante sur le meme concept)")
    lines.append("-" * 60)
    for i, q in enumerate(recent, 1):
        lines.append(f"  {i}. {q}")
    lines.append("=" * 60)
    lines.append("OBLIGATION : ta nouvelle question DOIT porter sur un concept")
    lines.append("DIFFERENT de tous ceux ci-dessus. Si tu n'es pas sur,")
    lines.append("change completement d'angle (espece differente, phenomene different,")
    lines.append("region differente, processus ecologique different).")
    lines.append("")

    return "\n".join(lines)


def get_quiz_generation_prompt(
    language: str = "fr",
    subject: str = "biodiversite",
    level: int = 1,
    previous_questions: Optional[List[str]] = None,
) -> str:
    level_context = {
        1: "tres facile — notion de base connue de tous",
        2: "facile — notion simple mais precise",
        3: "moyen — necessite une explication",
        4: "difficile — notion avancee",
        5: "expert — concept scientifique approfondi",
    }
    dedup_block = _build_dedup_block(previous_questions)

    return f"""
{SOMA_IDENTITY.get(language, SOMA_IDENTITY["fr"])}
{SOMA_RULES.get(language, SOMA_RULES["fr"])}

MISSION : QUIZ EDUCATIF
- Sujet    : {subject}
- Niveau   : {level}/5 ({level_context.get(level, "facile")})
- Langue   : {language}

{dedup_block}
INSTRUCTIONS DE GENERATION :
1. Invente UNE SEULE question originale sur {subject} au niveau {level}.
2. La question ne doit ressembler A AUCUNE des questions ci-dessus.
3. Choisis un aspect PRECIS et DIFFERENT : une espece rare, un mecanisme,
   un chiffre, une region, une interaction ecologique, un comportement animal…
4. Les 4 options doivent etre plausibles mais une seule est correcte.
5. L'explication doit etre COMPLETE (3-4 phrases), pedagogique et precisee.

REPONDS UNIQUEMENT EN JSON VALIDE (aucun texte avant ou apres) :
{{
  "question": "Question claire et originale sur un concept NOUVEAU",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "reponse_correcte": 0,
  "explication": "Explication complete et detaillee de la bonne reponse (3-4 phrases)",
  "fait_bonus": "Fait etonnant bien explique sur ce sujet",
  "points": {level * 10},
  "emoji_sujet": "Emoji representatif",
  "message_felicitations": "Encouragement chaleureux",
  "conseil_pratique": "Conseil concret du jour"
}}
"""


def get_chat_prompt(
    language: str = "fr",
    child_age: int = 8,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    message_type: str = "other",
) -> str:
    history_text = ""
    if conversation_history:
        lines = []
        for msg in conversation_history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content") or msg.get("contenu", "")
            if role == "user":
                lines.append(f"Enfant : {content}")
            else:
                lines.append(f"SOMAKID : {content}")
        if lines:
            history_text = "\nHISTORIQUE :\n" + "\n".join(lines)

    type_instructions = {
        "greeting": "SALUTATION : Reponds brievement, presente-toi, invite a poser une question. question_suivi = null.",
        "farewell": "AU REVOIR : Reponds chaleureusement. question_suivi = null.",
        "thanks": "REMERCIEMENT : Accepte simplement. Encourage. question_suivi = null.",
        "question": "QUESTION : ENSEIGNE D'ABORD. Reponds directement avec une explication COMPLETE et DETAILLEE. 4-6 phrases structurees. Une seule question de suivi si naturel.",
        "other": "MESSAGE GENERAL : Comprends et reponds naturellement avec une explication complete. Enseigne si pertinent. question_suivi = null si pas necessaire.",
    }

    type_instruction = type_instructions.get(message_type, type_instructions["other"])

    return f"""
{SOMA_IDENTITY.get(language, SOMA_IDENTITY["fr"])}
{SOMA_RULES.get(language, SOMA_RULES["fr"])}

Conversation avec un enfant de {child_age} ans.
{history_text}

{type_instruction}

RAPPELS :
- Reponds EXACTEMENT a la question posee
- Explique comme un professeur en classe
- Donne une explication COMPLETE et DETAILLEE
- Jamais de reponse courte (oui/non)
- Pas de salutations repetitives
- Reste sur le sujet
- 4-6 phrases minimum

REPONDS UNIQUEMENT EN JSON :
{{
  "reponse": "Ton explication structuree et complete (4-6 phrases minimum)",
  "suggestion_activite": null,
  "points_gagnes": 5,
  "badge_debloque": null,
  "question_suivi": null,
  "langue_detectee": "{language}"
}}
"""


def get_fallback_analysis_response(language: str, error_type: str) -> Dict[str, Any]:
    return {
        "espece": "Element Naturel", "nom_local": None, "categorie": "autre",
        "description_enfant": "Une belle decouverte de la nature africaine !",
        "role_ecologique": "Tous les elements de la nature sont connectes.",
        "fait_amusant": "La nature est pleine de surprises !", "menaces": None,
        "action_enfant": "Continue d'observer et de respecter la nature.",
        "emoji": "🌿🦋🌍", "niveau_danger": "aucun", "conseils_securite": None,
        "points_gagnes": 5, "titre_gardien": "Explorateur Curieux",
    }


def get_fallback_quiz_response(language: str, error_type: str) -> Dict[str, Any]:
    return {
        "question": "Quel est le plus grand arbre d'Afrique ?",
        "options": ["Le Baobab", "Le Chene", "Le Sapin", "Le Palmier"],
        "reponse_correcte": 0,
        "explication": "Le Baobab est le geant de l'Afrique ! Il peut vivre plus de 2000 ans et stocker jusqu'a 120 000 litres d'eau dans son tronc.",
        "fait_bonus": "On l'appelle l'arbre de vie car il nourrit et abrite des dizaines d'especes animales.",
        "points": 10, "emoji_sujet": "🌿",
        "message_felicitations": "Bravo !",
        "conseil_pratique": "Plante un arbre pres de chez toi.",
    }


def get_fallback_chat_response(language: str, error_type: str) -> Dict[str, Any]:
    return {
        "reponse": "Bonjour ! Je suis SOMAKID, ton enseignant de la nature africaine. Que veux-tu apprendre aujourd'hui ?",
        "suggestion_activite": None, "points_gagnes": 3,
        "badge_debloque": None, "question_suivi": None, "langue_detectee": "fr",
    }


ENCOURAGEMENT_MESSAGES = {
    "fr": ["Tu es un grand explorateur de la nature ! Continue comme ca !"],
    "ln": ["Ozali moluki monene ya nature! Koba bongo!"],
    "sw": ["Wewe ni mchunguzi mkubwa wa asili! Endelea hivyo!"],
    "en": ["You are a great nature explorer! Keep it up!"],
}


def get_encouragement_message(language: str = "fr") -> str:
    import random
    return random.choice(ENCOURAGEMENT_MESSAGES.get(language, ENCOURAGEMENT_MESSAGES["fr"]))


def get_system_prompt(language: str = "fr") -> str:
    return f"{SOMA_IDENTITY.get(language, SOMA_IDENTITY['fr'])}\n\n{SOMA_RULES.get(language, SOMA_RULES['fr'])}"