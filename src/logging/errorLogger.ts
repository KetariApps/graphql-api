import { GraphQLError } from 'graphql';

export default function errorFormatter(error: GraphQLError) {
  const timestamp = new Date().toISOString();
  console.debug(`[${timestamp}] [DEBUG]: ${error}`);
  return error;
}
