from qdrant_client.models import Filter, FieldCondition, MatchValue, MatchAny

from documents.vector_store import qdrant_client
from documents.vector_store import embedding_model
from documents.vector_store import QDRANT_COLLECTION


def build_permission_filter(user):
    must_conditions = []
    if user.company:
        must_conditions.append(
            FieldCondition(
                key="company_id",
                match=MatchValue(
                    value=str(user.company.id)
                )
            )
        )

    should_conditions = [
        FieldCondition(
            key="allowed_roles",
            match=MatchAny(any=[user.role])
        )
    ]

    if user.department:
        should_conditions.append(
            FieldCondition(
                key="departments",
                match=MatchAny(any=[user.department])
            )
        )

    should_conditions.append(
        FieldCondition(
            key="specific_users",
            match=MatchAny(any=[str(user.id)])
        )
    )

    return Filter(
        must=must_conditions,
        should=should_conditions
    )


def retrieve_chunks(query, user, top_k=5):
    query_vector = embedding_model.get_text_embedding(query)

    permission_filter = build_permission_filter(user)

    results = qdrant_client.query_points(
        collection_name=QDRANT_COLLECTION,
        query=query_vector,
        query_filter=permission_filter,
        limit=top_k
    )

    chunks = []

    for point in results.points:
        chunks.append({
        "score": point.score,
        "text": point.payload.get("window", ""),
        "document": point.payload.get("document_title")
    })

    return chunks