export function databaseUrl(value = process.env.DATABASE_URL) {
  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2 ||
      url.hash
    )
      throw new Error();
    return value;
  } catch {
    throw new Error(
      "Set DATABASE_URL to a PostgreSQL connection string, or run npm run setup for a local database.",
    );
  }
}

export function localDatabaseUrl(env) {
  return `postgresql://${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:${env.POSTGRES_PORT}/${encodeURIComponent(env.POSTGRES_DB)}`;
}

export function managesLocalDatabase(env = process.env) {
  return Boolean(
    env.COMPOSE_PROJECT_NAME &&
    env.POSTGRES_USER &&
    env.POSTGRES_PASSWORD &&
    env.POSTGRES_DB &&
    env.POSTGRES_PORT &&
    env.DATABASE_URL === localDatabaseUrl(env),
  );
}

export function databaseError(error) {
  const code = error.cause?.code || error.code;
  const explanations = {
    ECONNREFUSED:
      "PostgreSQL is not reachable. Start Docker and run npm run db:up, or check your database host and port.",
    ENOTFOUND: "The PostgreSQL host could not be found. Check DATABASE_URL.",
    ETIMEDOUT:
      "The PostgreSQL connection timed out. Check network access and your database host.",
    "28P01":
      "PostgreSQL rejected the credentials. Check your private environment settings.",
    "3D000": "The configured PostgreSQL database does not exist.",
    42501: "The PostgreSQL role lacks the required permissions.",
  };
  return (
    explanations[code] ||
    `PostgreSQL operation failed${code ? ` (${code})` : ""}. Check the connection, permissions, and migration SQL. Connection strings are not printed.`
  );
}
