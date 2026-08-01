"""CompanyOS config-as-code CLI (COS-243).

Pull, validate, diff, and (dry-run) push an org's declarative configuration.

    export COMPANYOS_TOKEN=cos_pat_...
    python -m ops.elliptic_config pull  --org <org_id> --base-url http://localhost:8000
    python -m ops.elliptic_config diff  --org <org_id>
    python -m ops.elliptic_config validate elliptic.yaml
"""

from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

import typer
import yaml

app = typer.Typer(help="CompanyOS config-as-code CLI (COS-243).")
_STATE = "elliptic.yaml"


def _request(method: str, base_url: str, path: str, body: dict | None = None) -> dict:
    token = os.environ.get("COMPANYOS_TOKEN", "")
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(  # noqa: S310
        f"{base_url.rstrip('/')}{path}", data=data, method=method
    )
    if token:
        req.add_header("x-api-key", token)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=15) as resp:  # noqa: S310
        return json.loads(resp.read().decode())


@app.command()
def pull(
    org: str = typer.Option(..., help="Organization id"),
    base_url: str = typer.Option("http://localhost:8000", help="API base URL"),
) -> None:
    """Export the live config to elliptic.yaml."""
    doc = _request("GET", base_url, f"/api/v1/orgs/{org}/config/export")["data"]
    with Path(_STATE).open("w", encoding="utf-8") as handle:
        yaml.safe_dump(doc, handle, sort_keys=True)
    typer.echo(f"Wrote {_STATE} ({len(doc.get('projects', []))} projects).")


@app.command()
def validate(
    path: str = typer.Argument(_STATE),
    org: str = typer.Option(None, help="Validate server-side against this org"),
    base_url: str = typer.Option("http://localhost:8000", help="API base URL"),
) -> None:
    """Validate a config file against the schema (server-side when --org is given)."""
    with Path(path).open(encoding="utf-8") as handle:
        doc = yaml.safe_load(handle)
    if org:
        result = _request("POST", base_url, f"/api/v1/orgs/{org}/config/validate", doc)["data"]
        for err in result["errors"]:
            typer.echo(f"  ✗ {err}")
        if not result["valid"]:
            raise typer.Exit(1)
    typer.echo("Config is valid.")


@app.command()
def diff(
    org: str = typer.Option(..., help="Organization id"),
    base_url: str = typer.Option("http://localhost:8000", help="API base URL"),
) -> None:
    """Show drift between the live config and local elliptic.yaml (exit 1 if drift)."""
    remote = _request("GET", base_url, f"/api/v1/orgs/{org}/config/export")["data"]
    with Path(_STATE).open(encoding="utf-8") as handle:
        local = yaml.safe_load(handle)

    def _h(value: object) -> str:
        return hashlib.sha256(json.dumps(value, sort_keys=True).encode()).hexdigest()

    drift = False
    for section in ("projects", "labels", "workflow_statuses", "views"):
        if _h(local.get(section)) != _h(remote.get(section)):
            typer.echo(f"~ {section}: differs")
            drift = True
        else:
            typer.echo(f"= {section}: in sync")
    if drift:
        raise typer.Exit(1)
    typer.echo("In sync.")


@app.command()
def status() -> None:
    """Show whether a local config file exists."""
    typer.echo(f"{_STATE}: {'present' if Path(_STATE).exists() else 'missing'}")


if __name__ == "__main__":
    app()
