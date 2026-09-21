#!/usr/bin/env python3
"""Play 스토어용 512x512 아이콘 생성.

apps/web/public/icons/icon-512.png 는 모서리가 둥글고 그 바깥이 투명하다.
Play 는 투명도를 허용하지 않고 둥근 모서리도 직접 넣지 말라고 한다
(스토어가 알아서 마스킹한다). 그래서 아이콘 본체와 같은 색(#111111)으로
알파를 합성해 모서리를 메운 정사각형 32비트 PNG 를 만든다.

    python3 docs/store-assets/make-icon.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pnglite import read_png, write_rgba_png  # noqa: E402

SRC = 'apps/web/public/icons/icon-512.png'
DST = 'docs/store-assets/icon-512.png'
BG = (17, 17, 17)  # 아이콘 본체 색. 이 색으로 메워야 모서리가 이어진다.


def flatten(w, h, px, bg):
    """알파를 단색 배경에 합성해 투명을 없앤다. 알파 채널은 255 로 남긴다."""
    out = bytearray(w * h * 4)
    for i in range(w * h):
        r, g, b, a = px[i * 4:i * 4 + 4]
        if a == 255:
            nr, ng, nb = r, g, b
        else:
            f = a / 255.0
            nr = round(r * f + bg[0] * (1 - f))
            ng = round(g * f + bg[1] * (1 - f))
            nb = round(b * f + bg[2] * (1 - f))
        out[i * 4:i * 4 + 4] = bytes([nr, ng, nb, 255])
    return out


def assert_opaque(path, w, h):
    """투명 픽셀이 하나라도 남으면 Play 가 거부한다."""
    _, _, px = read_png(path)
    if {px[i * 4 + 3] for i in range(w * h)} != {255}:
        raise SystemExit(f'{path}: 투명 픽셀이 남았다')


def main():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    src, dst = os.path.join(root, SRC), os.path.join(root, DST)
    w, h, px = read_png(src)
    if (w, h) != (512, 512):
        raise SystemExit(f'원본이 512x512 가 아니다: {w}x{h}')
    write_rgba_png(dst, w, h, flatten(w, h, px, BG))
    assert_opaque(dst, w, h)
    print(f'{DST} 생성 완료 (512x512, 32비트, 투명 없음)')


if __name__ == '__main__':
    main()
