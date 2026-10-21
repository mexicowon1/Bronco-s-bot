require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const PREFIX = process.env.PREFIX || "!";
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const VERIFY_CHANNEL_ID = process.env.VERIFY_CHANNEL_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;

client.once("ready", () => {
  console.log(`Bronco Bot is online as ${client.user.tag}`);
  client.user.setActivity("over the server | !help");
});

function hasPermission(member, permission) {
  return member.permissions.has(permission);
}

function getMember(message) {
  return message.mentions.members.first();
}

function parseDuration(value) {
  const match = /^(\d+)(s|m|h|d)$/i.exec(value || "");
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  const milliseconds = amount * multipliers[unit];

  // Discord timeouts cannot exceed 28 days.
  if (milliseconds < 1000 || milliseconds > 28 * 24 * 60 * 60 * 1000) {
    return null;
  }

  return milliseconds;
}

client.on("guildMemberAdd", async (member) => {
  try {
    let channel = WELCOME_CHANNEL_ID
      ? member.guild.channels.cache.get(WELCOME_CHANNEL_ID)
      : member.guild.systemChannel;

    if (!channel || !channel.isTextBased()) {
      channel = member.guild.systemChannel;
    }

    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("Welcome to the server!")
      .setDescription(
        `Welcome ${member}, to **${member.guild.name}**!\n` +
        `You are member **#${member.guild.memberCount}**.`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Welcome message error:", error);
  }
});

client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = (args.shift() || "").toLowerCase();

  try {
    if (command === "help") {
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Bronco Bot Commands")
        .setDescription("My prefix is `!` by default.")
        .addFields(
          {
            name: "General",
            value: "`!help` - Show commands\n`!ping` - Check bot response"
          },
          {
            name: "Verification",
            value: "`!verify` - Post a verification button"
          },
          {
            name: "Moderation",
            value:
              "`!clear 10` - Delete up to 100 recent messages\n" +
              "`!kick @member [reason]` - Kick a member\n" +
              "`!ban @member [reason]` - Ban a member\n" +
              "`!timeout @member 10m [reason]` - Timeout a member\n" +
              "`!untimeout @member` - Remove a timeout"
          }
        );

      return message.reply({ embeds: [embed] });
    }

    if (command === "ping") {
      return message.reply(`Pong! 🏓 ${client.ws.ping}ms`);
    }

    if (command === "verify") {
      if (
        VERIFY_CHANNEL_ID &&
        message.channel.id !== VERIFY_CHANNEL_ID
      ) {
        return message.reply(
          `Please use this command in <#${VERIFY_CHANNEL_ID}>.`
        );
      }

      if (!VERIFIED_ROLE_ID) {
        return message.reply(
          "The verified role is not configured yet. Set VERIFIED_ROLE_ID in your private .env file."
        );
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("bronco_verify")
          .setLabel("Verify")
          .setStyle(ButtonStyle.Success)
      );

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("Server Verification")
        .setDescription(
          "Press the button below to receive the verified role."
        );

      return message.channel.send({
        embeds: [embed],
        components: [row]
      });
    }

    if (command === "clear") {
      if (!hasPermission(message.member, PermissionsBitField.Flags.ManageMessages)) {
        return message.reply("You need the Manage Messages permission.");
      }

      const amount = Number(args[0]);

      if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
        return message.reply("Usage: `!clear 10` (choose 1–100).");
      }

      if (!message.channel.bulkDelete) {
        return message.reply("This channel does not support bulk deletion.");
      }

      const deleted = await message.channel.bulkDelete(amount, true);
      const reply = await message.channel.send(
        `Deleted ${deleted.size} message(s).`
      );

      setTimeout(() => reply.delete().catch(() => {}), 4000);
      return;
    }

    if (command === "kick") {
      if (!hasPermission(message.member, PermissionsBitField.Flags.KickMembers)) {
        return message.reply("You need the Kick Members permission.");
      }

      const target = getMember(message);
      const reason = args.slice(1).join(" ") || "No reason provided";

      if (!target) return message.reply("Usage: `!kick @member [reason]`");
      if (target.id === message.author.id) {
        return message.reply("You cannot kick yourself.");
      }
      if (!target.kickable) {
        return message.reply("I cannot kick that member. Check my role position and permissions.");
      }

      await target.kick(reason);
      return message.reply(`Kicked **${target.user.tag}**. Reason: ${reason}`);
    }

    if (command === "ban") {
      if (!hasPermission(message.member, PermissionsBitField.Flags.BanMembers)) {
        return message.reply("You need the Ban Members permission.");
      }

      const target = getMember(message);
      const reason = args.slice(1).join(" ") || "No reason provided";

      if (!target) return message.reply("Usage: `!ban @member [reason]`");
      if (target.id === message.author.id) {
        return message.reply("You cannot ban yourself.");
      }
      if (!target.bannable) {
        return message.reply("I cannot ban that member. Check my role position and permissions.");
      }

      await target.ban({ reason });
      return message.reply(`Banned **${target.user.tag}**. Reason: ${reason}`);
    }

    if (command === "timeout") {
      if (!hasPermission(message.member, PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("You need the Moderate Members permission.");
      }

      const target = getMember(message);
      const duration = parseDuration(args[1]);
      const reason = args.slice(2).join(" ") || "No reason provided";

      if (!target) {
        return message.reply("Usage: `!timeout @member 10m [reason]`");
      }
      if (!duration) {
        return message.reply("Use a duration like `10m`, `1h`, or `1d` (maximum 28 days).");
      }
      if (target.id === message.author.id) {
        return message.reply("You cannot timeout yourself.");
      }
      if (!target.moderatable) {
        return message.reply("I cannot timeout that member. Check my role position and permissions.");
      }

      await target.timeout(duration, reason);
      return message.reply(
        `Timed out **${target.user.tag}** for ${args[1]}. Reason: ${reason}`
      );
    }

    if (command === "untimeout") {
      if (!hasPermission(message.member, PermissionsBitField.Flags.ModerateMembers)) {
        return message.reply("You need the Moderate Members permission.");
      }

      const target = getMember(message);
      if (!target) return message.reply("Usage: `!untimeout @member`");
      if (!target.moderatable) {
        return message.reply("I cannot remove that member's timeout. Check my role position and permissions.");
      }

      await target.timeout(null, `Timeout removed by ${message.author.tag}`);
      return message.reply(`Removed timeout for **${target.user.tag}**.`);
    }
  } catch (error) {
    console.error("Command error:", error);
    return message.reply(
      "Something went wrong. Check the bot's permissions and role position."
    ).catch(() => {});
  }
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "bronco_verify") return;

  if (!VERIFIED_ROLE_ID) {
    return interaction.reply({
      content: "Verification is not configured yet. Please contact a server administrator.",
      ephemeral: true
    });
  }

  try {
    const role = interaction.guild.roles.cache.get(VERIFIED_ROLE_ID);

    if (!role) {
      return interaction.reply({
        content: "The configured verified role was not found. Contact an administrator.",
        ephemeral: true
      });
    }

    const botMember = interaction.guild.members.me;

    if (
      !botMember.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
      role.position >= botMember.roles.highest.position
    ) {
      return interaction.reply({
        content: "I cannot assign this role. An administrator must check my Manage Roles permission and role position.",
        ephemeral: true
      });
    }

    const member = interaction.member;

    if (member.roles.cache.has(role.id)) {
      return interaction.reply({
        content: "You are already verified!",
        ephemeral: true
      });
    }

    await interaction.guild.members.addRole({
      user: interaction.user.id,
      role: role.id,
      reason: "Completed server button verification"
    });

    return interaction.reply({
      content: "You are verified! Welcome to the server.",
      ephemeral: true
    });
  } catch (error) {
    console.error("Verification error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Verification failed. Please contact a server administrator.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error("Missing DISCORD_TOKEN. Set it in your private .env file.");
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
