from fastapi.testclient import TestClient
from app.main import app
import json
from pathlib import Path
client=TestClient(app)
def test_health(): assert client.get('/health').json()['status']=='ok'
def test_assets():
 for f in ['boat.png','engines.png','joystick.png','electronics.png','audio.png','deck.png']:
  r=client.get('/static/assets/'+f); assert r.status_code==200 and len(r.content)>1000
def test_golden_total():
 g=json.loads(Path('app/data/golden.json').read_text()); r=client.post('/api/v1/configurations/evaluate',json=g).json(); assert r['valid'] is True; assert r['pricing']['netTotal']==g['expectedTotal']
def test_engine_scope_label():
 r=client.post('/api/v1/configurations/evaluate',json={'selectedOptions':[]}).json(); v=next(x for x in r['violations'] if x['ruleId']=='ENGINE_ONE'); assert v['scopeGroup']=='ENGINES'
def test_audio_exclusive(): assert client.post('/api/v1/configurations/evaluate',json={'selectedOptions':['ENGINE_V400','AUDIO_STANDARD','AUDIO_PREMIUM']}).json()['valid'] is False
def test_electronics_brand_exclusive(): assert client.post('/api/v1/configurations/evaluate',json={'selectedOptions':['ENGINE_V400','GARMIN_AIS800','RAY_AIS700']}).json()['valid'] is False
def test_joystick_compatibility(): assert client.post('/api/v1/configurations/evaluate',json={'selectedOptions':['ENGINE_F300','JOYSTICK_350_400']}).json()['valid'] is False
