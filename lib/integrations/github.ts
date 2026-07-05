import { prisma } from "@/lib/prisma";

export interface GitHubIssue {
  title: string;
  body: string;
  state?: "open" | "closed";
}

async function getGithubToken(userId: string) {
  const integration = await prisma.integration.findFirst({
    where: { userId, type: "GITHUB" },
  });
  return integration?.accessToken;
}

export async function createGitHubIssue(
  userId: string,
  repo: string,
  issue: GitHubIssue,
) {
  const token = await getGithubToken(userId);
  if (!token) throw new Error("GitHub not connected");

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(issue),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to create GitHub issue");
  }

  return await res.json();
}

export async function updateGitHubIssue(
  userId: string,
  repo: string,
  issueNumber: number,
  issue: Partial<GitHubIssue>,
) {
  const token = await getGithubToken(userId);
  if (!token) throw new Error("GitHub not connected");

  const res = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(issue),
    },
  );

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || "Failed to update GitHub issue");
  }

  return await res.json();
}

export async function syncTaskToGitHub(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      githubIssueNumber: true,
      project: {
        select: {
          githubRepo: true,
        },
      },
    },
  });

  if (!task || !task.project?.githubRepo) return;

  const githubIssue: GitHubIssue = {
    title: task.title,
    body: task.description || "",
    state: task.status === "DONE" ? "closed" : "open",
  };

  try {
    if (task.githubIssueNumber) {
      await updateGitHubIssue(
        userId,
        task.project.githubRepo,
        task.githubIssueNumber,
        githubIssue,
      );
    } else {
      const createdIssue = await createGitHubIssue(
        userId,
        task.project.githubRepo,
        githubIssue,
      );
      await prisma.task.update({
        where: { id: taskId },
        data: { githubIssueNumber: createdIssue.number },
      });
    }
  } catch (error) {
    console.error(`[GITHUB_SYNC_ERROR] Task ${taskId}:`, error);
  }
}
