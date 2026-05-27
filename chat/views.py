from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ChatSession
from django.shortcuts import render
from .serializers import (
    ChatSessionSerializer,
    ChatMessageSerializer
)


class ChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        return Response({
            "message": f"Hello {request.user.email}"
        })
    
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .retrieval import retrieve_chunks


class TestRetrieveView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        query = request.data.get("query")

        chunks = retrieve_chunks(
            query=query,
            user=request.user
        )

        return Response({
            "chunks": chunks
        })

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .services import answer_question


class AskChatView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        question = request.data.get("question")
        session_id = request.data.get("session_id")

        result = answer_question(
            question=question,
            user=request.user,
            session_id=session_id
        )

        return Response(result)
    
class ChatSessionListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sessions = ChatSession.objects.filter(
            user=request.user
        ).order_by("-updated_at")

        serializer = ChatSessionSerializer(
            sessions,
            many=True
        )

        return Response(serializer.data)


class ChatSessionMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, session_id):
        session = ChatSession.objects.get(
            id=session_id,
            user=request.user
        )

        messages = session.messages.all().order_by(
            "created_at"
        )

        serializer = ChatMessageSerializer(
            messages,
            many=True
        )

        return Response(serializer.data)


class ChatSessionDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, session_id):
        try:
            session = ChatSession.objects.get(
                id=session_id,
                user=request.user
            )
            session.delete()
            return Response({"detail": "Chat session deleted successfully."}, status=200)
        except ChatSession.DoesNotExist:
            return Response({"detail": "Chat session not found."}, status=404)
    
def chat_ui(request):
    return render(request, "chat.html")