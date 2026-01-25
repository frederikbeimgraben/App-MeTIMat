# MeTIMat Project - Technische Dokumentation

Dieses Repository enthält den Quellcode für das MeTIMat-System, eine integrierte Lösung zur Verwaltung und Ausgabe von Materialien/Medikamenten, bestehend aus einem Backend, einem Web-Frontend und einer dedizierten Maschinen-Firmware.

## Projektübersicht

Das System ist in drei Hauptkomponenten unterteilt:
1.  **Backend**: Eine REST-API zur Datenverwaltung und Geschäftslogik.
2.  **Frontend**: Eine webbasierte Benutzeroberfläche für Administratoren und Nutzer.
3.  **Machine-Firmware**: Software, die direkt auf der Hardware (Kiosk/Automat) läuft, um Sensoren (Scanner) und Aktoren (LEDs) zu steuern.

## Projektstruktur

```text
.
├── backend/                # FastAPI Anwendung (Python)
│   ├── app/                # Kernlogik (API, Modelle, Schemas, Services)
│   ├── alembic/            # Datenbank-Migrationen
│   └── tests/              # Backend-Tests
├── frontend/               # Angular Web-Applikation
│   ├── src/                # Quellcode (Components, Services, Styles)
│   └── tailwind.config.js  # Styling-Konfiguration
├── machine-firmware/       # Python-Steuerung für die Hardware
│   ├── led/                # LED-Controller Logik
│   ├── gui.py              # PyQt6-basierte Benutzeroberfläche
│   └── scanner.py          # QR-Code Scanner Integration (OpenCV)
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
- **Features**: FHIR-Kompatibilität (fhir.resources), QR-Code Generierung, E-Mail Versand.

### 2. Frontend
Ein modernes Single-Page-Application (SPA) Framework.
- **Framework**: **Angular**.
- **Styling**: **Tailwind CSS** für responsives Design.
- **Deployment**: Wird über Nginx ausgeliefert (siehe `nginx.conf`).

### 3. Machine-Firmware
Die Firmware ist für den Betrieb auf einem lokalen Terminal konzipiert.
- **GUI**: Erstellt mit **PyQt6**.
- **Scanning**: Nutzt **OpenCV** zur Echtzeit-Erkennung von QR-Codes über die Kamera.
- **Hardware-Steuerung**: Schnittstellen zur Ansteuerung von LED-Streifen zur Benutzerführung.
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
pip install -r requirements.txt
python main.py
```

## Datenbank-Migrationen
Bei Änderungen am Datenmodell müssen Migrationen erstellt und angewendet werden:
```bash
cd backend
# Migration erstellen
alembic revision --autogenerate -m "Beschreibung der Änderung"
# Migration anwenden
alembic upgrade head
```
