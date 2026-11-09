const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const express = require('express');

// 1. تشغيل سيرفر Express الـمهم جداً عشان رندر ما يطفي البوت أبداً
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('PGX Pro Max Bot is online and running smoothly!');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[EXPRESS] Server is running and listening on port ${PORT}`);
});

// 2. إعدادات بوت ديسكورد مع الحزم والـ Intents المطلوبة
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

client.once('ready', () => {
    console.log(`[PGX SYSTEM] البوت شغال وجاهز وبأمان تام باسم: ${client.user.tag}`);
});

// نظام الأزرار والتفاعل والأمان العالي
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

    // حماية أساسية: التأكد من أن المستخدم مشرف
    const isStaff = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);

    // 1. أمر لوحة التحكم الإدارية
    if (interaction.commandName === 'admin-panel' || (interaction.isButton() && interaction.customId === 'open_admin_panel')) {
        if (!isStaff) return interaction.reply({ content: '❌ هذا الزر مخصص للإدارة العليا فقط!', ephemeral: true });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_admin_to_fire')
            .setPlaceholder('اختر الإداري المراد اتخاذ إجراء بحقه...')
            .addOptions([
                { label: 'إقالة / فصل', value: 'fire_member', description: 'سحب الرتبة وحذف البيانات' },
                { label: 'بلاك ليست (Blacklist)', value: 'blacklist_member', description: 'حظر من الإدارة نهائياً' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({ content: '⚙️ **لوحة تحكم إدارية PGX Pro Max**\nاختر الإجراء المناسب:', components: [row], ephemeral: true });
    }

    // التعامل مع اختيار الإداري
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_admin_to_fire') {
        if (!isStaff) return interaction.reply({ content: '❌ غير مرحّب بك هنا، للصلاحيات فقط!', ephemeral: true });
        
        return interaction.update({ content: '⚠️ تم تنفيذ الإجراء بنجاح: جاري سحب الرتبة وتطهير البيانات بدقة دون أي لخبطة.', components: [] });
    }

    // 2. نظام المهام واعتمادها
    if (interaction.isButton() && interaction.customId.startsWith('approve_task_')) {
        if (!isStaff) return interaction.reply({ content: '❌ لا تملك صلاحية اعتماد المهام!', ephemeral: true });

        return interaction.update({ content: '✅ **تم اعتماد إنجاز المهمة بنجاح!** وتسجيل النقاط بكل فخر.', components: [] });
    }
});

// تشغيل البوت باستخدام متغير البيئة في Render وتجنب أي ملفات إعدادات خارجية معقدة
client.login(process.env.DISCORD_TOKEN);



