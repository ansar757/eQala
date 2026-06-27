from __future__ import annotations

import asyncio
import logging
import os

from aiogram import Bot, Dispatcher, F, Router, types
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.utils.keyboard import ReplyKeyboardBuilder
from dotenv import load_dotenv

from database import database

NOTIFICATION_CHECK_INTERVAL = 5

# Notification worker to deliver unsent notifications
async def notification_worker(bot: Bot) -> None:
    while True:
        try:
            client = await database._get_client()

            response = await client.get(
                "/notifications",
                params={
                    "select": "id,user_id,message",
                    "sent": "eq.false",
                },
            )

            if response.status_code == 200:
                notifications = response.json()

                for notification in notifications:
                    try:
                        message_text = notification["message"]

                        message_text = message_text.replace("Категория: water", "Категория: Водоснабжение")
                        message_text = message_text.replace("Категория: power", "Категория: Электроснабжение")
                        message_text = message_text.replace(
                            "✅ Ваше обращение было рассмотрено.",
                            "✅ Ваше обращение было рассмотрено\n\nСпасибо за обращение в систему «Цифровой Каскелен»."
                        )

                        await bot.send_message(
                            chat_id=notification["user_id"],
                            text=message_text,
                        )

                        await client.patch(
                            "/notifications",
                            params={"id": f"eq.{notification['id']}"},
                            json={"sent": True},
                        )

                        logger.info(
                            "Notification sent to user %s",
                            notification["user_id"],
                        )
                    except Exception:
                        logger.exception(
                            "Failed to send notification %s",
                            notification["id"],
                        )

        except Exception:
            logger.exception("Notification worker failed")

        await asyncio.sleep(NOTIFICATION_CHECK_INTERVAL)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

def get_required_env(name: str) -> str:
    load_dotenv()
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

CATEGORY_LABELS = {
    "ru": {
        "power": "Отключение света",
        "water": "Проблемы с водой",
    },
    "kk": {
        "power": "Электр жарығының өшуі",
        "water": "Су мәселелері",
    },
}

CATEGORY_BY_BUTTON: dict[str, str] = {
    "⚡ Отключение света": "power",
    "💧 Проблемы с водой": "water",
    "⚡ Электр жарығының өшуі": "power",
    "💧 Су мәселелері": "water",
    "📍 Проверить мой район": "check_area",
    "📍 Менің ауданымды тексеру": "check_area",
}

LANGUAGE_LABELS: dict[str, str] = {
    "🇷🇺 Русский": "ru",
    "🇰🇿 Қазақша": "kk",
}

TEXTS = {
    "ru": {
        "welcome": "Приветствуем в системе «Цифровой Каскелен»!\nВыберите язык:",
        "choose_category": "Выберите категорию коммунальной проблемы:",
        "describe_problem": "Кратко опишите проблему:",
        "share_location": "Чтобы диспетчер увидел проблему на карте, отправьте геопозицию кнопкой ниже.",
        "location_button": "📍 Поделиться геопозицией",
        "success": "✅ Заявка зарегистрирована!\n\nID: {report_id}\nСтатус: Принято\nКатегория: {category}\n\n📍 Геопозиция получена\n🗺️ Добавлено на карту Digital Twin\n\nВаше сообщение помогает выявлять городские проблемы раньше и улучшать цифровой двойник Каскелена.",
        "community": "\n\n📊 Аналитика района\n👥 Обращений по категории: {count}\n{risk}\n🤖 AI Risk Score: {score}%\n🔎 Сигнал отправлен в Digital Twin Каскелена",
        "contacts": "☎️ Контакты служб",
        "contacts_text": "☎️ Контакты служб\n\n⚡ РЭС Карасай\n📞 +7 (727) 712-66-51\n📞 +7 (727) 712-69-47\n\n💧 Водоканал Каскелен\n📞 Приёмная: 21077\n📞 Служба сбыта: 23100\n📞 Диспетчерская: 22265",
        "check_area": "📍 Проверить мой район",
        "check_area_text": "📍 Отправьте свою геопозицию для анализа района.",
    },
    "kk": {
        "welcome": "«Цифрлық Қаскелен» жүйесіне қош келдіңіз!\nТілді таңдаңыз:",
        "choose_category": "Коммуналдық мәселенің санатын таңдаңыз:",
        "describe_problem": "Мәселені қысқаша сипаттаңыз:",
        "share_location": "Мәселе картада көрінуі үшін төмендегі батырма арқылы геолокацияны жіберіңіз.",
        "location_button": "📍 Геолокацияны жіберу",
        "success": "✅ Өтінім тіркелді!\n\nID: {report_id}\nКүйі: Қабылданды\nСанаты: {category}\n\n📍 Геолокация қабылданды\n🗺️ Digital Twin картасына қосылды\n\nСіздің хабарламаңыз қаланың цифрлық егізін дамытуға және мәселелерді ертерек анықтауға көмектеседі.",
        "community": "\n\n📊 Аудан аналитикасы\n👥 Санат бойынша өтініштер: {count}\n{risk}\n🤖 AI Risk Score: {score}%\n🔎 Сигнал Қаскеленнің Digital Twin жүйесіне жіберілді",
        "contacts": "☎️ Қызмет байланыстары",
        "contacts_text": "☎️ Қызмет байланыстары\n\n⚡ Қарасай РЭС\n📞 +7 (727) 712-66-51\n📞 +7 (727) 712-69-47\n\n💧 Қаскелең Су Арнасы\n📞 Қабылдау: 21077\n📞 Абоненттік бөлім: 23100\n📞 Диспетчерлік: 22265",
        "check_area": "📍 Менің ауданымды тексеру",
        "check_area_text": "📍 Ауданды талдау үшін геолокацияңызды жіберіңіз.",
    },
}

router = Router()


class ReportIncident(StatesGroup):
    waiting_for_language = State()
    waiting_for_description = State()
    waiting_for_location = State()


def build_language_keyboard() -> types.ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    for label in LANGUAGE_LABELS:
        builder.button(text=label)
    builder.adjust(2)
    return builder.as_markup(resize_keyboard=True)


def build_category_keyboard(language: str = "ru") -> types.ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()

    if language == "kk":
        builder.button(text="⚡ Электр жарығының өшуі")
        builder.button(text="💧 Су мәселелері")
        builder.button(text="📍 Менің ауданымды тексеру")
        builder.button(text="☎️ Қызмет байланыстары")
    else:
        builder.button(text="⚡ Отключение света")
        builder.button(text="💧 Проблемы с водой")
        builder.button(text="📍 Проверить мой район")
        builder.button(text="☎️ Контакты служб")

    builder.adjust(1)
    return builder.as_markup(resize_keyboard=True)


def build_location_keyboard(language: str = "ru") -> types.ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.button(text=TEXTS[language]["location_button"], request_location=True)
    return builder.as_markup(resize_keyboard=True, one_time_keyboard=True)


@router.startup()
async def on_startup() -> None:
    await database.open()


@router.shutdown()
async def on_shutdown() -> None:
    await database.close()


@router.message(CommandStart())
async def cmd_start(message: types.Message, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(ReportIncident.waiting_for_language)
    await message.answer(
        TEXTS["ru"]["welcome"],
        reply_markup=build_language_keyboard(),
    )


@router.message(ReportIncident.waiting_for_language, F.text.in_(set(LANGUAGE_LABELS)))
async def process_language(message: types.Message, state: FSMContext) -> None:
    assert message.text is not None

    language = LANGUAGE_LABELS[message.text]
    await state.update_data(language=language)

    await message.answer(
        TEXTS[language]["choose_category"],
        reply_markup=build_category_keyboard(language),
    )


@router.message(F.text.in_({"☎️ Контакты служб", "☎️ Қызмет байланыстары"}))
async def show_contacts(message: types.Message, state: FSMContext) -> None:
    data = await state.get_data()
    language = data.get("language", "ru")
    await message.answer(TEXTS[language]["contacts_text"])


@router.message(F.text.in_(set(CATEGORY_BY_BUTTON)))
async def process_category(message: types.Message, state: FSMContext) -> None:
    assert message.text is not None

    category = CATEGORY_BY_BUTTON[message.text]
    data = await state.get_data()
    language = data.get("language", "ru")

    if category == "check_area":
        await state.set_state(ReportIncident.waiting_for_location)
        await state.update_data(category="check_area")
        await message.answer(
            TEXTS[language]["check_area_text"],
            reply_markup=build_location_keyboard(language),
        )
        return

    await state.set_state(ReportIncident.waiting_for_description)
    await state.update_data(category=category)

    await message.answer(
        f"{CATEGORY_LABELS[language][category]}\n\n{TEXTS[language]['describe_problem']}"
    )


@router.message(ReportIncident.waiting_for_description)
async def handle_description(message: types.Message, state: FSMContext) -> None:
    if not message.text:
        return

    data = await state.get_data()
    language = data.get("language", "ru")

    await state.update_data(description=message.text)
    await state.set_state(ReportIncident.waiting_for_location)

    await message.answer(
        TEXTS[language]["share_location"],
        reply_markup=build_location_keyboard(language),
    )


@router.message(ReportIncident.waiting_for_location, F.location)
async def handle_location(message: types.Message, state: FSMContext) -> None:
    if message.from_user is None or message.location is None:
        await message.answer("Не удалось определить пользователя или геопозицию. Попробуйте снова.")
        return

    state_data = await state.get_data()
    category = state_data.get("category")
    language = state_data.get("language", "ru")
    description = state_data.get("description")
    if not isinstance(category, str):
        await state.clear()
        await message.answer(
            "Категория обращения не найдена. Пожалуйста, выберите категорию заново.",
            reply_markup=build_category_keyboard(),
        )
        return

    if category == "check_area":
        power_count = await database.count_incidents_by_category(
            "power",
            message.location.latitude,
            message.location.longitude,
        )
        water_count = await database.count_incidents_by_category(
            "water",
            message.location.latitude,
            message.location.longitude,
        )
        total = power_count + water_count

        if language == "kk":
            if total <= 4:
                risk = "🟢 Төмен қауіп"
                score = 25
            elif total <= 9:
                risk = "🟡 Орташа қауіп"
                score = 60
            else:
                risk = "🔴 HIGH RISK ZONE"
                score = 90

            response = (
                f"📍 Аудан талдауы\n\n"
                f"⚡ Электр мәселелері: {power_count}\n"
                f"💧 Су мәселелері: {water_count}\n\n"
                f"{risk}\n"
                f"🤖 AI Risk Score: {score}%"
            )
        else:
            if total <= 4:
                risk = "🟢 Низкий риск"
                score = 25
            elif total <= 9:
                risk = "🟡 Средний риск"
                score = 60
            else:
                risk = "🔴 HIGH RISK ZONE"
                score = 90

            response = (
                f"📍 Анализ района\n\n"
                f"⚡ Электроснабжение: {power_count}\n"
                f"💧 Водоснабжение: {water_count}\n\n"
                f"{risk}\n"
                f"🤖 AI Risk Score: {score}%"
            )

        await message.answer(response)
        await state.clear()
        return

    report_id = f"EQ-{message.from_user.id}-{int(message.date.timestamp())}"

    success = await database.insert_incident_report(
        user_id=message.from_user.id,
        category=category,
        lat=message.location.latitude,
        lon=message.location.longitude,
        description=description,
    )

    count = await database.count_incidents_by_category(
        category,
        message.location.latitude,
        message.location.longitude,
    )

    if language == "kk":
        if count <= 4:
            risk = "🟢 Төмен қауіп"
            score = 25
        elif count <= 9:
            risk = "🟡 Орташа қауіп"
            score = 60
        else:
            risk = "🔴 HIGH RISK ZONE"
            score = 90
    else:
        if count <= 4:
            risk = "🟢 Низкий риск"
            score = 25
        elif count <= 9:
            risk = "🟡 Средний риск"
            score = 60
        else:
            risk = "🔴 HIGH RISK ZONE"
            score = 90

    if success:
        await state.clear()
        await message.answer(
            TEXTS[language]["success"].format(
                category=CATEGORY_LABELS[language][category],
                report_id=report_id,
            )
            + TEXTS[language]["community"].format(
                count=count,
                risk=risk,
                score=score,
            )
        )
        return

    logger.error("Failed to insert incident report for telegram_user_id=%s.", message.from_user.id)
    await message.answer("Произошла ошибка при отправке в базу данных. Попробуйте позже.")



@router.message(F.location)
async def handle_unexpected_location(message: types.Message) -> None:
    await message.answer(
        "Сначала выберите категорию проблемы, затем отправьте геопозицию.",
        reply_markup=build_category_keyboard(),
    )


# Fallback handler for unexpected messages
@router.message()
async def fallback_handler(message: types.Message, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(ReportIncident.waiting_for_language)

    await message.answer(
        TEXTS["ru"]["welcome"],
        reply_markup=build_language_keyboard(),
    )


async def main() -> None:
    bot = Bot(token=get_required_env("BOT_TOKEN"))
    dispatcher = Dispatcher(storage=MemoryStorage())
    dispatcher.include_router(router)
    notification_task = asyncio.create_task(notification_worker(bot))

    try:
        await dispatcher.start_polling(bot)
    finally:
        notification_task.cancel()
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
