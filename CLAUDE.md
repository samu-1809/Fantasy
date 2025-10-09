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
npm run dev        # Development server (Vite on http://localhost:5173)
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # Run ESLint
```

### Testing
```bash
cd backend
pytest                          # Run all tests
pytest -v                       # Verbose output
pytest fantasy/tests/test_models.py  # Run specific test file
pytest -k "test_name"          # Run tests matching pattern
pytest --cov                    # Run with coverage report
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
- Note: Model only has 3 positions, but readme describes 4 position system with MED
- valor (market value) updates based on performance: +€100k per point scored
- puntos_totales accumulates across all Jornadas
- en_banquillo (boolean) tracks if player is on bench vs field
- fecha_mercado tracks when player was put on market (24h auction window)

**Equipo (Team)** → Owned by User, participates in Liga
- ForeignKey relationship: Jugadores have FK to Equipo (not ManyToMany)
- Presupuesto tracks available budget (default: 150M, decreases on buys, increases on sales)
- Related Alineacion model tracks titulares (5 field players) vs banquillo (bench)

**Jornada (Matchday)** → Represents a game week
- Admin creates these to track real futsal matches
- Related Partido model stores actual futsal match results (equipo_local vs equipo_visitante)
- Used as foreign key in Puntuacion to record player scores

**Puntuacion (Score)** → Links Jugador performance to specific Jornada
- Unique constraint on (jugador, jornada) prevents duplicate scoring
- When updating existing score, views.py calculates delta to avoid double-counting

**Alineacion (Lineup)** → OneToOne with Equipo, defines field positions
- 5 titulares: portero_titular, defensa1/2_titular, delantero1/2_titular
- banquillo: ManyToMany field for bench players (max 6)
- Model validation ensures position correctness (e.g., portero must be POR)

### Critical Business Logic

**Player Assignment on Registration (auth_views.py RegisterView)**
- Auto-assigns 7 random players: 1 POR, 3 DEF, 3 DEL (matching README)
- Budget-aware assignment: only assigns players that fit in 100M allocation
- Returns error if insufficient players available in any position
- Deducts player values from team budget
- Ensures no player is assigned to multiple teams (equipo FK prevents this)

**Squad Validation (views.py EquipoViewSet.vender_jugador)**
- Prevents selling last goalkeeper (min 1 POR required)
- Prevents selling if reducing below minimum for any position
- Returns specific error messages per position
- Updates player's equipo FK to None and adds to market

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
- Standard CRUD via router: /api/ligas/, /api/jugadores/, /api/equipos/, /api/jornadas/, /api/puntuaciones/, /api/partidos/, /api/alineaciones/
- Custom actions use @action decorator:
  - POST /api/equipos/{id}/fichar_jugador/ → Buy player (requires jugador_id, optional en_banquillo)
  - POST /api/equipos/{id}/vender_jugador/ → Sell player (requires jugador_id)
  - POST /api/puntuaciones/asignar_puntos/ → Batch score assignment
  - PUT/PATCH /api/alineaciones/{id}/ → Update lineup (set titulares and banquillo)

**Custom endpoints (no ViewSet):**
- GET /api/mercado/?liga_id=X → Returns 8 random unowned players (equipo__isnull=True)
- GET /api/clasificacion/?liga_id=X → Returns ranked teams with total points

### Environment Variables

Backend uses python-decouple for configuration (backend/.env):
- DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT → PostgreSQL connection
- SECRET_KEY → Django secret key
- DEBUG → Boolean for debug mode
- FRONTEND_URL → CORS configuration

Template available in backend/.env.example

## Important Implementation Details

### Position System Evolution
- **Jugador model**: Defines 3 positions (POR, DEF, DEL)
- **README.md**: Describes 1 POR, 3 DEF, 3 DEL assignment
- **Current implementation (views.py)**: Assigns 1 POR, 3 DEF, 3 DEL (matches README)
- **Alineacion model**: Uses 5 field positions (1 POR, 2 DEF, 2 DEL) for futsal formation
- Previous versions used MED (midfielder) but has been refactored to use 3-position system

### Auction System (Not Yet Implemented)
README.md describes a 24-hour auction system with countdown timers. Currently:
- vender_jugador() removes player immediately
- No Subasta model exists
- No Celery/scheduled tasks for auction closing
- **Planned for Phase 2:** Requires Subasta model, Celery + Redis, WebSockets/polling

### Squad Composition
**Initial assignment (registration):** 1 POR, 3 DEF, 3 DEL (total 7 players)
**Field positions (Alineacion):** 1 POR, 2 DEF, 2 DEL (total 5 titulares)
**Bench:** Remaining 2 players + any additional signings (max total 11 players)
- Futsal uses 5-a-side formations, hence 5 field positions
- Initial 7-player assignment ensures squad has minimum viable roster

### Frontend State Management
Currently uses Context API for auth only. No global state management library (Redux/Zustand).
- Each component fetches own data via src/services/api.js
- User/equipo shared via AuthContext
- **Consider:** Adding state management if app complexity grows

## File Organization

```
backend/
  fantasy/
    models.py         → 7 models: Liga, Jugador, Equipo, Jornada, Puntuacion, Partido, Alineacion, EquipoReal
    views.py          → ViewSets for main entities + custom endpoints (mercado, clasificacion)
    auth_views.py     → RegisterView, LoginView (JWT authentication)
    serializers.py    → DRF serializers for API responses
    urls.py           → API routing via DefaultRouter + auth endpoints
    admin.py          → Django admin configuration
    tests/
      conftest.py     → Pytest fixtures
      factories.py    → Factory-boy factories for test data
      test_models.py  → Model tests
      test_views.py   → API endpoint tests
    management/commands/
      poblar_datos.py → Test data generation script
      poblardb.py     → Alternative data population script

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

1. **Always activate venv before working on backend:** `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
2. **CORS errors:** Backend must run on 127.0.0.1 (not localhost) for CORS config to match
3. **Token expiry:** Access tokens expire in 5 hours (SIMPLE_JWT config in settings.py)
4. **PostgreSQL not running:** Check with `docker ps`, start with `docker-compose up -d`
5. **Migration conflicts:** If models change, always run `makemigrations` before `migrate`
6. **Player value is IntegerField:** Values stored as integers (e.g., 5000000 = €5M), not Decimal
7. **Unique constraint violations:**
   - Equipo: (usuario, liga) ensures one team per user per league
   - Puntuacion: (jugador, jornada) prevents duplicate scoring
   - Liga: codigo must be unique
8. **Player assignment on register:** Requires sufficient unowned players in database, run `poblar_datos` first
9. **Alineacion validation:** Model clean() method enforces position constraints on titulares

## Roadmap & Pending Features

**Completed (Phase 1):**
- PostgreSQL setup with Docker
- JWT authentication (backend + frontend AuthContext)
- Auto-assignment of 7 players on registration (1 POR, 3 DEF, 3 DEL)
- Squad validation rules (minimum position requirements)
- Point assignment delta fix
- Alineacion model for lineup management (5 field positions + bench)
- Partido model for tracking real futsal matches
- Test suite with pytest + factory-boy
- Budget-aware player assignment

**Pending (Phase 2 - Auction System):**
- Subasta model with fecha_fin (end date)
- Celery + Redis for scheduled auction closing
- WebSockets or polling for real-time bid updates
- Notification system for auction results
- Bidding UI in frontend

**Pending (Phase 3 - Scoring System):**
- Only titulares score points (currently all players in equipo score)
- Automatic lineup rollover if user doesn't set lineup
- Weekly deadline for lineup changes

**Pending (Phase 4 - Trading):**
- Transfer offers between users
- Automatic "system" bids for unsold players
- User inactivity handling

## Related Documentation

- **SETUP.md:** Detailed installation instructions and troubleshooting
- **QUICKSTART.md:** Fast setup for first-time contributors
- **PROGRESO.md:** Change log of recent implementations
- **README.md:** Original functional requirements (Spanish)
