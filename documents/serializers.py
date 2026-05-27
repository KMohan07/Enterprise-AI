import os
from rest_framework import serializers
from .models import Document


class DocumentUploadSerializer(serializers.ModelSerializer):
    roles = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

    departments = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )

    specific_users = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    class Meta:
        model = Document
        fields = [
            "title",
            "file",
            "roles",
            "departments",
            "specific_users",
        ]

    def validate_file(self, value):
        allowed_extensions = [
            ".pdf",
            ".docx",
            ".txt",
            ".csv",
        ]

        ext = os.path.splitext(
            value.name
        )[1].lower()

        if ext not in allowed_extensions:
            raise serializers.ValidationError(
                "Unsupported file type."
            )

        max_size = 20 * 1024 * 1024

        if value.size > max_size:
            raise serializers.ValidationError(
                "File size exceeds 20MB."
            )

        return value


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id",
            "title",
            "document_type",
            "status",
            "file_size",
            "created_at",
        ]