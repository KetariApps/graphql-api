import { Octokit } from "octokit";

interface GetSchemaFromGithubProps {
  accessToken?: string;
  repoOwner: string;
  repoName: string;
  filePath: string;
}
export default async function getSchemaFromGithub({
  accessToken,
  repoOwner,
  repoName,
  filePath,
}: GetSchemaFromGithubProps) {
  const octokit = new Octokit({
    auth: accessToken || null,
  });

  try {
    const response = await octokit.request(
      `GET /repos/${repoOwner}/${repoName}/contents/${filePath}`,
      {
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    );

    if (response.status === 200 && response.data && response.data.content) {
      // Decode and process the plain text content
      const fileContentBase64 = response.data.content;
      const fileContent = Buffer.from(fileContentBase64, "base64").toString(
        "utf-8"
      );

      return fileContent;
    } else {
      console.error("File not found or unable to retrieve content");
      console.error("GitHub API Response:", response);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
