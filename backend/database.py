# database.py
import os
from typing import Annotated
from fastapi import WebSocket

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeMeta, declarative_base

db_user = os.environ.get("POSTGRES_USER")
db_password = os.environ.get("POSTGRES_PASSWORD")
db_name = os.environ.get("POSTGRES_DB")

SQLALCHEMY_DATABASE_URL = f"postgresql+asyncpg://{db_user}:{db_password}@postgres:5432/{db_name}"

engine = create_async_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = async_sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base: DeclarativeMeta = declarative_base()


async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except:
            await session.rollback()
            raise


db_dependency = Annotated[AsyncSession, Depends(get_db)]



class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, election_id: int):
        await websocket.accept()
        if election_id not in self.active_connections:
            self.active_connections[election_id] = []
        self.active_connections[election_id].append(websocket)

    def disconnect(self, websocket: WebSocket, election_id: int):
        if election_id in self.active_connections:
            self.active_connections[election_id].remove(websocket)

    async def broadcast(self, message: str, election_id: int):
        if election_id in self.active_connections:
            for connection in self.active_connections[election_id]:
                await connection.send_text(message)

manager = ConnectionManager()

async def authenticate_connection(self, websocket: WebSocket, token: str):
    if not self.verify_token(token):  # Implement your token verification
        await websocket.close(code=1008)
        return False
    return True