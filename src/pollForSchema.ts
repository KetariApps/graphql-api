import getSchemaFromGithub from "./getSchemaFromGithub";

interface PollForSchemaProps {
  accessToken: string;
  repoOwner: string;
  repoName: string;
  filePath: string;
  onDiffTrue: () => void;
  interval?: number;
}

export function pollForSchema({
  accessToken,
  repoOwner,
  repoName,
  filePath,
  onDiffTrue,
  interval = 60000,
}: PollForSchemaProps) {
  let oldSchema: string | undefined = undefined;
  const intervalId = setInterval(async () => {
    try {
      // Perform the resource polling action (e.g., make an HTTP request)
      const newSchema = await getSchemaFromGithub({
        accessToken,
        repoOwner,
        repoName,
        filePath,
      });
      const schemaChanged = oldSchema !== undefined && newSchema !== oldSchema;
      console.log(
        `${
          schemaChanged
            ? `[${new Date().toISOString()}] Schema is stale, reloading.`
            : `[${new Date().toISOString()}] Schema is fresh.`
        }`
      );

      if (schemaChanged) {
        onDiffTrue();
      } else {
        oldSchema = newSchema;
      }
    } catch (error) {
      const timestamp = new Date().toISOString();
      console.error(`[${timestamp}] [ERROR]: ${error}`);
    }
  }, interval);

  // Optionally, add a function to stop polling
  function stopPolling() {
    clearInterval(intervalId);
  }

  // Return a function to stop polling when needed
  return stopPolling;
}
