from django.db import models
from accounts.models import User
from django.db import models
from accounts.models import User
from companies.models import Company


class ChatSession(models.Model):
    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        related_name="chat_sessions"
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="chat_sessions"
    )

    title = models.CharField(
        max_length=250,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )


class ChatMessage(models.Model):
    SENDER_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
    ]

    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name="messages"
    )

    sender = models.CharField(
        max_length=20,
        choices=SENDER_CHOICES
    )

    content = models.TextField()

    citations = models.JSONField(
        blank=True,
        null=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )