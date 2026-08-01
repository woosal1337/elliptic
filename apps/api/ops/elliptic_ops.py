"""Elliptic operations CLI (COS-259).

A thin operator helper over a running instance + the local database.

    python -m ops.elliptic_ops health --base-url http://localhost:8000
    python -m ops.elliptic_ops backup --out backup.sql
    python -m ops.elliptic_ops restore --in backup.sql
"""

from __future__ import annotations

import os
import subprocess
import urllib.request

import typer

app = typer.Typer(help="Elliptic operations CLI (COS-259).")


def _pg_url() -> str:
    url = os.environ.get("DATABASE_URL", "")
    return url.replace("+asyncpg", "").replace("postgresql+asyncpg", "postgresql")


@app.command()
def health(base_url: str = typer.Option("http://localhost:8000", help="API base URL")) -> None:
    """Probe /api/v1/livez and /api/v1/readyz and print the result."""
    for probe in ("livez", "readyz"):
        url = f"{base_url.rstrip('/')}/api/v1/{probe}"
        try:
            with urllib.request.urlopen(url, timeout=5) as resp:  # noqa: S310
                typer.echo(f"{probe}: {resp.status} {resp.read().decode()[:200]}")
        except Exception as exc:
            typer.echo(f"{probe}: ERROR {exc}")
            raise typer.Exit(1) from exc


@app.command()
def backup(out: str = typer.Option("elliptic-backup.sql", "--out", help="Output file")) -> None:
    """Dump the database with pg_dump (uses DATABASE_URL)."""
    url = _pg_url()
    if not url:
        typer.echo("DATABASE_URL is not set")
        raise typer.Exit(1)
    subprocess.run(["pg_dump", "--no-owner", "-f", out, url], check=True)  # noqa: S603, S607
    typer.echo(f"Backup written to {out}")


@app.command()
def restore(in_file: str = typer.Option(..., "--in", help="SQL dump to restore")) -> None:
    """Restore the database from a pg_dump file (uses DATABASE_URL)."""
    url = _pg_url()
    if not url:
        typer.echo("DATABASE_URL is not set")
        raise typer.Exit(1)
    subprocess.run(["psql", url, "-f", in_file], check=True)  # noqa: S603, S607
    typer.echo("Restore complete")


@app.command()
def migrate() -> None:
    """Apply pending database migrations (alembic upgrade head)."""
    subprocess.run(["alembic", "upgrade", "head"], check=True)  # noqa: S607


if __name__ == "__main__":
    app()
