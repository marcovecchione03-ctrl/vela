export function enforceTestDatabaseIsolation(dbUrl?: string, testDbUrl?: string) {
  if (!testDbUrl) {
    throw new Error("DATABASE_URL_TEST is missing. Test database isolation cannot be guaranteed.");
  }
  
  if (testDbUrl === dbUrl) {
    throw new Error("DATABASE_URL_TEST cannot be equal to DATABASE_URL. Test database isolation failed.");
  }
}
