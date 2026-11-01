"""Tests for tools/size_model.py (design calculation of the size measures, SAD §3.6)."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import size_model as sm  # noqa: E402


class BsonEncoderTest(unittest.TestCase):
    def test_spec_example_hello_world(self):
        # bsonspec.org example: {"hello": "world"} is 22 bytes
        self.assertEqual(sm.encode({"hello": "world"}),
                         b"\x16\x00\x00\x00\x02hello\x00\x06\x00\x00\x00world\x00\x00")

    def test_spec_example_array(self):
        # bsonspec.org example: {"BSON": ["awesome", 5.05, 1986]} is 49 bytes
        self.assertEqual(sm.bson_size({"BSON": ["awesome", 5.05, 1986]}), 49)

    def test_types(self):
        self.assertEqual(sm.bson_size({}), 5)
        self.assertEqual(sm.bson_size({"a": None}), 8)
        self.assertEqual(sm.bson_size({"a": 1}), 12)            # int32
        self.assertEqual(sm.bson_size({"a": 2**40}), 16)        # int64
        self.assertEqual(sm.bson_size({"a": 1.5}), 16)          # double
        self.assertEqual(sm.bson_size({"a": sm.ObjectId(b"\0" * 12)}), 20)


class BoundTest(unittest.TestCase):
    def test_worst_case_metadata_is_286_bytes(self):
        self.assertEqual(sm.bson_size(sm.worst_case_version([])), sm.METADATA_BOUND)

    def test_element_allowance_covers_array_header(self):
        # 9 bytes cover type byte + index key of up to 7 digits + NUL
        self.assertEqual(1 + len(str(9_999_999)) + 1, sm.ELEMENT_ALLOWANCE)

    def test_full_board_fits(self):
        result = sm.calculate()
        self.assertTrue(result["bound_holds"])
        self.assertLessEqual(result["m3_filled"], sm.CONTENT_LIMIT)
        self.assertLessEqual(result["m4_worst_case_metadata"], result["m3_filled"] + sm.METADATA_BOUND)
        self.assertLessEqual(result["m4_worst_case_metadata"], sm.DEFENSIVE_LIMIT)
        self.assertLessEqual(result["largest_message_m1"], sm.MESSAGE_LIMIT)
        self.assertLessEqual(result["generator_points_per_stroke"], sm.MAX_STROKE_POINTS)

    def test_generator_is_deterministic(self):
        a = sm.stroke(__import__("random").Random(1), 0, 10)
        b = sm.stroke(__import__("random").Random(1), 0, 10)
        self.assertEqual(a, b)


if __name__ == "__main__":
    unittest.main()
