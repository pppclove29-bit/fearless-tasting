#!/usr/bin/env python3
"""Play 스토어용 1024x500 그래픽 이미지(featureGraphic) 생성.

앱 안에 배너용 소스가 없어서, 512 아이콘을 아이콘 본체와 같은 색(#111111)
캔버스 중앙에 올려 배너를 만든다. 아이콘에 "무식가" 워드마크가 이미 있어
텍스트 렌더링 없이도 배너로 성립한다(이 머신에 폰트 라이브러리가 없다).

품질 기준은 "테스트 앱" 수준이다. 나중에 디자인을 제대로 하면 교체하면 된다.

    python3 docs/store-assets/make-banner.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pnglite import read_png, write_rgba_png, box_resize  # noqa: E402

SRC = 'docs/store-assets/icon-512.png'
DST = 'docs/store-assets/feature-graphic-1024x500.png'
W, H = 1024, 500
ICON = 360  # 위아래 70px 여백
BG = (17, 17, 17)


def main():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    src, dst = os.path.join(root, SRC), os.path.join(root, DST)
    if not os.path.exists(src):
        raise SystemExit(f'{SRC} 가 없다. 먼저 make-icon.py 를 돌려라')

    iw, ih, ipx = read_png(src)
    icon = box_resize(iw, ih, ipx, ICON, ICON)

    canvas = bytearray(bytes(BG) + b'\xff') * (W * H)
    ox, oy = (W - ICON) // 2, (H - ICON) // 2
    for y in range(ICON):
        s = y * ICON * 4
        d = ((oy + y) * W + ox) * 4
        canvas[d:d + ICON * 4] = icon[s:s + ICON * 4]

    write_rgba_png(dst, W, H, canvas)

    w2, h2, chk = read_png(dst)
    if (w2, h2) != (W, H):
        raise SystemExit(f'크기가 틀렸다: {w2}x{h2}')
    if {chk[i * 4 + 3] for i in range(w2 * h2)} != {255}:
        raise SystemExit('투명 픽셀이 남았다')
    print(f'{DST} 생성 완료 ({W}x{H}, 32비트, 투명 없음)')


if __name__ == '__main__':
    main()
