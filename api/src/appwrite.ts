import { Client, Account, Databases, Users } from 'node-appwrite';
import type { Env } from './env';

export function adminClient(env: Env) {
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);
  return {
    client,
    account: new Account(client),
    databases: new Databases(client),
    users: new Users(client),
  };
}

export function sessionClient(env: Env, sessionSecret: string) {
  const client = new Client()
    .setEndpoint(env.APPWRITE_ENDPOINT)
    .setProject(env.APPWRITE_PROJECT_ID)
    .setSession(sessionSecret);
  return { client, account: new Account(client), databases: new Databases(client) };
}
