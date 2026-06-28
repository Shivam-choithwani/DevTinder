import logging
import httpx
import base64
import json
from typing import Dict, List, Any, Optional
from app.config import settings

logger = logging.getLogger("devtinder.github")

class GitHubService:
    def __init__(self):
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DevTinder-AI-Service"
        }
        if settings.GITHUB_TOKEN:
            self.headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    async def get_user_data(self, username: str) -> Dict[str, Any]:
        """
        Fetch public GitHub user profile details.
        """
        url = f"https://api.github.com/users/{username}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=10.0)
                if response.status_code == 404:
                    logger.warning(f"GitHub user {username} not found.")
                    return {}
                response.raise_for_status()
                return response.json()
            except Exception as e:
                logger.error(f"Error fetching user profile for {username}: {e}")
                return {}

    async def get_user_repositories(self, username: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Fetch public repositories for a given GitHub username, sorted by recent updates.
        """
        url = f"https://api.github.com/users/{username}/repos"
        params = {
            "sort": "updated",
            "per_page": min(limit * 2, 30) # get slightly more to filter forks if needed
        }
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, params=params, timeout=10.0)
                response.raise_for_status()
                repos = response.json()
                # Filter out forks to focus on original work if possible
                original_repos = [r for r in repos if not r.get("fork")]
                if not original_repos:
                    original_repos = repos
                return original_repos[:limit]
            except Exception as e:
                logger.error(f"Error fetching repos for {username}: {e}")
                return []

    async def get_repo_languages(self, owner: str, repo: str) -> Dict[str, int]:
        """
        Fetch language distribution for a repository.
        """
        url = f"https://api.github.com/repos/{owner}/{repo}/languages"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=5.0)
                if response.status_code == 200:
                    return response.json()
                return {}
            except Exception as e:
                logger.error(f"Error fetching languages for {owner}/{repo}: {e}")
                return {}

    async def get_file_content(self, owner: str, repo: str, path: str) -> Optional[str]:
        """
        Fetch and decode file content from a repository.
        """
        url = f"https://api.github.com/repos/{owner}/{repo}/contents/{path}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(url, headers=self.headers, timeout=5.0)
                if response.status_code == 200:
                    data = response.json()
                    content_b64 = data.get("content", "")
                    if content_b64:
                        return base64.b64decode(content_b64).decode("utf-8", errors="ignore")
                return None
            except Exception as e:
                logger.debug(f"File {path} not found in {owner}/{repo}: {e}")
                return None

    async def parse_dependencies(self, owner: str, repo: str) -> List[str]:
        """
        Search for dependencies in package manager configuration files.
        """
        dependencies = []
        
        # Check package.json
        package_json_content = await self.get_file_content(owner, repo, "package.json")
        if package_json_content:
            try:
                data = json.loads(package_json_content)
                deps = data.get("dependencies", {})
                dev_deps = data.get("devDependencies", {})
                dependencies.extend(list(deps.keys()))
                dependencies.extend(list(dev_deps.keys()))
            except Exception:
                pass
                
        # Check requirements.txt
        reqs_content = await self.get_file_content(owner, repo, "requirements.txt")
        if reqs_content:
            for line in reqs_content.splitlines():
                line = line.strip()
                if line and not line.startswith("#"):
                    # split package name from version selectors (e.g. Flask==2.0.0 -> Flask)
                    dep = line.split("==")[0].split(">=")[0].split("<=")[0].split("~=")[0].strip()
                    if dep:
                        dependencies.append(dep)

        return list(set(dependencies))[:15] # cap at 15 key dependencies per repo

    async def scrape_github_profile(self, username: str) -> Dict[str, Any]:
        """
        Orchestrates fetching and aggregation of developer's GitHub information.
        """
        logger.info(f"Starting GitHub scrape for user: {username}")
        user_info = await self.get_user_data(username)
        if not user_info:
            return {}

        repos = await self.get_user_repositories(username)
        parsed_repos = []
        aggregated_languages = {}
        aggregated_topics = set()
        all_dependencies = set()

        for repo in repos:
            owner = repo["owner"]["login"]
            repo_name = repo["name"]
            
            # Fetch languages
            langs = await self.get_repo_languages(owner, repo_name)
            for lang, bytes_count in langs.items():
                aggregated_languages[lang] = aggregated_languages.get(lang, 0) + bytes_count

            # Fetch topics
            topics = repo.get("topics", [])
            for t in topics:
                aggregated_topics.add(t)

            # Get README summary
            readme = await self.get_file_content(owner, repo_name, "README.md")
            readme_summary = readme[:800] if readme else ""

            # Get dependencies
            deps = await self.parse_dependencies(owner, repo_name)
            for d in deps:
                all_dependencies.add(d)

            parsed_repos.append({
                "name": repo_name,
                "description": repo.get("description") or "",
                "languages": list(langs.keys()),
                "topics": topics,
                "readme_summary": readme_summary,
                "dependencies": deps
            })

        # Calculate language percentages
        total_lang_bytes = sum(aggregated_languages.values())
        lang_percentages = {}
        if total_lang_bytes > 0:
            lang_percentages = {
                lang: round((bytes_count / total_lang_bytes) * 100, 1)
                for lang, bytes_count in aggregated_languages.items()
            }
            # Sort by percentage descending
            lang_percentages = dict(sorted(lang_percentages.items(), key=lambda item: item[1], reverse=True))

        return {
            "username": username,
            "name": user_info.get("name") or username,
            "bio": user_info.get("bio") or "",
            "location": user_info.get("location") or "",
            "public_repos": user_info.get("public_repos", 0),
            "repositories": parsed_repos,
            "languages": lang_percentages,
            "topics": list(aggregated_topics),
            "dependencies": list(all_dependencies)
        }

github_service = GitHubService()
