
require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
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
  ]
});

const PREFIX = process.env.PREFIX || "!";
const VERIFIED_ROLE_ID = process.env.VERIFIED_ROLE_ID;
const VERIFY_CHANNEL_ID = process.env.VERIFY_CHANNEL_ID;
const WELCOME_CHANNEL_ID = process.env.WELCOME_CHANNEL_ID;

client.once("ready", () => {
  console.log(`Bronco Bot is online as ${client.user.tag}`);
  client.user.setActivity("over the server | !help");
});

function parseDuration(value) {
  const match = /^(\d+)(s|m|h|d)$/i.exec(value || "");
  if (!match) return null;

  const units = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };

  const duration =
    Number(match[1]) * units[match[2].toLowerCase()];

  if (duration < 1000 || duration > 28 * 86400000) {
    return null;
  }

  return duration;
}

// Welcome new members
client.on("guildMemberAdd", async (member) => {
  try {
    const channel =
      (WELCOME_CHANNEL_ID &&
        member.guild.channels.cache.get(WELCOME_CHANNEL_ID)) ||
      member.guild.systemChannel;

    if (!channel || !channel.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("Welcome to the server!")
      .setDescription(
        `Welcome ${member} to **${member.guild.name}**!\n` +
        `You are member **#${member.guild.memberCount}**.`
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error("Welcome error:", error);
  }
});

// Prefix commands
client.on("messageCreate", async (message) => {
  if (!message.guild || message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content
    .slice(PREFIX.length)
    .trim()
    .split(/\s+/);

  const command = (args.shift() || "").toLowerCase();
  const target = message.mentions.members.first();

  try {
    // Help
    if (command === "help") {
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle("Bronco Bot Commands")
        .addFields(
          {
            name: "General",
            value: "`!help` - Show commands\n`!ping` - Check bot response"
          },
          {
            name: "Verification",
            value: "`!verify` - Create a verification button"
          },
          {
            name: "Moderation",
            value:
              "`!clear 10` - Delete messages\n" +
              "`!kick @member [reason]`\n" +
              "`!ban @member [reason]`\n" +
              "`!timeout @member 10m [reason]`\n" +
              "`!untimeout @member`"
          }
        );

      return message.reply({ embeds: [embed] });
    }

    // Ping
    if (command === "ping") {
      return message.reply(`Pong! 🏓 ${client.ws.ping}ms`);
    }

    // Verification button
    if (command === "verify") {
      if (
        VERIFY_CHANNEL_ID &&
        message.channel.id !== VERIFY_CHANNEL_ID
      ) {
        return message.reply(
          `Please use <#${VERIFY_CHANNEL_ID}> for verification.`
        );
      }

      if (!VERIFIED_ROLE_ID) {
        return message.reply(
          "Verification isn't configured. Set VERIFIED_ROLE_ID in your private .env file."
        );
      }

      const embed = new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("Server Verification")
        .setDescription(
          "Press the button below to receive your verified role."
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("bronco_verify")
          .setLabel("Verify")
          .setStyle(ButtonStyle.Success)
      );

      return message.channel.send({
        embeds: [embed],
        components: [row]
      });
    }

    // Clear messages
    if (command === "clear") {
      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ManageMessages
        )
      ) {
        return message.reply(
          "You need the Manage Messages permission."
        );
      }

      const amount = Number(args[0]);

      if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
        return message.reply("Usage: `!clear 10` (1–100).");
      }

      const deleted = await message.channel.bulkDelete(amount, true);
      const reply = await message.channel.send(
        `Deleted ${deleted.size} message(s).`
      );

      setTimeout(() => reply.delete().catch(() => {}), 4000);
      return;
    }

    // Kick or ban
    if (command === "kick" || command === "ban") {
      const isKick = command === "kick";
      const permission = isKick
        ? PermissionsBitField.Flags.KickMembers
        : PermissionsBitField.Flags.BanMembers;

      if (!message.member.permissions.has(permission)) {
        return message.reply(
          `You need the ${isKick ? "Kick Members" : "Ban Members"} permission.`
        );
      }

      if (!target) {
        return message.reply(`Usage: \`!${command} @member [reason]\``);
      }

      if (target.id === message.author.id) {
        return message.reply(`You cannot ${command} yourself.`);
      }

      const reason =
        args.slice(1).join(" ") || "No reason provided";

      if (isKick) {
        if (!target.kickable) {
          return message.reply(
            "I cannot kick this member. Check my permissions and role position."
          );
        }

        await target.kick(reason);
      } else {
        if (!target.bannable) {
          return message.reply(
            "I cannot ban this member. Check my permissions and role position."
          );
        }

        await target.ban({ reason });
      }

      return message.reply(
        `${isKick ? "Kicked" : "Banned"} **${target.user.tag}**. Reason: ${reason}`
      );
    }

    // Timeout
    if (command === "timeout") {
      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        return message.reply(
          "You need the Moderate Members permission."
        );
      }

      if (!target) {
        return message.reply(
          "Usage: `!timeout @member 10m [reason]`"
        );
      }

      const duration = parseDuration(args[1]);

      if (!duration) {
        return message.reply(
          "Use `10m`, `1h`, or `1d`. Maximum: 28 days."
        );
      }

      if (target.id === message.author.id) {
        return message.reply("You cannot timeout yourself.");
      }

      if (!target.moderatable) {
        return message.reply(
          "I cannot timeout this member. Check my permissions and role position."
        );
      }

      const reason =
        args.slice(2).join(" ") || "No reason provided";

      await target.timeout(duration, reason);

      return message.reply(
        `Timed out **${target.user.tag}** for ${args[1]}.`
      );
    }

    // Remove timeout
    if (command === "untimeout") {
      if (
        !message.member.permissions.has(
          PermissionsBitField.Flags.ModerateMembers
        )
      ) {
        return message.reply(
          "You need the Moderate Members permission."
        );
      }

      if (!target) {
        return message.reply("Usage: `!untimeout @member`");
      }

      if (!target.moderatable) {
        return message.reply(
          "I cannot remove this timeout. Check my permissions and role position."
        );
      }

      await target.timeout(
        null,
        `Timeout removed by ${message.author.tag}`
      );

      return message.reply(
        `Removed timeout for **${target.user.tag}**.`
      );
    }
  } catch (error) {
    console.error("Command error:", error);

    return message.reply(
      "Something went wrong. Check the bot's permissions and role position."
    ).catch(() => {});
  }
});

// Verification button interaction
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== "bronco_verify") return;

  if (!VERIFIED_ROLE_ID) {
    return interaction.reply({
      content: "Verification is not configured yet.",
      ephemeral: true
    });
  }

  try {
    const role = interaction.guild.roles.cache.get(
      VERIFIED_ROLE_ID
    );

    const botMember = interaction.guild.members.me;

    if (!role) {
      return interaction.reply({
        content: "The verified role was not found. Contact an administrator.",
        ephemeral: true
      });
    }

    if (
      !botMember.permissions.has(
        PermissionsBitField.Flags.ManageRoles
      ) ||
      role.position >= botMember.roles.highest.position
    ) {
      return interaction.reply({
        content: "I cannot assign this role. Check Manage Roles and my role position.",
        ephemeral: true
      });
    }

    const member = await interaction.guild.members.fetch(
      interaction.user.id
    );

    if (member.roles.cache.has(role.id)) {
      return interaction.reply({
        content: "You are already verified!",
        ephemeral: true
      });
    }

    await member.roles.add(
      role,
      "Completed server button verification"
    );

    return interaction.reply({
      content: "You are verified! Welcome to the server.",
      ephemeral: true
    });
  } catch (error) {
    console.error("Verification error:", error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "Verification failed. Contact a server administrator.",
        ephemeral: true
      }).catch(() => {});
    }
  }
});

// Start the bot
if (!process.env.DISCORD_TOKEN) {
  console.error(
    "Missing DISCORD_TOKEN. Set it in your private .env file."
  );
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
