# JavaScripters Bot

This is the source code for the main bot in JavaScripters, a discord community. It is powered using [Bun](https://bun.sh/) and [djs-fsrouter](https://github.com/Javascripters-Development/djs-fsrouter), a Discord.js framework with filesystem routing built in.

## Running locally

First, make sure you have the latest version of Bun installed by running `bun -v`. If not, you can install Bun by running the following command:

```sh
curl -fsSL https://bun.sh/install | bash
```

Note that Bun does not currently support windows natively and must be run through WSL.

Once you do that, clone the repository and install its dependencies.

```sh
git clone https://github.com/Javascripters-Development/djs-fsrouter.git
bun install
```

Finally, create a .env file with the `TOKEN` and `GUILD` variables. `TOKEN` should be set to the token of your Discord bot account and `GUILD` should be set to the id of the guild you want the bot to function in (this bot is configured by default to only run in a single server).

```ini
TOKEN=[BOT TOKEN]
GUILD=[GUILD ID]
```

## Contributing

To contribute code, please open a pull request with your changes and make sure to follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) spec for commit naming.
