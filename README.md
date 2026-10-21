# Bronco Bot

A Discord bot with moderation, welcome messages, and button verification.

## Requirements

- Node.js 20 or newer
- A Discord application and bot
- A Discord server where you can manage bots and roles

## Installation

1. Download or clone this repository.
2. Install dependencies:

   npm install

3. Copy `.env.example` to a new file named `.env`.
4. Add your bot token to `.env`.
5. Add the IDs for your welcome channel, verification channel, and verified role.
6. Start the bot:

   npm start

## Commands

- `!help` - Show commands
- `!ping` - Check bot response
- `!verify` - Post a verification button
- `!clear 10` - Delete up to 100 recent messages
- `!kick @member [reason]` - Kick a member
- `!ban @member [reason]` - Ban a member
- `!timeout @member 10m [reason]` - Timeout a member
- `!untimeout @member` - Remove a timeout

## Discord setup

In the Discord Developer Portal:

1. Open your application and select Bot.
2. Enable **Server Members Intent**.
3. Enable **Message Content Intent**.
4. Invite the bot to your server with the required permissions.

The bot needs the relevant permissions for the features you use, such as
View Channels, Send Messages, Embed Links, Read Message History,
Manage Messages, Kick Members, Ban Members, Moderate Members, and Manage Roles.

Place the bot's role above the verified role it needs to assign and above
the roles it needs to moderate, where Discord's role hierarchy requires it.

## Keep your token private

Never publish your real Discord bot token. Keep it in `.env`, and do not
commit `.env` to GitHub. If a token is exposed, reset it in the Developer Portal.
