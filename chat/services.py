from .retrieval import retrieve_chunks
from .llm import generate_answer
from .models import ChatSession, ChatMessage
from .memory import get_conversation_history
from .router import is_memory_question, is_greeting_or_general


def answer_question(question, user, session_id=None):
    if session_id:
        session = ChatSession.objects.get(
            id=session_id,
            user=user
        )
    else:
        session = ChatSession.objects.create(
            user=user,
            company=user.company,
            title=question[:50]
        )

    history = get_conversation_history(session)

    ChatMessage.objects.create(
        session=session,
        sender="user",
        content=question
    )

    if is_greeting_or_general(question):
        answer = generate_answer(
            question=question,
            context="",
            history=history,
            is_general=True
        )

        ChatMessage.objects.create(
            session=session,
            sender="assistant",
            content=answer
        )

        return {
            "session_id": session.id,
            "answer": answer,
            "sources": []
        }

    if is_memory_question(question):
        answer = generate_answer(
            question=question,
            context="",
            history=history
        )

        ChatMessage.objects.create(
            session=session,
            sender="assistant",
            content=answer
        )

        return {
            "session_id": session.id,
            "answer": answer,
            "sources": []
        }

    chunks = retrieve_chunks(question, user)

    if not chunks:
        answer = "I could not find relevant accessible information."

        ChatMessage.objects.create(
            session=session,
            sender="assistant",
            content=answer
        )

        return {
            "session_id": session.id,
            "answer": answer,
            "sources": []
        }

    context = "\n\n".join(
        chunk["text"]
        for chunk in chunks
    )

    answer = generate_answer(
        question=question,
        context=context,
        history=history
    )

    ChatMessage.objects.create(
        session=session,
        sender="assistant",
        content=answer,
        citations=chunks
    )

    return {
        "session_id": session.id,
        "answer": answer,
        "sources": chunks
    }