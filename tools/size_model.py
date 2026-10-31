"""Design calculation for the size measures M1-M4 (SAD §3.6, SRS FR-008, STP TC-022).

Usage:  python tools/size_model.py            (prints the calculation)
        python tools/size_model.py --json     (machine-readable result)

Standard library only. This is a *design calculation*: it encodes synthetic board objects with a
small BSON encoder written to the BSON specification (bsonspec.org) and Socket.IO packets as JSON
text, so the bound "M4 <= M3 + 286 bytes" and the TB-STD estimate can be checked with real encoded
byte counts. It does not measure the application; TC-022 does that (boardLimit.test.js).

Measures:
  M1  bytes of one Socket.IO packet ("42" + ack id + JSON array [event, payload])
  M2  BSON size of one object in snapshot form
  M3  sum over objects of (M2 + 9)
  M4  BSON size of the complete version document
"""
import datetime
import json
import random
import struct
import sys

MESSAGE_LIMIT = 65_536            # M1 limit (maxHttpBufferSize)
GENERATOR_PAYLOAD_CAP = 60_000    # gen-board-fill keeps the JSON payload at or below this
MAX_STROKE_POINTS = 2_000         # object schema limit (SAD §4.1.1, D1c)
CONTENT_LIMIT = 15 * 1024 * 1024  # M3 limit, 15,728,640 bytes
MONGO_LIMIT = 16 * 1024 * 1024    # 16,777,216 bytes
DEFENSIVE_LIMIT = MONGO_LIMIT - 64 * 1024
ELEMENT_ALLOWANCE = 9             # array element header allowance counted in M3
METADATA_BOUND = 286              # SAD §3.6 derivation


class ObjectId(bytes):
    """12-byte ObjectId placeholder."""


class Int64(int):
    """Integer that is encoded as BSON int64 (like a JavaScript Long / boards.seq)."""


# --------------------------------------------------------------------------- BSON encoder
def _cstring(key):
    raw = key.encode("utf-8")
    if b"\x00" in raw:
        raise ValueError("key contains NUL")
    return raw + b"\x00"


def _element(key, value):
    name = _cstring(key)
    if value is None:
        return b"\x0a" + name
    if isinstance(value, bool):
        return b"\x08" + name + (b"\x01" if value else b"\x00")
    if isinstance(value, ObjectId):
        if len(value) != 12:
            raise ValueError("ObjectId must have 12 bytes")
        return b"\x07" + name + bytes(value)
    if isinstance(value, Int64):
        return b"\x12" + name + struct.pack("<q", value)
    if isinstance(value, int):
        if -2**31 <= value < 2**31:
            return b"\x10" + name + struct.pack("<i", value)
        return b"\x12" + name + struct.pack("<q", value)
    if isinstance(value, float):
        return b"\x01" + name + struct.pack("<d", value)
    if isinstance(value, str):
        raw = value.encode("utf-8") + b"\x00"
        return b"\x02" + name + struct.pack("<i", len(raw)) + raw
    if isinstance(value, datetime.datetime):
        millis = int(value.timestamp() * 1000)
        return b"\x09" + name + struct.pack("<q", millis)
    if isinstance(value, dict):
        return b"\x03" + name + encode(value)
    if isinstance(value, (list, tuple)):
        return b"\x04" + name + encode({str(i): v for i, v in enumerate(value)})
    raise TypeError(f"unsupported type {type(value).__name__}")


def encode(document):
    """Encode a dict as a BSON document."""
    body = b"".join(_element(k, v) for k, v in document.items())
    return struct.pack("<i", len(body) + 5) + body + b"\x00"


def bson_size(document):
    return len(encode(document))


# --------------------------------------------------------------------------- generator
def _coordinate(rng):
    value = round(rng.uniform(0, 4000), 1)
    if value == int(value):          # keep it a non-integer so JSON and BSON both treat it as a double
        value += 0.1
    return round(value, 1)


def stroke(rng, index, points):
    return {
        "id": f"00000000-0000-4000-8000-{index:012d}",
        "kind": "stroke",
        "points": [[_coordinate(rng), _coordinate(rng)] for _ in range(points)],
        "color": "#1E88E5",
        "strokeWidth": 3,
    }


def message_size(obj, ack_id=999_999):
    """M1: Socket.IO v4 text packet '42<ackId>["op:submit",{...}]' as UTF-8 bytes."""
    payload = {"boardId": "000000000000000000000001", "clientOpId": f"c{ack_id}",
               "type": "object:add", "payload": obj}
    text = json.dumps(["op:submit", payload], separators=(",", ":"), ensure_ascii=False)
    return len(("42" + str(ack_id) + text).encode("utf-8")), len(json.dumps(payload, separators=(",", ":")).encode("utf-8"))


def gen_board_fill(seed=22):
    """Deterministic fill used by TC-022: strokes of at most MAX_STROKE_POINTS points whose JSON payload
    is <= GENERATOR_PAYLOAD_CAP (both checked on the generated data, not assumed)."""
    rng = random.Random(seed)
    # find the largest point count that respects the payload cap (checked on generated data, not assumed)
    points = 1
    while points + 50 <= MAX_STROKE_POINTS:
        probe = stroke(random.Random(seed), 0, points + 50)
        if message_size(probe)[1] > GENERATOR_PAYLOAD_CAP:
            break
        points += 50
    objects, m3, largest_m1 = [], 0, 0
    while True:
        obj = stroke(rng, len(objects), points)
        m1, payload = message_size(obj)
        while payload > GENERATOR_PAYLOAD_CAP:      # coordinates vary in length; shrink if needed
            obj["points"].pop()
            m1, payload = message_size(obj)
        m2 = bson_size(obj)
        if m3 + m2 + ELEMENT_ALLOWANCE > CONTENT_LIMIT:
            break
        objects.append(obj)
        m3 += m2 + ELEMENT_ALLOWANCE
        largest_m1 = max(largest_m1, m1)
    return objects, m3, points, largest_m1


def worst_case_version(objects):
    """Version document with every metadata field at its maximum allowed size."""
    return {
        "_id": ObjectId(b"\x01" * 12),
        "boardId": ObjectId(b"\x02" * 12),
        "number": 2**31 - 1,
        "boardSeq": Int64(2**62),
        "trigger": "x" * 16,
        "restoredFrom": 2**31 - 1,
        "createdAt": datetime.datetime(2026, 10, 10, tzinfo=datetime.timezone.utc),
        "createdBy": "g" * 64,
        "requestId": "00000000-0000-4000-8000-000000000000",
        "objects": objects,
    }


def tb_std(seed=7):
    """TB-STD composition: 300 strokes of <= 200 points, 50 shapes, 20 text objects."""
    rng = random.Random(seed)
    objects = [stroke(rng, i, 200) for i in range(300)]
    for i in range(50):
        objects.append({"id": f"00000000-0000-4000-9000-{i:012d}", "kind": "rect", "x": _coordinate(rng),
                        "y": _coordinate(rng), "w": _coordinate(rng), "h": _coordinate(rng),
                        "color": "#43A047", "strokeWidth": 2})
    for i in range(20):
        objects.append({"id": f"00000000-0000-4000-a000-{i:012d}", "kind": "text", "x": _coordinate(rng),
                        "y": _coordinate(rng), "text": "T" * 200, "color": "#000000", "strokeWidth": 1})
    return objects


def calculate():
    objects, m3, points, largest_m1 = gen_board_fill()
    version = worst_case_version(objects)
    m4 = bson_size(version)
    empty_overhead = bson_size(worst_case_version([]))
    std = tb_std()
    std_m3 = sum(bson_size(o) + ELEMENT_ALLOWANCE for o in std)
    return {
        "generator_points_per_stroke": points,
        "generator_objects": len(objects),
        "largest_message_m1": largest_m1,
        "message_limit": MESSAGE_LIMIT,
        "m2_first_stroke": bson_size(objects[0]),
        "m3_filled": m3,
        "content_limit": CONTENT_LIMIT,
        "m4_worst_case_metadata": m4,
        "m4_minus_m3": m4 - m3,
        "overhead_empty_version": empty_overhead,
        "metadata_bound": METADATA_BOUND,
        "defensive_limit": DEFENSIVE_LIMIT,
        "mongo_limit": MONGO_LIMIT,
        "margin_to_defensive": DEFENSIVE_LIMIT - m4,
        "tb_std_objects": len(std),
        "tb_std_m3": std_m3,
        "bound_holds": (m4 <= m3 + METADATA_BOUND and empty_overhead <= METADATA_BOUND
                        and m4 <= DEFENSIVE_LIMIT and largest_m1 <= MESSAGE_LIMIT and points <= MAX_STROKE_POINTS),
    }


def main(argv):
    result = calculate()
    if "--json" in argv:
        print(json.dumps(result, indent=2))
    else:
        print("Size model (design calculation, not an application measurement)")
        for key, value in result.items():
            print(f"  {key:28s} {value:,}" if isinstance(value, int) and not isinstance(value, bool) else f"  {key:28s} {value}")
    return 0 if result["bound_holds"] else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
