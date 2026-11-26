# CPQ Core ITB - POC Novamarine v2

## Requisito locale
Usare Python 3.13 (non Python 3.15).

## Avvio Windows PowerShell
```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```
Aprire http://localhost:8000. Swagger: http://localhost:8000/docs.

## Correzioni v2
- ZIP senza cartella annidata.
- Errori mostrati solo nella sezione pertinente.
- Label dinamiche per selezione singola/multipla.
- Asset immagine inclusi e verificati.
- Fallback visuale se un asset non viene caricato.
- Test automatico degli asset statici.

Visual in this file was generated with Microsoft Copilot.
