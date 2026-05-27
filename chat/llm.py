import ollama


def generate_answer(question, context, history, is_general=False):
    if is_general:
        system_content = """
You are a helpful and polite enterprise AI assistant.
Answer the user's greeting or general question friendly and naturally.
"""
    else:
        system_content = """
You are an enterprise AI assistant.

Rules:
1. Answer ONLY from provided context.
2. Use conversation history for continuity.
3. Do NOT hallucinate.
4. If answer unavailable, say:
I could not find relevant accessible information.
"""

    messages = [
        {
            "role": "system",
            "content": system_content
        }
    ]

    for msg in history:
        messages.append(msg)

    messages.append({
        "role": "user",
        "content": f"""
Context:
{context}

Question:
{question}
"""
    })

    response = ollama.chat(
        model="llama3:8b",
        messages=messages
    )

    return response["message"]["content"]