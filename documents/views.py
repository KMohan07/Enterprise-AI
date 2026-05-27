from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser
from permissions.models import DocumentPermission
from accounts.models import User
from permissions.permissions import IsAdminOrManager
from .models import Document
from .serializers import (
    DocumentUploadSerializer,
    DocumentSerializer
)
from .tasks import process_document


class DocumentUploadView(APIView):
    permission_classes = [IsAuthenticated, IsAdminOrManager]
    parser_classes = [MultiPartParser]

    def post(self, request):
        serializer = DocumentUploadSerializer(
            data=request.data
        )

        serializer.is_valid(raise_exception=True)

        roles = serializer.validated_data.pop("roles", [])
        departments = serializer.validated_data.pop("departments", [])
        specific_users = serializer.validated_data.pop("specific_users", [])

        document = serializer.save(
            company=request.user.company,
            uploaded_by=request.user,
            file_size=request.FILES["file"].size,
            document_type=request.FILES["file"].name.split(".")[-1].lower(),
            status="uploaded"
        )

        # Manager and admin always have access — ensure it's always added
        for always_role in ["manager", "admin"]:
            if always_role not in roles:
                roles.append(always_role)

        for role in roles:
            DocumentPermission.objects.create(
                document=document,
                role=role
            )

        for dept in departments:
            DocumentPermission.objects.create(
                document=document,
                department=dept
            )

        for user_id in specific_users:
            user = User.objects.get(
                id=user_id,
                company=request.user.company
            )

            DocumentPermission.objects.create(
                document=document,
                specific_user=user
            )

        process_document.delay(document.id)

        return Response({
            "message": "Upload successful",
            "document_id": document.id
        })


class DocumentListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        documents = Document.objects.filter(
            company=request.user.company
        ).order_by("-created_at")

        serializer = DocumentSerializer(
            documents,
            many=True
        )

        return Response(serializer.data)


class DocumentDeleteView(APIView):
    permission_classes = [
        IsAuthenticated,
        IsAdminOrManager
    ]

    def delete(self, request, document_id):
        document = Document.objects.get(
            id=document_id,
            company=request.user.company
        )

        document.delete()

        return Response({
            "message": "Document deleted successfully"
        })