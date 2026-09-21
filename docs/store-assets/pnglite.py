"""의존성 없는 최소 PNG 입출력 (표준 라이브러리만).

이 머신에 PIL·ImageMagick 이 없어서 스토어 자산 생성용으로 직접 만들었다.
8비트 비인터레이스 PNG 만 지원한다. 범용 라이브러리가 아니다.
"""
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


def box_resize(w, h, px, nw, nh):
    """박스 필터 축소. 정수배가 아니어도 동작하고 축소에 한해 결과가 깔끔하다."""
    out = bytearray(nw * nh * 4)
    for y in range(nh):
        y0, y1 = y * h // nh, max(y * h // nh + 1, (y + 1) * h // nh)
        for x in range(nw):
            x0, x1 = x * w // nw, max(x * w // nw + 1, (x + 1) * w // nw)
            r = g = b = a = n = 0
            for sy in range(y0, y1):
                base = sy * w
                for sx in range(x0, x1):
                    i = (base + sx) * 4
                    r += px[i]; g += px[i+1]; b += px[i+2]; a += px[i+3]; n += 1
            i = (y * nw + x) * 4
            out[i:i+4] = bytes([r//n, g//n, b//n, a//n])
    return out
