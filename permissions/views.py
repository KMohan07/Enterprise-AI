from rest_framework.views import APIView
from rest_framework.response import Response
from permissions.permissions import IsAdminOrManager


class DocumentUploadView(APIView):
    permission_classes = [IsAdminOrManager]

    def post(self, request):
        return Response({
            "message": "Document upload allowed"
        })