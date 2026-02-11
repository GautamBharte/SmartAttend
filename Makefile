# Makefile in SmartAttend/

ENV_FILE=backend/.env
COMPOSE_DEV=docker-compose --env-file $(ENV_FILE) -f docker/docker-compose.yml
COMPOSE_PROD=docker-compose --env-file $(ENV_FILE) -f docker/docker-compose.prod.yml

# Export environment variables from .env
export $(shell grep -v '^#' $(ENV_FILE) | xargs)

.PHONY: help init clean build migrate seed up down \
        prod-init prod-build prod-seed prod-up prod-down prod-logs \
        deploy deploy-setup

help:
	@echo ""
	@echo "  ── Development ─────────────────────────────────────"
	@echo "  make init       - Setup containers, initialize Alembic, and seed DB"
	@echo "  make build      - Build and start DB container"
	@echo "  make migrate    - Create Alembic folder and revision (manual edits required)"
	@echo "  make seed       - Seed base tables and admin user"
	@echo "  make up         - Start backend container (dev, hot-reload)"
	@echo "  make down       - Stop and remove containers"
	@echo "  make clean      - Remove containers, volumes, and migration history"
	@echo ""
	@echo "  ── Production ──────────────────────────────────────"
	@echo "  make prod-init  - First-time production setup (build + seed + up)"
	@echo "  make prod-build - Build production images (gunicorn, no volume mount)"
	@echo "  make prod-seed  - Seed the database"
	@echo "  make prod-up    - Start production containers"
	@echo "  make prod-down  - Stop production containers"
	@echo "  make prod-logs  - Tail production logs"
	@echo ""
	@echo "  ── Ansible Deployment (to RPi) ─────────────────────"
	@echo "  make deploy-setup - One-time Pi setup (Docker, Node, Nginx)"
	@echo "  make deploy       - Deploy/update app on Pi"
	@echo ""

# ── Development ──────────────────────────────────────────────────────

init: build migrate seed up

build:
	$(COMPOSE_DEV) build
	$(COMPOSE_DEV) up -d db
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@until docker exec postgres_container pg_isready -U $$POSTGRES_USER; do sleep 1; done
	@echo "✅ PostgreSQL is ready!"

migrate:
	$(COMPOSE_DEV) up -d backend
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
	$(COMPOSE_DEV) up -d

down:
	$(COMPOSE_DEV) down

clean:
	$(COMPOSE_DEV) down -v --remove-orphans || true
	$(COMPOSE_PROD) down -v --remove-orphans || true
	sudo rm -rf backend/migrations
	sudo rm -f backend/app.db
	docker volume prune -f

# ── Production ───────────────────────────────────────────────────────

prod-init: prod-build prod-seed prod-up
	@echo "🚀 Production is running!"

prod-build:
	$(COMPOSE_PROD) build
	$(COMPOSE_PROD) up -d db
	@echo "⏳ Waiting for PostgreSQL to be ready..."
	@until docker exec postgres_container pg_isready -U $$POSTGRES_USER; do sleep 1; done
	@echo "✅ PostgreSQL is ready!"

prod-seed:
	$(COMPOSE_PROD) up -d backend
	@echo "⏳ Waiting for backend to start..."
	sleep 5
	@echo "🌱 Seeding initial data..."
	docker exec flask_backend python scripts/setup_db.py

prod-up:
	$(COMPOSE_PROD) up -d
	@echo "✅ Production containers are up (gunicorn on :8000)"

prod-down:
	$(COMPOSE_PROD) down

prod-logs:
	$(COMPOSE_PROD) logs -f --tail=100

# ── Ansible Deployment ───────────────────────────────────────────────

deploy-setup:
	cd deploy && ansible-playbook playbooks/setup.yml --ask-become-pass

deploy:
	cd deploy && ansible-playbook playbooks/deploy.yml
