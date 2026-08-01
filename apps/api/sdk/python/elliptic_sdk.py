"""CompanyOS Python SDK (COS-219).

A small, typed client over the CompanyOS public REST API. Authenticate with a
personal access token (Profile → Tokens) sent as ``x-api-key``, or a
client-credentials bot token (Settings → OAuth apps).

    from elliptic_sdk import EllipticClient

    cos = EllipticClient("https://api.elliptic.sh", token="cos_pat_...")
    me = cos.me()
    for project in cos.projects(org_id):
        print(project["name"])

OAuth client-credentials helper:

    token = EllipticClient.bot_token(
        "https://api.elliptic.sh", client_id="app-...", client_secret="cos_secret_..."
    )
    cos = EllipticClient("https://api.elliptic.sh", token=token)
"""

from __future__ import annotations

from typing import Any

import httpx

__all__ = ["EllipticClient", "EllipticError"]

_ERROR_STATUS = 400


class EllipticError(RuntimeError):
    """A non-2xx response from the API."""

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(f"[{status_code}] {message}")
        self.status_code = status_code
        self.message = message


class EllipticClient:
    """A typed client for the CompanyOS REST API."""

    def __init__(self, base_url: str, token: str, *, timeout: float = 30.0) -> None:
        self._base = base_url.rstrip("/")
        self._http = httpx.Client(
            base_url=f"{self._base}/api/v1",
            headers={"x-api-key": token},
            timeout=timeout,
        )

    def close(self) -> None:
        self._http.close()

    def __enter__(self) -> EllipticClient:
        return self

    def __exit__(self, *exc: object) -> None:
        self.close()

    @staticmethod
    def bot_token(base_url: str, client_id: str, client_secret: str) -> str:
        """Exchange a confidential app's credentials for a bot token (COS-198)."""
        resp = httpx.post(
            f"{base_url.rstrip('/')}/api/v1/oauth/token",
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            },
            timeout=30.0,
        )
        if resp.status_code >= _ERROR_STATUS:
            raise EllipticError(resp.status_code, resp.text)
        return str(resp.json()["access_token"])

    def _data(self, resp: httpx.Response) -> Any:
        if resp.status_code >= _ERROR_STATUS:
            try:
                message = resp.json().get("message", resp.text)
            except ValueError:
                message = resp.text
            raise EllipticError(resp.status_code, message)
        return resp.json().get("data")

    def me(self) -> dict[str, Any]:
        return self._data(self._http.get("/users/me"))

    def orgs(self) -> list[dict[str, Any]]:
        return self._data(self._http.get("/orgs"))

    def projects(self, org_id: str) -> list[dict[str, Any]]:
        return self._data(self._http.get(f"/orgs/{org_id}/projects"))

    def create_project(self, org_id: str, name: str, key: str) -> dict[str, Any]:
        return self._data(
            self._http.post(f"/orgs/{org_id}/projects", json={"name": name, "key": key})
        )

    def tasks(self, org_id: str, project_id: str, **params: Any) -> dict[str, Any]:
        return self._data(
            self._http.get(f"/orgs/{org_id}/projects/{project_id}/tasks", params=params)
        )

    def create_task(
        self, org_id: str, project_id: str, title: str, **fields: Any
    ) -> dict[str, Any]:
        return self._data(
            self._http.post(
                f"/orgs/{org_id}/projects/{project_id}/tasks", json={"title": title, **fields}
            )
        )

    def search(self, org_id: str, query: str, *, limit: int = 20) -> dict[str, Any]:
        return self._data(
            self._http.get(f"/orgs/{org_id}/search", params={"q": query, "limit": limit})
        )

    def pql(self, org_id: str, query: str) -> dict[str, Any]:
        return self._data(self._http.post(f"/orgs/{org_id}/pql/execute", json={"query": query}))
