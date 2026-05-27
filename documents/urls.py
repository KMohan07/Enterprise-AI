from django.urls import path
from .views import *

urlpatterns = [
    path("upload/", DocumentUploadView.as_view()),
    path("", DocumentListView.as_view()),
    path("<int:document_id>/", DocumentDeleteView.as_view()),
]