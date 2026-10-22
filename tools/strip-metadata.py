# Removes personal metadata from files before publishing. Edits files in place.
#   PNG: drops text/EXIF/XMP/time chunks (Canva writes design id, account id, author, title).
#   MP4/MOV: turns every 'udta' atom (recording date, device, location) into 'free'
#            and zeroes creation/modification times in mvhd/tkhd/mdhd. Size and playback unchanged.
# Usage: python3 -I tools/strip-metadata.py <file> [<file> ...]
import struct
import sys

PNG_SIG = b'\x89PNG\r\n\x1a\n'
PNG_DROP = {b'tEXt', b'zTXt', b'iTXt', b'eXIf', b'tIME'}
MP4_CONTAINERS = {b'moov', b'trak', b'mdia', b'minf', b'stbl', b'edts', b'dinf'}
MP4_TIMES = {b'mvhd', b'tkhd', b'mdhd'}


def strip_png(data):
    out, pos, dropped = [PNG_SIG], len(PNG_SIG), []
    while pos < len(data):
        length = struct.unpack('>I', data[pos:pos + 4])[0]
        kind = data[pos + 4:pos + 8]
        chunk = data[pos:pos + 12 + length]
        if kind in PNG_DROP:
            dropped.append(kind.decode())
        else:
            out.append(chunk)
        pos += 12 + length
    return b''.join(out), dropped


def strip_mp4(data):
    data = bytearray(data)
    changed = []

    def walk(start, end):
        pos = start
        while pos + 8 <= end:
            size, kind = struct.unpack('>I4s', data[pos:pos + 8])
            header = 8
            if size == 1:
                size, header = struct.unpack('>Q', data[pos + 8:pos + 16])[0], 16
            elif size == 0:
                size = end - pos
            if size < header:
                return
            if kind == b'udta':
                data[pos + 4:pos + 8] = b'free'
                data[pos + header:pos + size] = bytes(size - header)
                changed.append('udta')
            elif kind in MP4_TIMES:
                body = pos + header
                width = 8 if data[body] == 1 else 4
                data[body + 4:body + 4 + 2 * width] = bytes(2 * width)
                changed.append(kind.decode() + ' times')
            elif kind in MP4_CONTAINERS:
                walk(pos + header, pos + size)
            pos += size

    walk(0, len(data))
    return bytes(data), changed


for path in sys.argv[1:]:
    with open(path, 'rb') as f:
        data = f.read()
    if data.startswith(PNG_SIG):
        data, removed = strip_png(data)
    else:
        data, removed = strip_mp4(data)
    with open(path, 'wb') as f:
        f.write(data)
    print(path, '->', ', '.join(removed) or 'nothing to remove')
