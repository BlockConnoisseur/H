"""Read-only research snapshot of Pump configuration. Never signs transactions."""
import base64
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'
ZEC = 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS'

def b58decode(s):
    n = 0
    for c in s:
        n = n * 58 + ALPHABET.index(c)
    return bytes(len(s) - len(s.lstrip('1'))) + n.to_bytes((n.bit_length()+7)//8, 'big')

def b58encode(b):
    n, s = int.from_bytes(b, 'big'), ''
    while n:
        n, r = divmod(n, 58)
        s = ALPHABET[r] + s
    return '1' * (len(b)-len(b.lstrip(b'\0'))) + s

def pda(seed):
    # Research-only derivation; production must use a maintained Solana SDK.
    p = 2**255 - 19
    d = -121665 * pow(121666, -1, p) % p
    for bump in range(255, -1, -1):
        h = hashlib.sha256(seed + bytes([bump]) + b58decode(PROGRAM) + b'ProgramDerivedAddress').digest()
        y = (int.from_bytes(h, 'little') & (2**255-1)) % p
        den = (d*y*y+1) % p
        x2 = (y*y-1) * pow(den, -1, p) % p if den else 0
        if den and pow(x2, (p-1)//2, p) == p-1:
            return b58encode(h)
    raise ValueError('No PDA')

idl = json.loads((ROOT / 'sources/pump-public-docs/idl/pump.json').read_text())
types = {t['name']: t['type'] for t in idl['types']}

class Decoder:
    def __init__(self, data):
        self.data, self.offset = data, 8
    def take(self, n):
        b = self.data[self.offset:self.offset+n]
        if len(b) != n:
            raise ValueError('Truncated account')
        self.offset += n
        return b
    def decode(self, t):
        if t == 'pubkey':
            return b58encode(self.take(32))
        if t == 'bool':
            n = self.take(1)[0]
            if n not in (0, 1):
                raise ValueError('Invalid bool')
            return bool(n)
        if isinstance(t, str) and t in ('u8', 'u16', 'u32', 'u64', 'i64'):
            return int.from_bytes(self.take(int(t[1:])//8), 'little', signed=t[0]=='i')
        if 'array' in t:
            return [self.decode(t['array'][0]) for _ in range(t['array'][1])]
        if 'vec' in t:
            return [self.decode(t['vec']) for _ in range(self.decode('u32'))]
        if 'defined' in t:
            return self.struct(t['defined']['name'])
        raise ValueError(t)
    def struct(self, name):
        return {f['name']: self.decode(f['type']) for f in types[name]['fields']}

assert pda(b'global') == '4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf'
addresses = [pda(b'global'), pda(b'quote-control')]
body = {'jsonrpc':'2.0', 'id':1, 'method':'getMultipleAccounts', 'params':[addresses, {'encoding':'base64','commitment':'finalized'}]}
req = Request('https://api.mainnet-beta.solana.com', data=json.dumps(body).encode(), headers={'Content-Type':'application/json'})
with urlopen(req, timeout=30) as response:
    raw = json.load(response)
out = {'retrieved_at':datetime.now(timezone.utc).isoformat(), 'request':body, 'rpc':raw, 'decoded':{}}
for address, name, value in zip(addresses, ['Global','QuoteControl'], raw['result']['value']):
    if value is None:
        out['decoded'][name] = None
        continue
    assert value['owner'] == PROGRAM
    data = base64.b64decode(value['data'][0])
    account = next(a for a in idl['accounts'] if a['name'] == name)
    assert data[:8] == bytes(account['discriminator'])
    decoder = Decoder(data)
    out['decoded'][name] = {'address':address, 'fields':decoder.struct(name), 'bytes_consumed':decoder.offset, 'account_size':len(data)}
(ROOT / 'pump-config-snapshot.json').write_text(json.dumps(out, indent=2)+'\n')
global_fields = out['decoded']['Global']['fields']
print(json.dumps({'context':raw['result']['context'], 'creator_fee_configurable':global_fields['creator_fee_configurable'], 'max_creator_fee_bps':global_fields['max_configurable_creator_fee_bps'], 'zec_entries':[m for m in out['decoded']['QuoteControl']['fields']['mints'] if m['mint']==ZEC]}, indent=2))
