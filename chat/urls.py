from django.urls import path
from .views import *

urlpatterns = [
    path("ui/", chat_ui),
    path("", ChatView.as_view()),
    path("test-retrieve/", TestRetrieveView.as_view()),
    path("ask/", AskChatView.as_view()),
    path("sessions/", ChatSessionListView.as_view()),
    path("sessions/<int:session_id>/", ChatSessionDetailView.as_view()),
    path("sessions/<int:session_id>/messages/",ChatSessionMessagesView.as_view())
]
