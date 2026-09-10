import urllib.request, json

# login
print('LOGIN...')
data = json.dumps({'email':'admin@easyservices.cd','password':'admin123'}).encode()
req = urllib.request.Request('http://127.0.0.1:5000/api/login', data=data, headers={'Content-Type':'application/json'})
resp = urllib.request.urlopen(req)
body = json.loads(resp.read().decode())
print('LOGIN USER:', body.get('user'))

token = body.get('access_token')
# call admin stats
req2 = urllib.request.Request('http://127.0.0.1:5000/api/admin/stats', headers={'Authorization':'Bearer '+token})
resp2 = urllib.request.urlopen(req2)
print('STATS:', resp2.read().decode())
# call logout
req3 = urllib.request.Request('http://127.0.0.1:5000/api/logout', method='POST', headers={'Authorization':'Bearer '+token})
try:
    urllib.request.urlopen(req3)
    print('LOGOUT ok')
except Exception as e:
    print('LOGOUT err', e)
# call admin stats again should be forbidden (token revoked)
try:
    req4 = urllib.request.Request('http://127.0.0.1:5000/api/admin/stats', headers={'Authorization':'Bearer '+token})
    resp4 = urllib.request.urlopen(req4)
    print('STATS2', resp4.read().decode())
except Exception as e:
    print('STATS2 error (expected):', e)
