const { 
    Client, GatewayIntentBits, Partials, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, 
    EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle 
} = require('discord.js');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel, Partials.Message]
});

const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

client.once('ready', async () => {
    console.log(`تم تسجيل الدخول بنجاح باسم ${client.user.tag} لسيرفر PGX!`);
    try {
        await doc.loadInfo();
        console.log(`تم الاتصال بجدول جوجل: ${doc.title}`);
    } catch (error) {
        console.error('خطأ في الاتصال بجداول جوجل:', error);
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    if (message.content === '!setup-apply') {
        const embed = new EmbedBuilder()
            .setTitle('🌟 نظام التقديم الإداري - سيرفر PGX')
            .setDescription('انضم إلى فريق إدارة سيرفر **PGX** المميز!\nاضغط على الزر بالأسفل لفتح استمارة التقديم وادخال بياناتك بدقة.')
            .setColor(0x00AE86)
            .setFooter({ text: 'PGX FiveM Management System' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('apply_btn')
                .setLabel('قدم على الإدارة')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📝')
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete();
    }
});

client.on('interactionCreate', async interaction => {
    if (interaction.isButton()) {
        if (interaction.customId === 'apply_btn') {
            const modal = new ModalBuilder()
                .setCustomId('apply_modal')
                .setTitle('استمارة التقديم على إدارة PGX');

            const nameInput = new TextInputBuilder()
                .setCustomId('applicant_name')
                .setLabel('اسمك الحقيقي أو الثلاثي')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const idInput = new TextInputBuilder()
                .setCustomId('applicant_id')
                .setLabel('الآي دي الخاص بك في فايف إم')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            const ageInput = new TextInputBuilder()
                .setCustomId('applicant_age')
                .setLabel('عمرك الحقيقي')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(nameInput),
                new ActionRowBuilder().addComponents(idInput),
                new ActionRowBuilder().addComponents(ageInput)
            );

            await interaction.showModal(modal);
        }

        if (interaction.customId.startsWith('accept_')) {
            const messageEmbed = interaction.message.embeds[0];
            const fields = messageEmbed.fields;
            
            const name = fields.find(f => f.name === 'الاسم').value;
            const fivemId = fields.find(f => f.name === 'آي دي الفايف إم').value;
            const acceptedBy = interaction.user.tag;
            const date = new Date().toISOString().split('T')[0];

            try {
                await doc.loadInfo();
                const sheet = doc.sheetsByIndex[0];
                await sheet.addRow({
                    'الاسم': name,
                    'آي دي الفايف إم': fivemId,
                    'الحالة': 'مقبول',
                    'المسؤول': acceptedBy,
                    'تاريخ القبول': date
                });

                const updatedEmbed = EmbedBuilder.from(messageEmbed)
                    .setColor(0x00FF00)
                    .addFields({ name: 'حالة الطلب', value: `✅ تم القبول بواسطة ${acceptedBy}` });

                await interaction.update({ embeds: [updatedEmbed], components: [] });
                await interaction.followUp({ content: `تم قبول العضو وتسجيل بياناته في جدول جوجل شيت بنجاح!`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: 'حدث خطأ أثناء حفظ البيانات في جوجل شيت.', ephemeral: true });
            }
        }

        if (interaction.customId.startsWith('reject_')) {
            const messageEmbed = interaction.message.embeds[0];
            const updatedEmbed = EmbedBuilder.from(messageEmbed)
                .setColor(0xFF0000)
                .addFields({ name: 'حالة الطلب', value: `❌ تم الرفض بواسطة ${interaction.user.tag}` });

            await interaction.update({ embeds: [updatedEmbed], components: [] });
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'apply_modal') {
            const name = interaction.fields.getTextInputValue('applicant_name');
            const fivemId = interaction.fields.getTextInputValue('applicant_id');
            const age = interaction.fields.getTextInputValue('applicant_age');

            const reviewChannelId = process.env.REVIEW_CHANNEL_ID;
            TheReviewChannel = await client.channels.fetch(reviewChannelId);

            const reviewEmbed = new EmbedBuilder()
                .setTitle('📥 طلب تقديم إداري جديد - PGX')
                .setColor(0xFFA500)
                .addFields(
                    { name: 'الاسم', value: name, inline: true },
                    { name: 'آي دي الفايف إم', value: fivemId, inline: true },
                    { name: 'العمر', value: age, inline: true },
                    { name: 'المتقدم', value: `<@${interaction.user.id}>`, inline: false }
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`accept_${interaction.user.id}`).setLabel('قبول').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`reject_${interaction.user.id}`).setLabel('رفض').setStyle(ButtonStyle.Danger)
            );

            await reviewChannel.send({ embeds: [reviewEmbed], components: [row] });
            await interaction.reply({ content: 'تم إرسال تقديمك بنجاح إلى الإدارة وسيتم مراجعته قريباً!', ephemeral: true });
        }
    }
});

client.login(process.env.BOT_TOKEN);
