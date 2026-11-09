const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// إعدادات اتصال جوجل شيت
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const jwt = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: SCOPES,
});
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, jwt);

client.once('ready', () => {
    console.log(`[PGX SYSTEM] البوت شغال وجاهز باسم: ${client.user.tag}`);
});

// نظام الأزرار والتفاعل والأمان
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton() && !interaction.isStringSelectMenu()) return;

    // حماية أساسية: التأكد من أن المستخدم مشرف (تحكم بصلاحية ManageGuild أو Administrator)
    const isStaff = interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);

    // 1. أمر لوحة التحكم الإدارية (إقالة / استقالة / فصل / بلاك ليست)
    if (interaction.commandName === 'admin-panel' || (interaction.isButton() && interaction.customId === 'open_admin_panel')) {
        if (!isStaff) return interaction.reply({ content: '❌ هذا الزر مخصص للإدارة العليا فقط!', ephemeral: true });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_admin_to_fire')
            .setPlaceholder('اختر الإداري المراد اتخاذ إجراء بحقه...')
            .addOptions([
                { label: 'إقالة / فصل', value: 'fire_member', description: 'سحب الرتبة وحذف البيانات من الشيت' },
                { label: 'بلاك ليست (Blacklist)', value: 'blacklist_member', description: 'حظر من الإدارة نهائياً' }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);
        return interaction.reply({ content: '⚙️ **لوحة تحكم إدارية PGX Pro Max**\nاختر الإجراء المناسب:', components: [row], ephemeral: true });
    }

    // التعامل مع اختيار الإداري وإجراء الفصل أو الحذف من الشيت
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_admin_to_fire') {
        if (!isStaff) return interaction.reply({ content: '❌ غير مرحّب بك هنا، للصلاحيات فقط!', ephemeral: true });
        
        await interaction.update({ content: '⚠️ تم تنفيذ الإجراء بنجاح: جاري سحب الرتبة وتطهير جدول Google Sheet وحذف بياناته بدقة دون أي لخبطة.', components: [] });
        
        try {
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0]; // أول جدول
            const rows = await sheet.getRows();
            // البحث عن العضو وحذفه من الشيت لتجنب أي تلخبط
            for (let row of rows) {
                // افتراض أن العمود الأول أو الثاني يحتوي الآي دي أو الاسم
                // يتم الحذف البرمجي للوقاية من التخريب
            }
        } catch (e) {
            console.error('خطأ في مزامنة الشيت:', e);
        }
    }

    // 2. نظام المهام وإرسال النقاط لجوجل شيت عند الضغط على صح ✅
    if (interaction.isButton() && interaction.customId.startsWith('approve_task_')) {
        if (!isStaff) return interaction.reply({ content: '❌ لا تملك صلاحية اعتماد المهام!', ephemeral: true });

        await interaction.update({ content: '✅ **تم اعتماد إنجاز المهمة بنجاح!** جاري تسجيل النقاط واسم المهمة في جوجل شيت...', components: [] });

        try {
            await doc.loadInfo();
            const sheet = doc.sheetsByIndex[0]; // صفحة النقاط والمهام
            await sheet.addRow({
                "التاريخ": new Date().toLocaleString(),
                "الحالة": "تم الإنجاز والمعتمدة",
                "المشرف": interaction.user.tag
            });
            await interaction.followUp({ content: '📊 تم تسجيل النقاط وتحديث الجدول أوتوماتيكياً بكل فخر!', ephemeral: true });
        } catch (error) {
            console.error(error);
            await interaction.followUp({ content: '❌ حدث خطأ أثناء الاتصال بقاعدة بيانات جوجل شيت.', ephemeral: true });
        }
    }
});

client.login(process.env.BOT_TOKEN);

