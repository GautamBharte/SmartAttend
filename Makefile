# Makefile in SmartAttend/

ENV_FILE=backend/.env
COMPOSE=docker-compose --env-file $(ENV_FILE) -f docker/docker-compose.yml

# Export environment variables from .env
export $(shell grep -v '^#' $(ENV_FILE) | xargs)

.PHONY: help init clean build migrate seed up down

help:
	@echo "Makefile commands:"
	@echo "  make init       - Setup containers, initialize Alembic, and seed DB"
	@echo "  make build      - Build and start DB container"
	@echo "  make migrate    - Create Alembic folder and revision (manual edits required)"
	@echo "  make seed       - Seed base tables and admin user"
	@echo "  make up         - Start backend container"
	@echo "  make down       - Stop and remove containers"
	@echo "  make clean      - Remove containers, volumes, and migration history"

init: build migrate seed up

build:
	$(COMPOSE) build
	$(COMPOSE) up -d db
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@until docker exec postgres_container pg_isready -U $$POSTGRES_USER; do sleep 1; done
	@echo "✅ PostgreSQL is ready!"

migrate:
	$(COMPOSE) up -d backend
	@echo "⏳ Waiting for backend to be ready..."
	sleep 5
	@echo "📂 Creating Alembic migration folder (if missing)..."
	docker exec flask_backend bash -c "test -d migrations || alembic init migrations"
	@echo "⚠️  Please update 'alembic.ini' with your sqlalchemy.url from .env manually."
	@echo "⚠️  Please add 'target_metadata = db.metadata' to env.py manually."
	@echo "⚠️  Then run the following manually inside container:"
	@echo "    alembic revision --autogenerate -m 'Initial migration'"
	@echo "    alembic upgrade head"

seed:
	@echo "🌱 Seeding initial data..."
	docker exec flask_backend python scripts/setup_db.py

up:
	$(COMPOSE) up -d

down:
	$(COMPOSE) down

clean:
	$(COMPOSE) down -v --remove-orphans || true
	sudo rm -rf backend/migrations
	sudo rm -f backend/app.db
	docker volume prune -f
