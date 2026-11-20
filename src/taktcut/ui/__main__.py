"""Allow running the taktcut Web Studio UI via `python -m taktcut.ui`."""

from taktcut.ui.server import main

if __name__ == "__main__":
    raise SystemExit(main())
