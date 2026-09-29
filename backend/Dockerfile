FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
RUN pip install --no-cache-dir .

COPY alembic.ini ./
COPY alembic ./alembic

RUN useradd --create-home tamago
USER tamago

EXPOSE 8390
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8390"]
