import requests, os, time
from utils.auth import create_access_token

token = create_access_token({"sub": "test2@test.com", "role": "user"})
print("Token created:", token)

with open("test.wav", "wb") as f:
    f.write(b"RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00D\xac\x00\x00\x88X\x01\x00\x02\x00\x10\x00data\x00\x00\x00\x00")

t0 = time.time()
try:
    with open("test.wav", "rb") as f:
        res = requests.post("http://127.0.0.1:8000/upload", files={"file": f}, headers={"Authorization": f"Bearer {token}"})
    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
print(f"Time taken: {time.time() - t0:.2f}s")
