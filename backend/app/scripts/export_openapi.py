"""Write the OpenAPI document to stdout (used by `make gen-api`)."""

from __future__ import annotations

import json
import sys

from app.main import create_app


def main() -> None:
    json.dump(create_app().openapi(), sys.stdout, indent=2)


if __name__ == "__main__":
    main()
