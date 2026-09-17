import importlib.util
import pathlib
import unittest
from datetime import datetime


SCRIPT = pathlib.Path(__file__).parents[1] / "skills/cf-file-upload/scripts/upload_file.py"
SPEC = importlib.util.spec_from_file_location("upload_file", SCRIPT)
UPLOAD_FILE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(UPLOAD_FILE)


class UploadPathTests(unittest.TestCase):
    def test_custom_paths_are_scoped_to_uploads(self):
        self.assertEqual(UPLOAD_FILE.normalize_upload_path("avatar.png"), "uploads/avatar.png")
        self.assertEqual(UPLOAD_FILE.normalize_upload_path("blog/cover.jpg"), "uploads/blog/cover.jpg")
        self.assertEqual(UPLOAD_FILE.normalize_upload_path("uploads/cover.jpg"), "uploads/cover.jpg")
        with self.assertRaisesRegex(ValueError, "file name"):
            UPLOAD_FILE.normalize_upload_path("uploads/")

    def test_default_paths_are_dated_and_scoped_to_uploads(self):
        path = UPLOAD_FILE.generate_upload_path(
            pathlib.Path("report.PDF"),
            now=datetime(2026, 9, 17),
            token="a1b2c3d4",
        )
        self.assertEqual(path, "uploads/20260917/a1b2c3d4.pdf")


if __name__ == "__main__":
    unittest.main()
