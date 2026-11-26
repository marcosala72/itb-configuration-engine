from pathlib import Path
import json
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
ROOT=Path(__file__).parent
CAT=json.loads((ROOT/'data/catalog.json').read_text(encoding='utf-8')); RULES=json.loads((ROOT/'data/rules.json').read_text(encoding='utf-8'))
OPTIONS={o['code']:o for o in CAT['options']}
class Discounts(BaseModel): boatPct:float=Field(default=0,ge=0,le=100); accessoriesPct:float=Field(default=0,ge=0,le=100)
class EvaluateRequest(BaseModel): modelCode:str='BS120OB'; selectedOptions:list[str]=[]; discounts:Discounts=Discounts()
app=FastAPI(title='ITB Configuration Engine - Novamarine',version='0.2.0'); app.mount('/static',StaticFiles(directory=ROOT/'static'),name='static')
@app.get('/')
def index(): return FileResponse(ROOT/'static/index.html')
@app.get('/health')
def health(): return {'status':'ok'}
@app.get('/api/v1/models/{model_code}')
def model(model_code:str): return CAT if model_code==CAT['model']['code'] else {'error':'MODEL_NOT_FOUND'}
@app.post('/api/v1/configurations/evaluate')
def evaluate(req:EvaluateRequest):
 selected=list(dict.fromkeys(c for c in req.selectedOptions if c in OPTIONS)); ss=set(selected); disabled={}; violations=[]; applied=[]
 for r in RULES:
  t=r['type']
  if t in ('EXACTLY_ONE','AT_MOST_ONE'):
   hits=[c for c in r['members'] if c in ss]
   if t=='EXACTLY_ONE' and len(hits)!=1: violations.append({'ruleId':r['id'],'scopeGroup':r.get('scopeGroup'),'message':r['message']})
   elif len(hits)>1: violations.append({'ruleId':r['id'],'scopeGroup':r.get('scopeGroup'),'message':r['message']})
   if hits:
    applied.append(r['id'])
    for c in r['members']:
     if c not in hits: disabled[c]=r['message']
  elif t=='AVAILABLE_IF':
   ok=any(c in ss for c in r['selectedAny'])
   if not ok: disabled[r['member']]=r['message']
   if r['member'] in ss and not ok: violations.append({'ruleId':r['id'],'scopeGroup':r.get('scopeGroup'),'message':r['message']})
   if r['member'] in ss: applied.append(r['id'])
  elif t=='MUTUALLY_EXCLUSIVE_GROUPS':
   active=[g for g in r['groups'] if any(OPTIONS[c]['group']==g for c in ss)]
   if len(active)>1: violations.append({'ruleId':r['id'],'scopeGroups':r.get('scopeGroups'),'message':r['message']})
   if active:
    applied.append(r['id']); other=[g for g in r['groups'] if g not in active]
    for c,o in OPTIONS.items():
     if o['group'] in other: disabled[c]=r['message']
 engine_codes={c for c,o in OPTIONS.items() if o['group']=='ENGINES'}; boat=sum(OPTIONS[c]['price'] for c in ss&engine_codes)
 accessories=sum(OPTIONS[c]['price'] for c in ss-engine_codes if OPTIONS[c].get('discountable',True)); fixed=sum(OPTIONS[c]['price'] for c in ss-engine_codes if not OPTIONS[c].get('discountable',True))
 bd=round(boat*req.discounts.boatPct/100,2); ad=round(accessories*req.discounts.accessoriesPct/100,2); total=round(boat+accessories+fixed-bd-ad,2)
 states=[{**o,'selected':c in ss,'available':c not in disabled,'disabledReason':disabled.get(c)} for c,o in OPTIONS.items()]
 return {'valid':not violations,'modelCode':req.modelCode,'catalogVersion':CAT['model']['catalogVersion'],'selectedOptions':selected,'options':states,'violations':violations,'appliedRules':applied,'pricing':{'boatSubtotal':boat,'accessoriesSubtotal':accessories+fixed,'discountTotal':bd+ad,'netTotal':total,'currency':'EUR'}}

