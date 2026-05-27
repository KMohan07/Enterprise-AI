from django.db import models


class DocumentPermission(models.Model):
    document = models.ForeignKey(
        "documents.Document",
        on_delete=models.CASCADE,
        related_name="permissions"
    )

    role = models.CharField(
        max_length=50,
        null=True,
        blank=True
    )

    department = models.CharField(
        max_length=100,
        null=True,
        blank=True
    )

    specific_user = models.ForeignKey(
        "accounts.User",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="document_permissions"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Permission for {self.document.title}"