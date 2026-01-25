# MeTIMat Project - Technische Dokumentation

Dieses Repository enthält den Quellcode für das MeTIMat-System, eine integrierte Lösung zur Verwaltung und Ausgabe von Medikamenten, bestehend aus einem Backend, einem Web-Frontend und einer dedizierten Maschinen-Firmware.

## Projektübersicht

Das System ist in drei Hauptkomponenten unterteilt:
1.  **Backend**: Eine REST-API zur Datenverwaltung und Geschäftslogik.
2.  **Frontend**: Eine webbasierte Benutzeroberfläche für Administratoren und Nutzer.
3.  **Machine-Firmware**: Software, die direkt auf der Hardware (Kiosk/Automat) läuft, um Sensoren (Scanner) und Aktoren (LEDs) zu steuern.

## Projektstruktur

```text
.
├── backend/                # FastAPI Backend
├── frontend/               # Angular Web-Applikation
├── machine-firmware/       # Python-Steuerung für die Hardware
├── db-data/                # Persistente Datenbank-Dateien (lokal)
├── docker-compose.yml      # Orchestrierung der Container
└── nginx.conf              # Webserver-Konfiguration für das Frontend
```

## Komponenten-Details

### 1. Backend
Das Backend basiert auf **FastAPI** und bietet eine performante Schnittstelle.
- **Datenbank**: PostgreSQL, angebunden über **SQLAlchemy**.
- **Migrationen**: Verwaltet durch **Alembic**.
- **Validierung**: Pydantic-Modelle für Request/Response-Validierung.

### 2. Frontend
Ein modernes Single-Page-Application (SPA) Framework.
- **Framework**: **Angular**.
- **Styling**: **Tailwind CSS** für responsives Design.
- **Deployment**: Wird vom Dockerfile in einem NGINX-Container deployed.

### 3. Machine-Firmware
Die Firmware ist für den Betrieb auf einem lokalen Terminal konzipiert.
- **GUI**: Erstellt mit **PyQt6**.
- **Scanning**: Nutzt **OpenCV** zur Echtzeit-Erkennung von QR-Codes über die Kamera.
- **Kommunikation**: Interagiert via REST-API mit dem zentralen Backend.

## Technologie-Stack

| Bereich | Technologien |
| :--- | :--- |
| **Backend** | Python, FastAPI, SQLAlchemy, PostgreSQL, Alembic |
| **Frontend** | TypeScript, Angular, Tailwind CSS |
| **Firmware** | Python, PyQt6, OpenCV |
| **Infrastruktur** | Docker, Docker Compose, Nginx |

## Setup & Entwicklung

### Voraussetzungen
- Docker & Docker Compose
- Python 3.10+ (für lokale Entwicklung der Firmware)
- Node.js (für lokale Entwicklung des Frontends)

### Start mit Docker
Um das gesamte System (Backend, Frontend, DB) zu starten:
```bash
docker-compose up --build
```
Das Frontend ist anschließend standardmäßig unter `http://localhost:8081` erreichbar.

### Firmware ausführen
Die Firmware wird normalerweise lokal auf der Zielhardware ausgeführt:
```bash
cd machine-firmware
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
sudo ./run.sh
```

## Datenbank-Migrationen
Bei Änderungen am Datenmodell müssen Migrationen erstellt und angewendet werden:
```bash
cd backend
# Migration erstellen
alembic revision --autogenerate -m "Beschreibung der Änderung"
# Migration anwenden (Passiert bei CI-Deployment automatisch)
alembic upgrade head
```
