@router.post("/message-audio")
@limiter.limit("20/minute")
async def send_message_audio(
    request: Request, 
    body: ChatMessageRequest,
    memory_repo: MemoryRepository = Depends(get_memory_repository)
):
    """
    Envoie un message et reçoit une réponse AUDIO directement de Gemini.
    Utilise gemini-2.0-flash-exp pour génération audio native.
    """
    try:
        from ...services.gemini_client import GeminiClient
        
        session_id = body.identifiant_session or body.session_id or f"session_{int(time.time())}"
        
        # Récupérer l'historique
        history = body.historique or body.history or []
        
        # Construire le prompt avec contexte
        system_prompt = f"""Tu es SOMA, un tuteur IA bienveillant pour enfants en RDC.
        Tu parles {body.langue}. Réponds de manière courte, claire et adaptée aux enfants (8-12 ans).
        Tu es expert en biodiversité, climat et environnement.
        Sois encourageant, positif et utilise des mots simples.
        N'utilise JAMAIS d'emoji, de caractères spéciaux ou de formatage.
        Réponds comme si tu parlais directement à l'enfant, avec une voix douce et chaleureuse."""
        
        full_prompt = f"{system_prompt}\n\n"
        
        # Ajouter l'historique récent
        if history:
            full_prompt += "Historique de la conversation:\n"
            for msg in history[-6:]:
                full_prompt += f"{msg.get('role', 'user')}: {msg.get('content', '')}\n"
        
        full_prompt += f"\nEnfant: {body.message}\nSOMA:"
        
        # Initialiser Gemini client
        gemini_client = GeminiClient(api_key=settings.GEMINI_API_KEY)
        
        # Générer texte + audio
        response_text, audio_base64 = await gemini_client.generate_with_audio(
            prompt=full_prompt,
            language=body.langue,
            temperature=0.7,
            max_tokens=200
        )
        
        if not response_text:
            response_text = "Je suis désolé, je n'ai pas bien compris. Peux-tu répéter ta question ?"
        
        # Sauvegarder l'historique
        updated_history = history + [
            {"role": "user", "content": body.message},
            {"role": "assistant", "content": response_text}
        ]
        
        asyncio.create_task(asyncio.to_thread(
            memory_repo.save_progress,
            f"chat_history:{session_id}",
            {"messages": updated_history[-100:], "updated_at": time.time()},
        ))
        
        return JSONResponse(content={
            "success": True,
            "data": {
                "reponse": response_text,
                "audio_base64": audio_base64 or "",
                "points_gagnes": 5
            },
            "history_length": len(updated_history),
            "session_id": session_id,
        })
        
    except Exception as e:
        logger.error("message_audio_error", error=str(e))
        return JSONResponse(content={
            "success": False,
            "error": str(e),
            "data": {"reponse": "Désolé, une erreur technique s'est produite.", "audio_base64": ""}
        }, status_code=500)