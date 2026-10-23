#!/usr/bin/env python3
"""Resolve public upstream metadata. Does not deploy, pull layers or read secrets."""

import argparse
import hashlib
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

API = "https://api.github.com/repos/casdoor/casdoor"
VERSION = re.compile(r"v4\.\d+\.\d+")
LIMIT = 8 * 1024 * 1024


def fetch(url, headers=None):
    request = urllib.request.Request(url, headers={
        "User-Agent": "stuhelper-next-candidate-resolver",
        **(headers or {}),
    })
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                data = response.read(LIMIT + 1)
                if len(data) > LIMIT:
                    raise ValueError("Upstream response exceeds size limit")
                return json.loads(data), data, response.headers
        except urllib.error.HTTPError as error:
            if error.code not in (429, 500, 502, 503, 504) or attempt == 2:
                raise ValueError(f"Upstream HTTP {error.code}") from None
        except (urllib.error.URLError, TimeoutError):
            if attempt == 2:
                raise ValueError("Upstream network request failed") from None
        time.sleep(attempt + 1)
    raise ValueError("Upstream request failed")


def resolve(version):
    if version and not VERSION.fullmatch(version):
        raise ValueError("Expected an exact stable v4.X.Y release")
    release, _, _ = fetch(API + ("/releases/tags/" + version if version else "/releases/latest"))
    tag = release["tag_name"]
    if release["draft"] or release["prerelease"] or not VERSION.fullmatch(tag):
        raise ValueError("Selected release is not a stable v4 release; choose --version explicitly")
    ref, _, _ = fetch(API + "/git/ref/tags/" + tag)
    obj = ref["object"]
    for _ in range(4):
        if obj["type"] == "commit":
            break
        if obj["type"] != "tag" or not re.fullmatch(r"[0-9a-f]{40}", obj["sha"]):
            raise ValueError("Invalid upstream tag object")
        annotated, _, _ = fetch(API + "/git/tags/" + obj["sha"])
        obj = annotated["object"]
    if obj["type"] != "commit" or not re.fullmatch(r"[0-9a-f]{40}", obj["sha"]):
        raise ValueError("Release tag did not resolve to a commit")

    # Public, short-lived pull token stays in memory and is never returned.
    auth, _, _ = fetch("https://auth.docker.io/token?service=registry.docker.io&scope=repository:casbin/casdoor:pull")
    manifest, raw, headers = fetch(
        "https://registry-1.docker.io/v2/casbin/casdoor/manifests/" + tag[1:],
        {"Authorization": "Bearer " + auth["token"],
         "Accept": "application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json"},
    )
    digest = "sha256:" + hashlib.sha256(raw).hexdigest()
    if headers.get("Docker-Content-Digest") != digest:
        raise ValueError("Registry manifest digest mismatch")
    platforms = []
    for item in manifest.get("manifests", []):
        target = item.get("platform", {})
        if target.get("os") != "linux" or target.get("architecture") not in ("amd64", "arm64"):
            continue
        if not re.fullmatch(r"sha256:[0-9a-f]{64}", item["digest"]):
            raise ValueError("Invalid platform digest")
        platforms.append({"platform": target["os"] + "/" + target["architecture"], "digest": item["digest"]})
    if not platforms:
        raise ValueError("No supported Linux platform in official image index")
    return {
        "schema_version": 1,
        "status": "candidate-not-deployed",
        "repository": "https://github.com/casdoor/casdoor",
        "version": tag,
        "commit": obj["sha"],
        "release_url": "https://github.com/casdoor/casdoor/releases/tag/" + tag,
        "published_at": release["published_at"],
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "image_tag": "docker.io/casbin/casdoor:" + tag[1:],
        "image": "docker.io/casbin/casdoor@" + digest,
        "platforms": sorted(platforms, key=lambda item: item["platform"]),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", help="Exact v4.X.Y tag; omitted = latest stable release, constrained to v4")
    args = parser.parse_args()
    try:
        result = resolve(args.version)
    except (ValueError, KeyError, TypeError) as error:
        raise SystemExit("Candidate resolution failed: " + str(error)) from None
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
