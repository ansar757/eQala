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

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

CATEGORY_LABELS: dict[str, str] = {
    "power": "Отключение света",
    "water": "Проблемы с водой",
}

CATEGORY_BY_BUTTON: dict[str, str] = {
    "⚡ Отключение света": "power",
    "💧 Проблемы с водой": "water",
}

router = Router()


class ReportIncident(StatesGroup):
    waiting_for_location = State()


def get_required_env(name: str) -> str:
    load_dotenv()
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}. Define it in .env before starting the bot.")
    return value


def build_category_keyboard() -> types.ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    for label in CATEGORY_BY_BUTTON:
        builder.button(text=label)
    builder.adjust(1)
    return builder.as_markup(resize_keyboard=True)


def build_location_keyboard() -> types.ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.button(text="📍 Поделиться геопозицией", request_location=True)
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
    await message.answer(
        "Приветствуем в системе «Цифровой Каскелен»!\n"
        "Выберите категорию коммунальной проблемы:",
        reply_markup=build_category_keyboard(),
    )


@router.message(F.text.in_(set(CATEGORY_BY_BUTTON)))
async def process_category(message: types.Message, state: FSMContext) -> None:
    assert message.text is not None

    category = CATEGORY_BY_BUTTON[message.text]
    await state.set_state(ReportIncident.waiting_for_location)
    await state.update_data(category=category)

    await message.answer(
        f"Вы выбрали: {CATEGORY_LABELS[category]}.\n"
        "Чтобы диспетчер увидел проблему на карте, отправьте геопозицию кнопкой ниже.",
        reply_markup=build_location_keyboard(),
    )


@router.message(ReportIncident.waiting_for_location, F.location)
async def handle_location(message: types.Message, state: FSMContext) -> None:
    if message.from_user is None or message.location is None:
        await message.answer("Не удалось определить пользователя или геопозицию. Попробуйте снова.")
        return

    state_data = await state.get_data()
    category = state_data.get("category")
    if not isinstance(category, str):
        await state.clear()
        await message.answer(
            "Категория обращения не найдена. Пожалуйста, выберите категорию заново.",
            reply_markup=build_category_keyboard(),
        )
        return

    success = await database.insert_incident_report(
        user_id=message.from_user.id,
        category=category,
        lat=message.location.latitude,
        lon=message.location.longitude,
    )

    if success:
        await state.clear()
        await message.answer("✅ Ваш сигнал успешно принят системой «Цифровой Каскелен»!")
        return

    logger.error("Failed to insert incident report for telegram_user_id=%s.", message.from_user.id)
    await message.answer("Произошла ошибка при отправке в базу данных. Попробуйте позже.")


@router.message(F.location)
async def handle_unexpected_location(message: types.Message) -> None:
    await message.answer(
        "Сначала выберите категорию проблемы, затем отправьте геопозицию.",
        reply_markup=build_category_keyboard(),
    )


async def main() -> None:
    bot = Bot(token=get_required_env("BOT_TOKEN"))
    dispatcher = Dispatcher(storage=MemoryStorage())
    dispatcher.include_router(router)

    try:
        await dispatcher.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
