import base64
import json
import os
import secrets
import string
from datetime import datetime, timezone
from typing import Any

import httpx


class StorageError(RuntimeError):
    pass


class GitHubJsonRepository:
    def __init__(self) -> None:
        self.owner = os.getenv("GITHUB_DATA_OWNER", "")
        self.repo = os.getenv("GITHUB_DATA_REPO", "")
        self.branch = os.getenv("GITHUB_DATA_BRANCH", "main")
        self.base_path = os.getenv("GITHUB_DATA_PATH", "configurations").strip("/")
        self.token = os.getenv("GITHUB_DATA_TOKEN", "")
        self.api = "https://api.github.com"
        if not all([self.owner, self.repo, self.token]):
            raise StorageError("Storage GitHub non configurato")

    @property
    def headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }

    def _url(self, path: str) -> str:
        return f"{self.api}/repos/{self.owner}/{self.repo}/contents/{path}"

    def _code(self) -> str:
        alphabet = string.ascii_uppercase + string.digits
        return "NOVA-" + "".join(secrets.choice(alphabet) for _ in range(6))

    def _read_file(self, path: str) -> tuple[dict[str, Any], str]:
        response = httpx.get(self._url(path), headers=self.headers, params={"ref": self.branch}, timeout=15)
        if response.status_code == 404:
            raise FileNotFoundError(path)
        if response.status_code != 200:
            raise StorageError(f"GitHub read failed: {response.status_code}")
        body = response.json()
        content = base64.b64decode(body["content"]).decode("utf-8")
        return json.loads(content), body["sha"]

    def save(self, payload: dict[str, Any], code: str | None = None) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        code = code or self._code()
        path = f"{self.base_path}/{code}.json"
        sha = None
        created_at = now
        try:
            existing, sha = self._read_file(path)
            created_at = existing.get("createdAt", now)
        except FileNotFoundError:
            pass
        document = {
            **payload,
            "configurationCode": code,
            "createdAt": created_at,
            "updatedAt": now,
        }
        encoded = base64.b64encode(json.dumps(document, ensure_ascii=False, indent=2).encode("utf-8")).decode("ascii")
        request = {
            "message": f"Salva configurazione {code}",
            "content": encoded,
            "branch": self.branch,
        }
        if sha:
            request["sha"] = sha
        response = httpx.put(self._url(path), headers=self.headers, json=request, timeout=20)
        if response.status_code not in (200, 201):
            raise StorageError(f"GitHub write failed: {response.status_code} {response.text[:200]}")
        return document

    def get(self, code: str) -> dict[str, Any]:
        document, _ = self._read_file(f"{self.base_path}/{code}.json")
        return document

    def list(self, query: str = "") -> list[dict[str, Any]]:
        response = httpx.get(self._url(self.base_path), headers=self.headers, params={"ref": self.branch}, timeout=15)
        if response.status_code == 404:
            return []
        if response.status_code != 200:
            raise StorageError(f"GitHub list failed: {response.status_code}")
        query = query.strip().lower()
        results = []
        for item in response.json():
            if item.get("type") != "file" or not item.get("name", "").endswith(".json"):
                continue
            try:
                doc, _ = self._read_file(f"{self.base_path}/{item['name']}")
            except Exception:
                continue
            customer = doc.get("customer", {})
            haystack = " ".join([
                doc.get("configurationCode", ""),
                doc.get("configurationName", ""),
                customer.get("firstName", ""),
                customer.get("lastName", ""),
                customer.get("company", ""),
            ]).lower()
            if not query or query in haystack:
                results.append(doc)
        results.sort(key=lambda x: x.get("updatedAt", ""), reverse=True)
        return results

    def delete(self, code: str) -> None:
        path = f"{self.base_path}/{code}.json"
        _, sha = self._read_file(path)
        response = httpx.delete(
            self._url(path),
            headers=self.headers,
            json={"message": f"Elimina configurazione {code}", "sha": sha, "branch": self.branch},
            timeout=20,
        )
        if response.status_code != 200:
            raise StorageError(f"GitHub delete failed: {response.status_code}")
