from llama_index.core import Document as LlamaDocument
from llama_index.core import VectorStoreIndex
from llama_index.core import StorageContext

from permissions.models import DocumentPermission

from .vector_store import vector_store
from .chunking import node_parser
from .vector_store import embedding_model


def build_document_metadata(document):
    permissions = DocumentPermission.objects.filter(
        document=document
    )

    roles = []
    departments = []
    users = []

    for perm in permissions:
        if perm.role:
            roles.append(perm.role)

        if perm.department:
            departments.append(perm.department)

        if perm.specific_user:
            users.append(str(perm.specific_user.id))

    return {
        "company_id": str(document.company.id),
        "document_id": str(document.id),
        "document_title": document.title,
        "allowed_roles": roles,
        "departments": departments,
        "specific_users": users,
    }


def index_document(document):
    metadata = build_document_metadata(document)

    llama_doc = LlamaDocument(
        text=document.extracted_text,
        metadata=metadata
    )

    nodes = node_parser.get_nodes_from_documents(
        [llama_doc]
    )

    storage_context = StorageContext.from_defaults(
        vector_store=vector_store
    )

    VectorStoreIndex(
        nodes=nodes,
        storage_context=storage_context,
        embed_model=embedding_model
    )