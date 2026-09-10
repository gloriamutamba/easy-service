import urllib.request, json

def fetch(req):
    try:
        r = urllib.request.urlopen(req)
        return r.getcode(), r.read().decode()
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ''
        return e.code, body

print('LOGIN...')
data = json.dumps({'email':'admin@easyservices.cd','password':'admin123'}).encode()
req = urllib.request.Request('http://127.0.0.1:5000/api/login', data=data, headers={'Content-Type':'application/json'})
code, body = fetch(req)
print('LOGIN', code, body)
resp = json.loads(body)
token = resp.get('access_token')
print('TOKEN len', len(token or ''))

req2 = urllib.request.Request('http://127.0.0.1:5000/api/admin/stats', headers={'Authorization':'Bearer '+token})
code2, body2 = fetch(req2)
print('STATS', code2, body2)

# logout
req3 = urllib.request.Request('http://127.0.0.1:5000/api/logout', method='POST', headers={'Authorization':'Bearer '+token})
code3, body3 = fetch(req3)
print('LOGOUT', code3, body3)

# stats again
code4, body4 = fetch(urllib.request.Request('http://127.0.0.1:5000/api/admin/stats', headers={'Authorization':'Bearer '+token}))
print('STATS2', code4, body4)
