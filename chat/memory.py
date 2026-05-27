from .models import ChatMessage


def get_conversation_history(session, limit=10):
    messages = ChatMessage.objects.filter(
        session=session
    ).order_by("-created_at")[:limit]

    messages = reversed(messages)

    history = []

    for msg in messages:
        history.append({
            "role": msg.sender,
            "content": msg.content
        })

    return history