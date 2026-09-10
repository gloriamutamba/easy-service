import urllib.request, urllib.parse, json, sys
base = 'http://127.0.0.1:5000/api'
try:
    login_data = json.dumps({'email':'marie@email.com','password':'123456'}).encode()
    req = urllib.request.Request(base+'/login', data=login_data, headers={'Content-Type':'application/json'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        body = json.loads(resp.read())
    print('login keys:', list(body.keys()))
    token = body.get('access_token')
except Exception as e:
    print('login failed', e)
    sys.exit(1)
try:
    q = urllib.parse.urlencode({'metier':'Électricien','ville':'Lubumbashi'})
    with urllib.request.urlopen(base+'/search?'+q, timeout=10) as r:
        resbody = json.loads(r.read())
    print('search count:', len(resbody))
    if resbody:
        print('first:', resbody[0].get('nom'), resbody[0].get('metier'), resbody[0].get('ville'))
except Exception as e:
    print('search failed', e)
try:
    req3 = urllib.request.Request(base+'/prestataire/me', headers={'Authorization':'Bearer '+token})
    with urllib.request.urlopen(req3, timeout=10) as r3:
        print('/prestataire/me ->', json.loads(r3.read()))
except Exception as e:
    print('/prestataire/me failed', e)
