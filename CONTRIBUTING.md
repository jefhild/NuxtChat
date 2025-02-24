# 🚀 Contributing to ImChatty

Welcome, and thanks for your interest in contributing to **NuxtChat**! 🎉  
We appreciate your help in improving this open-source chat platform.  

---

## 🛠️ How to Contribute

We only accept contributions through **forks and pull requests** to the `opensource` branch.

Before opening a pull request for the new integration, open an issue to discuss
said integration with the NuxtChat team. After discussing the integration, you can
get started on it. 

### Be mindful of your commits

Try to make simple PRs that handle one specific topic. Just like for reporting
issues, it's better to open 3 different PRs that each address a different issue
than one big PR with three commits. This makes it easier to review, approve, and
merge the changes independently.

When updating your fork with upstream changes, please use ``git pull --rebase``
to avoid creating "merge commits". Those commits unnecessarily pollute the git
history when coming from PRs.

Also try to make commits that bring the application from one stable state to another
stable state, i.e. if your first commit has a bug that you fixed in the second
commit, try to merge them together before making your pull request. This
includes fixing build issues or typos, adding documentation, etc.

### **1️⃣ Fork the Repository**
Click the **Fork** button at the top right of the [NuxtChat GitHub page](https://github.com/jefhild/NuxtChat).  
This creates a copy of the repo under your account.

### **2️⃣ Clone Your Fork**
```sh
git git@github.com:jefhild/NuxtChat.git
cd NuxtChat
```

### **3️⃣ Create a new branch**
```sh
git checkout -b feature-your-feature-name
```

### **4️⃣ Make Your Changes**
 - Test your changes locally
 - Ensure your feature is useful and non-breaking

### **5️⃣ Make Your Changes**
```sh
git commit -m "your-feature-name"
```
```sh
git push origin feature-your-feature-name
```

### **6️⃣ Make Your Changes**
Go to your fork on GitHub and click "New Pull Request".
Make sure to select ```opensource``` branch as the target.

## Setting Up for Development
### :key: Environment Variables
To run this project, you will need to add the following environment variables to your .env file
 - `SUPABASE_URL`
 - `SUPABASE_KEY`
 - `SUPABASE_BUCKET`
 - `SUPABASE_REDIRECT`
 - `OPENAI_API_KEY`

 ### :gear: Installation
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

### Development Server

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

## ❓Need Help?
 * Open an Issue : maybe we can help

Happy coding! 🚀✨
