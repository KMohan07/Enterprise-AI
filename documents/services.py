import fitz
import pandas as pd
from docx import Document as DocxDocument


def parse_pdf(path):
    text = ""
    pdf = fitz.open(path)

    for page in pdf:
        text += page.get_text()

    pdf.close()
    return text


def parse_docx(path):
    doc = DocxDocument(path)

    return "\n".join(
        para.text for para in doc.paragraphs
    )


def parse_txt(path):
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def parse_csv(path):
    df = pd.read_csv(path)

    rows = []

    for _, row in df.iterrows():
        row_text = "\n".join(
            f"{col}: {row[col]}"
            for col in df.columns
        )
        rows.append(row_text)

    return "\n\n".join(rows)


def extract_document_text(document):
    path = document.file.path

    if document.document_type == "pdf":
        return parse_pdf(path)

    elif document.document_type == "doc":
        return parse_docx(path)

    elif document.document_type == "txt":
        return parse_txt(path)

    elif document.document_type == "csv":
        return parse_csv(path)

    raise Exception("Unsupported document type")