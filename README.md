# 🤖 Enterprise AI Assistant

A **multi-tenant, role-aware RAG (Retrieval-Augmented Generation) platform** built with Django REST Framework. Each company gets its own isolated AI assistant that answers questions strictly from its own uploaded documents — with fine-grained access control at the role, department, and user level.

---

## ✨ Features

- 🏢 **Multi-tenant architecture** — complete data isolation per company
- 🔐 **Role-based access control** — Admin, Manager, Employee, Customer
- 📄 **Document ingestion pipeline** — upload PDFs, DOCs, and CSVs; auto-parsed, chunked, and vector-indexed
- 🧠 **RAG-powered chat** — answers grounded in company documents, no hallucinations
- 🗂️ **Permission-aware retrieval** — documents scoped by role, department, or specific user
- 💬 **Persistent chat sessions** — full message history with citations
- ⚙️ **Async document processing** — Celery + Redis background task queue
- 🔑 **JWT authentication** — secure stateless API with token refresh

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    Django REST API                    │
├──────────┬──────────┬────────────┬────────────────────┤
│ accounts │companies │  documents │       chat         │
│          │          │            │                    │
│ JWT Auth │ Multi-   │ Upload →   │ RAG Pipeline       │
│ Roles    │ Tenant   │ Parse →    │ Retrieval →        │
│ Approval │ Isolation│ Chunk →    │ LLM (Ollama) →     │
│          │          │ Embed →    │ Citations          │
│          │          │ Index      │                    │
└──────────┴──────────┴─────┬──────┴────────────────────┘
                            │
              ┌─────────────┴──────────────┐
              │                            │
        ┌─────▼──────┐            ┌────────▼───────┐
        │   Qdrant   │            │     Ollama     │
        │ Vector DB  │            │  llama3:8b LLM │
        └────────────┘            └────────────────┘
              │
        ┌─────▼──────┐
        │  BAAI/bge  │
        │ Embeddings │
        └────────────┘
```

---

## 🗂️ Project Structure

```
enterprice_ai/
├── accounts/          # Custom user model, JWT auth, role management
├── companies/         # Company (tenant) model
├── documents/         # Document upload, parsing, chunking, vector indexing
├── chat/              # Chat sessions, RAG retrieval, LLM integration
├── permissions/       # Document-level access control
├── rag/               # RAG utilities
├── core/              # Dashboard UI entry point
├── static/            # CSS & JS frontend assets
├── templates/         # Django HTML templates (login, dashboard)
├── enterprice_ai/     # Django project settings, URLs, Celery config
├── requirements.txt
└── setup.bat          # Windows one-click setup script
```

---

## ⚙️ Tech Stack

| Layer | Technology |
|---|---|
| Backend Framework | Django 5.2 + Django REST Framework 3.17 |
| Authentication | JWT via `djangorestframework-simplejwt` |
| Database | PostgreSQL |
| Vector Database | Qdrant |
| Embeddings | `BAAI/bge-small-en-v1.5` (HuggingFace) |
| LLM | Ollama — `llama3:8b` (local, offline) |
| RAG Framework | LlamaIndex |
| Task Queue | Celery + Redis |
| Document Parsing | PyMuPDF, pypdf, python-docx, pandas/openpyxl |
| Serving | Gunicorn + WhiteNoise |

---

## 🚀 Getting Started

### Prerequisites

Make sure the following are installed on your system:

- [Python 3.11+](https://www.python.org/downloads/)
- [PostgreSQL](https://www.postgresql.org/download/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for Qdrant & Redis)
- [Ollama](https://ollama.com/) (for local LLM)

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/enterprise-ai.git
cd enterprise-ai/enterprice_ai
```

### 2. Set Up the Database

Create a PostgreSQL database:

```sql
CREATE DATABASE enterprise_ai;
```

Update credentials in `enterprice_ai/settings.py` or use a `.env` file:

```env
DB_NAME=enterprise_ai
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

### 3. Start Infrastructure Services

```bash
# Qdrant vector database
docker run -d --name qdrant -p 6333:6333 qdrant/qdrant

# Redis for Celery task queue
docker run -d --name redis-server -p 6379:6379 redis
```

### 4. Pull the LLM Model

```bash
ollama pull llama3:8b
```

### 5. Install Dependencies & Run

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser

python manage.py runserver
```

> **Windows users:** Run `setup.bat` to automate steps 3–5 in one click.

---

## 🔌 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/token/` | Obtain JWT access + refresh tokens |
| POST | `/api/token/refresh/` | Refresh access token |

### Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/accounts/register/` | Register a new user |
| GET | `/api/accounts/me/` | Get current user profile |
| GET | `/api/accounts/users/` | List users in your company |
| GET | `/api/accounts/pending-employees/` | List pending approval requests |
| POST | `/api/accounts/approve-employee/` | Approve or deny an employee |

### Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/documents/upload/` | Upload a document (PDF/DOC/CSV) |
| GET | `/api/documents/` | List company documents |
| DELETE | `/api/documents/<id>/` | Delete a document |

### Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/ask/` | Ask a question (RAG-powered) |
| GET | `/api/chat/sessions/` | List chat sessions |
| GET | `/api/chat/sessions/<id>/` | Get session details |
| GET | `/api/chat/sessions/<id>/messages/` | Get session messages |

---

## 🔒 Access Control Model

Documents are permission-filtered at retrieval time in Qdrant. Each chunk is indexed with metadata about who can access it:

```python
# Retrieval filter (chat/retrieval.py)
Filter(
    must=[company_id_match],
    should=[
        role_match,        # e.g. "admin", "manager"
        department_match,  # e.g. "engineering"
        specific_user_match
    ]
)
```

This means a user only ever sees answers derived from documents they are authorized to access — enforced at the vector search level, not just the API layer.

---

## 👤 User Roles

| Role | Description |
|------|-------------|
| `admin` | Full access — manage users, documents, permissions |
| `manager` | Access to team/department documents |
| `employee` | Access to role/department-scoped documents |
| `customer` | Access to customer-facing documents only |

New users can optionally go through an approval workflow (`pending → approved / denied`) before gaining access.

---

## 🧠 RAG Pipeline

1. **Upload** — User uploads a PDF, DOC, or CSV
2. **Parse** — Text is extracted using PyMuPDF / python-docx / pandas
3. **Chunk** — Document split into overlapping windows for context
4. **Embed** — Chunks embedded with `BAAI/bge-small-en-v1.5`
5. **Index** — Vectors stored in Qdrant with permission metadata
6. **Query** — User's question embedded → permission-filtered Qdrant search → top-K chunks retrieved
7. **Generate** — Chunks + chat history sent to `llama3:8b` via Ollama → grounded answer with citations

---

## 🌐 Frontend

A lightweight built-in frontend is served at `/` (dashboard) and `/login`. It is built with vanilla HTML/CSS/JS and communicates with the DRF API via JWT tokens stored in the browser.

---

## 📦 Environment Variables

It is recommended to move sensitive config out of `settings.py` using `python-decouple` or `python-dotenv`:

```env
SECRET_KEY=your-secret-key
DEBUG=False
DB_NAME=enterprise_ai
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
CELERY_BROKER_URL=redis://localhost:6379/0
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- [LlamaIndex](https://www.llamaindex.ai/) for the RAG framework
- [Qdrant](https://qdrant.tech/) for the vector database
- [Ollama](https://ollama.com/) for local LLM inference
- [BAAI](https://huggingface.co/BAAI/bge-small-en-v1.5) for the embedding model
