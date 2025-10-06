# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Fantasy Football application for local futsal (fútbol sala) with manual scoring system. Users create teams, trade players via auction system, and compete based on real player performance scored by an admin.

**Stack:**
- Backend: Django 5.2.7 + Django REST Framework + PostgreSQL
- Frontend: React 19 + Vite + Tailwind CSS
- Auth: JWT (djangorestframework-simplejwt)
- Database: PostgreSQL (containerized via Docker Compose)

## Development Commands

### Backend Setup & Running
```bash
# First time setup
cd backend
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py poblar_datos  # Populate test data

# Daily development
source venv/bin/activate  # Activate virtual environment
python manage.py runserver

# Database operations
python manage.py makemigrations
python manage.py migrate
python manage.py shell  # Interactive Django shell
python manage.py flush  # Reset database (caution!)
```

### Frontend Setup & Running
```bash
cd frontend
npm install
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Database (PostgreSQL via Docker)
```bash
docker-compose up -d      # Start PostgreSQL
docker-compose down       # Stop PostgreSQL
docker-compose logs -f    # View logs
docker-compose down -v    # Stop and remove volumes (resets DB)
```

## Architecture & Key Concepts

### Core Data Model Relationships

**Liga (League)** → Contains multiple Equipos (Teams)
- Defines presupuesto_inicial (50M default budget)
- Tracks jornada_actual (current matchday)

**Jugador (Player)** → Can belong to one Equipo per Liga
- Positions: POR (Portero/Goalkeeper), DEF (Defensa/Defender), DEL (Delantero/Forward)
- Note: Views.py adds MED (Centrocampista/Midfielder) during player assignment but model only has 3 positions
- valor (market value) updates based on performance: +€100k per point scored
- puntos_totales accumulates across all Jornadas

**Equipo (Team)** → Owned by User, participates in Liga
- ManyToMany relationship with Jugadores
- Presupuesto tracks available budget (decreases on buys, increases on sales)

**Jornada (Matchday)** → Represents a game week
- Admin creates these to track real futsal matches
- Used as foreign key in Puntuacion to record player scores

**Puntuacion (Score)** → Links Jugador performance to specific Jornada
- Unique constraint on (jugador, jornada) prevents duplicate scoring
- When updating existing score, views.py calculates delta to avoid double-counting

### Critical Business Logic

**Player Assignment on Registration (views.py:23-74)**
- Auto-assigns 7 random players: 1 POR, 2 DEF, 2 MED, 2 DEL
- Deducts player values from team budget
- Ensures no player is assigned to multiple teams in same league

**Squad Validation (views.py:213-229)**
- Prevents selling last goalkeeper (min 1 POR required)
- Prevents selling if only 2 DEF/MED/DEL remain
- Returns specific error messages per position

**Point Assignment Delta Calculation (views.py:355-380)**
- Critical: Checks if Puntuacion exists before update_or_create
- If updating: calculates delta (new - old points) to avoid duplication
- If new: adds full points
- Updates both jugador.puntos_totales and jugador.valor

### Authentication Flow

**JWT Tokens stored in localStorage:**
- accessToken: Used in Authorization header as `Bearer <token>`
- refreshToken: Used to obtain new access tokens

**Frontend AuthContext (src/context/AuthContext.jsx):**
- Provides: user, equipo, login(), register(), logout(), isAuthenticated
- Auto-loads user on mount if token exists
- All API calls in src/services/api.js use getAuthHeaders() helper

**Backend endpoints:**
- POST /api/auth/register/ → Returns user + tokens + auto-creates team
- POST /api/auth/login/ → Returns user + equipo + tokens
- GET /api/auth/user/ → Returns current user (requires JWT)
- POST /api/auth/token/refresh/ → Refreshes access token

### API Endpoint Patterns

**ViewSet actions:**
- Standard CRUD via router: /api/ligas/, /api/jugadores/, /api/equipos/, /api/jornadas/, /api/puntuaciones/
- Custom actions use @action decorator:
  - POST /api/equipos/{id}/fichar_jugador/ → Buy player
  - POST /api/equipos/{id}/vender_jugador/ → Sell player
  - POST /api/puntuaciones/asignar_puntos/ → Batch score assignment

**Custom ViewSets (no model):**
- GET /api/mercado/?liga_id=X → Returns 8 random unowned players
- GET /api/clasificacion/?liga_id=X → Returns ranked teams with total points

### Environment Variables

Backend uses python-decouple for configuration (backend/.env):
- DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT → PostgreSQL connection
- SECRET_KEY → Django secret key
- DEBUG → Boolean for debug mode
- FRONTEND_URL → CORS configuration

Template available in backend/.env.example

## Important Implementation Details

### Position Mismatch
The model defines 3 positions (POR, DEF, DEL) but views.py assigns 4 positions including MED (Midfielder). This works because:
- Model validation only checks against POSICIONES choices
- DEF is used as catch-all, but business logic treats MED separately
- **TODO:** Add MED to Jugador.POSICIONES choices for consistency

### Auction System (Not Yet Implemented)
README.md describes a 24-hour auction system with countdown timers. Currently:
- vender_jugador() removes player immediately
- No Subasta model exists
- No Celery/scheduled tasks for auction closing
- **Planned for Phase 2:** Requires Subasta model, Celery + Redis, WebSockets/polling

### Squad Rules from README.md vs Implementation
**README states:** 1 POR, 3 DEF, 3 DEL (total 7)
**Implementation uses:** 1 POR, 2 DEF, 2 MED, 2 DEL (total 7)
- Implementation is correct for futsal (5-a-side sport)
- README appears to have outdated position counts

### Frontend State Management
Currently uses Context API for auth only. No global state management library (Redux/Zustand).
- Each component fetches own data via src/services/api.js
- User/equipo shared via AuthContext
- **Consider:** Adding state management if app complexity grows

## File Organization

```
backend/
  fantasy/
    models.py         → 5 core models: Liga, Jugador, Equipo, Jornada, Puntuacion
    views.py          → ViewSets + auth endpoints + business logic
    serializers.py    → DRF serializers for API responses
    urls.py           → API routing via DefaultRouter
    management/commands/
      poblar_datos.py → Test data generation script

frontend/
  src/
    context/
      AuthContext.jsx → JWT auth state management
    components/
      Login.jsx       → Login form using useAuth()
      Register.jsx    → Registration form with auto-assignment notice
      FantasyWireframes.jsx → Main UI mockup
    services/
      api.js          → All backend API calls with JWT headers
```

## Testing & Data Population

**Generate test data:**
```bash
python manage.py poblar_datos
```
This creates sample Liga, Jugadores, and can be run multiple times (creates new instances each time).

**Manual testing via Django shell:**
```python
python manage.py shell
>>> from fantasy.models import Equipo, Jugador
>>> equipo = Equipo.objects.first()
>>> equipo.jugadores.count()  # Check player count
>>> list(equipo.jugadores.values('nombre', 'posicion'))  # View players
```

**Admin interface:**
- Access at http://127.0.0.1:8000/admin/
- Useful for manually assigning points, viewing data relationships

## Common Gotchas

1. **Always activate venv before working on backend:** `source venv/bin/activate`
2. **CORS errors:** Backend must run on 127.0.0.1 (not localhost) for CORS config to match
3. **Token expiry:** Access tokens expire in 5 hours (SIMPLE_JWT config in settings.py)
4. **PostgreSQL not running:** Check with `docker ps`, start with `docker-compose up -d`
5. **Migration conflicts:** If models change, always run makemigrations before migrate
6. **Player value overflow:** Decimal fields are max_digits=10, monitor for very high scores
7. **Unique constraint violations:** (usuario, liga) and (jugador, jornada) have unique_together constraints

## Roadmap & Pending Features

**Completed (Phase 1):**
- PostgreSQL setup with Docker
- JWT authentication in frontend
- Auto-assignment of 7 players on registration
- Squad validation rules
- Point assignment delta fix

**Pending (Phase 2 - Auction System):**
- Subasta model with fecha_fin (end date)
- Celery + Redis for scheduled auction closing
- WebSockets or polling for real-time bid updates
- Notification system for auction results

**Pending (Phase 3+):**
- Lineup selection (titulares vs banquillo)
- Only titulares score points
- Transfer offers between users
- Automatic "system" bids for unsold players
- User inactivity handling (auto-lineup from previous week)

## Related Documentation

- **SETUP.md:** Detailed installation instructions and troubleshooting
- **QUICKSTART.md:** Fast setup for first-time contributors
- **PROGRESO.md:** Change log of recent implementations
- **README.md:** Original functional requirements (Spanish)
