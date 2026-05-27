from qdrant_client import QdrantClient
from llama_index.vector_stores.qdrant import QdrantVectorStore
from llama_index.embeddings.huggingface import HuggingFaceEmbedding

QDRANT_COLLECTION = "enterprise_documents"

qdrant_client = QdrantClient(
    host="localhost",
    port=6333
)

embedding_model = HuggingFaceEmbedding(
    model_name="BAAI/bge-small-en-v1.5"
)

vector_store = QdrantVectorStore(
    client=qdrant_client,
    collection_name=QDRANT_COLLECTION
)