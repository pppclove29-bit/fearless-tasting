#!/usr/bin/env python3
"""에뮬레이터 캡처를 Play 스토어 스크린샷 규격으로 자른다.

Play 폰 스크린샷: 16:9 ~ 9:16 비율, 각 변 320~3840px.
에뮬레이터(Pixel 6)는 1080x2400 = 9:20 으로 9:16 보다 길쭉해서 그대로는
거부될 수 있다. 그래서 위에서부터 1080x1920(정확히 9:16)으로 자른다.
위쪽을 남기는 이유는 헤더와 주요 콘텐츠가 위에 있기 때문이다.

캡처부터 다시 하려면:

    ADB=~/Library/Android/sdk/platform-tools/adb
    $ADB -s emulator-5554 exec-out screencap -p > /tmp/shot1.png
    python3 docs/store-assets/make-screenshots.py /tmp/shot1.png ...

인자를 주지 않으면 screenshots/ 안의 raw-*.png 를 처리한다.
로그인 후 화면을 찍어 교체할 때도 같은 방식으로 돌리면 된다.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pnglite import read_png, write_rgba_png  # noqa: E402

OUT_DIR = 'docs/store-assets/screenshots'
TARGET_W, TARGET_H = 1080, 1920


def crop_top(w, h, px, tw, th):
    """위쪽을 기준으로 tw x th 잘라낸다. 원본이 더 크면 가로는 가운데 정렬."""
    if w < tw or h < th:
        raise SystemExit(f'원본이 너무 작다: {w}x{h} < {tw}x{th}')
    ox = (w - tw) // 2
    out = bytearray(tw * th * 4)
    for y in range(th):
        s = (y * w + ox) * 4
        out[y * tw * 4:(y + 1) * tw * 4] = px[s:s + tw * 4]
    return out


def main():
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    out_dir = os.path.join(root, OUT_DIR)
    os.makedirs(out_dir, exist_ok=True)

    srcs = sys.argv[1:]
    if not srcs:
        srcs = sorted(
            os.path.join(out_dir, f) for f in os.listdir(out_dir) if f.startswith('raw-')
        )
    if not srcs:
        raise SystemExit('처리할 캡처가 없다. 인자로 PNG 경로를 주거나 raw-*.png 를 넣어라')

    for i, src in enumerate(srcs, 1):
        w, h, px = read_png(src)
        cropped = crop_top(w, h, px, TARGET_W, TARGET_H)
        dst = os.path.join(out_dir, f'screenshot-{i}.png')
        write_rgba_png(dst, TARGET_W, TARGET_H, cropped)
        print(f'{OUT_DIR}/screenshot-{i}.png ({TARGET_W}x{TARGET_H}, 9:16) ← {os.path.basename(src)}')

    if len(srcs) < 2:
        print('⚠️ Play 는 폰 스크린샷을 최소 2장 요구한다')


if __name__ == '__main__':
    main()
