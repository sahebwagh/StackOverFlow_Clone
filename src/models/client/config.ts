import env from "@/app/env";

import { Client, Account, Avatars, Databases, Storage } from "appwrite";

const client = new Client()
    .setEndpoint(env.appwrite.endpoint)  // your api end point
    .setProject(env.appwrite.projectid) // your project ID
    
const databases = new Databases(client)
const account = new Account(client)
const avatars = new Avatars(client)
const storage = new Storage(client) 

export {client, databases, account, avatars, storage }