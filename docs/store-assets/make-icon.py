#!/usr/bin/env python3
"""Play 스토어용 512x512 아이콘 생성.

apps/web/public/icons/icon-512.png 는 모서리가 둥글고 그 바깥이 투명하다.
Play 는 투명도를 허용하지 않고 둥근 모서리도 직접 넣지 말라고 한다
(스토어가 알아서 마스킹한다). 그래서 아이콘 본체와 같은 색(#111111)으로
알파를 합성해 모서리를 메운 정사각형 32비트 PNG 를 만든다.

의존성 없음 (표준 라이브러리만). 아이콘 디자인이 바뀔 때만 다시 돌리면 된다.

    python3 docs/store-assets/make-icon.py
"""
import os
import zlib, struct

def read_png(path):
    d = open(path,'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', 'not png'
    pos, idat, ihdr, plte, trns = 8, b'', None, None, None
    while pos < len(d):
        ln = struct.unpack('>I', d[pos:pos+4])[0]
        typ = d[pos+4:pos+8]
        data = d[pos+8:pos+8+ln]
        if typ == b'IHDR': ihdr = struct.unpack('>IIBBBBB', data)
        elif typ == b'IDAT': idat += data
        elif typ == b'PLTE': plte = data
        elif typ == b'tRNS': trns = data
        pos += 12 + ln
    w, h, depth, ctype, comp, filt, inter = ihdr
    assert depth == 8 and inter == 0, f'unsupported depth={depth} interlace={inter}'
    nch = {0:1, 2:3, 3:1, 4:2, 6:4}[ctype]
    raw = zlib.decompress(idat)
    bpp = nch
    stride = w * bpp
    out = bytearray(h * stride)
    prev = bytearray(stride)
    p = 0
    for y in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p+stride]); p += stride
        if f == 1:
            for i in range(bpp, stride): line[i] = (line[i] + line[i-bpp]) & 255
        elif f == 2:
            for i in range(stride): line[i] = (line[i] + prev[i]) & 255
        elif f == 3:
            for i in range(stride):
                a = line[i-bpp] if i >= bpp else 0
                line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255
        elif f == 4:
            for i in range(stride):
                a = line[i-bpp] if i >= bpp else 0
                c = prev[i-bpp] if i >= bpp else 0
                b = prev[i]
                pa, pb, pc = abs(b-c), abs(a-c), abs(a+b-2*c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        out[y*stride:(y+1)*stride] = line
        prev = line
    # normalise to RGBA
    px = bytearray(w*h*4)
    for i in range(w*h):
        if ctype == 6: px[i*4:i*4+4] = out[i*4:i*4+4]
        elif ctype == 2: px[i*4:i*4+3] = out[i*3:i*3+3]; px[i*4+3] = 255
        elif ctype == 0: v = out[i]; px[i*4:i*4+3] = bytes([v,v,v]); px[i*4+3] = 255
        elif ctype == 4: v = out[i*2]; px[i*4:i*4+3] = bytes([v,v,v]); px[i*4+3] = out[i*2+1]
        elif ctype == 3:
            idx = out[i]; px[i*4:i*4+3] = plte[idx*3:idx*3+3]
            px[i*4+3] = trns[idx] if trns and idx < len(trns) else 255
    return w, h, px


def write_rgba_png(path, w, h, px_rgba):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw += px_rgba[y*w*4:(y+1)*w*4]
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t+d) & 0xffffffff)
    out = b'\x89PNG\r\n\x1a\n'
    out += chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
    out += chunk(b'IDAT', zlib.compress(bytes(raw), 9))
    out += chunk(b'IEND', b'')
    open(path,'wb').write(out)

SRC = 'apps/web/public/icons/icon-512.png'
DST = 'docs/store-assets/icon-512.png'
BG = (17, 17, 17)  # 아이콘 본체 색. 이 색으로 메워야 모서리가 이어진다.


def main():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    src, dst = os.path.join(root, SRC), os.path.join(root, DST)
    w, h, px = read_png(src)
    if (w, h) != (512, 512):
        raise SystemExit(f'원본이 512x512 가 아니다: {w}x{h}')

    out = bytearray(w * h * 4)
    for i in range(w * h):
        r, g, b, a = px[i * 4:i * 4 + 4]
        if a == 255:
            nr, ng, nb = r, g, b
        else:
            f = a / 255.0
            nr = round(r * f + BG[0] * (1 - f))
            ng = round(g * f + BG[1] * (1 - f))
            nb = round(b * f + BG[2] * (1 - f))
        out[i * 4:i * 4 + 4] = bytes([nr, ng, nb, 255])

    write_rgba_png(dst, w, h, out)

    # 투명 픽셀이 하나라도 남으면 Play 가 거부한다
    _, _, check = read_png(dst)
    if {check[i * 4 + 3] for i in range(w * h)} != {255}:
        raise SystemExit('투명 픽셀이 남았다')
    print(f'{DST} 생성 완료 (512x512, 32비트, 투명 없음)')


if __name__ == '__main__':
    main()
