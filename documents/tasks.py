from celery import shared_task

from .models import Document
from .services import extract_document_text
from .indexing import index_document


@shared_task
def process_document(document_id):
    try:
        document = Document.objects.get(id=document_id)

        document.status = "processing"
        document.error_message = None
        document.save()

        # Step 1: Parse
        extracted_text = extract_document_text(document)

        document.extracted_text = extracted_text
        document.status = "parsed"
        document.save()

        # Step 2: Index
        index_document(document)

        document.status = "indexed"
        document.save()

    except Exception as e:
        document = Document.objects.get(id=document_id)

        document.status = "failed"
        document.error_message = str(e)
        document.save()