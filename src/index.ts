import { Neo4jGraphQL } from "@neo4j/graphql";
import neo4j from "neo4j-driver";
import { mergeTypeDefs } from "@graphql-tools/merge";
import * as dotenv from "dotenv";
import getSchemaFromGithub from "./getSchemaFromGithub";
import requestLogger from "./logging/requestLogger";
import { pollForSchema } from "./pollForSchema";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

const startServer = async () => {
  console.log(`[${new Date().toISOString()}] Starting server.`);
  //// env stuff
  dotenv.config();

  if (
    process.env.NEO_URI === undefined ||
    process.env.NEO_USER === undefined ||
    process.env.NEO_PASS === undefined ||
    process.env.PORT === undefined ||
    process.env.PRODUCTION === undefined ||
    process.env.GITHUB_REPO_OWNER === undefined ||
    process.env.GITHUB_REPO_NAME === undefined ||
    process.env.GITHUB_TARGET_FILE_PATH === undefined
  ) {
    console.error("undefined environment variables");
    return;
  }
  console.log(`Production mode is: ${process.env.PRODUCTION}`);

  const plaintextSchema = await getSchemaFromGithub({
    accessToken: process.env.GITHUB_ACCESS_TOKEN,
    repoName: process.env.GITHUB_REPO_NAME,
    repoOwner: process.env.GITHUB_REPO_OWNER,
    filePath: process.env.GITHUB_TARGET_FILE_PATH,
  });
  if (plaintextSchema === undefined) {
    throw new Error(
      `Could not get a schema from ${JSON.stringify(
        {
          repoName: process.env.GITHUB_REPO_NAME,
          repoOwner: process.env.GITHUB_REPO_OWNER,
          filePath: process.env.GITHUB_TARGET_FILE_PATH,
        },
        null,
        2
      )}`
    );
  } else {
    console.debug(
      `Got schema from ${JSON.stringify(
        {
          repoName: process.env.GITHUB_REPO_NAME,
          repoOwner: process.env.GITHUB_REPO_OWNER,
          filePath: process.env.GITHUB_TARGET_FILE_PATH,
        },
        null,
        2
      )}`
    );
  }

  const typeDefs = mergeTypeDefs([plaintextSchema]);
  const driver = neo4j.driver(
    process.env.NEO_URI,
    neo4j.auth.basic(process.env.NEO_USER, process.env.NEO_PASS)
  );
  const neoSchema = new Neo4jGraphQL({
    typeDefs,
    driver,
  });

  Promise.all([neoSchema.getSchema()]).then(async ([schema]) => {
    const server = new ApolloServer({
      schema,
      introspection: process.env.PRODUCTION === "FALSE",
      logger: requestLogger,
      plugins: [
        {
          async requestDidStart(ctx) {
            ctx.logger.debug(JSON.stringify(ctx.request, null, 2));
          },
          async unexpectedErrorProcessingRequest({ requestContext, error }) {
            console.error(error, JSON.stringify(requestContext, undefined, 2));
          },
          async invalidRequestWasReceived({ error }) {
            console.error(error);
          },
        },
      ],
    });

    const shutdown = () => {
      console.log("Shutting down server");
      server.stop().then(async () => {
        await driver.close();
        console.log("Server stopped");
        process.exit();
      });
    };

    const softStop = () => {
      console.log("Shutting down server");
      server.stop().then(async () => {
        await driver.close();
        console.log("Server stopped");
      });
    };

    function restart() {
      console.log("Restarting server...");
      softStop();
      startServer();
    }

    // Listen for SIGINT signal
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    const { url } = await startStandaloneServer(server, {
      listen: { port: Number(process.env.PORT) || 4000 },
    });
    console.log(`🚀 Server ready at ${url}`);
    const stopPolling = pollForSchema({
      accessToken: process.env.GITHUB_ACCESS_TOKEN!,
      repoName: process.env.GITHUB_REPO_NAME!,
      repoOwner: process.env.GITHUB_REPO_OWNER!,
      filePath: process.env.GITHUB_TARGET_FILE_PATH!,
      interval: 300000,
      onDiffTrue: () => {
        stopPolling();
        restart();
      },
    });
  });
};

startServer();
