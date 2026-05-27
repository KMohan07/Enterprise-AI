def is_memory_question(question):
    question = question.lower()

    memory_keywords = [
        "previous question",
        "previous message",
        "what did i ask",
        "what was my first question",
        "summarize our chat",
        "summarize conversation",
        "what did we discuss",
        "our conversation",
        "chat summary",
    ]

    return any(
        keyword in question
        for keyword in memory_keywords
    )


def is_greeting_or_general(question):
    q = question.strip().lower().rstrip("?.!")
    
    greetings = {
        "hi", "hello", "hey", "greetings", "hi there", "hello there", "yo", "hola",
        "good morning", "good afternoon", "good evening",
        "how are you", "how are you doing", "how's it going", "how is it going",
        "who are you", "what are you", "what is your name", "tell me about yourself",
        "who made you", "who created you",
        "thank you", "thanks", "thanks a lot", "thank you so much",
        "bye", "goodbye", "help", "what can you do", "what's up", "sup",
        "how can you help me", "what is this"
    }
    
    if q in greetings:
        return True
        
    words = q.split()
    if len(words) <= 3 and words:
        first_word = words[0]
        if first_word in {"hi", "hello", "hey", "thanks", "thank", "goodbye", "bye", "yo"}:
            return True
            
    return False