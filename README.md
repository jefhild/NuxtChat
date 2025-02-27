# NuxtChat Starter

<div align="center"> 
  <img src="/public/screenshots/NuxtChatDemo.gif" alt="demo" />
</div>

<!-- About the Project -->
# :notebook_with_decorative_cover: About the Project
## :star2: What is this

NuxtChat is an open-source chat platform that allows users to chat **anonymously with real people and AI personas**.  
It's designed to provide a **secure, fun, and interactive** chat experience while maintaining privacy.

NuxtChat is a Nuxt Starter for Real Time Chat based on Supabase. It's early and a bit rough, but if you're working on creating a chat app, integrating Supabase Real Time or playing with AI integration, this code might be helpful.

## :star: Features
- 🏆 **AI-powered conversations** - Talk with AI-powered personalities  
- 👥 **Anonymous or Registered Users** - Stay anonymous or create an account  
- 🔒 **Privacy-first** - No forced logins, no tracking  
- 🌍 **Open Source** - Community-driven development  

<!-- Screenshots -->
### :camera: Screenshots

<div align="center"> 
  <img src="/public/screenshots/SignIn.png" alt="Signing in" width="400px" />
  <img src="/public/screenshots/profile.png" alt="The Profile" width="400px" />
  <img src="/public/screenshots/chatHarryPotter.png" alt="Chat with Harry Potter" width="400px" />
</div>

<!-- Getting Started -->
## :toolbox: Getting Started - Step by Step Guide on how to configure NuxtChat locally

 <!--Pre requisites-->
### Prerequisites
In order to follow along with this installation, you’ll need access to a Supabase database, an OpenAI account, and the API keys that come with it. This guide assumes that you already have an account on both platforms.

If you don’t have an account and would like to set one up yourself, you can follow one of our guides on [How To Install NuxtChat](#).

<!-- Cloning the project -->
### Step 1) Cloning
Clone the project

```bash
  git clone git@github.com:jefhild/NuxtChat.git
```

Go to the project directory

```bash
  cd NuxtChat
```

### :key: Step 2) Setup .env
To run this project, you will need to add the following environment variables to your `.env` file. You can access these keys in your supabase database settings and OpenAI account keys

-  `SUPABASE_URL`

-  `SUPABASE_KEY`

-  `SUPABASE_BUCKET`

-  `SUPABASE_REDIRECT`

-  `OPENAI_API_KEY`

Create a `.env` file and add the environment variables listed above.

<!-- Database creation and initialisation -->
### :file_folder: Step 3) Database creation and initialisation
The repository provides `create.sql`, `functions.sql` and `init.sql` scripts, which you can execute using the Supabase SQL Editor.

### Step 4) Install the server dependencies
Make sure to install the project's dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

### Step 5) The Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm run dev

# yarn
yarn dev

# bun
bun run dev
```

### :question: Need any help 
If you need any help with getting started, please consult our [How To Install NuxtChat](#) guide.

<!-- Contributing -->
## :wave: Contributing
Contributions are always welcome!

To get started contributing to the project, see the [contributing guide](CONTRIBUTING.md).
This document also includes guidelines for reporting bugs.

<!-- License -->
## :warning: License
Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<!-- Contact -->
## :handshake: Contact

Oliver W Jones - [Our site](https://oliverwjones.com)

Project Link: [https://github.com/jefhild/NuxtChat](https://github.com/jefhild/NuxtChat)

💡 Enjoy chatting with AI & real people! 🚀
🌟 Star this repo if you like this project! ⭐