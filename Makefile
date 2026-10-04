.DEFAULT_GOAL := help
SHELL := /bin/bash

COMPOSE := docker compose
COMPOSE_DEV := docker compose -f docker-compose.yml -f docker-compose.dev.yml

# Values come from .env when it exists, so the banner never prints a stale port.
env_or = $(shell grep -E '^$(1)=' .env 2>/dev/null | cut -d= -f2- | grep . || echo $(2))
WEB_PORT := $(call env_or,WEB_PORT,8400)
API_PORT := $(call env_or,API_PORT,8401)
DEV_PORT := $(call env_or,DEV_PORT,8403)
MAIL_UI_PORT := $(call env_or,MAIL_UI_PORT,8405)
ADMIN_USER := $(call env_or,SEED_ADMIN_USERNAME,admin)
ADMIN_PASS := $(call env_or,SEED_ADMIN_PASSWORD,admin)

ifneq (,$(findstring xterm,$(TERM)))
  BOLD := $(shell tput bold)
  DIM := $(shell tput dim)
  YELLOW := $(shell tput setaf 3)
  RESET := $(shell tput sgr0)
endif

# Tooling runs inside containers, so Docker is the only thing you need installed.
PY := $(COMPOSE) run --rm --no-deps -e APP_ENV=test --entrypoint "" -v "$(PWD)/backend:/srv" backend
PY_TEST := $(COMPOSE) run --rm --entrypoint "" -v "$(PWD)/backend:/srv" \
	-e APP_ENV=test \
	-e DATABASE_URL=postgresql+asyncpg://tailr:tailr@db:5432/tailr_test \
	-e REDIS_URL=redis://redis:6379/15 \
	backend
NODE := docker run --rm -v "$(PWD)/frontend:/app" -v tailr-node-modules:/app/node_modules -w /app node:22-alpine sh -c

.PHONY: help setup up down restart dev logs ps migrate migration seed demo test test-backend test-frontend \
	lint fmt typecheck gen-api e2e shell psql redis-cli reset clean _banner _env

help: ## Show this help
	@echo "$(BOLD)Tailr$(RESET) — jobs that fit, applications made to measure"
	@echo
	@grep -hE '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-14s$(RESET) %s\n", $$1, $$2}'
	@echo

_env:
	@if [ ! -f .env ]; then \
	  cp .env.example .env; \
	  secret=$$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 48); \
	  sed -i.bak "s|^SECRET_KEY=.*|SECRET_KEY=$$secret|" .env && rm -f .env.bak; \
	  echo "$(YELLOW)Created .env.$(RESET) Add your ILMU key to LLM_API_KEY for the AI features."; \
	fi

setup: _env ## First run: create .env, build images, start everything
	@$(COMPOSE) build
	@$(MAKE) --no-print-directory up

up: _env ## Build (if needed) and start everything; migrations run automatically
	@$(COMPOSE) up -d --build --wait
	@$(MAKE) --no-print-directory _banner

_banner:
	@echo
	@echo "  $(BOLD)Tailr is running$(RESET)"
	@echo "  ─────────────────────────────────────────────"
	@echo "  App         $(YELLOW)http://localhost:$(WEB_PORT)$(RESET)"
	@echo "  API docs    $(DIM)http://localhost:$(API_PORT)/api/docs$(RESET)"
	@echo "  Dev email   $(DIM)http://localhost:$(MAIL_UI_PORT)$(RESET)"
	@echo
	@echo "  Admin sign-in   $(BOLD)$(ADMIN_USER)$(RESET) / $(BOLD)$(ADMIN_PASS)$(RESET)"
	@echo "  $(DIM)Change the admin password before deploying anywhere.$(RESET)"
	@echo

down: ## Stop everything (data is kept)
	@$(COMPOSE) down

restart: ## Restart the app containers
	@$(COMPOSE) restart backend worker scheduler frontend

dev: _env ## Hot reload: Python services reload on save, Vite serves the UI on DEV_PORT
	@$(COMPOSE_DEV) up -d --build --wait db redis mailpit renderer backend worker scheduler
	@echo "$(YELLOW)UI with hot reload: http://localhost:$(DEV_PORT)$(RESET)"
	@cd frontend && npm install --no-audit --no-fund && VITE_API_TARGET=http://localhost:$(API_PORT) npm run dev

logs: ## Follow logs (all services, or s=backend)
	@$(COMPOSE) logs -f --tail=150 $(s)

ps: ## Show service status
	@$(COMPOSE) ps

migrate: ## Apply database migrations
	@$(COMPOSE) exec backend alembic upgrade head

migration: ## Create a migration from model changes: make migration m="add jobs"
	@test -n "$(m)" || { echo 'Usage: make migration m="what changed"'; exit 1; }
	@$(COMPOSE) exec backend alembic revision --autogenerate -m "$(m)"

seed: ## Create the default admin again if it was removed
	@$(COMPOSE) exec backend python -c "import asyncio; from app.core.db import init_engine; from app.modules.auth.seed import ensure_admin; init_engine(); asyncio.run(ensure_admin())"

demo: ## Create (or reset) the demo account, with every feature filled in. No network needed.
	@$(COMPOSE) exec backend python -m app.scripts.seed_demo

test: test-backend test-frontend ## Run every test suite

test-backend: ## Backend tests (separate test database, never your data)
	@$(COMPOSE) up -d --wait db redis
	@$(COMPOSE) build -q --build-arg INSTALL_DEV=true backend
	@$(PY_TEST) python -m pytest -q --cov=app --cov-report=term-missing:skip-covered

test-frontend: ## Frontend unit tests
	@$(NODE) "npm ci --no-audit --no-fund --silent && npm test"

e2e: ## Browser smoke tests with accessibility checks (needs `make up` and `make demo`)
	@docker run --rm --init --ipc=host --network tailr_default -e BASE_URL=http://frontend \
		-v "$(PWD)/e2e:/e2e" -v tailr-e2e-modules:/e2e/node_modules -w /e2e \
		mcr.microsoft.com/playwright:v1.63.0-noble \
		sh -c "npm ci --no-audit --no-fund --silent && npx playwright test"

lint: ## Lint and type-check backend and frontend
	@$(COMPOSE) build -q --build-arg INSTALL_DEV=true backend
	@$(PY) sh -c "ruff check app tests && ruff format --check app tests && mypy app"
	@$(NODE) "npm ci --no-audit --no-fund --silent && npm run lint && npm run format:check && npm run typecheck"

fmt: ## Format backend and frontend code
	@$(COMPOSE) build -q --build-arg INSTALL_DEV=true backend
	@$(PY) sh -c "ruff check --fix app tests && ruff format app tests"
	@$(NODE) "npm ci --no-audit --no-fund --silent && npm run format"

gen-api: ## Regenerate the frontend's typed API client from the backend
	@$(PY) python -m app.scripts.export_openapi > frontend/src/lib/api/openapi.json
	@$(NODE) "npx --yes openapi-typescript src/lib/api/openapi.json -o src/lib/api/schema.d.ts && rm src/lib/api/openapi.json"

shell: ## Shell inside the backend container
	@$(COMPOSE) exec backend bash

psql: ## Postgres prompt
	@$(COMPOSE) exec db psql -U tailr tailr

redis-cli: ## Redis prompt
	@$(COMPOSE) exec redis redis-cli

reset: ## Delete all data and start fresh (asks first)
	@read -p "This deletes the database, files and queues. Type 'yes' to continue: " ok && [ "$$ok" = "yes" ] || exit 1
	@$(COMPOSE) down -v --remove-orphans
	@$(MAKE) --no-print-directory up

clean: ## Stop everything and remove built images (keeps data)
	@$(COMPOSE) down --rmi local --remove-orphans
