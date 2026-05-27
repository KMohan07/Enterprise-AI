
from django.db import models

def company_upload_path(instance, filename):
    return f"company_{instance.company.id}/docs/{filename}"

class Document(models.Model):

    DOCUMENT_TYPES = [
        ("pdf", "PDF"),
        ("doc", "DOC"),
        ("csv", "CSV"),
    ]

    STATUS_CHOICES = [
    ("uploaded", "Uploaded"),
    ("processing", "Processing"),
    ("parsed", "Parsed"),
    ("indexed", "Indexed"),
    ("failed", "Failed"),
    ]
    company = models.ForeignKey(
        "companies.Company",
        on_delete=models.CASCADE,
        related_name="documents"
    )

    uploaded_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="uploaded_documents"
    )

    # File Info
    title = models.CharField(
        max_length=255
    )

    file = models.FileField(
        upload_to=company_upload_path
    )

    document_type = models.CharField(
        max_length=20,
        choices=DOCUMENT_TYPES
    )

    file_size = models.BigIntegerField(
        null=True,
        blank=True
    )

    # Processing Lifecycle
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="uploaded"
    )

    # Metadata
    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    extracted_text = models.TextField(
    null=True,
    blank=True
    )

    error_message = models.TextField(
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.title} - {self.company.name}"
    
