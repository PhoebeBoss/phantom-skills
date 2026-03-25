import json
p='/home/node/.openclaw/cron/jobs.json'
d=json.load(open(p))
for j in d['jobs']:
    if j.get('payload',{}).get('model')=='haiku':
        j['payload']['model']='groq/llama-3.3-70b-versatile'
    if j.get('name')=='Sneaks Moltbook heartbeat':
        j['name']='Moltbook heartbeat'
        j['enabled']=False
    if j.get('state'):
        j['state']['consecutiveErrors']=0
        j['state'].pop('lastError',None)
json.dump(d,open(p,'w'),indent=2)
for j in d['jobs']:
    print('ON' if j['enabled'] else 'OFF', j['name'], j.get('payload',{}).get('model','n/a'))
